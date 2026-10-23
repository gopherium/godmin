// SPDX-License-Identifier: Apache-2.0

import { createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router'
import { expect, test, vi } from 'vitest'

import { findDrilldownParent, findRouteCapabilities } from '../src/path-matching.js'

/**
 * Draws the sidebar screen of the things section.
 * @returns Nothing, the lookup never draws it.
 */
function ThingsScreen() {
	return null
}

/**
 * Draws the sidebar screen of one thing.
 * @returns Nothing, the lookup never draws it.
 */
function ThingScreen() {
	return null
}

/**
 * Returns a router whose things section and its param route each declare a sidebar screen and a capability.
 * @param path - The address the router starts at.
 * @returns The router, never loaded.
 */
function routerWithThings(path = '/posts') {
	const rootRoute = createRootRoute()
	const posts = createRoute({ getParentRoute: () => rootRoute, path: '/posts' })
	const things = createRoute({
		getParentRoute: () => rootRoute,
		path: '/things',
		staticData: { Sidebar: ThingsScreen, capability: 'list_things' },
	})
	const thing = createRoute({
		getParentRoute: () => things,
		path: '$thingId',
		staticData: { Sidebar: ThingScreen, capability: 'edit_things' },
	})
	return createRouter({
		routeTree: rootRoute.addChildren([posts, things.addChildren([thing])]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
}

test('finds the deepest route that declares a sidebar for an address with a param', () => {
	const router = routerWithThings()

	expect(findDrilldownParent(router, { to: '/things/$thingId', params: { thingId: 'one' } })).toBe('/things/$thingId')
})

test('finds the same route for the real address a menu item names', () => {
	const router = routerWithThings()

	expect(findDrilldownParent(router, { to: '/things/one' })).toBe('/things/$thingId')
})

test('finds the section route for an address that stops at the section', () => {
	const router = routerWithThings()

	expect(findDrilldownParent(router, { to: '/things' })).toBe('/things')
})

test('finds none for an address whose routes declare no sidebar', () => {
	const router = routerWithThings()

	expect(findDrilldownParent(router, { to: '/posts' })).toBeUndefined()
})

test('looks an address with no to up at the current location, where a link without one points', () => {
	const router = routerWithThings('/things/one')

	expect(findDrilldownParent(router, { search: { status: 'trash' } })).toBe('/things/$thingId')
})

test('finds none for an address with a scheme and asks no route', () => {
	const router = routerWithThings()
	const build = vi.spyOn(router, 'buildLocation')
	const match = vi.spyOn(router, 'matchRoutes')

	expect(findDrilldownParent(router, { to: 'https://example.com/help' })).toBeUndefined()
	expect(findRouteCapabilities(router, { to: 'mailto:maria.perez@example.com' })).toEqual([])
	expect(build).not.toHaveBeenCalled()
	expect(match).not.toHaveBeenCalled()
})

test('collects the capability of every route the address opens, parents included', () => {
	const router = routerWithThings()

	expect(findRouteCapabilities(router, { to: '/things/one' })).toEqual(['list_things', 'edit_things'])
})

test('collects no capability for an address whose routes name none', () => {
	const router = routerWithThings()

	expect(findRouteCapabilities(router, { to: '/posts' })).toEqual([])
})

test('keeps the answer per address, so a second lookup of the same address matches no route again', () => {
	const router = routerWithThings()
	const match = vi.spyOn(router, 'matchRoutes')

	findDrilldownParent(router, { to: '/things/one' })
	findDrilldownParent(router, { to: '/things/$thingId', params: { thingId: 'one' } })
	findRouteCapabilities(router, { to: '/things/one' })
	findDrilldownParent(router, { to: '/things/two' })

	expect(match).toHaveBeenCalledTimes(2)
})

test('builds the address of a row that names only where it goes once, however many times it is asked', () => {
	const router = routerWithThings()
	const build = vi.spyOn(router, 'buildLocation')

	findDrilldownParent(router, { to: '/things/one' })
	findRouteCapabilities(router, { to: '/things/one' })
	findDrilldownParent(router, { to: '/things/one' })

	expect(build).toHaveBeenCalledTimes(1)
})

test('works an address out again once the router moves, keeping the answers of the current location only', async () => {
	const router = routerWithThings()
	const match = vi.spyOn(router, 'matchRoutes')
	const lookups = () => match.mock.calls.filter(([pathname]) => pathname === '/things/one')
	findDrilldownParent(router, { to: '/things/one' })
	findDrilldownParent(router, { to: '/things/$thingId', params: { thingId: 'one' } })
	expect(lookups()).toHaveLength(1)

	await router.navigate({ to: '/posts' })
	findDrilldownParent(router, { to: '/things/one' })

	expect(lookups()).toHaveLength(2)
})

test('runs no route context, beforeLoad or loader while it looks an address up', () => {
	const context = vi.fn(() => ({}))
	const beforeLoad = vi.fn()
	const loader = vi.fn()
	const rootRoute = createRootRoute()
	const thing = createRoute({
		getParentRoute: () => rootRoute,
		path: '/things/$thingId',
		staticData: { Sidebar: ThingScreen },
		context,
		beforeLoad,
		loader,
	})
	const router = createRouter({
		routeTree: rootRoute.addChildren([thing]),
		history: createMemoryHistory({ initialEntries: ['/'] }),
	})

	expect(findDrilldownParent(router, { to: '/things/one' })).toBe('/things/$thingId')
	expect(context).not.toHaveBeenCalled()
	expect(beforeLoad).not.toHaveBeenCalled()
	expect(loader).not.toHaveBeenCalled()
})
