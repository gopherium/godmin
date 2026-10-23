// SPDX-License-Identifier: Apache-2.0

import {
	Link,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRouter,
} from '@tanstack/react-router'
import { act, screen, within } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { lazy } from 'react'
import type { ComponentType } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import spanish from '../src/list-chrome/es-ES.js'
import { Navigation } from '../src/navigation.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'
import { clickLink, laterModule, renderSidebarApp, screenWrapper } from './sidebar-app.js'

installTestEnvironment()

afterEach(() => {
	vi.restoreAllMocks()
	resetLocaleData()
})

/** The class of the keyed wrapper the sidebar screen slides in. */
const WRAPPER = 'godmin-navigation__screen-wrapper'

/**
 * Returns the heading the sidebar screen shows.
 * @returns The text of the level 1 heading.
 */
function screenTitle(): string {
	return screen.getByRole('heading', { level: 1 }).textContent ?? ''
}

test('draws the root screen from its title and rows when no matched route declares a sidebar', async () => {
	await renderSidebarApp('/posts')

	expect(screenTitle()).toBe('Acme')
	const rows = within(screen.getByRole('list')).getAllByRole('link')
	expect(rows.map((row) => row.textContent)).toEqual(['Posts', 'Pages', 'Users', 'Chats', 'Later'])
	expect(screen.getByRole('link', { name: 'Chats' }).querySelector('.godmin-navigation-item__drilldown-indicator'))
		.not.toBeNull()
})

test('shows the screen of the deepest matched route that declares a sidebar, on every page under it', async () => {
	await renderSidebarApp('/chats/one')

	expect(screenTitle()).toBe('Chats')
	expect(screen.getByRole('link', { name: 'First chat' })).not.toBeNull()
	expect(screen.queryByRole('link', { name: 'Posts' })).toBeNull()
})

test('keeps the same screen when only the param of its route changes, with no slide', async () => {
	const router = await renderSidebarApp('/things/one')
	const wrapper = screenWrapper()

	await act(() => router.navigate({ to: '/things/$thingId', params: { thingId: 'two' } }))

	expect(await screen.findByText('Thing page')).not.toBeNull()
	expect(router.state.location.pathname).toBe('/things/two')
	expect(screenWrapper()).toBe(wrapper)
	expect(wrapper.className).toBe(WRAPPER)
})

test('goes back to the root screen when the address leaves every sub menu', async () => {
	const router = await renderSidebarApp('/chats')

	await act(() => router.navigate({ to: '/posts' }))

	expect(screenTitle()).toBe('Acme')
})

test('slides a sub menu in from the end after a drilldown row opens it', async () => {
	await renderSidebarApp('/posts')

	await clickLink('Chats')

	expect(screenTitle()).toBe('Chats')
	expect(screenWrapper().className).toBe(`${WRAPPER} ${WRAPPER}--forward`)
})

test('slides the root screen back in from the start after Back', async () => {
	await renderSidebarApp('/posts')
	await clickLink('Chats')

	await clickLink('Back')

	expect(screenTitle()).toBe('Acme')
	expect(screenWrapper().className).toBe(`${WRAPPER} ${WRAPPER}--backward`)
})

test('plays no slide on first load, after a navigation row, a link elsewhere or the browser Back', async () => {
	const router = await renderSidebarApp('/posts')
	expect(screenWrapper().className).toBe(WRAPPER)

	await clickLink('Pages')
	expect(await screen.findByText('Pages page')).not.toBeNull()
	expect(screenWrapper().className).toBe(WRAPPER)

	await act(() => router.navigate({ to: '/chats' }))
	expect(screenTitle()).toBe('Chats')
	expect(screenWrapper().className).toBe(WRAPPER)

	await act(async () => {
		router.history.back()
	})
	expect(await screen.findByRole('heading', { level: 1, name: 'Acme' })).not.toBeNull()
	expect(screenWrapper().className).toBe(WRAPPER)
})

