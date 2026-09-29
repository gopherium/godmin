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

/**
 * Returns the stylesheet from the reduced motion guard onwards.
 * @returns The guard source.
 */
function reducedMotionGuard(): string {
	const start = base.indexOf('@media (prefers-reduced-motion: reduce)')

	expect(start, 'the stylesheet declares no reduced motion guard').toBeGreaterThan(-1)

	return base.slice(start)
}

/**
 * Returns the declarations of the rule a selector opens.
 * @param selector - The exact selector the rule starts with.
 * @param css - The stylesheet source to search, the whole sheet by default.
 * @returns The text between the rule's braces.
 */
function ruleOf(selector: string, css = base): string {
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
function blockOf(prelude: string): string {
	const start = base.indexOf(`${prelude} {`)

	expect(start, `the stylesheet has no ${prelude} block`).toBeGreaterThan(-1)

	return bodyFrom(start + prelude.length + 2)
}

/**
 * Returns the body of every at-rule of the given kinds, matching its braces.
 * @param kinds - The at-rule names to collect, such as media.
 * @returns The bodies in source order.
 */
function atRuleBodies(kinds: string[]): string[] {
	return [...base.matchAll(new RegExp(`@(?:${kinds.join('|')})\\b[^{]*\\{`, 'g'))].map((found) =>
		bodyFrom(found.index + found[0].length),
	)
}

test('lays the aside beside the content and wraps it under on a narrow page', () => {
	const split = ruleOf('.godmin-page__split')

	expect(split).toMatch(/display:\s*flex/)
	expect(split).toMatch(/flex-wrap:\s*wrap/)
	expect(split).toMatch(/align-items:\s*flex-start/)
})

test('keeps the content column at the large surface width beside an aside', () => {
	expect(ruleOf('.godmin-page__main')).toMatch(/flex:\s*1 1 var\(--wpds-dimension-surface-width-lg\)/)
})

test('gives the aside all the room the content column leaves', () => {
	expect(ruleOf('.godmin-page__aside')).toMatch(/flex:\s*999 1 0/)
})

test('folds the aside under the content before it gets narrower than the extra small surface width', () => {
	expect(ruleOf('.godmin-page__aside')).toMatch(
		/min-inline-size:\s*min\(100%, var\(--wpds-dimension-surface-width-xs\)\)/,
	)
})

test('lets the aside grow past the large surface width', () => {
	expect(ruleOf('.godmin-page__aside')).not.toMatch(/max-inline-size/)
})

test('lets a long unbroken value wrap inside the aside instead of spilling past the page', () => {
	expect(ruleOf('.godmin-page__aside')).toMatch(/overflow-wrap:\s*anywhere/)
})

test('hides an aside that renders nothing', () => {
	expect(ruleOf('.godmin-page__aside:empty')).toMatch(/display:\s*none/)
})

test('caps a form at the large surface width', () => {
	expect(ruleOf('.godmin-form')).toMatch(/max-width:\s*var\(--wpds-dimension-surface-width-lg\)/)
})

test('keeps a form a column with the medium gap', () => {
	const form = ruleOf('.godmin-form')

	expect(form).toMatch(/display:\s*flex/)
	expect(form).toMatch(/flex-direction:\s*column/)
	expect(form).toMatch(/gap:\s*var\(--wpds-dimension-gap-md\)/)
})

test('lays a form row out side by side and wraps it on a narrow form', () => {
	const row = ruleOf('.godmin-form__row')

	expect(row).toMatch(/display:\s*flex/)
	expect(row).toMatch(/flex-wrap:\s*wrap/)
	expect(row).toMatch(/align-items:\s*flex-end/)
	expect(row).toMatch(/gap:\s*var\(--wpds-dimension-gap-md\)/)
})

test('gives every field of a row a share of the line from two thirds of the extra small surface width', () => {
	const field = ruleOf('.godmin-form__row > *')

	expect(field).toMatch(/flex:\s*1 1 calc\(var\(--wpds-dimension-surface-width-xs\) \* 2 \/ 3\)/)
	expect(field).toMatch(/min-inline-size:\s*0/)
})

test('keeps a row button at its own width', () => {
	expect(ruleOf('.godmin-form__row > button')).toMatch(/flex:\s*none/)
})

test('sends a row button that wraps onto a line of its own to the end of that line', () => {
	expect(ruleOf('.godmin-form__row > button')).toMatch(/margin-inline-start:\s*auto/)
})

test('lets an inline form fill its column instead of stopping at the large surface width', () => {
	expect(ruleOf('.godmin-form--inline')).toMatch(/max-width:\s*none/)
})

test('gives a grown field three shares of the free room in its row', () => {
	expect(ruleOf('.godmin-form__row > .godmin-form__grow')).toMatch(/flex-grow:\s*3/)
})

test('keeps a button of a stacked form at its own width at the start of the column', () => {
	expect(ruleOf('.godmin-form > button')).toMatch(/align-self:\s*flex-start/)
})

test('sets the inputs and the controls of a repeated row on one line that wraps on a narrow list', () => {
	const line = ruleOf('.godmin-rows__line')

	expect(line).toMatch(/display:\s*flex/)
	expect(line).toMatch(/flex-wrap:\s*wrap/)
	expect(line).toMatch(/align-items:\s*flex-end/)
	expect(line).toMatch(/gap:\s*var\(--wpds-dimension-gap-md\)/)
})

test('keeps the inputs of a repeated row a small surface wide before its controls share the line', () => {
	const inputs = ruleOf('.godmin-rows__inputs')

	expect(inputs).toMatch(/flex:\s*1 1 var\(--wpds-dimension-surface-width-sm\)/)
	expect(inputs).toMatch(/min-inline-size:\s*0/)
})

test('keeps the controls of a repeated row at their own width at the end of their line', () => {
	const controls = ruleOf('.godmin-rows__controls')

	expect(controls).toMatch(/flex:\s*none/)
	expect(controls).toMatch(/margin-inline-start:\s*auto/)
})

test('keeps every line inside a table actions cell unbroken', () => {
	expect(ruleOf('.godmin-table__actions *')).toMatch(/white-space:\s*nowrap/)
})

test('sets the remove control of a repeated row a medium gap further from the arrows', () => {
	expect(ruleOf('.godmin-rows__remove')).toMatch(/margin-inline-start:\s*var\(--wpds-dimension-gap-md\)/)
})

test('folds a form row with no breakpoint of its own', () => {
	for (const body of atRuleBodies(['media', 'container'])) {
		expect(body).not.toMatch(/godmin-form/)
	}
})

test('folds the aside with no breakpoint of its own', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/godmin-page__(?:split|main|aside)/)
	}
})

