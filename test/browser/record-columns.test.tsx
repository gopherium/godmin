// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import { DataViews } from '@wordpress/dataviews'
import type { Field, View } from '@wordpress/dataviews'
import { Button, InputControl } from '@wordpress/ui'
import type { ReactNode } from 'react'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { LoadingScreen } from '../../src/loading.js'
import { Page } from '../../src/page.js'
import { PageBreadcrumb, PageBreadcrumbs } from '../../src/page-breadcrumbs.js'
import { Admin, RecordPage } from '../../stories/frames.js'
import * as lists from '../../stories/lists.stories.js'
import { boxOf, columnsOf, find, middleDown } from '../../stories/measure.js'
import * as records from '../../stories/records.stories.js'

const { LongRecord, Record } = composeStories(records)
const { WideTable } = composeStories(lists)

/** One window width, the page width the frame leaves there, and whether the columns sit side by side. */
interface Fit {
	width: number
	room: number
	beside: boolean
}

/** The room between the two columns. */
const GAP = 24

/** The width of the details beside the main work. */
const DETAILS = 400

/** The page width the frame leaves at the window the tests open on. */
const ROOM = 916

/** The page width the frame leaves on a phone. */
const PHONE_ROOM = 358

/** The page width the columns fold at, and the window that gives it. */
const FOLD = 824
const FOLD_WINDOW = 1188

/** The page width the columns fold at on a bleed canvas, and the window that gives it. */
const BLEED_FOLD = 832
const BLEED_WINDOW = 1148

/** The room a classic scrollbar takes from a line. */
const BAR = 15

/** The room under the last line of a record and at each side of a column. */
const FOOT = 16
const RING_ROOM = 4

/** How far a test scrolls a record. */
const SHIFT = 160

/** The height of a part taller than any column. */
const TALL = 2000

/** How many fields a details column holds that do not fit in it. */
const MANY_FIELDS = 14

/** A word longer than any column. */
const LONG_WORD = 'invoice'.repeat(120)

/** A title longer than any title row. */
const LONG_TITLE = 'Invoice for the sample customer '.repeat(12)

/** The height of the title row. */
const TITLE_ROW = 32

/** The least room a title keeps beside its breadcrumbs. */
const TITLE_FLOOR = 120

/** The colours WordPress paints a breadcrumb link and its slash with. */
const LINK_COLOUR = '--wpds-color-foreground-interactive-neutral'
const SLASH_COLOUR = '--wpds-color-stroke-surface-neutral'

/** The headings of a table wider than a column. */
const WIDE_COLUMNS = ['Reference', 'Description', 'Customer', 'Quantity', 'Delivered', 'Warehouse', 'Carrier']

/** One line of a list in a column. */
interface Line {
	id: string
	title: string
}

/** The lines, fields and view of a small DataViews list. */
const LINES: Line[] = [{ id: '1', title: 'Line 1' }]
const LINE_FIELDS: Field<Line>[] = [{ id: 'title', label: 'Title', getValue: ({ item }) => item.title }]
const LINE_VIEW: View = { type: 'list', titleField: 'title' }

/** The look WordPress gives a read-only fact. */
const FACT_LABEL = 152
const FACT_GAP = 12
const FACT_COLOUR = '--wpds-color-foreground-content-neutral-weak'
const FACT_WEIGHT = '--wpds-typography-font-weight-default'

/** The box DataViews scrolls the rows of the list page in. */
const SCROLLER = '.godmin-page__list .dataviews-layout__container'

/** The selectors of the parts of a record page. */
const MAIN = '.godmin-page__main'
const ASIDE = '.godmin-page__aside'
const SPLIT = '.godmin-page__split'
const CANVAS = '.godmin-layout__canvas'
const HEAD = '.godmin-page__head'

/** Where the columns sit at each window width, from the widest. */
const FITS: Fit[] = [
	{ width: 1920, room: 1556, beside: true },
	{ width: 1280, room: 916, beside: true },
	{ width: 1188, room: 824, beside: true },
	{ width: 1187, room: 823, beside: false },
	{ width: 1024, room: 660, beside: false },
	{ width: 1023, room: 943, beside: true },
	{ width: 904, room: 824, beside: true },
	{ width: 903, room: 823, beside: false },
	{ width: 783, room: 703, beside: false },
	{ width: 782, room: 702, beside: false },
	{ width: 781, room: 733, beside: false },
	{ width: 390, room: 358, beside: false },
]