test('focuses Back on the sub menu a drilldown row opens', async () => {
	await renderSidebarApp('/posts')

	await clickLink('Chats')

	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Back' }))
})

test('focuses the drilldown row the reader came from when Back closes the sub menu', async () => {
	await renderSidebarApp('/posts')
	await clickLink('Chats')

	await clickLink('Back')

	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Chats' }))
})

test('focuses that row after the reader moved inside the sub menu before Back', async () => {
	await renderSidebarApp('/posts')
	await clickLink('Chats')
	await clickLink('First chat')
	expect(await screen.findByText('Chat page')).not.toBeNull()

	await clickLink('Back')

	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Chats' }))
})

test('focuses the first link of the screen when the row the reader came from is gone', async () => {
	await renderSidebarApp('/things/one')
	await clickLink('A chat')
	expect(screenTitle()).toBe('Chats')

	await clickLink('Back')

	expect(screenTitle()).toBe('Acme')
	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Posts' }))
})

test('focuses the first link of the root screen after Back on a sub menu reached by a link elsewhere', async () => {
	const router = await renderSidebarApp('/posts')
	await clickLink('Chats')
	await act(() => router.navigate({ to: '/things/$thingId', params: { thingId: 'one' } }))
	expect(screenTitle()).toBe('Thing')

	await clickLink('Back')

	expect(screenTitle()).toBe('Acme')
	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Posts' }))
})

test('moves no focus on a screen reached by a link elsewhere', async () => {
	const router = await renderSidebarApp('/posts')
	screen.getByRole('link', { name: 'Pages' }).focus()

	await act(() => router.navigate({ to: '/chats' }))

	expect(screenTitle()).toBe('Chats')
	expect(document.activeElement).toBe(document.body)
})

test('leaves no direction behind after a drilldown row that opens no other screen', async () => {
	const router = await renderSidebarApp('/things/one')
	await clickLink('Thing two')
	expect(router.state.location.pathname).toBe('/things/two')

	await act(() => router.navigate({ to: '/chats' }))

	expect(screenTitle()).toBe('Chats')
	expect(screenWrapper().className).toBe(WRAPPER)
	expect(document.activeElement).not.toBe(screen.getByRole('link', { name: 'Back' }))
})

/**
 * Clicks a link while the app blocks every move, then lifts the block.
 * @param router - The router of the app.
 * @param name - The accessible name of the link.
 */
async function clickBlocked(router: Awaited<ReturnType<typeof renderSidebarApp>>, name: string): Promise<void> {
	const unblock = router.history.block({ blockerFn: () => true, enableBeforeUnload: false })
	const before = router.state.location.href
	await clickLink(name)
	expect(router.state.location.href).toBe(before)
	unblock()
}

test('plays no slide and moves no focus on a link elsewhere after the app blocked a drilldown row', async () => {
	const router = await renderSidebarApp('/posts')
	await clickBlocked(router, 'Chats')

	await act(() => router.navigate({ to: '/things/$thingId', params: { thingId: 'one' } }))

	expect(screenTitle()).toBe('Thing')
	expect(screenWrapper().className).toBe(WRAPPER)
	expect(document.activeElement).toBe(document.body)
})

test('plays no slide on a link elsewhere after the app blocked Back', async () => {
	const router = await renderSidebarApp('/chats/one')
	await clickBlocked(router, 'Back')

	await act(() => router.navigate({ to: '/things/$thingId', params: { thingId: 'one' } }))

	expect(screenTitle()).toBe('Thing')
	expect(screenWrapper().className).toBe(WRAPPER)
	expect(document.activeElement).toBe(document.body)
})

test('goes to home when Back is pressed on a sub screen that names no back of its own', async () => {
	const router = await renderSidebarApp('/chats/one')

	await clickLink('Back')

	expect(router.state.location.pathname).toBe('/posts')
})

