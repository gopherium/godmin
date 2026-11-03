// SPDX-License-Identifier: Apache-2.0

import {
	Outlet,
	Link as RouterLink,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import { Link, Text } from '@wordpress/ui'
import { expect, test } from 'vitest'

import { PageBreadcrumb, PageBreadcrumbs } from '../src/page-breadcrumbs.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Renders a record under its list, led by a breadcrumb back to the list on a router link.
 * @param exact - Whether the link counts as active on its own address only.
 * @returns The testing library render result.
 */
function renderRoutedTrail(exact: boolean) {
	function Trail() {
		return (
			<PageBreadcrumbs label="Breadcrumbs">
				<PageBreadcrumb render={<RouterLink to="/contacts" activeOptions={{ exact }} />}>Contacts</PageBreadcrumb>
			</PageBreadcrumbs>
		)
	}
	const rootRoute = createRootRoute({ component: Outlet })
	const contacts = createRoute({ getParentRoute: () => rootRoute, path: '/contacts', component: () => null })
	const contact = createRoute({ getParentRoute: () => rootRoute, path: '/contacts/$id', component: Trail })
	const router = createRouter({
		routeTree: rootRoute.addChildren([contacts, contact]),
		history: createMemoryHistory({ initialEntries: ['/contacts/42'] }),
	})
	return renderAdmin(<RouterProvider router={router} />)
}

/** Returns the class tokens the design system gives an element carrying id="sample". */
function sampledClasses(element: React.ReactElement): string[] {
	const { container } = renderAdmin(element)
	return [...(container.querySelector('#sample') as Element).classList]
}

/** Renders a trail of one plain link. */
function renderTrail() {
	return renderAdmin(
		<PageBreadcrumbs label="Breadcrumbs">
			<PageBreadcrumb href="/contacts">Contacts</PageBreadcrumb>
		</PageBreadcrumbs>,
	)
}

test('names the navigation region', () => {
	renderTrail()

	expect(screen.getByRole('navigation', { name: 'Breadcrumbs' })).not.toBeNull()
})

test('keeps the list role a list loses with its markers in some browsers', () => {
	renderTrail()

	const list = screen.getByRole('list')
	expect(list.tagName).toBe('UL')
	expect(list.getAttribute('role')).toBe('list')
})

test('draws a plain address', () => {
	renderTrail()

	expect(screen.getByRole('link', { name: 'Contacts' }).getAttribute('href')).toBe('/contacts')
})

test('draws the link element of a router, in the neutral tone', () => {
	const neutral = sampledClasses(<Link id="sample" tone="neutral" href="/contacts" />)

	renderAdmin(
		<PageBreadcrumbs label="Breadcrumbs">
			<PageBreadcrumb render={<a href="/contacts" className="router-link" data-router="yes" />}>Contacts</PageBreadcrumb>
		</PageBreadcrumbs>,
	)

	const link = screen.getByRole('link', { name: 'Contacts' })
	expect(link.getAttribute('data-router')).toBe('yes')
	expect([...link.classList]).toEqual(expect.arrayContaining(['router-link', ...neutral]))
})

test('a router link back to the list counts itself the current page on a record under it', async () => {
	renderRoutedTrail(false)

	const crumb = await screen.findByRole('link', { name: 'Contacts' })
	expect(crumb.getAttribute('aria-current')).toBe('page')
})

test('marks no breadcrumb as the current page once its router link matches exactly, as the docs show', async () => {
	renderRoutedTrail(true)

	const crumb = await screen.findByRole('link', { name: 'Contacts' })
	expect(crumb.hasAttribute('aria-current')).toBe(false)
})

test('sets the link and the slash at the large body size, 15px like the WordPress trail', () => {
	const large = sampledClasses(<Text id="sample" variant="body-lg" />)

	const { container } = renderTrail()

	const link = screen.getByRole('link', { name: 'Contacts' })
	const slash = container.querySelector('.godmin-page__separator') as Element
	expect([...link.classList]).toEqual(expect.arrayContaining(large))
	expect([...slash.classList]).toEqual(expect.arrayContaining(large))
})

test('hides the slash from a screen reader', () => {
	const { container } = renderTrail()

	const slash = container.querySelector('.godmin-page__separator')
	expect(slash?.textContent).toBe('/')
	expect(slash?.getAttribute('aria-hidden')).toBe('true')
})

test('ties every link to one list item', () => {
	renderAdmin(
		<PageBreadcrumbs label="Breadcrumbs">
			<PageBreadcrumb href="/forms">Forms</PageBreadcrumb>
			<PageBreadcrumb href="/forms/42">Contact form</PageBreadcrumb>
		</PageBreadcrumbs>,
	)

	const items = screen.getAllByRole('listitem')
	expect(items).toHaveLength(2)
	expect(items[0].querySelector('a')?.textContent).toBe('Forms')
	expect(items[1].querySelector('a')?.textContent).toBe('Contact form')
})
