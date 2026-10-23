// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen, within } from '@testing-library/react'
import { people, post } from '@wordpress/icons'
import { useState } from 'react'
import { expect, test } from 'vitest'

import { useCanAccess } from '../src/menu-item.js'
import type { MenuItem } from '../src/menu-item.js'
import { NavigationItem } from '../src/navigation-item.js'
import { NavigationList } from '../src/navigation-list.js'
import type { Can } from '../src/navigation-state.js'
import { installTestEnvironment } from '../src/testing.js'
import { holdsEvery, renderRows } from './sidebar-routes.js'
import { declaredValue } from './styles.js'

installTestEnvironment()

/**
 * Returns the label of every row the list draws, in order.
 * @returns The text of each list item.
 */
function rowLabels(): string[] {
	return within(screen.getByRole('list'))
		.queryAllByRole('listitem')
		.map((row) => row.textContent ?? '')
}

/**
 * Draws a list of the given rows on the posts page.
 * @param items - The rows as data.
 * @param can - The check the screen around the list hands down, none when absent.
 * @returns The list element.
 */
async function drawList(items: MenuItem[], can?: Can): Promise<HTMLElement> {
	await renderRows('/posts', <NavigationList items={items} />, can)
	return screen.getByRole('list')
}

/**
 * Draws a list of the given rows on the posts page and returns the label of every row it shows.
 * @param items - The rows as data.
 * @param can - The check the screen around the list hands down, none when absent.
 * @returns The text of each list item, in order.
 */
async function shownRows(items: MenuItem[], can?: Can): Promise<string[]> {
	await drawList(items, can)
	return rowLabels()
}

test('draws the rows of items in order as a list of list items, each a link to its address', async () => {
	const list = await drawList([
		{ label: 'Posts', to: '/posts' },
		{ label: 'Profile', to: '/profile' },
	])

	expect(list.tagName).toBe('UL')
	expect(list.getAttribute('role')).toBe('list')
	expect(list.className).toBe('godmin-navigation-list')
	expect(rowLabels()).toEqual(['Posts', 'Profile'])
	expect(within(list).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual(['/posts', '/profile'])
})

test('hides a row whose own capability the reader lacks', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', capability: 'edit_posts' },
		{ label: 'Profile', to: '/profile' },
	]

	expect(await shownRows(rows, (capability) => capability !== 'edit_posts')).toEqual(['Profile'])
})

test('hides a row whose address opens a route asking for a capability the reader lacks', async () => {
	const rows: MenuItem[] = [
		{ label: 'Users', to: '/users' },
		{ label: 'Profile', to: '/profile' },
	]

	expect(await shownRows(rows, (capability) => capability !== 'list_users')).toEqual(['Profile'])
})

test('hides a row whose parent route asks for a capability the reader lacks, as its own route allows it', async () => {
	const rows: MenuItem[] = [
		{ label: 'Thing one', to: '/things/one' },
		{ label: 'Profile', to: '/profile' },
	]

	expect(await shownRows(rows, (capability) => capability === 'edit_things')).toEqual(['Profile'])
})

test('hides every row that names a capability itself or through its routes when no can reaches the list', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', capability: 'edit_posts' },
		{ label: 'Users', to: '/users' },
		{ label: 'Thing one', to: '/things/one' },
		{ label: 'Profile', to: '/profile' },
	]

	expect(await shownRows(rows)).toEqual(['Profile'])
})

test('shows the fallback in place of a row the reader cannot open, as wp-admin swaps Users for Profile', async () => {
	const rows: MenuItem[] = [
		{ label: 'Users', to: '/users', fallback: { label: 'Profile', to: '/profile' } },
		{ label: 'Posts', to: '/posts' },
	]

	expect(await shownRows(rows, (capability) => capability !== 'list_users')).toEqual(['Profile', 'Posts'])
})

test('shows the row itself and not its fallback to a reader who can open it', async () => {
	const rows: MenuItem[] = [{ label: 'Users', to: '/users', fallback: { label: 'Profile', to: '/profile' } }]

	expect(await shownRows(rows, holdsEvery)).toEqual(['Users'])
})

test('shows nothing in the place of a row whose fallback the reader cannot open either', async () => {
	const rows: MenuItem[] = [
		{ label: 'Users', to: '/users', fallback: { label: 'Profile', to: '/profile', capability: 'read' } },
		{ label: 'Posts', to: '/posts' },
	]

	expect(await shownRows(rows, (capability) => capability === 'edit_posts')).toEqual(['Posts'])
})

