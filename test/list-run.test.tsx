// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { ConfirmDialog } from '../src/dialogs'
import { focusInDialog, Page, useListRun } from '../src/index'
import type { ListRun, ListRunState, RunSettled } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** What a test reads back from the list screen. */
interface Seen {
	/** The settle function of each run started, in the order started. */
	settles: RunSettled[]
	/** The run the list handed on each render, in the order rendered. */
	runs: ListRun[]
	/** What the list run handed on each render. */
	states: ListRunState[]
	/** The ticked rows the screen held on each render. */
	ticked: string[][]
}

/**
 * Renders a list screen whose runs start in the list, a confirm or an alert dialog, beside Add Post and an Edit form.
 * @param props - The list on show, whether it draws its region and the confirm, the selection spy and what to record.
 * @returns The page with its list region and the dialogs.
 */
function ListScreen({
	scope,
	region = true,
	asking = true,
	onTicks,
	seen,
}: {
	scope: string
	region?: boolean
	asking?: boolean
	onTicks: (selection: string[]) => void
	seen: Seen
}) {
	const [ticked, setTicked] = useState(['1', '2'])
	const state = useListRun(scope, (selection) => {
		onTicks(selection)
		setTicked(selection)
	})
	const { run, region: listRef } = state
	seen.states.push(state)
	seen.runs.push(run)
	seen.ticked.push(ticked)
	const startRun = () => seen.settles.push(run.onStart())
	return (
		<>
			<Page
				title="Posts"
				list={region}
				listLabel="Posts"
				listRef={listRef}
				actions={<button type="button">Add Post</button>}
			>
				<button type="button" onClick={startRun}>
					Trash
				</button>
			</Page>
			{asking ? (
				<div role="dialog" aria-label="Trash posts">
					<button type="button">Cancel</button>
					<button type="button" onClick={startRun}>
						Move to trash
					</button>
				</div>
			) : null}
			<div role="dialog" aria-label="Edit">
				<input aria-label="Title" />
			</div>
			<div role="alertdialog" aria-label="Delete">
				<button type="button" onClick={startRun}>
					Delete permanently
				</button>
			</div>
		</>
	)
}

/**
 * Renders the list screen on the given list.
 * @param scope - The list on show.
 * @param region - Whether the screen draws its list region.
 * @returns What the screen recorded, the selection spy, a rerender onto another list and one that closes the confirm.
 */
function renderList(scope: string, region = true) {
	const seen: Seen = { settles: [], runs: [], states: [], ticked: [] }
	const onTicks = vi.fn()
	const { rerender, unmount } = renderAdmin(<ListScreen scope={scope} region={region} onTicks={onTicks} seen={seen} />)
	return {
		seen,
		onTicks,
		unmount,
		show: (next: string) => rerender(<ListScreen scope={next} region={region} onTicks={onTicks} seen={seen} />),
		closeConfirm: () =>
			rerender(<ListScreen scope={scope} region={region} asking={false} onTicks={onTicks} seen={seen} />),
	}
}

/**
 * Spies on the focusin listeners the document gains from here on.
 * @returns What counts those listeners the document still holds.
 */
function focusinListeners(): () => number {
	const added = vi.spyOn(document, 'addEventListener')
	const removed = vi.spyOn(document, 'removeEventListener')
	onTestFinished(() => {
		added.mockRestore()
		removed.mockRestore()
	})
	const focusin = (calls: unknown[][]) => calls.filter(([type]) => type === 'focusin')
	const gone = (listener: unknown, options: unknown) =>
		focusin(removed.mock.calls).some(([, each, eachOptions]) => each === listener && eachOptions === options)
	return () => focusin(added.mock.calls).filter(([, listener, options]) => !gone(listener, options)).length
}

/**
 * Returns the named control, the Title field or a button.
 * @param name - The accessible name of the control.
 * @returns The control.
 */
function control(name: string): HTMLElement {
	return screen.getByRole(name === 'Title' ? 'textbox' : 'button', { name })
}

/**
 * Focuses the named control, as a reader moving to it does.
 * @param name - The accessible name of the control.
 */
function focusOn(name: string): void {
	act(() => control(name).focus())
}

