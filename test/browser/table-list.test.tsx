// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react'
import { chevronDown } from '@wordpress/icons'
import { Badge, Button, Collapsible, Icon, Stack } from '@wordpress/ui'
import type { ReactNode } from 'react'
import { expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { Page } from '../../src/page.js'
import { RowControls } from '../../src/rows.js'
import { ListPage, RecordPage } from '../../stories/frames.js'
import { find, middleDown } from '../../stories/measure.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** The width of a region that draws a list, of one that draws a table, and of one that holds a nested list. */
const NARROW = 358
const WIDE = 720
const HOLDS_NESTED = 660

/** How far apart two edges or middles may sit, in pixels. */
const SLACK = 1

/** The padding of a list item down and across, and the gap under its first line, as in the DataViews list. */
const ITEM_BLOCK = 16
const ITEM_INLINE = 24
const LINE_GAP = 4

/** The size and colour of the values under the first line, as the DataViews list draws its fields. */
const VALUE_SIZE = '12px'
const VALUE_COLOUR = 'rgb(112, 112, 112)'

/** The height of the first line of a list item, a medium control, and of its top line. */
const FIRST_LINE = 32
const ROW_LINE = 1

/** The colour a background holds when nothing paints it. */
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/** The window and the record page column of a desktop wide enough for a table, at least 640px. */
const WIDE_WINDOW = 1600

/** The window of a laptop, wide enough for a table but not for every button of a crowded row. */
const LAPTOP = 1024

/** The frame of the card of an open row inside its cell. */
const CARD_FRAME = 12

/** An API name longer than any phone, which must wrap inside its region. */
const LONG_NAME = 'billing_contact_phone_number_for_invoices_and_receipts'

/** A label long enough to wrap onto a second line in a narrow region. */
const LONG_LABEL = 'Billing contact phone number for invoices and receipts'

/** The words of the controls of a row. */
const WORDS = { moveUp: 'Move up', moveDown: 'Move down', remove: 'Remove' }

/** The buttons of a row that holds more than its first line has room for. */
const MANY = ['Move up', 'Move down', 'Deactivate', 'Delete', 'Fields']

/** One row of the table: its label, its kind and API name if any, its buttons, and what its open part holds. */
interface Field {
	label: string
	name: string
	kind?: string | null
	note?: string
	many?: boolean
	nested?: ReactNode
}

/** Renders the buttons of a row: the row controls, or a row of many buttons that does not wrap of itself. */
function Buttons({ many }: { many?: boolean }) {
	if (!many) {
		return <RowControls at={1} count={3} labels={WORDS} onMove={() => {}} onRemove={() => {}} />
	}
	return (
		<Stack direction="row" gap="xs">
			{MANY.map((word) => (
				<Button key={word} variant="outline" size="compact">
					{word}
				</Button>
			))}
		</Stack>
	)
}

/** Renders one field as its own tbody: its row, then its open part when it holds a nested table. */
function FieldRows({ field }: { field: Field }) {
	return (
		<Collapsible.Root render={<tbody />} open={field.nested !== undefined}>
			<tr data-field={field.label}>
				<td className="godmin-table__title">
					<div className="godmin-table__cell">
						<Collapsible.Trigger className="godmin-table__toggle">
							<Icon icon={chevronDown} className="godmin-table__toggle-icon" />
							{field.label}
						</Collapsible.Trigger>
					</div>
				</td>
				<td>
					<div className="godmin-table__cell">
						{field.kind === null ? null : <Badge intent="stable">{field.kind ?? 'Text'}</Badge>}
					</div>
					{field.note === undefined ? null : <div data-note="">{field.note}</div>}
				</td>
				<td>
					<div className="godmin-table__cell">{field.name === '' ? null : <code>{field.name}</code>}</div>
				</td>
				<td className="godmin-table__actions">
					<div className="godmin-table__cell">
						<Buttons many={field.many} />
					</div>
				</td>
			</tr>
			<Collapsible.Panel render={<tr />} className="godmin-table__detail">
				<td colSpan={4}>
					<div className="godmin-table__detail-motion">
						<div>
							<div className="godmin-table__detail-body">{field.nested}</div>
						</div>
					</div>
				</td>
			</Collapsible.Panel>
		</Collapsible.Root>
	)
}

/** Renders a table of fields with no region around it. */
function BareTable({ fields }: { fields: Field[] }) {
	return (
		<table className="godmin-table">
			<thead>
				<tr>
					<th scope="col">Label</th>
					<th scope="col">Kind</th>
					<th scope="col">API name</th>
					<th scope="col" className="godmin-table__actions">
						Actions
					</th>
				</tr>
			</thead>
			{fields.map((field) => (
				<FieldRows key={field.label} field={field} />
			))}
		</table>
	)
}

/** Renders a table of fields in the region it sits in, at a set width. */
function FieldTable({ name, width, fields }: { name: string; width?: number; fields: Field[] }) {
	return (
		<div className="godmin-table-scroll" role="region" aria-label={name} tabIndex={0} style={{ inlineSize: width }}>
			<BareTable fields={fields} />
		</div>
	)
}

/** Returns the colour a token paints a property with. */
function colourOf(token: string, property: 'background-color' | 'color'): string {
	const probe = document.createElement('span')
	probe.style.setProperty(property, `var(${token})`)
	document.body.append(probe)
	const colour = getComputedStyle(probe).getPropertyValue(property)
	probe.remove()
	return colour
}

/** Scrolls a region sideways to its start or its end, in either text direction, and waits a frame. */
async function scrollTo(region: HTMLElement, end: boolean) {
	const reach = region.scrollWidth - region.clientWidth
	region.scrollLeft = end ? reach * (getComputedStyle(region).direction === 'rtl' ? -1 : 1) : 0
	await new Promise((done) => requestAnimationFrame(done))
}

/** Draws a table at a set width and waits for its fonts. */
async function draw(table: ReactNode) {
	render(<AdminRoot writeTimeout={PATIENT_LIMIT}>{table}</AdminRoot>)
	await document.fonts.ready
}

/** Returns the region of a table by its name. */
function regionOf(name: string): HTMLElement {
	return find(`[role="region"][aria-label="${name}"]`)
}

/** Returns the row of a field and the box of its label, its first button, its badge and its API name. */
function partsOf(label: string, scope: ParentNode = document) {
	const row = scope.querySelector(`tr[data-field="${label}"]`) as HTMLTableRowElement
	const box = (selector: string) => (row.querySelector(selector) as HTMLElement).getBoundingClientRect()
	return {
		row,
		toggle: box('.godmin-table__toggle'),
		icon: box('.godmin-table__toggle-icon'),
		button: box('.godmin-table__actions button'),
		actions: box('.godmin-table__actions'),
		kind: box('td:nth-child(2)'),
		badge: box('td:nth-child(2) .godmin-table__cell > *'),
		name: box('code'),
		nameCell: row.querySelector('td:nth-child(3)') as HTMLElement,
	}
}

/** Checks two positions meet within the slack. */
function near(actual: number, expected: number, what: string) {
	expect(Math.abs(actual - expected), `${what}: ${actual} and not ${expected}`).toBeLessThanOrEqual(SLACK)
}

test('draws each row of a narrow region as a list item, label and buttons on one line, values under them', async () => {
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: LONG_NAME }]} />)
	const region = regionOf('Fields').getBoundingClientRect()
	const { row, toggle, button, actions, kind, badge, name } = partsOf('Phone')
	const item = row.getBoundingClientRect()

	near(middleDown(toggle), middleDown(button), 'the label and the buttons share the first line')
	near(toggle.left, region.left + ITEM_INLINE, 'the label starts at the item padding')
	near(actions.right, region.right - ITEM_INLINE, 'the buttons end at the item padding')
	near(actions.top, item.top + ROW_LINE + ITEM_BLOCK, 'the first line starts at the item padding')
	near(actions.height, FIRST_LINE, 'the first line is a medium control tall')
	near(kind.top, actions.bottom + LINE_GAP, 'the values sit one list gap under the first line')
	near(badge.left, region.left + ITEM_INLINE, 'the values start at the item padding')
	expect(name.right, 'the API name stays inside the item').toBeLessThanOrEqual(region.right - ITEM_INLINE + SLACK)
})

