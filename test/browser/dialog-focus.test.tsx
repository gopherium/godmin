// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import { DataViews } from '@wordpress/dataviews'
import type { Action, Field, View } from '@wordpress/dataviews'
import { backup } from '@wordpress/icons'
import { InputControl } from '@wordpress/ui'
import { useMemo, useState } from 'react'
import { expect, test, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { ConfirmDialog, FormDialog } from '../../src/dialogs.js'
import type { DialogAnswer, FormDialogProps } from '../../src/dialogs.js'
import {
	Page,
	Toaster,
	focusedTrigger,
	useBulkRun,
	useDialogRun,
	useFocusBack,
	useListRun,
} from '../../src/index.js'
import type { BulkWords, Trigger } from '../../src/index.js'
import { sampleFocus } from './sample-focus.js'

/** How long a double click waits between its clicks, in milliseconds. */
const DOUBLE_CLICK_GAP = 60

/** How many times a held key repeats, long enough for a dialog asked by the first press to take the focus. */
const HELD_REPEATS = 20

/** How long a held key waits between its repeats, in milliseconds. */
const HELD_GAP = 33

/** What a bench draws: the action of its confirm, what it asks on arrival, and the place of Row A. */
interface Drawn {
	/** The action of the confirm. */
	onConfirm?: () => void | DialogAnswer | Promise<unknown>
	/** Whether the confirm is asked on the first render, with the focus on the page. */
	askedOnArrival?: boolean
}

/** A report of the list bench. */
interface Report {
	id: string
	title: string
}

/** The reports of the list bench, the first two ticked. */
const REPORTS: Report[] = ['1', '2', '3', '4'].map((id) => ({ id, title: `Report ${id}` }))

/** The field of the list bench: the title, marked with its item. */
const FIELDS: Field<Report>[] = [
	{
		id: 'title',
		label: 'Title',
		getValue: ({ item }) => item.title,
		render: ({ item }) => <span data-item-id={item.id}>{item.title}</span>,
	},
]

/** The view of the list bench: a table that shows its title. */
const VIEW: View = { type: 'table', titleField: 'title', page: 1, perPage: 10 }

/** The words a run of the list bench toasts. */
const WORDS: BulkWords<Report> = {
	done: (count) => `${count} reports deleted.`,
	failed: (failures) => `${failures.length} reports could not be deleted.`,
}

/** What the test ends by hand: each report's call, then the reload, with the reports it drops. */
interface Writes {
	ended: Map<string, () => void>
	call: (report: Report) => Promise<void>
	refresh: () => Promise<void>
	reloaded: (gone: string[]) => void
	leave: (gone: string[]) => void
}

/** Returns calls the test ends one report at a time and a reload it ends last. */
function heldWrites(): Writes {
	const writes: Writes = {
		ended: new Map(),
		reloaded: () => {},
		leave: () => {},
		call: async (report) =>
			new Promise<void>((done) => {
				writes.ended.set(report.id, done)
			}),
		refresh: async () =>
			new Promise<void>((done) => {
				writes.reloaded = (gone) => {
					writes.leave(gone)
					done()
				}
			}),
	}
	return writes
}

/** The reports a row confirm is asked over, and the control it was asked from. */
interface Asked {
	items: Report[]
	trigger: Trigger
}

/** Renders a list with a page button and row actions that each ask a confirm, and a button that draws the rows anew. */
function ListBench({ writes }: { writes: Writes }) {
	const [rows, setRows] = useState(REPORTS)
	const [selection, setSelection] = useState(['1', '2'])
	const [asked, setAsked] = useState<Asked>()
	const [renaming, setRenaming] = useState<Report[]>()
	const [adding, setAdding] = useState(false)
	const [drawing, setDrawing] = useState(0)
	const { run, region, refreshing } = useListRun('reports', setSelection)
	const bulk = useBulkRun<Report>(run, writes.refresh)
	const write = useDialogRun<Report>(run, writes.refresh)
	const focusBack = useFocusBack(refreshing, region)
	const words: BulkWords<Report> = {
		...WORDS,
		undo: (done) => ({ label: 'Undo', onAct: () => void bulk(done, writes.call, WORDS) }),
	}
	writes.leave = (gone) => setRows((now) => now.filter((row) => !gone.includes(row.id)))
	const actions = useMemo<Action<Report>[]>(() => {
		const ask = (items: Report[]) => setAsked({ items, trigger: focusedTrigger() })
		return [
			{ id: 'restore', label: 'Restore', icon: backup, isPrimary: true, callback: ask },
			{ id: 'delete', label: 'Delete', supportsBulk: true, callback: ask },
			{ id: 'rename', label: 'Rename', callback: setRenaming },
		]
	}, [])
	return (
		<Page
			title="Reports"
			list
			listLabel="Reports"
			listRef={region}
			actions={
				<button type="button" onClick={() => setAdding(true)}>
					Add report
				</button>
			}
		>
			<button type="button" onClick={() => setDrawing((times) => times + 1)}>
				Draw rows anew
			</button>
			<DataViews
				key={drawing}
				data={rows}
				fields={FIELDS}
				view={VIEW}
				onChangeView={() => {}}
				defaultLayouts={{ table: {} }}
				paginationInfo={{ totalItems: rows.length, totalPages: 1 }}
				actions={actions}
				selection={selection}
				onChangeSelection={setSelection}
				isLoading={refreshing}
			/>
			{asked ? (
				<ConfirmDialog
					title="Change these reports?"
					confirmLabel="Change them"
					cancelLabel="Cancel"
					onConfirm={async () => bulk(asked.items, writes.call, words)}
					onClose={() => {
						setAsked(undefined)
						focusBack(asked.items[0].id, asked.trigger)
					}}
				/>
			) : null}
			{renaming ? (
				<FormDialog
					title="Rename report"
					submitLabel="Save"
					cancelLabel="Cancel"
					onSubmit={async () => write(renaming, writes.call, WORDS)}
					onClose={() => setRenaming(undefined)}
				>
					<InputControl label="Name" />
				</FormDialog>
			) : null}
			{adding ? (
				<ConfirmDialog
					title="Add a report?"
					confirmLabel="Add"
					cancelLabel="Cancel"
					onConfirm={() => undefined}
					onClose={() => setAdding(false)}
				/>
			) : null}
		</Page>
	)
}

/** Draws the list bench under a toaster and returns what the test ends by hand. */
function renderList(): Writes {
	const writes = heldWrites()
	render(
		<Toaster>
			<ListBench writes={writes} />
		</Toaster>,
	)
	return writes
}

/** Returns a control of the row that shows a report. */
function rowControl(title: string, role: 'button' | 'checkbox', name: string): HTMLElement {
	const row = screen.getByText(title).closest('tr') as HTMLElement
	return within(row).getByRole(role, { name })
}

/** Returns the bulk button of the list. */
function bulkButton(): HTMLElement {
	const footer = document.querySelector('.dataviews-footer') as HTMLElement
	return within(footer).getByRole('button', { name: 'Delete' })
}

/** Asks a confirm from the actions menu of Report 3 by key. */
async function askFromMenuByKey(): Promise<void> {
	rowControl('Report 3', 'button', 'Actions').focus()
	await userEvent.keyboard('{Enter}')
	const item = await screen.findByRole('menuitem', { name: 'Delete' })
	item.focus()
	await userEvent.keyboard('{Enter}')
}

/** Asks a confirm from the actions menu of Report 3 by mouse. */
async function askFromMenuByMouse(): Promise<void> {
	await userEvent.click(rowControl('Report 3', 'button', 'Actions'))
	await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete' }))
}

/** Asks a confirm from a control of the page by key. */
async function askByKey(control: HTMLElement): Promise<void> {
	control.focus()
	await userEvent.keyboard('{Enter}')
}

/** Reports whether the rows of the list are out of reach while it reloads. */
function rowsInert(): boolean {
	return document.querySelector('.dataviews-view-table')?.hasAttribute('inert') === true
}

/** Renders a link, two rows that each ask a confirm, a region and a button that drops Row B. */
function Bench({ onConfirm = () => undefined, askedOnArrival = false }: Drawn) {
	const [asking, setAsking] = useState(askedOnArrival)
	const [rowB, setRowB] = useState(true)
	return (
		<>
			<a href="#top">First link</a>
			<button type="button" onClick={() => setAsking(true)}>
				Row A
			</button>
			{rowB ? (
				<button type="button" onClick={() => setAsking(true)}>
					Row B
				</button>
			) : null}
			<div role="region" aria-label="Posts" tabIndex={-1} />
			<button type="button" onClick={() => setRowB(false)}>
				Drop Row B
			</button>
			{asking ? (
				<ConfirmDialog
					title="Empty the trash?"
					confirmLabel="Empty trash"
					cancelLabel="Cancel"
					onConfirm={onConfirm}
					onClose={() => setAsking(false)}
				/>
			) : null}
		</>
	)
}

/** Returns a control of the page, whether or not the dialog hides it. */
function pageControl(name: string): HTMLElement {
	return screen.getByRole('button', { name, hidden: true })
}

/** Returns the region of the page, whether or not the dialog hides it. */
function region(): HTMLElement {
	return screen.getByRole('region', { name: 'Posts', hidden: true })
}

/** Returns the dimmed layer behind the dialog. */
function backdropOf(): Element {
	return document.querySelector('[class*="backdrop"]') as Element
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Waits for the dialog to take the focus and returns it, with Cancel and the button of the given name. */
async function dialogInFocus(confirmLabel = 'Empty trash') {
	const popup = await screen.findByRole('alertdialog')
	const cancel = within(popup).getByRole('button', { name: 'Cancel' })
	await expect.poll(() => document.activeElement).toBe(cancel)
	return { popup, cancel, confirm: within(popup).getByRole('button', { name: confirmLabel }) }
}

/** Asks the dialog by key from a control of the page and waits for the dialog to take the focus. */
async function askFrom(name: string) {
	pageControl(name).focus()
	await userEvent.keyboard('{Enter}')
	return dialogInFocus()
}

/** Waits for the dialog to leave, and for the frames in which the focus settles. */
async function left(popup: HTMLElement): Promise<void> {
	await expect.poll(() => popup.isConnected).toBe(false)
	await frames(3)
}

/** Waits for the card to end its entry and returns the middle of a control, in the page's own terms. */
async function middleOf(control: HTMLElement, popup: HTMLElement): Promise<[number, number]> {
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))
	const box = control.getBoundingClientRect()
	return [box.left + box.width / 2, box.top + box.height / 2]
}

