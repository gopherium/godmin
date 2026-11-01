// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import * as breakpoints from '../src/breakpoints'
import { ruleOf } from './css-rules.js'
import { dataviews, installedFile, ruleValue } from './styles.js'

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

/** The usage page of loading and the toasts. */
const usage = readFileSync(resolve(import.meta.dirname, '../docs/loading-and-feedback.md'), 'utf8')

/** The usage page of lists. */
const listsPage = readFileSync(resolve(import.meta.dirname, '../docs/lists.md'), 'utf8')

/** The usage page of screens and the stylesheet helpers. */
const screensPage = readFileSync(resolve(import.meta.dirname, '../docs/screens.md'), 'utf8')

/** The module of the installed design system whose stylesheet draws the empty state. */
const EMPTY_STATE_MODULE = '@wordpress/ui/build-module/empty-state/root.mjs'

/** The rule of the installed DataViews sheet that draws the line beside the pinned actions of a header cell. */
const STUCK_LINE = '.dataviews-view-table th.dataviews-view-table__actions-column--stuck::after'

/** The selector every frozen column rule of a wide list table starts with. */
const WIDE_TABLE = '.godmin-page__list--wide:has(td .dataviews-title-field) .dataviews-view-table.has-bulk-actions'

/** The checkbox cell and the title cell after it, the two cells a wide list table freezes. */
const FROZEN_CELLS = ':is(.dataviews-view-table__checkbox-column, .dataviews-view-table__checkbox-column + *)'

/** The box godmin sets the title and description of a list row in. */
const PRIMARY = '.godmin-page__list .dataviews-view-table tbody .dataviews-view-table__primary-column-content'

/** The ring a list region draws while it holds a keyboard focus. */
const REGION_RING = '.godmin-page__list:focus-visible::after'

/** The list region itself while it holds a keyboard focus. */
const REGION_FOCUS = '.godmin-page__list:focus-visible'

/** The module of the installed DataViews that waits before the spinner of a first load. */
const LAYOUT_MODULE = '@wordpress/dataviews/build-module/components/dataviews-layout/index.mjs'

/** The module of the installed DataViews that waits before a later load pulses. */
const DELAY_MODULE = '@wordpress/dataviews/build-module/hooks/use-delayed-loading.mjs'

/** How the installed DataViews sheet opens a rule that runs only when the reader allows motion. */
const MOTION_ALLOWED = '@media not (prefers-reduced-motion) {\n  '

/** Finds the raw timings a stylesheet value holds, the CSS easing keywords among them. */
const TIMINGS = /\b\d+ms\b|cubic-bezier\([^)]*\)|\bease(?:-in-out|-in|-out)?\b(?!-)/g

/** A value a Design System page gives: its rule and property, then the section and words of its passage. */
interface PageValue {
	selector: string
	property: string
	heading: string
	phrase: string
}

/** The values one Design System page gives, by the file name of the page. */
interface ValueTable {
	page: string
	values: PageValue[]
}

/** Returns the values a page gives, each from its rule, property, section and words. */
function valuesOf(rows: string[][]): PageValue[] {
	return rows.map(([selector, property, heading, phrase]) => ({ selector, property, heading, phrase }))
}

/** Each toast value the toasts page gives. */
const TOASTS: ValueTable = { page: 'toasts.md', values: valuesOf([
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
]) }

/** Each loading value the loading page gives. */
const LOADING: ValueTable = { page: 'loading.md', values: valuesOf([
	['.godmin-loading-screen', 'animation', 'A screen', 'Directly in the canvas'],
	['.godmin-loading-screen', 'padding', 'A screen', 'free on every side'],
	['.godmin-loading-screen', 'min-block-size', 'A screen', 'Outside the frame'],
]) }

