// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

const require = createRequire(resolve('package.json'))
const base = readFileSync(resolve('src/base.css'), 'utf8')

/**
 * Returns the design token names the given stylesheet reads.
 * @param css - The stylesheet source to scan.
 * @returns The distinct token names referenced through `var()`.
 */
function tokensRead(css: string): string[] {
	return [...new Set([...css.matchAll(/var\(\s*(--wpds-[a-z0-9-]+)/g)].map((m) => m[1]))]
}

/**
 * Returns the design token names the given stylesheet declares.
 * @param css - The stylesheet source to scan.
 * @returns The distinct token names assigned a value.
 */
function tokensDeclared(css: string): Set<string> {
	return new Set([...css.matchAll(/(--wpds-[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
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

test('declares the cascade layer order before anything else', () => {
	expect(significantLines(base)[0]).toBe('@layer wp-ui, godmin;')
})

test('loads the design tokens so a consumer needs one import', () => {
	expect(base).toContain("@import '@wordpress/theme/design-tokens.css';")
})

test('every design token it reads is declared by the installed theme', () => {
	const theme = readFileSync(require.resolve('@wordpress/theme/design-tokens.css'), 'utf8')

	const declared = tokensDeclared(theme)
	const missing = tokensRead(base).filter((token) => !declared.has(token))

	expect(tokensRead(base).length).toBeGreaterThan(0)
	expect(missing).toEqual([])
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