test('draws a row whose address opens a route with a sidebar as a drilldown item, with the chevron', async () => {
	await renderRows('/posts', <NavigationList items={[{ label: 'Thing one', to: '/things/one' }]} />, holdsEvery)

	const row = screen.getByRole('link', { name: 'Thing one' })
	expect(row.querySelector('.godmin-navigation-item__drilldown-indicator')).not.toBeNull()
	expect(row.id).not.toBe('')
})

test('draws a row as a navigation item inside the sub menu its address opens, with no chevron', async () => {
	await renderRows('/things/two', <NavigationList items={[{ label: 'Thing one', to: '/things/one' }]} />, holdsEvery)

	const row = screen.getByRole('link', { name: 'Thing one' })
	expect(row.querySelector('.godmin-navigation-item__drilldown-indicator')).toBeNull()
	expect(row.id).toBe('')
})

test('draws a row whose address opens no route with a sidebar as a navigation item', async () => {
	await renderRows('/posts', <NavigationList items={[{ label: 'Posts', to: '/posts' }]} />, holdsEvery)

	const row = screen.getByRole('link', { name: 'Posts' })
	expect(row.querySelector('.godmin-navigation-item__drilldown-indicator')).toBeNull()
})

test('draws the rows the app draws itself after the rows of items, in the same list', async () => {
	await renderRows(
		'/things/one',
		<NavigationList items={[{ label: 'Posts', to: '/posts' }]}>
			<NavigationItem to="/things/$thingId" params={{ thingId: 'two' }}>
				<div>Maria Perez</div>
				<div>Called from 184467235</div>
			</NavigationItem>
		</NavigationList>,
		holdsEvery,
	)

	expect(screen.getAllByRole('list')).toHaveLength(1)
	expect(rowLabels()).toEqual(['Posts', 'Maria PerezCalled from 184467235'])
	expect(screen.getByRole('link', { name: 'Maria Perez Called from 184467235' }).getAttribute('href')).toBe(
		'/things/two',
	)
})

test('a row the app draws reads the can the screen around the list hands down', async () => {
	const lacking: Can = (capability) => capability !== 'edit_things'
	await renderRows(
		'/posts',
		<NavigationList>
			<NavigationItem to="/things/$thingId" params={{ thingId: 'two' }}>
				Thing two
			</NavigationItem>
			<NavigationItem to="/things">Things</NavigationItem>
		</NavigationList>,
		lacking,
	)

	expect(rowLabels()).toEqual(['Things'])
})

test('pulls the list 16px wider on each side with no bullets, so the rows span the column', async () => {
	const list = await drawList([{ label: 'Posts', to: '/posts' }])

	expect(declaredValue(list, 'margin-inline')).toBe('-16px')
	expect(declaredValue(list, 'margin-block')).toBe('0')
	expect(declaredValue(list, 'padding')).toBe('0')
	expect(declaredValue(list, 'list-style')).toBe('none')
})

test('keeps the labels in line with a 24px placeholder where one row has no icon', async () => {
	await renderRows(
		'/posts',
		<NavigationList
			items={[
				{ label: 'Posts', to: '/posts', icon: post },
				{ label: 'Profile', to: '/profile' },
			]}
		/>,
	)

	const [first, second] = screen.getAllByRole('link')
	expect(first.firstElementChild?.tagName).toBe('svg')
	expect(first.firstElementChild?.getAttribute('class')).toBe('godmin-navigation-item__icon')
	const placeholder = second.firstElementChild as Element
	expect(placeholder.tagName).toBe('SPAN')
	expect(placeholder.className).toBe('godmin-navigation-item__icon')
	expect(placeholder.getAttribute('aria-hidden')).toBe('true')
	expect(placeholder.childNodes).toHaveLength(0)
})

test('gives a row the app draws the same placeholder when the rows of items have icons', async () => {
	await renderRows(
		'/posts',
		<NavigationList items={[{ label: 'Profile', to: '/profile', icon: people }]}>
			<NavigationItem to="/posts">Posts</NavigationItem>
		</NavigationList>,
	)

	const row = screen.getByRole('link', { name: 'Posts' })
	expect(row.firstElementChild?.className).toBe('godmin-navigation-item__icon')
})