test('ends a list item with no values at its padding under the first line, its empty values hidden', async () => {
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: '', kind: null }]} />)
	const row = find('tr[data-field="Phone"]')
	const values = [...row.querySelectorAll<HTMLElement>('td:nth-child(2), td:nth-child(3)')]

	expect(values.map((cell) => getComputedStyle(cell).display)).toEqual(['none', 'none'])
	near(row.getBoundingClientRect().height, ROW_LINE + ITEM_BLOCK + FIRST_LINE + ITEM_BLOCK, 'the item')
})

test('keeps a value cell whose box is empty but holds a note after the box, as the docs allow', async () => {
	const noted = [{ label: 'Phone', name: 'billing_phone', kind: null, note: 'Sub fields: Role, Name' }]
	await draw(<FieldTable name="Fields" width={NARROW} fields={noted} />)
	const note = find('[data-note]')

	expect(getComputedStyle(note.closest('td') as HTMLElement).display, 'the cell').not.toBe('none')
	expect(note.getBoundingClientRect().height, 'the note shows').toBeGreaterThan(0)
})

test('keeps a hidden body, row and cell hidden in a narrow region', async () => {
	const fields = [
		{ label: 'Phone', name: 'billing_phone' },
		{ label: 'Email', name: 'invoice_email' },
		{ label: 'Team', name: 'team_members' },
	]
	await draw(<FieldTable name="Fields" width={NARROW} fields={fields} />)
	const body = find('tr[data-field="Phone"]').closest('tbody') as HTMLElement
	const row = find('tr[data-field="Email"]')
	const cell = find('tr[data-field="Team"] > td:nth-child(3)')

	for (const part of [body, row, cell]) {
		part.hidden = true
	}

	expect([body, row, cell].map((part) => getComputedStyle(part).display)).toEqual(['none', 'none', 'none'])
})

