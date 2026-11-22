// SPDX-License-Identifier: Apache-2.0

import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { sidebarAppRouter } from '../sidebar-app.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** Where a part sits in the window and how big it is, rounded to whole pixels. */
type Box = [x: number, y: number, width: number, height: number]

/** Draws the sidebar app at an address and a width and waits for its canvas. */
async function renderAppAt(path: string, width: number) {
	await page.viewport(width, 800)
	render(
		<AdminRoot writeTimeout={PATIENT_LIMIT}>
			<RouterProvider router={sidebarAppRouter(path)} />
		</AdminRoot>,
	)
	await screen.findByRole('main')
}

/** Returns where an element sits in the window and how big it is. */
function boxOf(element: Element): Box {
	const { x, y, width, height } = element.getBoundingClientRect()
	return [Math.round(x), Math.round(y), Math.round(width), Math.round(height)]
}

/** Returns the element a selector finds, failing the test when there is none. */
function find(selector: string, inside: ParentNode = document): Element {
	const found = inside.querySelector(selector)
	expect(found, selector).not.toBeNull()
	return found as Element
}

test('heads the 240px menu with a 64px identity block, its name at x 16 over its host', async () => {
	await renderAppAt('/posts', 1280)

	const block = find('.godmin-sidebar__identity')
	expect(boxOf(block)).toEqual([0, 0, 240, 64])
	expect(boxOf(find('.godmin-sidebar__name', block))).toEqual([16, 12, 208, 20])
	expect(boxOf(find('.godmin-sidebar__address', block))).toEqual([16, 36, 208, 16])
	expect(getComputedStyle(find('.godmin-sidebar__name', block)).fontWeight).toBe('600')
})

test('starts the rows of the root screen 20px under the identity block', async () => {
	await renderAppAt('/posts', 1280)

	expect(boxOf(find('.godmin-navigation__root .godmin-navigation-list'))[1]).toBe(84)
})

test('draws the title row of a sub menu 52px tall, Back 24px at x 16 and the 15px title at x 48', async () => {
	await renderAppAt('/chats', 1280)

	const [x, y, , height] = boxOf(find('.godmin-navigation-screen__title-icon'))
	const title = screen.getByRole('heading', { level: 1, name: 'Chats' })
	expect([x, y, height]).toEqual([12, 64, 52])
	expect(boxOf(screen.getByRole('link', { name: 'Back' }))).toEqual([16, 80, 24, 24])
	expect(boxOf(title).slice(0, 2)).toEqual([48, 76])
	expect([getComputedStyle(title).fontSize, getComputedStyle(title).lineHeight]).toEqual(['15px', '32px'])
})

test('heads the 300px drawer with the same 64px identity block at its top', async () => {
	await renderAppAt('/posts', 390)
	await commands.reduceMotion(true)

	await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	const drawer = await screen.findByRole('dialog')
	const block = find(':scope > .godmin-sidebar__identity', drawer)

	await expect.poll(() => boxOf(block)).toEqual([0, 0, 300, 64])
})
