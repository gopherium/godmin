// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import { DENSE_BREAKPOINT, EDGE_BREAKPOINT } from '../src/breakpoints.js'

const base = readFileSync(resolve('src/base.css'), 'utf8')

/** The selector of the sticky DataViews toolbar and filters inside a list page body. */
const listToolbars = '.godmin-page > .godmin-page__list :is(.dataviews__view-actions, .dataviews-filters__container)'

/** The selector of the DataViews media boxes that hold an initials avatar. */
const avatarMedia = [
	'.dataviews-column-primary__media:has(> .godmin-avatar)',
	'.dataviews-view-list .dataviews-view-list__media-wrapper:has(> .godmin-avatar)',
].join(',\n')

/** The selector of the rings DataViews draws over the media boxes that hold an initials avatar. */
const avatarRings = [
	'.dataviews-column-primary__media:has(> .godmin-avatar)::after',
	'.dataviews-view-list .dataviews-view-list__media-wrapper:has(> .godmin-avatar)::after',
].join(',\n')

/** The selector of the title and description column of a DataViews table inside a list region. */
const primaryColumn = '.godmin-page__list .dataviews-view-table tbody .dataviews-view-table__primary-column-content'

/**
 * Tells whether the rule a selector opens sits outside every cascade layer.
 * @param selector - The exact selector the rule starts with.
 * @returns Whether the rule is unlayered.
 */
function unlayered(selector: string): boolean {
	const at = base.indexOf(`${selector} {`)
	const before = base.slice(0, at)

	expect(at, `the stylesheet has no ${selector} rule`).toBeGreaterThan(-1)

	return before.split('{').length === before.split('}').length
}

/**
 * Returns the stylesheet lines that are neither blank nor a comment.
 * @param css - The stylesheet source to scan.
 * @returns The significant lines in source order.
 */
function significantLines(css: string): string[] {
	return css
		.split('\n')
		.map((line) => line.trim())
		.filter((line) => line !== '' && !line.startsWith('/*') && !line.startsWith('*'))
}

/**
 * Returns the stylesheet from the reduced motion guard onwards.
 * @returns The guard source.
 */
function reducedMotionGuard(): string {
	const start = base.indexOf('@media (prefers-reduced-motion: reduce)')

	expect(start, 'the stylesheet declares no reduced motion guard').toBeGreaterThan(-1)

	return base.slice(start)
}

/**
 * Returns the declarations of the rule a selector opens.
 * @param selector - The exact selector the rule starts with.
 * @param css - The stylesheet source to search, the whole sheet by default.
 * @returns The text between the rule's braces.
 */
function ruleOf(selector: string, css = base): string {
	const start = css.indexOf(`${selector} {`)

	expect(start, `the stylesheet has no ${selector} rule`).toBeGreaterThan(-1)

	return css.slice(start + selector.length + 2, css.indexOf('}', start))
}

/**
 * Returns the text of a block up to the brace that closes it.
 * @param open - The index just after the block's opening brace.
 * @returns The text between the block's braces.
 */
function bodyFrom(open: number): string {
	let depth = 1
	let at = open
	while (depth > 0 && at < base.length) {
		depth += base[at] === '{' ? 1 : base[at] === '}' ? -1 : 0
		at++
	}
	return base.slice(open, at - 1)
}

/**
 * Returns the body of the block a prelude opens, matching its braces.
 * @param prelude - The exact text before the block's opening brace.
 * @returns The text between the block's braces.
 */
function blockOf(prelude: string): string {
	const start = base.indexOf(`${prelude} {`)

	expect(start, `the stylesheet has no ${prelude} block`).toBeGreaterThan(-1)

	return bodyFrom(start + prelude.length + 2)
}

/**
 * Returns the body of every at-rule of the given kinds, matching its braces.
 * @param kinds - The at-rule names to collect, such as media.
 * @returns The bodies in source order.
 */
function atRuleBodies(kinds: string[]): string[] {
	return [...base.matchAll(new RegExp(`@(?:${kinds.join('|')})\\b[^{]*\\{`, 'g'))].map((found) =>
		bodyFrom(found.index + found[0].length),
	)
}

test('lays the aside beside the content and wraps it under on a narrow page', () => {
	const split = ruleOf('.godmin-page__split')

	expect(split).toMatch(/display:\s*flex/)
	expect(split).toMatch(/flex-wrap:\s*wrap/)
	expect(split).toMatch(/align-items:\s*flex-start/)
})

test('keeps the content column at the large surface width beside an aside', () => {
	expect(ruleOf('.godmin-page__main')).toMatch(/flex:\s*1 1 var\(--wpds-dimension-surface-width-lg\)/)
})

test('gives the aside all the room the content column leaves', () => {
	expect(ruleOf('.godmin-page__aside')).toMatch(/flex:\s*999 1 0/)
})

test('folds the aside under the content before it gets narrower than the extra small surface width', () => {
	expect(ruleOf('.godmin-page__aside')).toMatch(
		/min-inline-size:\s*min\(100%, var\(--wpds-dimension-surface-width-xs\)\)/,
	)
})

test('lets the aside grow past the large surface width', () => {
	expect(ruleOf('.godmin-page__aside')).not.toMatch(/max-inline-size/)
})

test('lets a long unbroken value wrap inside the aside instead of spilling past the page', () => {
	expect(ruleOf('.godmin-page__aside')).toMatch(/overflow-wrap:\s*anywhere/)
})

test('hides an aside that renders nothing', () => {
	expect(ruleOf('.godmin-page__aside:empty')).toMatch(/display:\s*none/)
})

test('names the rail width once and sizes the rail with it', () => {
	expect(ruleOf(':root')).toMatch(/--godmin-rail-width:\s*300px/)
	expect(ruleOf('.godmin-layout__rail')).toMatch(/(?:^|\s)width:\s*var\(--godmin-rail-width\)/)
})

test('names the canvas margin once, 16px, and frames the canvas with it', () => {
	expect(ruleOf(':root')).toMatch(/--godmin-canvas-margin:\s*16px/)
	expect(ruleOf('.godmin-layout__canvas')).toMatch(/(?:^|\s)margin:\s*var\(--godmin-canvas-margin\);/)
})

test('sets the canvas against the rail, so the 16px rail padding alone parts them like the other edges', () => {
	expect(ruleOf('.godmin-layout:has(> .godmin-layout__rail) .godmin-layout__canvas')).toMatch(
		/margin-inline-start:\s*0;/,
	)
	expect(ruleOf('.godmin-layout__rail')).toMatch(/padding:\s*16px/)
})

test('centres the toasts on the canvas beside a rail rather than on the whole window', () => {
	const region = ruleOf(':root:has(.godmin-layout__rail) .godmin-toasts')

	expect(region).toMatch(/inset-inline-start:\s*var\(--godmin-rail-width\)/)
	expect(region, 'the region ends where the canvas ends').toMatch(/inset-inline-end:\s*var\(--godmin-canvas-margin\)/)
})