/**
 * Drops the focus to the page body, as a browser does once the focused row left the list.
 */
function dropFocus(): void {
	act(() => (document.activeElement as HTMLElement).blur())
}

/**
 * Starts a run from the named button, focused first as a pointer press leaves it.
 * @param name - The button, the Trash button inside the list when none is named.
 */
function start(name = 'Trash'): void {
	focusOn(name)
	fireEvent.click(control(name))
}

/**
 * Settles a run the list started.
 * @param settle - The settle function the run was handed.
 * @param moved - Whether an item moved.
 */
function settle(settle: RunSettled, moved: boolean): void {
	act(() => settle(moved))
}

/**
 * Returns the list region a finished run focuses.
 * @returns The region named Posts.
 */
function listRegion(): HTMLElement {
	return screen.getByRole('region', { name: 'Posts' })
}

test('holds no failure above the list, since a run shows its failure in a toast', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], false)

	expect(Object.keys(seen.states.at(-1) as ListRunState).sort()).toEqual(['refreshing', 'region', 'run'])
	expect(screen.queryByRole('alert')).toBeNull()
})

test('focuses the list region once a run moved an item while the focus sat inside the list', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(listRegion())
})

test('focuses the list region once a run moved an item and the focus fell to the page', () => {
	const { seen } = renderList('post publish')
	start()
	dropFocus()

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(listRegion())
})

test('focuses the list region once a run moved an item while the confirm it started in still holds the focus', () => {
	const { seen } = renderList('post publish')
	start('Move to trash')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(listRegion())
})

test('focuses the list region once a run started in an alert dialog that still holds the focus moved an item', () => {
	const { seen } = renderList('post publish')
	start('Delete permanently')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(listRegion())
})

test('leaves the focus in a dialog opened during a run that started outside every dialog', () => {
	const { seen } = renderList('post publish')
	start()
	focusOn('Title')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Title'))
})

test('leaves the focus in a dialog opened during a run that started in another dialog', () => {
	const { seen } = renderList('post publish')
	start('Move to trash')
	focusOn('Title')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Title'))
})

test('leaves the focus in an alert dialog opened during a run', () => {
	const { seen } = renderList('post publish')
	start()
	focusOn('Delete permanently')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Delete permanently'))
})

test('leaves the focus on a control outside the list the reader moved to during a run', () => {
	const { seen } = renderList('post publish')
	start()
	focusOn('Add Post')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Add Post'))
})

test('leaves the focus on a control outside the list the reader moved to while the run dialog stays open', () => {
	const { seen } = renderList('post publish')
	start('Move to trash')
	focusOn('Add Post')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Add Post'))
})

/** Keeps the ticked rows as they are, since the trash screen ticks none. */
const keepTicks = () => {}

/**
 * Renders a trash list whose Empty Trash opens a confirm that starts a run and closes at once, by Add Post and Edit.
 * @param props - Whether Empty Trash is on the page and where to record the settle of each run started.
 * @returns The page with its list region, the confirm while asked and the Edit form.
 */
function TrashScreen({ opener, settles }: { opener: boolean; settles: RunSettled[] }) {
	const [asking, setAsking] = useState(false)
	const { run, region } = useListRun('post trash', keepTicks)
	const emptyTrash = () => {
		settles.push(run.onStart())
	}
	return (
		<>
			<Page
				title="Posts"
				list
				listLabel="Posts"
				listRef={region}
				actions={
					<>
						{opener ? (
							<button type="button" onClick={() => setAsking(true)}>
								Empty Trash
							</button>
						) : null}
						<button type="button">Add Post</button>
					</>
				}
			>
				<button type="button">Restore</button>
			</Page>
			{asking ? (
				<ConfirmDialog
					confirmLabel="Empty trash"
					cancelLabel="Cancel"
					onConfirm={emptyTrash}
					onClose={() => setAsking(false)}
				>
					Empty the trash?
				</ConfirmDialog>
			) : null}
			<div role="dialog" aria-label="Edit">
				<input aria-label="Title" />
			</div>
		</>
	)
}