test('puts the first focus on Cancel', async () => {
	render(<Bench />)

	const { cancel } = await askFrom('Row A')

	expect(document.activeElement).toBe(cancel)
})

test('wraps Tab inside the dialog, and Shift Tab back', async () => {
	render(<Bench />)
	const { cancel, confirm } = await askFrom('Row A')

	await userEvent.keyboard('{Tab}')
	await frames(3)
	expect(document.activeElement).toBe(confirm)

	await userEvent.keyboard('{Tab}')
	await frames(3)
	expect(document.activeElement).toBe(cancel)

	await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
	await frames(3)
	expect(document.activeElement).toBe(confirm)
})

test('keeps the focus in the popup through the exit, then lands on the control that asked it', async () => {
	render(<Bench />)
	const { popup, cancel } = await askFrom('Row A')
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))
	const focus = sampleFocus()

	await userEvent.keyboard('{Enter}')

	await expect.poll(() => popup.getAnimations().length).toBeGreaterThan(0)
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))
	focus.stop()
	expect([...focus.seen]).toEqual([cancel])
	await left(popup)
	expect(document.activeElement).toBe(pageControl('Row A'))
})

test('leaves the focus on the page once the control that asked left, never on a control used earlier', async () => {
	render(<Bench />)
	const first = await askFrom('Row A')
	await userEvent.keyboard('{Escape}')
	await left(first.popup)
	expect(document.activeElement).toBe(pageControl('Row A'))

	const { popup } = await askFrom('Row B')
	pageControl('Drop Row B').click()
	await expect.poll(() => screen.queryByRole('button', { name: 'Row B', hidden: true })).toBeNull()
	await userEvent.keyboard('{Escape}')
	await left(popup)

	expect(document.activeElement).toBe(document.body)
})