test('names the canvas gutter once and pads the canvas sides with it', () => {
	const canvas = ruleOf('.godmin-layout__canvas')

	expect(canvas).toMatch(/--godmin-canvas-gutter:\s*24px/)
	expect(canvas).toMatch(/padding:\s*var\(--godmin-canvas-gutter-block\) var\(--godmin-canvas-gutter\);/)
})

test('pads the canvas 16px above and below its screen, as WordPress pads a page', () => {
	expect(ruleOf('.godmin-layout__canvas')).toMatch(/--godmin-canvas-gutter-block:\s*var\(--wpds-dimension-padding-lg\)/)
})

test('takes the canvas to the screen edges below 782px, with no margin, corners or shadow', () => {
	const canvas = ruleOf('.godmin-layout__canvas', blockOf(`@media (max-width: ${EDGE_BREAKPOINT - 1}px)`))

	expect(EDGE_BREAKPOINT).toBe(782)
	expect(canvas).toMatch(/margin:\s*0/)
	expect(canvas).toMatch(/border-radius:\s*0/)
	expect(canvas).toMatch(/box-shadow:\s*none/)
	expect(canvas, 'the gutter stays 24px down to 640px').not.toMatch(/--godmin-canvas-gutter/)
})

test('narrows the canvas gutter at the dense breakpoint and leaves the edges to the wider block', () => {
	const canvas = ruleOf('.godmin-layout__canvas', blockOf(`@media (max-width: ${DENSE_BREAKPOINT - 1}px)`))

	expect(canvas).toMatch(/--godmin-canvas-gutter:\s*16px/)
	expect(canvas).not.toMatch(/margin|border-radius|box-shadow/)
})

test('draws the top bar 46px tall, as the WordPress admin bar is on a narrow screen', () => {
	const bar = ruleOf('.godmin-layout__topbar')

	expect(bar).toMatch(/block-size:\s*46px/)
	expect(bar).toMatch(/padding-inline-end:\s*16px/)
	expect(bar, 'the menu control fills the bar height').not.toMatch(/(?:^|\s)padding:/)
})

test('draws the menu control bare like the admin bar menu toggle, its bars the chrome text colour at 60%', () => {
	const menu = ruleOf('.godmin-layout__menu')

	expect(menu).toMatch(/display:\s*flex/)
	expect(menu).toMatch(/flex:\s*none/)
	expect(menu).toMatch(/padding:\s*0/)
	expect(menu).toMatch(/border:\s*0/)
	expect(menu).toMatch(/background:\s*none/)
	expect(menu).toMatch(/color:\s*color-mix\(in srgb, var\(--wpds-color-foreground-content-neutral\) 60%, transparent\);/)
	expect(menu).toMatch(/cursor:\s*var\(--wpds-cursor-control\)/)
})

test('lights the menu control under the pointer or the keyboard, as the admin bar does', () => {
	const lit = ruleOf('.godmin-layout__menu:is(:hover, :focus-visible)')

	expect(lit).toMatch(/background:\s*var\(--wpds-color-background-interactive-neutral-weak-active\)/)
	expect(lit).toMatch(/color:\s*var\(--wpds-color-foreground-interactive-brand\)/)
	expect(ruleOf('.godmin-layout__menu:focus-visible')).toMatch(
		/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\)/,
	)
})

test('narrows the canvas gutter to 16px below 640px and lets the gutter alone set the padding', () => {
	const canvas = ruleOf('.godmin-layout__canvas', blockOf('@media (max-width: 639px)'))

	expect(canvas).toMatch(/--godmin-canvas-gutter:\s*16px/)
	expect(canvas).not.toMatch(/(?:^|\s)padding:/)
})

test('gives a full bleed canvas no gutter at every width', () => {
	const phone = blockOf('@media (max-width: 639px)')

	expect(ruleOf('.godmin-layout__canvas--bleed')).toMatch(/--godmin-canvas-gutter:\s*0px/)
	expect(ruleOf('.godmin-layout__canvas--bleed')).toMatch(/--godmin-canvas-gutter-block:\s*0px/)
	expect(ruleOf('.godmin-layout__canvas--bleed', phone)).toMatch(/--godmin-canvas-gutter:\s*0px/)
})

test('takes a list page body out to the canvas edges, so the list gutter lines up with the page title', () => {
	expect(ruleOf('.godmin-page > .godmin-page__list')).toMatch(
		/margin-inline:\s*calc\(-1 \* var\(--godmin-canvas-gutter, 0px\)\)/,
	)
})

test('lines a DataViews list nested in a page section up with the page text, never past the canvas gutter', () => {
	expect(ruleOf('.godmin-list')).toMatch(
		/margin-inline:\s*calc\(-1 \* min\(var\(--wpds-dimension-padding-2xl\), var\(--godmin-canvas-gutter, 0px\)\)\)/,
	)
})

test('draws a DataViews title link without an underline, as WordPress does', () => {
	expect(ruleOf('.dataviews-title-field--clickable')).toMatch(/text-decoration:\s*none/)
})

test('draws a DataViews media link without an underline or the browser link colour', () => {
	const media = ruleOf('.dataviews-column-primary__media--clickable')

	expect(media).toMatch(/text-decoration:\s*none/)
	expect(media).toMatch(/color:\s*inherit/)
})

test('keeps the row of the title and the actions 40px tall, where the WordPress header puts the title', () => {
	expect(ruleOf('.godmin-page__head')).toMatch(/min-block-size:\s*var\(--wpds-dimension-size-lg\)/)
})

test('leaves 4px under the subtitle, as the WordPress page header does', () => {
	expect(ruleOf('.godmin-page__subtitle')).toMatch(/padding-block-end:\s*var\(--wpds-dimension-padding-xs\)/)
})

test('pads the header of a list page by what the list pads past the gutter, so both line up on a phone', () => {
	expect(ruleOf('.godmin-page:has(> .godmin-page__list) > .godmin-page__header')).toMatch(
		/padding-inline:\s*calc\(var\(--wpds-dimension-padding-2xl\) - var\(--godmin-canvas-gutter, 0px\)\)/,
	)
})

test('lays the page tabs out in a row 16px apart, as the minimal WordPress tabs are', () => {
	const tabs = ruleOf('.godmin-page-tabs')

	expect(tabs).toMatch(/display:\s*flex/)
	expect(tabs).toMatch(/gap:\s*var\(--wpds-dimension-gap-lg\)/)
	expect(tabs).toMatch(/overflow-x:\s*auto/)
})

test('draws a page tab like a minimal WordPress tab: a 48px tall 13px label with no padding', () => {
	const tab = ruleOf('.godmin-page-tabs__tab')

	expect(tab).toMatch(/display:\s*flex/)
	expect(tab).toMatch(/align-items:\s*center/)
	expect(tab).toMatch(/position:\s*relative/)
	expect(tab).toMatch(/block-size:\s*48px/)
	expect(tab).toMatch(/padding:\s*0/)
	expect(tab).toMatch(/color:\s*var\(--wpds-color-foreground-interactive-neutral\)/)
	expect(tab).toMatch(/font-family:\s*var\(--wpds-typography-font-family-body\)/)
	expect(tab).toMatch(/font-size:\s*var\(--wpds-typography-font-size-md\)/)
	expect(tab).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-default\)/)
	expect(tab).toMatch(/line-height:\s*1\.2/)
	expect(tab).toMatch(/text-decoration:\s*none/)
	expect(tab).toMatch(/white-space:\s*nowrap/)
})

