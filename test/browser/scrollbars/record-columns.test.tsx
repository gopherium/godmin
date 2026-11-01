// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

import { columnsOf, find } from '../../../stories/measure.js'
import * as records from '../../../stories/records.stories.js'

const { LongRecord } = composeStories(records)

/** The two boxes that scroll a record. */
const MAIN = '.godmin-page__main'
const SPLIT = '.godmin-page__split'

/** The page width the columns fold at. */
const FOLD = 824

/** How far a walk goes each side of the fold. */
const REACH = 24

/** The windows that give the fold, the sidebar on screen and folded away. */
const FOLDS = [{ window: 1188 }, { window: 904 }]

/** Returns how far a box holds content past its height. */
function overflowOf(selector: string): number {
	const box = find(selector)
	return box.scrollHeight - box.clientHeight
}

/** Tells whether the details start past the end of the main work. */
function sideBySide(): boolean {
	const { main, details } = columnsOf()
	return details.left > main.right
}

/** Returns the window widths of a walk across the fold, up and then down. */
function walkAcross(fold: number): number[] {
	const up = Array.from({ length: 2 * REACH + 1 }, (_, step) => fold - REACH + step)
	return [...up, ...up.toReversed()]
}

test('draws a real scrollbar on a long column', async () => {
	render(<LongRecord />)
	await expect.poll(() => overflowOf(MAIN)).toBeGreaterThan(0)

	expect(find(MAIN).offsetWidth).toBeGreaterThan(find(MAIN).clientWidth)
})

test.each(FOLDS)('leaves the columns side by side when a record opens at the fold, at $window', async ({ window }) => {
	await page.viewport(window, 800)
	render(<LongRecord />)
	await expect.poll(() => columnsOf().page.width).toBe(FOLD)

	expect(sideBySide()).toBe(true)
})

test.each(FOLDS)('folds at one width up and down, with one box scrolling, at $window', async ({ window }) => {
	await page.viewport(window - REACH, 800)
	render(<LongRecord />)

	for (const width of walkAcross(window)) {
		await page.viewport(width, 800)
		await expect.poll(() => columnsOf().page.width).toBe(FOLD + width - window)
		expect(sideBySide(), `the columns at ${width}`).toBe(width >= window)
		expect(overflowOf(SPLIT) > 0 && overflowOf(MAIN) > 0, `two boxes scroll at ${width}`).toBe(false)
	}
})
