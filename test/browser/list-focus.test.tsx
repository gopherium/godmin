// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import { DataViews } from '@wordpress/dataviews'
import type { Action, Field, View } from '@wordpress/dataviews'
import { backup, trash } from '@wordpress/icons'
import { useMemo, useState } from 'react'
import { expect, onTestFinished, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { Frame, Page, RunConfirm, Toaster, useBulkRun, useListRun } from '../../src/index.js'
import type { BulkWords } from '../../src/index.js'

/** A row of the sample list. */
interface Report {
	id: string
	title: string
}

/** The two rows of the sample list, both ticked. */
const ROWS: Report[] = [
	{ id: '1', title: 'Report 1' },
	{ id: '2', title: 'Report 2' },
]

/** Forty rows, a list taller than the page, all ticked. */
const TALL: Report[] = Array.from({ length: 40 }, (_, index) => ({ id: `${index + 1}`, title: `Report ${index + 1}` }))

/** The fields of the sample list, its title and a picture only a view with `mediaField` shows. */
const FIELDS: Field<Report>[] = [
	{ id: 'title', label: 'Title', getValue: ({ item }) => item.title },
	{ id: 'picture', label: 'Picture', render: () => <span /> },
]

/** The view the sample list opens on: a table of up to forty rows a page, showing only its title. */
const VIEW: View = { type: 'table', titleField: 'title', page: 1, perPage: 40 }

/** The same list as a grid of up to forty cards a page. */
const GRID: View = { type: 'grid', titleField: 'title', page: 1, perPage: 40 }

/** The same list in the list layout a phone shows. */
const LIST: View = { type: 'list', titleField: 'title', page: 1, perPage: 40 }

/** The words a trash run toasts. */
const WORDS: BulkWords<Report> = {
	done: (count) => `${count} reports moved to the trash.`,
	failed: (failures) => `${failures.length} reports could not be moved to the trash.`,
}

/** The words a restore toasts, naming the one report it restored. */
const RESTORED: BulkWords<Report> = {
	done: (count, only) => (only === undefined ? `${count} reports restored.` : `"${only.title}" has been restored.`),
	failed: (failures) => `${failures.length} reports could not be restored.`,
}

/** The words a permanent delete toasts. */
const DELETED: BulkWords<Report> = {
	done: (count) => `${count} reports deleted.`,
	failed: (failures) => `${failures.length} reports could not be deleted.`,
}

/** What the test ends by hand: each row's call, worked or failed, then the reload, with the rows it drops. */
interface Held {
	call: (report: Report) => Promise<void>
	refresh: () => Promise<void>
	ended: Map<string, (worked?: boolean) => void>
	reloaded: (gone?: string[]) => void
	leave: (gone: string[]) => void
}

/** Returns calls the test ends one row at a time and a reload it ends last. */
function held(): Held {
	const bench: Held = {
		ended: new Map(),
		reloaded: () => {},
		leave: () => {},
		call: async (report) =>
			new Promise<void>((done, failed) => {
				bench.ended.set(report.id, (worked = true) => (worked ? done() : failed(new Error('refused'))))
			}),
		refresh: async () =>
			new Promise<void>((done) => {
				bench.reloaded = (gone = []) => {
					bench.leave(gone)
					done()
				}
			}),
	}
	return bench
}

/** How a test draws the rows: the ones ticked, the view, the bulk runs, the row's own button, and a click. */
interface Drawn {
	ticked?: string[]
	view?: View
	bulkActions?: boolean
	primary?: 'restore' | 'delete' | 'none'
	onClickItem?: (report: Report) => void
}

/** Renders the rows, all ticked unless told, with a Trash, a row Restore and a confirmed delete, on held calls. */
function Reports({
	bench,
	rows = ROWS,
	ticked,
	view = VIEW,
	bulkActions = true,
	primary = 'restore',
	onClickItem,
}: { bench: Held; rows?: Report[] } & Drawn) {
	const [selection, setSelection] = useState(() => ticked ?? rows.map((row) => row.id))
	const { run, region, refreshing } = useListRun('reports', setSelection)
	const bulk = useBulkRun<Report>(run, bench.refresh)
	const actions = useMemo<Action<Report>[]>(
		() => [
			{
				id: 'trash',
				label: 'Trash',
				icon: trash,
				supportsBulk: bulkActions,
				callback: (items) => bulk(items, bench.call, WORDS),
			},
			{
				id: 'restore',
				label: 'Restore',
				icon: backup,
				isPrimary: primary === 'restore',
				callback: (items) => bulk(items, bench.call, RESTORED),
			},
			{
				id: 'delete',
				label: 'Permanently delete',
				supportsBulk: bulkActions,
				isPrimary: primary === 'delete',
				hideModalHeader: true,
				modalFocusOnMount: 'firstContentElement',
				RenderModal: ({ items, closeModal }) => (
					<RunConfirm
						items={items}
						closeModal={closeModal}
						confirmLabel="Delete"
						cancelLabel="Cancel"
						run={(reports) => bulk(reports, bench.call, DELETED)}
					>
						Delete these reports for good?
					</RunConfirm>
				),
			},
		],
		[bulk, bench, bulkActions, primary],
	)
	return (
		<Page title="Reports" list listLabel="Reports" listRef={region}>
			<DataViews
				data={rows}
				fields={FIELDS}
				view={view}
				onChangeView={() => {}}
				defaultLayouts={{ [view.type]: {} }}
				paginationInfo={{ totalItems: rows.length, totalPages: 1 }}
				actions={actions}
				selection={selection}
				onChangeSelection={setSelection}
				onClickItem={onClickItem}
				isLoading={refreshing}
			/>
		</Page>
	)
}

/** Records the element that holds the focus on every frame until stopped. */
function sampleFocus(): { seen: Set<Element | null>; stop: () => void } {
	const seen = new Set<Element | null>()
	let going = true
	const sample = () => {
		seen.add(document.activeElement)
		if (going) {
			requestAnimationFrame(sample)
		}
	}
	sample()
	return { seen, stop: () => (going = false) }
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Reports whether the table, the grid or the list layout of the list is inert. */
function tableInert(): boolean {
	const layout = document.querySelector('.dataviews-view-table, .dataviews-view-grid, .dataviews-view-list')
	return layout?.hasAttribute('inert') === true
}

/** Renders the bench: forty rows and no DataViews sheet, a region shorter than its rows, guarding the focus option. */
function renderTall(bench: Held): HTMLElement {
	render(
		<Toaster>
			<Frame.Root location="/">
				<Frame.Canvas>
					<Reports bench={bench} rows={TALL} />
				</Frame.Canvas>
			</Frame.Root>
		</Toaster>,
	)
	return document.querySelector<HTMLElement>('.godmin-layout__canvas') as HTMLElement
}

/** Scrolls the control to the bottom of the canvas, focuses it and returns where the canvas then stands. */
async function focusAtBottom(control: HTMLElement, canvas: HTMLElement): Promise<number> {
	control.scrollIntoView({ block: 'end' })
	control.focus()
	await frames(2)
	return canvas.scrollTop
}

/** Returns the toast on show, none while no toast shows. */
function toastText(): string | null | undefined {
	return document.querySelector('.godmin-toast')?.textContent
}

/** The stylesheets of the WordPress components and of DataViews, which the stories load. */
const SHEETS = ['@wordpress/components/build-style/style.css', '@wordpress/dataviews/build-style/style.css']

/** Loads the stylesheets the stories load, for the running test only. */
async function loadSheets(): Promise<void> {
	await Promise.all(
		SHEETS.map(
			async (sheet) =>
				new Promise((loaded, failed) => {
					const link = document.createElement('link')
					link.rel = 'stylesheet'
					link.href = `/node_modules/${sheet}`
					link.onload = loaded
					link.onerror = failed
					document.head.append(link)
					onTestFinished(() => link.remove())
				}),
		),
	)
}

/** Renders the forty rows, drawn as asked, where a reload drops the rows the test names. */
function LiveReports({ bench, drawn }: { bench: Held; drawn: Drawn }) {
	const [rows, setRows] = useState(TALL)
	bench.leave = (gone) => setRows((now) => now.filter((row) => !gone.includes(row.id)))
	return <Reports bench={bench} rows={rows} {...drawn} />
}

/** Renders the forty rows on a real page, the admin frame with the stories' stylesheets, none ticked unless told. */
async function renderReal(bench: Held, drawn: Drawn = {}): Promise<void> {
	await loadSheets()
	render(
		<Toaster>
			<Frame.Root location="/">
				<Frame.Canvas>
					<LiveReports bench={bench} drawn={{ ticked: [], ...drawn }} />
				</Frame.Canvas>
			</Frame.Root>
		</Toaster>,
	)
	const rows = document.querySelector('.dataviews-layout__container') as HTMLElement
	expect(getComputedStyle(rows).overflowY, 'the rows scroll inside DataViews').toBe('auto')
}

/** Returns the row of the table, the card of the grid or the item of the list that shows a report, by its title. */
function holderOf(title: string): HTMLElement {
	const holders = 'tr, .dataviews-view-grid__card, .dataviews-view-list__item-wrapper'
	return screen.getByText(title).closest(holders) as HTMLElement
}

/** Returns a button of the row or the card that shows a report. */
function rowButton(title: string, name: string): HTMLElement {
	return within(holderOf(title)).getByRole('button', { name })
}

/** Returns the box of the row or the card that shows a report, named after it. */
function rowBox(title: string): HTMLElement {
	return within(holderOf(title)).getByRole('checkbox', { name: title })
}

/** Reaches a control with the Tab key from the control before it. */
async function tabTo(control: HTMLElement): Promise<void> {
	control.scrollIntoView({ block: 'end' })
	control.focus()
	await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
	await userEvent.keyboard('{Tab}')
	await frames(2)
}

/** Reaches a control with the Tab key and presses it with Enter. */
async function pressKey(control: HTMLElement): Promise<void> {
	await tabTo(control)
	await userEvent.keyboard('{Enter}')
}

/** Scrolls a control into view and presses it with the mouse. */
async function click(control: HTMLElement): Promise<void> {
	control.scrollIntoView({ block: 'end' })
	await frames(2)
	await userEvent.click(control)
}

/** Ends the one call on a report, waits for its toast, then ends the reload that drops the rows named. */
async function endCall(bench: Held, id: string, toast: string, gone = [id]): Promise<void> {
	await expect.poll(() => bench.ended.size).toBe(1)
	bench.ended.get(id)?.()
	await expect.poll(toastText).toBe(toast)
	await frames(3)
	bench.reloaded(gone)
	await expect.poll(tableInert).toBe(false)
	await frames(3)
}

/** Presses Report 38's primary delete, confirms it and ends the call, which closes the confirm before the reload. */
async function confirmReport38(bench: Held): Promise<void> {
	await pressKey(rowButton('Report 38', 'Permanently delete'))
	const confirm = await screen.findByRole('dialog')
	within(confirm).getByRole('button', { name: 'Delete' }).focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)
	bench.ended.get('38')?.()
	await expect.poll(() => confirm.isConnected).toBe(false)
	await frames(3)
}

/** Trashes Report 38 from its actions menu with the mouse and ends the run with its row gone. */
async function trashByMouse(bench: Held): Promise<void> {
	await click(rowButton('Report 38', 'Actions'))
	await userEvent.click(await screen.findByRole('menuitem', { name: 'Trash' }))
	await endCall(bench, '38', '1 reports moved to the trash.')
}

/** Returns what a control paints: its shadow, its outline, and the content and shadow of its two pseudo parts. */
function painted(control: HTMLElement): string[] {
	const { boxShadow, outlineStyle } = getComputedStyle(control)
	const before = getComputedStyle(control, '::before')
	const after = getComputedStyle(control, '::after')
	return [boxShadow, outlineStyle, before.content, before.boxShadow, after.content, after.boxShadow]
}

/** Returns the part of the row or the card that shows a report. */
function partOf(title: string, part: string): HTMLElement {
	return holderOf(title).querySelector(part) as HTMLElement
}

test('keeps the focus on the list region, never on the page, while the calls of a bulk run end apart', async () => {
	const bench = held()
	render(
		<Toaster>
			<Reports bench={bench} />
		</Toaster>,
	)
	const region = screen.getByRole('region', { name: 'Reports' })
	const footer = document.querySelector<HTMLElement>('.dataviews-footer') as HTMLElement
	const pressed = within(footer).getByRole('button', { name: 'Trash' })
	pressed.focus()
	const focus = sampleFocus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(2)

	bench.ended.get('1')?.()
	await expect.poll(tableInert).toBe(true)
	await frames(3)

	expect(footer.hasAttribute('inert'), 'the footer is inert').toBe(true)
	expect(document.activeElement, 'the focus as the list turned inert').toBe(region)
	expect(region.matches(':focus-visible'), 'the ring as the list turned inert').toBe(true)
	bench.ended.get('2')?.()
	await expect.poll(toastText).toBe('2 reports moved to the trash.')
	await frames(3)
	expect(document.activeElement, 'the focus as the run ended').toBe(region)
	bench.reloaded()
	await expect.poll(tableInert).toBe(false)
	focus.stop()
	expect(document.activeElement, 'the focus once the list reloaded').toBe(pressed)
	expect(focus.seen.has(document.body), 'the focus fell to the page').toBe(false)
})

test('moves a focus on a row of the table to the list region as the first call that works makes it inert', async () => {
	const bench = held()
	render(
		<Toaster>
			<Reports bench={bench} />
		</Toaster>,
	)
	const region = screen.getByRole('region', { name: 'Reports' })
	const footer = document.querySelector<HTMLElement>('.dataviews-footer') as HTMLElement
	within(footer).getByRole('button', { name: 'Trash' }).focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(2)
	const row = screen.getByRole('checkbox', { name: 'Report 2' })
	row.focus()
	const focus = sampleFocus()

	bench.ended.get('1')?.()
	await expect.poll(tableInert).toBe(true)
	await frames(3)

	expect(row.closest('table')?.hasAttribute('inert'), 'the table holding the row is inert').toBe(true)
	expect(document.activeElement, 'the focus as the table turned inert').toBe(region)
	bench.ended.get('2')?.()
	await expect.poll(toastText).toBe('2 reports moved to the trash.')
	bench.reloaded()
	await expect.poll(tableInert).toBe(false)
	focus.stop()
	expect(document.activeElement, 'the focus once the list reloaded').toBe(row)
	expect(focus.seen.has(document.body), 'the focus fell to the page').toBe(false)
})

test('keeps the canvas where the reader left it as the list region takes the focus mid run', async () => {
	const bench = held()
	const canvas = renderTall(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	const footer = document.querySelector<HTMLElement>('.dataviews-footer') as HTMLElement
	const left = await focusAtBottom(within(footer).getByRole('button', { name: 'Trash' }), canvas)
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(TALL.length)

	bench.ended.get('1')?.()
	await expect.poll(tableInert).toBe(true)
	await frames(3)

	expect(left, 'the canvas scrolled down to the footer').toBeGreaterThan(0)
	expect(document.activeElement, 'the focus as the list turned inert').toBe(region)
	expect(region.matches(':focus-visible'), 'the ring as the list turned inert').toBe(true)
	expect(canvas.scrollTop, 'the canvas as the list turned inert').toBe(left)
	for (const end of bench.ended.values()) {
		end()
	}
	await expect.poll(toastText).toBe('40 reports moved to the trash.')
	await frames(3)
	expect(canvas.scrollTop, 'the canvas as the run ended').toBe(left)
	bench.reloaded()
	await expect.poll(tableInert).toBe(false)
	expect(canvas.scrollTop, 'the canvas once the list reloaded').toBe(left)
})

test('keeps the canvas still as a one row write from a low row ends and the list region takes the focus', async () => {
	const bench = held()
	const canvas = renderTall(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	const pressed = rowButton('Report 38', 'Restore')
	const left = await focusAtBottom(pressed, canvas)
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('"Report 38" has been restored.')
	await expect.poll(tableInert).toBe(true)
	await frames(3)

	expect(left, 'the canvas scrolled down to the row').toBeGreaterThan(0)
	expect(document.activeElement, 'the focus as the run ended').toBe(region)
	expect(canvas.scrollTop, 'the canvas as the run ended').toBe(left)
	bench.reloaded()
	await expect.poll(tableInert).toBe(false)
	expect(document.activeElement, 'the focus once the list reloaded').toBe(pressed)
	expect(canvas.scrollTop, 'the canvas once the list reloaded').toBe(left)
})

test('keeps the canvas still as a run from a footer confirm ends and the list region takes the focus', async () => {
	const bench = held()
	const canvas = renderTall(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	const footer = document.querySelector<HTMLElement>('.dataviews-footer') as HTMLElement
	const opener = within(footer).getByRole('button', { name: 'Permanently delete' })
	const left = await focusAtBottom(opener, canvas)
	await userEvent.keyboard('{Enter}')
	const confirm = await screen.findByRole('dialog')
	within(confirm).getByRole('button', { name: 'Delete' }).focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(TALL.length)

	for (const end of bench.ended.values()) {
		end()
	}
	await expect.poll(toastText).toBe('40 reports deleted.')
	await expect.poll(() => confirm.isConnected).toBe(false)
	await frames(3)

	expect(left, 'the canvas scrolled down to the footer').toBeGreaterThan(0)
	expect(tableInert(), 'the table as the confirm closed').toBe(true)
	expect(document.activeElement, 'the focus once the confirm closed').toBe(region)
	expect(canvas.scrollTop, 'the canvas once the confirm closed').toBe(left)
	bench.reloaded()
	await expect.poll(tableInert).toBe(false)
	expect(document.activeElement, 'the focus once the list reloaded').toBe(opener)
	expect(canvas.scrollTop, 'the canvas once the list reloaded').toBe(left)
})

test('puts the focus on the box named after the row that took its place once a low Restore reloads', async () => {
	const bench = held()
	await renderReal(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	await tabTo(rowButton('Report 38', 'Restore'))
	expect(document.activeElement, 'the focus reached by Tab').toBe(rowButton('Report 38', 'Restore'))
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('"Report 38" has been restored.')
	await frames(3)
	expect(document.activeElement, 'the focus while the list reloads').toBe(region)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	const focused = document.activeElement as HTMLInputElement
	expect(focused, 'the focus once the list reloaded').toBe(rowBox('Report 39'))
	expect(focused.matches(':focus-visible'), 'the ring once the list reloaded').toBe(true)
	await expect.element(focused, { message: 'the role a screen reader says' }).toHaveRole('checkbox')
	await expect.element(focused, { message: 'the name a screen reader says' }).toHaveAccessibleName('Report 39')
	await expect.element(focused, { message: 'the state a screen reader says' }).not.toBeChecked()
	await userEvent.keyboard('{Enter}')
	await frames(3)
	expect([bench.ended.size, focused.checked], 'the calls and the box after a second Enter').toEqual([1, false])
	await userEvent.keyboard('{Tab}')
	expect(document.activeElement, 'the next Tab').toBe(rowButton('Report 39', 'Restore'))
})

test('puts the focus back on the bulk button that stays after the reload, the next Tab going on from it', async () => {
	const bench = held()
	await renderReal(bench, { ticked: ['36', '37', '38'] })
	const region = screen.getByRole('region', { name: 'Reports' })
	const footer = document.querySelector<HTMLElement>('.dataviews-footer') as HTMLElement
	const pressed = within(footer).getByRole('button', { name: 'Trash' })
	await tabTo(pressed)
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(3)

	bench.ended.get('36')?.()
	await expect.poll(tableInert).toBe(true)
	bench.ended.get('37')?.(false)
	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('1 reports could not be moved to the trash.')
	await frames(3)
	expect(document.activeElement, 'the focus while the list reloads').toBe(region)
	bench.reloaded(['36', '38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(pressed)
	await userEvent.keyboard('{Tab}')
	const next = within(footer).getByRole('button', { name: 'Permanently delete' })
	expect(document.activeElement, 'the next Tab').toBe(next)
})

test('puts the focus on the box of the row in its place once a run from a row menu reloads', async () => {
	const bench = held()
	await renderReal(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	await tabTo(rowButton('Report 38', 'Actions'))
	await userEvent.keyboard('{Enter}')
	const item = await screen.findByRole('menuitem', { name: 'Trash' })
	item.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('1 reports moved to the trash.')
	await frames(3)
	expect(document.activeElement, 'the focus while the list reloads').toBe(region)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(rowBox('Report 39'))
})

test('puts the focus on the box of the row in its place after a run confirmed from that row menu', async () => {
	const bench = held()
	await renderReal(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	await tabTo(rowButton('Report 38', 'Actions'))
	await userEvent.keyboard('{Enter}')
	const item = await screen.findByRole('menuitem', { name: 'Permanently delete' })
	item.focus()
	await userEvent.keyboard('{Enter}')
	const confirm = await screen.findByRole('dialog')
	within(confirm).getByRole('button', { name: 'Delete' }).focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(() => confirm.isConnected).toBe(false)
	await frames(3)
	expect(document.activeElement, 'the focus while the list reloads').toBe(region)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(rowBox('Report 39'))
})

test('puts the focus on the box of the row now last once the last row left after its Restore reloads', async () => {
	const bench = held()
	await renderReal(bench)
	await tabTo(rowButton('Report 40', 'Restore'))
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('40')?.()
	await expect.poll(toastText).toBe('"Report 40" has been restored.')
	await frames(3)
	bench.reloaded(['40'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(rowBox('Report 39'))
})

test('keeps the focus on the list region when the row in its place starts with a primary action', async () => {
	const bench = held()
	await renderReal(bench, { bulkActions: false })
	const region = screen.getByRole('region', { name: 'Reports' })
	expect(screen.queryByRole('checkbox'), 'a box in the list').toBeNull()
	await tabTo(rowButton('Report 38', 'Actions'))
	await userEvent.keyboard('{Enter}')
	const item = await screen.findByRole('menuitem', { name: 'Trash' })
	item.focus()
	await userEvent.keyboard('{Enter}')

	await endCall(bench, '38', '1 reports moved to the trash.')

	expect(document.activeElement, 'the focus once the list reloaded').toBe(region)
})

test('keeps the focus on the list region when the row now last starts with a primary action', async () => {
	const bench = held()
	await renderReal(bench, { bulkActions: false })
	const region = screen.getByRole('region', { name: 'Reports' })
	await pressKey(rowButton('Report 40', 'Restore'))

	await endCall(bench, '40', '"Report 40" has been restored.')

	expect(document.activeElement, 'the focus once the list reloaded').toBe(region)
})

test.each([
	{ way: 'the keyboard', press: pressKey },
	{ way: 'the mouse', press: click },
])('writes nothing on a second Enter and tabs to the search after a primary action from $way', async ({ press }) => {
	const bench = held()
	await renderReal(bench, { bulkActions: false })
	const region = screen.getByRole('region', { name: 'Reports' })
	await press(rowButton('Report 38', 'Restore'))

	await endCall(bench, '38', '"Report 38" has been restored.')

	expect.soft(document.activeElement, 'the focus once the list reloaded').toBe(region)
	await userEvent.keyboard('{Enter}')
	await frames(3)
	expect.soft([...bench.ended.keys()], 'the calls after a second Enter').toEqual(['38'])
	await userEvent.keyboard('{Tab}')
	expect(document.activeElement, 'the next Tab').toBe(screen.getByRole('searchbox'))
})

test.each<{ layout: string; drawn: Drawn }>([
	{ layout: 'a table whose rows draw only that menu', drawn: { primary: 'none' } },
	{ layout: 'a grid with no box and no click', drawn: { view: GRID } },
])('puts the focus on the actions menu button of the row in its place in $layout', async ({ drawn }) => {
	const bench = held()
	await renderReal(bench, { bulkActions: false, ...drawn })
	await pressKey(rowButton('Report 38', 'Actions'))
	const item = await screen.findByRole('menuitem', { name: 'Trash' })
	item.focus()
	await userEvent.keyboard('{Enter}')

	await endCall(bench, '38', '1 reports moved to the trash.')

	expect(document.activeElement, 'the focus once the list reloaded').toBe(rowButton('Report 39', 'Actions'))
})

test('puts the focus on the title of the row in its place when it opens the item beside a primary action', async () => {
	const bench = held()
	const opened: string[] = []
	await renderReal(bench, { bulkActions: false, onClickItem: (report) => void opened.push(report.id) })
	await tabTo(rowButton('Report 38', 'Restore'))
	await userEvent.keyboard('{Enter}')

	await endCall(bench, '38', '"Report 38" has been restored.')

	const focused = document.activeElement as HTMLElement
	expect(focused, 'the focus once the list reloaded').toBe(rowButton('Report 39', 'Report 39'))
	await userEvent.keyboard('{Enter}')
	expect([bench.ended.size, opened], 'the calls and the items opened by a second Enter').toEqual([1, ['39']])
})

test('keeps the focus on the list region once the confirm of a primary action closed and the row left', async () => {
	const bench = held()
	await renderReal(bench, { bulkActions: false, primary: 'delete' })
	const region = screen.getByRole('region', { name: 'Reports' })

	await confirmReport38(bench)
	expect(document.activeElement, 'the focus once the confirm closed').toBe(region)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(region)
})

test('puts the focus back on the primary action that opened the confirm when its row stays', async () => {
	const bench = held()
	await renderReal(bench, { bulkActions: false, primary: 'delete' })
	const pressed = rowButton('Report 38', 'Permanently delete')

	await confirmReport38(bench)
	bench.reloaded([])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(pressed)
})

test('puts the focus back on the primary action pressed when its row stays with no bulk actions', async () => {
	const bench = held()
	await renderReal(bench, { bulkActions: false })
	const pressed = rowButton('Report 38', 'Restore')
	await tabTo(pressed)
	await userEvent.keyboard('{Enter}')

	await endCall(bench, '38', '"Report 38" has been restored.', [])

	expect(document.activeElement, 'the focus once the list reloaded').toBe(pressed)
})

test('puts the focus on the box of the card in its place in a grid once a run from a card menu reloads', async () => {
	const bench = held()
	await renderReal(bench, { view: GRID })
	await tabTo(rowButton('Report 38', 'Actions'))
	expect(document.activeElement, 'the focus reached by Tab').toBe(rowButton('Report 38', 'Actions'))
	await userEvent.keyboard('{Enter}')
	const item = await screen.findByRole('menuitem', { name: 'Trash' })
	item.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('1 reports moved to the trash.')
	await frames(3)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	const focused = document.activeElement as HTMLElement
	expect(focused, 'the focus once the list reloaded').toBe(rowBox('Report 39'))
	expect(focused.closest('.dataviews-view-grid__card'), 'the card holding the focus').toBe(holderOf('Report 39'))
	await expect.element(focused, { message: 'the name a screen reader says' }).toHaveAccessibleName('Report 39')
})

test('puts the focus on the media button of the card in its place in a grid whose items open on a click', async () => {
	const bench = held()
	const opened: string[] = []
	await renderReal(bench, { view: GRID, onClickItem: (report) => void opened.push(report.id) })
	await tabTo(rowButton('Report 38', 'Actions'))
	await userEvent.keyboard('{Enter}')
	const item = await screen.findByRole('menuitem', { name: 'Trash' })
	item.focus()
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('1 reports moved to the trash.')
	await frames(3)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	const focused = document.activeElement as HTMLElement
	const media = holderOf('Report 39').querySelector('.dataviews-view-grid__media')
	expect(focused, 'the focus once the list reloaded').toBe(media)
	await expect.element(focused, { message: 'the role a screen reader says' }).toHaveRole('button')
	await expect.element(focused, { message: 'the name a screen reader says' }).toHaveAccessibleName('Report 39')
	await userEvent.keyboard('{Enter}')
	expect([bench.ended.size, opened], 'the calls and the items opened by a second Enter').toEqual([1, ['39']])
})

test('puts the focus on the own button of the item in its place in the list layout at phone width', async () => {
	await page.viewport(375, 800)
	onTestFinished(async () => page.viewport(1280, 800))
	const bench = held()
	await renderReal(bench, { view: LIST })
	await tabTo(rowButton('Report 38', 'Restore'))
	expect(document.activeElement, 'the focus reached by Tab').toBe(rowButton('Report 38', 'Restore'))
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('"Report 38" has been restored.')
	await frames(3)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	const focused = document.activeElement as HTMLElement
	expect(focused, 'the focus once the list reloaded').toBe(rowButton('Report 39', 'Report 39'))
	await expect.element(focused, { message: 'the name a screen reader says' }).toHaveAccessibleName('Report 39')
	await userEvent.keyboard('{Enter}')
	await expect.element(focused, { message: 'the item after a second Enter' }).toHaveAttribute('aria-pressed', 'true')
	expect(bench.ended.size, 'the calls after a second Enter').toBe(1)
})

test('shows only the row tint on the own button of the item in its place after a mouse run', async () => {
	await page.viewport(375, 800)
	onTestFinished(async () => page.viewport(1280, 800))
	const bench = held()
	await renderReal(bench, { view: LIST })
	const pressed = rowButton('Report 38', 'Restore')
	pressed.scrollIntoView({ block: 'end' })
	await frames(2)
	await userEvent.hover(holderOf('Report 38'))
	await frames(3)
	await userEvent.click(pressed, { force: true })

	await endCall(bench, '38', '"Report 38" has been restored.')
	await userEvent.hover(screen.getByRole('searchbox'))
	await frames(3)

	const item = rowButton('Report 39', 'Report 39')
	const tint = (title: string) => getComputedStyle(holderOf(title).closest('[role="row"]') as Element).backgroundColor
	expect(document.activeElement, 'the focus once the list reloaded').toBe(item)
	expect(item.matches(':focus-visible'), 'the keyboard state of the item').toBe(false)
	expect(painted(item), 'what the item paints').toEqual(painted(rowButton('Report 40', 'Report 40')))
	expect(tint('Report 39'), 'the tint of its row').not.toBe(tint('Report 40'))
})

test.each<{ control: string; part: string; drawn: Drawn }>([
	{ control: 'the title that opens the item', part: '.dataviews-title-field--clickable', drawn: {} },
	{ control: 'the media button of a grid card', part: '.dataviews-view-grid__media', drawn: { view: GRID } },
])('paints the focus style of $control in its place after a mouse run', async ({ part, drawn }) => {
	const bench = held()
	await renderReal(bench, { bulkActions: false, onClickItem: () => {}, ...drawn })

	await trashByMouse(bench)

	const control = partOf('Report 39', part)
	expect(document.activeElement, 'the focus once the list reloaded').toBe(control)
	expect(control.matches(':focus-visible'), 'the keyboard state of the control').toBe(false)
	expect(painted(control), 'what the control paints').not.toEqual(painted(partOf('Report 40', part)))
})

test('paints nothing on the media button of the row in its place in a table after a mouse run', async () => {
	const part = '.dataviews-column-primary__media'
	const bench = held()
	await renderReal(bench, { view: { ...VIEW, mediaField: 'picture' }, bulkActions: false, onClickItem: () => {} })

	await trashByMouse(bench)

	const media = partOf('Report 39', part)
	expect(document.activeElement, 'the focus once the list reloaded').toBe(media)
	expect(media.matches(':focus-visible'), 'the keyboard state of the button').toBe(false)
	expect(painted(media), 'what the button paints').toEqual(painted(partOf('Report 40', part)))
})

/** Restores Report 38 and drops its row, the rows scrolled to their top while the list reloads, and returns them. */
async function restoreScrolledAway(bench: Held): Promise<HTMLElement> {
	await expect.poll(() => bench.ended.size).toBe(1)
	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('"Report 38" has been restored.')
	await frames(3)
	const rows = document.querySelector<HTMLElement>('.dataviews-layout__container') as HTMLElement
	rows.scrollTop = 0
	await frames(3)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)
	return rows
}

test('keeps the rows where a mouse reader scrolled them as the focus goes back once the list reloaded', async () => {
	const bench = held()
	await renderReal(bench)
	await click(rowButton('Report 38', 'Restore'))

	const rows = await restoreScrolledAway(bench)

	expect(document.activeElement, 'the focus once the list reloaded').toBe(rowBox('Report 39'))
	expect(rows.scrollTop, 'the rows once the list reloaded').toBe(0)
})

test('paints the focus style of the box in its place after a mouse run, no region ring, rows still', async () => {
	const bench = held()
	await renderReal(bench)
	const region = screen.getByRole('region', { name: 'Reports' })
	const rows = document.querySelector<HTMLElement>('.dataviews-layout__container') as HTMLElement
	await click(rowButton('Report 38', 'Restore'))
	await expect.poll(() => bench.ended.size).toBe(1)

	bench.ended.get('38')?.()
	await expect.poll(toastText).toBe('"Report 38" has been restored.')
	await frames(3)
	expect(document.activeElement, 'the focus while the list reloads').toBe(region)
	expect(region.matches(':focus-visible'), 'the keyboard state of the region').toBe(false)
	expect(getComputedStyle(region, '::after').outlineStyle, 'the ring of the region').toBe('none')
	rows.scrollTop = 0
	await frames(3)
	bench.reloaded(['38'])
	await expect.poll(tableInert).toBe(false)
	await frames(3)

	const box = rowBox('Report 39')
	expect(document.activeElement, 'the focus once the list reloaded').toBe(box)
	expect(box.matches(':focus-visible'), 'the keyboard state of the box').toBe(false)
	expect(getComputedStyle(box).boxShadow, 'the focus style of the box').not.toBe('none')
	expect(getComputedStyle(rowBox('Report 40')).boxShadow, 'the style of an idle box').toBe('none')
	expect(rows.scrollTop, 'the rows once the list reloaded').toBe(0)
})

test('paints the outline of the primary action pressed after a mouse run when its row stays', async () => {
	const bench = held()
	await renderReal(bench, { bulkActions: false })
	const pressed = rowButton('Report 38', 'Restore')
	await click(pressed)

	await endCall(bench, '38', '"Report 38" has been restored.', [])

	expect(document.activeElement, 'the focus once the list reloaded').toBe(pressed)
	expect(pressed.matches(':focus-visible'), 'the keyboard state of the button').toBe(false)
	expect(getComputedStyle(pressed).outlineStyle, 'the focus style of the button').toBe('solid')
	expect(getComputedStyle(rowButton('Report 39', 'Restore')).outlineStyle, 'the style of an idle button').toBe('none')
})

test('scrolls the rows to the control the focus goes back to once a run from the keyboard reloaded', async () => {
	const bench = held()
	await renderReal(bench)
	await tabTo(rowButton('Report 38', 'Restore'))
	await userEvent.keyboard('{Enter}')

	const rows = await restoreScrolledAway(bench)

	const next = rowBox('Report 39')
	expect(document.activeElement, 'the focus once the list reloaded').toBe(next)
	await expect.poll(() => rows.scrollTop, { message: 'the rows once the list reloaded' }).toBeGreaterThan(0)
	expect(next.getBoundingClientRect().bottom, 'the control within the rows').toBeLessThanOrEqual(
		rows.getBoundingClientRect().bottom,
	)
})