/** Checks two positions meet within half a pixel. */
function near(actual: number, expected: number, what: string) {
	expect(Math.abs(actual - expected), what).toBeLessThan(0.5)
}

/** Returns how far an element holds content past its height. */
function overflowOf(selector: string): number {
	const element = find(selector)
	return element.scrollHeight - element.clientHeight
}

/** Checks the columns sit one under the other and leave the scroll to the split. */
function stackedInOneBox() {
	const { main, details } = columnsOf()
	expect(details.top, 'the details sit under the work').toBeGreaterThan(main.bottom)
	expect(overflowOf(MAIN), 'the work has no scroll of its own').toBeLessThanOrEqual(0)
	expect(overflowOf(ASIDE), 'the details have no scroll of their own').toBeLessThanOrEqual(0)
}

/** Returns a record with the given details and main work inside a real admin root. */
function recordOf(aside: ReactNode, children: ReactNode) {
	return (
		<AdminRoot>
			<RecordPage aside={aside}>{children}</RecordPage>
		</AdminRoot>
	)
}

/** Renders a record with the given details and main work. */
function renderRecord(aside: ReactNode, children: ReactNode) {
	render(recordOf(aside, children))
}

/** Returns where each column starts and how far across it runs. */
function columnEdges(): number[] {
	const { main, details } = columnsOf()
	return [main.left, main.right, main.top, details.left, details.right, details.top]
}

/** Renders nothing, as a panel with nothing to show does. */
function Nothing() {
	return null
}

/** Renders a part that scrolls sideways, taller than any column. */
function TallPart() {
	return (
		<div className="tall-part" style={{ overflowX: 'auto' }}>
			<div style={{ blockSize: TALL }} />
		</div>
	)
}

/** Renders a table wider than a column in its scroll box. */
function WideCustomTable() {
	return (
		<div className="godmin-table-scroll" role="region" aria-label="Lines" tabIndex={0}>
			<table className="godmin-table">
				<thead>
					<tr>
						{WIDE_COLUMNS.map((heading) => (
							<th key={heading}>{heading}</th>
						))}
					</tr>
				</thead>
			</table>
		</div>
	)
}

/** Renders a small DataViews list in the box that lines it up with the text around it. */
function SectionList() {
	return (
		<div className="godmin-list">
			<DataViews
				data={LINES}
				fields={LINE_FIELDS}
				view={LINE_VIEW}
				onChangeView={() => {}}
				defaultLayouts={{ list: {} }}
				paginationInfo={{ totalItems: 1, totalPages: 1 }}
			/>
		</div>
	)
}

/** Renders a record with the given breadcrumb links and actions. */
function HeaderRecord({ links, actions }: { links: string[]; actions: string[] }) {
	return (
		<AdminRoot>
			<Admin>
				<Page
					title="Invoice 1042"
					aside={<div>Invoice details</div>}
					actions={actions.map((label) => (
						<Button key={label} size="compact">
							{label}
						</Button>
					))}
					breadcrumbs={
						<PageBreadcrumbs label="Breadcrumbs">
							{links.map((label) => (
								<PageBreadcrumb key={label} href="#records">
									{label}
								</PageBreadcrumb>
							))}
						</PageBreadcrumbs>
					}
				>
					<div>Lines</div>
				</Page>
			</Admin>
		</AdminRoot>
	)
}

/** Renders more fields than a details column holds. */
function ManyFields() {
	return (
		<form className="godmin-form">
			{Array.from({ length: MANY_FIELDS }, (_, index) => (
				<InputControl key={index} label={`Field ${index + 1}`} defaultValue="Sample value" />
			))}
		</form>
	)
}

/** Returns the value a token gives a style here. */
function tokenStyle(property: 'color' | 'fontWeight', token: string): string {
	const probe = document.createElement('span')
	probe.style[property] = `var(${token})`
	find('.godmin-page').append(probe)
	const value = getComputedStyle(probe)[property]
	probe.remove()
	return value
}

