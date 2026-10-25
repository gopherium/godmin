// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import * as breakpoints from '../src/breakpoints'
import { ruleValue } from './styles.js'

/** The folder of Design System pages. */
const folder = resolve(import.meta.dirname, '../docs/design-system')

/** Every Design System page, by its file name. */
const pages = new Map(
	readdirSync(folder)
		.filter((name) => name.endsWith('.md'))
		.map((name) => [name, readFileSync(resolve(folder, name), 'utf8')]),
)

/** The text of every Design System page together. */
const allPages = [...pages.values()].join('\n')

/** The godmin stylesheet. */
const stylesheet = readFileSync(resolve(import.meta.dirname, '../src/base.css'), 'utf8')

/** The text of every godmin source file together. */
const source = readdirSync(resolve(import.meta.dirname, '../src'))
	.filter((name) => /\.(css|ts|tsx)$/.test(name))
	.map((name) => readFileSync(resolve(import.meta.dirname, '../src', name), 'utf8'))
	.join('\n')
	.toLowerCase()

/** The stylesheet of design tokens the installed design system ships. */
const tokenSheet = readFileSync(createRequire(import.meta.url).resolve('@wordpress/theme/design-tokens.css'), 'utf8')

/** The toaster source, where each toast default is set. */
const toaster = readFileSync(resolve(import.meta.dirname, '../src/toaster.tsx'), 'utf8')

/** The usage page of the loading ghosts and the toasts. */
const usage = readFileSync(resolve(import.meta.dirname, '../docs/loading-and-feedback.md'), 'utf8')

/** A toast value the toasts page gives: its rule and property, then the section and words of its passage. */
interface ToastValue {
	selector: string
	property: string
	heading: string
	phrase: string
}

/** Each toast value the toasts page gives. */
const toastValues: ToastValue[] = [
	['.godmin-toasts', 'bottom', 'Where a toast sits', 'above the bottom'],
	['.godmin-toasts__item-inner > .godmin-toast', 'margin-block-start', 'Where a toast sits', 'apart'],
	['.godmin-toasts', 'padding-inline', 'Where a toast sits', 'on each side'],
	['.godmin-toast', 'max-width', 'Size', 'as wide as its message'],
	['.godmin-toast', 'padding', 'Size', 'above and below'],
	['.godmin-toast', 'background', 'Colors, corners and shadow', 'The box is'],
	['.godmin-toast', 'color', 'Colors, corners and shadow', 'The text and the action'],
	['.godmin-toast--plain:focus-visible', 'box-shadow', 'Colors, corners and shadow', 'A focused toast with no action'],
	['.godmin-toast', 'border-radius', 'Colors, corners and shadow', 'The corners'],
	['.godmin-toast', 'box-shadow', 'Colors, corners and shadow', 'The shadow'],
	['.godmin-toast', 'font-family', 'Text', 'The message takes'],
	['.godmin-toast', 'font-size', 'Text', 'The message takes'],
	['.godmin-toast', 'line-height', 'Text', 'The message takes'],
	['.godmin-toast__action', 'margin-inline-start', 'Text', 'first line'],
	['.godmin-toast__action', 'text-underline-offset', 'Text', 'underlined'],
	['.godmin-toasts__item', 'animation', 'Motion', 'grows its space'],
	['.godmin-toast', 'animation', 'Motion', 'fades in'],
	['.godmin-toast--leaving', 'animation', 'Motion', 'fades out'],
	['.godmin-toasts__item--leaving', 'animation', 'Motion', 'closes over'],
	['.godmin-toast', 'cursor', 'Clearing a toast', 'The pointer'],
	['.godmin-toast--plain:focus-visible', 'box-shadow', 'Keyboard', 'one button'],
	['.godmin-toast__action:focus-visible', 'outline', 'Keyboard', 'focus ring of the action'],
	['.godmin-toast__action:focus-visible', 'outline-offset', 'Keyboard', 'focus ring of the action'],
	['.godmin-toast__action:focus-visible', 'border-radius', 'Keyboard', 'focus ring of the action'],
].map(([selector, property, heading, phrase]) => ({ selector, property, heading, phrase }))

