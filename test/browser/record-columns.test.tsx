// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { RecordPage } from '../../stories/frames.js'
import * as lists from '../../stories/lists.stories.js'
import { columnsOf, find } from '../../stories/measure.js'
import * as records from '../../stories/records.stories.js'

const { Record } = composeStories(records)
const { WideTable } = composeStories(lists)

/** One window width, the page width the frame leaves there, and whether the columns sit side by side. */
interface Fit {
	width: number
	room: number
	beside: boolean
}

/** The room between the two columns. */
const GAP = 24

/** The width of the details beside the main work. */
const DETAILS = 400

/** The page width the frame leaves at the window the tests open on. */
const ROOM = 916

/** A word longer than any column. */
const LONG_WORD = 'invoice'.repeat(120)

/** The box DataViews scrolls the rows of the list page in. */
const SCROLLER = '.godmin-page__list .dataviews-layout__container'

/** Where the columns sit at each window width, from the widest. */
const FITS: Fit[] = [
	{ width: 1920, room: 1556, beside: true },
	{ width: 1280, room: 916, beside: true },
	{ width: 1188, room: 824, beside: true },
	{ width: 1187, room: 823, beside: false },
	{ width: 1024, room: 660, beside: false },
	{ width: 1023, room: 943, beside: true },
	{ width: 904, room: 824, beside: true },
	{ width: 903, room: 823, beside: false },
	{ width: 783, room: 703, beside: false },
	{ width: 782, room: 702, beside: false },
	{ width: 781, room: 733, beside: false },
	{ width: 390, room: 358, beside: false },
]

/** Checks two positions meet within half a pixel. */
function near(actual: number, expected: number, what: string) {
	expect(Math.abs(actual - expected), what).toBeLessThan(0.5)
}

/** Waits for the frame to settle on a page width, which it folds through a media query. */
async function settled(room: number) {
	await expect.poll(() => columnsOf().page.width).toBe(room)
}

/** Waits for a page width and checks where the columns sit on it. */
async function holds({ room, beside }: Fit) {
	await settled(room)
	const { main, details } = columnsOf()
	near(details.width, beside ? DETAILS : room, 'the details')
	near(main.width, beside ? room - DETAILS - GAP : room, 'the work')
}

test.each(FITS)('sets the columns at $width', async (fit) => {
	await page.viewport(fit.width, 800)
	render(<Record />)
	await holds(fit)
})

test('keeps the same columns after a resize down and up', async () => {
	render(<Record />)

	for (const fit of [...FITS, ...FITS.toReversed()]) {
		await page.viewport(fit.width, 800)
		await holds(fit)
	}
})

test('holds the columns with a long word in each', async () => {
	render(
		<AdminRoot>
			<RecordPage aside={<div>{LONG_WORD}</div>}>
				<div>{LONG_WORD}</div>
			</RecordPage>
		</AdminRoot>,
	)
	await settled(ROOM)
	const { main, details } = columnsOf()

	near(details.width, DETAILS, 'the details')
	near(main.width, ROOM - DETAILS - GAP, 'the work')
	for (const column of ['.godmin-page__main', '.godmin-page__aside']) {
		expect(find(column).scrollWidth, column).toBeLessThanOrEqual(find(column).clientWidth)
	}
})

test('holds the columns around a wide table', async () => {
	render(<WideTable aside={<div>Report details</div>} />)
	await settled(ROOM)
	await expect.poll(() => find(SCROLLER).scrollWidth).toBeGreaterThan(find(SCROLLER).clientWidth)
	const { main, details } = columnsOf()

	near(details.width, DETAILS, 'the details')
	near(main.width, ROOM - DETAILS - GAP, 'the work')
	near(main.top, details.top, 'both start on one line')
})