/** Waits for the frame to settle on a page width. */
async function settled(room: number) {
	await expect.poll(() => columnsOf().page.width).toBe(room)
}

/** Waits for a page width and checks where the columns sit on it. */
async function holds({ room, beside }: Fit) {
	await settled(room)
	const { main, details } = columnsOf()
	near(details.width, beside ? DETAILS : room, 'the details')
	near(main.width, beside ? room - DETAILS - GAP : room, 'the work')
}

test.each(FITS)('sets the columns at $width', async (fit) => {
	await page.viewport(fit.width, 800)
	render(<Record />)
	await holds(fit)
})

test('keeps the same columns after a resize down and up', async () => {
	render(<Record />)

	for (const fit of [...FITS, ...FITS.toReversed()]) {
		await page.viewport(fit.width, 800)
		await holds(fit)
	}
})

test('leaves where the columns sit to the page width alone, whatever takes room from the line', async () => {
	await page.viewport(FOLD_WINDOW, 800)
	render(<LongRecord />)
	await settled(FOLD)
	find(ASIDE).style.marginInlineStart = `${BAR}px`
	const { main, details } = columnsOf()

	near(main.top, details.top, 'both start on one line')
	expect(overflowOf(SPLIT), 'one scroll box and not two').toBeLessThanOrEqual(0)
})

test('folds at its own width on a bleed canvas, with the content inside the title', async () => {
	await page.viewport(BLEED_WINDOW, 800)
	render(
		<AdminRoot>
			<RecordPage canvas="bleed" aside={<div>Invoice details</div>}>
				<div>Lines</div>
			</RecordPage>
		</AdminRoot>,
	)
	await settled(BLEED_FOLD)
	const { page: room, main, details } = columnsOf()

	near(details.width, DETAILS, 'the details')
	near(main.left, room.left + RING_ROOM, 'the work starts inside the title')
	near(details.right, room.right - RING_ROOM, 'the details end inside the title')
	near(main.top, details.top, 'both start on one line')

	await page.viewport(BLEED_WINDOW - 1, 800)
	await settled(BLEED_FOLD - 1)
	stackedInOneBox()
})

test('holds the columns with a long word in each', async () => {
	renderRecord(<div>{LONG_WORD}</div>, <div>{LONG_WORD}</div>)
	await settled(ROOM)
	const { main, details } = columnsOf()

	near(details.width, DETAILS, 'the details')
	near(main.width, ROOM - DETAILS - GAP, 'the work')
	for (const column of ['.godmin-page__main', '.godmin-page__aside']) {
		expect(find(column).scrollWidth, column).toBeLessThanOrEqual(find(column).clientWidth)
	}
})

test('holds the columns around a wide table', async () => {
	render(<WideTable aside={<div>Report details</div>} />)
	await settled(ROOM)
	await expect.poll(() => find(SCROLLER).scrollWidth).toBeGreaterThan(find(SCROLLER).clientWidth)
	const { main, details } = columnsOf()

	near(details.width, DETAILS, 'the details')
	near(main.width, ROOM - DETAILS - GAP, 'the work')
	near(main.top, details.top, 'both start on one line')
})

test.each([
	{ width: 1280, room: ROOM },
	{ width: 390, room: PHONE_ROOM },
])('scrolls a wide table in its own box inside a column at $width', async ({ width, room }) => {
	await page.viewport(width, 800)
	renderRecord(<div>Invoice details</div>, <WideCustomTable />)
	await settled(room)
	const box = find('.godmin-table-scroll')

	expect(box.scrollWidth, 'the table runs past its box').toBeGreaterThan(box.clientWidth)
	expect(find(MAIN).scrollWidth, 'the column clips nothing').toBeLessThanOrEqual(find(MAIN).clientWidth)
})

test('keeps a list whole inside a column', async () => {
	renderRecord(<div>Invoice details</div>, <SectionList />)
	await settled(ROOM)
	const { main } = columnsOf()
	const row = boxOf('.dataviews-view-list__item')

	near(row.left, main.left, 'the row starts at the work')
	near(row.right, main.right, 'the row ends at the work')
})

