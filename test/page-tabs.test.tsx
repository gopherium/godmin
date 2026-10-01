// SPDX-License-Identifier: Apache-2.0

import {
	Link,
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import { forwardRef } from 'react'
import type { AnchorHTMLAttributes } from 'react'
import { expect, test } from 'vitest'

import * as entry from '../src/index'
import { Page } from '../src/page.js'
import { PageTab, PageTabs } from '../src/page-tabs.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** The class that underlines the current tab. */
const CURRENT = 'godmin-page-tabs__tab--current'

/**
 * Stands in for a router link, which renders an anchor for a route.
 */
const RouteLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }>(
	function RouteLink({ to, ...props }, ref) {
		return <a ref={ref} href={`#${to}`} data-route={to} {...props} />
	},
)

/**
 * Renders the users and tokens tabs on router links, inside a router started at the given address.
 * @param path - The address the router starts at.
 * @param exact - Whether each link counts as active on its own address only.
 * @returns The testing library render result.
 */
function renderRoutedTabs(path: string, exact: boolean) {
	function Tabs({ on }: { on: string }) {
		return (
			<PageTabs label="User sections">
				<PageTab render={<Link to="/users" activeOptions={{ exact }} />} current={on === '/users'}>
					Users
				</PageTab>
				<PageTab render={<Link to="/users/tokens" activeOptions={{ exact }} />} current={on === '/users/tokens'}>
					API tokens
				</PageTab>
			</PageTabs>
		)
	}
	const rootRoute = createRootRoute({ component: Outlet })
	const users = createRoute({ getParentRoute: () => rootRoute, path: '/users', component: () => <Tabs on="/users" /> })
	const tokens = createRoute({
		getParentRoute: () => rootRoute,
		path: '/users/tokens',
		component: () => <Tabs on="/users/tokens" />,
	})
	const router = createRouter({
		routeTree: rootRoute.addChildren([users, tokens]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
	return renderAdmin(<RouterProvider router={router} />)
}

test('renders the tabs as links in a navigation region named by its label', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users" current>
				Users
			</PageTab>
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	const nav = screen.getByRole('navigation', { name: 'User sections' })
	expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Users', 'API tokens'])
})

test('marks the current tab as the page on screen and leaves the others unmarked', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users" current>
				Users
			</PageTab>
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	expect(screen.getByRole('link', { name: 'Users' }).getAttribute('aria-current')).toBe('page')
	expect(screen.getByRole('link', { name: 'API tokens' }).hasAttribute('aria-current')).toBe(false)
})

test('gives the current tab the class that underlines it and leaves the others without', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users" current>
				Users
			</PageTab>
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	expect(screen.getByRole('link', { name: 'Users' }).classList.contains(CURRENT)).toBe(true)
	expect(screen.getByRole('link', { name: 'API tokens' }).classList.contains(CURRENT)).toBe(false)
})

test('underlines only the tab the screen marks current, even where a router link counts itself active', async () => {
	renderRoutedTabs('/users/tokens', false)

	const tokens = await screen.findByRole('link', { name: 'API tokens' })
	const users = screen.getByRole('link', { name: 'Users' })
	expect(tokens.classList.contains(CURRENT)).toBe(true)
	expect(users.classList.contains(CURRENT)).toBe(false)
})

test('marks only the current tab when the router links match their own address only, as the docs show', async () => {
	renderRoutedTabs('/users/tokens', true)

	const tokens = await screen.findByRole('link', { name: 'API tokens' })
	const users = screen.getByRole('link', { name: 'Users' })
	expect(tokens.getAttribute('aria-current')).toBe('page')
	expect(users.hasAttribute('aria-current')).toBe(false)
	expect(tokens.classList.contains(CURRENT)).toBe(true)
	expect(users.classList.contains(CURRENT)).toBe(false)
})

test('renders a tab with an address as a plain link carrying the tab class', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	const tab = screen.getByRole('link', { name: 'API tokens' })
	expect(tab.getAttribute('href')).toBe('/users/tokens')
	expect(tab.classList.contains('godmin-page-tabs__tab')).toBe(true)
})

test('renders a tab through the link element a screen gives, such as a router link', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab render={<RouteLink to="/users/tokens" />} current>
				API tokens
			</PageTab>
		</PageTabs>,
	)

	const tab = screen.getByRole('link', { name: 'API tokens' })
	expect(tab.getAttribute('data-route')).toBe('/users/tokens')
	expect(tab.getAttribute('aria-current')).toBe('page')
	expect(tab.classList.contains('godmin-page-tabs__tab')).toBe(true)
})

test('keeps the class of the link element a screen gives', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab render={<RouteLink to="/users" className="acme-link" />}>Users</PageTab>
		</PageTabs>,
	)

	const tab = screen.getByRole('link', { name: 'Users' })
	expect([...tab.classList]).toEqual(['acme-link', 'godmin-page-tabs__tab'])
})

test('sets the tabs of a page under the title block, before the content', () => {
	const { container } = renderAdmin(
		<Page
			title="Users"
			tabs={
				<PageTabs label="User sections">
					<PageTab href="/users" current>
						Users
					</PageTab>
				</PageTabs>
			}
		>
			<p>rows</p>
		</Page>,
	)

	const tabs = container.querySelector('.godmin-page > .godmin-page__header + .godmin-page__tabs')
	expect(tabs?.querySelector('nav')).toBe(screen.getByRole('navigation', { name: 'User sections' }))
	expect(tabs?.nextElementSibling?.textContent).toBe('rows')
})

test('offers the page tabs from the package entry', () => {
	expect(entry.PageTabs).toBe(PageTabs)
	expect(entry.PageTab).toBe(PageTab)
})

test('sets no tabs region on a page that gives none', () => {
	const { container } = renderAdmin(<Page title="Users">rows</Page>)

	expect(container.querySelector('.godmin-page__tabs')).toBeNull()
})