/** Each list value the lists page gives. */
const LISTS: ValueTable = { page: 'lists.md', values: valuesOf([
	['.godmin-page:has(> .godmin-page__list) > .godmin-page__header', 'padding-inline', 'A list page', 'title row'],
	[
		'.godmin-page > .godmin-page__list > :not(.dataviews-wrapper, .godmin-table-scroll, .godmin-table)',
		'margin-inline',
		'A list page',
		'A notice',
	],
	['.godmin-page > .godmin-page__list,\n\t.godmin-page__main > .godmin-page__list', 'gap', 'A list page', 'between a'],
	[
		'.godmin-page > .godmin-page__tabs + .godmin-page__list:has(> .dataviews-wrapper:first-child)',
		'margin-block-start',
		'A list page',
		'Under page tabs',
	],
	[WIDE_TABLE, '--godmin-list-frozen-start', 'A wide table', 'checkbox column'],
	[`${WIDE_TABLE} .dataviews-view-table__checkbox-column`, 'background-color', 'A wide table', 'list background'],
	[
		`${WIDE_TABLE} .dataviews-view-table__row.is-selected > ${FROZEN_CELLS}`,
		'background-color',
		'A wide table',
		'list background',
	],
	[`${WIDE_TABLE} .dataviews-view-table__checkbox-column + *`, 'min-inline-size', 'A wide table', 'at least'],
	[`${WIDE_TABLE} .dataviews-view-table__checkbox-column + *`, 'padding-inline-end', 'A wide table', 'at least'],
	[`${WIDE_TABLE} .dataviews-view-table__checkbox-column + *::after`, 'inline-size', 'A wide table', 'at least'],
	[`${WIDE_TABLE} .dataviews-view-table__checkbox-column + *::after`, 'background-color', 'A wide table', 'at least'],
	[`${PRIMARY} > .dataviews-title-field`, 'line-height', 'Rows', 'The title is'],
	[PRIMARY, 'font-size', 'Rows', 'The description'],
	[PRIMARY, 'line-height', 'Rows', 'The description'],
	[PRIMARY, 'gap', 'Rows', 'The description'],
	[PRIMARY, 'min-block-size', 'Rows', 'on its own'],
	['.godmin-empty', 'padding-block', 'An empty list', '48px'],
	[REGION_RING, 'outline', 'After a write of your own', 'draws the ring'],
	[REGION_RING, 'outline-offset', 'After a write of your own', 'draws the ring'],
	[REGION_RING, 'box-shadow', 'After a write of your own', 'draws the ring'],
	[REGION_FOCUS, 'outline', 'After a write of your own', "browser's own ring"],
	['.godmin-table', 'font-size', 'Tables that stay custom', 'Text in'],
	['.godmin-table', 'line-height', 'Tables that stay custom', 'Text in'],
	['.godmin-table th,\n\t.godmin-table td', 'padding', 'Tables that stay custom', 'Every cell'],
	['.godmin-table thead th', 'padding-block', 'Tables that stay custom', 'A header cell'],
	['.godmin-table thead th', 'font-size', 'Tables that stay custom', 'A header cell'],
	['.godmin-table thead th', 'font-weight', 'Tables that stay custom', 'A header cell'],
	['.godmin-table tbody td', 'height', 'Tables that stay custom', 'A body cell'],
	['.godmin-table tbody tr', 'border-block-start', 'Tables that stay custom', 'runs above'],
	['.godmin-table tbody tr:is(:hover, :has(:focus-visible)) > *', 'background', 'Tables that stay custom', 'under the'],
	[
		'.godmin-page > .godmin-page__list .godmin-table tr > :first-child',
		'padding-inline-start',
		'Tables that stay custom',
		'first and last',
	],
	['.godmin-table-scroll .godmin-table__actions', 'box-shadow', 'Tables that stay custom', 'inset shadow'],
]) }

/** The selector of the rule both columns of a record page share. */
const RECORD_COLUMNS = '.godmin-page__main,\n\t.godmin-page__aside'

