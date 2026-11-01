// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { ruleOf } from './css-rules.js'

/** The selector of the rule both columns of a record page share. */
const recordColumns = '.godmin-page__main,\n\t.godmin-page__aside'

test('lays the aside beside the content and wraps it under on a narrow page', () => {
	const split = ruleOf('.godmin-page__split')

	expect(split).toMatch(/display:\s*flex/)
	expect(split).toMatch(/flex-wrap:\s*wrap/)
	expect(split).toMatch(/align-items:\s*flex-start/)
	expect(split, 'a short stacked record keeps the gap').toMatch(/align-content:\s*flex-start/)
})

test('lets the main work take what the details leave', () => {
	expect(ruleOf('.godmin-page__main')).toMatch(/flex:\s*1 1 0;/)
})

test('holds the details at the medium surface width, and a whole line once stacked', () => {
	const width = 'var(--wpds-dimension-surface-width-md) + 2 * var(--wpds-dimension-padding-xs)'

	expect(ruleOf('.godmin-page__aside')).toContain(`flex: 0 1 min(100%, max(${width}, var(--godmin-page-stacked)));`)
})

test('keeps a focus ring whole inside a scrolling column, the content still at the page edges', () => {
	const split = ruleOf('.godmin-page__split')

	expect(ruleOf(recordColumns)).toMatch(/padding-inline:\s*var\(--wpds-dimension-padding-xs\)/)
	expect(split).toMatch(
		/padding-inline:\s*calc\(var\(--godmin-canvas-gutter, 0px\) - var\(--wpds-dimension-padding-xs\)\)/,
	)
	expect(split).toMatch(/column-gap:\s*calc\(var\(--wpds-dimension-gap-xl\) - 2 \* var\(--wpds-dimension-padding-xs\)\)/)
})

test('lets the details fill the page once they move under', () => {
	expect(ruleOf('.godmin-page__aside')).not.toMatch(/max-inline-size/)
})

test('lets a long unbroken value wrap in either column instead of spilling past the page', () => {
	expect(ruleOf(recordColumns)).toMatch(/overflow-wrap:\s*anywhere/)
})

test('keeps the words of a table whole, so a wide table scrolls and a word never breaks', () => {
	expect(ruleOf('.godmin-table')).toMatch(/overflow-wrap:\s*normal/)
})

test('scrolls a wide table inside a column at every width, since the column clips what runs past it', () => {
	const rule = ruleOf('.godmin-page__main .godmin-table-scroll,\n\t.godmin-page__aside .godmin-table-scroll')

	expect(rule).toMatch(/position:\s*relative/)
	expect(rule).toMatch(/overflow-x:\s*auto/)
})

test('holds a list inside a column, since the column clips what reaches past it', () => {
	expect(ruleOf('.godmin-page__main .godmin-list,\n\t.godmin-page__aside .godmin-list')).toMatch(
		/margin-inline:\s*0;/,
	)
})

test('stops a page with an aside at the canvas height', () => {
	const page = ruleOf('.godmin-page:has(> .godmin-page__split)')

	expect(page).toMatch(/flex:\s*1 1 0/)
	expect(page, 'a classic scrollbar keeps the columns beside each other at the fold').toMatch(/min-block-size:\s*0/)
})

test('lets the split take the height under the header and read its own width', () => {
	const split = ruleOf('.godmin-page__split')

	expect(split).toMatch(/container-type:\s*inline-size/)
	expect(split).toMatch(/flex:\s*1 1 auto/)
})

test('works out from the tokens alone whether the columns are stacked', () => {
	const sum = [
		'2 * var(--wpds-dimension-surface-width-md)',
		'var(--wpds-dimension-gap-xl)',
		'2 * var(--wpds-dimension-padding-xs)',
	].join(' + ')

	expect(ruleOf('.godmin-page__split')).toContain(`--godmin-page-stacked: calc((${sum} - 100cqi) * 999999);`)
})

test('scrolls each column alone beside the other and leaves a stacked pair to the split', () => {
	const columns = ruleOf(recordColumns)

	expect(columns).toMatch(/max-block-size:\s*max\(100%, var\(--godmin-page-stacked\)\)/)
	expect(columns).toMatch(/overflow:\s*hidden auto/)
	expect(ruleOf('.godmin-page__split')).toMatch(/overflow:\s*hidden auto/)
})

