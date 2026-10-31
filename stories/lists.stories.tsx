// SPDX-License-Identifier: Apache-2.0

import '@wordpress/components/build-style/style.css'
import '@wordpress/dataviews/build-style/style.css'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews'
import type { Action, Field, View } from '@wordpress/dataviews'
import { backup, page } from '@wordpress/icons'
import { Button } from '@wordpress/ui'
import { useState } from 'react'
import { expect, waitFor, within } from 'storybook/test'

import { useBulkRun } from '../src/bulk-run.js'
import type { BulkWords } from '../src/bulk.js'
import { ListEmpty, ListNoResults } from '../src/list-empty.js'
import { useListRun } from '../src/list-run.js'
import { Page } from '../src/page.js'
import { Toaster } from '../src/toaster.js'
import { viewNarrows } from '../src/view-guard.js'
import { Admin, ListPage } from './frames.js'
import { backgroundOf, boxOf, centredIn, edgesOf, find, meets, middleDown, onTop } from './measure.js'

/** A row of the sample list. */
interface Report {
	id: string
	title: string
}

/** How long a story waits for its list to measure, load or toast. */
const WAIT = 3_000

/** How long every toast of a story stays. */
const TEN_MINUTES = 600_000

/** How far a play scrolls a wide table sideways. */
const SHIFT = 160

/** How many text columns a sample table that fits the desktop list shows. */
const FITTING = 2

/** The box DataViews scrolls the rows of the list page in. */
const SCROLLER = '.godmin-page__list .dataviews-layout__container'

/** The nine text fields of the sample list, each an id, a label and words of about 28 characters. */
const TEXT_FIELDS: [string, string, string][] = [
	['owner', 'Owner', 'Maria Perez, finance office'],
	['email', 'Email', 'finance.reports@example.com'],
	['phone', 'Phone', '184467235, extension 4012'],
	['region', 'Region', 'Northern region, second area'],
	['period', 'Period', 'January to March, first half'],
	['status', 'Status', 'Waiting for the second review'],
	['source', 'Source', 'Imported from the sales sheet'],
	['reviewer', 'Reviewer', 'Maria Perez, audit office'],
	['note', 'Note', 'Totals checked against bank'],
]

/** The ten rows of the first page of the sample list. */
const ROWS: Report[] = Array.from({ length: 10 }, (_, index) => ({ id: `${index + 1}`, title: `Report ${index + 1}` }))

/** The fields of the sample list: its title, searched, and the nine text fields. */
const FIELDS: Field<Report>[] = [
	{ id: 'title', label: 'Title', enableGlobalSearch: true, getValue: ({ item }) => item.title },
	...TEXT_FIELDS.map(([id, label, words]) => ({ id, label, getValue: () => words })),
]

/** The view the sample list opens on: a table of ten rows on its first page, showing only its title. */
const VIEW: View = { type: 'table', titleField: 'title', page: 1, perPage: 10 }

/** The words a restore run toasts, as WordPress words a restore. */
const RESTORED: BulkWords<Report> = {
	done: (count, only) =>
		only === undefined ? `${count} reports have been restored.` : `"${only.title}" has been restored.`,
	failed: (failures) => `${failures.length} reports could not be restored.`,
}

/** What the sample list shows when it holds no reports. */
const NO_REPORTS = (
	<ListEmpty
		icon={page}
		title="No reports yet"
		description="Reports you add show up here."
		actions={<Button>Add Report</Button>}
	/>
)

/** Returns the actions of a row: a primary one-click restore offered in bulk, and an edit in the menu. */
function actionsOf(restore: (items: Report[]) => void): Action<Report>[] {
	return [
		{ id: 'restore', label: 'Restore', icon: backup, isPrimary: true, supportsBulk: true, callback: restore },
		{ id: 'edit', label: 'Edit', callback: () => {} },
	]
}

/** Returns the view of the sample table with the given number of text columns. */
function viewWith(columns: number): View {
	return { ...VIEW, fields: TEXT_FIELDS.slice(0, columns).map(([id]) => id) }
}

/** Never settles, as a reload still on its way. */
function neverSettles(): Promise<never> {
	return new Promise(() => {})
}

/** Renders the first page of three of the sample table with the given number of text columns, the second row ticked. */
function Reports({ columns }: { columns: number }) {
	const [selection, setSelection] = useState(['2'])
	return (
		<ListPage>
			<DataViews
				data={ROWS}
				fields={FIELDS}
				view={viewWith(columns)}
				onChangeView={() => {}}
				defaultLayouts={{ table: {} }}
				paginationInfo={{ totalItems: 30, totalPages: 3 }}
				actions={actionsOf(() => {})}
				selection={selection}
				onChangeSelection={setSelection}
			/>
		</ListPage>
	)
}

