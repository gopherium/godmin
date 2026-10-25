// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
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
 * @param props - The list on show, whether it draws its region, the spy on the selection setter and what to record.
 * @returns The page with its list region and the dialogs.
 */
function ListScreen({
	scope,
	region = true,
	onTicks,
	seen,
}: {
	scope: string
	region?: boolean
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
			<div role="dialog" aria-label="Trash posts">
				<button type="button" onClick={startRun}>
					Move to trash
				</button>
			</div>
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
 * @returns What the screen recorded, the selection spy and a rerender onto another list.
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
	}
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

	expect(Object.keys(seen.states.at(-1) as ListRunState).sort()).toEqual(['region', 'run'])
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
 * Renders a trash list whose Empty Trash opens a confirm that starts a run and closes at once, beside an Edit form.
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
					opener ? (
						<button type="button" onClick={() => setAsking(true)}>
							Empty Trash
						</button>
					) : null
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
 * Empties the trash through a confirm that closes at once and gives the focus back to Empty Trash.
 * @returns The settle of each run started and a rerender that takes Empty Trash off the page.
 */
async function emptyTrash() {
	const settles: RunSettled[] = []
	const { rerender } = renderAdmin(<TrashScreen opener settles={settles} />)
	start('Empty Trash')
	await screen.findByRole('button', { name: 'Empty trash' })
	start('Empty trash')
	await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Empty the trash?' })).toBeNull())
	return { settles, dropOpener: () => rerender(<TrashScreen opener={false} settles={settles} />) }
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
