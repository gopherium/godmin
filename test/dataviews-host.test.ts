// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

const require = createRequire(import.meta.url)
const base = readFileSync(resolve('src/base.css'), 'utf8')
const dataviews = readFileSync(require.resolve('@wordpress/dataviews/build-style/style.css'), 'utf8')

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
