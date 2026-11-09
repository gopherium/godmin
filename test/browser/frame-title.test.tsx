// SPDX-License-Identifier: Apache-2.0

import {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	useRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { Frame } from '../../src/frame.js'
import { Page } from '../../src/page.js'
import { routerDefaults, useFrameLocation, useShownPath } from '../../src/router.js'
import { Toaster, useToaster } from '../../src/toaster.js'

/** What the two live regions hold at one layout. */
interface Regions {
	polite: string
	assertive: string
}

/** The work each test leaves to undo once it ends. */
const undo: Array<() => void> = []

afterEach(() => {
	undo.splice(0).forEach((step) => step())
})

/** Returns what the two live regions hold now. */
function regions(): Regions {
	return {
		polite: document.getElementById('a11y-speak-polite')?.textContent ?? '',
		assertive: document.getElementById('a11y-speak-assertive')?.textContent ?? '',
	}
}

/** Waits for the next rendering update of the page. */
function nextFrame(): Promise<void> {
	return new Promise((done) => requestAnimationFrame(() => done()))
}

/** Records what the live regions hold at the first layout after each line spoken into them. */
function recordLayouts(): Regions[] {
	const seen: Regions[] = []
	const probe = document.createElement('div')
	probe.style.cssText = 'position: fixed; left: 0; top: 0; height: 1px; width: 1px; opacity: 0; pointer-events: none'
	document.body.append(probe)
	let width = 1
	let armed = false
	let first = true
	const resize = new ResizeObserver(() => {
		if (first || !armed) {
			first = false
			return
		}
		armed = false
		seen.push(regions())
	})
	resize.observe(probe)
	const spoken = new MutationObserver(() => {
		const { polite, assertive } = regions()
		if (polite !== '' || assertive !== '') {
			armed = true
			width = width >= 50 ? 1 : width + 1
			probe.style.width = `${width}px`
		}
	})
	for (const id of ['a11y-speak-polite', 'a11y-speak-assertive']) {
		spoken.observe(document.getElementById(id) as HTMLElement, { childList: true })
	}
	undo.push(() => {
		resize.disconnect()
		spoken.disconnect()
		probe.remove()
	})
	return seen
}

/** Draws a record with a Delete button that raises a toast and opens the list, as a delete does. */
function RecordScreen() {
	const toaster = useToaster()
	const router = useRouter()
	return (
		<Page title="Maria Perez">
			<button
				type="button"
				onClick={() => {
					toaster.show('Maria Perez deleted')
					void router.navigate({ to: '/contacts' })
				}}
			>
				Delete
			</button>
		</Page>
	)
}

/** Returns a router drawing a frame given the router's hooks, on a record that can be deleted. */
function adminRouter() {
	const rootRoute = createRootRoute({
		component: function Layout() {
			return (
				<Toaster>
					<Frame.Root shownPath={useShownPath()} location={useFrameLocation()}>
						<Frame.Canvas>
							<Outlet />
						</Frame.Canvas>
					</Frame.Root>
				</Toaster>
			)
		},
	})
	const contacts = createRoute({
		getParentRoute: () => rootRoute,
		path: '/contacts',
		component: () => (
			<Page title="Contacts">
				<p>Contact rows</p>
			</Page>
		),
	})
	const record = createRoute({ getParentRoute: () => rootRoute, path: '/contacts/c1', component: RecordScreen })
	return createRouter({
		routeTree: rootRoute.addChildren([contacts, record]),
		history: createMemoryHistory({ initialEntries: ['/contacts/c1'] }),
		...routerDefaults(),
	})
}

test('lets a layout show the toast of a delete before the title of the list it opens empties it', async () => {
	render(
		<AdminRoot>
			<RouterProvider router={adminRouter()} />
		</AdminRoot>,
	)
	await screen.findByRole('heading', { name: 'Maria Perez' })
	const seen = recordLayouts()

	await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
	await expect.poll(() => regions().assertive).toBe('Contacts')
	await nextFrame()
	await nextFrame()

	expect(seen).toEqual([
		{ polite: 'Maria Perez deleted', assertive: '' },
		{ polite: '', assertive: 'Contacts' },
	])
})
