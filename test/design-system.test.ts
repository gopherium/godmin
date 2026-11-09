// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import * as breakpoints from '../src/breakpoints'
import { TITLE_WAIT } from '../src/screen-title'
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

/** The usage page of the frame, its sidebar menu and its routes. */
const framingPage = readFileSync(resolve(import.meta.dirname, '../docs/framing-an-application.md'), 'utf8')

/** The module of the installed design system whose stylesheet draws the empty state. */
const EMPTY_STATE_MODULE = '@wordpress/ui/build-module/empty-state/root.mjs'

/** The module of the installed design system that draws a confirm, the dialog stylesheet inside. */
const CONFIRM_MODULE = '@wordpress/ui/build-module/alert-dialog/popup.mjs'

/** The module of the installed design system that draws the card of a form dialog. */
const DIALOG_MODULE = '@wordpress/ui/build-module/dialog/popup.mjs'

/** The source of godmin's form dialog. */
const formDialog = readFileSync(resolve(import.meta.dirname, '../src/form-dialog.tsx'), 'utf8')

/** The source of the dialog that asks before a move leaves unsaved work. */
const unsavedDialog = readFileSync(resolve(import.meta.dirname, '../src/unsaved-changes-dialog.tsx'), 'utf8')

/** The module of the installed design system that turns the gap of a stack into a design token. */
const STACK_MODULE = '@wordpress/ui/build-module/stack/stack.mjs'

/** The module of the installed design system that gives each text variant its size. */
const TEXT_MODULE = '@wordpress/ui/build-module/text/text.mjs'

/** A section of the dialogs page that gives a value of the installed design system. */
type DialogSection = 'Size and place' | 'Inside the card' | 'Motion' | 'A failed write'