/** Renders the sample list with no reports, showing its empty state from the first render. */
function NoReports() {
	return (
		<ListPage>
			<DataViews
				data={[]}
				fields={FIELDS}
				view={VIEW}
				onChangeView={() => {}}
				defaultLayouts={{ table: {} }}
				paginationInfo={{ totalItems: 0, totalPages: 0 }}
				isLoading={false}
				empty={NO_REPORTS}
			/>
		</ListPage>
	)
}

/** Renders the sample list opened on a search no report matches. */
function NothingFound() {
	const [view, setView] = useState<View>({ ...VIEW, search: 'zzz' })
	const { data, paginationInfo } = filterSortAndPaginate(ROWS, view, FIELDS)
	return (
		<ListPage>
			<DataViews
				data={data}
				fields={FIELDS}
				view={view}
				onChangeView={setView}
				defaultLayouts={{ table: {} }}
				paginationInfo={paginationInfo}
				isLoading={false}
				empty={viewNarrows(view) ? <ListNoResults /> : NO_REPORTS}
			/>
		</ListPage>
	)
}

/** Renders a sample table that fits, whose restore ends at once and whose reload after it never ends. */
function RestoredReports() {
	const [selection, setSelection] = useState(['2'])
	const { run, region, refreshing } = useListRun('reports', setSelection)
	const restore = useBulkRun<Report>(run, neverSettles)
	return (
		<Admin>
			<Page title="Reports" list listLabel="Reports" listRef={region}>
				<DataViews
					data={ROWS}
					fields={FIELDS}
					view={viewWith(FITTING)}
					onChangeView={() => {}}
					defaultLayouts={{ table: {} }}
					paginationInfo={{ totalItems: 30, totalPages: 3 }}
					actions={actionsOf((items) => void restore(items, async () => undefined, RESTORED))}
					selection={selection}
					onChangeSelection={setSelection}
					isLoading={refreshing}
				/>
			</Page>
		</Admin>
	)
}

/** Renders the restore story inside a toast region whose toasts stay ten minutes. */
function AfterTheWriteStory() {
	return (
		<Toaster dismissAfter={TEN_MINUTES} actionDismissAfter={TEN_MINUTES}>
			<RestoredReports />
		</Toaster>
	)
}

/** Checks the list starts and ends at the canvas edges, its checkbox and actions cells at them. */
async function meetsTheCanvas() {
	const canvas = boxOf('.godmin-layout__canvas')
	const edges = edgesOf('Report 1')
	await meets(edges.checkbox.box.left, canvas.left, 'the list starts at the canvas edge')
	await meets(edges.actions.box.right, canvas.right, 'the list ends at the canvas edge')
}

/** Scrolls a wide table sideways and checks what stays and what moves. */
async function scrollsUnderTheFrozenColumns() {
	const scroller = find(SCROLLER)
	const before = edgesOf('Report 1')
	scroller.scrollLeft = SHIFT
	const after = edgesOf('Report 1')
	await meets(after.checkbox.box.left, before.checkbox.box.left, 'the checkbox stays')
	await meets(after.title.box.left, before.title.box.left, 'the title stays')
	await meets(after.titleHeader.box.left, before.titleHeader.box.left, 'the title header stays')
	await meets(after.actions.box.right, before.actions.box.right, 'the actions stay')
	await meets(after.first.box.left, before.first.box.left - SHIFT, 'the other columns move')
	const { title, actions } = after
	await expect(onTop(title.cell, title.box.right - 2, middleDown(title.box)), 'the title paints over').toBe(true)
	await expect(onTop(actions.cell, actions.box.left + 2, middleDown(actions.box)), 'the actions paint over').toBe(true)
}

/** Checks the frozen cells paint the list background on a plain row and the row tint on a ticked one. */
async function coverTheCellsUnder() {
	const list = backgroundOf(find('.godmin-page__list .dataviews-wrapper'))
	const plain = edgesOf('Report 1')
	const ticked = edgesOf('Report 2')
	const tint = backgroundOf(ticked.title.cell.parentElement as HTMLElement)
	await expect([backgroundOf(plain.checkbox.cell), backgroundOf(plain.title.cell)]).toEqual([list, list])
	await expect([backgroundOf(ticked.checkbox.cell), backgroundOf(ticked.title.cell)]).toEqual([tint, tint])
}

/** Checks a wide table freezes its checkbox and title and pins its actions as it scrolls sideways. */
async function staysFrozen() {
	await waitFor(() => find('.godmin-page__list--wide'), { timeout: WAIT })
	const scroller = find(SCROLLER)
	await expect(scroller.scrollWidth - scroller.clientWidth).toBeGreaterThan(SHIFT)
	await meetsTheCanvas()
	await scrollsUnderTheFrozenColumns()
	await coverTheCellsUnder()
	await waitFor(() =>
		expect(find('thead .dataviews-view-table__actions-column')).toHaveClass(
			'dataviews-view-table__actions-column--stuck',
		),
	)
}