test('resets the log list margin, padding and markers', () => {
	const list = ruleOf('.godmin-log-list')

	expect(list).toMatch(/margin:\s*0/)
	expect(list).toMatch(/padding:\s*0/)
	expect(list).toMatch(/list-style:\s*none/)
})

test('draws the log list as one bordered surface from the tokens', () => {
	const list = ruleOf('.godmin-log-list')

	expect(list).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-strong\)/)
	expect(list).toMatch(
		/border:\s*var\(--wpds-border-width-xs\) solid var\(--wpds-color-stroke-surface-neutral\)/,
	)
	expect(list).toMatch(/border-radius:\s*var\(--wpds-border-radius-lg\)/)
})

test('lets a long unbroken word wrap inside a log list', () => {
	expect(ruleOf('.godmin-log-list')).toMatch(/overflow-wrap:\s*anywhere/)
})

test('hides a log list with no items', () => {
	expect(ruleOf('.godmin-log-list:empty')).toMatch(/display:\s*none/)
})

test('stacks the parts of a log item with the extra small gap', () => {
	const item = ruleOf('.godmin-log-list__item')

	expect(item).toMatch(/display:\s*flex/)
	expect(item).toMatch(/flex-direction:\s*column/)
	expect(item).toMatch(/gap:\s*var\(--wpds-dimension-gap-xs\)/)
})

