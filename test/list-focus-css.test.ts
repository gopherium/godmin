// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { ruleOf } from './css-rules.js'
import { base, components, dataviews } from './styles.js'

/** The ring a list region draws while it holds a keyboard focus, as WordPress rings a region it focuses by script. */
const RING = '.godmin-page__list:focus-visible::after'

/** The list region itself while it holds a keyboard focus. */
const FOCUSED = '.godmin-page__list:focus-visible'

/** The overlays WordPress draws over a list: menus and popovers, dialogs, snackbars and the DataViews action dialog. */
const OVERLAYS = [
	'.components-popover',
	'.components-modal__screen-overlay',
	'.components-snackbar-list',
	'.dataviews-action-modal',
]

/** The four places the accessibility page names where godmin turns the browser's own ring off, in source order. */
const RING_OFF = [
	'.godmin-toasts:focus',
	'.godmin-navigation-screen__back:focus:not(:focus-visible)',
	FOCUSED,
	'.godmin-page-tabs__tab:focus-visible',
]

/**
 * Returns every rule of a stylesheet with no nested block, comments left out.
 * @param css - The stylesheet text.
 * @returns Each rule's selector and the text between its braces, in source order.
 */
function rulesOf(css: string): [string, string][] {
	return [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((found) => [
		found[1].trim(),
		found[2],
	])
}

/**
 * Returns the z-index of every rule of a stylesheet whose selector a check takes.
 * @param css - The stylesheet text.
 * @param takes - Whether a rule's selector counts.
 * @returns The z-index values in source order, none for a rule that sets no z-index.
 */
function zIndexesOf(css: string, takes: (selector: string) => boolean): number[] {
	return rulesOf(css)
		.filter(([selector]) => takes(selector))
		.flatMap(([, body]) => /(?:^|[\s;])z-index:\s*(-?\d+)\s*;/.exec(body)?.[1] ?? [])
		.map(Number)
}

test('makes a list region code can focus the containing block of its ring, as WordPress makes every region', () => {
	expect(ruleOf('.godmin-page__list[tabindex]')).toMatch(/(?:^|\s)position:\s*relative;/)
})

test('draws the ring only while the list region holds a keyboard focus, never on a pointer focus', () => {
	expect(base).toContain(`${RING} {`)
	expect(base).not.toMatch(/\.godmin-page__list:focus(?!-visible)/)
})

test("turns the browser's own ring off on a list region with a keyboard focus, keeping the WordPress ring", () => {
	expect(ruleOf(FOCUSED)).toMatch(/(?:^|\s)outline:\s*none;/)
	expect(ruleOf(RING)).toMatch(/(?:^|\s)outline:\s*calc\(.+\) solid /)
})

test("turns the browser's own ring off in the four places the accessibility page names, never inside a list", () => {
	const off = rulesOf(base).filter(([, body]) => /(?:^|\s)outline:\s*(?:none|0)\s*;/.test(body))

	expect(off.map(([selector]) => selector)).toEqual(RING_OFF)
})

test('spreads the ring over the whole list region, an empty box that takes no pointer', () => {
	const ring = ruleOf(RING)

	expect(ring).toMatch(/content:\s*'';/)
	expect(ring).toMatch(/(?:^|\s)position:\s*absolute;/)
	expect(ring).toMatch(/(?:^|\s)inset:\s*0;/)
	expect(ring).toMatch(/pointer-events:\s*none;/)
})

test('rings the list region in the focus colour at twice the focus width, inside its edge', () => {
	const ring = ruleOf(RING)

	expect(ring).toMatch(
		/(?:^|\s)outline:\s*calc\(2 \* var\(--wpds-border-width-focus\)\) solid var\(--wpds-color-stroke-focus\);/,
	)
	expect(ring).toMatch(/outline-offset:\s*calc\(-2 \* var\(--wpds-border-width-focus\)\);/)
})

test('draws a line of the surface colour just inside the ring, where WordPress draws its white line', () => {
	expect(ruleOf(RING)).toMatch(
		new RegExp(
			String.raw`box-shadow:\s*inset 0 0 0 calc\(2 \* var\(--wpds-border-width-focus\) \+ ` +
				String.raw`var\(--wpds-border-width-xs\)\) var\(--wpds-color-background-surface-neutral-strong\);`,
		),
	)
})

test('lifts the ring to the highest z-index a part of a list takes, so it paints over frozen and pinned cells', () => {
	const ring = zIndexesOf(base, (selector) => selector === RING)
	const godmin = zIndexesOf(base, (selector) => selector.includes('.godmin-page__list') && selector !== RING)
	const parts = zIndexesOf(dataviews, (selector) => selector.startsWith('.dataviews') && !OVERLAYS.includes(selector))

	expect(parts.length, 'the DataViews sheet lifts some part of a list').toBeGreaterThan(0)
	expect(ring).toEqual([Math.max(...godmin, ...parts)])
})

test('keeps the ring under the z-index WordPress gives every menu, popover, dialog and snackbar', () => {
	const ring = zIndexesOf(base, (selector) => selector === RING)
	const overlays = [
		...zIndexesOf(components, (selector) => OVERLAYS.includes(selector)),
		...zIndexesOf(dataviews, (selector) => OVERLAYS.includes(selector)),
	]

	expect(overlays).toHaveLength(OVERLAYS.length)
	expect(ring).toHaveLength(1)
	expect(ring[0]).toBeLessThan(Math.min(...overlays))
})