/**
 * Empties the trash through a confirm that closes at once and gives the focus back to Empty Trash while it stays.
 * @param openerLeaves - Whether Empty Trash leaves the page while the confirm is open, so the focus falls to the body.
 * @returns The settle of each run started and a rerender that takes Empty Trash off the page.
 */
async function emptyTrash(openerLeaves = false) {
	const settles: RunSettled[] = []
	const { rerender } = renderAdmin(<TrashScreen opener settles={settles} />)
	const dropOpener = () => rerender(<TrashScreen opener={false} settles={settles} />)
	start('Empty Trash')
	await screen.findByRole('button', { name: 'Empty trash' })
	if (openerLeaves) {
		dropOpener()
	}
	start('Empty trash')
	await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Empty the trash?' })).toBeNull())
	return { settles, dropOpener }
}

test('focuses the list region once a run moved an item after its confirm closed at once', async () => {
	const { settles, dropOpener } = await emptyTrash()
	expect(document.activeElement).toBe(control('Empty Trash'))

	settle(settles[0], true)

	expect(document.activeElement).toBe(listRegion())
	dropOpener()
	expect(document.activeElement).toBe(listRegion())
})

test('leaves the focus in a dialog opened after the confirm the run started in closed', async () => {
	const { settles } = await emptyTrash()
	focusOn('Title')

	settle(settles[0], true)

	expect(document.activeElement).toBe(control('Title'))
})

test('leaves the focus on a control outside the list the reader moved to after a confirm closed at once', async () => {
	const { settles } = await emptyTrash()
	expect(document.activeElement).toBe(control('Empty Trash'))
	focusOn('Add Post')

	settle(settles[0], true)

	expect(document.activeElement).toBe(control('Add Post'))
})

test('leaves the focus on a control the reader moved to after a confirm closed with its opener gone', async () => {
	const { settles } = await emptyTrash(true)
	expect(document.activeElement).toBe(document.body)
	focusOn('Add Post')

	settle(settles[0], true)

	expect(document.activeElement).toBe(control('Add Post'))
})

test('focuses the list region once the dialog a run started in gave the focus back, after a move inside it', () => {
	const { seen, closeConfirm } = renderList('post publish')
	start('Move to trash')
	focusOn('Cancel')
	focusOn('Add Post')
	closeConfirm()

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(listRegion())
})

test('leaves the focus in a dialog the reader moved to before the dialog the run started in closed', () => {
	const { seen, closeConfirm } = renderList('post publish')
	start('Move to trash')
	focusOn('Title')
	closeConfirm()

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Title'))
})

test('watches the focus only for a run started in a dialog, and only until that run settles', () => {
	const { seen } = renderList('post publish')
	const live = focusinListeners()
	start()
	const outside = live()
	settle(seen.settles[0], true)
	start('Move to trash')
	const inDialog = live()

	settle(seen.settles[1], true)

	expect([outside, inDialog, live()]).toEqual([0, 1, 0])
})

test('stops watching the focus for a run once a newer run starts', () => {
	const { seen } = renderList('post publish')
	const live = focusinListeners()
	start('Move to trash')
	start('Move to trash')
	const both = live()

	settle(seen.settles[1], false)

	expect([both, live()]).toEqual([1, 0])
})

test('stops watching the focus for a run once another list is shown', () => {
	const { show } = renderList('post publish')
	const live = focusinListeners()
	start('Move to trash')
	const during = live()

	show('post trash')

	expect([during, live()]).toEqual([1, 0])
})

test('stops watching the focus for a run once the screen goes', () => {
	const { unmount } = renderList('post publish')
	const live = focusinListeners()
	start('Move to trash')
	const during = live()

	unmount()

	expect([during, live()]).toEqual([1, 0])
})

test('leaves the focus alone when a run moved nothing', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], false)

	expect(document.activeElement).toBe(control('Trash'))
})

test('ignores a run that is no longer the latest, though the focus sits inside the list', () => {
	const { seen } = renderList('post publish')
	start()
	start()

	settle(seen.settles[1], false)
	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Trash'))
})

test('ignores a run that is no longer the latest, though the focus fell to the page', () => {
	const { seen } = renderList('post publish')
	start()
	start()
	dropFocus()

	settle(seen.settles[1], false)
	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(document.body)
})