test('darkens a page tab under the pointer or the keyboard', () => {
	expect(ruleOf('.godmin-page-tabs__tab:is(:hover, :focus-visible)')).toMatch(
		/color:\s*var\(--wpds-color-foreground-interactive-neutral-active\)/,
	)
})

test('underlines the current page tab with a 2px strong neutral line as wide as its label', () => {
	const line = ruleOf('.godmin-page-tabs__tab--current::after')

	expect(line).toMatch(/content:\s*''/)
	expect(line).toMatch(/position:\s*absolute/)
	expect(line).toMatch(/inset-inline:\s*0/)
	expect(line).toMatch(/inset-block-end:\s*0/)
	expect(line).toMatch(/block-size:\s*var\(--wpds-border-width-focus\)/)
	expect(line).toMatch(/background:\s*var\(--wpds-color-stroke-interactive-neutral-strong\)/)
})

test('underlines the tab godmin marks current, not every link a router marks active', () => {
	expect(base).not.toMatch(/aria-current/)
})

test('rings a focused page tab around its label, as the WordPress tabs do', () => {
	const ring = ruleOf('.godmin-page-tabs__tab::before')

	expect(ring).toMatch(/content:\s*''/)
	expect(ring).toMatch(/position:\s*absolute/)
	expect(ring).toMatch(/inset:\s*var\(--wpds-dimension-padding-md\) var\(--wpds-border-width-focus\)/)
	expect(ring).toMatch(/border-radius:\s*var\(--wpds-border-radius-sm\)/)
	expect(ring).toMatch(/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\)/)
	expect(ring).toMatch(/opacity:\s*0/)
	expect(ruleOf('.godmin-page-tabs__tab:focus-visible::before')).toMatch(/opacity:\s*1/)
	expect(ruleOf('.godmin-page-tabs__tab:focus-visible')).toMatch(/outline:\s*none/)
})

test('draws a 1px weak divider under the page tabs out to the canvas edges', () => {
	const tabs = ruleOf('.godmin-page__tabs')

	expect(tabs).toMatch(/margin-inline:\s*calc\(-1 \* var\(--godmin-canvas-gutter, 0px\)\)/)
	expect(tabs).toMatch(/padding-inline:\s*var\(--godmin-canvas-gutter, 0px\)/)
	expect(tabs).toMatch(
		/border-block-end:\s*var\(--wpds-border-width-xs\) solid var\(--wpds-color-stroke-surface-neutral-weak\)/,
	)
})

test('lines the page tabs of a list page up with its title', () => {
	expect(ruleOf('.godmin-page:has(> .godmin-page__list) > .godmin-page__tabs')).toMatch(
		/padding-inline:\s*var\(--wpds-dimension-padding-2xl\)/,
	)
})

test('lets the DataViews toolbar padding alone part the tabs from a list under them, 16px as in WordPress', () => {
	expect(ruleOf('.godmin-page > .godmin-page__tabs + .godmin-page__list:has(> .dataviews-wrapper:first-child)')).toMatch(
		/margin-block-start:\s*calc\(-1 \* var\(--wpds-dimension-gap-lg\)\)/,
	)
})

test('keeps the page gap under the tabs when a list opens with a notice or a table rather than DataViews', () => {
	expect(base).not.toMatch(/\.godmin-page__tabs \+ \.godmin-page__list\s*\{/)
})

test('keeps the sticky toolbar and filters of a list at the edge the list reaches', () => {
	expect(ruleOf(listToolbars)).toMatch(/inset-inline-start:\s*calc\(-1 \* var\(--godmin-canvas-gutter, 0px\)\)/)
})

test('sets the list toolbar edge outside every layer, so it outranks the unlayered DataViews sheet', () => {
	expect(unlayered(listToolbars)).toBe(true)
})

test('draws an initials avatar as a 32px circle with a 12px semibold letter in its middle', () => {
	const avatar = ruleOf('.godmin-avatar', base.slice(base.lastIndexOf('@layer godmin')))

	expect(avatar).toMatch(/display:\s*inline-block/)
	expect(avatar).toMatch(/text-align:\s*center/)
	expect(avatar).toMatch(/align-content:\s*center/)
	expect(avatar).toMatch(/flex:\s*none/)
	expect(avatar).toMatch(/inline-size:\s*var\(--wpds-dimension-size-md\)/)
	expect(avatar).toMatch(/block-size:\s*var\(--wpds-dimension-size-md\)/)
	expect(avatar).toMatch(/border-radius:\s*50%/)
	expect(avatar).toMatch(/font-family:\s*var\(--wpds-typography-font-family-body\)/)
	expect(avatar).toMatch(/font-size:\s*var\(--wpds-typography-font-size-sm\)/)
	expect(avatar).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\)/)
	expect(avatar).toMatch(/line-height:\s*1;/)
})

test('leaves the letter colour of an initials avatar to the palette pair the avatar sets', () => {
	const avatar = ruleOf('.godmin-avatar', base.slice(base.lastIndexOf('@layer godmin')))

	expect(avatar).not.toMatch(/(^|[\s;])color:/)
})

test('centres the capital of an initial in the circle rather than the line it sits on', () => {
	const avatar = ruleOf('.godmin-avatar', base.slice(base.lastIndexOf('@layer godmin')))

	expect(avatar).toMatch(/text-box:\s*trim-both cap alphabetic;/)
	expect(avatar, 'the trim never reaches the anonymous box of a flex container').not.toMatch(/display:\s*inline-flex/)
})

test('rounds the DataViews media box around an initials avatar, in the table and the list', () => {
	const media = ruleOf(avatarMedia)

	expect(media).toMatch(/border-radius:\s*50%/)
	expect(unlayered(avatarMedia)).toBe(true)
})

test('drops the dark DataViews media ring around an initials avatar, which the WordPress avatar draws without', () => {
	expect(ruleOf(avatarRings)).toMatch(/box-shadow:\s*none/)
	expect(unlayered(avatarRings)).toBe(true)
})

test('centres the media of a list row on its title and description, as the WordPress list does', () => {
	const media = '.godmin-page__list .dataviews-view-table tbody .dataviews-column-primary__media'

	expect(ruleOf(media)).toMatch(/align-self:\s*center/)
	expect(unlayered(media)).toBe(true)
})

test('sets the name 8px after an avatar in a DataViews table, as the WordPress list does', () => {
	const table = '.dataviews-column-primary__media:has(> .godmin-avatar)'

	expect(ruleOf(table)).toMatch(
		/margin-inline-end:\s*calc\(var\(--wpds-dimension-gap-sm\) - var\(--wpds-dimension-gap-md\)\)/,
	)
	expect(unlayered(table)).toBe(true)
})