/**
 * Returns the value a constant of the toaster source holds, as written.
 * @param name - The constant, such as `DISMISS_AFTER`.
 * @returns The text after the equals sign.
 */
function toasterValue(name: string): string {
	const found = new RegExp(`const ${name} = (.+)`).exec(toaster)
	if (found === null) {
		throw new Error(`the toaster sets no ${name}`)
	}
	return found[1]
}

/**
 * Returns the words of the hint a plain toast gives a screen reader, as the toaster sets them.
 * @returns The hint without its quotes.
 */
function toastHint(): string {
	return toasterValue('DISMISS_LABEL').slice(1, -1)
}

/**
 * Returns the corner preset the toaster holds its region at, as the toaster sets it.
 * @returns The preset, such as `subtle`.
 */
function toastCorners(): string {
	const found = /cornerRadius="([a-z]+)"/.exec(toaster)
	if (found === null) {
		throw new Error('the toaster sets no corner preset')
	}
	return found[1]
}

/** A toast value with what the toasts page and the stylesheet give for it. */
interface ToastGiven extends ToastValue {
	/** The bullet or paragraph of the page that gives the value, its spaces made single, empty when missing. */
	passage: string
	/** The design tokens and raw timings the stylesheet sets for the value, or else each of its layers, spaces single. */
	parts: string[]
}

/**
 * Returns each toast value with the passage of the toasts page that gives it and the parts the stylesheet sets.
 * @returns The values in table order.
 */
function toastsGiven(): ToastGiven[] {
	const sections = (pages.get('toasts.md') ?? '').split('\n## ')
	return toastValues.map((value) => {
		const section = sections.find((part) => part.startsWith(`${value.heading}\n`)) ?? ''
		const passages = section.split(/\n(?:- |\n)/).map((passage) => passage.replace(/\s+/g, ' '))
		const set = (ruleValue(value.selector, value.property) ?? '').replace(/\s+/g, ' ').trim()
		const tokens = set.match(/--wpds-[a-z0-9-]*[a-z0-9]/g)
		const timings = set.match(/\b\d+ms\b|cubic-bezier\([^)]*\)/g) ?? []
		return {
			...value,
			passage: passages.find((passage) => passage.includes(value.phrase)) ?? '',
			parts: tokens === null ? set.split(',').map((layer) => layer.trim()) : [...tokens, ...timings],
		}
	})
}

/**
 * Returns the custom properties a text uses or declares that start with a prefix.
 * @param text - The text to search.
 * @param prefix - The start of the names, such as `--wpds-`.
 * @returns The names, each once.
 */
function namesIn(text: string, prefix: string): Set<string> {
	return new Set(text.match(new RegExp(`${prefix}[a-z0-9-]*[a-z0-9]`, 'g')) ?? [])
}

/**
 * Returns the custom properties a stylesheet declares that start with a prefix.
 * @param sheet - The stylesheet text.
 * @param prefix - The start of the names, such as `--godmin-`.
 * @returns The names, each once.
 */
function declaredIn(sheet: string, prefix: string): Set<string> {
	return new Set([...sheet.matchAll(new RegExp(`(${prefix}[a-z0-9-]+)\\s*:`, 'g'))].map((found) => found[1]))
}

/**
 * Returns the hex colours a text names, short or long, leaving out heading links such as `#bad-add`.
 * @param text - The text to search.
 * @returns The colours in lower case, each once.
 */