test('ignores a run started before the list changed, and leaves the focus alone', () => {
	const { seen, show } = renderList('post publish')
	start()
	show('post trash')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Trash'))
})

test('clears the ticked rows once another list is shown, and only then', () => {
	const { seen, onTicks, show } = renderList('post publish')
	show('post publish')
	expect(onTicks).not.toHaveBeenCalled()

	show('post trash')

	expect(onTicks).toHaveBeenCalledExactlyOnceWith([])
	expect(seen.ticked.at(-1)).toEqual([])
})

/**
 * Runs a list run with the selection setter a parent handed down.
 * @param props - The list on show and the parent's setter.
 * @returns Nothing.
 */
function ChildList({ scope, onChangeSelection }: { scope: string; onChangeSelection: (selection: string[]) => void }) {
	useListRun(scope, onChangeSelection)
	return null
}

/**
 * Holds the ticked rows and hands their setter to a child list.
 * @param props - The list on show and the ticked rows seen on each render.
 * @returns The child list.
 */
function ParentList({ scope, ticked }: { scope: string; ticked: string[][] }) {
	const [rows, setRows] = useState(['1', '2'])
	ticked.push(rows)
	return <ChildList scope={scope} onChangeSelection={setRows} />
}

test('clears ticked rows a parent holds once another list is shown, with no warning from React', () => {
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
	onTestFinished(() => {
		errors.mockRestore()
	})
	const ticked: string[][] = []
	const { rerender } = renderAdmin(<ParentList scope="post publish" ticked={ticked} />)

	rerender(<ParentList scope="post trash" ticked={ticked} />)

	expect(errors.mock.calls.filter(([message]) => /Cannot update a component/.test(String(message)))).toEqual([])
	expect(ticked.at(-1)).toEqual([])
})

test('hands the same run for as long as the screen stays, whichever list it shows', () => {
	const { seen, show } = renderList('post publish')
	show('post publish')
	expect(seen.runs.at(-1)).toBe(seen.runs[0])

	show('post trash')

	expect(seen.runs.at(-1)).toBe(seen.runs[0])
})

/**
 * Starts a reload of the list through the run a render handed.
 * @param run - The run the list handed.
 * @returns What ends that reload.
 */
function reload(run: ListRun): () => void {
	let end = () => {}
	act(() => {
		end = run.onRefresh()
	})
	return end
}

/**
 * Ends a reload of the list.
 * @param end - What ends the reload.
 */
function endReload(end: () => void): void {
	act(() => end())
}

/**
 * Reports whether the list reloads on its latest render.
 * @param seen - What the list screen recorded.
 * @returns The refreshing flag of the latest render.
 */
function reloading(seen: Seen): boolean {
	return (seen.states.at(-1) as ListRunState).refreshing
}

test('reports no reload before a run starts one', () => {
	const { seen } = renderList('post publish')
	const before = reloading(seen)
	start()
	const during = reloading(seen)

	settle(seen.settles[0], true)

	expect([before, during, reloading(seen)]).toEqual([false, false, false])
})

test('reports a reload from onRefresh until its end', () => {
	const { seen } = renderList('post publish')
	const end = reload(seen.runs[0])
	const during = reloading(seen)

	endReload(end)

	expect([during, reloading(seen)]).toEqual([true, false])
})

test('keeps reporting while a second reload still runs', () => {
	const { seen } = renderList('post publish')
	const first = reload(seen.runs[0])
	const second = reload(seen.runs[0])
	endReload(first)
	const during = reloading(seen)

	endReload(second)

	expect([during, reloading(seen)]).toEqual([true, false])
})

test('counts an end called twice once', () => {
	const { seen } = renderList('post publish')
	const end = reload(seen.runs[0])
	endReload(end)

	endReload(end)

	expect(reloading(seen)).toBe(false)
})

test('drops the reloads of the list before when the list on show changes, and ignores their ends', () => {
	const { seen, show } = renderList('post publish')
	const before = reload(seen.runs[0])
	const during = reloading(seen)
	show('post trash')
	const dropped = reloading(seen)
	const now = reload(seen.runs[0])

	endReload(before)

	expect([during, dropped, reloading(seen)]).toEqual([true, false, true])
	endReload(now)
	expect(reloading(seen)).toBe(false)
})