test('pads each log item from the padding tokens and draws no border on it', () => {
	const item = ruleOf('.godmin-log-list__item')

	expect(item).toMatch(
		/padding:\s*var\(--wpds-dimension-padding-sm\) var\(--wpds-dimension-padding-md\)/,
	)
	expect(item, 'the divider rule sits above the plain item rule').not.toMatch(/border/)
})

test('draws a weak divider between log items and none above the first', () => {
	expect(ruleOf('.godmin-log-list__item + .godmin-log-list__item')).toMatch(
		/border-block-start:\s*var\(--wpds-border-width-xs\) solid\s+var\(--wpds-color-stroke-surface-neutral-weak\)/,
	)
})

test('wraps the log header line so the actions drop under the label in a narrow column', () => {
	const header = ruleOf('.godmin-log-list__header')

	expect(header).toMatch(/display:\s*flex/)
	expect(header).toMatch(/flex-wrap:\s*wrap/)
	expect(header).toMatch(/align-items:\s*center/)
})

test('spaces the log header line with the gap tokens', () => {
	expect(ruleOf('.godmin-log-list__header')).toMatch(
		/gap:\s*var\(--wpds-dimension-gap-xs\) var\(--wpds-dimension-gap-sm\)/,
	)
})

test('lets the log label take the free room and shrink inside a narrow column', () => {
	const label = ruleOf('.godmin-log-list__label')

	expect(label).toMatch(/flex:\s*1 1 auto/)
	expect(label).toMatch(/min-inline-size:\s*0/)
})

test('keeps the log actions at the end of their line, also after they wrap', () => {
	const actions = ruleOf('.godmin-log-list__actions')

	expect(actions).toMatch(/margin-inline-start:\s*auto/)
	expect(actions, 'a wrapped row of actions starts at the start edge').toMatch(/justify-content:\s*flex-end/)
	expect(actions, 'a group that cannot shrink spills past a narrow column').not.toMatch(
		/flex:\s*none/,
	)
})

test('lays the log actions out as a wrapping row with the extra small gap', () => {
	const actions = ruleOf('.godmin-log-list__actions')

	expect(actions).toMatch(/display:\s*flex/)
	expect(actions).toMatch(/flex-wrap:\s*wrap/)
	expect(actions).toMatch(/align-items:\s*center/)
	expect(actions).toMatch(/gap:\s*var\(--wpds-dimension-gap-xs\)/)
})

test('keeps the line breaks of a log body', () => {
	expect(ruleOf('.godmin-log-list__body')).toMatch(/white-space:\s*pre-line/)
})

test('mutes a log time with the weak content colour', () => {
	expect(ruleOf('.godmin-log-list__time')).toMatch(
		/color:\s*var\(--wpds-color-foreground-content-neutral-weak\)/,
	)
})

test('folds the log list with no breakpoint of its own', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/godmin-log-list/)
	}
})

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

test('tints the cells of a table row under the pointer or holding keyboard focus with the weak surface colour', () => {
	expect(ruleOf('.godmin-table tbody tr:is(:hover, :has(:focus-visible)) > *')).toMatch(
		/background:\s*var\(--wpds-color-background-surface-neutral-weak\)/,
	)
})

test('leaves a table row untinted when a pointer press alone holds focus in it', () => {
	expect(base).not.toMatch(/tr:is\([^)]*:focus-within/)
})

test('tints a table row at every width', () => {
	const bodies = atRuleBodies(['media', 'container'])

	expect(bodies.length, 'the collector found no at-rule to inspect').toBeGreaterThan(0)
	for (const body of bodies) {
		expect(body).not.toMatch(/tr:is\(:hover, :has\(:focus-visible\)\)/)
	}
})

test('keeps the row controls of a table at the end edge of their cell', () => {
	expect(ruleOf('.godmin-table__actions .godmin-rows__controls')).toMatch(/justify-content:\s*flex-end/)
})

test('pins the actions column of a scrolling table to the end edge on a small screen', () => {
	const actions = ruleOf('.godmin-table-scroll .godmin-table__actions', blockOf('@media (max-width: 639px)'))

	expect(actions).toMatch(/position:\s*sticky/)
	expect(actions).toMatch(/inset-inline-end:\s*0/)
	expect(actions).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral\)/)
})

