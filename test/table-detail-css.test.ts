// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { DENSE_BREAKPOINT } from '../src/breakpoints.js'
import { atRuleBodies, blockOf, blocksOf, ruleOf, unlayered } from './css-rules.js'
import { base } from './styles.js'

/** The label that opens its row, and the chevron inside it. */
const TOGGLE = '.godmin-table__toggle'
const ICON = '.godmin-table__toggle-icon'

/** The row that opens under a row, its one cell, and the open part drawn as a card inside it. */
const DETAIL = '.godmin-table tbody tr.godmin-table__detail'
const CELL = `${DETAIL} > td`
const BODY = '.godmin-table__detail-body'

/** The two wrappers that grow an open part, and the marks Base UI sets on a row as it starts to open or close. */
const MOTION = '.godmin-table__detail-motion'
const MOVING = ':is([data-starting-style], [data-ending-style])'

/** The header row of a table nested in an open part, and the pinned actions cell of that header on a phone. */
const NESTED_HEAD = '.godmin-table__detail .godmin-table thead tr'
const PINNED_HEAD = '.godmin-table__detail .godmin-table-scroll .godmin-table thead .godmin-table__actions'

/** The last rule of the table and the first block of the small viewport overrides. */
const TABLE_END = '.godmin-table-scroll:focus-visible {'
const SMALL_START = '@media (max-width: 781px) {'

/** The parts of the sheet a rule sits in: every width, a narrow region, motion allowed, or a phone. */
type Part = 'every width' | 'narrow region' | 'motion allowed' | 'phone'

/** The widest region and window the narrow rules hold at. */
const NARROW = `(max-width: ${DENSE_BREAKPOINT - 1}px)`

/** Returns the one block of rules that moves a detail row while the reader allows motion. */
function motionBlock(): string {
	const found = blocksOf('@media not (prefers-reduced-motion)').filter((body) => body.includes(MOTION))

	expect(found, 'one motion block moves the detail row').toHaveLength(1)

	return found[0]
}

/** The sheet with the body of every media and container block taken out, so only the rules of every width stay. */
const everyWidth = atRuleBodies(['media', 'container']).reduce((css, body) => css.replace(body, ''), base)

/** Returns the text of one part of the sheet. */
function partOf(part: Part): string {
	const parts: Record<Part, () => string> = {
		'every width': () => everyWidth,
		'narrow region': () => blockOf(`@container ${NARROW}`),
		'motion allowed': motionBlock,
		phone: () => blockOf(`@media ${NARROW}`),
	}
	return parts[part]()
}

/** Returns each declaration of the rule a selector opens in a part of the sheet, as a property and its value. */
function declarationsOf(part: Part, selector: string): [string, string][] {
	return ruleOf(selector, partOf(part))
		.split(';')
		.map((declaration) => declaration.replace(/\s+/g, ' ').trim())
		.filter((declaration) => declaration !== '')
		.map((declaration): [string, string] => {
			const colon = declaration.indexOf(':')
			return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()]
		})
}

/** Returns the custom property of a design token as a value. */
function token(name: string): string {
	return `var(--wpds-${name})`
}

/** The medium padding that frames an open part, the focus ring, the card stroke and the card surface. */
const FRAME = token('dimension-padding-md')
const RING = `${token('border-width-focus')} solid ${token('color-stroke-focus')}`
const STROKE = `${token('border-width-xs')} solid ${token('color-stroke-surface-neutral')}`
const SURFACE = token('color-background-surface-neutral-strong')

