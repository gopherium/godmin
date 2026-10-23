// SPDX-License-Identifier: Apache-2.0

import { expect } from 'vitest'

import { base } from './styles.js'

/**
 * Returns the declarations of the rule a selector opens.
 * @param selector - The exact selector the rule starts with.
 * @param css - The stylesheet source to search, the whole sheet by default.
 * @returns The text between the rule's braces.
 */
export function ruleOf(selector: string, css = base): string {
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
export function blockOf(prelude: string): string {
	const start = base.indexOf(`${prelude} {`)

	expect(start, `the stylesheet has no ${prelude} block`).toBeGreaterThan(-1)

	return bodyFrom(start + prelude.length + 2)
}

/**
 * Returns the body of every at-rule of the given kinds, matching its braces.
 * @param kinds - The at-rule names to collect, such as media.
 * @returns The bodies in source order.
 */
export function atRuleBodies(kinds: string[]): string[] {
	return [...base.matchAll(new RegExp(`@(?:${kinds.join('|')})\\b[^{]*\\{`, 'g'))].map((found) =>
		bodyFrom(found.index + found[0].length),
	)
}