test('keeps the focus where a handler that ended well moved it', async () => {
	render(
		<Bench
			onConfirm={async () => {
				region().focus()
			}}
		/>,
	)
	const { popup, confirm } = await askFrom('Row A')
	confirm.focus()

	await userEvent.keyboard('{Enter}')
	await left(popup)

	expect(document.activeElement).toBe(region())
})

test('leaves the focus on the page for a dialog asked from the page, never on the first link', async () => {
	render(<Bench askedOnArrival />)
	const { popup } = await dialogInFocus()

	await userEvent.keyboard('{Escape}')
	await left(popup)

	expect(document.activeElement).toBe(document.body)
})

test.each([
	{
		route: 'a row button',
		ask: async () => askByKey(rowControl('Report 3', 'button', 'Restore')),
		pressed: () => rowControl('Report 3', 'button', 'Restore'),
		ids: ['3'],
		landing: () => rowControl('Report 4', 'checkbox', 'Report 4'),
	},
	{
		route: 'a row menu by key',
		ask: askFromMenuByKey,
		pressed: () => rowControl('Report 3', 'button', 'Actions'),
		ids: ['3'],
		landing: () => rowControl('Report 4', 'checkbox', 'Report 4'),
	},
	{
		route: 'a row menu by mouse',
		ask: askFromMenuByMouse,
		pressed: () => rowControl('Report 3', 'button', 'Actions'),
		ids: ['3'],
		landing: () => rowControl('Report 4', 'checkbox', 'Report 4'),
	},
	{
		route: 'the bulk bar',
		ask: async () => askByKey(bulkButton()),
		pressed: bulkButton,
		ids: ['1', '2'],
		landing: bulkButton,
	},
])('puts the focus back on the control that asked from $route, then lands it once the run reloaded', async (shape) => {
	const writes = renderList()
	await shape.ask()
	const cancelled = await dialogInFocus('Change them')
	await userEvent.keyboard('{Escape}')
	await left(cancelled.popup)
	expect(document.activeElement, 'the focus after Escape').toBe(shape.pressed())

	await shape.ask()
	const { popup, confirm } = await dialogInFocus('Change them')
	confirm.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => writes.ended.size).toBe(shape.ids.length)
	writes.ended.forEach((end) => end())
	await left(popup)
	expect(document.activeElement, 'the focus while the list reloads').toBe(
		screen.getByRole('region', { name: 'Reports' }),
	)

	writes.reloaded([shape.ids[0]])
	await expect.poll(rowsInert).toBe(false)
	await frames(3)
	expect(document.activeElement, 'the focus once the list reloaded').toBe(shape.landing())
})