/** Each record page value the record pages page gives. */
const RECORDS: ValueTable = { page: 'record-pages.md', values: valuesOf([
	['.godmin-page__head', 'min-block-size', 'The page header', 'title row'],
	['.godmin-page__subtitle', 'color', 'The page header', 'subtitle'],
	['.godmin-page__subtitle', 'padding-block-end', 'The page header', 'subtitle'],
	['.godmin-page__separator', 'color', 'The page header', 'slash'],
	['.godmin-page__separator', 'margin-inline', 'The page header', 'slash'],
	['.godmin-page__heading', 'flex', 'The page header', 'The title keeps'],
	['.godmin-page__heading > :last-child', 'flex', 'The page header', 'The title keeps'],
	['.godmin-page__aside', 'flex', 'The two columns', 'details are'],
	['.godmin-page__split', 'column-gap', 'The two columns', 'The columns sit'],
	[RECORD_COLUMNS, 'padding-inline', 'The two columns', 'Each column keeps'],
	[RECORD_COLUMNS, 'overflow-wrap', 'The two columns', 'long word'],
	['.godmin-page__split', 'row-gap', 'When both do not fit', 'move under'],
	[RECORD_COLUMNS, 'overflow', 'What scrolls', 'scrolls on its own'],
	['.godmin-page__split', 'border-block-start', 'What scrolls', 'A line'],
	['.godmin-page__main', 'padding-block-start', 'What scrolls', 'above its'],
	['.godmin-page__aside', 'padding-block-start', 'What scrolls', 'above its'],
	['.godmin-form', 'max-width', 'Forms on a page', 'stops at'],
	['.godmin-form', 'gap', 'Forms on a page', 'stops at'],
	['.godmin-form__row > *', 'flex', 'Forms on a page', 'starts from'],
]) }

/** The value tables of the Design System pages that give values the stylesheet sets. */
const VALUE_TABLES = [TOASTS, LOADING, LISTS, RECORDS]

/** The pixel values the lists page gives that no usage section on how a list looks may repeat. */
const LIST_NUMBERS = [24, 48, 16, 8, 13, 12, 20, 64, 32, 4, 640, 782, 783, 280].map(
	(pixels) => new RegExp(`\\b${pixels}px\\b`),
)

/** The usage sections on how a list looks, each by its page and heading, that leave every value to the lists page. */
const LIST_LOOKS = [
	...[
		'A list page',
		'The view in the address',
		'Columns',
		'Tabs above a list',
		'Notices above a list',
		'The title field',
		'Lists that stay custom',
	].map((heading) => ['usage/lists.md', heading]),
	['usage/screens.md', 'Stylesheet helpers'],
]

/** The pixel values the record pages page gives that no usage section on a page may repeat. */
const RECORD_NUMBERS = [13, 15, 32, 40, 160, 240, 400, 560, 824, 832].map(
	(pixels) => new RegExp(`\\b${pixels}px\\b`),
)

/** The usage sections on how a page looks, each by its page and heading, that leave every value to that page. */
const RECORD_LOOKS = ['Page', 'Stylesheet helpers'].map((heading) => ['usage/screens.md', heading])

/** The values the loading page gives that no usage page or other section may repeat. */
const LOADING_NUMBERS = [
	/\b150ms\b/,
	/\b200ms\b/,
	/\b300ms\b/,
	/\b400ms\b/,
	/\b500ms\b/,
	/\b0\.5\b/,
	/\b1s\b/,
	/\b100vh\b/,
]

/** The motion tokens of the fade WordPress gives an image after its skeleton. */
const IMAGE_FADE = ['--wpds-motion-duration-lg', '--wpds-motion-easing-subtle']

