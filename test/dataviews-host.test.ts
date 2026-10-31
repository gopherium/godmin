// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { EDGE_BREAKPOINT } from '../src/breakpoints.js'
import { blockOf } from './css-rules.js'
import { base, dataviews, installedFile } from './styles.js'

/** The installed DataViews module that draws the table, its rows, its checkbox cells and its actions. */
const tableModule = installedFile('@wordpress/dataviews/build-module/components/dataviews-layouts/table/index.mjs')

/** The installed DataViews module that draws the title, the media and the description of a row. */
const primaryModule = installedFile(
	'@wordpress/dataviews/build-module/components/dataviews-layouts/table/column-primary.mjs',
)

/**
 * Returns the declarations of the first rule a selector list opens in a stylesheet.
 * @param css - The stylesheet source to search.
 * @param selector - The exact selector list the rule starts with.
 * @returns The text between the rule's braces.
 */
function ruleIn(css: string, selector: string): string {
	const start = css.indexOf(`${selector} {`)

	expect(start, `the stylesheet has no ${selector} rule`).toBeGreaterThan(-1)

	return css.slice(start + selector.length + 2, css.indexOf('}', start))
}

test('sets the background variable DataViews paints its list with', () => {
	expect(ruleIn(dataviews, '.dataviews-wrapper,\n.dataviews-picker-wrapper')).toMatch(
		/background-color:\s*var\(--wp-dataviews-color-background,/,
	)
	expect(ruleIn(base, '.godmin-layout__canvas')).toMatch(/--wp-dataviews-color-background:/)
})

test('bleeds a list by the 24px gutter DataViews pads its toolbar, table and footer with', () => {
	const gutter = /var\(--wpds-dimension-padding-2xl, 24px\)/

	expect(ruleIn(dataviews, '.dataviews__view-actions,\n.dataviews-filters__container')).toMatch(gutter)
	expect(ruleIn(dataviews, '.dataviews-footer')).toMatch(gutter)
	expect(ruleIn(dataviews, '.dataviews-view-table tr td:first-child,\n.dataviews-view-table tr th:first-child')).toMatch(
		gutter,
	)
	expect(ruleIn(base, '.godmin-layout__canvas')).toMatch(/--godmin-canvas-gutter:\s*24px/)
})

test('leaves the title field link to DataViews, which draws it with no underline', () => {
	expect(ruleIn(dataviews, '.dataviews-title-field a')).toMatch(/text-decoration:\s*none/)
})

test('leaves the loading look of a list to DataViews', () => {
	expect(base).not.toMatch(/\.is-refreshing|\.dataviews-loading|\.dataviews-no-results/)
})

test('names only DataViews classes the installed table modules draw, the title class only inside a cell', () => {
	const frozen = blockOf(`@media (width > ${EDGE_BREAKPOINT}px)`)
	const named = new Set([...frozen.matchAll(/\.((?:dataviews-|has-|is-)[\w-]+)/g)].map((found) => found[1]))
	const drawn = (name: string) => new RegExp(`["\\s]${name}["\\s]`).test(`${tableModule}${primaryModule}`)
	const row = tableModule.slice(tableModule.indexOf('function TableRow('), tableModule.indexOf('function ViewTable('))
	const checkboxCell = row.indexOf('jsx("td", { className: "dataviews-view-table__checkbox-column"')
	const titleCell = row.search(/jsx\("td", \{ children: \/\* @__PURE__ \*\/ jsx\(\s*ColumnPrimary/)

	expect(named).toContain('dataviews-title-field')
	expect([...named].filter((name) => !drawn(name))).toEqual([])
	expect(primaryModule).toMatch(/className: "dataviews-view-table__cell-content-wrapper dataviews-title-field"/)
	expect(tableModule).not.toMatch(/dataviews-title-field/)
	expect(tableModule.match(/jsx\(\s*ColumnPrimary/g)).toHaveLength(1)
	expect(checkboxCell).toBeGreaterThan(-1)
	expect(titleCell).toBeGreaterThan(checkboxCell)
	expect(row.slice(checkboxCell + 1, titleCell)).not.toMatch(/jsx\("td"/)
})

test('leaves the actions column to DataViews, which pins it at the end and draws its own 1px line', () => {
	const cells = (state: string) =>
		`.dataviews-view-table td.dataviews-view-table__actions-column--${state},\n` +
		`.dataviews-view-table th.dataviews-view-table__actions-column--${state}`
	const pinned = ruleIn(dataviews, cells('sticky'))
	const line = ruleIn(dataviews, cells('stuck').replaceAll(',', '::after,') + '::after')

	expect(base).not.toMatch(/__actions-column/)
	expect(pinned).toMatch(/position:\s*sticky/)
	expect(pinned).toMatch(/right:\s*0/)
	expect(line).toMatch(/width:\s*1px/)
	expect(line).toMatch(/background-color:\s*var\(--wpds-color-stroke-surface-neutral-weak,/)
})

test('lets DataViews take its accents from the WordPress admin colour the root provider sets', () => {
	expect(dataviews).toMatch(/var\(--wp-admin-theme-color,/)
})

test('draws the table header like the DataViews header, at the extra small size in capitals', () => {
	const header = ruleIn(dataviews, '.dataviews-view-table thead th')
	const own = ruleIn(base, '.godmin-table thead th')

	expect(header).toMatch(/font-size:\s*11px/)
	expect(own).toMatch(/font-size:\s*var\(--wpds-typography-font-size-xs\)/)
	expect(header).toMatch(/text-transform:\s*uppercase/)
	expect(own).toMatch(/text-transform:\s*uppercase/)
	expect(header).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis,/)
	expect(own).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\)/)
	expect(header).toMatch(/padding-top:\s*var\(--wpds-dimension-padding-sm,/)
	expect(own).toMatch(/padding-block:\s*var\(--wpds-dimension-padding-sm\)/)
})

test('pads and divides the table rows like the DataViews rows', () => {
	expect(ruleIn(dataviews, '.dataviews-view-table td,\n.dataviews-view-table th')).toMatch(
		/padding:\s*var\(--wpds-dimension-padding-md,/,
	)
	expect(ruleIn(base, '.godmin-table th,\n\t.godmin-table td')).toMatch(/padding:\s*var\(--wpds-dimension-padding-md\)/)
	expect(ruleIn(dataviews, '.dataviews-view-table tr')).toMatch(
		/border-top:\s*1px solid var\(--wpds-color-stroke-surface-neutral-weak,/,
	)
	expect(ruleIn(base, '.godmin-table tbody tr')).toMatch(
		/border-block-start:\s*var\(--wpds-border-width-xs\) solid var\(--wpds-color-stroke-surface-neutral-weak\)/,
	)
	expect(ruleIn(dataviews, '.dataviews-view-table tbody .dataviews-view-table__cell-content-wrapper')).toMatch(
		/min-height:\s*var\(--wpds-dimension-size-md,/,
	)
	expect(ruleIn(base, '.godmin-table tbody td')).toMatch(/height:\s*var\(--wpds-dimension-size-md\)/)
})
