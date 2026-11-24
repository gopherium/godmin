// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { atRuleBodies, ruleOf } from './css-rules.js'

/** The rule every cell of a table shares, and the rule of the body cells of that table alone. */
const CELLS = '.godmin-table th,\n\t.godmin-table td'
const BODY_CELLS = '.godmin-table > tbody > tr > th,\n\t.godmin-table > tbody > tr > td'

/** A rule inside an at-rule that sets how a cell of a table or what it holds lines up down its row. */
const ALIGNING = /[^{}]*godmin-table[^{}]*\{[^}]*\b(?:vertical-align|align-content)\s*:/

/** The box inside a body cell that holds what the cell shows. */
const BOX = '.godmin-table__cell'

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

test('sets the body cells at the top and centres what they hold at every width', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(ALIGNING)
	}
})