test('fills the larger media box of the DataViews list with the avatar and keeps its letter in proportion', () => {
	const wrapper = '.dataviews-view-list .dataviews-view-list__media-wrapper:has(> .godmin-avatar)'
	const avatar = '.dataviews-view-list .dataviews-view-list__media-wrapper > .godmin-avatar'

	expect(ruleOf(wrapper)).toMatch(/container-type:\s*size/)
	expect(ruleOf(avatar)).toMatch(/inline-size:\s*100%/)
	expect(ruleOf(avatar)).toMatch(/block-size:\s*100%/)
	expect(ruleOf(avatar), 'the letter keeps the 12px to 32px ratio').toMatch(/font-size:\s*37\.5cqi/)
	expect(unlayered(wrapper)).toBe(true)
	expect(unlayered(avatar)).toBe(true)
})

test('keeps the sticky DataViews footer of a list page or a list inside a page on the canvas bottom', () => {
	const footer = '.godmin-page > .godmin-page__list .dataviews-footer,\n.godmin-list .dataviews-footer'

	expect(ruleOf(footer)).toMatch(/inset-block-end:\s*calc\(-1 \* var\(--godmin-canvas-gutter-block, 0px\)\)/)
	expect(unlayered(footer)).toBe(true)
})

test('drops the 32px floor of a list title, so a title with a description makes a 64px row as in WordPress', () => {
	const column = ruleOf(primaryColumn)
	const title = ruleOf(`${primaryColumn} > .dataviews-title-field`)

	expect(column).toMatch(/min-block-size:\s*var\(--wpds-dimension-size-md\)/)
	expect(column).toMatch(/justify-content:\s*center/)
	expect(title).toMatch(/min-block-size:\s*0/)
	expect(unlayered(primaryColumn)).toBe(true)
	expect(unlayered(`${primaryColumn} > .dataviews-title-field`)).toBe(true)
})

test('sets a list description in 12px lines 4px under a regular 13px title, as the WordPress list does', () => {
	const column = ruleOf(primaryColumn)
	const title = ruleOf(`${primaryColumn} > .dataviews-title-field`)

	expect(column).toMatch(/gap:\s*var\(--wpds-dimension-gap-xs\)/)
	expect(column).toMatch(/font-size:\s*var\(--wpds-typography-font-size-sm\)/)
	expect(column).toMatch(/line-height:\s*var\(--wpds-typography-line-height-xs\)/)
	expect(title).toMatch(/line-height:\s*var\(--wpds-typography-line-height-sm\)/)
	expect(title).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-default\)/)
})

test('keeps a list beside an aside inside its column', () => {
	expect(base).not.toMatch(/^\s*\.godmin-page__list\s*[,{]/m)
})

test('paints the canvas and a DataViews list on it with the strong surface, white like a WordPress page', () => {
	const canvas = ruleOf('.godmin-layout__canvas')

	expect(canvas).toMatch(/(?:^|[^-])background:\s*var\(--wpds-color-background-surface-neutral-strong\);/m)
	expect(canvas).toMatch(/--wp-dataviews-color-background:\s*var\(--wpds-color-background-surface-neutral-strong\);/)
})

test('lets a list page fill the canvas, so the DataViews footer rests on the canvas bottom', () => {
	expect(ruleOf('.godmin-page:has(> .godmin-page__list)')).toMatch(/flex:\s*1 0 auto/)
	expect(ruleOf('.godmin-page > .godmin-page__list')).toMatch(/flex:\s*1 0 auto/)
})

test('bleeds a list page to the canvas bottom the way it bleeds to the sides', () => {
	expect(ruleOf('.godmin-page > .godmin-page__list')).toMatch(
		/margin-block-end:\s*calc\(-1 \* var\(--godmin-canvas-gutter-block, 0px\)\)/,
	)
})

test('scrolls a DataViews list inside its own area, so the header, toolbar and footer stay put', () => {
	expect(ruleOf('.godmin-page:has(> .godmin-page__list > .dataviews-wrapper)')).toMatch(
		/flex-shrink:\s*1;\s*min-block-size:\s*0/,
	)
	expect(ruleOf('.godmin-page > .godmin-page__list:has(> .dataviews-wrapper)')).toMatch(
		/flex-shrink:\s*1;\s*min-block-size:\s*0/,
	)
})

test('stacks a list region as a column with the page gap between a notice and the list under it', () => {
	const regions = ruleOf('.godmin-page > .godmin-page__list,\n\t.godmin-page__main > .godmin-page__list')

	expect(regions).toMatch(/display:\s*flex/)
	expect(regions).toMatch(/flex-direction:\s*column/)
	expect(regions).toMatch(/gap:\s*var\(--wpds-dimension-gap-lg\)/)
})

test('lines up a notice in a list region with the title rather than the canvas edge', () => {
	const notice = '.godmin-page > .godmin-page__list > :not(.dataviews-wrapper, .godmin-table-scroll, .godmin-table)'

	expect(ruleOf(notice)).toMatch(/margin-inline:\s*var\(--wpds-dimension-padding-2xl\)/)
})

test('caps a form at the large surface width', () => {
	expect(ruleOf('.godmin-form')).toMatch(/max-width:\s*var\(--wpds-dimension-surface-width-lg\)/)
})

test('keeps a form a column with the medium gap', () => {
	const form = ruleOf('.godmin-form')

	expect(form).toMatch(/display:\s*flex/)
	expect(form).toMatch(/flex-direction:\s*column/)
	expect(form).toMatch(/gap:\s*var\(--wpds-dimension-gap-md\)/)
})

test('lays a form row out side by side and wraps it on a narrow form', () => {
	const row = ruleOf('.godmin-form__row')

	expect(row).toMatch(/display:\s*flex/)
	expect(row).toMatch(/flex-wrap:\s*wrap/)
	expect(row).toMatch(/align-items:\s*flex-end/)
	expect(row).toMatch(/gap:\s*var\(--wpds-dimension-gap-md\)/)
})

test('gives every field of a row a share of the line from two thirds of the extra small surface width', () => {
	const field = ruleOf('.godmin-form__row > *')

	expect(field).toMatch(/flex:\s*1 1 calc\(var\(--wpds-dimension-surface-width-xs\) \* 2 \/ 3\)/)
	expect(field).toMatch(/min-inline-size:\s*0/)
})

test('keeps a row button at its own width', () => {
	expect(ruleOf('.godmin-form__row > button')).toMatch(/flex:\s*none/)
})

test('sends a row button that wraps onto a line of its own to the end of that line', () => {
	expect(ruleOf('.godmin-form__row > button')).toMatch(/margin-inline-start:\s*auto/)
})

test('lets an inline form fill its column instead of stopping at the large surface width', () => {
	expect(ruleOf('.godmin-form--inline')).toMatch(/max-width:\s*none/)
})

test('gives a grown field three shares of the free room in its row', () => {
	expect(ruleOf('.godmin-form__row > .godmin-form__grow')).toMatch(/flex-grow:\s*3/)
})

test('keeps a button of a stacked form at its own width at the start of the column', () => {
	expect(ruleOf('.godmin-form > button')).toMatch(/align-self:\s*flex-start/)
})

test('sets the inputs and the controls of a repeated row on one line that wraps on a narrow list', () => {
	const line = ruleOf('.godmin-rows__line')

	expect(line).toMatch(/display:\s*flex/)
	expect(line).toMatch(/flex-wrap:\s*wrap/)
	expect(line).toMatch(/align-items:\s*flex-end/)
	expect(line).toMatch(/gap:\s*var\(--wpds-dimension-gap-md\)/)
})

test('keeps the inputs of a repeated row a small surface wide before its controls share the line', () => {
	const inputs = ruleOf('.godmin-rows__inputs')

	expect(inputs).toMatch(/flex:\s*1 1 var\(--wpds-dimension-surface-width-sm\)/)
	expect(inputs).toMatch(/min-inline-size:\s*0/)
})

test('keeps the controls of a repeated row at their own width at the end of their line', () => {
	const controls = ruleOf('.godmin-rows__controls')

	expect(controls).toMatch(/flex:\s*none/)
	expect(controls).toMatch(/margin-inline-start:\s*auto/)
})

test('keeps every line inside a table actions cell unbroken', () => {
	expect(ruleOf('.godmin-table__actions *')).toMatch(/white-space:\s*nowrap/)
})

test('sets the remove control of a repeated row a medium gap from the arrows, the controls gap included', () => {
	expect(ruleOf('.godmin-rows__remove')).toMatch(
		/margin-inline-start:\s*calc\(var\(--wpds-dimension-gap-md\) - var\(--wpds-dimension-gap-xs\)\)/,
	)
})

test('folds a form row with no breakpoint of its own', () => {
	for (const body of atRuleBodies(['media', 'container'])) {
		expect(body).not.toMatch(/godmin-form/)
	}
})

test('folds the aside with no breakpoint of its own', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/godmin-page__(?:split|main|aside)/)
	}
})

