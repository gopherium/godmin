// SPDX-License-Identifier: Apache-2.0

import {
	Link,
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	lazyRouteComponent,
} from '@tanstack/react-router'
import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { useEffect } from 'react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import spanish from '../src/list-chrome/es-ES.js'
import { routerDefaults, useCanvas, useFrameLocation, useShownPath } from '../src/router.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

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

test('routerDefaults asks for preload on intent and the not found screen, and no pending screen', () => {
	expect(routerDefaults()).toStrictEqual({ defaultPreload: 'intent', defaultNotFoundComponent: expect.any(Function) })
})

/** The module a held code chunk of the slow route hands over. */
interface Chunk {
	default: () => ReactNode
}

/** What the shown path probe saw after one commit: the path, the path the frame location names, and the slow page. */
interface ShownReading {
	shown: string | undefined
	location: string
	slowDrawn: boolean
}

/** Returns a router whose root records the shown path after each commit, beside a route a loader or chunk holds. */
function routerWithSlowRoute(slow: { loader?: () => Promise<void>; chunk?: Promise<Chunk> }, readings: ShownReading[]) {
	function Shell() {
		const shown = useShownPath()
		const location = useFrameLocation()
		useEffect(() => {
			readings.push({ shown, location, slowDrawn: screen.queryByText('Slow page') !== null })
		})
		return (
			<>
				<span data-testid="shown">{shown}</span>
				<Outlet />
			</>
		)
	}
	const rootRoute = createRootRoute({ component: Shell })
	const threads = createRoute({
		getParentRoute: () => rootRoute,
		path: '/threads',
		component: () => <p>Threads page</p>,
	})
	const { chunk } = slow
	const component = chunk === undefined ? () => <p>Slow page</p> : lazyRouteComponent(() => chunk)
	const slowRoute = createRoute({ getParentRoute: () => rootRoute, path: '/slow', loader: slow.loader, component })
	return createRouter({
		routeTree: rootRoute.addChildren([threads, slowRoute]),
		history: createMemoryHistory({ initialEntries: ['/threads'] }),
	})
}

/** Returns a promise and the function that settles it. */
function held<T>(): { promise: Promise<T>; release: (value: T) => void } {
	let release: (value: T) => void = () => {}
	const promise = new Promise<T>((done) => {
		release = done
	})
	return { promise, release }
}

test('reports the first path once the router has shown it', async () => {
	renderAdmin(<RouterProvider router={routerWithSlowRoute({}, [])} />)

	await screen.findByText('Threads page')
	expect(screen.getByTestId('shown').textContent).toBe('/threads')
})

test('keeps the old path while a held loader waits, as the frame location already names the new one', async () => {
	const readings: ShownReading[] = []
	const loaded = held<void>()
	const router = routerWithSlowRoute({ loader: () => loaded.promise }, readings)
	renderAdmin(<RouterProvider router={router} />)
	await screen.findByText('Threads page')

	await act(async () => {
		void router.navigate({ to: '/slow' })
	})

	expect(screen.getByText('Threads page')).not.toBeNull()
	expect(readings.at(-1)).toEqual({ shown: '/threads', location: '/slow', slowDrawn: false })
	await act(async () => {
		loaded.release()
	})
	await waitFor(() => expect(screen.getByTestId('shown').textContent).toBe('/slow'))
	expect(readings.filter((reading) => reading.shown === '/slow' && !reading.slowDrawn)).toEqual([])
})

test('keeps the old path while a held code chunk loads, and moves once the new screen has drawn', async () => {
	const readings: ShownReading[] = []
	const chunk = held<Chunk>()
	const router = routerWithSlowRoute({ chunk: chunk.promise }, readings)
	renderAdmin(<RouterProvider router={router} />)
	await screen.findByText('Threads page')

	await act(async () => {
		void router.navigate({ to: '/slow' })
	})

	expect(screen.getByText('Threads page')).not.toBeNull()
	expect(readings.at(-1)).toEqual({ shown: '/threads', location: '/slow', slowDrawn: false })
	await act(async () => {
		chunk.release({ default: () => <p>Slow page</p> })
	})
	await waitFor(() => expect(screen.getByTestId('shown').textContent).toBe('/slow'))
	expect(readings.filter((reading) => reading.shown === '/slow' && !reading.slowDrawn)).toEqual([])
})

/** Draws a router spread with the defaults at an address no route serves, the root's own not found screen if any. */
function renderUnknownAddress(notFound?: () => ReactNode) {
	const rootRoute = createRootRoute({ component: () => <Outlet />, notFoundComponent: notFound })
	const threads = createRoute({ getParentRoute: () => rootRoute, path: '/threads', component: () => <p>Threads</p> })
	const router = createRouter({
		routeTree: rootRoute.addChildren([threads]),
		history: createMemoryHistory({ initialEntries: ['/gone'] }),
		...routerDefaults(),
	})
	return renderAdmin(<RouterProvider router={router} />)
}

test('a router spread with the defaults draws Route not found for an address no route serves', async () => {
	renderUnknownAddress()

	expect(await screen.findByRole('heading', { level: 2, name: 'Route not found' })).not.toBeNull()
	expect(screen.getByText("The page you're looking for does not exist")).not.toBeNull()
	expect(screen.queryByText('Not Found')).toBeNull()
})

test('draws the not found screen in the reader language from the words godmin ships', async () => {
	setLocaleData(spanish)
	renderUnknownAddress()

	expect(await screen.findByRole('heading', { name: 'Ruta no encontrada' })).not.toBeNull()
	expect(screen.getByText('La página que estás buscando no existe')).not.toBeNull()
})

test('lets a not found screen a route draws itself win over the default', async () => {
	renderUnknownAddress(() => <p>Own not found</p>)

	expect(await screen.findByText('Own not found')).not.toBeNull()
	expect(screen.queryByRole('heading', { name: 'Route not found' })).toBeNull()
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
