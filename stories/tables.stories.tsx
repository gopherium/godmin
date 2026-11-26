// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { chevronDown } from '@wordpress/icons'
import { Badge, Button, Collapsible, Icon, InputControl, Stack, VisuallyHidden } from '@wordpress/ui'
import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { expect, waitFor, within } from 'storybook/test'

import { Page, SectionTitle } from '../src/page.js'
import { RowControls } from '../src/rows.js'
import { Admin, RecordPage, onlyAt } from './frames.js'
import { columnsOf, meets } from './measure.js'

/** One field of the sample table, with the fields its open part holds. */
interface Field {
	key: string
	label: string
	kind: string
	name: string
	help: string
	fields?: Field[]
}

/** How long a story waits for its rows to come to rest. */
const WAIT = 3_000

/** How far each level of a nested table steps in on a desktop and on a phone, the frame of the card around it. */
const INDENT = 37
const NARROW_INDENT = 29

/** The padding of an open part in a region under 640px wide. */
const NARROW_PADDING = '16px'

/** The window a story opens at, for its play and its shot. */
const DESKTOP = { viewport: { value: 'desktop', isRotated: false } }

/** The fields of the sample contact, the first one holding a table three levels deep. */
const FIELDS: Field[] = [
	{
		key: 'team',
		label: 'Team',
		kind: 'Repeater',
		name: 'team_members',
		help: 'The people who work with Maria Perez.',
		fields: [
			{ key: 'team.role', label: 'Role', kind: 'Text', name: 'role', help: 'What each person does on the team.' },
			{
				key: 'team.members',
				label: 'Members',
				kind: 'Group',
				name: 'members',
				help: 'Each person on the team and their page, such as https://example.com.',
				fields: [
					{
						key: 'team.members.links',
						label: 'Links',
						kind: 'Repeater',
						name: 'links',
						help: 'The pages of each person.',
						fields: [
							{
								key: 'team.members.links.website',
								label: 'Website',
								kind: 'URL',
								name: 'website_address',
								help: 'One page of the person.',
							},
						],
					},
				],
			},
		],
	},
	{
		key: 'phone',
		label: 'Phone',
		kind: 'Text',
		name: 'billing_contact_phone_number_for_invoices',
		help: 'The number Maria Perez answers on, such as 184467235.',
	},
	{
		key: 'email',
		label: 'Email',
		kind: 'Email',
		name: 'invoice_email_address',
		help: 'Where Maria Perez gets each invoice.',
	},
]

/** What every row of a table shares: the open rows, and how to open or close one. */
interface Rows {
	opened: ReadonlySet<string>
	onOpen: (key: string, open: boolean) => void
}

/** Puts the focus on a row's toggle when its open part is about to close while it holds the focus. */
function focusToggleFrom(part: HTMLDivElement | null, toggle: HTMLButtonElement | null): void {
	if (part?.contains(document.activeElement)) {
		toggle?.focus()
	}
}

/** Keeps the page where it is when the form of an open part is sent. */
function keepPage(event: FormEvent<HTMLFormElement>): void {
	event.preventDefault()
}

/** Returns the words of the controls of a field's row, each naming the field. */
function wordsOf(field: Field) {
	return { moveUp: `Move ${field.label} up`, moveDown: `Move ${field.label} down`, remove: `Remove ${field.label}` }
}