test('resets the log list margin, padding and markers', () => {
	const list = ruleOf('.godmin-log-list')

	expect(list).toMatch(/margin:\s*0/)
	expect(list).toMatch(/padding:\s*0/)
	expect(list).toMatch(/list-style:\s*none/)
})

test('draws the log list as one bordered surface from the tokens', () => {
	const list = ruleOf('.godmin-log-list')

	expect(list).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-strong\)/)
	expect(list).toMatch(
		/border:\s*var\(--wpds-border-width-xs\) solid var\(--wpds-color-stroke-surface-neutral\)/,
	)
	expect(list).toMatch(/border-radius:\s*var\(--wpds-border-radius-lg\)/)
})

test('lets a long unbroken word wrap inside a log list', () => {
	expect(ruleOf('.godmin-log-list')).toMatch(/overflow-wrap:\s*anywhere/)
})

test('hides a log list with no items', () => {
	expect(ruleOf('.godmin-log-list:empty')).toMatch(/display:\s*none/)
})

test('stacks the parts of a log item with the extra small gap', () => {
	const item = ruleOf('.godmin-log-list__item')

	expect(item).toMatch(/display:\s*flex/)
	expect(item).toMatch(/flex-direction:\s*column/)
	expect(item).toMatch(/gap:\s*var\(--wpds-dimension-gap-xs\)/)
})

test('pads each log item from the padding tokens and draws no border on it', () => {
	const item = ruleOf('.godmin-log-list__item')

	expect(item).toMatch(
		/padding:\s*var\(--wpds-dimension-padding-sm\) var\(--wpds-dimension-padding-md\)/,
	)
	expect(item, 'the divider rule sits above the plain item rule').not.toMatch(/border/)
})

test('draws a weak divider between log items and none above the first', () => {
	expect(ruleOf('.godmin-log-list__item + .godmin-log-list__item')).toMatch(
		/border-block-start:\s*var\(--wpds-border-width-xs\) solid\s+var\(--wpds-color-stroke-surface-neutral-weak\)/,
	)
})

test('wraps the log header line so the actions drop under the label in a narrow column', () => {
	const header = ruleOf('.godmin-log-list__header')

	expect(header).toMatch(/display:\s*flex/)
	expect(header).toMatch(/flex-wrap:\s*wrap/)
	expect(header).toMatch(/align-items:\s*center/)
})

test('spaces the log header line with the gap tokens', () => {
	expect(ruleOf('.godmin-log-list__header')).toMatch(
		/gap:\s*var\(--wpds-dimension-gap-xs\) var\(--wpds-dimension-gap-sm\)/,
	)
})

test('lets the log label take the free room and shrink inside a narrow column', () => {
	const label = ruleOf('.godmin-log-list__label')

	expect(label).toMatch(/flex:\s*1 1 auto/)
	expect(label).toMatch(/min-inline-size:\s*0/)
})

test('keeps the log actions at the end of their line, also after they wrap', () => {
	const actions = ruleOf('.godmin-log-list__actions')

	expect(actions).toMatch(/margin-inline-start:\s*auto/)
	expect(actions, 'a wrapped row of actions starts at the start edge').toMatch(/justify-content:\s*flex-end/)
	expect(actions, 'a group that cannot shrink spills past a narrow column').not.toMatch(
		/flex:\s*none/,
	)
})

test('lays the log actions out as a wrapping row with the extra small gap', () => {
	const actions = ruleOf('.godmin-log-list__actions')

	expect(actions).toMatch(/display:\s*flex/)
	expect(actions).toMatch(/flex-wrap:\s*wrap/)
	expect(actions).toMatch(/align-items:\s*center/)
	expect(actions).toMatch(/gap:\s*var\(--wpds-dimension-gap-xs\)/)
})

test('keeps the line breaks of a log body', () => {
	expect(ruleOf('.godmin-log-list__body')).toMatch(/white-space:\s*pre-line/)
})

test('mutes a log time with the weak content colour', () => {
	expect(ruleOf('.godmin-log-list__time')).toMatch(
		/color:\s*var\(--wpds-color-foreground-content-neutral-weak\)/,
	)
})

test('folds the log list with no breakpoint of its own', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/godmin-log-list/)
	}
})

test('declares the cascade layer order before anything else', () => {
	expect(significantLines(base)[0]).toBe('@layer wp-ui, godmin;')
})

test('loads the design tokens so a consumer needs one import', () => {
	expect(base).toContain("@import '@wordpress/theme/design-tokens.css';")
})

test('keeps the overlay requirement unlayered so it outranks application styles', () => {
	const requirement = base.slice(0, base.indexOf('@layer godmin'))

	expect(requirement).toMatch(/body\s*\{[^}]*position:\s*relative/)
})

test('confines every appearance default to the godmin layer', () => {
	const layered = base.slice(base.indexOf('@layer godmin'))

	for (const property of ['font-family', 'color', 'background', 'margin']) {
		expect(layered, `${property} must be overridable`).toContain(property)
	}
})

