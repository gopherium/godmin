// SPDX-License-Identifier: Apache-2.0

import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import type { ReactNode } from 'react'

import { ScreenContext } from '../src/navigation-state.js'
import type { Can } from '../src/navigation-state.js'
import { renderAdmin } from '../src/testing.js'

/** A reader who holds every capability. */
export const holdsEvery: Can = () => true

/**
 * Stands in for a sidebar screen, which the row tests never draw.
 * @returns Nothing.
 */
const noScreen = () => null

/**
 * Returns a router drawing rows: its users route and things section ask for capabilities,
 * and the things section and its param route each declare a sidebar screen.
 * @param path - The address to start at.
 * @param rows - The rows to draw.
 * @param can - The check the screen around the rows hands down, none when absent.
 * @returns The router, not drawn yet.
 */
export function routerWithRows(path: string, rows: ReactNode, can?: Can) {
	const rootRoute = createRootRoute({
		component: () => (
			<ScreenContext.Provider value={{ can }}>
				<div data-testid="rows">{rows}</div>
			</ScreenContext.Provider>
		),
	})
	const posts = createRoute({ getParentRoute: () => rootRoute, path: '/posts' })
	const profile = createRoute({ getParentRoute: () => rootRoute, path: '/profile' })
	const users = createRoute({
		getParentRoute: () => rootRoute,
		path: '/users',
		staticData: { capability: 'list_users' },
	})
	const things = createRoute({
		getParentRoute: () => rootRoute,
		path: '/things',
		staticData: { Sidebar: noScreen, capability: 'list_things' },
	})
	const thing = createRoute({
		getParentRoute: () => things,
		path: '$thingId',
		staticData: { Sidebar: noScreen, capability: 'edit_things' },
	})
	return createRouter({
		routeTree: rootRoute.addChildren([posts, profile, users, things.addChildren([thing])]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
}

/**
 * Draws the rows of a router.
 * @param router - A router from routerWithRows.
 * @returns The router, once it has drawn the rows.
 */
export async function drawRows<T extends ReturnType<typeof routerWithRows>>(router: T): Promise<T> {
	renderAdmin(<RouterProvider router={router} />)
	await screen.findByTestId('rows')
	return router
}

/**
 * Renders rows in the router of routerWithRows.
 * @param path - The address to start at.
 * @param rows - The rows to draw.
 * @param can - The check the screen around the rows hands down, none when absent.
 * @returns The router, once it has drawn the rows.
 */
export function renderRows(path: string, rows: ReactNode, can?: Can) {
	return drawRows(routerWithRows(path, rows, can))
}