function coloursIn(text: string): string[] {
	const found = text.match(/(?<![\w(])#(?:[0-9a-f]{6}|[0-9a-f]{3})\b(?!-)/gi) ?? []
	return [...new Set(found.map((colour) => colour.toLowerCase()))]
}

test.each([
	'overview.md',
	'color.md',
	'layout.md',
	'radius-and-elevation.md',
	'typography.md',
	'motion.md',
	'accessibility.md',
	'custom-properties.md',
	'toasts.md',
])('the Design System holds %s', (name) => {
	expect([...pages.keys()]).toContain(name)
})

test('every design token a page names exists in the design system', () => {
	const tokens = declaredIn(tokenSheet, '--wpds-')

	expect([...namesIn(allPages, '--wpds-')].filter((name) => !tokens.has(name))).toEqual([])
})

test('every godmin custom property a page names is declared in the stylesheet', () => {
	const declared = declaredIn(stylesheet, '--godmin-')

	expect([...namesIn(allPages, '--godmin-')].filter((name) => !declared.has(name))).toEqual([])
})

test('the custom properties page names every custom property the stylesheet declares', () => {
	const named = namesIn(pages.get('custom-properties.md') ?? '', '--godmin-')

	expect([...declaredIn(stylesheet, '--godmin-')].filter((name) => !named.has(name))).toEqual([])
})

test.each(Object.entries(breakpoints))('the layout page gives %s its value', (name, value) => {
	expect(pages.get('layout.md') ?? '').toContain(`| \`${name}\` | \`${value}\` |`)
})

test('the colour reader finds short and long hex colours but no heading link', () => {
	const text = 'Text is `#fff` on `#26292b`, see [the canvas](#the-canvas), [a bad add](#bad-add) and [face](#face).'

	expect(coloursIn(text)).toEqual(['#fff', '#26292b'])
})

test('every colour a page names is set in the source', () => {
	expect(coloursIn(allPages).filter((colour) => !source.includes(colour))).toEqual([])
})

test('the toasts page gives how long each kind of toast stays, as the toaster sets it', () => {
	const page = pages.get('toasts.md') ?? ''

	expect(page).toContain(`${Number(toasterValue('DISMISS_AFTER')) / 1000} seconds`)
	expect(page).toContain(`${Number(toasterValue('ACTION_DISMISS_AFTER')) / 1000} seconds`)
})

test.each(toastsGiven())('the toasts page gives the $selector $property as the stylesheet sets it', (given) => {
	expect(ruleValue(given.selector, given.property), 'the stylesheet sets the value').toBeDefined()
	expect(given.passage, `the ${given.heading} section says nothing with "${given.phrase}"`).not.toBe('')
	expect(given.parts.filter((part) => !given.passage.includes(part))).toEqual([])
})

test('the toasts page names no design token beside a toast value that the stylesheet leaves out', () => {
	const used = new Map<string, string[]>()
	for (const { passage, parts } of toastsGiven()) {
		used.set(passage, [...(used.get(passage) ?? []), ...parts])
	}
	const extra = [...used].flatMap(([passage, parts]) =>
		[...namesIn(passage, '--wpds-')].filter((name) => !parts.includes(name)),
	)

	expect(extra).toEqual([])
})

test('the toasts page gives the corner preset every toast corner keeps, as the toaster sets it', () => {
	const corners = toastsGiven().filter((given) => given.property === 'border-radius')

	expect(corners.map((given) => given.selector)).toEqual(['.godmin-toast', '.godmin-toast__action:focus-visible'])
	expect(corners.filter((given) => !given.passage.includes(`\`${toastCorners()}\``))).toEqual([])
})

test('the motion and corner pages leave every toast timing and the toast preset to the toasts page', () => {
	const tokens = (pages.get('motion.md') ?? '').split('\n').filter((line) => /^\| `--wpds-motion-/.test(line))
	const toastTokens = tokens.filter((row) => /toast/i.test(row))
	const corners = (pages.get('radius-and-elevation.md') ?? '').split('\n\n').filter((passage) => /toast/i.test(passage))

	expect(toastTokens.length, 'the motion page names the tokens of the toast motion').toBeGreaterThan(0)
	expect(toastTokens.filter((row) => !row.endsWith('| Toast motion, see [Motion](./toasts.md#motion) |'))).toEqual([])
	expect(corners.filter((passage) => passage.includes(`\`${toastCorners()}\``))).toEqual([])
})

test('the toasts page gives the hint a plain toast speaks, as the toaster sets it', () => {
	expect(pages.get('toasts.md') ?? '').toContain(`"${toastHint()}"`)
})

test('the usage page leaves every toast value to the toasts page', () => {
	const section = usage.slice(usage.indexOf('## Toasts\n')).split('\n## ')[0]
	const values = ['6000', '10000', '6 seconds', '10 seconds', toastHint(), 'white']

	expect(section, 'the usage page has a Toasts section').toMatch(/^## Toasts\n/)
	expect(values.filter((value) => section.includes(value))).toEqual([])
})