test('starts a list item at the start edge in a right to left page', async () => {
	await draw(
		<div dir="rtl">
			<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: 'billing_phone' }]} />
		</div>,
	)
	const region = regionOf('Fields').getBoundingClientRect()
	const { toggle, actions, badge } = partsOf('Phone')

	near(toggle.right, region.right - ITEM_INLINE, 'the label starts at the start edge')
	near(actions.left, region.left + ITEM_INLINE, 'the buttons end at the end edge')
	near(badge.right, region.right - ITEM_INLINE, 'the values start at the start edge')
})

test('keeps a table with no godmin-table-scroll box a table, whatever size container holds it', async () => {
	await page.viewport(390, 844)
	await draw(
		<RecordPage aside={<div>Field group details</div>}>
			<BareTable fields={[{ label: 'Phone', name: 'billing_phone' }]} />
		</RecordPage>,
	)

	expect(getComputedStyle(partsOf('Phone').row).display).toBe('table-row')
})

test.each(['ltr', 'rtl'])(
	'scrolls a table too wide for a record page column 640px or wider, its open part inside at both ends, %s',
	async (dir) => {
		await page.viewport(WIDE_WINDOW, 900)
		const wide = [{ label: 'Phone', name: `${LONG_NAME}_${LONG_NAME}`, nested: <p>Shown on the edit screen.</p> }]
		await draw(
			<div dir={dir}>
				<RecordPage aside={<div>Field group details</div>}>
					<FieldTable name="Fields" fields={wide} />
				</RecordPage>
			</div>,
		)
		const region = regionOf('Fields')
		const card = find('.godmin-table__detail-body')

		expect(region.clientWidth, 'the column holds a table').toBeGreaterThanOrEqual(640)
		expect(region.scrollWidth, 'the table scrolls sideways').toBeGreaterThan(region.clientWidth)
		for (const end of [false, true]) {
			await scrollTo(region, end)
			const shown = region.getBoundingClientRect().left + region.clientLeft
			const box = card.getBoundingClientRect()
			const at = end ? 'at the scroll end' : 'at the scroll start'
			expect(box.left, `the card starts inside ${at}`).toBeGreaterThanOrEqual(shown - SLACK)
			expect(box.right, `the card ends inside ${at}`).toBeLessThanOrEqual(shown + region.clientWidth + SLACK)
		}
	},
)

