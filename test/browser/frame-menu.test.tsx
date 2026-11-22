// SPDX-License-Identifier: Apache-2.0

import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { sidebarAppRouter } from '../sidebar-app.js'

/** A write time limit in milliseconds no test here runs into. */
const PATIENT_LIMIT = 60_000

/** The name the sidebar app gives Menu. */
const MENU = 'Open navigation'

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

/** Returns Menu, also while the open drawer hides it from assistive technology. */
function menu(): HTMLElement {
	return screen.getByRole('button', { name: MENU, hidden: true })
}

/** Opens the drawer with a press on Menu and waits for it to rest at the start edge. */
async function openDrawer() {
	await userEvent.click(menu())
	const drawer = await screen.findByRole('dialog')
	await expect.poll(() => drawer.getBoundingClientRect().x).toBe(0)
}

/** Returns the colour a token resolves to inside the frame, where the tooltips are drawn. */
function frameColour(property: 'color' | 'backgroundColor', token: string): string {
	const probe = document.createElement('span')
	probe.style[property] = `var(${token})`
	document.querySelector('.godmin-layout')?.append(probe)
	const value = getComputedStyle(probe)[property]
	probe.remove()
	return value
}

test('fills the 52 by 46 slot at the start of the top bar with Menu, its 24px glyph at 14 and 11', async () => {
	await renderAppAt(390)

	const box = menu().getBoundingClientRect()
	const glyph = (menu().querySelector('svg') as SVGElement).getBoundingClientRect()
	expect([box.x, box.y, box.width, box.height]).toEqual([0, 0, 52, 46])
	expect([glyph.x, glyph.y, glyph.width, glyph.height]).toEqual([14, 11, 24, 24])
})

test('paints Menu at rest as a WPDS minimal neutral button, the interactive neutral glyph on no fill', async () => {
	await renderAppAt(390)

	await userEvent.hover(screen.getByRole('main'))

	const style = getComputedStyle(menu())
	expect(style.color).toBe(frameColour('color', '--wpds-color-foreground-interactive-neutral'))
	expect(style.backgroundColor).toBe('rgba(0, 0, 0, 0)')
	expect(style.borderTopLeftRadius).toBe('0px')
})

test('rings Menu 2px inside its slot once the keyboard reaches it', async () => {
	await renderAppAt(390)

	await userEvent.tab()

	expect(document.activeElement).toBe(menu())
	const style = getComputedStyle(menu())
	expect([style.outlineStyle, style.outlineWidth, style.outlineOffset]).toEqual(['solid', '2px', '-2px'])
})

test('shows the Menu tooltip on top of the canvas, in the chrome surface and text of the frame', async () => {
	await renderAppAt(390)

	await userEvent.tab()

	const tip = await screen.findByText(MENU, { selector: '.godmin-bar__tip' })
	const box = tip.getBoundingClientRect()
	const style = getComputedStyle(tip)
	expect(tip.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))).toBe(true)
	expect(style.backgroundColor).toBe(frameColour('backgroundColor', '--wpds-color-background-surface-neutral-strong'))
	expect(style.color).toBe(frameColour('color', '--wpds-color-foreground-content-neutral'))
})

test('gives the focus back to Menu once a tap on the dimmed page beside the drawer closes it', async () => {
	await renderAppAt(390)
	await openDrawer()

	await userEvent.click(screen.getByTestId('drawer-backdrop'), { position: { x: 370, y: 400 } })

	await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
	await expect.poll(() => document.activeElement).toBe(menu())
})

test('gives the focus back to nothing once a page picked in the drawer closes it', async () => {
	await renderAppAt(390)
	await openDrawer()

	await userEvent.click(screen.getByRole('link', { name: 'Pages' }))

	expect(await screen.findByText('Pages page')).not.toBeNull()
	await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
	expect(document.activeElement).toBe(document.body)
})

test('shuts the drawer on a widen past 781px, leaving no scroll lock or inert part, and keeps it shut', async () => {
	await renderAppAt(781)
	await openDrawer()

	await page.viewport(1280, 800)

	await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
	await expect
		.poll(() => [
			document.querySelector('[inert], [data-base-ui-inert]'),
			getComputedStyle(document.documentElement).overflow,
			getComputedStyle(document.body).overflow,
		])
		.toEqual([null, 'visible', 'visible'])
	expect(document.activeElement).toBe(document.body)
	await page.viewport(781, 800)
	await expect.poll(() => menu().getAttribute('aria-expanded')).toBe('false')
	expect(screen.queryByRole('dialog')).toBeNull()
})