test('gives a row the app draws the placeholder when another row it draws has an icon', async () => {
	await renderRows(
		'/posts',
		<NavigationList>
			<NavigationItem to="/posts" icon={post}>
				Posts
			</NavigationItem>
			<NavigationItem to="/profile">Profile</NavigationItem>
		</NavigationList>,
	)

	const row = screen.getByRole('link', { name: 'Profile' })
	expect(row.firstElementChild?.className).toBe('godmin-navigation-item__icon')
})

test('gives the rows of items the placeholder when a row the app draws has an icon', async () => {
	await renderRows(
		'/posts',
		<NavigationList items={[{ label: 'Profile', to: '/profile' }]}>
			<NavigationItem to="/posts" icon={people}>
				Posts
			</NavigationItem>
		</NavigationList>,
	)

	const row = screen.getByRole('link', { name: 'Profile' })
	expect(row.firstElementChild?.className).toBe('godmin-navigation-item__icon')
})

test('draws no placeholder when the only row the app draws with an icon is hidden', async () => {
	await renderRows(
		'/posts',
		<NavigationList items={[{ label: 'Profile', to: '/profile' }]}>
			<NavigationItem to="/users" icon={people}>
				Users
			</NavigationItem>
		</NavigationList>,
	)

	expect(screen.queryByRole('link', { name: 'Users' })).toBeNull()
	expect(screen.getByRole('list').querySelector('.godmin-navigation-item__icon')).toBeNull()
})

test('draws no placeholder when no row has an icon', async () => {
	const list = await drawList([
		{ label: 'Posts', to: '/posts' },
		{ label: 'Profile', to: '/profile' },
	])

	expect(list.querySelector('.godmin-navigation-item__icon')).toBeNull()
})

test('draws no placeholder when the only row with an icon is hidden', async () => {
	const list = await drawList([
		{ label: 'Users', to: '/users', icon: people },
		{ label: 'Profile', to: '/profile' },
	])

	expect(rowLabels()).toEqual(['Profile'])
	expect(list.querySelector('.godmin-navigation-item__icon')).toBeNull()
})

/**
 * Draws a list whose first row arrives later, as rows waiting on a query do.
 * @returns The button that brings the row, and the list.
 */
function ArrivingRows() {
	const [arrived, setArrived] = useState(false)
	const profile: MenuItem = { label: 'Profile', to: '/profile' }
	return (
		<>
			<button type="button" onClick={() => setArrived(true)}>
				Arrive
			</button>
			<NavigationList items={arrived ? [{ label: 'Posts', to: '/posts' }, profile] : [profile]} />
		</>
	)
}

test('keeps a row its own link when a row arrives above it, so a pointer or focus on it stays on it', async () => {
	await renderRows('/posts', <ArrivingRows />)
	const profile = screen.getByRole('link', { name: 'Profile' })

	fireEvent.click(screen.getByRole('button', { name: 'Arrive' }))

	await screen.findByRole('link', { name: 'Posts' })
	expect(screen.getByRole('link', { name: 'Profile' })).toBe(profile)
})

/** The rows the access check is asked about, each named by what it asks for. */
const askedRows: Record<string, Pick<MenuItem, 'to' | 'capability'>> = {
	own: { to: '/posts', capability: 'edit_posts' },
	route: { to: '/users' },
	parent: { to: '/things/one' },
	none: { to: '/profile' },
}

/**
 * Draws what the access check answers for each asked row.
 * @param props - The check the app gives, if any.
 * @returns One line naming each row and its answer.
 */
function AccessProbe({ can }: { can?: Can }) {
	const canAccess = useCanAccess(can)
	return (
		<p data-testid="answers">
			{Object.entries(askedRows)
				.map(([name, row]) => `${name} ${canAccess(row) ? 'yes' : 'no'}`)
				.join(', ')}
		</p>
	)
}

test('useCanAccess gives the answers the list gives, own capability and every route of the address alike', async () => {
	await renderRows(
		'/posts',
		<AccessProbe can={(capability) => capability === 'edit_posts' || capability === 'edit_things'} />,
	)

	expect(screen.getByTestId('answers').textContent).toBe('own yes, route no, parent no, none yes')
})

test('useCanAccess allows a row whose capability and routes the reader all holds', async () => {
	await renderRows('/posts', <AccessProbe can={holdsEvery} />)

	expect(screen.getByTestId('answers').textContent).toBe('own yes, route yes, parent yes, none yes')
})

test('useCanAccess fails closed when no can is given, allowing only a row that names no capability', async () => {
	await renderRows('/posts', <AccessProbe />)

	expect(screen.getByTestId('answers').textContent).toBe('own no, route no, parent no, none yes')
})