test.each(['ltr', 'rtl'])(
	'scrolls a table too wide for its region on a list page 640px or wider, so its last button can be reached, %s',
	async (dir) => {
		await page.viewport(LAPTOP, 768)
		await draw(
			<div dir={dir}>
				<ListPage>
					<FieldTable name="Fields" fields={[{ label: 'Phone', name: LONG_NAME, many: true }]} />
				</ListPage>
			</div>,
		)
		const region = regionOf('Fields')
		const last = [...region.querySelectorAll('.godmin-table__actions button')].at(-1) as HTMLElement

		expect(region.clientWidth, 'the region holds a table').toBeGreaterThanOrEqual(640)
		expect(region.scrollWidth, 'the row needs more room than the region').toBeGreaterThan(region.clientWidth)
		await scrollTo(region, true)
		const shown = region.getBoundingClientRect().left + region.clientLeft
		const box = last.getBoundingClientRect()
		expect(box.left, 'the last button starts inside at the scroll end').toBeGreaterThanOrEqual(shown - SLACK)
		expect(box.right, 'the last button ends inside at the scroll end').toBeLessThanOrEqual(
			shown + region.clientWidth + SLACK,
		)
		expect(document.documentElement.scrollWidth, 'the page scrolls nothing sideways').toBeLessThanOrEqual(LAPTOP)
	},
)

test('pads a list item on a list page at its own sides alone, not again at its first and last cells', async () => {
	await page.viewport(390, 844)
	await draw(
		<Page title="Fields" list>
			<FieldTable name="Fields" fields={[{ label: 'Phone', name: 'billing_phone' }]} />
		</Page>,
	)
	const region = regionOf('Fields').getBoundingClientRect()
	const { toggle, actions } = partsOf('Phone')

	near(toggle.left, region.left + ITEM_INLINE, 'the label starts at the item padding')
	near(actions.right, region.right - ITEM_INLINE, 'the buttons end at the item padding')
})

test('sets the values under the first line in the small weak text of the DataViews list', async () => {
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: 'billing_phone' }]} />)
	const { nameCell } = partsOf('Phone')

	expect(getComputedStyle(nameCell).fontSize).toBe(VALUE_SIZE)
	expect(getComputedStyle(nameCell).color).toBe(VALUE_COLOUR)
})

test.each([
	{ width: 390, how: 'on a phone' },
	{ width: 1280, how: 'in a narrow column on a desktop' },
])('runs nothing past a narrow region $how', async ({ width }) => {
	await page.viewport(width, 800)
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: LONG_LABEL, name: LONG_NAME, many: true }]} />)
	const region = regionOf('Fields')

	expect(region.scrollWidth, 'the region scrolls nothing sideways').toBeLessThanOrEqual(region.clientWidth)
	for (const cell of region.querySelectorAll<HTMLElement>('tbody td')) {
		expect(cell.scrollWidth, 'a cell cuts nothing').toBeLessThanOrEqual(cell.clientWidth)
	}
})

test('puts buttons that do not fit beside the label on a line of their own, wrapping inside the item', async () => {
	const crowded = [{ label: 'Phone', name: 'billing_phone', many: true }]
	await draw(<FieldTable name="Fields" width={NARROW} fields={crowded} />)
	const region = regionOf('Fields').getBoundingClientRect()
	const { toggle, actions, kind } = partsOf('Phone')

	expect(actions.top, 'the buttons sit under the label').toBeGreaterThanOrEqual(toggle.bottom)
	expect(actions.right, 'the buttons stay inside the item').toBeLessThanOrEqual(region.right - ITEM_INLINE + SLACK)
	near(kind.top, actions.bottom + LINE_GAP, 'the values sit one list gap under the buttons')
})

test('hides the column headers from sight in a narrow region and keeps them for screen readers', async () => {
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: 'billing_phone' }]} />)
	const head = regionOf('Fields').querySelector('thead') as HTMLElement

	expect(getComputedStyle(head).display, 'the headers stay in the table').not.toBe('none')
	expect(head.getBoundingClientRect().height, 'the headers take no room').toBeLessThanOrEqual(1)
	expect(head.querySelectorAll('th[scope="col"]')).toHaveLength(4)
})

