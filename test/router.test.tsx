// SPDX-License-Identifier: Apache-2.0

import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { useCanvas, useFrameLocation } from '../src/router.js'
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
