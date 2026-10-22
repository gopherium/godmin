// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { SHEET_BREAKPOINT } from '../src/breakpoints.js'

/** Finds a file of an installed package. */
const packageFile = createRequire(import.meta.url).resolve

/** The stylesheet godmin ships. */
const base = readFileSync(resolve(import.meta.dirname, '../src/base.css'), 'utf8')

/** The design tokens the stylesheet imports. */
const tokens = readFileSync(packageFile('@wordpress/theme/design-tokens.css'), 'utf8')

/** The stylesheet the WordPress modal draws with. */
export const components = readFileSync(packageFile('@wordpress/components/build-style/style.css'), 'utf8')

/**
 * Returns the pixels one design token holds.
 * @param name - The custom property name of the token.
 * @returns The token in pixels.
 */
function tokenPixels(name: string): number {
	const found = new RegExp(`${name}:\\s*(\\d+)px;`).exec(tokens)
	if (found === null) {
		throw new Error(`the design tokens hold no ${name} in pixels`)
	}
	return Number(found[1])
}

/**
 * Returns the pixels a gap comes to, one token or a sum of tokens.
 * @param value - The gap value, such as `calc(var(--a) + var(--b))`.
 * @returns The gap in pixels.
 */
function pixelsOf(value: string): number {
	const terms = value.replace(/^calc\((.*)\)$/, '$1').split(' + ')
	return terms.reduce((sum, term) => sum + tokenPixels(/^var\((--[\w-]+)\)$/.exec(term.trim())?.[1] ?? term), 0)
}

/**
 * Returns the value the rule starting at an index of the stylesheet gives a property.
 * @param at - The index the rule starts at.
 * @param property - The property, such as gap.
 * @returns The value as written, none when the rule does not set it.
 */
function valueAt(at: number, property: string): string | undefined {
	return new RegExp(`(?:^|\\s)${property}:\\s*([^;]+);`).exec(base.slice(at, base.indexOf('}', at)))?.[1]
}

/**
 * Returns the value the stylesheet gives an element for a property, from the last of its class rules that sets it.
 * @param element - The element whose classes the stylesheet styles.
 * @param property - The property, such as gap.
 * @returns The value as written, none when no rule of its classes sets it.
 */
export function declaredValue(element: Element, property: string): string | undefined {
	const values = [...element.classList]
		.map((name) => base.indexOf(`.${name} {`))
		.filter((at) => at > -1)
		.sort((one, other) => one - other)
		.flatMap((at) => valueAt(at, property) ?? [])
	return values.at(-1)
}

/**
 * Returns the value the rule a selector opens gives a property.
 * @param selector - The exact selector the rule starts with.
 * @param property - The property, such as display.
 * @returns The value as written, none when the stylesheet has no such rule or the rule does not set it.
 */
export function ruleValue(selector: string, property: string): string | undefined {
	const at = base.indexOf(`${selector} {`)
	return at === -1 ? undefined : valueAt(at, property)
}

/**
 * Returns the space in pixels the stylesheet leaves between the children of an element, from the last of its rules.
 * @param element - The element whose classes the stylesheet styles.
 * @returns The gap in pixels.
 */
export function gapInPixels(element: Element): number {
	const gap = declaredValue(element, 'gap')
	if (gap === undefined) {
		throw new Error(`no rule of ${element.className} sets a gap`)
	}
	return pixelsOf(gap)
}

/**
 * Returns the widest the WordPress modal draws a card of the given size from the sheet breakpoint up.
 * @param size - The modal size.
 * @returns The width in pixels the size falls back to, none when the stylesheet has no such rule.
 */
export function cardWidth(size: string): string | undefined {
	const card = components.indexOf(`@media (min-width: ${SHEET_BREAKPOINT}px) {\n  .components-modal__frame {`)
	const rule = components.indexOf(`.components-modal__frame.has-size-${size} {`, card)
	return /max-width:\s*var\([^,]+,\s*(\d+px)\)/.exec(components.slice(rule, components.indexOf('}', rule)))?.[1]
}