test('keeps a region 640px wide or wider a table, each row on one line under its headers', async () => {
	await draw(<FieldTable name="Fields" width={WIDE} fields={[{ label: 'Phone', name: 'billing_phone' }]} />)
	const head = regionOf('Fields').querySelector('thead') as HTMLElement
	const { toggle, button, badge, name } = partsOf('Phone')

	expect(head.getBoundingClientRect().height, 'the headers show').toBeGreaterThan(20)
	for (const part of [button, badge, name]) {
		near(middleDown(part), middleDown(toggle), 'a cell of the row')
	}
})

test('draws the open part of a row in a narrow region as a block the width of the region under its row', async () => {
	const nested = <p>Shown on the edit screen.</p>
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: 'billing_phone', nested }]} />)
	const region = regionOf('Fields').getBoundingClientRect()
	const card = find('.godmin-table__detail-body').getBoundingClientRect()
	const { row } = partsOf('Phone')

	expect(card.top, 'the open part sits under its row').toBeGreaterThanOrEqual(row.getBoundingClientRect().bottom)
	near(card.left, region.left + CARD_FRAME, 'the open part starts inside its frame')
	near(card.right, region.right - CARD_FRAME, 'the open part ends inside its frame')
})

test('draws a table nested in an open part as a list in a narrow region, the outer table staying a table', async () => {
	const nested = <FieldTable name="Sub fields" fields={[{ label: 'Role', name: 'role' }]} />
	const team = [{ label: 'Team', name: 'team_members', nested }]
	await draw(<FieldTable name="Fields" width={HOLDS_NESTED} fields={team} />)
	const outer = partsOf('Team')
	const inner = partsOf('Role', regionOf('Sub fields'))

	expect(regionOf('Sub fields').clientWidth, 'the nested region is narrow').toBeLessThan(640)
	near(middleDown(outer.name), middleDown(outer.toggle), 'the outer row keeps its API name on its line')
	expect(inner.name.top, 'the nested row puts its API name under its label').toBeGreaterThanOrEqual(inner.toggle.bottom)
})

test('keeps the buttons of a list nested one level deep on a phone beside its label', async () => {
	await page.viewport(390, 844)
	const nested = <FieldTable name="Sub fields" fields={[{ label: 'Role', name: 'role' }]} />
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Team', name: 'team_members', nested }]} />)
	const inner = partsOf('Role', regionOf('Sub fields'))

	near(middleDown(inner.button), middleDown(inner.toggle), 'the buttons share the line of the label')
})

test.each([
	{ width: NARROW, how: 'in a list' },
	{ width: WIDE, how: 'in a table' },
])('keeps the chevron of a label that wraps beside its first line $how', async ({ width }) => {
	const label = width === WIDE ? `${LONG_LABEL} ${LONG_LABEL} ${LONG_LABEL}` : LONG_LABEL
	await draw(<FieldTable name="Fields" width={width} fields={[{ label, name: 'billing_phone' }]} />)
	const { toggle, icon } = partsOf(label)
	const line = parseFloat(getComputedStyle(find('.godmin-table__toggle')).lineHeight)

	expect(toggle.height, 'the label wraps').toBeGreaterThan(line * 1.5)
	near(middleDown(icon), toggle.top + line / 2, 'the chevron sits beside the first line')
})

test('keeps the first line of a label that wraps in a list level with its buttons', async () => {
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: LONG_LABEL, name: 'billing_phone' }]} />)
	const { toggle, button } = partsOf(LONG_LABEL)
	const line = parseFloat(getComputedStyle(find('.godmin-table__toggle')).lineHeight)

	near(toggle.top + line / 2, middleDown(button), 'the first line of the label')
})

test('tints the whole list item under the pointer and darkens its values, as the DataViews list does', async () => {
	await draw(<FieldTable name="Fields" width={NARROW} fields={[{ label: 'Phone', name: 'billing_phone' }]} />)
	const { row, nameCell } = partsOf('Phone')
	const tint = colourOf('--wpds-color-background-interactive-neutral-weak-active', 'background-color')
	const value = colourOf('--wpds-color-foreground-interactive-neutral', 'color')

	await userEvent.hover(row.querySelector('code') as HTMLElement)

	await expect.poll(() => getComputedStyle(row).backgroundColor, { message: 'the item' }).toBe(tint)
	expect(getComputedStyle(nameCell).backgroundColor, 'a cell paints no tint of its own').toBe(TRANSPARENT)
	expect(getComputedStyle(nameCell).color, 'a value under the pointer').toBe(value)
})