test('styles no bare element selector beyond the document host ones', () => {
	const selectors = [...base.matchAll(/^[ \t]*([a-zA-Z][\w\s,>+~-]*?)\s*\{/gm)].map((m) => m[1].trim())

	for (const selector of selectors) {
		expect(['html', 'body', 'html, body'], `${selector} conflicts with component styles`)
			.toContain(selector)
	}
})

test('leaves stacking context isolation to the host component', () => {
	expect(base).not.toContain('isolation')
})

test('centers the empty state, which the design system does not place itself', () => {
	expect(base).toMatch(/\.godmin-empty\s*\{[^}]*margin-inline:\s*auto/)
})

test('gives the table region a containing block as well as its overflow', () => {
	const region = base.slice(base.indexOf('.godmin-table-scroll'))

	expect(region).toMatch(/position:\s*relative/)
	expect(region).toMatch(/overflow-x:\s*auto/)
})

test('rings a focused table region with the design system focus ring', () => {
	const ring = ruleOf('.godmin-table-scroll:focus-visible')

	expect(ring).toMatch(/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\)/)
	expect(ring).toMatch(/outline-offset:\s*2px/)
})

test('rings a focused table region at every width', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/godmin-table-scroll:focus-visible/)
	}
})

test('tints the cells of a table row under the pointer or holding keyboard focus with the weak surface colour', () => {
	expect(ruleOf('.godmin-table tbody tr:is(:hover, :has(:focus-visible)) > *')).toMatch(
		/background:\s*var\(--wpds-color-background-surface-neutral-weak\)/,
	)
})

test('leaves a table row untinted when a pointer press alone holds focus in it', () => {
	expect(base).not.toMatch(/tr:is\([^)]*:focus-within/)
})

test('tints a table row at every width', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/tr:is\(:hover, :has\(:focus-visible\)\)/)
	}
})

test('pads every table cell with the medium padding and draws no cell border', () => {
	const cells = ruleOf('.godmin-table th,\n\t.godmin-table td')

	expect(cells).toMatch(/padding:\s*var\(--wpds-dimension-padding-md\)/)
	expect(cells).toMatch(/vertical-align:\s*middle/)
	expect(cells).not.toMatch(/border/)
})

test('draws the table header in small capitals at the emphasis weight in the content colour', () => {
	const header = ruleOf('.godmin-table thead th')

	expect(header).toMatch(/padding-block:\s*var\(--wpds-dimension-padding-sm\)/)
	expect(header).toMatch(/font-size:\s*var\(--wpds-typography-font-size-xs\)/)
	expect(header).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\)/)
	expect(header).toMatch(/text-transform:\s*uppercase/)
	expect(header).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral\)/)
})

test('styles only the column headers, so a row header keeps the body look', () => {
	expect(base).not.toMatch(/\.godmin-table th\s*\{/)
})

test('divides the table body rows with a weak line above each', () => {
	expect(ruleOf('.godmin-table tbody tr')).toMatch(
		/border-block-start:\s*var\(--wpds-border-width-xs\) solid var\(--wpds-color-stroke-surface-neutral-weak\)/,
	)
})

test('keeps a table body row at least a medium control tall inside its padding', () => {
	expect(ruleOf('.godmin-table tbody td')).toMatch(/height:\s*var\(--wpds-dimension-size-md\)/)
})

test('draws the title cell of a table at the emphasis weight in the content colour', () => {
	const title = ruleOf('.godmin-table__title')

	expect(title).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\)/)
	expect(title).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral\)/)
})

test('sets a table in 13px text on 20px lines, as the DataViews table is', () => {
	const table = ruleOf('.godmin-table')

	expect(table).toMatch(/font-size:\s*var\(--wpds-typography-font-size-md\)/)
	expect(table).toMatch(/line-height:\s*var\(--wpds-typography-line-height-sm\)/)
})

test('draws the title cell of a table on a list page in the regular weight, as the list titles there are', () => {
	const title = '.godmin-page__list .godmin-table__title'

	expect(ruleOf(title)).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-default\)/)
	expect(base.indexOf(`${title} {`)).toBeGreaterThan(base.indexOf('.godmin-table__title {'))
})

test('draws the title link with no underline, in the brand colour under the pointer', () => {
	const link = ruleOf('.godmin-table__title a')

	expect(link).toMatch(/text-decoration:\s*none/)
	expect(link).toMatch(/color:\s*var\(--wpds-color-foreground-interactive-neutral\)/)
	expect(ruleOf('.godmin-table__title a:hover')).toMatch(
		/color:\s*var\(--wpds-color-foreground-interactive-brand\)/,
	)
})

test('rings a focused title link with the design system focus ring', () => {
	const ring = ruleOf('.godmin-table__title a:focus-visible')

	expect(ring).toMatch(/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\)/)
	expect(ring).toMatch(/outline-offset:\s*2px/)
})

test('pads the outer cells of a table on a list page by the 24px DataViews pads its own with', () => {
	const list = '.godmin-page > .godmin-page__list .godmin-table'

	expect(ruleOf(`${list} tr > :first-child`)).toMatch(/padding-inline-start:\s*var\(--wpds-dimension-padding-2xl\);/)
	expect(ruleOf(`${list} tr > :last-child`)).toMatch(/padding-inline-end:\s*var\(--wpds-dimension-padding-2xl\);/)
})

test('keeps the row controls of a table at the end edge of their cell', () => {
	expect(ruleOf('.godmin-table__actions .godmin-rows__controls')).toMatch(/justify-content:\s*flex-end/)
})

test('pins the actions column of a scrolling table to the end edge on a small screen', () => {
	const actions = ruleOf('.godmin-table-scroll .godmin-table__actions', blockOf('@media (max-width: 639px)'))

	expect(actions).toMatch(/position:\s*sticky/)
	expect(actions).toMatch(/inset-inline-end:\s*0/)
	expect(actions, 'the pinned column hides the cells under it with the canvas colour').toMatch(
		/background:\s*var\(--wpds-color-background-surface-neutral-strong\)/,
	)
})

test('draws the start edge of the pinned actions column with an inset shadow rather than a border', () => {
	const actions = ruleOf('.godmin-table-scroll .godmin-table__actions', blockOf('@media (max-width: 639px)'))

	expect(actions).toMatch(
		/box-shadow:\s*inset var\(--wpds-border-width-xs\) 0 0 var\(--wpds-color-stroke-surface-neutral\)/,
	)
	expect(actions, 'a collapsed border paints badly on a sticky cell').not.toMatch(/^\s*border[\w-]*:/m)
})

test('draws the edge of the pinned actions column beside the scrolling cells in a right to left page', () => {
	const actions = ruleOf(
		'.godmin-table-scroll .godmin-table__actions:dir(rtl)',
		blockOf('@media (max-width: 639px)'),
	)

	expect(actions).toMatch(
		/box-shadow:\s*inset calc\(-1 \* var\(--wpds-border-width-xs\)\) 0 0 var\(--wpds-color-stroke-surface-neutral\)/,
	)
})

test('keeps the actions column in the flow of a table at 640px and wider', () => {
	const wide = base.replace(blockOf('@media (max-width: 639px)'), '')

	expect(wide).not.toMatch(/position:\s*sticky/)
})

test('spans the toast region across the window, so each toast sizes to its own message', () => {
	const region = ruleOf('.godmin-toasts')

	expect(region).toMatch(/position:\s*fixed/)
	expect(region).toMatch(/inset-inline:\s*0/)
	expect(region, 'a fixed width stops a toast growing with its message').not.toMatch(/(?:^|[^-])width:/m)
})