test('lands the focus on the row as a row form leaves, once a reload that ended before its card left', async () => {
	const writes = renderList()
	const opener = rowControl('Report 3', 'button', 'Actions')
	opener.focus()
	await userEvent.keyboard('{Enter}')
	const rename = await screen.findByRole('menuitem', { name: 'Rename' })
	rename.focus()
	await userEvent.keyboard('{Enter}')
	const popup = await screen.findByRole('dialog')
	const name = within(popup).getByRole('textbox', { name: 'Name' })
	await expect.poll(() => document.activeElement).toBe(name)
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))

	await userEvent.keyboard('{Enter}')
	await expect.poll(() => writes.ended.size).toBe(1)
	writes.ended.forEach((end) => end())
	await expect.poll(() => popup.getAnimations().length).toBeGreaterThan(0)
	popup.getAnimations().forEach((transition) => transition.pause())
	writes.reloaded([])
	await expect.poll(rowsInert).toBe(false)
	await frames(3)
	expect(document.activeElement, 'the focus once the list reloaded, the card still leaving').toBe(opener)

	popup.getAnimations().forEach((transition) => transition.finish())
	await left(popup)
	expect(document.activeElement, 'the focus once the card left').toBe(opener)
})

test('leaves the focus on the page once the rows were drawn anew, and the list lands it on the same item', async () => {
	renderList()
	await askByKey(pageControl('Add report'))
	const added = await dialogInFocus('Add')
	await userEvent.keyboard('{Escape}')
	await left(added.popup)
	expect(document.activeElement, 'the focus after the page button asked').toBe(pageControl('Add report'))

	const opener = rowControl('Report 3', 'button', 'Actions')
	await askFromMenuByKey()
	const { popup } = await dialogInFocus('Change them')
	pageControl('Draw rows anew').click()
	await expect.poll(() => opener.isConnected).toBe(false)
	await userEvent.keyboard('{Escape}')
	await left(popup)

	expect(document.activeElement, 'the focus once the dialog left').toBe(rowControl('Report 3', 'button', 'Actions'))
})

