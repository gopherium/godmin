// SPDX-License-Identifier: Apache-2.0

import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { page } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import type { MenuItem } from '../../src/menu-item.js'
import { sidebarAppRouter } from '../sidebar-app.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** A menu that opens with a section, as AlphOne's opens with Content. */
const SECTIONS_FIRST: readonly MenuItem[] = [
	{ label: 'Posts', to: '/posts', group: 'content' },
	{ label: 'Pages', to: '/pages', group: 'content' },
	{ label: 'Users', to: '/users', group: 'manage' },
]

/** A menu that opens with a row outside any section, as Gophenberg's opens with Updates. */
const ROW_FIRST: readonly MenuItem[] = [
	{ label: 'Posts', to: '/posts' },
	{ label: 'Pages', to: '/pages', group: 'content' },
]

/** Draws the sidebar app at 1280 with the root rows given and waits for its canvas. */
async function renderMenu(rows: readonly MenuItem[]) {
	await page.viewport(1280, 800)
	render(
		<AdminRoot writeTimeout={PATIENT_LIMIT}>
			<RouterProvider router={sidebarAppRouter('/posts', { rows })} />
		</AdminRoot>,
	)
	await screen.findByRole('main')
}

/** Returns the box of the list item holding a row link. */
function rowBox(name: string): DOMRect {
	return (screen.getByRole('link', { name }).closest('li') as Element).getBoundingClientRect()
}

/** Returns where the text of an element starts in the window. */
function textStart(element: Element): number {
	const range = document.createRange()
	range.selectNodeContents(element)
	return range.getBoundingClientRect().x
}

test('puts the first label of a menu opening with a section 36px under the identity block, text at x 16', async () => {
	await renderMenu(SECTIONS_FIRST)

	const label = screen.getByText('Content')
	const style = getComputedStyle(label)
	expect(label.getBoundingClientRect().y).toBe(100)
	expect(textStart(label)).toBe(16)
	expect([style.fontSize, style.lineHeight, style.fontWeight]).toEqual(['12px', '16px', '600'])
})

test('sets a section label 16px under the row above it and its first row 4px under the label', async () => {
	await renderMenu(ROW_FIRST)

	const label = screen.getByText('Content').getBoundingClientRect()
	expect(label.y - rowBox('Posts').bottom).toBe(16)
	expect(rowBox('Pages').y - label.bottom).toBe(4)
})

test('sets the label of the next section 16px under the last row of the section above', async () => {
	await renderMenu(SECTIONS_FIRST)

	expect(screen.getByText('Manage').getBoundingClientRect().y - rowBox('Pages').bottom).toBe(16)
})