test('sets the details at the end right to left, the split out to the canvas edges', async () => {
	render(
		<div dir="rtl">
			<Record />
		</div>,
	)
	await settled(ROOM)
	const { main, details, page: room } = columnsOf()
	const canvas = boxOf(CANVAS)
	const split = boxOf(SPLIT)

	near(details.left, room.left, 'the details at the end')
	near(main.right, room.right, 'the work at the start')
	near(split.left, canvas.left, 'the split reaches the left edge')
	near(split.right, canvas.right, 'the split reaches the right edge')
})

test('scrolls both columns as one box once stacked', async () => {
	await page.viewport(390, 844)
	render(<LongRecord />)
	await settled(PHONE_ROOM)
	const split = find(SPLIT)
	const title = boxOf('.godmin-page__header').top
	const before = columnsOf()

	stackedInOneBox()
	expect(overflowOf(SPLIT), 'the split scrolls').toBeGreaterThan(SHIFT)
	split.scrollTop = SHIFT
	near(columnsOf().main.top, before.main.top - SHIFT, 'the work moved')
	near(columnsOf().details.top, before.details.top - SHIFT, 'the details moved with it')
	near(boxOf('.godmin-page__header').top, title, 'the title stayed')
})

test('lifts the column limit a fraction under the fold', async () => {
	render(<LongRecord />)
	await settled(ROOM)
	find('.godmin-page').style.inlineSize = '823.9px'
	await expect.poll(() => columnsOf().page.width).toBeLessThan(824)

	stackedInOneBox()
})

test('keeps what a column holds at its own height', async () => {
	renderRecord(<TallPart />, <TallPart />)
	await settled(ROOM)

	for (const column of [MAIN, ASIDE]) {
		near(boxOf(`${column} > .tall-part`).height, TALL, column)
		expect(overflowOf(column), `${column} scrolls it`).toBeGreaterThan(0)
	}
})

test('leaves the short column at its own height, with no scroll', async () => {
	render(<LongRecord />)
	await settled(ROOM)

	expect(overflowOf(ASIDE)).toBeLessThanOrEqual(0)
	expect(boxOf(ASIDE).height).toBeLessThan(boxOf(MAIN).height)
})

test('reaches the last line with its gutter below, beside and stacked', async () => {
	render(<LongRecord />)
	await settled(ROOM)
	const work = find(MAIN)
	const split = find(SPLIT)

	work.scrollTop = work.scrollHeight
	near(columnsOf().main.bottom + FOOT, boxOf(MAIN).bottom, 'the gutter under the work')
	near(boxOf(MAIN).bottom, boxOf(CANVAS).bottom, 'the work reaches the canvas foot')
	await page.viewport(390, 844)
	await settled(PHONE_ROOM)
	split.scrollTop = split.scrollHeight
	near(columnsOf().details.bottom + FOOT, boxOf(SPLIT).bottom, 'the gutter under the details')
	near(boxOf(SPLIT).bottom, boxOf(CANVAS).bottom, 'the split reaches the canvas foot')
})

test.each([
	{ width: 1280, room: ROOM },
	{ width: 390, room: PHONE_ROOM },
])('leaves the canvas still and a focus ring its room at $width', async ({ width, room }) => {
	await page.viewport(width, 800)
	render(<LongRecord />)
	await settled(room)
	const canvas = find(CANVAS)
	const column = boxOf(ASIDE)
	const form = boxOf(`${ASIDE} form`)

	expect(canvas.scrollHeight, 'the canvas has nothing to scroll').toBe(canvas.clientHeight)
	near(form.left - column.left, RING_ROOM, 'room before the field')
	near(column.right - form.right, RING_ROOM, 'room after the field')
})

test('brings a field into view when it takes the focus', async () => {
	renderRecord(<ManyFields />, <div />)
	await settled(ROOM)
	const fields = find(ASIDE).querySelectorAll('input')
	const last = fields[fields.length - 1]

	expect(overflowOf(ASIDE), 'the fields do not fit').toBeGreaterThan(0)
	last.focus()
	await expect.poll(() => middleDown(last.getBoundingClientRect())).toBeLessThan(boxOf(ASIDE).bottom)
})