/** Finds a design token a page names with its value in brackets after it, such as `--wpds-border-width-xs` (1px). */
const TOKEN_WITH_VALUE = /`(--wpds-[a-z0-9-]+)` \(([^()`\s]+)\)/g

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

/** A value with what its page and the stylesheet give for it. */
interface ValueGiven extends PageValue {
	/** The file name of the page. */
	page: string
	/** The bullet or paragraph of the page that gives the value, its spaces made single, empty when missing. */
	passage: string
	/** The design tokens and raw timings the stylesheet sets for the value, or else each of its layers, spaces single. */
	parts: string[]
}

/** Each Design System page by file name and each usage page by `usage/` and file name, split by heading. */
const sections = new Map(
	[...pages, ['usage/lists.md', listsPage], ['usage/screens.md', screensPage]].map(([name, text]) => [
		name,
		new Map(text.split('\n## ').map((part) => [part.slice(0, part.indexOf('\n')), part])),
	]),
)

/** The sections of the loading page, each by its heading, the heading line included. */
const loading = sections.get('loading.md') ?? new Map<string, string>()

/** Returns the first group of a match, failing when the pattern found nothing. */
function groupOf(found: RegExpExecArray | null): string {
	if (found === null) {
		throw new Error('the pattern found nothing')
	}
	return found[1]
}

/** Returns the pixels the installed design system gives a token. */
function tokenPixels(token: string): number {
	return Number(groupOf(new RegExp(`${token}:\\s*(\\d+)px;`).exec(tokenSheet)))
}

/** Returns the bullets and paragraphs of a section, spaces made single, none when the page has no such section. */
function passagesOf(section: string | undefined): string[] {
	return (section ?? '').split(/\n(?:- |\n)/).map((passage) => passage.replace(/\s+/g, ' '))
}

/** Returns each value of a page with the passage that gives it and the parts the stylesheet sets. */
function valuesGiven({ page, values }: ValueTable): ValueGiven[] {
	return values.map((value) => {
		const passages = passagesOf(sections.get(page)?.get(value.heading))
		const set = (ruleValue(value.selector, value.property) ?? '').replace(/\s+/g, ' ').trim()
		const held = [...(set.match(/--wpds-[a-z0-9-]*[a-z0-9]/g) ?? []), ...(set.match(TIMINGS) ?? [])]
		return {
			...value,
			page,
			passage: passages.find((passage) => passage.includes(value.phrase)) ?? '',
			parts: held.length > 0 ? held : set.split(',').map((layer) => layer.trim()),
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
	'loading.md',
	'lists.md',
	'record-pages.md',
])('the Design System holds %s', (name) => {
	expect([...pages.keys()]).toContain(name)
})

test('every design token a page names exists in the design system', () => {
	const tokens = declaredIn(tokenSheet, '--wpds-')

	expect([...namesIn(allPages, '--wpds-')].filter((name) => !tokens.has(name))).toEqual([])
})

test('every value a page gives in brackets after a design token is the value the design system sets', () => {
	const given = [...allPages.replace(/\s+/g, ' ').matchAll(TOKEN_WITH_VALUE)]
	const set = (token: string) => groupOf(new RegExp(`${token}:\\s*([^;]+);`).exec(tokenSheet))

	expect(given.length, 'the pages give values after design tokens').toBeGreaterThan(0)
	expect(given.filter(([, token, value]) => set(token) !== value).map(([pair]) => pair)).toEqual([])
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

test.each(VALUE_TABLES.flatMap(valuesGiven))(
	'the $page page gives the $selector $property as the stylesheet sets it',
	(given) => {
		expect(ruleValue(given.selector, given.property), 'the stylesheet sets the value').toBeDefined()
		expect(given.passage, `the ${given.heading} section says nothing with "${given.phrase}"`).not.toBe('')
		expect(given.parts.filter((part) => !given.passage.includes(part))).toEqual([])
	},
)

test.each(VALUE_TABLES)('the $page page names no design token beside a value the stylesheet lacks', (table) => {
	const used = new Map<string, string[]>()
	for (const { passage, parts } of valuesGiven(table)) {
		used.set(passage, [...(used.get(passage) ?? []), ...parts])
	}
	const extra = [...used].flatMap(([passage, parts]) =>
		[...namesIn(passage, '--wpds-')].filter((token) => !parts.includes(token)),
	)

	expect(extra).toEqual([])
})

test('the loading page gives the waits and the pulse of a list as the installed DataViews sets them', () => {
	const pulse = ruleOf(`${MOTION_ALLOWED}.dataviews-view-table.is-refreshing`, dataviews)
	const footer = ruleOf(`${MOTION_ALLOWED}.dataviews-footer .is-refreshing`, dataviews)
	const still = ruleOf('.dataviews-view-table.is-refreshing', dataviews)
	const given = [
		`${groupOf(/delay: (\d+)/.exec(installedFile(LAYOUT_MODULE)))}ms`,
		`${groupOf(/options = \{ delay: (\d+) \}/.exec(installedFile(DELAY_MODULE)))}ms`,
		groupOf(/animation: dataviews-pulse (\S+) /.exec(pulse)),
		`\`${groupOf(/animation: dataviews-pulse \S+ (\S+) /.exec(pulse))}\``,
		`\`${groupOf(/@keyframes dataviews-pulse \{[^@]*?50% \{\s*opacity: ([\d.]+)/.exec(dataviews))}\``,
	]
	const list = loading.get('A list') ?? ''

	expect(footer, 'the footer pulses as the table does').toBe(pulse)
	expect(given.filter((part) => !list.includes(part))).toEqual([])
	expect(new Set(list.match(/\b\d+ms\b/g)), 'a wait DataViews does not set').toEqual(new Set(given.slice(0, 2)))
	expect(loading.get('Reduced motion')).toContain(`\`${groupOf(/opacity: ([\d.]+)/.exec(still))}\``)
})

