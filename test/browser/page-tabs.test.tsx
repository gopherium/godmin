// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react'
import { Tabs } from '@wordpress/ui'
import { expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { PageTab, PageTabs } from '../../src/page-tabs.js'

/** The tab under test on the page, and the same tab as WordPress draws it. */
const PAGE_TAB = '.godmin-page-tabs__tab'
const WORDPRESS_TAB = '[role="tab"]'

/** What each side of the comparison draws behind a tab. */
const DRAWN = [
	'backgroundColor',
	'boxShadow',
	'borderRadius',
	'opacity',
	'outlineColor',
	'outlineOffset',
	'outlineStyle',
	'outlineWidth',
	'position',
	'zIndex',
] as const

/** What the comparison reads of a tab itself. */
const OWN = ['color', 'cursor', 'fontSize', 'fontWeight', 'lineHeight', 'whiteSpace'] as const

/** How long to wait for the shade of a tab to fade in, were it to show. */
const PAST_THE_FADE = 200

/** The room a label leaves around itself, read as edges from the box of its tab. */
const EDGES = ['top', 'bottom', 'left', 'right'] as const

/** Renders a row of WordPress's minimal tabs above a row of page tabs with the same labels. */
function BothRows() {
	return (
		<AdminRoot>
			<Tabs.Root defaultValue="drafts">
				<Tabs.List variant="minimal">
					<Tabs.Tab value="drafts">Drafts</Tabs.Tab>
					<Tabs.Tab value="pending">Pending</Tabs.Tab>
				</Tabs.List>
				<Tabs.Panel value="drafts" />
				<Tabs.Panel value="pending" />
			</Tabs.Root>
			<PageTabs label="Status">
				<PageTab href="#drafts" current>
					Drafts
				</PageTab>
				<PageTab href="#pending">Pending</PageTab>
			</PageTabs>
		</AdminRoot>
	)
}

/** Returns the tab of a row that reads as given. */
function tabIn(selector: string, label: string): HTMLElement {
	const found = [...document.querySelectorAll<HTMLElement>(selector)].find((tab) => tab.textContent === label)
	if (found === undefined) {
		throw new Error(`no tab reads ${label}`)
	}
	return found
}

/** Returns the named computed styles of an element or of one of its pseudo elements. */
function read(element: Element, names: readonly string[], pseudo?: string): Record<string, string> {
	const style = getComputedStyle(element, pseudo) as unknown as Record<string, string>
	return Object.fromEntries(names.map((name) => [name, style[name]]))
}

/** Waits for the fade of a tab's shade to end. */
async function settled(tab: Element) {
	await expect.poll(() => getComputedStyle(tab, '::after').opacity).toBe('1')
}

/** Focuses a tab after a key press and returns what it draws. */
async function focusedByKeyboard(tab: HTMLElement): Promise<Record<string, string>> {
	await userEvent.keyboard('{Shift}')
	tab.focus()
	await settled(tab)
	return read(tab, [...DRAWN, ...EDGES], '::after')
}

/** Checks the page tab and the WordPress tab with one label draw the same thing. */
function drawsTheSame(label: string) {
	const mine = tabIn(PAGE_TAB, label)
	const theirs = tabIn(WORDPRESS_TAB, label)

	expect(read(mine, OWN), `the ${label} tab`).toEqual(read(theirs, OWN))
	expect(read(mine, [...DRAWN, ...EDGES], '::after'), `what the ${label} tab draws`).toEqual(
		read(theirs, [...DRAWN, ...EDGES], '::after'),
	)
}

test('draws a resting tab as WordPress draws one', () => {
	render(<BothRows />)

	drawsTheSame('Pending')
})

test('draws the current tab as WordPress draws a selected tab', () => {
	render(<BothRows />)

	drawsTheSame('Drafts')
})

test('draws a tab under the pointer as WordPress does', async () => {
	render(<BothRows />)

	await userEvent.hover(tabIn(WORDPRESS_TAB, 'Pending'))
	await settled(tabIn(WORDPRESS_TAB, 'Pending'))
	const theirs = read(tabIn(WORDPRESS_TAB, 'Pending'), [...DRAWN, ...EDGES], '::after')
	await userEvent.hover(tabIn(PAGE_TAB, 'Pending'))
	await settled(tabIn(PAGE_TAB, 'Pending'))

	expect(read(tabIn(PAGE_TAB, 'Pending'), [...DRAWN, ...EDGES], '::after')).toEqual(theirs)
})

test('leaves the current tab plain under the pointer, as WordPress does', async () => {
	render(<BothRows />)

	await userEvent.hover(tabIn(PAGE_TAB, 'Drafts'))
	await new Promise((done) => setTimeout(done, PAST_THE_FADE))

	expect(getComputedStyle(tabIn(PAGE_TAB, 'Drafts'), '::after').opacity).toBe('0')
})

test('rings a tab the keyboard reaches as WordPress does', async () => {
	render(<BothRows />)
	const theirs = await focusedByKeyboard(tabIn(WORDPRESS_TAB, 'Drafts'))

	expect(await focusedByKeyboard(tabIn(PAGE_TAB, 'Drafts'))).toEqual(theirs)
})

test('underlines the current tab as wide as its label, in the colour of the WordPress line', () => {
	render(<BothRows />)
	const tab = tabIn(PAGE_TAB, 'Drafts').getBoundingClientRect()
	const line = document.querySelector('.godmin-page-tabs__line') as HTMLElement
	const indicator = document.querySelector('[role="tablist"] > [class*="indicator"]') as HTMLElement
	const box = line.getBoundingClientRect()

	expect(box.left).toBe(tab.left)
	expect(box.right).toBe(tab.right)
	expect(box.bottom).toBe(tab.bottom)
	expect(box.height).toBe(indicator.getBoundingClientRect().height)
	expect(getComputedStyle(line).backgroundColor).toBe(getComputedStyle(indicator).backgroundColor)
})

test('keeps the row of a narrow window scrolling, with the ring inside the tab', async () => {
	await page.viewport(240, 600)
	render(
		<AdminRoot>
			<PageTabs label="Status">
				<PageTab href="#one" current>
					Published posts and pages
				</PageTab>
				<PageTab href="#two">Drafts waiting for a review</PageTab>
			</PageTabs>
		</AdminRoot>,
	)
	const row = document.querySelector('.godmin-page-tabs') as HTMLElement

	await expect.poll(() => row.classList.contains('godmin-page-tabs--scrolling')).toBe(true)
	expect(getComputedStyle(row).overflowX).toBe('auto')
	expect(getComputedStyle(tabIn(PAGE_TAB, 'Published posts and pages'), '::before').content).toBe('""')
})

test('lets the shade of a row that fits run past its first label', () => {
	render(<BothRows />)

	expect(getComputedStyle(document.querySelector('.godmin-page-tabs') as HTMLElement).overflowX).toBe('visible')
})