/** Checks the empty state pads nothing and sits in the middle of the box from the toolbar to the canvas bottom. */
async function centredUnderTheToolbar() {
	const empty = find('.godmin-empty')
	await expect(getComputedStyle(empty).paddingBlockStart).toBe('0px')
	await expect(getComputedStyle(empty).paddingBlockEnd).toBe('0px')
	const box = boxOf('.dataviews-no-results')
	await meets(box.top, boxOf('.dataviews__view-actions').bottom, 'under the toolbar')
	await meets(box.bottom, boxOf('.godmin-layout__canvas').bottom, 'down to the canvas bottom')
	await centredIn(empty.getBoundingClientRect(), box)
}

/** Checks the list region holds a keyboard focus and draws its ring, not the browser's, over its sticky header row. */
async function ringsTheList() {
	const region = find('.godmin-page__list')
	const ring = getComputedStyle(region, '::after')
	const header = getComputedStyle(find('.dataviews-view-table thead'))
	await expect(region).toHaveFocus()
	await expect(region.matches(':focus-visible'), 'a keyboard focus').toBe(true)
	await expect(ring.outlineStyle, 'the region draws its ring').toBe('solid')
	await expect(getComputedStyle(region).outlineStyle, 'the browser ring is off').toBe('none')
	await expect(Number(ring.zIndex), 'the ring paints over the header row').toBeGreaterThan(Number(header.zIndex))
}

/** Ends every toast animation and waits until no toast is leaving. */
async function settleToasts() {
	for (const animation of find('.godmin-toasts').getAnimations({ subtree: true })) {
		animation.finish()
	}
	await waitFor(() => expect(document.querySelector('.godmin-toasts__item--leaving')).toBeNull())
}

const meta = {
	title: 'Components/Lists',
	id: 'components-lists',
	component: Reports,
	args: { columns: TEXT_FIELDS.length },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof Reports>

export default meta

type Story = StoryObj<typeof meta>

export const WideTable: Story = {
	name: 'Wide table',
	globals: { viewport: { value: 'desktop', isRotated: false } },
	play: staysFrozen,
}

export const WideTableMedium: Story = {
	name: 'Wide table, medium width',
	globals: { viewport: { value: 'medium' } },
	parameters: { argos: { modes: { desktop: { disabled: true }, medium: { viewport: 'medium' } } } },
	play: staysFrozen,
}

export const EmptyList: Story = {
	name: 'Empty list',
	render: () => <NoReports />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('heading', { level: 1, name: 'Reports' })).toBeInTheDocument()
		await expect(canvas.getByRole('heading', { level: 2, name: 'No reports yet' })).toBeInTheDocument()
		await expect(canvas.getByText('Reports you add show up here.')).toBeInTheDocument()
		await expect(canvas.getByRole('button', { name: 'Add Report' })).toBeInTheDocument()
		await expect(document.body).not.toHaveTextContent('No results')
		await expect(document.querySelector('.dataviews-loading')).toBeNull()
		await centredUnderTheToolbar()
	},
}

export const SearchFindsNothing: Story = {
	name: 'Search finds nothing',
	render: () => <NothingFound />,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement)
		await expect(canvas.getByRole('searchbox')).toHaveValue('zzz')
		await expect(canvas.getByRole('heading', { level: 2, name: 'No results found' })).toBeInTheDocument()
		await expect(
			canvas.getByText("Try adjusting your search or filters to find what you're looking for."),
		).toBeInTheDocument()
		await centredUnderTheToolbar()
	},
}

export const AfterTheWrite: Story = {
	name: 'After the write',
	render: () => <AfterTheWriteStory />,
	play: async () => {
		within(edgesOf('Report 2').actions.cell).getByRole('button', { name: 'Restore' }).click()
		await waitFor(() => expect(document.querySelectorAll('.godmin-toast')).toHaveLength(1), { timeout: WAIT })
		await expect(find('.dataviews-view-table')).toHaveAttribute('aria-busy', 'true')
		await expect(find('.dataviews-view-table')).toHaveAttribute('inert')
		await expect(
			within(document.body).getByRole('region', { name: 'Reports' }),
			'the list region named Reports holds the focus as the toast shows',
		).toHaveFocus()
		await expect(find('.godmin-toast')).toHaveTextContent('"Report 2" has been restored.')
		await settleToasts()
		await waitFor(() => find('.dataviews-view-table.is-refreshing'), { timeout: WAIT })
		await expect(find('.dataviews-view-table')).toHaveTextContent('Report 2')
		await ringsTheList()
	},
}