test('the loading page names the size and color the installed design system spinner draws with', () => {
	const spinner = installedFile('@wordpress/ui/build-module/spinner/spinner.mjs')
	const tokens = [/[{;]height:var\((--wpds-[\w-]+)/, /[{;]color:var\((--wpds-[\w-]+)/].map((found) =>
		groupOf(found.exec(spinner)),
	)

	const screen = loading.get('A screen') ?? ''

	expect(tokens.filter((token) => !screen.includes(token))).toEqual([])
})

test('the loading page gives the image fade after a skeleton with the motion tokens the installed theme sets', () => {
	const section = loading.get('A preview whose shape is known') ?? ''
	const given = IMAGE_FADE.flatMap((token) => [
		`\`${token}\``,
		groupOf(new RegExp(`${token}:\\s*([^;]+);`).exec(tokenSheet)),
	])

	expect(given.filter((part) => !section.includes(part))).toEqual([])
})

test('the usage pages leave every loading value to the loading page', () => {
	const usageLoading = usage.slice(0, usage.indexOf('## Toasts\n'))
	const lists = sections.get('usage/lists.md')?.get('A list that loads') ?? ''

	expect(lists, 'the lists page has a section on a list that loads').not.toBe('')
	expect(LOADING_NUMBERS.filter((value) => value.test(usageLoading) || value.test(lists))).toEqual([])
})

test('the motion page leaves every loading value to the loading page', () => {
	const section = sections.get('motion.md')?.get('Loading') ?? ''

	expect(section, 'the motion page has a Loading section').not.toBe('')
	expect(LOADING_NUMBERS.filter((value) => value.test(section))).toEqual([])
})

test('the toasts page gives the corner preset every toast corner keeps, as the toaster sets it', () => {
	const corners = valuesGiven(TOASTS).filter((given) => given.property === 'border-radius')

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

test('the usage pages leave every list value to the lists page', () => {
	const found = LIST_LOOKS.map(([page, heading]) => {
		const section = sections.get(page)?.get(heading)
		const values = section === undefined ? ['no such section'] : LIST_NUMBERS.filter((value) => value.test(section))
		return `${page} ${heading}: ${values.map(String).join(' ')}`
	})

	expect(found.filter((line) => !line.endsWith(': '))).toEqual([])
})

test('the usage pages leave every record value to the record pages page', () => {
	const found = RECORD_LOOKS.map(([page, heading]) => {
		const section = sections.get(page)?.get(heading)
		const values = section === undefined ? ['no such section'] : RECORD_NUMBERS.filter((value) => value.test(section))
		return `${page} ${heading}: ${values.map(String).join(' ')}`
	})

	expect(found.filter((line) => !line.endsWith(': '))).toEqual([])
})

test('the record pages page gives the width the columns fold at, as the tokens add up', () => {
	const fold = tokenPixels('--wpds-dimension-surface-width-md') * 2 + tokenPixels('--wpds-dimension-gap-xl')

	expect(sections.get('record-pages.md')?.get('When both do not fit')).toContain(`${fold}px`)
})

test('the record pages page gives the width the columns fold at on a bleed canvas, as the tokens add up', () => {
	const room = tokenPixels('--wpds-dimension-padding-xs')
	const fold = tokenPixels('--wpds-dimension-surface-width-md') * 2 + tokenPixels('--wpds-dimension-gap-xl') + 2 * room
	const passage = passagesOf(sections.get('record-pages.md')?.get('When both do not fit')).find((text) =>
		text.includes('bleed canvas'),
	)

	expect(passage).toContain(`${fold}px`)
	expect(passage).toContain(`${room}px`)
})

test('the record pages page keeps the padding above the details to the columns side by side', () => {
	const passage = passagesOf(sections.get('record-pages.md')?.get('What scrolls')).find((text) =>
		text.includes('above its'),
	)

	expect(ruleValue('.godmin-page__aside', 'padding-block-start')).toContain('--godmin-page-stacked')
	expect(passage).toContain('side by side')
	expect(passage).toContain('only the main work does')
})

test('counts the ring room of both columns in the width they fold at', () => {
	expect(ruleValue('.godmin-page__split', '--godmin-page-stacked')).toContain('2 * var(--wpds-dimension-padding-xs)')
})

test('the record pages page gives the gap inside each column, as Page sets it', () => {
	const page = readFileSync(resolve(import.meta.dirname, '../src/page.tsx'), 'utf8')
	const passage = passagesOf(sections.get('record-pages.md')?.get('The two columns')).find((text) =>
		text.includes('Inside each column'),
	)

	expect(page).toMatch(/gap="lg" className="godmin-page__main"/)
	expect(page).toMatch(/gap="lg" className="godmin-page__aside"/)
	expect(passage).toContain('`--wpds-dimension-gap-lg`')
})

test('the lists page names the line DataViews draws beside its pinned actions, as the installed sheet sets it', () => {
	const line = ruleOf(STUCK_LINE, dataviews)
	const given = [
		groupOf(/^\s*width: (\d+px);/m.exec(line)),
		`\`${groupOf(/^\s*background-color: var\((--wpds-[\w-]+)/m.exec(line))}\``,
	]
	const pinned = passagesOf(sections.get('lists.md')?.get('A wide table')).find((passage) =>
		passage.includes('actions column stays pinned'),
	)

	expect(pinned, 'the A wide table section says the actions column stays pinned').toBeDefined()
	expect(given.filter((part) => !(pinned ?? '').includes(part))).toEqual([])
})

test('the lists page gives the empty state values the installed design system sets', () => {
	const sheet = installedFile(EMPTY_STATE_MODULE)
	const tokens = [
		/[{;]max-width:var\((--wpds-[\w-]+)/,
		/__icon\{background-color:var\((--wpds-[\w-]+)/,
		/__root\{[^}]*?;gap:var\((--wpds-[\w-]+)/,
		/[{;]margin-block-start:var\((--wpds-[\w-]+)/,
	].map((found) => `\`${groupOf(found.exec(sheet))}\``)
	const side = `side by side from ${groupOf(/@media \(min-width:(\d+px)\)/.exec(sheet))} wide`
	const section = (sections.get('lists.md')?.get('An empty list') ?? '').replace(/\s+/g, ' ')

	expect([...tokens, side].filter((part) => !section.includes(part))).toEqual([])
})

test('the lists page names the breakpoint the frozen columns start above, as the stylesheet opens their block', () => {
	const opens = stylesheet.lastIndexOf('@media (', stylesheet.indexOf('.godmin-page__list--wide'))
	const width = Number(groupOf(/^@media \(width > (\d+)px\)/.exec(stylesheet.slice(opens))))
	const edge = Object.entries(breakpoints).find(([, value]) => value === width)?.[0]
	const section = (sections.get('lists.md')?.get('A wide table') ?? '').replace(/\s+/g, ' ')

	expect(edge, `no breakpoint is ${width}, the widest window the block leaves out`).toBeDefined()
	expect(section).toContain(`Wider than \`${edge}\``)
})

test('the radius page leaves the custom table line to the lists page', () => {
	const line = [...namesIn(ruleValue('.godmin-table-scroll .godmin-table__actions', 'box-shadow') ?? '', '--wpds-')]
	const passages = passagesOf(pages.get('radius-and-elevation.md')).filter((passage) =>
		passage.includes('`godmin-table`'),
	)

	expect(line.length, 'the stylesheet draws the line with design tokens').toBeGreaterThan(0)
	expect(passages.map((passage) => passage.includes('(./lists.md#tables-that-stay-custom)'))).toEqual([true])
	expect(passages.flatMap((passage) => line.filter((token) => passage.includes(`\`${token}\``)))).toEqual([])
})

test('the lists page leaves the reload timing to the loading page', () => {
	const section = sections.get('lists.md')?.get('After a write of your own') ?? ''

	expect(section, 'the lists page has a section on a write of your own').not.toBe('')
	expect(LOADING_NUMBERS.filter((value) => value.test(section))).toEqual([])
})
