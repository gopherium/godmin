// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { EDGE_BREAKPOINT } from '../src/breakpoints.js'
import { blockOf, ruleOf, unlayered } from './css-rules.js'
import { base, dataviews } from './styles.js'

/** The gate of every frozen column rule: the table with its checkbox column in a wide list region showing its title. */
const frozenGate = '.godmin-page__list--wide:has(td .dataviews-title-field) .dataviews-view-table.has-bulk-actions'

/** The query of the block that freezes the columns of a wide list, at any width past the edge. */
const frozenQuery = `@media (width > ${EDGE_BREAKPOINT}px)`

/** The two frozen cells of a row, the checkbox cell and the title cell after it. */
const frozenCells = ':is(.dataviews-view-table__checkbox-column, .dataviews-view-table__checkbox-column + *)'

/** The selector DataViews sizes every column but the first data column with. */
const dataviewsColumns =
	'.dataviews-view-table col[class^=dataviews-view-table__col-]:not(.dataviews-view-table__col-first-data)' +
	':not(.dataviews-view-table__col-expand)'

/**
 * Returns the declarations of a rule of the frozen columns block, given what its selector adds to the gate.
 * @param rest - The selector after the gate, such as ` .dataviews-view-table__checkbox-column`.
 * @returns The text between the rule's braces.
 */
function frozen(rest: string): string {
	return ruleOf(`${frozenGate}${rest}`, blockOf(frozenQuery))
}

/**
 * Returns the selectors of every rule in a block, each selector list split at the commas outside brackets.
 * @param block - The block text.
 * @returns The selectors in source order.
 */
function selectorsIn(block: string): string[] {
	const preludes = [...block.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{/g)].map((found) => found[1])
	return preludes.flatMap((prelude) => prelude.split(/,(?![^(]*\))/).map((selector) => selector.trim()))
}

/**
 * Returns the specificity of a selector whose functional pseudo-classes each hold one selector, as one number.
 * @param selector - The selector.
 * @returns The ids, the classes and the types, weighted so a higher number wins.
 */
function weightOf(selector: string): number {
	const flat = selector.replace(/:(?:not|is|has)\(([^()]*)\)/g, ' $1')
	const count = (pattern: RegExp) => flat.match(pattern)?.length ?? 0
	const classes = count(/\.[\w-]+|\[[^\]]+\]|(?<!:):[\w-]+/g)
	const types = count(/(?:^|[\s>+~])[a-z][\w-]*/g) + count(/::[\w-]+/g)
	return count(/#[\w-]+/g) * 10_000 + classes * 100 + types
}

/**
 * Returns the properties a block declares, in source order.
 * @param block - The block text.
 * @returns The property names.
 */
function propertiesIn(block: string): string[] {
	return [...block.matchAll(/([\w-]+)\s*:\s*[^;{}]+;/g)].map((found) => found[1])
}

test(
	'freezes the columns of a wide list only wider than EDGE_BREAKPOINT, in a width > 782px block outside every layer',
	() => {
		const outside = base.replace(blockOf(frozenQuery), '')

		expect(frozenQuery).toBe('@media (width > 782px)')
		expect(unlayered(frozenQuery)).toBe(true)
		expect(outside).not.toMatch(/godmin-page__list--wide/)
	},
)

test('freezes the checkbox column at the start edge on the list background', () => {
	const checkbox = frozen(' .dataviews-view-table__checkbox-column')

	expect(checkbox).toMatch(/position:\s*sticky/)
	expect(checkbox).toMatch(/inset-inline-start:\s*0;/)
	expect(checkbox).toMatch(
		/background-color:\s*var\(--wp-dataviews-color-background, var\(--wpds-color-background-surface-neutral-strong\)\)/,
	)
})

test('freezes the title after the checkbox column, and only in a wide table with checkboxes whose title shows', () => {
	const title = frozen(' .dataviews-view-table__checkbox-column + *')
	const ungated = selectorsIn(blockOf(frozenQuery)).filter(
		(selector) => selector !== frozenGate && !selector.startsWith(`${frozenGate} `),
	)

	expect(title).toMatch(/position:\s*sticky/)
	expect(title).toMatch(/inset-inline-start:\s*var\(--godmin-list-frozen-start\)/)
	expect(title).toMatch(
		/background-color:\s*var\(--wp-dataviews-color-background, var\(--wpds-color-background-surface-neutral-strong\)\)/,
	)
	expect(ungated).toEqual([])
})

test('keeps a frozen title at least 280px wide, with the 2xl padding at its end and a 1px weak line there', () => {
	const title = frozen(' .dataviews-view-table__checkbox-column + *')
	const line = frozen(' .dataviews-view-table__checkbox-column + *::after')

	expect(title).toMatch(/min-inline-size:\s*280px/)
	expect(title).toMatch(/padding-inline-end:\s*var\(--wpds-dimension-padding-2xl\)/)
	expect(line).toMatch(/content:\s*''/)
	expect(line).toMatch(/position:\s*absolute/)
	expect(line).toMatch(/inset-block:\s*0/)
	expect(line).toMatch(/inset-inline-end:\s*0/)
	expect(line).toMatch(/inline-size:\s*var\(--wpds-border-width-xs\)/)
	expect(line).toMatch(/background-color:\s*var\(--wpds-color-stroke-surface-neutral-weak\)/)
})

test('sizes the checkbox column to where the title starts, more specific than the DataViews column width rule', () => {
	const column = ' col.dataviews-view-table__col-checkbox.dataviews-view-table__col-checkbox'

	expect(ruleOf(frozenGate, blockOf(frozenQuery))).toMatch(
		/--godmin-list-frozen-start:\s*calc\(var\(--wpds-dimension-padding-2xl\) \+ var\(--wpds-dimension-size-sm\)\)/,
	)
	expect(frozen(column)).toMatch(/inline-size:\s*var\(--godmin-list-frozen-start\)/)
	expect(ruleOf(dataviewsColumns, dataviews)).toMatch(/width:\s*1%/)
	expect(weightOf(`${frozenGate}${column}`)).toBeGreaterThan(weightOf(dataviewsColumns))
})

test('repeats the selected row tint on both frozen cells', () => {
	expect(frozen(` .dataviews-view-table__row.is-selected > ${frozenCells}`)).toMatch(
		/background-color:\s*var\(--wpds-color-background-interactive-brand-weak-active\)/,
	)
})

test('lifts the frozen header cells over their row and leaves the frozen body cells under the header row', () => {
	expect(frozen(` thead .dataviews-view-table__row > ${frozenCells}`)).toMatch(/z-index:\s*2/)
	expect(propertiesIn(blockOf(frozenQuery)).filter((property) => property === 'z-index')).toHaveLength(1)
})

test('writes the frozen columns with logical properties only', () => {
	const physical = /^(?:left|right|top|bottom)$|(?:^|-)(?:left|right|top|bottom|width|height)(?:-|$)/
	const properties = propertiesIn(blockOf(frozenQuery))

	expect(properties.length).toBeGreaterThan(0)
	expect(properties.filter((property) => physical.test(property))).toEqual([])
})