/** Each value the dialogs page gives from the installed sheet: its section, its words and the pattern finding it. */
const DIALOG_SHEET: [DialogSection, string, RegExp][] = [
	['Size and place', 'from each window edge', /--viewport-inset:var\((--wpds-[\w-]+)/],
	['Size and place', 'never narrower', /\bmin-width:var\((--wpds-[\w-]+)/],
	['Size and place', 'its floor', /@media \(min-width:480px\)\{min-width:var\((--wpds-[\w-]+)/],
	['Inside the card', 'The corners', /__popup\{[^{]*?border-radius:var\((--wpds-[\w-]+)/],
	['Inside the card', 'border sits inside', /__popup\{[^{]*?border:var\((--wpds-[\w-]+)/],
	['Inside the card', 'The body text', /__popup\{[^{]*?font-size:var\((--wpds-[\w-]+)/],
	['Inside the card', 'inside that', /__footer\{justify-content:flex-end.padding-block:\S+ var\((--wpds-[\w-]+)/],
	['Inside the card', 'sits between', /__footer\{justify-content:flex-end.padding-block:var\((--wpds-[\w-]+)/],
	['Motion', 'dimmed layer', /transition:opacity var\((--wpds-motion-duration-[\w-]+)/],
	[
		'Motion',
		'dimmed layer',
		/transition:opacity var\(--wpds-motion-duration-md,[^)]*\) var\((--wpds-motion-easing-subtle)/,
	],
	[
		'Motion',
		'grows from',
		/transition:opacity var\(--wpds-motion-duration-md,[^)]*\) var\((--wpds-motion-easing-expressive)/,
	],
]

/** The values the dialogs page gives that no usage section on a dialog may repeat. */
const DIALOG_NUMBERS = [
	/\b320px\b/,
	/\b400px\b/,
	/\b480px\b/,
	/\b560px\b/,
	/\b600px\b/,
	/\b24px\b/,
	/\b20px\b/,
	/\b16px\b/,
	/\b13px\b/,
	/\b12px\b/,
	/\b8px\b/,
	/\b200ms\b/,
]

/** The usage sections on a dialog, each by its page and heading, that leave every value to the dialogs page. */
const DIALOG_LOOKS = ['Confirming an action', 'Renaming an item', 'A form dialog', 'A failure from a dialog'].map(
	(heading) => ['usage/lists.md', heading],
)

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
	['.godmin-toast__action::after', 'inset', 'Clearing a toast', 'past its words'],
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
	['.godmin-page__breadcrumbs', 'overflow-wrap', 'The page header', 'long word'],
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

/** The rule that times the phone drawer while the reader allows motion, from the guard that opens it. */
const DRAWER_MOTION = '@media not (prefers-reduced-motion) {\n\t\t.godmin-layout__drawer'

/** The rule that lets the backdrop of the phone drawer follow a finger that drags the drawer. */
const BACKDROP_SWIPING = "[role='presentation'][data-swiping]:has(+ * > .godmin-layout__drawer)"

/** Each frame value the frame page gives. */
const FRAME: ValueTable = { page: 'frame.md', values: valuesOf([
	[':root', '--godmin-navigation-slide-distance', 'The sidebar slide', 'to one side'],
	[':root', '--godmin-navigation-slide-duration', 'The sidebar slide', 'curve'],
	['.godmin-navigation__screen-wrapper', 'animation-timing-function', 'The sidebar slide', 'curve'],
	[DRAWER_MOTION, 'transition-duration', 'The drawer', 'from the start edge'],
	[DRAWER_MOTION, 'transition-timing-function', 'The drawer', 'from the start edge'],
	['.godmin-layout__drawer[data-ending-style]', 'transition-duration', 'The drawer', 'lets go'],
	[BACKDROP_SWIPING, 'transition-duration', 'The drawer', 'drags'],
	['.godmin-layout', 'height', 'The frame on a phone', 'the browser leaves'],
]) }

/** The section of the frame page on what a screen reader hears when the screen changes. */
const SPOKEN = 'What a screen reader hears when the screen changes'

/** The sections of other pages that speak of the frame, by page and heading, that point to the frame page instead. */
const FRAME_LOOKS = [
	['motion.md', 'The sidebar slide'],
	['motion.md', 'The phone drawer'],
	['motion.md', 'Reduced motion'],
	['layout.md', 'The frame'],
	['layout.md', 'Breakpoints'],
	['layout.md', 'Right-to-left languages'],
	['accessibility.md', 'Where focus goes'],
	['accessibility.md', 'Landmarks and names'],
	['accessibility.md', 'What a screen reader hears'],
	['custom-properties.md', 'Public custom properties'],
	['color.md', 'Raw colors on purpose'],
	['radius-and-elevation.md', 'Elevation'],
	['record-pages.md', 'While a record loads'],
	['loading.md', 'Moving between pages'],
	['loading.md', 'What a screen reader hears'],
	['usage/framing-an-application.md', 'The sidebar menu'],
	['usage/framing-an-application.md', 'What happens on a small screen'],
	['usage/framing-an-application.md', 'Routes and the frame'],
	['usage/screens.md', 'Page'],
	['usage/screens.md', 'NavigationScreen'],
]

/** The value tables of the Design System pages that give values the stylesheet sets. */
const VALUE_TABLES = [TOASTS, LOADING, LISTS, RECORDS, FRAME]

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
	/\b100dvh\b/,
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
	[
		...pages,
		['usage/lists.md', listsPage],
		['usage/screens.md', screensPage],
		['usage/framing-an-application.md', framingPage],
	].map(([name, text]) => [
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

/** The width of a record column, the gap between two and the room at their sides, in pixels, as the tokens set them. */
const [COLUMN_WIDTH, COLUMN_GAP, SIDE_ROOM] = ['surface-width-md', 'gap-xl', 'padding-xs'].map((name) =>
	Number(groupOf(new RegExp(`--wpds-dimension-${name}:\\s*(\\d+)px;`).exec(tokenSheet))),
)

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
	'dialogs.md',
	'frame.md',
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

test('the screens page matches every router link of its tabs and breadcrumbs examples on its own address only', () => {
	const found = ['PageTabs', 'PageBreadcrumbs'].map((heading) => {
		const section = sections.get('usage/screens.md')?.get(heading) ?? ''
		const links = [...section.matchAll(/<Link [^>]*\/>/g)].map(([link]) => link)
		const loose = links.filter((link) => !link.includes('activeOptions={{ exact: true }}'))
		return `${heading}: ${(links.length === 0 ? ['no router link'] : loose).join(' ')}`
	})

	expect(found.filter((line) => !line.endsWith(': '))).toEqual([])
})

test('the record pages page gives the width the columns fold at, as the tokens add up', () => {
	const fold = COLUMN_WIDTH * 2 + COLUMN_GAP

	expect(sections.get('record-pages.md')?.get('When both do not fit')).toContain(`${fold}px`)
})

test('the record pages page gives the width the columns fold at on a bleed canvas, as the tokens add up', () => {
	const fold = COLUMN_WIDTH * 2 + COLUMN_GAP + 2 * SIDE_ROOM
	const passage = passagesOf(sections.get('record-pages.md')?.get('When both do not fit')).find((text) =>
		text.includes('bleed canvas'),
	)

	expect(passage).toContain(`${fold}px`)
	expect(passage).toContain(`${SIDE_ROOM}px`)
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

/** Returns the passage of a dialogs page section that holds some words, spaces single, empty when none does. */
function dialogPassage(heading: DialogSection, phrase: string): string {
	return passagesOf(sections.get('dialogs.md')?.get(heading)).find((passage) => passage.includes(phrase)) ?? ''
}

test.each(DIALOG_SHEET)('the dialogs page gives in %s, beside "%s", the token %s finds in the installed sheet', (
	heading,
	phrase,
	pattern,
) => {
	const token = groupOf(pattern.exec(installedFile(CONFIRM_MODULE)))
	const passage = dialogPassage(heading, phrase)

	expect(passage, `the ${heading} section says nothing with "${phrase}"`).not.toBe('')
	expect(passage).toContain(`\`${token}\``)
})

test('the dialogs page gives the dimmed layer as the installed sheet paints it', () => {
	const alpha = groupOf(/__backdrop\{background-color:rgba\(0,0,0,\.(\d+)\)/.exec(installedFile(CONFIRM_MODULE)))

	expect(dialogPassage('Inside the card', 'dimmed with')).toContain(`\`rgba(0, 0, 0, 0.${alpha})\``)
})

test('the dialogs page gives the scale the card grows from', () => {
	const scale = groupOf(/scale\(\.(\d)\)/.exec(installedFile(CONFIRM_MODULE)))

	expect(dialogPassage('Motion', 'grows from')).toContain(`grows from 0.${scale} of its size`)
})

test('the dialogs page says the dimmed layer appears at once, as the installed sheet orders it', () => {
	const sheet = installedFile(CONFIRM_MODULE)
	const backdrop = sheet.slice(sheet.indexOf('__backdrop{'), sheet.indexOf('__popup{'))
	const starts = backdrop.indexOf('[data-starting-style]{opacity:0}')

	expect(starts, 'the backdrop starts hidden').toBeGreaterThan(-1)
	expect(backdrop.indexOf('[data-open]{opacity:1}'), 'the open rule wins as it comes later').toBeGreaterThan(starts)
	expect(dialogPassage('Motion', 'dimmed layer')).toContain('appears at once')
})

test('the dialogs page gives the floor width at the width the sheet switches', () => {
	const width = groupOf(/@media \(min-width:(\d+)px\)\{min-width:var\(--wpds-/.exec(installedFile(CONFIRM_MODULE)))

	expect(dialogPassage('Size and place', 'its floor')).toContain(`From ${width}px wide`)
})

test('the dialogs page gives the shadow as the installed sheet paints it', () => {
	const elevation = groupOf(/--_wp-ui-elevation-lg:([^;]+);/.exec(installedFile(CONFIRM_MODULE)))
	const layers = [...elevation.matchAll(/(0 \d+px \d+px) rgba\(0,0,0,\.(\d+)\)/g)].map(
		([, offsets, alpha]) => `\`${offsets}\` at ${Number(alpha)}%`,
	)

	expect(layers).toHaveLength(4)
	expect(layers.filter((layer) => !dialogPassage('Inside the card', 'shadow').includes(layer))).toEqual([])
})

test('the dialogs page gives the gap between the buttons of a confirm, as the installed alert dialog sets it', () => {
	const step = groupOf(/direction: "row",\s*gap: "(\w+)",\s*justify: "flex-end"/.exec(installedFile(CONFIRM_MODULE)))
	const token = groupOf(new RegExp(`\\b${step}: "var\\((--wpds-[\\w-]+)`).exec(installedFile(STACK_MODULE)))

	expect(dialogPassage('Inside the card', 'Cancel first')).toContain(`\`${token}\``)
})

test('the dialogs page gives the Cancel of a confirm, as the installed alert dialog draws it', () => {
	const close = /_AlertDialog\.Close,\s*\{\s*render: [^\n]*jsx\(Button, \{ variant: "minimal", tone: "neutral" \}\)/

	expect(installedFile(CONFIRM_MODULE)).toMatch(close)
	expect(dialogPassage('Inside the card', 'In a confirm Cancel')).toContain('no border and takes the neutral tone')
})

/** A text of a confirm, named as the installed alert dialog draws it. */
type ConfirmText = 'title' | 'description' | 'failure'

/** The patterns finding the text variant the installed alert dialog gives each text of a confirm. */
const VARIANT_OF: Record<ConfirmText, RegExp> = {
	title: /variant: "([\w-]+)",\s*render: [^\n]*_AlertDialog\.Title\b/,
	description: /variant: "([\w-]+)",\s*render: [^\n]*_AlertDialog\.Description\b/,
	failure: /variant: "([\w-]+)",\s*className: style_default2\["error-message"\]/,
}

/** Returns the variant the installed alert dialog gives a text of a confirm, and that variant's font size token. */
function textOf(text: ConfirmText): { variant: string; size: string } {
	const variant = groupOf(VARIANT_OF[text].exec(installedFile(CONFIRM_MODULE)))
	const rule = new RegExp(`__${variant}\\{[^}]*?--_gcd-p-font-size:var\\((--wpds-[\\w-]+)`)
	return { variant, size: groupOf(rule.exec(installedFile(TEXT_MODULE))) }
}

test('the dialogs page gives the text sizes of a confirm, as the installed alert dialog draws them', () => {
	const [title, body, failure] = (['title', 'description', 'failure'] as const).map(textOf)

	expect(dialogPassage('Inside the card', 'The title is')).toContain(`\`${title.variant}\`, at \`${title.size}\``)
	expect(dialogPassage('Inside the card', 'The body text')).toContain(`The body text is at \`${body.size}\``)
	expect(dialogPassage('A failed write', 'under the buttons')).toContain(`\`${failure.size}\``)
})

test('the dialogs page gives the width of the one size the installed alert dialog draws', () => {
	const popup = installedFile(CONFIRM_MODULE)
	const classes = /className: clsx\(\s*style_default\.popup,\s*className,\s*style_default\["([\w-]+)"\]\s*\)/
	const size = groupOf(classes.exec(popup))
	const token = groupOf(new RegExp(`__${size}\\{max-width:var\\((--wpds-[\\w-]+)`).exec(popup))

	expect(dialogPassage('Size and place', 'A confirm is at most')).toContain(`\`${token}\``)
})

test('the dialogs page gives the gap between the fields of a form dialog, as the form sets it', () => {
	const step = groupOf(/render=\{<form [^>]*\/>\} direction="column" gap="(\w+)"/.exec(formDialog))
	const token = groupOf(new RegExp(`\\b${step}: "var\\((--wpds-[\\w-]+)`).exec(installedFile(STACK_MODULE)))

	expect(dialogPassage('Inside the card', 'fields of a form dialog')).toContain(`\`${token}\``)
})

test('the dialogs page gives a form dialog the width of a confirm, the default of the installed dialog', () => {
	const sized = /className: clsx\(\s*style_default\.popup,\s*className,\s*style_default\["is-([\w-]+)"\]\s*\)/
	const confirm = groupOf(sized.exec(installedFile(CONFIRM_MODULE)))

	expect(formDialog).not.toMatch(/<Dialog\.Popup[^>]*\bsize=/)
	expect(groupOf(/\bsize = "(\w+)"/.exec(installedFile(DIALOG_MODULE)))).toBe(confirm)
	expect(dialogPassage('Size and place', 'A form dialog')).toContain('takes the same width')
})

test('the dialogs page says unsaved work asks in red, and that a save that leaves passes the guard', () => {
	const section = sections.get('dialogs.md')?.get('Leaving with unsaved work') ?? ''

	expect(unsavedDialog).toMatch(/<ConfirmDialog\s+intent="irreversible"/)
	expect(section).toContain('irreversible confirm')
	expect(section).toContain('`ignoreBlocker: true`')
	expect(pages.get('record-pages.md')).toContain('](./dialogs.md#leaving-with-unsaved-work)')
})

test('the dialogs page gives the Cancel of a form dialog, as the form draws it', () => {
	expect(formDialog).toMatch(/<Dialog\.Action variant="outline" tone="neutral"/)
	expect(dialogPassage('Inside the card', 'In a form dialog Cancel')).toContain('an outline and takes the neutral tone')
})

test('the usage pages leave every dialog value to the dialogs page', () => {
	const found = DIALOG_LOOKS.map(([page, heading]) => {
		const section = sections.get(page)?.get(heading)
		const values = section === undefined ? ['no such section'] : DIALOG_NUMBERS.filter((value) => value.test(section))
		return `${page} ${heading}: ${values.map(String).join(' ')}`
	})

	expect(found.filter((line) => !line.endsWith(': '))).toEqual([])
})

/** Tells whether a value stands in a text as a whole word, spaces made single. */
function standsIn(value: string, text: string): boolean {
	const escaped = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`(?<![\\w-])${escaped}(?![\\w-])`).test(text.replace(/\s+/g, ' '))
}

test('the value reader finds a value as a whole word only', () => {
	expect(['0ms', '50px', 'ease-out'].map((value) => standsIn(value, 'over 200ms on `ease-in-out`, 150px'))).toEqual([
		false,
		false,
		false,
	])
	expect(['0ms', '1 second'].map((value) => standsIn(value, 'takes `0ms` after 1\nsecond'))).toEqual([true, true])
})

test('the other pages leave every frame value, as the stylesheet sets it by selector, to the frame page', () => {
	const parts = valuesGiven(FRAME).flatMap((given) => given.parts.filter((part) => part !== ''))
	const values = [...new Set(parts), `${TITLE_WAIT / 1000} second`]
	const found = FRAME_LOOKS.map(([page, heading]) => {
		const section = sections.get(page)?.get(heading)
		const given = section === undefined ? ['no such section'] : values.filter((value) => standsIn(value, section))
		const unlinked = section !== undefined && !section.includes('frame.md#') ? ['no link to the frame page'] : []
		return `${page} ${heading}: ${[...given, ...unlinked].join(' ')}`
	})

	expect(values, 'the frame values the guard looks for').toContain('100dvh')
	expect(found.filter((line) => !line.endsWith(': '))).toEqual([])
})

test('the frame page gives how long a record may hold its title, as the screen title store sets it', () => {
	const passage = passagesOf(sections.get('frame.md')?.get(SPOKEN)).find((text) =>
		text.includes('loads after it opens'),
	)

	expect(passage, `the ${SPOKEN} section says nothing on a record that loads after it opens`).toBeDefined()
	expect(passage).toContain(`${TITLE_WAIT / 1000} second`)
})

test('the frame page names the width the sidebar slide stops below, as the stylesheet opens its block', () => {
	const stop = stylesheet.lastIndexOf('.godmin-navigation__screen-wrapper {')
	const opens = stylesheet.lastIndexOf('@media (', stop)
	const below = Number(groupOf(/^@media \(max-width: (\d+)px\)/.exec(stylesheet.slice(opens))))
	const edge = Object.entries(breakpoints).find(([, value]) => value === below + 1)?.[0]
	const section = (sections.get('frame.md')?.get('The sidebar slide') ?? '').replace(/\s+/g, ' ')

	expect(stylesheet.slice(stop, stylesheet.indexOf('}', stop)), 'the last wrapper rule stops the slide').toMatch(
		/animation-duration: 0s;/,
	)
	expect(edge, `no breakpoint is ${below + 1}, the first width the slide plays at`).toBeDefined()
	expect(section).toContain(`\`${edge}\` (${below + 1}px)`)
})

test('the motion page points the tokens of the drawer motion to the frame page', () => {
	const tokens = valuesGiven(FRAME).flatMap((given) => given.parts.filter((part) => part.startsWith('--wpds-motion-')))
	const rows = (pages.get('motion.md') ?? '')
		.split('\n')
		.filter((line) => tokens.some((token) => line.startsWith(`| \`${token}\``)))
	const pointed = '| The phone drawer, see [The drawer](./frame.md#the-drawer) |'

	expect(rows.length, 'the motion page names the tokens of the drawer motion').toBeGreaterThan(0)
	expect(rows.filter((row) => !row.endsWith(pointed))).toEqual([])
})