test('hands the same run, with onRefresh, across renders', () => {
	const { seen, show } = renderList('post publish')
	show('post publish')
	const [first] = seen.runs

	const end = reload(first)

	expect(seen.runs.at(-1)).toBe(first)
	expect(reloading(seen)).toBe(true)
	endReload(end)
})

test('ignores a run started before the list changed, even once the first list is shown again', () => {
	const { seen, show } = renderList('post publish')
	start()
	show('post trash')
	show('post publish')

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(control('Trash'))
})

test('settles a run on a screen that draws no list region, with nothing to focus', () => {
	const { seen } = renderList('post publish', false)
	start()
	dropFocus()

	settle(seen.settles[0], true)

	expect(document.activeElement).toBe(document.body)
})

test('reports a dialog holding the focus, and no dialog while the focus sits on the page or in the list', () => {
	renderList('post publish')
	const held: boolean[] = [focusInDialog()]
	focusOn('Trash')
	held.push(focusInDialog())
	focusOn('Title')
	held.push(focusInDialog())
	focusOn('Delete permanently')
	held.push(focusInDialog())

	expect(held).toEqual([false, false, true, true])
})

/** The titles of the posts the rows screen shows at first, one row each. */
const TITLES = ['Hello', 'Maria Perez', 'Goodbye']

/** The control a row can draw first in place of its box, each named after the row's title. */
const LEADS = {
	'button title': (name: string) => <div role="button" tabIndex={0} aria-label={name} />,
	link: (name: string) => <a href="#post" aria-label={name} />,
	select: (name: string) => <select aria-label={name} />,
	'text area': (name: string) => <textarea aria-label={name} />,
	'plain button': (name: string) => <button type="button" aria-label={name} />,
}

/** What a test reads back from the rows screen. */
interface RowsSeen {
	/** The settle function of each run started, in the order started. */
	settles: RunSettled[]
	/** The run the list handed on each render, in the order rendered. */
	runs: ListRun[]
}

/** What each row draws beside its title and its actions menu button. */
interface RowParts {
	/** Whether the row draws its box, true unless told. */
	boxes?: boolean
	/** The control the row draws before its title, none unless told. */
	lead?: keyof typeof LEADS
	/** Whether the row draws Restore as a primary action, true unless told. */
	primary?: boolean
}

/**
 * Renders post rows, each with its title and its actions as DataViews draws them, a bulk bar, a confirm and a menu.
 * @param props - The list and the rows on show, whether the bar and the region show, the row's parts, what to record.
 * @returns The page with its list region, Add Post in its header, the confirm once asked, and the menu.
 */
function RowsScreen({
	scope,
	shown,
	bar,
	list = true,
	boxes = true,
	lead,
	primary = true,
	seen,
}: {
	scope: string
	shown: string[]
	bar: boolean
	list?: boolean
	seen: RowsSeen
} & RowParts) {
	const [asking, setAsking] = useState(false)
	const { run, region } = useListRun(scope, keepTicks)
	seen.runs.push(run)
	const startRun = () => seen.settles.push(run.onStart())
	const ask = () => setAsking(true)
	return (
		<>
			<Page
				title="Posts"
				list={list}
				listLabel="Posts"
				listRef={region}
				actions={
					<button type="button" onClick={ask}>
						Add Post
					</button>
				}
			>
				<input type="search" aria-label="Search posts" />
				<table>
					<tbody>
						{shown.map((title) => (
							<tr key={title} className="dataviews-view-table__row">
								{boxes ? (
									<td>
										<input type="checkbox" aria-label={title} />
									</td>
								) : null}
								{lead === undefined ? null : <td>{LEADS[lead](`Open ${title}`)}</td>}
								<td>{title}</td>
								<td>
									<div className="dataviews-item-actions">
										{primary ? (
											<button type="button" onClick={startRun}>
												Restore
											</button>
										) : null}
										<button
											type="button"
											className="dataviews-all-actions-button"
											aria-label="Actions"
											onClick={startRun}
										/>
									</div>
								</td>
							</tr>
						))}
					</tbody>
				</table>
				{bar ? (
					<div className="dataviews-bulk-actions-footer__container">
						<button type="button" onClick={startRun}>
							Trash
						</button>
						<button type="button" onClick={ask}>
							Permanently delete
						</button>
					</div>
				) : null}
			</Page>
			{asking ? (
				<div role="dialog" aria-label="Delete posts">
					<button type="button" onClick={startRun}>
						Delete
					</button>
				</div>
			) : null}
			<div role="menu" tabIndex={-1} aria-label="Post actions" />
		</>
	)
}

