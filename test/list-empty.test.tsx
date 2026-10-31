// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { people, search } from '@wordpress/icons'
import { Button, Icon } from '@wordpress/ui'
import type { ComponentProps } from 'react'
import { afterEach, expect, test } from 'vitest'

import { ListEmpty, ListNoResults, Page } from '../src/index'
import spanish from '../src/list-chrome/es-ES.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

/** The line Jetpack Forms shows under "No results found". */
const TRY_ADJUSTING = "Try adjusting your search or filters to find what you're looking for."

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

/**
 * Returns the tag of each part an empty state draws, in order.
 * @param container - The element the empty state was rendered in.
 * @returns The tag names of the empty state's children.
 */
function partsOf(container: Element): string[] {
	return [...(container.querySelector('.godmin-empty')?.children ?? [])].map((part) => part.tagName)
}

test('names an empty list in a heading', () => {
	renderAdmin(<ListEmpty icon={people} title="No users yet" />)

	expect(screen.getByRole('heading', { name: 'No users yet' })).not.toBeNull()
})

test('names an empty list one level under the title of a level 2 page, at the size it has outside any page', () => {
	renderAdmin(
		<>
			<ListEmpty icon={people} title="No users yet" />
			<Page title="Users" headingLevel={2} list>
				<ListEmpty icon={people} title="No users found" />
			</Page>
		</>,
	)

	const outside = screen.getByRole('heading', { level: 2, name: 'No users yet' })
	const inside = screen.getByRole('heading', { level: 3, name: 'No users found' })
	expect([...inside.classList]).toEqual([...outside.classList])
	expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual([
		'No users yet',
		'Users',
	])
})

test('names an empty list in an h2 inside a level 1 page, one level under its title', () => {
	renderAdmin(
		<Page title="Users" list>
			<ListEmpty icon={people} title="No users found" />
		</Page>,
	)

	expect(screen.getByRole('heading', { level: 1, name: 'Users' })).not.toBeNull()
	expect(screen.getByRole('heading', { level: 2, name: 'No users found' })).not.toBeNull()
})

test.each([
	['people', people],
	['search', search],
])('draws the %s icon it is given above the title', (_name, icon) => {
	const { container } = renderAdmin(<ListEmpty icon={icon} title="No users yet" />)
	const drawn = container.querySelector('.godmin-empty svg') as SVGElement

	expect(outlines(drawn)).toEqual(iconOutlines(icon))
	expect(drawn.compareDocumentPosition(screen.getByRole('heading', { name: 'No users yet' }))).toBe(
		Node.DOCUMENT_POSITION_FOLLOWING,
	)
})

test('carries the class that centres an empty state in a list', () => {
	const { container } = renderAdmin(<ListEmpty icon={people} title="No users found" />)

	expect(container.querySelector('.godmin-empty')).not.toBeNull()
})

test('shows the description under the title', () => {
	renderAdmin(<ListEmpty icon={people} title="No users yet" description="Users you add show up here." />)
	const description = screen.getByText('Users you add show up here.')

	expect(description.tagName).toBe('P')
	expect(screen.getByRole('heading', { name: 'No users yet' }).compareDocumentPosition(description)).toBe(
		Node.DOCUMENT_POSITION_FOLLOWING,
	)
})

test('shows no line under the title when no description is given', () => {
	const { container } = renderAdmin(<ListEmpty icon={people} title="No users found" />)

	expect(container.querySelector('.godmin-empty p')).toBeNull()
})

test('shows the buttons it is given under the description, and no buttons part without them', () => {
	const given = renderAdmin(
		<ListEmpty
			icon={people}
			title="No users yet"
			description="Users you add show up here."
			actions={<Button>Add User</Button>}
		/>,
	)
	const button = screen.getByRole('button', { name: 'Add User' })

	expect(partsOf(given.container)).toEqual(['DIV', 'H2', 'P', 'DIV'])
	expect(given.container.querySelector('.godmin-empty')?.lastElementChild?.contains(button)).toBe(true)
	given.unmount()

	const bare = renderAdmin(<ListEmpty icon={people} title="No users yet" description="Users you add show up here." />)
	expect(partsOf(bare.container)).toEqual(['DIV', 'H2', 'P'])
})

test.each([
	['false', false],
	['null', null],
])('draws no buttons part when the buttons it is given are %s', (_name, actions) => {
	const { container } = renderAdmin(
		<ListEmpty icon={people} title="No users yet" description="Users you add show up here." actions={actions} />,
	)

	expect(partsOf(container)).toEqual(['DIV', 'H2', 'P'])
})

test('says No results found and the Jetpack Forms line under the search icon, with no buttons', () => {
	const { container } = renderAdmin(<ListNoResults />)
	const drawn = container.querySelector('.godmin-empty svg') as SVGElement
	const heading = screen.getByRole('heading', { name: 'No results found' })
	const line = screen.getByText(TRY_ADJUSTING)

	expect(outlines(drawn)).toEqual(iconOutlines(search))
	expect(drawn.compareDocumentPosition(heading)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
	expect(heading.compareDocumentPosition(line)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
	expect(partsOf(container)).toEqual(['DIV', 'H2', 'P'])
})

test('says the no results words in Spanish once the es-ES list chrome is loaded', () => {
	setLocaleData(spanish)
	renderAdmin(<ListNoResults />)

	expect(screen.getByRole('heading', { name: 'No se encontraron resultados' })).not.toBeNull()
	expect(screen.getByText('Prueba a ajustar tu búsqueda o tus filtros para encontrar lo que buscas.')).not.toBeNull()
})
