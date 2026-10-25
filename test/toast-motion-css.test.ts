// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { blockOf, guardedBy, ruleOf } from './css-rules.js'
import { base } from './styles.js'

/**
 * Returns the animations the rule a selector opens runs, one for each comma of the list, spaces made single.
 * @param selector - The exact selector the rule starts with.
 * @returns The animations in list order.
 */
function animationsOf(selector: string): string[] {
	const list = /(?:^|\s)animation:\s*([^;]+);/.exec(ruleOf(selector))?.[1] ?? ''
	return list.split(/,(?![^(]*\))/).map((animation) => animation.replace(/\s+/g, ' ').trim())
}

test('spans the item of each toast across the column, so a toast below 600px can span it too', () => {
	expect(ruleOf('.godmin-toasts'), 'a centred item shrinks to its toast').not.toMatch(/align-items:/)
	expect(ruleOf('.godmin-toasts__item'), 'an item sized on its own').not.toMatch(/(?:^|[^-])width:/m)
})

test('centres each toast in its item, so a toast sizes to its own message', () => {
	const inner = ruleOf('.godmin-toasts__item-inner')

	expect(inner).toMatch(/display:\s*flex/)
	expect(inner).toMatch(/flex-direction:\s*column/)
	expect(inner).toMatch(/align-items:\s*center/)
})

test('keeps each toast at the window centre inside its item and inner box, and clips none', () => {
	const css = base.replace(/\/\*[\s\S]*?\*\//g, '')
	const inside = [...css.matchAll(/([^{};]*)\{([^{}]*)\}/g)]
		.filter((found) => found[1].includes('.godmin-toasts__item'))
		.flatMap((found) => found[2].split(';').map((declaration) => declaration.trim()))
		.filter((declaration) => /^(?:inset|left|right|margin|padding|translate|transform|overflow)\b/.test(declaration))

	expect(inside, 'only the gap above each toast').toEqual(['margin-block-start: var(--wpds-dimension-gap-sm)'])
})

test('keeps two toasts the small gap apart inside the row that grows, so a toast rises its gap and its height', () => {
	expect(ruleOf('.godmin-toasts__item-inner > .godmin-toast')).toMatch(
		/margin-block-start:\s*var\(--wpds-dimension-gap-sm\);/,
	)
	expect(ruleOf('.godmin-toasts'), 'a gap between items jumps as a toast comes or goes').not.toMatch(/(?:^|\s)gap:/)
	expect(ruleOf('.godmin-toasts__item'), 'a gap outside the row starts the toast at the column bottom').not.toMatch(
		/padding/,
	)
	expect(ruleOf('.godmin-toasts__item-inner'), 'padding keeps its height in a row of none').not.toMatch(/padding/)
})

test('grows the item of an arriving toast from no height over 300ms on the curve of the WordPress snackbar', () => {
	const item = ruleOf('.godmin-toasts__item')

	expect(item).toMatch(/display:\s*grid;/)
	expect(item).toMatch(/grid-template-rows:\s*1fr;/)
	expect(item).toContain('animation: godmin-toast-grow var(--wpds-motion-duration-lg) cubic-bezier(0, 0, 0.2, 1);')
	expect(blockOf('@keyframes godmin-toast-grow')).toMatch(/^\s*0%\s*\{\s*grid-template-rows:\s*0fr;\s*\}\s*$/)
})

test('lets the item of a toast be shorter than the toast, so the toast rises out of it as the snackbar does', () => {
	const inner = ruleOf('.godmin-toasts__item-inner')

	expect(inner).toMatch(/min-height:\s*0;/)
	expect(inner, 'a clipped item cuts off the shadow and the focus ring').not.toMatch(/overflow/)
})

test('fades an arriving toast in over 250ms on the snackbar curve, after the extra small wait', () => {
	expect(ruleOf('.godmin-toast')).toContain(
		'animation: godmin-fade-in 250ms cubic-bezier(0, 0, 0.2, 1) var(--wpds-motion-duration-xs) backwards;',
	)
})

test('fades a leaving toast out from where it got to, over the small duration on the snackbar curve', () => {
	expect(animationsOf('.godmin-toast--leaving'), 'a dropped fade in snaps the toast opaque').toEqual([
		...animationsOf('.godmin-toast'),
		'godmin-fade-out var(--wpds-motion-duration-sm) cubic-bezier(0, 0, 0.2, 1) forwards',
	])
	expect(blockOf('@keyframes godmin-fade-out'), 'a first frame of its own starts the fade fully opaque').toMatch(
		/^\s*100%\s*\{\s*opacity:\s*0;\s*\}\s*$/,
	)
})

test('closes the item of a leaving toast after its fade, over 450ms, from the height it reached', () => {
	expect(animationsOf('.godmin-toasts__item--leaving'), 'a dropped growth jumps to full height').toEqual([
		...animationsOf('.godmin-toasts__item'),
		'godmin-toast-shrink 450ms cubic-bezier(0.4, 0, 0.1, 1) var(--wpds-motion-duration-sm) forwards',
	])
	expect(blockOf('@keyframes godmin-toast-shrink')).toMatch(/^\s*100%\s*\{\s*grid-template-rows:\s*0fr;\s*\}\s*$/)
})

test('lets the leaving looks outrank the arriving ones, and the reduced motion guard outrank both', () => {
	const css = base.replace(/\/\*[\s\S]*?\*\//g, '')
	const leaving = [...css.matchAll(/([^{};]*)\{/g)]
		.map((found) => found[1].trim())
		.filter((prelude) => /\.godmin-toast[\w-]*--leaving\b/.test(prelude))
	const guard = base.indexOf('@media (prefers-reduced-motion: reduce)')

	expect(base.indexOf('.godmin-toast--leaving {')).toBeGreaterThan(base.indexOf('.godmin-toast {'))
	expect(base.indexOf('.godmin-toasts__item--leaving {')).toBeGreaterThan(base.indexOf('.godmin-toasts__item {'))
	expect(leaving, 'a leaving rule stronger than one class beats the guard').toEqual([
		'.godmin-toasts__item--leaving',
		'.godmin-toast--leaving',
	])
	for (const selector of leaving) {
		expect(guard, `the guard comes after ${selector}`).toBeGreaterThan(base.indexOf(`${selector} {`))
	}
})

test('runs every toast animation at once in 1ms for a reduced motion preference, so nothing slides or fades', () => {
	expect(guardedBy(/animation-duration:\s*1ms/)).toEqual(
		expect.arrayContaining(['.godmin-toasts__item', '.godmin-toast']),
	)
	expect(guardedBy(/animation-delay:\s*0s;/), 'a wait leaves a blank space or a hidden toast').toEqual([
		'.godmin-toasts__item',
		'.godmin-toast',
	])
})