/**
 * Renders the rows screen with every post and its bulk bar.
 * @param parts - What each row draws.
 * @returns What the screen recorded, and rerenders with the rows left, onto another list and with no list region.
 */
function renderRows(parts: RowParts = {}) {
	const seen: RowsSeen = { settles: [], runs: [] }
	const props = { ...parts, seen }
	const { rerender } = renderAdmin(<RowsScreen scope="post trash" shown={TITLES} bar {...props} />)
	return {
		seen,
		leave: (shown: string[], bar = true) =>
			rerender(<RowsScreen scope="post trash" shown={shown} bar={bar} {...props} />),
		show: (scope: string) => rerender(<RowsScreen scope={scope} shown={TITLES} bar {...props} />),
		hide: () => rerender(<RowsScreen scope="post trash" shown={TITLES} bar list={false} {...props} />),
	}
}

/**
 * Returns a button of the row that shows a post.
 * @param title - The title of the post, the text of its title cell.
 * @param name - The name of the button, Restore or Actions.
 * @returns The button.
 */
function rowButton(title: string, name: string): HTMLElement {
	const row = screen.getByText(title).closest('tr') as HTMLElement
	return within(row).getByRole('button', { name })
}

/**
 * Presses a control the reader reached by keyboard, focused first.
 * @param pressed - The control.
 */
function press(pressed: HTMLElement): void {
	act(() => pressed.focus())
	fireEvent.click(pressed)
}

/**
 * Runs a one row write from the control the reader presses: the run starts, the list is marked, the run settles.
 * @param seen - What the rows screen recorded.
 * @param pressed - The control the reader presses.
 * @returns What ends the reload.
 */
function writeFrom(seen: RowsSeen, pressed: HTMLElement): () => void {
	press(pressed)
	const end = reload(seen.runs[0])
	settle(seen.settles.at(-1) as RunSettled, true)
	return end
}

/**
 * Runs a one row write in the order a run built by hand takes: the run starts, the run settles, the list is marked.
 * @param seen - What the rows screen recorded.
 * @returns What ends the reload.
 */
function settleThenMark(seen: RowsSeen): () => void {
	settle(seen.settles.at(-1) as RunSettled, true)
	return reload(seen.runs[0])
}

test('puts the focus back on the control the reader pressed once the list has reloaded', () => {
	const { seen } = renderRows()
	const restore = rowButton('Maria Perez', 'Restore')
	const end = writeFrom(seen, restore)
	const during = document.activeElement

	endReload(end)

	expect([during, document.activeElement]).toEqual([listRegion(), restore])
})

test('moves the focus to the box of the row that took the place of the removed row once it reloaded', () => {
	const { seen, leave } = renderRows()
	const end = writeFrom(seen, rowButton('Maria Perez', 'Restore'))
	leave(['Hello', 'Goodbye'])

	endReload(end)

	expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Goodbye' }))
})

test('moves the focus to the box of the last row when fewer rows came back', () => {
	const { seen, leave } = renderRows()
	const end = writeFrom(seen, rowButton('Goodbye', 'Actions'))
	leave(['Hello'])

	endReload(end)

	expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Hello' }))
})

test('moves the focus to the box of the row now last when the last row left', () => {
	const { seen, leave } = renderRows()
	const end = writeFrom(seen, rowButton('Goodbye', 'Restore'))
	leave(['Hello', 'Maria Perez'])

	endReload(end)

	expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Maria Perez' }))
})

