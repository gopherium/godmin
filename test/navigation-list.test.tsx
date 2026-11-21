// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen, within } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { people, post } from '@wordpress/icons'
import { Text } from '@wordpress/ui'
import { useState } from 'react'
import { afterEach, expect, test } from 'vitest'

import spanish from '../src/list-chrome/es-ES.js'
import { useCanAccess } from '../src/menu-item.js'
import type { MenuItem } from '../src/menu-item.js'
import { NavigationItem } from '../src/navigation-item.js'
import { NavigationList } from '../src/navigation-list.js'
import type { Can } from '../src/navigation-state.js'
import { installTestEnvironment } from '../src/testing.js'
import { holdsEvery, renderRows } from './sidebar-routes.js'
import { declaredValue } from './styles.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

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

/**
 * Returns the class of every element a row link holds, in order.
 * @param row - The row link.
 * @returns The class attribute of each child of the link.
 */
function partsOf(row: Element): (string | null)[] {
	return [...row.children].map((part) => part.getAttribute('class'))
}

test(
	'draws the count of a row at its end, the number hidden from screen readers and the sentence read for it',
	async () => {
		await renderRows(
			'/profile',
			<NavigationList items={[{ label: 'Posts', to: '/posts', count: { value: 3, label: '3 posts waiting' } }]} />,
		)

		const row = screen.getByRole('link', { name: 'Posts 3 posts waiting' })
		expect(row.className).toBe('godmin-navigation-item')
		expect(partsOf(row)).toEqual(['godmin-navigation-item__label', 'godmin-navigation-item__suffix'])
		const badge = row.querySelector('.godmin-navigation-item__suffix .godmin-menu-count__badge') as Element
		expect(badge.textContent).toBe('3')
		expect(badge.getAttribute('aria-hidden')).toBe('true')
		expect(within(row).getByText('3 posts waiting').hasAttribute('data-visually-hidden')).toBe(true)
	},
)

test.each([0, -1])('draws nothing for a count of %i, as WordPress hides its count-0 bubble', async (value) => {
	await renderRows(
		'/profile',
		<NavigationList items={[{ label: 'Posts', to: '/posts', count: { value, label: `${value} posts waiting` } }]} />,
	)

	const row = screen.getByRole('link', { name: 'Posts' })
	expect(row.className).toBe('godmin-navigation-item')
	expect(partsOf(row)).toEqual(['godmin-navigation-item__label'])
	expect(row.textContent).toBe('Posts')
})

test(
	'draws the count of a row that opens a sub menu before its chevron, as the WordPress Plugins row does',
	async () => {
		const thing: MenuItem = { label: 'Thing one', to: '/things/one', count: { value: 2, label: '2 things waiting' } }
		await renderRows('/posts', <NavigationList items={[thing]} />, holdsEvery)

		const row = screen.getByRole('link', { name: 'Thing one 2 things waiting' })
		expect(row.className).toBe('godmin-navigation-item')
		expect(partsOf(row)).toEqual([
			'godmin-navigation-item__label',
			'godmin-navigation-item__suffix',
			'godmin-navigation-item__drilldown-indicator',
		])
		expect(row.querySelector('.godmin-navigation-item__suffix .godmin-menu-count__badge')?.textContent).toBe('2')
	},
)

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

/**
 * Returns each part the list draws, in order: a section as its label and rows, a list with no section as its rows.
 * @returns One line per part.
 */
function drawnParts(): string[] {
	return [...screen.getByTestId('rows').children].map((part) => {
		const rows = within(part as HTMLElement)
			.queryAllByRole('listitem')
			.map((row) => row.textContent)
			.join(', ')
		const label = part.getAttribute('aria-labelledby')
		return label === null ? rows : `${document.getElementById(label)?.textContent}: ${rows}`
	})
}

/**
 * Draws the given rows on the posts page and returns each part the list draws.
 * @param items - The rows as data.
 * @param can - The check the screen around the list hands down, every capability when absent.
 * @returns One line per part, as drawnParts gives them.
 */
async function sectionsOf(items: MenuItem[], can: Can = holdsEvery): Promise<string[]> {
	await renderRows('/posts', <NavigationList items={items} />, can)
	return drawnParts()
}

test('draws the rows that name a section under its label, as a group named by it with a list of its own', async () => {
	await renderRows('/posts', <NavigationList items={[{ label: 'Posts', to: '/posts', group: 'content' }]} />)

	const section = screen.getByRole('group', { name: 'Content' })
	const [label, list] = [...section.children]
	expect(section.tagName).toBe('DIV')
	expect(section.className).toBe('godmin-navigation-group')
	expect(label.id).toBe(section.getAttribute('aria-labelledby'))
	expect(label.tagName).toBe('SPAN')
	expect(label.className.split(' ').pop()).toBe('godmin-navigation-group__label')
	expect(list.tagName).toBe('UL')
	expect(list.getAttribute('role')).toBe('list')
	expect(within(list as HTMLElement).getByRole('link', { name: 'Posts' })).not.toBeNull()
	expect(screen.queryByRole('heading')).toBeNull()
})

