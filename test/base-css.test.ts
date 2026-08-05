// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

const base = readFileSync(resolve('src/base.css'), 'utf8')

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

// The toast region is fixed and out of flow, so it sizes to fit its content.
// The notice inside it stretches to whatever width it is given and offers no
// width of its own, so without one the region collapses to a few pixels and the
// message and its buttons break mid word. A max-width cannot prevent that.
test('gives the toast region a width, which is what stops it collapsing', () => {
	const region = base.slice(base.indexOf('.godmin-toasts {'))
	const rule = region.slice(0, region.indexOf('}'))

	expect(rule).toMatch(/(?:^|[^-])width:\s*\S/)
})

test('keeps the toast region inside a narrow screen', () => {
	const region = base.slice(base.indexOf('.godmin-toasts {'))
	const rule = region.slice(0, region.indexOf('}'))

	expect(rule).toMatch(/max-width:\s*calc\(100vw - 32px\)/)
})

// Frame.Root themes the chrome through a provider, which only sets custom
// properties, so the layout has to actually paint with them.
test('paints the chrome the frame is themed with', () => {
	const layout = base.slice(base.indexOf('.godmin-layout {'))

	expect(layout).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-weak\)/)
	expect(layout).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral\)/)
})