test('stacks the toasts in a column at the bottom center, 32px up', () => {
	const region = ruleOf('.godmin-toasts')

	expect(region).toMatch(/bottom:\s*32px/)
	expect(region).toMatch(/display:\s*flex/)
	expect(region).toMatch(/flex-direction:\s*column/)
	expect(region).toMatch(/align-items:\s*center/)
	expect(region).toMatch(/gap:\s*var\(--wpds-dimension-gap-sm\)/)
})

test('keeps a 16px gutter between a toast and the window edge', () => {
	const region = ruleOf('.godmin-toasts')

	expect(region).toMatch(/padding-inline:\s*16px/)
	expect(region).toMatch(/box-sizing:\s*border-box/)
})

test('lets clicks through the toast region but not through a toast', () => {
	expect(ruleOf('.godmin-toasts')).toMatch(/pointer-events:\s*none/)
	expect(ruleOf('.godmin-toast')).toMatch(/pointer-events:\s*auto/)
})

test('draws a toast as a dark see-through box with white text', () => {
	const toast = ruleOf('.godmin-toast')

	expect(toast).toMatch(/background:\s*rgb\(0 0 0 \/ 0\.85\)/)
	expect(toast).toMatch(/backdrop-filter:\s*blur\(16px\) saturate\(180%\)/)
	expect(toast).toMatch(/color:\s*#fff/)
})

test('shapes a toast from the design tokens', () => {
	const toast = ruleOf('.godmin-toast')

	expect(toast).toMatch(/padding:\s*var\(--wpds-dimension-padding-md\) var\(--wpds-dimension-padding-xl\)/)
	expect(toast).toMatch(/border-radius:\s*var\(--wpds-border-radius-md\)/)
	expect(toast).toMatch(/font-family:\s*var\(--wpds-typography-font-family-body\)/)
	expect(toast).toMatch(/font-size:\s*var\(--wpds-typography-font-size-md\)/)
})

test('sets a toast line at 1.4 times its text, so one line makes a 42px toast like the WordPress snackbar', () => {
	expect(ruleOf('.godmin-toast')).toMatch(/line-height:\s*1\.4;/)
})

test('lifts a toast off the page with the small elevation the WordPress snackbar uses', () => {
	const layers = [
		'0 1px 2px rgb(0 0 0 / 0.05)',
		'0 2px 3px rgb(0 0 0 / 0.04)',
		'0 6px 6px rgb(0 0 0 / 0.03)',
		'0 8px 8px rgb(0 0 0 / 0.02)',
	]
	const shadow = ruleOf('.godmin-toast').match(/box-shadow:([^;]*);/)?.[1] ?? ''

	expect(shadow.split(',').map((layer) => layer.trim())).toEqual(layers)
})

test('sets the action and the close button of a toast on the first line of its message, as the snackbar does', () => {
	const toast = ruleOf('.godmin-toast')

	expect(toast).toMatch(/display:\s*flex/)
	expect(toast).toMatch(/align-items:\s*baseline/)
	expect(toast, 'the snackbar spaces its action and close button with margins').not.toMatch(/(?:^|\s)gap:/)
})

test('shows the arrow pointer over a toast with an action, as the snackbar does', () => {
	expect(ruleOf('.godmin-toast')).toMatch(/cursor:\s*default/)
	expect(base.indexOf('.godmin-toast--plain {')).toBeGreaterThan(base.indexOf('.godmin-toast {'))
})

test('spreads the parts of a toast wider than its message apart, as the snackbar content does', () => {
	expect(ruleOf('.godmin-toast')).toMatch(/justify-content:\s*space-between/)
	expect(base, 'the snackbar message takes no free room of its own').not.toMatch(/\.godmin-toast__message\s*\{/)
})

test('sets the action 32px after the message and the close button 24px after the action, as the snackbar does', () => {
	expect(ruleOf('.godmin-toast__action')).toMatch(/margin-inline-start:\s*var\(--wpds-dimension-gap-2xl\)/)
	expect(ruleOf('.godmin-toast__dismiss')).toMatch(/margin-inline-start:\s*var\(--wpds-dimension-gap-xl\)/)
})

test('sets the close button as a line of text, so a toast with an action is as tall as a plain one', () => {
	const dismiss = ruleOf('.godmin-toast__dismiss')

	expect(dismiss).toMatch(/font:\s*inherit/)
	expect(dismiss).not.toMatch(/display:/)
	expect(dismiss).not.toMatch(/block-size:/)
	expect(dismiss).not.toMatch(/align-items:/)
})

test('caps a toast at the large surface width, padding included', () => {
	const toast = ruleOf('.godmin-toast')

	expect(toast).toMatch(/max-width:\s*var\(--wpds-dimension-surface-width-lg\)/)
	expect(toast).toMatch(/box-sizing:\s*border-box/)
})

test('sizes a toast to its message from 600px up', () => {
	expect(ruleOf('.godmin-toast')).toMatch(/(?:^|[^-])width:\s*fit-content/m)
})

test('lets a long unbroken word wrap inside a toast', () => {
	expect(ruleOf('.godmin-toast')).toMatch(/overflow-wrap:\s*anywhere/)
})

test('widens a toast to the region below 600px and keeps the 560px cap there, as the snackbar does', () => {
	const toast = ruleOf('.godmin-toast', blockOf('@media (max-width: 599px)'))

	expect(toast).toMatch(/(?:^|[^-])width:\s*100%/m)
	expect(toast, 'the snackbar keeps its cap below 600px').not.toMatch(/max-width/)
})

test('leaves the toast width alone between 600px and 640px', () => {
	expect(blockOf('@media (max-width: 639px)')).not.toMatch(/godmin-toast/)
})

test('draws the plain toast button like the rest of the snackbar, under a pointer', () => {
	const plain = ruleOf('.godmin-toast--plain')

	expect(plain).toMatch(/margin:\s*0/)
	expect(plain).toMatch(/border:\s*0/)
	expect(plain).toMatch(/text-align:\s*start/)
	expect(plain).toMatch(/cursor:\s*var\(--wpds-cursor-control\)/)
})

test('draws the action as a white link that keeps its width', () => {
	const action = ruleOf('.godmin-toast__action')

	expect(action).toMatch(/flex:\s*none/)
	expect(action).toMatch(/padding:\s*0/)
	expect(action).toMatch(/border:\s*0/)
	expect(action).toMatch(/background:\s*none/)
	expect(action).toMatch(/color:\s*inherit/)
	expect(action).toMatch(/font:\s*inherit/)
	expect(action).toMatch(/text-decoration:\s*underline/)
	expect(action).toMatch(/cursor:\s*var\(--wpds-cursor-control\)/)
})

test('sets the action underline 0.2em below the text at the font thickness, as a WordPress link button does', () => {
	const action = ruleOf('.godmin-toast__action')

	expect(action).toMatch(/text-underline-offset:\s*0\.2em/)
	expect(action).toMatch(/text-decoration-thickness:\s*from-font/)
})

test('sets the action box on a normal line, as tall as the snackbar link button', () => {
	const action = ruleOf('.godmin-toast__action')

	expect(action).toMatch(/line-height:\s*normal/)
	expect(action.indexOf('line-height'), 'the font shorthand resets the line').toBeGreaterThan(action.indexOf('font:'))
})

test('drops the action underline under the pointer, as the snackbar does', () => {
	expect(ruleOf('.godmin-toast__action:hover')).toMatch(/text-decoration:\s*none/)
})

test('draws the close button as a bare white cross', () => {
	const dismiss = ruleOf('.godmin-toast__dismiss')

	expect(dismiss).toMatch(/flex:\s*none/)
	expect(dismiss).toMatch(/padding:\s*0/)
	expect(dismiss).toMatch(/border:\s*0/)
	expect(dismiss).toMatch(/background:\s*none/)
	expect(dismiss).toMatch(/color:\s*inherit/)
	expect(dismiss).toMatch(/cursor:\s*var\(--wpds-cursor-control\)/)
	expect(base, 'the cross is a text glyph, not an icon').not.toMatch(/\.godmin-toast__dismiss svg/)
})

test('rings a focused plain toast with a white inner line and the focus colour, as the snackbar does', () => {
	const ring = ruleOf('.godmin-toast--plain:focus-visible')

	expect(ring).toMatch(
		new RegExp(
			String.raw`box-shadow:\s*inset 0 0 0 var\(--wpds-border-width-xs\) #fff,\s*` +
				String.raw`0 0 0 var\(--wpds-border-width-focus\) var\(--wpds-color-stroke-focus\)`,
		),
	)
	expect(ring, 'the snackbar keeps the browser outline as well').not.toMatch(/outline/)
})

test('outlines a focused action with a dotted white line and drops its underline, as the snackbar does', () => {
	const ring = ruleOf('.godmin-toast__action:focus-visible')

	expect(ring).toMatch(/outline:\s*var\(--wpds-border-width-xs\) dotted #fff/)
	expect(ring).toMatch(/outline-offset:\s*2px/)
	expect(ring).toMatch(/border-radius:\s*var\(--wpds-border-radius-sm\)/)
	expect(ring).toMatch(/text-decoration:\s*none/)
})

test('leaves the browser focus ring on the close button, as the snackbar cross keeps it', () => {
	expect(base).not.toMatch(/\.godmin-toast__dismiss:focus/)
})

test('draws no ring on the toast region, which takes focus only from a leaving toast', () => {
	expect(ruleOf('.godmin-toasts:focus')).toMatch(/outline:\s*none/)
})

test('fades a toast in as it arrives', () => {
	expect(ruleOf('.godmin-toast')).toMatch(
		/animation:\s*godmin-fade-in var\(--wpds-motion-duration-md\) var\(--wpds-motion-easing-balanced\)/,
	)
})

test('fades a leaving toast out and holds it hidden until it goes', () => {
	const leaving = ruleOf('.godmin-toast--leaving')

	expect(leaving).toMatch(/animation:[^;]*godmin-fade-out/)
	expect(leaving).toMatch(/animation:[^;]*var\(--wpds-motion-duration-sm\)/)
	expect(leaving).toMatch(/animation:[^;]*forwards/)
	expect(base).toMatch(/@keyframes godmin-fade-out\s*\{\s*0%\s*\{\s*opacity:\s*1;?\s*\}\s*100%\s*\{\s*opacity:\s*0/)
})

test('lets the leaving look outrank the arriving fade', () => {
	expect(base.indexOf('.godmin-toast--leaving {')).toBeGreaterThan(base.indexOf('.godmin-toast {'))
})

test('stops fading toasts for a reduced motion preference', () => {
	const guard = blockOf('@media (prefers-reduced-motion: reduce)')

	expect(guard).toMatch(/\.godmin-toast\s*[,{]/)
	expect(guard).toMatch(/animation-duration:\s*1ms/)
})

test('raises the drawer above the toast region', () => {
	const css = base.replace(/\/\*[\s\S]*?\*\//g, '')
	const drawer = css.match(/\.godmin-layout\s*\{[^}]*--wp-ui-drawer-z-index:\s*(\d+)/)
	const toasts = [...css.matchAll(/\.godmin-toasts\s*\{[^}]*?(?:^|[^-])z-index:\s*(\d+)/gm)]
		.map((found) => Number(found[1]))

	expect(drawer, 'the layout sets no drawer z-index').not.toBeNull()
	expect(toasts.length, 'the toast region sets no z-index').toBeGreaterThan(0)
	expect(Number(drawer?.[1])).toBeGreaterThan(Math.max(...toasts))
})

test('paints the chrome the frame is themed with', () => {
	const layout = base.slice(base.indexOf('.godmin-layout {'))

	expect(layout).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-weak\)/)
	expect(layout).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral\)/)
})

test('fades the ghosts in after a delay, so a fast load shows none', () => {
	const region = base.slice(base.indexOf('.godmin-loading-screen,'))
	const rule = region.slice(0, region.indexOf('}'))

	expect(rule).toContain('.godmin-loading-rows')
	expect(rule).toMatch(/opacity:\s*0/)
	expect(rule).toMatch(/animation:[^;]*godmin-fade-in/)
	expect(rule).toMatch(/animation:[^;]*150ms/)
	expect(rule).toMatch(/animation:[^;]*forwards/)
})

test('fades arriving content in, so a ghost never snaps away', () => {
	expect(base).toMatch(/\.godmin-arrival\s*\{[^}]*animation:[^;]*godmin-fade-in/)
	expect(base).toMatch(/@keyframes godmin-fade-in\s*\{\s*0%\s*\{\s*opacity:\s*0/)
})

test('stops fading for a reduced motion preference', () => {
	const guard = reducedMotionGuard()

	for (const faded of ['.godmin-loading-screen', '.godmin-loading-rows', '.godmin-arrival']) {
		expect(guard, `${faded} still fades`).toContain(faded)
	}
	expect(guard).toMatch(/animation-duration:\s*1ms/)
})

test('keeps the reveal and the delay that a reduced motion preference must not undo', () => {
	const guard = reducedMotionGuard()

	expect(guard, 'the shorthand resets the delay and the fill').not.toMatch(/animation:\s/)
	expect(guard, 'a named animation of none leaves the ghost at opacity zero').not.toMatch(
		/animation-name:/,
	)
	expect(guard, 'the ghost must stay hidden for its first 150ms').not.toMatch(/animation-delay:/)
	expect(guard, 'forwards is what holds the revealed state').not.toMatch(/animation-fill-mode:/)
})

test('pads the screen ghost, which can render with no frame around it', () => {
	expect(base).toMatch(/\.godmin-loading-screen\s*\{[^}]*padding/)
})

test('shapes every ghost bar with a height of its own', () => {
	expect(base).toMatch(/\.godmin-loading-screen__title\s*\{[^}]*height/)
	expect(base).toMatch(/\.godmin-loading-screen__stroke\s*\{[^}]*height/)
	expect(base).toMatch(/\.godmin-loading-rows__row\s*\{[^}]*height/)
})
