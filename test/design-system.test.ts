// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import * as breakpoints from '../src/breakpoints'

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