test('scrolls the canvas on a page with no aside', async () => {
	render(
		<AdminRoot>
			<Admin>
				<Page title="Reports">
					<div style={{ blockSize: TALL }} />
				</Page>
			</Admin>
		</AdminRoot>,
	)
	const canvas = find(CANVAS)
	const plain = find('.godmin-page')
	const last = (plain.lastElementChild as HTMLElement).getBoundingClientRect()

	expect(document.querySelector(SPLIT)).toBeNull()
	expect(canvas.scrollHeight, 'the canvas scrolls').toBeGreaterThan(canvas.clientHeight)
	expect(plain.scrollHeight, 'the page holds its content').toBe(plain.clientHeight)
	near(last.bottom - boxOf(CANVAS).top + FOOT, canvas.scrollHeight, 'the gutter under the last part')
})

test('grows a record inside a wrapper and leaves the scroll to the canvas', () => {
	render(
		<AdminRoot>
			<Admin>
				<div>
					<Page title="Invoice 1042" aside={<div>Details</div>}>
						<div style={{ blockSize: TALL }} />
					</Page>
				</div>
			</Admin>
		</AdminRoot>,
	)
	const canvas = find(CANVAS)

	expect(boxOf(SPLIT).height, 'the record takes its own height').toBeGreaterThan(TALL)
	expect(overflowOf(MAIN), 'the work has no scroll of its own').toBeLessThanOrEqual(0)
	expect(canvas.scrollHeight, 'the canvas scrolls').toBeGreaterThan(canvas.clientHeight)
})

test('grows a record outside any frame', () => {
	render(
		<AdminRoot>
			<Page title="Invoice 1042" aside={<div>Details</div>}>
				<div style={{ blockSize: TALL }} />
			</Page>
		</AdminRoot>,
	)

	expect(boxOf(SPLIT).height).toBeGreaterThan(TALL)
	expect(overflowOf(MAIN), 'the work has no scroll of its own').toBeLessThanOrEqual(0)
})

test('draws no second line under tabs', async () => {
	render(
		<AdminRoot>
			<Admin>
				<Page title="Invoice 1042" tabs={<div>Tabs</div>} aside={<div>Details</div>}>
					<div>Lines</div>
				</Page>
			</Admin>
		</AdminRoot>,
	)

	expect(getComputedStyle(find(SPLIT)).borderBlockStartWidth).toBe('0px')
	near(boxOf(SPLIT).top, boxOf('.godmin-page__tabs').bottom, 'the split starts at the tab line')
})

test.each([
	{ width: 1280, room: ROOM },
	{ width: 390, room: PHONE_ROOM },
])('keeps a long title and Save on one line at $width', async ({ width, room }) => {
	await page.viewport(width, 800)
	render(<Record title={LONG_TITLE} />)
	await settled(room)
	const head = find(HEAD)
	const title = find('.godmin-page__heading > :last-child')
	const trail = find('.godmin-page__breadcrumbs')

	near(boxOf(HEAD).height, TITLE_ROW, 'the row stays one line')
	near(boxOf(`${HEAD} button`).right, boxOf(HEAD).right, 'Save ends at the row end')
	expect(title.scrollWidth, 'the title gives way').toBeGreaterThan(title.clientWidth)
	expect(trail.scrollWidth, 'the links keep their width').toBeLessThanOrEqual(trail.clientWidth)
	expect(head.scrollWidth, 'nothing runs past the row').toBeLessThanOrEqual(head.clientWidth)
})

test.each([
	{ width: 1280, room: ROOM },
	{ width: 390, room: PHONE_ROOM },
])('keeps a short title on the line of its breadcrumbs at $width', async ({ width, room }) => {
	await page.viewport(width, 800)
	render(<Record />)
	await settled(room)

	near(boxOf(HEAD).height, TITLE_ROW, 'the row stays one line')
})

