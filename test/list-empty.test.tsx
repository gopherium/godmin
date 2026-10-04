// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { people, search } from '@wordpress/icons'
import { Icon } from '@wordpress/ui'
import type { ComponentProps } from 'react'
import { expect, test } from 'vitest'

import { ListEmpty } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Returns the outlines drawn inside an element.
 * @param element - The element holding the drawing.
 * @returns The path data of every path in it, in source order.
 */
function outlines(element: Element): string[] {
	return [...element.querySelectorAll('path')].map((path) => path.getAttribute('d') ?? '')
}

/**
 * Returns the outlines a design system icon draws.
 * @param icon - The icon to draw.
 * @returns The path data of every path it draws.
 */
function iconOutlines(icon: ComponentProps<typeof Icon>['icon']): string[] {
	const { container, unmount } = render(<Icon icon={icon} />)
	const drawn = outlines(container)
	unmount()
	return drawn
}

test('names an empty list in a heading', () => {
	renderAdmin(<ListEmpty icon={people} title="No users yet." />)

	expect(screen.getByRole('heading', { name: 'No users yet.' })).not.toBeNull()
})

test.each([
	['people', people],
	['search', search],
])('draws the %s icon it is given above the title', (_name, icon) => {
	const { container } = renderAdmin(<ListEmpty icon={icon} title="No users yet." />)
	const drawn = container.querySelector('.godmin-empty svg') as SVGElement

	expect(outlines(drawn)).toEqual(iconOutlines(icon))
	expect(drawn.compareDocumentPosition(screen.getByRole('heading', { name: 'No users yet.' }))).toBe(
		Node.DOCUMENT_POSITION_FOLLOWING,
	)
})

test('carries the class that centres an empty state in a list', () => {
	const { container } = renderAdmin(<ListEmpty icon={people} title="No users found." />)

	expect(container.querySelector('.godmin-empty')).not.toBeNull()
})

test('shows the hint under the title when it is given', () => {
	renderAdmin(<ListEmpty icon={people} title="No users yet." hint="Add one with New user." />)

	expect(screen.getByText('Add one with New user.').tagName).toBe('P')
})

test('shows no line under the title when no hint is given', () => {
	const { container } = renderAdmin(<ListEmpty icon={people} title="No users found." />)

	expect(container.querySelector('.godmin-empty p')).toBeNull()
})