test('runs the columns out to the canvas edges and foot', () => {
	const split = ruleOf('.godmin-page__split')

	expect(split).toMatch(/margin-inline:\s*calc\(-1 \* var\(--godmin-canvas-gutter, 0px\)\)/)
	expect(split).toMatch(/margin-block-end:\s*calc\(-1 \* var\(--godmin-canvas-gutter-block, 0px\)\)/)
	expect(ruleOf(recordColumns)).toMatch(/padding-block-end:\s*var\(--godmin-canvas-gutter-block, 0px\)/)
})

test('parts the stacked columns by the gap', () => {
	const head = 'var(--wpds-dimension-padding-lg)'

	expect(ruleOf('.godmin-page__split')).toMatch(
		/row-gap:\s*calc\(var\(--wpds-dimension-gap-xl\) - var\(--godmin-canvas-gutter-block, 0px\)\)/,
	)
	expect(ruleOf('.godmin-page__main')).toContain(`padding-block-start: ${head};`)
	expect(ruleOf('.godmin-page__aside')).toContain(
		`padding-block-start: clamp(0px, calc(${head} - var(--godmin-page-stacked)), ${head});`,
	)
})

test('keeps what a column holds at its own height', () => {
	expect(ruleOf('.godmin-page__main > *,\n\t.godmin-page__aside > *')).toMatch(/flex-shrink:\s*0/)
})

test('sets the breadcrumbs and the title on one line, only the title shrinking', () => {
	const title = ruleOf('.godmin-page__heading > :last-child')
	const floor = /flex:\s*1 1 calc\(var\(--wpds-dimension-surface-width-xs\) \/ 2\)/

	expect(ruleOf('.godmin-page__heading')).toMatch(/display:\s*flex/)
	expect(ruleOf('.godmin-page__heading')).toMatch(floor)
	expect(ruleOf('.godmin-page__heading')).toMatch(/align-items:\s*center/)
	expect(ruleOf('.godmin-page__heading')).toMatch(/min-inline-size:\s*0/)
	expect(ruleOf('.godmin-page__breadcrumbs')).toMatch(/flex:\s*none/)
	expect(title).toMatch(floor)
	expect(title).toMatch(/overflow:\s*hidden/)
	expect(title).toMatch(/text-overflow:\s*ellipsis/)
	expect(title).toMatch(/white-space:\s*nowrap/)
})

test('wraps a trail too long for the row, as the WordPress Forms trail does', () => {
	expect(ruleOf('.godmin-page__heading')).toMatch(/flex-wrap:\s*wrap/)
	expect(ruleOf('.godmin-page__breadcrumbs')).toMatch(/max-inline-size:\s*100%/)
	expect(ruleOf('.godmin-page__breadcrumbs ul')).toMatch(/flex-wrap:\s*wrap/)
})

test('breaks a long word in a breadcrumb instead of spilling past the row', () => {
	expect(ruleOf('.godmin-page__breadcrumbs')).toMatch(/overflow-wrap:\s*anywhere/)
})

test('lays the breadcrumbs out on one line with no list markers', () => {
	const list = ruleOf('.godmin-page__breadcrumbs ul')

	expect(list).toMatch(/display:\s*flex/)
	expect(list).toMatch(/align-items:\s*center/)
	expect(list).toMatch(/margin:\s*0/)
	expect(list).toMatch(/padding:\s*0/)
	expect(list).toMatch(/list-style:\s*none/)
})

test('parts the breadcrumbs with a slash from the tokens', () => {
	const slash = ruleOf('.godmin-page__separator')

	expect(slash).toMatch(/margin-inline:\s*var\(--wpds-dimension-gap-sm\)/)
	expect(slash).toMatch(/color:\s*var\(--wpds-color-stroke-surface-neutral\);/)
	expect(slash).toMatch(/user-select:\s*none/)
})

test('draws the line under the header of a record', () => {
	expect(ruleOf('.godmin-page__split')).toMatch(
		/border-block-start:\s*var\(--wpds-border-width-xs\) solid var\(--wpds-color-stroke-surface-neutral-weak\)/,
	)
})

test('leaves the line to the tab row under tabs', () => {
	const rule = ruleOf('.godmin-page > .godmin-page__tabs + .godmin-page__split')

	expect(rule).toMatch(/margin-block-start:\s*calc\(-1 \* var\(--wpds-dimension-gap-lg\)\)/)
	expect(rule).toMatch(/border-block-start:\s*none/)
})

test('hides an aside that renders nothing', () => {
	expect(ruleOf('.godmin-page__aside:empty')).toMatch(/display:\s*none/)
})
