// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { Frame } from '../src/frame.js'
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

test('replaces the rail with a menu button on a narrow viewport', () => {
	setViewport({ matches: true })
	renderFrame()

	expect(screen.getByRole('button', { name: 'Open navigation' })).not.toBeNull()
	expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull()
})

test('opens the rail content in a drawer', async () => {
	setViewport({ matches: true })
	renderFrame()

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

	const drawer = await screen.findByRole('dialog')
	expect(within(drawer).getByRole('navigation', { name: 'Sections' })).not.toBeNull()
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