/** Each declaration a rule of the detail row makes: where it sits, its selector, the property and the value. */
const DECLARATIONS: [Part, string, string, string][] = [
	['every width', TOGGLE, 'display', 'inline-flex'],
	['every width', TOGGLE, 'vertical-align', 'middle'],
	['every width', TOGGLE, 'align-items', 'center'],
	['every width', TOGGLE, 'gap', token('dimension-gap-sm')],
	['every width', TOGGLE, 'margin', '0'],
	['every width', TOGGLE, 'padding', '0'],
	['every width', TOGGLE, 'border', '0'],
	['every width', TOGGLE, 'background', 'none'],
	['every width', TOGGLE, 'font', 'inherit'],
	['every width', TOGGLE, 'color', token('color-foreground-interactive-neutral')],
	['every width', TOGGLE, 'text-align', 'start'],
	['every width', TOGGLE, 'cursor', token('cursor-control')],
	['every width', TOGGLE, 'appearance', 'none'],
	['every width', `${TOGGLE}:hover`, 'color', token('color-foreground-interactive-brand')],
	['every width', `${TOGGLE}:focus-visible`, 'outline', RING],
	['every width', `${TOGGLE}:focus-visible`, 'outline-offset', '2px'],
	['every width', ICON, 'flex', 'none'],
	['every width', `${TOGGLE}[data-panel-open] ${ICON}`, 'rotate', '180deg'],
	['every width', DETAIL, 'border-block-start', '0'],
	['every width', `${DETAIL}:is(:hover, :has(:focus-visible)) > *`, 'background', 'none'],
	['every width', `${DETAIL}[hidden]:not([hidden='until-found'])`, 'display', 'none'],
	['every width', `${DETAIL}[hidden='until-found']`, 'display', 'block'],
	['every width', CELL, 'height', 'auto'],
	['every width', CELL, 'padding', `0 ${FRAME} ${FRAME}`],
	['every width', BODY, 'box-sizing', 'border-box'],
	['every width', BODY, 'position', 'sticky'],
	['every width', BODY, 'inset-inline-start', FRAME],
	['every width', BODY, 'max-inline-size', `calc(100cqi - 2 * ${FRAME})`],
	['every width', BODY, 'padding', token('dimension-padding-2xl')],
	['every width', BODY, 'border', STROKE],
	['every width', BODY, 'border-radius', token('border-radius-lg')],
	['every width', BODY, 'overflow', 'clip'],
	['every width', BODY, 'background-color', SURFACE],
	['every width', BODY, 'color', token('color-foreground-content-neutral')],
	['every width', BODY, 'text-align', 'start'],
	['every width', BODY, 'overflow-wrap', 'anywhere'],
	['every width', '.godmin-table-scroll:has(.godmin-table__detail)', 'container-type', 'inline-size'],
	['narrow region', BODY, 'padding', token('dimension-padding-lg')],
	['every width', NESTED_HEAD, 'border-block-start', '0'],
	['every width', `${NESTED_HEAD}:is(:hover, :has(:focus-visible)) > *`, 'background', 'none'],
	['every width', `${CELL}:has(> ${MOTION})`, 'padding', '0'],
	['every width', MOTION, 'display', 'grid'],
	['every width', MOTION, 'grid-template-rows', '1fr'],
	['every width', MOTION, 'overflow', 'clip'],
	['every width', `${MOTION} > *`, 'align-self', 'start'],
	['every width', `${MOTION} > *`, 'min-block-size', '0'],
	['every width', `${MOTION} > *`, 'overflow', 'clip'],
	['every width', `${MOTION} > * > ${BODY}`, 'margin', `0 ${FRAME} ${FRAME}`],
	['every width', `${DETAIL}${MOVING}`, 'opacity', '0'],
	['every width', `.godmin-table__detail${MOVING} > td > ${MOTION}`, 'grid-template-rows', '0fr'],
	['motion allowed', ICON, 'transition', 'rotate 0.15s ease-out'],
	['motion allowed', DETAIL, 'transition', 'opacity 150ms ease-out'],
	['motion allowed', MOTION, 'transition', 'grid-template-rows 150ms ease-out'],
	['phone', PINNED_HEAD, 'background', SURFACE],
]

/** Each rule of the detail row once, with the properties it sets in the order the table lists them. */
const RULES = [...new Set(DECLARATIONS.map(([part, selector]) => `${part}\n${selector}`))].map((key) => {
	const [part, selector] = key.split('\n') as [Part, string]
	const properties = DECLARATIONS.filter((row) => row[0] === part && row[1] === selector).map((row) => row[2])
	return { part, selector, properties }
})

/** The selectors of the rules that hold at every width. */
const EVERY_WIDTH = RULES.filter(({ part }) => part === 'every width').map(({ selector }) => selector)

/** Returns the selector of every rule whose selector matches a pattern and whose body sets a property. */
function selectorsSetting(property: string, selector: RegExp, css = base): string[] {
	return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
		.map((found) => [found[1].replace(/\/\*[\s\S]*?\*\//g, '').trim(), found[2]])
		.filter(([prelude, body]) => selector.test(prelude) && new RegExp(`(?:^|[\\s;])${property}:`).test(body))
		.map(([prelude]) => prelude)
}

test.each(DECLARATIONS)('in the rules for %s, %s sets %s to %s', (part, selector, property, value) => {
	expect(new Map(declarationsOf(part, selector)).get(property)).toBe(value)
})

test.each(RULES)('in the rules for $part, $selector sets nothing else', ({ part, selector, properties }) => {
	expect(declarationsOf(part, selector).map(([property]) => property)).toEqual(properties)
})

test('sets how a detail row displays in its two hidden rules alone, so an open row stays a table row', () => {
	expect(selectorsSetting('display', /\.godmin-table__detail(?![\w-])/)).toEqual([
		`${DETAIL}[hidden]:not([hidden='until-found'])`,
		`${DETAIL}[hidden='until-found']`,
	])
})

test('turns only a region that holds a detail row into a size container, so every other table keeps its width', () => {
	expect(selectorsSetting('container-type', /godmin-table/)).toEqual(['.godmin-table-scroll:has(.godmin-table__detail)'])
})

test('turns the chevron and moves a detail row only while the reader allows motion', () => {
	const still = base.replace(motionBlock(), '')

	expect(selectorsSetting('transition', /godmin-table__(?:toggle|detail)/, still)).toEqual([])
})

test('keeps the pinned header cell of a nested table on its surface on a phone alone', () => {
	expect(everyWidth).not.toContain(PINNED_HEAD)
	expect(blocksOf(`@container ${NARROW}`).join('\n')).not.toContain(PINNED_HEAD)
})

test('sits in the godmin layer after the table rules and before the small viewport overrides', () => {
	const starts = EVERY_WIDTH.map((selector) => everyWidth.indexOf(`${selector} {`))
	const blocks = [base.indexOf(`@container ${NARROW} {`), base.indexOf(motionBlock())]

	expect(EVERY_WIDTH.filter((selector) => unlayered(selector)), 'every rule in the godmin layer').toEqual([])
	expect(Math.min(...starts), 'after the table rules').toBeGreaterThan(everyWidth.indexOf(TABLE_END))
	expect(Math.max(...starts), 'before the small viewport overrides').toBeLessThan(everyWidth.indexOf(SMALL_START))
	expect(Math.min(...blocks), 'the blocks after the table rules').toBeGreaterThan(base.indexOf(TABLE_END))
	expect(Math.max(...blocks), 'the blocks before the small viewport overrides').toBeLessThan(base.indexOf(SMALL_START))
})