test('keeps the focus on the list region when the first control of the row in its place is an action button', () => {
	const { seen, leave } = renderRows({ boxes: false })
	const end = writeFrom(seen, rowButton('Maria Perez', 'Actions'))
	leave(['Hello', 'Goodbye'])

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('keeps the focus on the list region when the row now last starts with an action button', () => {
	const { seen, leave } = renderRows({ boxes: false })
	const end = writeFrom(seen, rowButton('Goodbye', 'Actions'))
	leave(['Hello', 'Maria Perez'])

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('moves the focus to the actions menu button of the row in its place when the rows draw only that menu', () => {
	const { seen, leave } = renderRows({ boxes: false, primary: false })
	const end = writeFrom(seen, rowButton('Maria Perez', 'Actions'))
	leave(['Hello', 'Goodbye'])

	endReload(end)

	expect(document.activeElement).toBe(rowButton('Goodbye', 'Actions'))
})

test('puts the focus back on the action button the reader pressed when its row stays in a list with no box', () => {
	const { seen } = renderRows({ boxes: false })
	const restore = rowButton('Maria Perez', 'Restore')
	const end = writeFrom(seen, restore)

	endReload(end)

	expect(document.activeElement).toBe(restore)
})

test.each(Object.keys(LEADS) as (keyof typeof LEADS)[])(
	'moves the focus to the first control of the row in its place when that control is a %s',
	(lead) => {
		const { seen, leave } = renderRows({ boxes: false, lead })
		const end = writeFrom(seen, rowButton('Maria Perez', 'Actions'))
		leave(['Hello', 'Goodbye'])

		endReload(end)

		expect(document.activeElement).toBe(screen.getByLabelText('Open Goodbye'))
	},
)

test('puts the focus back on the control the reader pressed when the run settled before it marked the list', () => {
	const { seen } = renderRows()
	const restore = rowButton('Maria Perez', 'Restore')
	press(restore)
	const end = settleThenMark(seen)
	const during = document.activeElement

	endReload(end)

	expect([during, document.activeElement]).toEqual([listRegion(), restore])
})

test('moves the focus to the box of the row in its place when the run settled before it marked the list', () => {
	const { seen, leave } = renderRows()
	press(rowButton('Maria Perez', 'Restore'))
	const end = settleThenMark(seen)
	leave(['Hello', 'Goodbye'])

	endReload(end)

	expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Goodbye' }))
})

test('puts the focus back on a control of the list the reader moved to before the run settled', () => {
	const { seen } = renderRows()
	press(rowButton('Maria Perez', 'Restore'))
	const moved = rowButton('Hello', 'Restore')
	act(() => moved.focus())
	const end = settleThenMark(seen)

	endReload(end)

	expect(document.activeElement).toBe(moved)
})

test('moves the focus to the box of the first row of the page that shows before the reload ends', () => {
	const { seen, leave } = renderRows()
	leave(['Goodbye'])
	const end = writeFrom(seen, rowButton('Goodbye', 'Restore'))
	leave(['Hello', 'Maria Perez'])

	endReload(end)

	expect(document.activeElement).toBe(screen.getByRole('checkbox', { name: 'Hello' }))
})

test('keeps the focus on the list region when the rows of another page show only after the reload ended', () => {
	const { seen, leave } = renderRows()
	leave(['Goodbye'])
	const end = writeFrom(seen, rowButton('Goodbye', 'Restore'))
	leave([])
	endReload(end)

	leave(['Hello', 'Maria Perez'])

	expect(document.activeElement).toBe(listRegion())
})

test('keeps the focus on the list region when no row came back', () => {
	const { seen, leave } = renderRows()
	const end = writeFrom(seen, rowButton('Maria Perez', 'Restore'))
	leave([])

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('keeps the focus on the list region when the bulk bar the reader pressed in is gone', () => {
	const { seen, leave } = renderRows()
	const end = writeFrom(seen, screen.getByRole('button', { name: 'Trash' }))
	leave(['Hello'], false)

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('puts the focus back on the button a confirm opened from once a run from that confirm has reloaded', () => {
	const { seen } = renderRows()
	const opener = screen.getByRole('button', { name: 'Permanently delete' })
	press(opener)
	const end = writeFrom(seen, screen.getByRole('button', { name: 'Delete' }))
	const during = document.activeElement

	endReload(end)

	expect([during, document.activeElement]).toEqual([listRegion(), opener])
})

test('keeps the focus on the list region after a run from a confirm the reader opened outside the list', () => {
	const { seen } = renderRows()
	act(() => rowButton('Hello', 'Restore').focus())
	press(screen.getByRole('button', { name: 'Add Post' }))
	const end = writeFrom(seen, screen.getByRole('button', { name: 'Delete' }))

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('keeps the focus on the list region after a run from a confirm opened outside the list from a menu', () => {
	const { seen } = renderRows()
	act(() => rowButton('Maria Perez', 'Actions').focus())
	act(() => screen.getByRole('menu').focus())
	press(screen.getByRole('button', { name: 'Add Post' }))
	const end = writeFrom(seen, screen.getByRole('button', { name: 'Delete' }))

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('leaves a focus the reader moved while the list reloaded where it is', () => {
	const { seen } = renderRows()
	const end = writeFrom(seen, rowButton('Maria Perez', 'Restore'))
	const search = screen.getByRole('searchbox', { name: 'Search posts' })
	act(() => search.focus())

	endReload(end)

	expect(document.activeElement).toBe(search)
})

test('drops the place the reader stood in once another list is shown', () => {
	const { seen, show } = renderRows()
	writeFrom(seen, rowButton('Maria Perez', 'Restore'))

	show('post publish')

	expect(document.activeElement).toBe(listRegion())
})

test('puts the focus back once per run, and leaves it on the list region after a later reload', () => {
	const { seen } = renderRows()
	const restore = rowButton('Maria Perez', 'Restore')
	endReload(writeFrom(seen, restore))
	const first = document.activeElement
	act(() => listRegion().focus())
	const later = reload(seen.runs[0])

	endReload(later)

	expect([first, document.activeElement]).toEqual([restore, listRegion()])
})

test('puts the focus back on the pressed control when a row above it left', () => {
	const { seen, leave } = renderRows()
	const restore = rowButton('Maria Perez', 'Restore')
	const end = writeFrom(seen, restore)
	leave(['Maria Perez', 'Goodbye'])

	endReload(end)

	expect(document.activeElement).toBe(restore)
})

test('forgets the opener of a confirm once a run from that confirm moved nothing', () => {
	const { seen } = renderRows()
	press(screen.getByRole('button', { name: 'Permanently delete' }))
	press(screen.getByRole('button', { name: 'Delete' }))
	settle(seen.settles.at(-1) as RunSettled, false)
	const end = reload(seen.runs[0])
	act(() => listRegion().focus())

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('drops the place of an earlier run once a run starts outside every dialog', () => {
	const { seen } = renderRows()
	const first = writeFrom(seen, rowButton('Maria Perez', 'Restore'))
	act(() => {
		seen.settles.push(seen.runs[0].onStart())
	})
	settle(seen.settles.at(-1) as RunSettled, true)
	const second = reload(seen.runs[0])

	endReload(first)
	endReload(second)

	expect(document.activeElement).toBe(listRegion())
})

test('forgets the opener of a confirm once the focus leaves the list for a control outside every dialog', () => {
	const { seen } = renderRows()
	const opener = screen.getByRole('button', { name: 'Permanently delete' })
	press(opener)
	act(() => screen.getByRole('button', { name: 'Delete' }).focus())
	act(() => opener.focus())
	press(screen.getByRole('button', { name: 'Add Post' }))
	const end = writeFrom(seen, screen.getByRole('button', { name: 'Delete' }))

	endReload(end)

	expect(document.activeElement).toBe(listRegion())
})

test('puts nothing back once the list region left while the list reloaded', () => {
	const { seen, hide } = renderRows()
	const end = writeFrom(seen, rowButton('Maria Perez', 'Restore'))
	hide()

	endReload(end)

	expect(document.activeElement).toBe(document.body)
	expect(screen.queryByRole('button', { name: 'Add Post' })).not.toBeNull()
})