test('puts the focus on the list region once Undo from a toast ran', async () => {
	const writes = renderList()
	await askByKey(rowControl('Report 3', 'button', 'Restore'))
	const { popup, confirm } = await dialogInFocus('Change them')
	confirm.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => writes.ended.size).toBe(1)
	writes.ended.forEach((end) => end())
	writes.ended.clear()
	await left(popup)
	writes.reloaded(['3'])
	await expect.poll(rowsInert).toBe(false)

	const undo = await screen.findByRole('button', { name: 'Undo' })
	undo.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => writes.ended.size).toBe(1)
	writes.ended.forEach((end) => end())

	await expect.poll(() => document.activeElement).toBe(screen.getByRole('region', { name: 'Reports' }))
})

test('sends once on a double click on the confirm button of a dialog that stays, then on Enter and Space', async () => {
	const onConfirm = vi.fn((): DialogAnswer => ({ close: false }))
	render(<Bench onConfirm={onConfirm} />)
	const { popup, confirm } = await askFrom('Row A')

	const [x, y] = await middleOf(confirm, popup)
	await commands.doubleClickAt(x, y, DOUBLE_CLICK_GAP)
	await frames(3)
	expect(onConfirm).toHaveBeenCalledOnce()

	confirm.focus()
	await userEvent.keyboard('{Enter}')
	await frames(3)
	expect(onConfirm).toHaveBeenCalledTimes(2)

	await userEvent.keyboard('[Space]')
	await frames(3)
	expect(onConfirm).toHaveBeenCalledTimes(3)
})

test('confirms nothing on a double click on a control that sits under the confirm button', async () => {
	const onConfirm = vi.fn()
	render(<Bench onConfirm={onConfirm} />)
	const measured = await askFrom('Row A')
	const [x, y] = await middleOf(measured.confirm, measured.popup)
	await userEvent.keyboard('{Escape}')
	await left(measured.popup)
	const opener = pageControl('Row A')
	Object.assign(opener.style, {
		position: 'fixed',
		left: `${x - 40}px`,
		top: `${y - 20}px`,
		width: '80px',
		height: '40px',
	})

	await commands.doubleClickAt(x, y, DOUBLE_CLICK_GAP)
	const popup = await screen.findByRole('alertdialog')
	await frames(3)

	expect(popup.isConnected).toBe(true)
	expect(onConfirm).not.toHaveBeenCalled()
})

test('sends once on a held Enter on the confirm button of a dialog that stays', async () => {
	const onConfirm = vi.fn((): DialogAnswer => ({ close: false }))
	render(<Bench onConfirm={onConfirm} />)
	const { confirm } = await askFrom('Row A')
	confirm.focus()

	await commands.holdKey('Enter', HELD_REPEATS, HELD_GAP)
	await frames(3)

	expect(onConfirm).toHaveBeenCalledOnce()
})

