// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

import * as stories from '../../stories/lists.stories.js'
import { backgroundOf, boxOf, edgesOf, find, middleAcross, middleDown, onTop } from '../../stories/measure.js'

const { WideTable } = composeStories(stories)

/** How far a test scrolls a wide table sideways. */
const SHIFT = 160

/** The box DataViews scrolls the rows of the list page in. */
const SCROLLER = '.godmin-page__list .dataviews-layout__container'

/** The window widths a list opens on the same columns at, from the widest. */
const WIDTHS = [1920, 1280, 783, 782]

/** Returns the list region once GodMin marks it wide, failing when it never does. */
async function wideRegion(): Promise<Element> {
	await expect.poll(() => document.querySelector('.godmin-page__list--wide')).not.toBeNull()
	return find('.godmin-page__list--wide')
}

/** Returns the words of the header cells of the table a reader sees. */
function headerWords(): string[] {
	return [...document.querySelectorAll('.dataviews-view-table thead th')]
		.filter((cell) => cell.checkVisibility())
		.map((cell) => cell.textContent)
}

/** Returns how far the scroll box holds content past its width. */
function overflow(): number {
	const scroller = find(SCROLLER)
	return scroller.scrollWidth - scroller.clientWidth
}

/** Checks two positions meet within half a pixel. */
function near(actual: number, expected: number, what: string) {
	expect(Math.abs(actual - expected), what).toBeLessThan(0.5)
}

/** Returns how the title cell of the first row is placed and what its end line holds. */
function titlePlacement(): { position: string; line: string } {
	const title = edgesOf('Report 1').title.cell
	return { position: getComputedStyle(title).position, line: getComputedStyle(title, '::after').content }
}

test('shows the same columns at 1920, 1280, 783 and 782', async () => {
	render(<WideTable />)
	const seen: string[][] = []

	for (const width of WIDTHS) {
		await page.viewport(width, 800)
		await wideRegion()
		expect(overflow(), `the table is wider than its space at ${width}`).toBeGreaterThan(1)
		seen.push(headerWords())
	}

	expect(seen[0].length).toBe(12)
	expect(seen).toEqual(WIDTHS.map(() => seen[0]))
})

test('freezes nothing at 782 and freezes the title at 783', async () => {
	render(<WideTable />)

	await page.viewport(782, 800)
	await wideRegion()
	expect(titlePlacement()).toEqual({ position: 'static', line: 'none' })

	await page.viewport(783, 800)
	await expect.poll(titlePlacement).toEqual({ position: 'sticky', line: '""' })
})

test('keeps the checkbox and title frozen and the actions pinned at 1920', async () => {
	await page.viewport(1920, 1080)
	render(<WideTable />)
	await wideRegion()
	expect(overflow()).toBeGreaterThan(SHIFT)
	const canvas = boxOf('.godmin-layout__canvas')
	const before = edgesOf('Report 1')
	near(before.checkbox.box.left, canvas.left, 'the list starts at the canvas edge')
	near(before.actions.box.right, canvas.right, 'the list ends at the canvas edge')

	find(SCROLLER).scrollLeft = SHIFT
	const after = edgesOf('Report 1')
	const ticked = edgesOf('Report 2')
	const list = backgroundOf(find('.godmin-page__list .dataviews-wrapper'))
	const tint = backgroundOf(ticked.title.cell.parentElement as HTMLElement)

	near(after.checkbox.box.left, before.checkbox.box.left, 'the checkbox stays')
	near(after.title.box.left, before.title.box.left, 'the title stays')
	near(after.titleHeader.box.left, before.titleHeader.box.left, 'the title header stays')
	near(after.actions.box.right, before.actions.box.right, 'the actions stay')
	near(after.first.box.left, before.first.box.left - SHIFT, 'the other columns move')
	expect(onTop(after.title.cell, after.title.box.right - 2, middleDown(after.title.box))).toBe(true)
	expect(onTop(after.actions.cell, after.actions.box.left + 2, middleDown(after.actions.box))).toBe(true)
	expect([backgroundOf(after.checkbox.cell), backgroundOf(after.title.cell)]).toEqual([list, list])
	expect([backgroundOf(ticked.checkbox.cell), backgroundOf(ticked.title.cell)]).toEqual([tint, tint])
})

test('keeps the header row over the frozen cells as the rows scroll down', async () => {
	await page.viewport(1280, 600)
	render(<WideTable />)
	await wideRegion()
	const scroller = find(SCROLLER)
	const row = edgesOf('Report 1').title.box.height
	expect(scroller.scrollHeight - scroller.clientHeight, 'the rows scroll down by a row').toBeGreaterThan(row)

	scroller.scrollTop = row
	const header = edgesOf('Report 1').titleHeader

	expect(onTop(header.cell, middleAcross(header.box), middleDown(header.box))).toBe(true)
})

test('leaves a table that fits unfrozen', async () => {
	render(<WideTable columns={2} />)

	expect(overflow()).toBe(0)
	expect(document.querySelector('.godmin-page__list--wide')).toBeNull()
	expect(titlePlacement()).toEqual({ position: 'static', line: 'none' })
})

test("holds the frozen title at the right edge right to left, by godmin's logical properties only", async () => {
	render(
		<div dir="rtl">
			<WideTable />
		</div>,
	)
	await wideRegion()
	const scroller = find(SCROLLER)
	const before = edgesOf('Report 1')

	scroller.scrollLeft = -SHIFT
	const after = edgesOf('Report 1')

	expect(scroller.scrollLeft).toBe(-SHIFT)
	near(after.first.box.right, before.first.box.right + SHIFT, 'the other columns move')
	near(after.title.box.right, before.title.box.right, 'the title keeps its right edge')
	near(after.checkbox.box.right, before.checkbox.box.right, 'the checkbox keeps its right edge')
})