test('draws the label of a section in WPDS small body text, as the new admin draws it', async () => {
	const drawn = render(<Text variant="body-sm" />)
	const wpds = [...(drawn.container.firstElementChild as Element).classList]
	drawn.unmount()
	await renderRows('/posts', <NavigationList items={[{ label: 'Posts', to: '/posts', group: 'content' }]} />)

	const label = screen.getByText('Content')
	expect([...label.classList]).toEqual([...wpds, 'godmin-navigation-group__label'])
})

test('names the three sections with the words of the new admin', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', group: 'content' },
		{ label: 'Profile', to: '/profile', group: 'design' },
		{ label: 'Users', to: '/users', group: 'manage' },
	]

	expect(await sectionsOf(rows)).toEqual(['Content: Posts', 'Design: Profile', 'Manage: Users'])
})

test('names the sections in the reader language from the words godmin ships', async () => {
	setLocaleData(spanish)
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', group: 'content' },
		{ label: 'Profile', to: '/profile', group: 'design' },
		{ label: 'Users', to: '/users', group: 'manage' },
	]

	expect(await sectionsOf(rows)).toEqual(['Contenido: Posts', 'Diseño: Profile', 'Gestionar: Users'])
})

test('shows a section at the place of its first row and gathers there every row that names it', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', group: 'content' },
		{ label: 'Users', to: '/users', group: 'manage' },
		{ label: 'Profile', to: '/profile', group: 'content' },
	]

	expect(await sectionsOf(rows)).toEqual(['Content: Posts, Profile', 'Manage: Users'])
})

test('keeps a row with no section at its own place, in a list of its own and never inside a section', async () => {
	const rows: MenuItem[] = [
		{ label: 'Profile', to: '/profile' },
		{ label: 'Posts', to: '/posts', group: 'content' },
		{ label: 'Users', to: '/users' },
	]

	expect(await sectionsOf(rows)).toEqual(['Profile', 'Content: Posts', 'Users'])
	const [first, , last] = [...screen.getByTestId('rows').children]
	expect([first.tagName, first.className, last.tagName, last.className]).toEqual([
		'UL',
		'godmin-navigation-list',
		'UL',
		'godmin-navigation-list',
	])
	expect(screen.getByRole('group', { name: 'Content' }).closest('ul')).toBeNull()
})

test('draws one list and no section when no row names one, as before', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts' },
		{ label: 'Profile', to: '/profile' },
	]

	expect(await sectionsOf(rows)).toEqual(['Posts, Profile'])
	expect(screen.queryByRole('group')).toBeNull()
})

test('draws the rows the app draws after every section, outside any section', async () => {
	await renderRows(
		'/posts',
		<NavigationList items={[{ label: 'Posts', to: '/posts', group: 'content' }]}>
			<NavigationItem to="/profile">Profile</NavigationItem>
		</NavigationList>,
		holdsEvery,
	)

	expect(drawnParts()).toEqual(['Content: Posts', 'Profile'])
})

test('draws the rows the app draws in the list of the rows with no section, when that list comes last', async () => {
	await renderRows(
		'/posts',
		<NavigationList
			items={[
				{ label: 'Posts', to: '/posts', group: 'content' },
				{ label: 'Users', to: '/users' },
			]}
		>
			<NavigationItem to="/profile">Profile</NavigationItem>
		</NavigationList>,
		holdsEvery,
	)

	expect(drawnParts()).toEqual(['Content: Posts', 'Users, Profile'])
})

test('draws no section, not even its label, when the reader may open none of its rows', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', group: 'content' },
		{ label: 'Users', to: '/users', group: 'manage' },
	]

	expect(await sectionsOf(rows, (capability) => capability !== 'list_users')).toEqual(['Content: Posts'])
	expect(screen.queryByText('Manage')).toBeNull()
})

test('keeps a fallback row in the section of the row it replaces, whatever section the fallback names', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', group: 'content' },
		{
			label: 'Users',
			to: '/users',
			group: 'manage',
			fallback: { label: 'Profile', to: '/profile', group: 'content' },
		},
	]

	expect(await sectionsOf(rows, (capability) => capability !== 'list_users')).toEqual([
		'Content: Posts',
		'Manage: Profile',
	])
})

test('draws a row that opens a sub menu as a drilldown row inside its section', async () => {
	const things: MenuItem = { label: 'Things', to: '/things', group: 'content' }
	await renderRows('/posts', <NavigationList items={[things]} />, holdsEvery)

	const row = within(screen.getByRole('group', { name: 'Content' })).getByRole('link', { name: 'Things' })
	expect(row.querySelector('.godmin-navigation-item__drilldown-indicator')).not.toBeNull()
})

test('keeps one icon placeholder for the whole screen, across every section', async () => {
	const rows: MenuItem[] = [
		{ label: 'Posts', to: '/posts', icon: post, group: 'content' },
		{ label: 'Profile', to: '/profile', group: 'manage' },
	]
	await renderRows('/posts', <NavigationList items={rows} />, holdsEvery)

	const row = within(screen.getByRole('group', { name: 'Manage' })).getByRole('link', { name: 'Profile' })
	expect(row.firstElementChild?.className).toBe('godmin-navigation-item__icon')
})
