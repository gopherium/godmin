// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import { chevronDown } from '@wordpress/icons'
import { Badge, Button, Collapsible, Icon, InputControl, SelectControl, Stack, VisuallyHidden } from '@wordpress/ui'
import { useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { expect, onTestFinished, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { ConfirmDialog } from '../../src/confirm-dialog.js'
import { Page } from '../../src/page.js'
import { RowControls } from '../../src/rows.js'
import { Admin, RecordPage } from '../../stories/frames.js'
import { backgroundOf, columnsOf, find, middleAcross, middleDown, onTop } from '../../stories/measure.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** The page width the frame leaves at the window the tests open on, and on a phone inside its gutter. */
const ROOM = 916
const PHONE_ROOM = 358
const GUTTER = 16

/** How long a detail row takes to open or close, and the moment a test stops its motion at. */
const MOTION_TIME = 150
const MIDWAY = 75

/** The room under the card of an open row, its bottom margin. */
const CARD_FOOT = 12

/** The colour a part with no background of its own computes to. */
const TRANSPARENT = 'rgba(0, 0, 0, 0)'

/** A help line short enough for one line in any card. */
const SHORT_HELP = 'Shown to Maria Perez.'

/** A help line holding a key longer than any column, which must wrap inside the card. */
const LONG_HELP =
	'Maria Perez fills this field on the edit screen. Its key reads ' +
	'team_members_website_address_settings_override_value_for_every_location and it holds the value.'

/** A rule of an app in a layer under godmin's that draws every body row of a table as a row. */
const LOWER_LAYER_ROWS = '@layer wp-ui { .godmin-table tbody tr { display: table-row; } }'

/** A rule of an app outside every layer that draws each body row as a row, unless the row is hidden. */
const SHOWN_ROWS = '.godmin-table tbody tr:not([hidden]) { display: table-row; }'

/** The choices of the select in an open part. */
const SHOWN_AS = [
	{ value: 'line', label: 'One line' },
	{ value: 'area', label: 'Many lines' },
]

/** One field of the table, with the fields its open part holds. */
interface Field {
	key: string
	label: string
	kind: string
	name: string
	fields?: Field[]
}

/** Thirty fields of one kind, for a long table. */
const THIRTY: Field[] = Array.from({ length: 30 }, (_, at) => ({
	key: `field-${at + 1}`,
	label: `Field ${at + 1}`,
	kind: 'Text',
	name: `field_${at + 1}`,
}))

/** Whether a field of the thirty is one of the five a long table opens, every sixth one. */
function opensOfThirty(at: number): boolean {
	return at % 6 === 0
}

/** The fields of the tests, the second one holding a table two levels deep. */
const FIELDS: Field[] = [
	{ key: 'phone', label: 'Phone', kind: 'Text', name: 'billing_contact_phone_number_for_invoices' },
	{
		key: 'team',
		label: 'Team',
		kind: 'Repeater',
		name: 'team_members',
		fields: [
			{ key: 'team.role', label: 'Role', kind: 'Text', name: 'role' },
			{
				key: 'team.members',
				label: 'Members',
				kind: 'Group',
				name: 'members',
				fields: [
					{ key: 'team.members.name', label: 'Name', kind: 'Text', name: 'name' },
					{ key: 'team.members.website', label: 'Website', kind: 'URL', name: 'website_address' },
				],
			},
		],
	},
	{ key: 'email', label: 'Email', kind: 'Email', name: 'invoice_email_address' },
]

/** How a table keeps a closed row: out of the page, kept for find in page, or kept mounted. */
type Keep = 'unmount' | 'findable' | 'mounted'

/** The panel props of each way to keep a closed row. */
const KEPT: Record<Keep, { hiddenUntilFound?: true; keepMounted?: true }> = {
	unmount: {},
	findable: { hiddenUntilFound: true },
	mounted: { keepMounted: true },
}

/** The two ways the recipe keeps a closed row: the WPDS default, and the one the docs ask for. */
const KEEPS: { keep: Keep; how: string }[] = [
	{ keep: 'unmount', how: 'leaves the page' },
	{ keep: 'findable', how: 'stays for find in page' },
]

/** The ways a closed row is kept, each with a rule of the app on the page. */
const CLOSED_ROWS = [
	...KEEPS.map((kept) => ({ ...kept, rule: '' })),
	{ keep: 'mounted' as Keep, how: 'stays mounted under a row rule of an app in a lower layer', rule: LOWER_LAYER_ROWS },
	...(['mounted', 'findable'] as Keep[]).map((keep) => ({
		keep,
		how: `is kept ${keep} under a row rule of an app that leaves out a hidden row`,
		rule: SHOWN_ROWS,
	})),
]

/** The text directions a page reads in. */
type Direction = 'ltr' | 'rtl'

/** What every row of a table shares: how it keeps a closed row, the open rows, and how to open or close one. */
interface Rows {
	keep: Keep
	opened: ReadonlySet<string>
	onOpen: (key: string, open: boolean) => void
}

/** Puts the focus on a row's toggle when its open part is about to close while it holds the focus. */
function focusToggleFrom(part: HTMLDivElement | null, toggle: HTMLButtonElement | null): void {
	if (part?.contains(document.activeElement)) {
		toggle?.focus()
	}
}

/** Returns the words of the controls of a field's row. */
function wordsOf(field: Field) {
	return { moveUp: `Move ${field.label} up`, moveDown: `Move ${field.label} down`, remove: `Remove ${field.label}` }
}

/** Keeps the page where it is when the form of an open part is sent. */
function keepPage(event: FormEvent<HTMLFormElement>): void {
	event.preventDefault()
}

/** Renders the settings an open row holds, the fields it holds in a table of their own, then its buttons. */
function FieldSettings({ field, rows, onClose }: { field: Field; rows: Rows; onClose: () => void }) {
	const [deleting, setDeleting] = useState(false)
	return (
		<Stack direction="column" gap="md">
			<form className="godmin-form" onSubmit={keepPage}>
				<InputControl label="Help text" defaultValue={SHORT_HELP} />
				<SelectControl label="Shown as" items={SHOWN_AS} />
				<p id={`help-${field.key}`}>{SHORT_HELP}</p>
				<p>{LONG_HELP}</p>
			</form>
			{field.fields ? <FieldTable fields={field.fields} label={`Sub fields of ${field.label}`} rows={rows} /> : null}
			<div>
				<Button variant="outline" size="compact" onClick={() => setDeleting(true)}>
					Delete field
				</Button>
			</div>
			<div>
				<Button variant="outline" size="compact" onClick={onClose}>
					Close field
				</Button>
			</div>
			{deleting ? (
				<ConfirmDialog
					title={`Delete ${field.label}?`}
					confirmLabel="Delete"
					cancelLabel="Cancel"
					onConfirm={() => undefined}
					onClose={() => setDeleting(false)}
				/>
			) : null}
		</Stack>
	)
}

/** Renders one field as its own tbody: its row, then the row that opens under it. */
function FieldRows({ field, at, count, rows }: { field: Field; at: number; count: number; rows: Rows }) {
	const toggle = useRef<HTMLButtonElement>(null)
	const part = useRef<HTMLDivElement>(null)
	const change = (next: boolean) => {
		if (!next) {
			focusToggleFrom(part.current, toggle.current)
		}
		rows.onOpen(field.key, next)
	}
	return (
		<Collapsible.Root render={<tbody />} open={rows.opened.has(field.key)} onOpenChange={change}>
			<tr>
				<td className="godmin-table__title">
					<div className="godmin-table__cell">
						<Collapsible.Trigger ref={toggle} className="godmin-table__toggle">
							<Icon icon={chevronDown} className="godmin-table__toggle-icon" />
							{field.label}
						</Collapsible.Trigger>
					</div>
				</td>
				<td>
					<div className="godmin-table__cell">
						<Badge intent="stable">{field.kind}</Badge>
					</div>
				</td>
				<td>
					<div className="godmin-table__cell">
						<code>{field.name}</code>
					</div>
				</td>
				<td className="godmin-table__actions">
					<div className="godmin-table__cell">
						<RowControls at={at} count={count} labels={wordsOf(field)} onMove={() => {}} onRemove={() => {}} />
					</div>
				</td>
			</tr>
			<Collapsible.Panel render={<tr />} className="godmin-table__detail" {...KEPT[rows.keep]}>
				<td colSpan={4}>
					<div className="godmin-table__detail-motion">
						<div>
							<div ref={part} className="godmin-table__detail-body">
								<FieldSettings field={field} rows={rows} onClose={() => change(false)} />
							</div>
						</div>
					</div>
				</td>
			</Collapsible.Panel>
		</Collapsible.Root>
	)
}

/** Renders a table of fields in the region it scrolls in, one tbody per field. */
function FieldTable({ fields, label, rows }: { fields: Field[]; label: string; rows: Rows }) {
	return (
		<div className="godmin-table-scroll" role="region" aria-label={label} tabIndex={0}>
			<table className="godmin-table">
				<thead>
					<tr>
						<th scope="col">Label</th>
						<th scope="col">Kind</th>
						<th scope="col">API name</th>
						<th scope="col" className="godmin-table__actions">
							<VisuallyHidden>Actions</VisuallyHidden>
						</th>
					</tr>
				</thead>
				{fields.map((field, at) => (
					<FieldRows key={field.key} field={field} at={at} count={fields.length} rows={rows} />
				))}
			</table>
		</div>
	)
}

/** How a fields table keeps a closed row, the rows it opens at first, and its fields. */
interface FieldsProps {
	keep?: Keep
	open?: string[]
	fields?: Field[]
}

/** Renders the fields table with its open rows kept in page state, any number open at once. */
function Fields({ keep = 'unmount', open = [], fields = FIELDS }: FieldsProps) {
	const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set(open))
	const onOpen = (key: string, next: boolean) =>
		setOpened((before) => {
			const after = new Set(before)
			if (next) {
				after.add(key)
			} else {
				after.delete(key)
			}
			return after
		})
	return <FieldTable fields={fields} label="Fields" rows={{ keep, opened, onOpen }} />
}

/** Returns what a test draws on a plain page of the admin frame, in a text direction. */
function onPage(content: ReactNode, dir: Direction = 'ltr') {
	return (
		<div dir={dir}>
			<AdminRoot writeTimeout={PATIENT_LIMIT}>
				<Admin>
					<Page title="Fields">{content}</Page>
				</Admin>
			</AdminRoot>
		</div>
	)
}

/** Returns what a test draws in the main column of a record page. */
function onRecord(content: ReactNode) {
	return (
		<AdminRoot writeTimeout={PATIENT_LIMIT}>
			<RecordPage aside={<div>Field group details</div>}>{content}</RecordPage>
		</AdminRoot>
	)
}

/** Where a row rests once its motion ends. */
type Rest = 'open' | 'closed'

/** One field's rows in a table, found by the label of its toggle: its own row, and the row that opens under it. */
class FieldRow {
	/** The label of the row's toggle. */
	readonly label: string

	/** Finds the rows of the field whose toggle reads the label. */
	constructor(label: string) {
		this.label = label
	}

	/** The toggle of the row. */
	get toggle(): HTMLButtonElement {
		return screen.getByRole('button', { name: this.label })
	}

	/** The chevron inside the toggle. */
	get chevron(): Element {
		return this.toggle.querySelector('.godmin-table__toggle-icon') as Element
	}

	/** The trash of the row. */
	get trash(): HTMLElement {
		return screen.getByRole('button', { name: `Remove ${this.label}` })
	}

	/** The row that opens under the row, none while the page holds no such row. */
	get part(): HTMLTableRowElement | null {
		return this.toggle.closest('tbody')?.querySelector(':scope > tr.godmin-table__detail') ?? null
	}

	/** The row that opens under the row, failing when the page holds none. */
	get shownPart(): HTMLTableRowElement {
		const part = this.part
		if (part === null) {
			throw new Error(`the ${this.label} row has no open part`)
		}
		return part
	}

	/** The card of the open part. */
	get card(): HTMLElement {
		return this.shownPart.querySelector('.godmin-table__detail-body') as HTMLElement
	}

	/** The Close field button that closes the row, the last one in its card. */
	get close(): HTMLElement {
		return within(this.card).getAllByRole('button', { name: 'Close field' }).at(-1) as HTMLElement
	}

	/** The wrapper that grows the open part. */
	get growth(): HTMLElement {
		return this.shownPart.querySelector('.godmin-table__detail-motion') as HTMLElement
	}

	/** How tall the open part is drawn, 0 while the page holds none. */
	get height(): number {
		return this.part?.getBoundingClientRect().height ?? 0
	}

	/** The motions running in the open part and on the chevron. */
	get motions(): Animation[] {
		return [...(this.part?.getAnimations({ subtree: true }) ?? []), ...this.chevron.getAnimations()]
	}

	/** Whether the row is open and still, closed, or on its way between the two. */
	get state(): Rest | 'moving' {
		const part = this.part
		if (part === null || part.hasAttribute('hidden')) {
			return 'closed'
		}
		const marked = part.hasAttribute('data-starting-style') || part.hasAttribute('data-ending-style')
		return part.hasAttribute('data-open') && !marked && this.motions.length === 0 ? 'open' : 'moving'
	}

	/** The padding of each side of the card. */
	get padding(): string[] {
		const style = getComputedStyle(this.card)
		return [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft]
	}

	/** The room between the bottom of the row and the bottom of the part of its card a reader sees. */
	get band(): number {
		const clips = [this.card, this.growth.firstElementChild as Element, this.growth]
		const seen = Math.min(...clips.map((box) => box.getBoundingClientRect().bottom))
		return this.shownPart.getBoundingClientRect().bottom - seen
	}
}

/** The rows of the outer table, and a row of the table nested two deep. */
const PHONE = new FieldRow('Phone')
const TEAM = new FieldRow('Team')
const EMAIL = new FieldRow('Email')
const MEMBERS = new FieldRow('Members')

/** Returns the region with a name. */
function regionOf(name: string): HTMLElement {
	return screen.getByRole('region', { name })
}

/** Waits for each row to come to rest open or closed. */
async function restAt(rest: Rest, rows: FieldRow[]) {
	for (const row of rows) {
		await expect.poll(() => row.state, { message: `the ${row.label} row ${rest}` }).toBe(rest)
	}
}

/** Presses the toggle of each row as a person does and waits for each to rest in its new state. */
async function press(rest: Rest, rows: FieldRow[]) {
	for (const row of rows) {
		await userEvent.click(row.toggle)
		await restAt(rest, [row])
	}
}

/** Draws what a test asks for and waits for the rows it opens to rest open. */
async function draw(content: ReactNode, open: FieldRow[] = []) {
	render(content)
	await restAt('open', open)
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Checks two lengths meet within half a pixel. */
function near(actual: number, expected: number, what: string) {
	expect(Math.abs(actual - expected), what).toBeLessThan(0.5)
}

/** Checks an element sits inside the width its region shows, inside the region's border. */
function expectInside(element: Element, region: HTMLElement, what: string) {
	const shown = region.getBoundingClientRect().left + region.clientLeft
	const box = element.getBoundingClientRect()

	expect(box.left, `${what} starts inside`).toBeGreaterThanOrEqual(shown - 0.5)
	expect(box.right, `${what} ends inside`).toBeLessThanOrEqual(shown + region.clientWidth + 0.5)
}

/** Scrolls a region sideways to its start or its end, in either text direction. */
async function scrollTo(region: HTMLElement, end: boolean) {
	const reach = region.scrollWidth - region.clientWidth
	region.scrollLeft = end ? reach * (getComputedStyle(region).direction === 'rtl' ? -1 : 1) : 0
	await frames(1)
}

/** Checks the table in a region is wider than the region, so the region scrolls sideways. */
function expectScrolls(region: HTMLElement) {
	expect(region.scrollWidth, `the table in ${region.getAttribute('aria-label')} scrolls sideways`).toBeGreaterThan(
		region.clientWidth,
	)
}

/** Returns the name of the end of a scroll: its start or its end. */
function endName(end: boolean): string {
	return end ? 'end' : 'start'
}

/** Each pair of scroll ends of an outer region and of the region nested in it. */
const SCROLL_MIXES = [false, true].flatMap((outer) => [false, true].map((inner) => ({ outer, inner })))

/** Checks the card and the Close field button of an open row sit inside the region at both ends of its scroll. */
async function insideAtBothEnds(row: FieldRow, region: HTMLElement) {
	expectScrolls(region)
	for (const end of [false, true]) {
		await scrollTo(region, end)
		const at = end ? 'at the scroll end' : 'at the scroll start'
		expectInside(row.card, region, `the card ${at}`)
		expectInside(row.close, region, `Close field ${at}`)
	}
}

/** Returns the box round the words of an element, every line of them. */
function wordsBox(element: Element): DOMRect {
	const words = document.createRange()
	words.selectNodeContents(element)
	return words.getBoundingClientRect()
}

/** Checks every line of a text ends inside the padding of the card that holds it. */
function wrapsInside(line: Element, card: HTMLElement) {
	const style = getComputedStyle(card)
	const edge = card.getBoundingClientRect().right - parseFloat(style.borderRightWidth) - parseFloat(style.paddingRight)

	expect(wordsBox(line).right, 'the long line ends inside the card').toBeLessThanOrEqual(edge + 0.5)
}

/** Waits for an overlay to come to rest over a card, then checks it draws above the card at its middle. */
async function drawnAbove(overlay: Element, card: Element, what: string) {
	await expect.poll(() => overlay.getAnimations({ subtree: true }).length, { message: `${what} at rest` }).toBe(0)
	const box = overlay.getBoundingClientRect()
	const [across, down] = [middleAcross(box), middleDown(box)]
	const under = card.getBoundingClientRect()

	expect(across > under.left && across < under.right, `${what} lies over the card across`).toBe(true)
	expect(down > under.top && down < under.bottom, `${what} lies over the card down`).toBe(true)
	expect(onTop(overlay, across, down), `${what} draws above the card`).toBe(true)
}

/** Returns where the Tab key goes from the trash of a row: into its open part, or to the toggle of the next row. */
function afterTrash(row: FieldRow, next: FieldRow): HTMLElement {
	return row.state === 'open' ? within(row.card).getByRole('textbox', { name: 'Help text' }) : next.toggle
}

/** Returns the width of each header cell of the outer table. */
function columnWidths(): number[] {
	return [...regionOf('Fields').querySelectorAll(':scope > table > thead th')].map(
		(cell) => cell.getBoundingClientRect().width,
	)
}

/** Checks the header cells of the outer table keep the widths they had, within half a pixel. */
function expectWidths(before: number[], what: string) {
	expect(columnWidths().map((width, at) => Math.abs(width - before[at]) < 0.5), what).toEqual(before.map(() => true))
}

/** Returns the colour a token paints a background with inside the admin root. */
function colourOf(token: string): string {
	const probe = document.createElement('span')
	probe.style.backgroundColor = `var(${token})`
	find('.godmin-page').append(probe)
	const colour = getComputedStyle(probe).backgroundColor
	probe.remove()
	return colour
}

/** Adds a rule of the app to the page for the length of the test. */
function addAppRule(css: string) {
	const style = document.createElement('style')
	style.textContent = css
	document.head.append(style)
	onTestFinished(() => style.remove())
}

/** Checks a row draws nothing while closed and the Tab key passes it from its trash to the next row. */
async function closedAndSkipped(row: FieldRow, next: FieldRow) {
	expect(row.height, `the closed ${row.label} row`).toBe(0)
	row.trash.focus()
	await userEvent.keyboard('{Tab}')
	expect(document.activeElement, `the Tab key after the ${row.label} trash`).toBe(next.toggle)
}

/** Returns how the table in a region draws its header row under the pointer, with the line above its second field. */
async function nestedHeaderLook(region: HTMLElement) {
	const table = region.querySelector('table') as HTMLTableElement
	const head = table.tHead?.rows[0] as HTMLTableRowElement
	const cells = [...head.cells]
	await userEvent.hover(cells[0])
	expect(head.matches(':hover'), 'the header row under the pointer').toBe(true)
	return {
		line: getComputedStyle(head).borderTopWidth,
		rowLine: getComputedStyle(table.tBodies[1].rows[0]).borderTopWidth,
		cells: cells.slice(0, -1).map(backgroundOf),
		actions: backgroundOf(cells[cells.length - 1]),
	}
}

/** Waits up to ten frames for an element to start its transitions and returns them, none when it starts none. */
async function transitionsOf(element: Element): Promise<CSSTransition[]> {
	for (let frame = 0; frame < 10; frame += 1) {
		const running = element.getAnimations() as CSSTransition[]
		if (running.length > 0) {
			return running
		}
		await frames(1)
	}
	return []
}

/** Returns the property, the length and the curve of each transition. */
function readings(transitions: CSSTransition[]): [string, number, string][] {
	return transitions.map((transition) => {
		const timing = (transition.effect as KeyframeEffect).getComputedTiming()
		return [transition.transitionProperty, Number(timing.duration), String(timing.easing)]
	})
}

/** Presses a row's toggle in the page and returns the transitions it starts: the fade, the growth and the turn. */
async function motionOf(row: FieldRow) {
	row.toggle.click()
	await expect.poll(() => row.part, { message: `the ${row.label} row in the page` }).not.toBeNull()
	const fade = await transitionsOf(row.shownPart)
	const growth = await transitionsOf(row.growth)
	const turn = await transitionsOf(row.chevron)
	return { fade, growth, turn, all: [...fade, ...growth, ...turn] }
}

/** Stops the given transitions at a moment of their run. */
async function freezeAt(transitions: CSSTransition[], moment: number) {
	transitions.forEach((transition) => {
		transition.pause()
		transition.currentTime = moment
	})
	await frames(1)
}

/** Ends the given transitions at once. */
function finish(transitions: CSSTransition[]) {
	transitions.forEach((transition) => transition.finish())
}

/** Presses a row's toggle in the page and reads the row at each of the next three frames: its state and its motions. */
async function watchPress(row: FieldRow) {
	row.toggle.click()
	const seen: { state: string; motions: number }[] = []
	for (let frame = 0; frame < 3; frame += 1) {
		await frames(1)
		seen.push({ state: row.state, motions: row.motions.length })
	}
	return seen
}

test.each(CLOSED_ROWS)('draws a closed row at 0px with no Tab stop when it $how', async ({ keep, rule }) => {
	addAppRule(rule)
	await draw(onPage(<Fields keep={keep} />))

	await closedAndSkipped(PHONE, TEAM)
	await press('open', [PHONE])
	expect(PHONE.height, 'the open Phone row').toBeGreaterThan(0)
	await press('closed', [PHONE])
	await closedAndSkipped(PHONE, TEAM)
})

test.each([1280, 390])('keeps the column widths at %i as rows open and close', async (width) => {
	await page.viewport(width, 844)
	await draw(onPage(<Fields />))
	const closed = columnWidths()

	await press('open', [PHONE])
	expectWidths(closed, 'one row open')
	wrapsInside(within(PHONE.card).getByText(LONG_HELP), PHONE.card)
	await press('open', [TEAM, EMAIL])
	expectWidths(closed, 'every row open')
	await press('closed', [PHONE, TEAM, EMAIL])
	expectWidths(closed, 'every row closed again')
})

test.each<Direction>(['ltr', 'rtl'])(
	'keeps the open part inside the region at both scroll ends on a phone with its gutter, %s',
	async (dir) => {
		await page.viewport(390, 844)
		await draw(onPage(<Fields open={['phone']} />, dir), [PHONE])
		const region = regionOf('Fields')

		near(region.getBoundingClientRect().left, GUTTER, 'the region starts at the gutter')
		near(region.getBoundingClientRect().width, PHONE_ROOM, 'the region fills the page')
		await insideAtBothEnds(PHONE, region)
	},
)

test.each<Direction>(['ltr', 'rtl'])(
	'keeps a nested open part inside both regions at every scroll end on a phone, %s',
	async (dir) => {
		await page.viewport(390, 844)
		await draw(onPage(<Fields open={['team', 'team.members']} />, dir), [TEAM, MEMBERS])
		const [outer, inner] = [regionOf('Fields'), regionOf('Sub fields of Team')]
		expectScrolls(outer)
		expectScrolls(inner)

		for (const ends of SCROLL_MIXES) {
			await scrollTo(outer, ends.outer)
			await scrollTo(inner, ends.inner)
			const at = `with Fields at its ${endName(ends.outer)} and Sub fields of Team at its ${endName(ends.inner)}`
			expectInside(TEAM.card, outer, `the Team card in Fields ${at}`)
			expectInside(MEMBERS.card, outer, `the Members card in Fields ${at}`)
			expectInside(MEMBERS.card, inner, `the Members card in Sub fields of Team ${at}`)
		}
	},
)

test('keeps the open part inside the region at both scroll ends in a record page column', async () => {
	await draw(onRecord(<Fields open={['phone']} />), [PHONE])

	await insideAtBothEnds(PHONE, regionOf('Fields'))
})

test.each([
	{ where: 'on a page at 1280', width: 1280, frame: onPage, padding: '24px' },
	{ where: 'on a page at 390', width: 390, frame: onPage, padding: '16px' },
	{ where: 'in a record page column at 1280, a region under 640px', width: 1280, frame: onRecord, padding: '16px' },
])('pads the open part $padding $where', async ({ width, frame, padding }) => {
	await page.viewport(width, 844)
	await draw(frame(<Fields open={['phone']} />), [PHONE])

	expect(PHONE.padding).toEqual([padding, padding, padding, padding])
})

test('draws no line between a row and its open part, and keeps the line above the next row', async () => {
	await draw(onPage(<Fields open={['phone']} />), [PHONE])

	expect(getComputedStyle(PHONE.shownPart).borderTopWidth).toBe('0px')
	expect(getComputedStyle(TEAM.toggle.closest('tr') as Element).borderTopWidth).toBe('1px')
})

/** Puts the focus on the first field of a card. */
function focusField(card: HTMLElement): void {
	within(card).getByRole('textbox').focus()
}

test.each([
	{ how: 'under the pointer', hold: (card: HTMLElement) => userEvent.hover(card) },
	{ how: 'while its field holds the focus', hold: focusField },
])('leaves the open part untinted $how', async ({ hold }) => {
	await draw(onPage(<Fields open={['phone']} />), [PHONE])

	await hold(PHONE.card)

	expect(backgroundOf(PHONE.shownPart.cells[0])).toBe(TRANSPARENT)
})

/** The ways a reader presses a toggle: the Enter key, the Space key, or a click. */
const PRESSES: { how: string; press: (toggle: HTMLElement) => Promise<void> }[] = [
	{ how: 'Enter', press: () => userEvent.keyboard('{Enter}') },
	{ how: 'Space', press: () => userEvent.keyboard(' ') },
	{ how: 'a click', press: (toggle) => userEvent.click(toggle) },
]

test.each(PRESSES)(
	'keeps the focus on the toggle as its row opens and closes by $how, the chevron turned while open',
	async ({ press: by }) => {
		await draw(onPage(<Fields />))
		PHONE.toggle.focus()

		await by(PHONE.toggle)
		await restAt('open', [PHONE])
		expect(document.activeElement, 'after the open').toBe(PHONE.toggle)
		expect(getComputedStyle(PHONE.chevron).rotate, 'the open chevron').toBe('180deg')

		await by(PHONE.toggle)
		await restAt('closed', [PHONE])
		expect(document.activeElement, 'after the close').toBe(PHONE.toggle)
		await expect.poll(() => getComputedStyle(PHONE.chevron).rotate, { message: 'the closed chevron' }).toBe('none')
	},
)

test('centres the label that opens a row down the box its cell holds it in', async () => {
	await draw(onPage(<Fields />))
	const box = PHONE.toggle.closest('.godmin-table__cell') as HTMLElement

	near(middleDown(PHONE.toggle.getBoundingClientRect()), middleDown(box.getBoundingClientRect()), 'the middle')
})

test.each(KEEPS)(
	'puts the focus on the toggle when the open part closes from a button inside it, when it $how',
	async ({ keep }) => {
		await draw(onPage(<Fields keep={keep} open={['phone']} />), [PHONE])
		PHONE.close.focus()

		await userEvent.keyboard('{Enter}')
		await restAt('closed', [PHONE])

		expect(document.activeElement).toBe(PHONE.toggle)
		expect(PHONE.toggle).toHaveAttribute('aria-expanded', 'false')
	},
)

test('keeps a closed row for find in page as a box with its contents skipped, and opens it from a link', async () => {
	await draw(onPage(<Fields keep="findable" />))
	onTestFinished(() => history.replaceState(null, '', location.pathname + location.search))

	expect(PHONE.shownPart.checkVisibility(), 'the closed row drawn as a box').toBe(true)
	expect(getComputedStyle(PHONE.shownPart).contentVisibility, 'the contents of the closed row').toBe('hidden')
	location.hash = '#help-phone'
	await restAt('open', [PHONE])

	expect(PHONE.toggle).toHaveAttribute('aria-expanded', 'true')
})

test('draws a select popup and a confirm dialog of an open part above its card, then puts the focus back', async () => {
	await page.viewport(390, 844)
	await draw(onPage(<Fields open={['phone']} />), [PHONE])
	await scrollTo(regionOf('Fields'), true)
	const card = PHONE.card
	const select = within(card).getByRole('combobox', { name: 'Shown as' })
	const remove = within(card).getByRole('button', { name: 'Delete field' })

	await userEvent.click(select)
	await drawnAbove(await screen.findByRole('listbox'), card, 'the select popup')
	await userEvent.keyboard('{Escape}')
	await expect.poll(() => document.activeElement, { message: 'the focus after the select closes' }).toBe(select)

	await userEvent.click(remove)
	await drawnAbove(await screen.findByRole('alertdialog'), card, 'the confirm dialog')
	await userEvent.keyboard('{Escape}')
	await expect.poll(() => document.activeElement, { message: 'the focus after the dialog closes' }).toBe(remove)
})

test('draws thirty rows with five open, the Tab key passing every closed one', async ({ annotate }) => {
	const rows = THIRTY.map((field) => new FieldRow(field.label))
	const opened = THIRTY.filter((_, at) => opensOfThirty(at))
	const start = performance.now()
	await draw(
		onPage(<Fields keep="findable" fields={THIRTY} open={opened.map((field) => field.key)} />),
		rows.filter((_, at) => opensOfThirty(at)),
	)
	await annotate(`thirty rows with five open drew in ${Math.round(performance.now() - start)}ms`, 'timing')

	for (const [at, row] of rows.slice(0, -1).entries()) {
		row.trash.focus()
		await userEvent.keyboard('{Tab}')
		expect(document.activeElement, `the Tab key after the ${row.label} trash`).toBe(afterTrash(row, rows[at + 1]))
	}
})

test.each([
	{ width: 1280, pinned: () => TRANSPARENT },
	{ width: 390, pinned: () => colourOf('--wpds-color-background-surface-neutral-strong') },
])('draws the header rows of tables two deep with no line and no tint at $width', async ({ width, pinned }) => {
	await page.viewport(width, 844)
	await draw(onPage(<Fields open={['team', 'team.members']} />), [TEAM, MEMBERS])

	for (const name of ['Sub fields of Team', 'Sub fields of Members']) {
		expect(await nestedHeaderLook(regionOf(name)), name).toEqual({
			line: '0px',
			rowLine: '1px',
			cells: [TRANSPARENT, TRANSPARENT, TRANSPARENT],
			actions: pinned(),
		})
	}
})

test.each([
	{
		parent: 'a WPDS column Stack on a page',
		frame: (fields: ReactNode) => onPage(<Stack direction="column">{fields}</Stack>),
		room: () => ROOM,
	},
	{ parent: 'a record page column', frame: onRecord, room: () => columnsOf().main.width },
])('keeps the width of a region whose rows open in $parent', async ({ frame, room }) => {
	await draw(frame(<Fields keep="findable" />))
	const width = () => regionOf('Fields').getBoundingClientRect().width

	near(width(), room(), 'every row closed')
	await press('open', [PHONE])
	near(width(), room(), 'a row open')
})

test.each([1280, 390])('aligns the open part to the start edge in a right to left page at %i', async (width) => {
	await page.viewport(width, 844)
	await draw(onPage(<Fields open={['phone']} />, 'rtl'), [PHONE])
	const help = within(PHONE.card).getByText(SHORT_HELP)
	const words = document.createRange()
	words.selectNodeContents(help)
	const line = words.getBoundingClientRect()
	const box = help.getBoundingClientRect()

	near(line.right, box.right, 'the line ends at the start edge')
	expect(line.left - box.left, 'the room at the end edge').toBeGreaterThan(1)
})

test.each(KEEPS)('grows and fades a row over 150ms and closes it after the fade, when it $how', async ({ keep }) => {
	await draw(onPage(<Fields keep={keep} />))

	const opening = await motionOf(PHONE)
	expect(readings(opening.fade), 'the fade').toEqual([['opacity', MOTION_TIME, 'ease-out']])
	expect(readings(opening.growth), 'the growth').toEqual([['grid-template-rows', MOTION_TIME, 'ease-out']])
	expect(readings(opening.turn), 'the chevron').toEqual([['rotate', MOTION_TIME, 'ease-out']])
	finish(opening.all)
	await restAt('open', [PHONE])

	const closing = await motionOf(PHONE)
	await freezeAt(closing.all, MIDWAY)
	await frames(2)
	expect(PHONE.shownPart, 'the row while it fades').toHaveAttribute('data-ending-style')
	expect(PHONE.height, 'the row while it fades').toBeGreaterThan(0)
	finish(closing.all)
	await restAt('closed', [PHONE])
})

test.each<Direction>(['ltr', 'rtl'])(
	'keeps the visible card at the foot of its row and inside the region while the row moves on a phone, %s',
	async (dir) => {
		await page.viewport(390, 844)
		await draw(onPage(<Fields />, dir))
		const region = regionOf('Fields')
		await scrollTo(region, true)
		expect(region.scrollLeft, 'the region at its scroll end').not.toBe(0)

		for (const rest of ['open', 'closed'] as const) {
			const motion = await motionOf(PHONE)
			expect(motion.all, 'the fade, the growth and the turn').toHaveLength(3)
			await freezeAt(motion.all, MIDWAY)
			expect(PHONE.band, `the room under the card midway to ${rest}`).toBeLessThanOrEqual(CARD_FOOT + 0.5)
			expectInside(PHONE.card, region, `the card midway to ${rest}`)
			finish(motion.all)
			await restAt(rest, [PHONE])
		}
	},
)

test('moves only the row that opens or closes, never the open rows of a table nested in it', async () => {
	await draw(onPage(<Fields open={['team', 'team.members']} />), [TEAM, MEMBERS])

	for (const rest of ['closed', 'open'] as const) {
		const motion = await motionOf(TEAM)
		expect(MEMBERS.growth.getAnimations(), `the nested Members growth as Team moves to ${rest}`).toEqual([])
		finish(motion.all)
		await restAt(rest, [TEAM])
	}
})

test.each(KEEPS)('opens and closes a row at once under reduced motion when it $how', async ({ keep }) => {
	await commands.reduceMotion(true)
	await draw(onPage(<Fields keep={keep} />))

	const opening = await watchPress(PHONE)
	const closing = await watchPress(PHONE)

	expect(opening.at(-1)?.state, 'open by the third frame').toBe('open')
	expect(closing.at(-1)?.state, 'closed by the third frame').toBe('closed')
	expect([...opening, ...closing].map(({ motions }) => motions), 'no motion in any frame').toEqual([0, 0, 0, 0, 0, 0])
})
