// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, render, screen } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { menu } from '@wordpress/icons'
import { Button, Icon } from '@wordpress/ui'
import { afterEach, expect, test } from 'vitest'

import { Frame } from '../src/frame.js'
import spanish from '../src/list-chrome/es-ES.js'
import { installTestEnvironment, renderAdmin, setViewport } from '../src/testing.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

/**
 * Renders a narrow frame whose sidebar names its Menu as given.
 * @param menuLabel - The name the app gives Menu, godmin's own when absent.
 * @returns The testing library render result.
 */
function renderPhoneFrame(menuLabel?: string) {
	setViewport({ matches: true })
	return renderAdmin(
		<Frame.Root>
			<Frame.Sidebar menuLabel={menuLabel}>
				<nav aria-label="Sections" />
			</Frame.Sidebar>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
}

/**
 * Returns Menu, also while the open drawer hides it from assistive technology.
 * @param name - The name Menu carries.
 * @returns The button element.
 */
function menuButton(name = 'Menu'): HTMLElement {
	return screen.getByRole('button', { name, hidden: true })
}

/**
 * Returns the classes of an element.
 * @param element - The element to read.
 * @returns Its class names.
 */
function classesOf(element: Element): string[] {
	return [...element.classList]
}

test('names Menu "Menu", the word of the new admin and of the WordPress phone admin bar', () => {
	renderPhoneFrame()

	expect(screen.getByRole('button', { name: 'Menu' })).not.toBeNull()
})

test('names Menu in the reader language from the words godmin ships', () => {
	setLocaleData(spanish)
	renderPhoneFrame()

	expect(screen.getByRole('button', { name: 'Menú' })).not.toBeNull()
})

test('builds Menu from a minimal neutral WPDS button, as the new admin builds its toggle', () => {
	const drawn = render(<Button variant="minimal" tone="neutral" />)
	const wpds = classesOf(drawn.container.firstElementChild as Element)
	drawn.unmount()
	renderPhoneFrame()

	expect(classesOf(menuButton())).toEqual([...wpds, 'godmin-layout__menu'])
})

test('draws the WordPress menu glyph in Menu at 24px, hidden from assistive technology', () => {
	const drawn = render(<Icon icon={menu} />)
	const wordpress = drawn.container.innerHTML
	drawn.unmount()
	renderPhoneFrame()

	const glyph = menuButton().querySelector('svg') as SVGElement
	expect(menuButton().innerHTML).toBe(wordpress)
	expect(glyph.getAttribute('width')).toBe('24')
	expect(glyph.getAttribute('aria-hidden')).toBe('true')
	expect(glyph.getAttribute('focusable')).toBe('false')
})

test('tells a screen reader the drawer is shut and names nothing it controls, with no popup word', () => {
	renderPhoneFrame()

	expect(menuButton().getAttribute('aria-expanded')).toBe('false')
	expect(menuButton().hasAttribute('aria-controls')).toBe(false)
	expect(menuButton().hasAttribute('aria-haspopup')).toBe(false)
})

test('tells a screen reader the drawer is open and names the drawer it controls, with no popup word', async () => {
	renderPhoneFrame()

	fireEvent.click(menuButton())

	const drawer = await screen.findByRole('dialog')
	expect(drawer.id).not.toBe('')
	expect(menuButton().getAttribute('aria-expanded')).toBe('true')
	expect(menuButton().getAttribute('aria-controls')).toBe(drawer.id)
	expect(menuButton().hasAttribute('aria-haspopup')).toBe(false)
})

test('shows the name of Menu in a tooltip drawn inside the frame, painted in the frame colours', async () => {
	renderPhoneFrame()

	act(() => menuButton().focus())

	const tip = await screen.findByText('Menu')
	expect(classesOf(tip)).toContain('godmin-bar__tip')
	expect(tip.closest('.godmin-layout')).not.toBeNull()
})

test('shows the name the app gives Menu in its tooltip', async () => {
	renderPhoneFrame('Open the menu')

	act(() => menuButton('Open the menu').focus())

	expect(classesOf(await screen.findByText('Open the menu'))).toContain('godmin-bar__tip')
})
