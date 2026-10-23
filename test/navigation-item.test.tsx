// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { post } from '@wordpress/icons'
import { expect, test, vi } from 'vitest'

import { MenuCount } from '../src/menu-count.js'
import { NavigationItem } from '../src/navigation-item.js'
import { installTestEnvironment } from '../src/testing.js'
import { drawRows, holdsEvery, renderRows, routerWithRows } from './sidebar-routes.js'

installTestEnvironment()

/**
 * Returns the class of every element a row link holds, in order.
 * @param name - The accessible name of the row link.
 * @returns The class attribute of each child of the link.
 */
function partsOf(name: string): (string | null)[] {
	return [...screen.getByRole('link', { name }).children].map((part) => part.getAttribute('class'))
}

test('draws a list item holding a link to its address with its label', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/profile">Profile</NavigationItem>
		</ul>,
	)

	const link = screen.getByRole('link', { name: 'Profile' })
	expect(link.getAttribute('href')).toBe('/profile')
	expect(link.parentElement?.tagName).toBe('LI')
	expect(link.className).toBe('godmin-navigation-item')
	expect(partsOf('Profile')).toEqual(['godmin-navigation-item__label'])
})

test('hides a row whose address opens a route asking for a capability the reader lacks', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/users">Users</NavigationItem>
		</ul>,
		(capability) => capability !== 'list_users',
	)

	expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
	expect(screen.queryByRole('listitem')).toBeNull()
})

test('shows that row to a reader who holds the capability', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/users">Users</NavigationItem>
		</ul>,
		(capability) => capability === 'list_users',
	)

	expect(screen.getByRole('link', { name: 'Users' })).not.toBeNull()
})

test('hides that row when no can reaches it, as capabilities fail closed', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/users">Users</NavigationItem>
		</ul>,
	)

	expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
})

test('hides a row whose param address opens a parent route the reader lacks, as its own route allows it', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/things/$thingId" params={{ thingId: 'one' }}>
				Thing one
			</NavigationItem>
		</ul>,
		(capability) => capability === 'edit_things',
	)

	expect(screen.queryByRole('link', { name: 'Thing one' })).toBeNull()
})

test('marks the row of the current page and keeps it current on every address under it', async () => {
	await renderRows(
		'/things/one',
		<ul>
			<NavigationItem to="/things">Things</NavigationItem>
			<NavigationItem to="/posts">Posts</NavigationItem>
		</ul>,
		holdsEvery,
	)

	expect(screen.getByRole('link', { name: 'Things' }).getAttribute('aria-current')).toBe('page')
	expect(screen.getByRole('link', { name: 'Posts' }).hasAttribute('aria-current')).toBe(false)
})

test('draws the icon, the label and the suffix in order, the suffix marked on the row', async () => {
	await renderRows(
		'/profile',
		<ul>
			<NavigationItem to="/posts" icon={post} suffix={<MenuCount count={3} label="3 posts waiting" />}>
				Posts
			</NavigationItem>
		</ul>,
	)

	const link = screen.getByRole('link', { name: 'Posts 3 posts waiting' })
	expect(link.className).toBe('godmin-navigation-item godmin-navigation-item--with-suffix')
	expect(partsOf('Posts 3 posts waiting')).toEqual([
		'godmin-navigation-item__icon',
		'godmin-navigation-item__label',
		'godmin-navigation-item__suffix',
	])
	expect(link.querySelector('.godmin-navigation-item__suffix .godmin-menu-count')).not.toBeNull()
})

test('draws no chevron, so a row that goes to a page never reads as one that opens a sub menu', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/things">Things</NavigationItem>
		</ul>,
		holdsEvery,
	)

	const row = screen.getByRole('link', { name: 'Things' })
	expect(row.querySelector('.godmin-navigation-item__drilldown-indicator')).toBeNull()
})

test('draws the icon at 24px, hidden from assistive technology', async () => {
	await renderRows(
		'/posts',
		<ul>
			<NavigationItem to="/posts" icon={post}>
				Posts
			</NavigationItem>
		</ul>,
	)

	const icon = screen.getByRole('link', { name: 'Posts' }).firstElementChild as Element
	expect(icon.tagName).toBe('svg')
	expect(icon.getAttribute('width')).toBe('24')
	expect(icon.getAttribute('height')).toBe('24')
	expect(icon.getAttribute('aria-hidden')).toBe('true')
})

test('draws a row to an address with a scheme as a plain link, never current, and checks no route', async () => {
	const router = routerWithRows(
		'/posts',
		<ul>
			<NavigationItem to="https://example.com/help">Help</NavigationItem>
		</ul>,
	)
	const built = vi.spyOn(router, 'buildLocation')
	await drawRows(router)

	const link = screen.getByRole('link', { name: 'Help' })
	expect(link.getAttribute('href')).toBe('https://example.com/help')
	expect(link.hasAttribute('aria-current')).toBe(false)
	expect(built.mock.calls.filter(([options]) => options?.to === 'https://example.com/help')).toEqual([])
})
