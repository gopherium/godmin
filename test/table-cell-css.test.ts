// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { atRuleBodies, blocksOf, ruleOf } from './css-rules.js'
import { base } from './styles.js'

/** The rule every cell of a table shares, and the rule of the body cells of that table alone. */
const CELLS = '.godmin-table th,\n\t.godmin-table td'
const BODY_CELLS = '.godmin-table > tbody > tr > th,\n\t.godmin-table > tbody > tr > td'

/** A rule that sets how a cell of a table or what it holds lines up down its row, with its selector caught. */
const ALIGNING = /([^{}]*godmin-table[^{}]*)\{[^}]*\b(?:vertical-align|align-content)\s*:/g

/** The box inside a body cell that holds what the cell shows. */
const BOX = '.godmin-table__cell'

/** A row of a table in a region under 640px wide, its parts, its first cell and the box of that cell. */
const ITEM = '.godmin-table > tbody > tr:not(.godmin-table__detail)'
const FIRST = `${ITEM} > :first-child`
const FIRST_BOX = `${FIRST} > ${BOX}`

/** Returns the one block of rules that draws the rows of a narrow region as a list. */
function listBlock(): string {
	const found = blocksOf('@container godmin-table (max-width: 639px)').filter((body) => body.includes(`${ITEM} {`))

	expect(found, 'one block draws the rows of a narrow region as a list').toHaveLength(1)

	return found[0]
}

test('keeps the header cells of a table in the middle of their row', () => {
	expect(ruleOf(CELLS)).toMatch(/vertical-align:\s*middle/)
	expect(ruleOf('.godmin-table thead th')).not.toMatch(/vertical-align/)
})

test('sets the body cells of a table at the top of their row, as both WordPress tables do', () => {
	expect(ruleOf(BODY_CELLS)).toMatch(/vertical-align:\s*top/)
})

test('centres what a body cell holds down a box at least a medium control tall, as the DataViews cell does', () => {
	const box = ruleOf(BOX)

	expect(box).toMatch(/min-block-size:\s*var\(--wpds-dimension-size-md\)/)
	expect(box).toMatch(/align-content:\s*center/)
})

test('lines up the cells of a table the same at every width but the first line of a list', () => {
	const bodies = atRuleBodies(['media', 'container'])
	const aligning = bodies.flatMap((body) => [...body.matchAll(ALIGNING)].map((found) => found[1].trim()))

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	expect(aligning).toEqual([FIRST_BOX])
})

test('turns every table region into a size container named for the table, so only its rows measure its width', () => {
	expect(base).toMatch(/\n\t\.godmin-table-scroll \{\s*container:\s*godmin-table \/ inline-size;\s*\}/)
	expect(base, 'a query of a table names its container').not.toMatch(/@container \(/)
})

test('draws a row of a narrow region as a DataViews list item: padded, its parts wrapping with the list gaps', () => {
	const item = ruleOf(ITEM, listBlock())

	expect(item).toMatch(/display:\s*flex/)
	expect(item).toMatch(/flex-wrap:\s*wrap/)
	expect(item).toMatch(/column-gap:\s*var\(--wpds-dimension-gap-md\)/)
	expect(item).not.toMatch(/row-gap/)
	expect(item).toMatch(/padding:\s*var\(--wpds-dimension-padding-lg\) var\(--wpds-dimension-padding-2xl\)/)
	expect(ruleOf(`${ITEM} > *`, listBlock())).toMatch(/margin-block-start:\s*var\(--wpds-dimension-gap-xs\)/)
})

test('tints a list item under the pointer or holding the focus and darkens its values, as the DataViews list', () => {
	const held = `${ITEM}:is(:hover, :has(:focus-visible))`
	const tint = /background:\s*var\(--wpds-color-background-interactive-neutral-weak-active\)/

	expect(ruleOf(held, listBlock())).toMatch(tint)
	expect(ruleOf(`${held} > *`, listBlock())).toMatch(/color:\s*var\(--wpds-color-foreground-interactive-neutral\)/)
})

test('sets the values of a list item in the small weak text of the DataViews list, its first cell in body text', () => {
	const values = ruleOf(`${ITEM} > *`, listBlock())
	const first = ruleOf(FIRST, listBlock())

	expect(values).toMatch(/font-size:\s*var\(--wpds-typography-font-size-sm\)/)
	expect(values).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral-weak\)/)
	expect(values).toMatch(/text-align:\s*start/)
	expect(values).toMatch(/overflow-wrap:\s*anywhere/)
	expect(first).toMatch(/font-size:\s*var\(--wpds-typography-font-size-md\)/)
	expect(first).toMatch(/line-height:\s*var\(--wpds-typography-line-height-md\)/)
	expect(first).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral\)/)
})

test('puts the first cell and the actions of a list item on its first line, and every other cell after them', () => {
	const block = listBlock()

	expect(ruleOf(FIRST, block)).toMatch(/order:\s*0/)
	expect(ruleOf(`${ITEM} > .godmin-table__actions`, block)).toMatch(/order:\s*1/)
	expect(ruleOf(`${ITEM}::after`, block)).toMatch(/flex-basis:\s*100%/)
	expect(ruleOf(`${ITEM} > *`, block)).toMatch(/order:\s*2/)
})

test('hides the column headers of a list from sight alone, so screen readers still name each value', () => {
	const head = ruleOf('.godmin-table > thead', listBlock())

	expect(head).toMatch(/clip-path:\s*inset\(50%\)/)
	expect(head).not.toMatch(/display:\s*none/)
})