test('draws the start edge of the pinned actions column with an inset shadow rather than a border', () => {
	const actions = ruleOf('.godmin-table-scroll .godmin-table__actions', blockOf('@media (max-width: 639px)'))

	expect(actions).toMatch(
		/box-shadow:\s*inset var\(--wpds-border-width-xs\) 0 0 var\(--wpds-color-stroke-surface-neutral\)/,
	)
	expect(actions, 'a collapsed border paints badly on a sticky cell').not.toMatch(/^\s*border[\w-]*:/m)
})

test('keeps the actions column in the flow of a table at 640px and wider', () => {
	const wide = base.replace(blockOf('@media (max-width: 639px)'), '')

	expect(wide).not.toMatch(/position:\s*sticky/)
})

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

test('raises the drawer above the toast region', () => {
	const css = base.replace(/\/\*[\s\S]*?\*\//g, '')
	const drawer = css.match(/\.godmin-layout\s*\{[^}]*--wp-ui-drawer-z-index:\s*(\d+)/)
	const toasts = [...css.matchAll(/\.godmin-toasts\s*\{[^}]*?(?:^|[^-])z-index:\s*(\d+)/gm)]
		.map((found) => Number(found[1]))

	expect(drawer, 'the layout sets no drawer z-index').not.toBeNull()
	expect(toasts.length, 'the toast region sets no z-index').toBeGreaterThan(0)
	expect(Number(drawer?.[1])).toBeGreaterThan(Math.max(...toasts))
})

test('paints the chrome the frame is themed with', () => {
	const layout = base.slice(base.indexOf('.godmin-layout {'))

	expect(layout).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-weak\)/)
	expect(layout).toMatch(/color:\s*var\(--wpds-color-foreground-content-neutral\)/)
})

test('fades the ghosts in after a delay, so a fast load shows none', () => {
	const region = base.slice(base.indexOf('.godmin-loading-screen,'))
	const rule = region.slice(0, region.indexOf('}'))

	expect(rule).toContain('.godmin-loading-rows')
	expect(rule).toMatch(/opacity:\s*0/)
	expect(rule).toMatch(/animation:[^;]*godmin-fade-in/)
	expect(rule).toMatch(/animation:[^;]*150ms/)
	expect(rule).toMatch(/animation:[^;]*forwards/)
})

test('fades arriving content in, so a ghost never snaps away', () => {
	expect(base).toMatch(/\.godmin-arrival\s*\{[^}]*animation:[^;]*godmin-fade-in/)
	expect(base).toMatch(/@keyframes godmin-fade-in\s*\{\s*0%\s*\{\s*opacity:\s*0/)
})

test('stops fading for a reduced motion preference', () => {
	const guard = reducedMotionGuard()

	for (const faded of ['.godmin-loading-screen', '.godmin-loading-rows', '.godmin-arrival']) {
		expect(guard, `${faded} still fades`).toContain(faded)
	}
	expect(guard).toMatch(/animation-duration:\s*1ms/)
})

test('keeps the reveal and the delay that a reduced motion preference must not undo', () => {
	const guard = reducedMotionGuard()

	expect(guard, 'the shorthand resets the delay and the fill').not.toMatch(/animation:\s/)
	expect(guard, 'a named animation of none leaves the ghost at opacity zero').not.toMatch(
		/animation-name:/,
	)
	expect(guard, 'the ghost must stay hidden for its first 150ms').not.toMatch(/animation-delay:/)
	expect(guard, 'forwards is what holds the revealed state').not.toMatch(/animation-fill-mode:/)
})

test('pads the screen ghost, which can render with no frame around it', () => {
	expect(base).toMatch(/\.godmin-loading-screen\s*\{[^}]*padding/)
})

test('shapes every ghost bar with a height of its own', () => {
	expect(base).toMatch(/\.godmin-loading-screen__title\s*\{[^}]*height/)
	expect(base).toMatch(/\.godmin-loading-screen__stroke\s*\{[^}]*height/)
	expect(base).toMatch(/\.godmin-loading-rows__row\s*\{[^}]*height/)
})