test('keeps a long trail clear of Save and the title in view on a phone', async () => {
	await page.viewport(390, 844)
	render(<HeaderRecord links={['Customer accounts', 'Northern region invoices']} actions={['Save']} />)
	await settled(PHONE_ROOM)
	const save = boxOf(`${HEAD} button`)
	const title = boxOf('.godmin-page__heading > :last-child')

	const first = boxOf('.godmin-page__breadcrumbs li:first-child')
	const last = boxOf('.godmin-page__breadcrumbs li:last-child')

	expect(last.top, 'the links wrap whole').toBeGreaterThan(first.top)
	expect(last.right, 'the links stop before Save').toBeLessThanOrEqual(save.left)
	expect(title.right, 'the title stops before Save').toBeLessThanOrEqual(save.left)
	expect(title.width, 'the title stays in view').toBeGreaterThanOrEqual(TITLE_FLOOR)
	expect(find(HEAD).scrollWidth, 'nothing runs past the row').toBeLessThanOrEqual(find(HEAD).clientWidth)
})

test('breaks a long word in a breadcrumb before it reaches Save on a phone', async () => {
	await page.viewport(390, 844)
	render(<HeaderRecord links={[LONG_WORD]} actions={['Save']} />)
	await settled(PHONE_ROOM)

	expect(boxOf('.godmin-page__breadcrumbs a').right).toBeLessThanOrEqual(boxOf(`${HEAD} button`).left)
	expect(find(HEAD).scrollWidth, 'nothing runs past the row').toBeLessThanOrEqual(find(HEAD).clientWidth)
})

test('keeps the title in view and moves wide actions under it on a phone', async () => {
	await page.viewport(390, 844)
	render(<HeaderRecord links={['Invoices']} actions={['Send to customer', 'Save changes']} />)
	await settled(PHONE_ROOM)
	const title = boxOf('.godmin-page__heading > :last-child')

	expect(title.width, 'the title stays in view').toBeGreaterThanOrEqual(TITLE_FLOOR)
	expect(boxOf(`${HEAD} button`).top, 'the actions sit under the title').toBeGreaterThanOrEqual(title.bottom)
	expect(find(HEAD).scrollWidth, 'nothing runs past the row').toBeLessThanOrEqual(find(HEAD).clientWidth)
})

test('paints the breadcrumb link and the slash from the tokens', () => {
	render(<Record />)

	expect(getComputedStyle(find('.godmin-page__breadcrumbs a')).color).toBe(tokenStyle('color', LINK_COLOUR))
	expect(getComputedStyle(find('.godmin-page__separator')).color).toBe(tokenStyle('color', SLASH_COLOUR))
})

test('gives the main work the page when the details render nothing', async () => {
	renderRecord(<Nothing />, <div>Lines</div>)
	await expect.poll(() => boxOf('.godmin-page__header').width).toBe(ROOM)

	near(boxOf(MAIN).width - 2 * RING_ROOM, ROOM, 'the work fills the page')
	expect(getComputedStyle(find(ASIDE)).display, 'the details take no room').toBe('none')
})

test('keeps the column edges when the details arrive', async () => {
	const lines = <div>Lines</div>
	const { rerender } = render(recordOf(<LoadingScreen label="Loading the invoice details." />, lines))
	await settled(ROOM)
	const before = columnEdges()

	rerender(recordOf(<div>Invoice details</div>, lines))

	expect(find(ASIDE).textContent).toBe('Invoice details')
	columnEdges().forEach((edge, index) => near(edge, before[index], `edge ${index}`))
})

test('sets the facts as WordPress panel rows', async () => {
	render(<Record />)
	await settled(ROOM)
	const rows = [...document.querySelectorAll('.dataforms-layouts-panel__field-trigger')]
	const value = getComputedStyle(find('.dataforms-layouts-panel__field-control'))

	expect(rows).toHaveLength(2)
	near(boxOf('.dataforms-layouts-panel__field-label').width, FACT_LABEL, 'the label')
	near(rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().bottom, FACT_GAP, 'the room between rows')
	expect(value.color).toBe(tokenStyle('color', FACT_COLOUR))
	expect(value.fontWeight).toBe(tokenStyle('fontWeight', FACT_WEIGHT))
	expect(document.querySelector('.dataforms-layouts-panel__field-trigger-icon'), 'no edit button').toBeNull()
})
