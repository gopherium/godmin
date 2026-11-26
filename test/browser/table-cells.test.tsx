// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react'
import { chevronDown } from '@wordpress/icons'
import { Badge, Button, Collapsible, Icon, Stack } from '@wordpress/ui'
import type { ReactNode } from 'react'
import { expect, test } from 'vitest'

import { AdminRoot } from '../../src/admin-root.js'
import { RowControls } from '../../src/rows.js'
import { find, middleDown } from '../../stories/measure.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** The height of the band a body cell centres its first line down, a medium control, in pixels. */
const BAND = 32

/** How far apart two middles may sit, in pixels. */
const SLACK = 1

/** How many parts a row measures: one in each of its six cells before the actions, and the three row controls. */
const PARTS = 9

/** The words of the controls of a row. */
const WORDS = { moveUp: 'Move Phone up', moveDown: 'Move Phone down', remove: 'Remove Phone' }

/** The rows of the table: one line wrapped as the docs ask, tall and wrapped, and tall with every cell left bare. */
type Row = 'short' | 'tall' | 'bare'

/** Wraps what a body cell holds in the box that centres it, unless the row leaves its cells bare. */
function Held({ row, children }: { row: Row; children: ReactNode }) {
	return row === 'bare' ? children : <div className="godmin-table__cell">{children}</div>
}

/** Renders one row of a fields table, its label with two lines under it unless the row is short. */
function FieldRow({ row }: { row: Row }) {
	return (
		<Collapsible.Root render={<tbody />}>
			<tr data-row={row}>
				<td className="godmin-table__title">
					<Held row={row}>
						<Collapsible.Trigger className="godmin-table__toggle" data-line="">
							<Icon icon={chevronDown} className="godmin-table__toggle-icon" />
							Phone
						</Collapsible.Trigger>
					</Held>
					{row === 'short' ? null : (
						<>
							<div>Shown on the edit screen</div>
							<div>Required</div>
						</>
					)}
				</td>
				<td>
					<Held row={row}>
						<Badge intent="stable" data-line="">
							Text
						</Badge>
					</Held>
				</td>
				<td>
					<Held row={row}>
						<code data-line="">billing_phone</code>
					</Held>
				</td>
				<td>
					<Held row={row}>
						<a href="#help" data-line="">
							Help
						</a>{' '}
						on this field
					</Held>
				</td>
				<th scope="row">
					<Held row={row}>
						<span data-line="">Account</span>
					</Held>
				</th>
				<td>
					<Held row={row}>
						<Stack direction="row" gap="xs" data-line="" data-block="">
							<Button variant="outline" size="compact">
								Duplicate
							</Button>
						</Stack>
					</Held>
				</td>
				<td className="godmin-table__actions">
					<Held row={row}>
						<RowControls at={0} count={2} labels={WORDS} onMove={() => {}} onRemove={() => {}} />
					</Held>
				</td>
			</tr>
		</Collapsible.Root>
	)
}

/** Renders an open row holding a table of its own, whose header has a cell of two lines. */
function OpenRow() {
	return (
		<tbody>
			<tr className="godmin-table__detail">
				<td colSpan={7}>
					<table className="godmin-table">
						<thead>
							<tr data-head-row="nested">
								<th scope="col">
									<span data-head="nested">Kind</span>
								</th>
								<th scope="col">
									API
									<br />
									name
								</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td>
									<div className="godmin-table__cell">Text</div>
								</td>
								<td>
									<div className="godmin-table__cell">
										<code>role</code>
									</div>
								</td>
							</tr>
						</tbody>
					</table>
				</td>
			</tr>
		</tbody>
	)
}

/** Renders a fields table with a header cell of two lines, the three rows and an open row holding a table. */
async function draw() {
	render(
		<AdminRoot writeTimeout={PATIENT_LIMIT}>
			<div style={{ inlineSize: 1100 }}>
				<table className="godmin-table">
					<thead>
						<tr data-head-row="outer">
							<th scope="col">Label</th>
							<th scope="col">
								<span data-head="outer">Kind</span>
							</th>
							<th scope="col">
								API
								<br />
								name
							</th>
							<th scope="col">Help</th>
							<th scope="col">Owner</th>
							<th scope="col">More</th>
							<th scope="col" className="godmin-table__actions">
								Actions
							</th>
						</tr>
					</thead>
					<FieldRow row="short" />
					<FieldRow row="tall" />
					<FieldRow row="bare" />
					<OpenRow />
				</table>
			</div>
		</AdminRoot>,
	)
	await document.fonts.ready
}

/** Returns the top of the content box of the cells of a row, inside their padding. */
function contentTopOf(row: Row): number {
	const cell = find(`tr[data-row="${row}"] > td`)
	return cell.getBoundingClientRect().top + parseFloat(getComputedStyle(cell).paddingTop)
}

/** Returns the middle down of the first line each cell of a row shows, its first control in the actions cell. */
function middlesOf(row: Row): number[] {
	const parts = find(`tr[data-row="${row}"]`).querySelectorAll('[data-line], .godmin-table__actions button')
	const middles = [...parts].map((part) => middleDown(part.getBoundingClientRect()))

	expect(middles, `the ${row} row shows a part in every cell`).toHaveLength(PARTS)

	return middles
}

/** Checks every middle sits within the slack of one place down. */
function expectLevel(middles: number[], at: number, what: string) {
	for (const middle of middles) {
		expect(Math.abs(middle - at), `${what}: a cell at ${middle} and not at ${at}`).toBeLessThanOrEqual(SLACK)
	}
}

test('centres the first line of every cell of a one line row down the middle of the row', async () => {
	await draw()

	expectLevel(middlesOf('short'), middleDown(find('tr[data-row="short"]').getBoundingClientRect()), 'the short row')
})

test('keeps the first line of every cell of a tall row level, in a band a control tall at its top', async () => {
	await draw()
	const row = find('tr[data-row="tall"]').getBoundingClientRect()

	expect(row.height, 'the tall row is taller than a band and its padding').toBeGreaterThan(BAND * 2)
	expectLevel(middlesOf('tall'), contentTopOf('tall') + BAND / 2, 'the tall row')
})

test('sets a body cell left without the box at the top of its row', async () => {
	await draw()
	const block = find('tr[data-row="bare"] [data-block]').getBoundingClientRect()

	expect(Math.abs(block.top - contentTopOf('bare'))).toBeLessThanOrEqual(SLACK)
})

test.each([
	{ table: 'outer', what: 'a table' },
	{ table: 'nested', what: 'a table nested in an open row' },
])('keeps the header cells of $what in the middle of the header row', async ({ table }) => {
	await draw()
	const head = find(`[data-head-row="${table}"]`).getBoundingClientRect()

	expect(head.height, 'a header cell holds two lines').toBeGreaterThan(BAND)
	expectLevel([middleDown(find(`[data-head="${table}"]`).getBoundingClientRect())], middleDown(head), table)
})
