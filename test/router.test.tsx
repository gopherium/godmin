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
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { routerDefaults, useCanvas, useFrameLocation } from '../src/router.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Renders a probe inside a router whose leaf declares the given canvas.
 * @param canvas - The canvas the leaf route asks for, if any.
 * @param path - The path to start at.
 * @returns The testing library render result.
 */
function renderAt(canvas: 'padded' | 'bleed' | undefined, path = '/threads') {
	function Probe() {
		return (
			<>
				<span data-testid="canvas">{useCanvas()}</span>
				<span data-testid="location">{useFrameLocation()}</span>
			</>
		)
	}
	const rootRoute = createRootRoute({ component: Probe })
	const threads = createRoute({
		getParentRoute: () => rootRoute,
		path: '/threads',
		staticData: canvas === undefined ? {} : { canvas },
	})
	const index = createRoute({ getParentRoute: () => rootRoute, path: '/' })
	const router = createRouter({
		routeTree: rootRoute.addChildren([index, threads]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
	return renderAdmin(<RouterProvider router={router} />)
}

test('reports the padded canvas when no route asks for anything', async () => {
	renderAt(undefined)

	expect((await screen.findByTestId('canvas')).textContent).toBe('padded')
})

test('reports the canvas the deepest matching route asks for', async () => {
	renderAt('bleed')

	expect((await screen.findByTestId('canvas')).textContent).toBe('bleed')
})

test('reports a padded canvas a route asks for explicitly', async () => {
	renderAt('padded')

	expect((await screen.findByTestId('canvas')).textContent).toBe('padded')
})

test('reports the current pathname for the frame to close its drawer on', async () => {
	renderAt('bleed', '/threads')

	expect((await screen.findByTestId('location')).textContent).toBe('/threads')
})

test('reports the search beside the pathname, as a status list keeps its status there', async () => {
	renderAt('bleed', '/threads?status=trash')

	expect((await screen.findByTestId('location')).textContent).toBe('/threads?status=trash')
})

test('follows a move that changes only the search, so the drawer closes on it', async () => {
	function Probe() {
		return <span data-testid="location">{useFrameLocation()}</span>
	}
	const rootRoute = createRootRoute({ component: Probe })
	const threads = createRoute({ getParentRoute: () => rootRoute, path: '/threads' })
	const router = createRouter({
		routeTree: rootRoute.addChildren([threads]),
		history: createMemoryHistory({ initialEntries: ['/threads'] }),
	})
	renderAdmin(<RouterProvider router={router} />)
	await screen.findByText('/threads')

	await act(() => router.navigate({ to: '/threads', search: { status: 'trash' } }))

	expect(screen.getByTestId('location').textContent).toBe('/threads?status=trash')
})

test('routerDefaults asks for preload on intent and nothing else, so no pending screen shows', () => {
	expect(routerDefaults()).toStrictEqual({ defaultPreload: 'intent' })
})

test('a router spread with the defaults loads a hovered link before the click, as WordPress does', async () => {
	const loader = vi.fn()
	function Shell() {
		return (
			<>
				<Link to="/threads">Threads</Link>
				<Outlet />
			</>
		)
	}
	const rootRoute = createRootRoute({ component: Shell })
	const index = createRoute({ getParentRoute: () => rootRoute, path: '/' })
	const threads = createRoute({ getParentRoute: () => rootRoute, path: '/threads', loader })
	const router = createRouter({
		routeTree: rootRoute.addChildren([index, threads]),
		history: createMemoryHistory({ initialEntries: ['/'] }),
		...routerDefaults(),
	})
	renderAdmin(<RouterProvider router={router} />)

	await userEvent.hover(await screen.findByRole('link', { name: 'Threads' }))

	await waitFor(() => expect(loader).toHaveBeenCalled())
	expect(router.state.location.pathname).toBe('/')
})

/**
 * Renders a probe under a section route with a child, each declaring a canvas.
 * @param section - The canvas the parent route asks for.
 * @param child - The canvas the child route asks for, if any.
 * @returns The testing library render result.
 */
function renderNested(section: 'padded' | 'bleed', child: 'padded' | 'bleed' | undefined) {
	function Probe() {
		return <span data-testid="canvas">{useCanvas()}</span>
	}
	const rootRoute = createRootRoute({ component: Probe })
	const sectionRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/inbox',
		staticData: { canvas: section },
	})
	const childRoute = createRoute({
		getParentRoute: () => sectionRoute,
		path: 'threads',
		staticData: child === undefined ? {} : { canvas: child },
	})
	const router = createRouter({
		routeTree: rootRoute.addChildren([sectionRoute.addChildren([childRoute])]),
		history: createMemoryHistory({ initialEntries: ['/inbox/threads'] }),
	})
	return renderAdmin(<RouterProvider router={router} />)
}

test('lets the deepest route win over the section it sits in', async () => {
	renderNested('padded', 'bleed')

	expect((await screen.findByTestId('canvas')).textContent).toBe('bleed')
})

test('lets a child opt back to a padded canvas its section left behind', async () => {
	renderNested('bleed', 'padded')

	expect((await screen.findByTestId('canvas')).textContent).toBe('padded')
})

test('inherits the section canvas when the child asks for nothing', async () => {
	renderNested('bleed', undefined)

	expect((await screen.findByTestId('canvas')).textContent).toBe('bleed')
})