test('draws no Back on the root screen', async () => {
	await renderSidebarApp('/posts')

	expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
})

test('draws no landmark of its own, as the Site Editor draws none inside the region of its sidebar', async () => {
	await renderSidebarApp('/posts')

	const menu = screenWrapper().parentElement as Element
	expect(menu.className).toBe('godmin-navigation')
	expect(menu.tagName).toBe('DIV')
	expect(menu.hasAttribute('aria-label')).toBe(false)
	expect(screen.queryByRole('navigation')).toBeNull()
})

test('leaves the name Navigation to the one region around the column, in every language', async () => {
	setLocaleData(spanish)
	await renderSidebarApp('/posts')

	const region = screen.getByRole('region', { name: 'Navegación' })
	expect(region.contains(screenWrapper())).toBe(true)
	expect(screen.getAllByRole('region', { name: 'Navegación' })).toHaveLength(1)
	expect(screen.queryByRole('navigation', { name: 'Navegación' })).toBeNull()
})

test('hands the can it is given to the rows the app draws on a sub screen', async () => {
	await renderSidebarApp('/chats', { can: (capability) => capability !== 'list_users' })

	expect(screen.getByRole('link', { name: 'First chat' })).not.toBeNull()
	expect(screen.queryByRole('link', { name: 'Members' })).toBeNull()
})

test('starts the slide and the focus move once the code of a lazy sub menu screen has arrived', async () => {
	let arrive: (screen: { default: ComponentType }) => void = () => undefined
	const later = lazy(() => new Promise<{ default: ComponentType }>((resolve) => (arrive = resolve)))
	await renderSidebarApp('/posts', { later })

	await clickLink('Later')
	await act(async () => {
		arrive(laterModule)
	})

	expect(await screen.findByRole('heading', { level: 1, name: 'Later' })).not.toBeNull()
	expect(screenWrapper().className).toBe(`${WRAPPER} ${WRAPPER}--forward`)
	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Back' }))
})

/**
 * Draws a sub menu screen with no Back whose first controls take no focus from the Tab key.
 * @returns The screen element.
 */
function untabbableFirstScreen() {
	return (
		<div>
			<button type="button" disabled>
				Off
			</button>
			<a href="/posts" tabIndex={-1}>
				Skipped
			</a>
			<a href="/pages">Reached</a>
		</div>
	)
}

/**
 * Draws a sub menu screen with no control at all.
 * @returns The screen element.
 */
function controlFreeScreen() {
	return <p>Nothing to press</p>
}

test('focuses the first control the Tab key reaches on a sub menu with no Back, past a disabled one', async () => {
	await renderSidebarApp('/posts', { later: untabbableFirstScreen })

	await clickLink('Later')

	expect(document.activeElement).toBe(screen.getByRole('link', { name: 'Reached' }))
})

test('focuses the screen wrapper itself when a sub menu holds no control, so focus stays in the sidebar', async () => {
	await renderSidebarApp('/posts', { later: controlFreeScreen })

	await clickLink('Later')

	expect(screen.getByText('Nothing to press')).not.toBeNull()
	expect(document.activeElement).toBe(screenWrapper())
	expect(screenWrapper().getAttribute('tabindex')).toBe('-1')
})

test('throws an error naming Frame.Root when no Frame.Root is above it', async () => {
	vi.spyOn(console, 'error').mockImplementation(() => undefined)
	vi.spyOn(console, 'warn').mockImplementation(() => undefined)
	const rootRoute = createRootRoute({
		component: () => <Navigation title="Acme" items={[]} home={<Link to="/" />} />,
		errorComponent: ({ error }) => <p>{(error as Error).message}</p>,
	})
	const router = createRouter({ routeTree: rootRoute, history: createMemoryHistory({ initialEntries: ['/'] }) })

	renderAdmin(<RouterProvider router={router} />)

	expect(await screen.findByText(/Frame\.Root/)).not.toBeNull()
})