/** Renders the settings an open row holds, the fields it holds in a table of their own, then its close button. */
function FieldSettings({ field, rows, onClose }: { field: Field; rows: Rows; onClose: () => void }) {
	return (
		<Stack direction="column" gap="md">
			<form className="godmin-form" onSubmit={keepPage}>
				<InputControl label="Help text" defaultValue={field.help} />
			</form>
			{field.fields ? <FieldTable fields={field.fields} label={`Sub fields of ${field.label}`} rows={rows} /> : null}
			<div>
				<Button variant="outline" size="compact" onClick={onClose}>
					Close field
				</Button>
			</div>
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
			<Collapsible.Panel render={<tr />} className="godmin-table__detail" hiddenUntilFound>
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

/** Renders the fields table with its open rows kept in page state, the rows it is given open at first. */
function Fields({ open }: { open: string[] }) {
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
	return <FieldTable fields={FIELDS} label="Fields" rows={{ opened, onOpen }} />
}

/** Renders the contact fields on a page of the admin frame, the rows it is given open. */
function ContactFields({ open }: { open: string[] }) {
	return (
		<Admin>
			<Page title="Contact fields">
				<Fields open={open} />
			</Page>
		</Admin>
	)
}

/** Renders the details of the field group in the aside of a record page. */
function GroupDetails() {
	return (
		<>
			<SectionTitle>Details</SectionTitle>
			<p>Shown on every contact.</p>
		</>
	)
}

/** Returns the toggle of the row whose label reads as given. */
function toggleOf(canvasElement: HTMLElement, label: string): HTMLElement {
	return within(canvasElement).getByRole('button', { name: label })
}

/** Returns the row that opens under the row of a toggle, failing when the page holds none. */
function partOf(toggle: HTMLElement): HTMLTableRowElement {
	const part = toggle.closest('tbody')?.querySelector<HTMLTableRowElement>(':scope > tr.godmin-table__detail')
	if (part === null || part === undefined) {
		throw new Error(`the ${toggle.textContent} row has no part that opens`)
	}
	return part
}

/** Returns the card of the part that opens under the row of a toggle. */
function cardOf(toggle: HTMLElement): HTMLElement {
	return partOf(toggle).querySelector('.godmin-table__detail-body') as HTMLElement
}

/** Returns the region with a name. */
function regionOf(canvasElement: HTMLElement, name: string): HTMLElement {
	return within(canvasElement).getByRole('region', { name })
}

/** Waits until nothing on the page moves any more. */
async function settles() {
	await waitFor(() => expect(document.getAnimations()).toEqual([]), { timeout: WAIT })
}

/** Checks the toggle of each row reads open or closed, and each closed row draws nothing. */
async function rowsRead(canvasElement: HTMLElement, open: boolean, labels: string[]) {
	for (const label of labels) {
		const toggle = toggleOf(canvasElement, label)
		await expect(toggle, `the ${label} toggle`).toHaveAttribute('aria-expanded', String(open))
		const height = partOf(toggle).getBoundingClientRect().height
		await expect(height > 0, `the ${label} row draws its open part`).toBe(open)
	}
}

/** Checks a region draws its rows as a list that runs nothing past it, and a card sits inside the width it shows. */
async function insideTheList(region: HTMLElement, card: HTMLElement) {
	await expect(region.scrollWidth, 'the list scrolls nothing sideways').toBeLessThanOrEqual(region.clientWidth)
	const shown = region.getBoundingClientRect().left + region.clientLeft
	const box = card.getBoundingClientRect()
	await expect(box.left, 'the card starts inside').toBeGreaterThanOrEqual(shown - 0.5)
	await expect(box.right, 'the card ends inside').toBeLessThanOrEqual(shown + region.clientWidth + 0.5)
}

/** Checks each region of a list steps in from the region before it by the indent of one level. */
async function stepsIn(canvasElement: HTMLElement, names: string[], indent: number) {
	const lefts = names.map((name) => regionOf(canvasElement, name).getBoundingClientRect().left)
	for (const [level, left] of lefts.slice(1).entries()) {
		await meets(left - lefts[level], indent, `level ${level + 1} steps in`)
	}
}

const meta = {
	title: 'Components/Tables',
	id: 'components-tables',
	component: ContactFields,
	args: { open: [] },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof ContactFields>

export default meta

type Story = StoryObj<typeof meta>

export const ClosedRows: Story = {
	name: 'Closed rows',
	globals: DESKTOP,
	play: async ({ canvasElement }) => {
		await rowsRead(canvasElement, false, ['Phone', 'Team', 'Email'])
	},
}

export const OneRowOpen: Story = {
	name: 'One row open',
	globals: DESKTOP,
	play: async ({ canvasElement, userEvent }) => {
		const toggle = toggleOf(canvasElement, 'Phone')
		toggle.focus()
		await userEvent.keyboard('{Enter}')
		await waitFor(() => expect(toggle).toHaveAttribute('aria-expanded', 'true'))
		await settles()
		await expect(toggle, 'the focus after Enter').toHaveFocus()
		await rowsRead(canvasElement, true, ['Phone'])
		await rowsRead(canvasElement, false, ['Team', 'Email'])
	},
}

export const ManyRowsOpen: Story = {
	name: 'Many rows open, nested two deep',
	globals: DESKTOP,
	args: { open: ['team', 'team.members', 'phone'] },
	play: async ({ canvasElement }) => {
		await settles()
		await rowsRead(canvasElement, true, ['Team', 'Members', 'Phone'])
		await rowsRead(canvasElement, false, ['Email', 'Role', 'Links'])
		await stepsIn(canvasElement, ['Fields', 'Sub fields of Team', 'Sub fields of Members'], INDENT)
	},
}

export const OnARecordPage: Story = {
	name: 'On a record page',
	globals: DESKTOP,
	args: { open: ['phone'] },
	render: ({ open }) => (
		<RecordPage
			title="Contact fields"
			crumb={{ label: 'Field groups', href: '#field-groups' }}
			asideLabel="Field group details"
			aside={<GroupDetails />}
		>
			<Fields open={open} />
		</RecordPage>
	),
	play: async ({ canvasElement }) => {
		await settles()
		const region = regionOf(canvasElement, 'Fields')
		const card = cardOf(toggleOf(canvasElement, 'Phone'))
		await meets(region.getBoundingClientRect().width, columnsOf().main.width, 'the region fills the column')
		await expect(getComputedStyle(card).paddingTop, 'the padding of a narrow region').toBe(NARROW_PADDING)
		await insideTheList(region, card)
	},
}

export const OnAPhone: Story = {
	name: 'On a phone',
	...onlyAt('phone'),
	args: { open: ['phone'] },
	play: async ({ canvasElement }) => {
		await settles()
		await insideTheList(regionOf(canvasElement, 'Fields'), cardOf(toggleOf(canvasElement, 'Phone')))
	},
}

export const OnAPhoneThreeDeep: Story = {
	name: 'On a phone, nested three deep',
	...onlyAt('phone'),
	args: { open: ['team', 'team.members', 'team.members.links'] },
	play: async ({ canvasElement }) => {
		await settles()
		await rowsRead(canvasElement, true, ['Team', 'Members', 'Links'])
		const regions = ['Fields', 'Sub fields of Team', 'Sub fields of Members', 'Sub fields of Links']
		await stepsIn(canvasElement, regions, NARROW_INDENT)
	},
}