test('stays open on an Enter held from the control that asked it', async () => {
	const onConfirm = vi.fn()
	render(<Bench onConfirm={onConfirm} />)
	pageControl('Row A').focus()

	await commands.holdKey('Enter', HELD_REPEATS, HELD_GAP)
	const { popup } = await dialogInFocus()
	await frames(3)

	expect(popup.isConnected).toBe(true)
	expect(onConfirm).not.toHaveBeenCalled()
})

/** What the form bench changes on its dialog: the send, the send gate, and whether its first field is needed. */
interface FormDrawn {
	/** Sends the form. */
	onSubmit?: FormDialogProps['onSubmit']
	/** Whether the form may be sent now. */
	canSubmit?: boolean
	/** Whether the first field must be filled before a send. */
	titleRequired?: boolean
}

/** Renders two buttons that open a form dialog with two fields, and a button that drops the second. */
function FormBench({ onSubmit = () => undefined, canSubmit, titleRequired = false }: FormDrawn) {
	const [asking, setAsking] = useState(false)
	const [second, setSecond] = useState(true)
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Add Page
			</button>
			{second ? (
				<button type="button" onClick={() => setAsking(true)}>
					Add Post
				</button>
			) : null}
			<button type="button" onClick={() => setSecond(false)}>
				Drop Add Post
			</button>
			{asking ? (
				<FormDialog
					title="Add Page"
					submitLabel="Add"
					cancelLabel="Cancel"
					canSubmit={canSubmit}
					onSubmit={onSubmit}
					onClose={() => setAsking(false)}
				>
					<InputControl label="Title" required={titleRequired} />
					<InputControl label="Summary" />
				</FormDialog>
			) : null}
		</>
	)
}

/** Opens the form bench's dialog by key from a button, waits for the focus on its first field, gives its controls. */
async function formInFocus(opener = 'Add Page') {
	pageControl(opener).focus()
	await userEvent.keyboard('{Enter}')
	const popup = await screen.findByRole('dialog')
	const title = within(popup).getByRole('textbox', { name: /^Title/ })
	await expect.poll(() => document.activeElement).toBe(title)
	const [close, cancel, save] = ['Close', 'Cancel', 'Add'].map((name) => within(popup).getByRole('button', { name }))
	return { popup, title, summary: within(popup).getByRole('textbox', { name: 'Summary' }), close, cancel, save }
}

test('puts the first focus of a form dialog on its first field, past the close icon', async () => {
	render(<FormBench />)

	const { title } = await formInFocus()

	expect(document.activeElement).toBe(title)
})

test('wraps Tab inside a form dialog, and Shift Tab back', async () => {
	render(<FormBench />)
	const { title, summary, close, cancel, save } = await formInFocus()

	const reached: (Element | null)[] = []
	for (let press = 0; press < 5; press += 1) {
		await userEvent.keyboard('{Tab}')
		await frames(3)
		reached.push(document.activeElement)
	}
	expect(reached).toEqual([summary, cancel, save, close, title])

	await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
	await frames(3)
	expect(document.activeElement).toBe(close)
})

test('sends a form once on each Enter in either field, through its footer button', async () => {
	const onSubmit = vi.fn((): DialogAnswer => ({ close: false }))
	render(<FormBench onSubmit={onSubmit} />)
	const { summary } = await formInFocus()

	await userEvent.keyboard('{Enter}')
	await frames(3)
	expect(onSubmit).toHaveBeenCalledOnce()

	summary.focus()
	await userEvent.keyboard('{Enter}')
	await frames(3)
	expect(onSubmit).toHaveBeenCalledTimes(2)
})

test('sends nothing on Enter in a field while Save is greyed', async () => {
	const onSubmit = vi.fn()
	render(<FormBench onSubmit={onSubmit} canSubmit={false} />)
	await formInFocus()

	await userEvent.keyboard('{Enter}')
	await frames(3)

	expect(onSubmit).not.toHaveBeenCalled()
})

