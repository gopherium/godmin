// SPDX-License-Identifier: Apache-2.0

import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { sidebarAppRouter } from '../sidebar-app.js'

/** What Back paints around itself. */
interface Ring {
	style: string
	width: string
	corner: string
	visible: boolean
}

/** Draws the sidebar app on the posts page and waits for its canvas. */
async function renderApp() {
	render(
		<AdminRoot>
			<RouterProvider router={sidebarAppRouter('/posts')} />
		</AdminRoot>,
	)
	await screen.findByRole('main')
}

/** Waits until Back holds the focus and the sub menu has ended its slide, then returns Back. */
async function settledBack(): Promise<HTMLElement> {
	await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('Back')
	await expect.poll(() => document.getAnimations().length).toBe(0)
	const back = screen.getByRole('link', { name: 'Back' })
	expect(document.activeElement).toBe(back)
	return back
}

/** Reads the outline Back draws, its corner and whether the browser counts its focus as visible. */
function ringOf(back: HTMLElement): Ring {
	const style = getComputedStyle(back)
	return {
		style: style.outlineStyle,
		width: style.outlineWidth,
		corner: style.borderTopLeftRadius,
		visible: back.matches(':focus-visible'),
	}
}

test('draws no ring on Back after a mouse click on a drilldown row opens its sub menu', async () => {
	await renderApp()

	await userEvent.click(screen.getByRole('link', { name: 'Chats' }))

	const ring = ringOf(await settledBack())
	expect(ring.visible).toBe(false)
	expect(ring.style).toBe('none')
})

test('draws the 2px ring with its 2px corner on Back after Tab and Enter open a sub menu', async () => {
	await renderApp()
	screen.getByRole('link', { name: 'Users' }).focus()

	await userEvent.tab()
	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Chats' }))
	await userEvent.keyboard('{Enter}')

	expect(ringOf(await settledBack())).toEqual({ style: 'solid', width: '2px', corner: '2px', visible: true })
})
