// SPDX-License-Identifier: Apache-2.0

import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { sidebarAppRouter } from '../sidebar-app.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** The rows of the sidebar app's root screen, in order. */
const ROWS = ['Posts', 'Pages', 'Users', 'Chats', 'Later']

/** Where a part sits in the window and how big it is, rounded to whole pixels. */
type Box = [x: number, y: number, width: number, height: number]

/** Draws the sidebar app on the posts page at a width and waits for its canvas. */
async function renderAppAt(width: number) {
	await page.viewport(width, 800)
	render(
		<AdminRoot writeTimeout={PATIENT_LIMIT}>
			<RouterProvider router={sidebarAppRouter('/posts')} />
		</AdminRoot>,
	)
	await screen.findByRole('main')
}

/** Returns where an element sits in the window and how big it is. */
function boxOf(element: Element): Box {
	const { x, y, width, height } = element.getBoundingClientRect()
	return [Math.round(x), Math.round(y), Math.round(width), Math.round(height)]
}

/** Returns the row link of a label, also while the open drawer hides the page behind it. */
function row(name: string): HTMLElement {
	return screen.getByRole('link', { name })
}

/** Returns the colour a token resolves to inside the frame's chrome. */
function chromeColour(token: string): string {
	const probe = document.createElement('span')
	probe.style.color = `var(${token})`
	document.querySelector('.godmin-layout__sidebar')?.append(probe)
	const value = getComputedStyle(probe).color
	probe.remove()
	return value
}

test('draws each row 216 by 32 at x 12 in the 240px menu, 4px over the next, as the new admin draws them', async () => {
	await renderAppAt(1280)

	const boxes = ROWS.map((name) => boxOf(row(name)))
	expect(boxes.map(([x, , width, height]) => [x, width, height])).toEqual(ROWS.map(() => [12, 216, 32]))
	expect(boxes.slice(1).map(([, y], index) => y - boxes[index][1] - 32)).toEqual([4, 4, 4, 4])
})

test('puts the 24px row icon at x 16 and the label at x 48', async () => {
	await renderAppAt(1280)

	const posts = row('Posts')
	expect(boxOf(posts.querySelector('svg') as Element)).toEqual([16, boxOf(posts)[1] + 4, 24, 24])
	expect(boxOf(posts.querySelector('.godmin-navigation-item__label') as Element)[0]).toBe(48)
})

test('sets the rows in 13px text on a 20px line, at rest in the interactive neutral colour with no fill', async () => {
	await renderAppAt(1280)
	await userEvent.hover(screen.getByRole('main'))

	const style = getComputedStyle(row('Pages'))
	expect([style.fontSize, style.lineHeight, style.fontWeight]).toEqual(['13px', '20px', '400'])
	expect(style.color).toBe(chromeColour('--wpds-color-foreground-interactive-neutral'))
	expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
})

test('marks the current row bold in the brand active colour, with no fill', async () => {
	await renderAppAt(1280)
	await userEvent.hover(screen.getByRole('main'))

	const style = getComputedStyle(row('Posts'))
	expect(row('Posts').getAttribute('aria-current')).toBe('page')
	expect(style.fontWeight).toBe('600')
	expect(style.color).toBe(chromeColour('--wpds-color-foreground-interactive-brand-active'))
	expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
})

test('ends a row that opens a sub menu with its chevron in a 32px box, the glyph 8px from the row end', async () => {
	await renderAppAt(1280)

	const chats = row('Chats')
	const chevron = chats.querySelector('.godmin-navigation-item__drilldown-indicator') as Element
	const [rowX, , rowWidth] = boxOf(chats)
	const [x, , width, height] = boxOf(chevron)
	expect([width, height]).toEqual([32, 32])
	expect(rowX + rowWidth - (x + width)).toBe(4)
})

test('draws the rows of the 300px phone drawer 276 by 32', async () => {
	await renderAppAt(390)

	await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	const drawer = await screen.findByRole('dialog')
	const posts = drawer.querySelector('.godmin-navigation-item') as Element

	await expect
		.poll(() => {
			const [x, , width, height] = boxOf(posts)
			return [x, width, height]
		})
		.toEqual([12, 276, 32])
})