test('sends nothing on Enter in a blank field the form needs', async () => {
	const onSubmit = vi.fn()
	render(<FormBench onSubmit={onSubmit} titleRequired />)
	await formInFocus()

	await userEvent.keyboard('{Enter}')
	await frames(3)

	expect(onSubmit).not.toHaveBeenCalled()
})

test('leaves the focus on the page once the button that opened a form left, never on one used earlier', async () => {
	render(<FormBench />)
	const first = await formInFocus()
	await userEvent.keyboard('{Escape}')
	await left(first.popup)
	expect(document.activeElement).toBe(pageControl('Add Page'))

	const { popup } = await formInFocus('Add Post')
	pageControl('Drop Add Post').click()
	await expect.poll(() => screen.queryByRole('button', { name: 'Add Post', hidden: true })).toBeNull()
	await userEvent.keyboard('{Escape}')
	await left(popup)

	expect(document.activeElement).toBe(document.body)
})

test('closes a form dialog on Escape with the focus on a Save greyed while a field is empty', async () => {
	render(<FormBench canSubmit={false} />)
	const { popup, save } = await formInFocus()
	save.focus()
	await expect.poll(() => document.activeElement).toBe(save)

	await userEvent.keyboard('{Escape}')

	await left(popup)
	expect(document.activeElement).toBe(pageControl('Add Page'))
})

/** Returns a write the test ends by hand, and what ends it. */
function heldForm(): { write: () => Promise<void>; end: () => void } {
	let end = () => {}
	return {
		write: async () =>
			new Promise<void>((done) => {
				end = done
			}),
		end: () => end(),
	}
}

test.each(['Add', 'Cancel'])('keeps a form dialog open on Escape from %s greyed while it writes', async (name) => {
	const held = heldForm()
	render(<FormBench onSubmit={held.write} />)
	const { popup, save } = await formInFocus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => save.getAttribute('aria-disabled')).toBe('true')
	const greyed = within(popup).getByRole('button', { name })
	greyed.focus()
	await expect.poll(() => document.activeElement).toBe(greyed)

	await userEvent.keyboard('{Escape}')
	await frames(3)

	expect(popup.isConnected).toBe(true)
	expect(popup.hasAttribute('data-ending-style')).toBe(false)
	held.end()
	await left(popup)
})

test('sends a form once on a double click on Save over a write that stays, then on Enter and Space', async () => {
	const onSubmit = vi.fn(async (): Promise<DialogAnswer> => {
		await new Promise((done) => setTimeout(done, 20))
		return { close: false }
	})
	render(<FormBench onSubmit={onSubmit} />)
	const { popup, save } = await formInFocus()
	const idle = async () => expect.poll(() => save.getAttribute('aria-disabled')).not.toBe('true')

	const [x, y] = await middleOf(save, popup)
	await commands.doubleClickAt(x, y, DOUBLE_CLICK_GAP)
	await idle()
	await frames(3)
	expect(onSubmit).toHaveBeenCalledOnce()

	save.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => onSubmit.mock.calls.length).toBe(2)
	await idle()

	await userEvent.keyboard('[Space]')
	await expect.poll(() => onSubmit.mock.calls.length).toBe(3)
	await idle()
})

test.each([
	['Escape', async () => userEvent.keyboard('{Escape}')],
	['Cancel', async () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
	['a click on the dimmed page', async () => userEvent.click(backdropOf(), { position: { x: 8, y: 8 } })],
])('sends nothing on a press on Save or on Enter while a form dialog leaves after %s', async (_way, close) => {
	const onSubmit = vi.fn()
	render(<FormBench onSubmit={onSubmit} />)
	const { popup, save, title } = await formInFocus()
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))

	await close()
	await expect.poll(() => popup.getAnimations().length).toBeGreaterThan(0)
	popup.getAnimations().forEach((transition) => transition.pause())
	await userEvent.click(save, { force: true })
	title.focus()
	await userEvent.keyboard('{Enter}')
	await frames(3)

	expect(onSubmit).not.toHaveBeenCalled()
	popup.getAnimations().forEach((transition) => transition.finish())
	await left(popup)
})
