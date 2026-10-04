// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { Frame } from '../src/frame.js'
import { EDGE_BREAKPOINT } from '../src/index'
import { installTestEnvironment, renderAdmin, setViewport } from '../src/testing.js'

installTestEnvironment()

/**
 * Renders a frame with a rail and a canvas.
 * @param props - The location and canvas mode to render with.
 * @returns The testing library render result.
 */
function renderFrame(props: { location?: string; canvas?: 'padded' | 'bleed' } = {}) {
	return renderAdmin(
		<Frame.Root location={props.location}>
			<Frame.Rail brand={<span>Acme</span>} menuLabel="Open navigation">
				<nav aria-label="Sections">
					<a href="/reports">Reports</a>
				</nav>
			</Frame.Rail>
			<Frame.Canvas canvas={props.canvas}>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
}

test('shows the rail beside the canvas on a wide viewport', () => {
	renderFrame()

	expect(screen.getByRole('navigation', { name: 'Sections' })).not.toBeNull()
	expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull()
})

test('renders the rail as a child of the layout itself, where the canvas margin rule looks for it', () => {
	renderFrame()

	expect(document.querySelector('.godmin-layout > .godmin-layout__rail')).not.toBeNull()
})

test('replaces the rail with a menu button on a narrow viewport', () => {
	setViewport({ matches: true })
	renderFrame()

	expect(screen.getByRole('button', { name: 'Open navigation' })).not.toBeNull()
	expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull()
})

test('draws the menu button as the admin bar toggle: three 28px bars, 4px thick, 6px apart, in a 52 by 46 box', () => {
	setViewport({ matches: true })
	renderFrame()

	const menu = screen.getByRole('button', { name: 'Open navigation' })
	const glyph = menu.querySelector('svg')
	expect(menu.classList.contains('godmin-layout__menu')).toBe(true)
	expect(glyph?.getAttribute('viewBox')).toBe('0 0 52 46')
	expect(glyph?.getAttribute('width')).toBe('52')
	expect(glyph?.getAttribute('height')).toBe('46')
	expect(glyph?.querySelector('path')?.getAttribute('d')).toBe('M11 11h28v4H11zm0 10h28v4H11zm0 10h28v4H11z')
})

test('hides the menu glyph from assistive technology, since the button name says it', () => {
	setViewport({ matches: true })
	renderFrame()

	const glyph = screen.getByRole('button', { name: 'Open navigation' }).querySelector('svg')
	expect(glyph?.getAttribute('aria-hidden')).toBe('true')
	expect(glyph?.getAttribute('focusable')).toBe('false')
})

test('offers the edge breakpoint from the package entry', () => {
	expect(EDGE_BREAKPOINT).toBe(782)
})

test('opens the rail content in a drawer', async () => {
	setViewport({ matches: true })
	renderFrame()

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

	const drawer = await screen.findByRole('dialog')
	expect(within(drawer).getByRole('navigation', { name: 'Sections' })).not.toBeNull()
})

test('keeps the chrome theme on the drawer it portals out', async () => {
	setViewport({ matches: true })
	renderAdmin(
		<Frame.Root chromeColor={{ primary: '#3858e9' }} canvasColor={{ primary: '#d63638' }}>
			<Frame.Rail menuLabel="Open navigation">
				<nav aria-label="Sections" />
			</Frame.Rail>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
	const menu = screen.getByRole('button', { name: 'Open navigation' })
	const chrome = menu.closest('[style*="--wpds-color"]')

	fireEvent.click(menu)

	const drawer = await screen.findByRole('dialog')
	expect(chrome).not.toBeNull()
	expect(drawer.closest('[style*="--wpds-color"]')).toBe(chrome)
})

test('portals the drawer inside the layout that raises it', async () => {
	setViewport({ matches: true })
	renderFrame()

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

	const drawer = await screen.findByRole('dialog')
	expect(drawer.closest('.godmin-layout')).not.toBeNull()
})

test('isolates the canvas so its stacking stays under the drawer', () => {
	renderFrame()

	expect(screen.getByRole('main').getAttribute('style')).toContain('isolation: isolate')
})

test('closes the drawer when the location changes', async () => {
	setViewport({ matches: true })
	const view = renderFrame({ location: '/tasks' })
	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	await screen.findByRole('dialog')

	view.rerender(
		<Frame.Root location="/reports">
			<Frame.Rail brand={<span>Acme</span>} menuLabel="Open navigation">
				<nav aria-label="Sections">
					<a href="/reports">Reports</a>
				</nav>
			</Frame.Rail>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)

	expect(screen.queryByRole('dialog')).toBeNull()
})

test('names the brand without making it a heading', () => {
	setViewport({ matches: true })
	renderFrame()

	expect(screen.getByText('Acme')).not.toBeNull()
	expect(screen.queryByRole('heading')).toBeNull()
})

test('marks a full bleed canvas so it can fill its region', () => {
	renderFrame({ canvas: 'bleed' })

	expect(screen.getByRole('main').className).toContain('godmin-layout__canvas--bleed')
})

test('leaves a padded canvas unmarked', () => {
	renderFrame()

	expect(screen.getByRole('main').className).not.toContain('--bleed')
})

/**
 * Returns the value one design token takes on the nearest theme around an element.
 * @param element - The element the theme wraps.
 * @param token - The custom property name.
 * @returns The value the nearest theme sets.
 */
function tokenAround(element: Element, token: string): string {
	return (element.closest(`[style*="${token}:"]`) as HTMLElement).style.getPropertyValue(token)
}

test('paints the canvas from the default WordPress palette when no colour is given, its greys as wp-admin', () => {
	renderFrame()
	const canvas = screen.getByRole('main')

	expect(tokenAround(canvas, '--wpds-color-background-surface-neutral-strong')).toBe('#fff')
	expect(tokenAround(canvas, '--wpds-color-stroke-surface-neutral-weak')).toBe('#f0f0f0')
	expect(tokenAround(canvas, '--wpds-color-stroke-interactive-neutral-strong')).toBe('#6e6e6e')
	expect(tokenAround(canvas, '--wpds-color-stroke-interactive-neutral')).toBe('#8d8d8d')
	expect(tokenAround(canvas, '--wpds-color-foreground-content-neutral-weak')).toBe('#707070')
})

test('paints the rail and the top bar one step from the WordPress admin bar grey when no colour is given', () => {
	renderFrame()
	const token = '--wpds-color-background-surface-neutral-weak'

	expect(tokenAround(document.querySelector('.godmin-layout') as Element, token)).toBe('#1d2428')
})

test('keeps the canvas on the default WordPress palette when only the chrome colour is given', () => {
	renderAdmin(
		<Frame.Root chromeColor={{ background: '#1e1e1e' }}>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)

	expect(tokenAround(screen.getByRole('main'), '--wpds-color-stroke-surface-neutral-weak')).toBe('#f0f0f0')
})

test('paints the chrome and the canvas from the colours an application gives', () => {
	renderAdmin(
		<Frame.Root chromeColor={{ background: '#1e1e1e' }} canvasColor={{ background: '#ffffff' }}>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
	const token = '--wpds-color-background-surface-neutral-weak'

	expect(tokenAround(document.querySelector('.godmin-layout') as Element, token)).toBe('#171717')
	expect(tokenAround(screen.getByRole('main'), '--wpds-color-stroke-surface-neutral-weak')).toBe('#f3f3f3')
})

test('collapses the rail region when a screen renders none', () => {
	renderAdmin(
		<Frame.Root>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)

	expect(screen.getByRole('main')).not.toBeNull()
	expect(screen.queryByRole('button', { name: /open/i })).toBeNull()
})
