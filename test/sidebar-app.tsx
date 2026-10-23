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
import { act, fireEvent, screen } from '@testing-library/react'
import { comment, page, people, post } from '@wordpress/icons'
import type { ComponentType } from 'react'

import { DrilldownItem } from '../src/drilldown-item.js'
import { Frame } from '../src/frame.js'
import type { MenuItem } from '../src/menu-item.js'
import { Navigation } from '../src/navigation.js'
import { NavigationItem } from '../src/navigation-item.js'
import { NavigationList } from '../src/navigation-list.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { useFrameLocation } from '../src/router.js'
import type { Can } from '../src/navigation-state.js'
import { renderAdmin } from '../src/testing.js'
import { holdsEvery } from './sidebar-routes.js'

/** The rows of the root screen. */
export const ROOT_ROWS: readonly MenuItem[] = [
	{ label: 'Posts', to: '/posts', icon: post },
	{ label: 'Pages', to: '/pages', icon: page },
	{ label: 'Users', to: '/users', icon: people },
	{ label: 'Chats', to: '/chats', icon: comment },
	{ label: 'Later', to: '/later' },
]

/**
 * Draws the sub menu of the chats section: two chats and a row to a route asking for a capability.
 * @returns The screen element.
 */
function chatsScreen() {
	return (
		<NavigationScreen title="Chats">
			<NavigationList>
				<NavigationItem to="/chats/$chatId" params={{ chatId: 'one' }}>
					First chat
				</NavigationItem>
				<NavigationItem to="/chats/$chatId" params={{ chatId: 'two' }}>
					Second chat
				</NavigationItem>
				<NavigationItem to="/users">Members</NavigationItem>
			</NavigationList>
		</NavigationScreen>
	)
}

/**
 * Draws the sub menu of one thing: a drilldown row to a chat, whose address no root row has,
 * and one to another thing on the same screen.
 * @returns The screen element.
 */
function thingScreen() {
	return (
		<NavigationScreen title="Thing">
			<NavigationList>
				<DrilldownItem to="/chats/$chatId" params={{ chatId: 'one' }}>
					A chat
				</DrilldownItem>
				<DrilldownItem to="/things/$thingId" params={{ thingId: 'two' }}>
					Thing two
				</DrilldownItem>
			</NavigationList>
		</NavigationScreen>
	)
}

/**
 * Draws the sub menu of the later section.
 * @returns The screen element.
 */
function laterScreen() {
	return (
		<NavigationScreen title="Later">
			<p>Later rows</p>
		</NavigationScreen>
	)
}

/** The module a lazy later screen loads. */
export const laterModule = { default: laterScreen }

/** How the app around the sidebar is drawn. */
export interface SidebarAppOptions {
	/** The check the app hands Navigation, a reader who holds every capability when absent. */
	can?: Can
	/** The name the app gives the column region. */
	label?: string
	/** The sidebar screen of the later section. */
	later?: ComponentType
}

/**
 * Returns a router drawing a whole admin: a frame whose sidebar holds a Navigation over the root rows
 * with an account footer and a version note, and a canvas holding the page.
 * @param path - The address to start at.
 * @param options - The check, the region name and the later screen.
 * @returns The router, not drawn yet.
 */
export function sidebarAppRouter(path: string, options: SidebarAppOptions = {}) {
	const { can = holdsEvery, label, later = laterScreen } = options
	const rootRoute = createRootRoute({
		component: function Layout() {
			return (
				<Frame.Root location={useFrameLocation()}>
					<Frame.Sidebar
						brand={<span>Acme</span>}
						menuLabel="Open navigation"
						label={label}
						footer={<button type="button">Maria Perez</button>}
						footerNote="v1.2.3"
					>
						<Navigation title="Acme" items={ROOT_ROWS} home={<Link to="/posts" />} can={can} />
					</Frame.Sidebar>
					<Frame.Canvas>
						<Outlet />
					</Frame.Canvas>
				</Frame.Root>
			)
		},
	})
	const textPage = (name: string) => () => <p>{name}</p>
	const posts = createRoute({ getParentRoute: () => rootRoute, path: '/posts', component: textPage('Posts page') })
	const pages = createRoute({ getParentRoute: () => rootRoute, path: '/pages', component: textPage('Pages page') })
	const users = createRoute({
		getParentRoute: () => rootRoute,
		path: '/users',
		staticData: { capability: 'list_users' },
		component: textPage('Users page'),
	})
	const chats = createRoute({
		getParentRoute: () => rootRoute,
		path: '/chats',
		staticData: { Sidebar: chatsScreen },
	})
	const chat = createRoute({ getParentRoute: () => chats, path: '$chatId', component: textPage('Chat page') })
	const thing = createRoute({
		getParentRoute: () => rootRoute,
		path: '/things/$thingId',
		staticData: { Sidebar: thingScreen },
		component: textPage('Thing page'),
	})
	const laterRoute = createRoute({ getParentRoute: () => rootRoute, path: '/later', staticData: { Sidebar: later } })
	return createRouter({
		routeTree: rootRoute.addChildren([posts, pages, users, chats.addChildren([chat]), thing, laterRoute]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
}

/**
 * Draws the whole admin of sidebarAppRouter and waits for its sidebar.
 * @param path - The address to start at.
 * @param options - The check, the region name and the later screen.
 * @returns The router, once the sidebar is drawn.
 */
export async function renderSidebarApp(path: string, options: SidebarAppOptions = {}) {
	const router = sidebarAppRouter(path, options)
	renderAdmin(<RouterProvider router={router} />)
	await screen.findByRole('main')
	return router
}

/**
 * Clicks a link by its name and waits for the move it starts to settle.
 * @param name - The accessible name of the link.
 * @param init - The event details, such as a modifier key.
 */
export async function clickLink(name: string, init: MouseEventInit = {}): Promise<void> {
	await act(async () => {
		fireEvent.click(screen.getByRole('link', { name }), init)
	})
}

/**
 * Returns the keyed wrapper the sidebar screen slides in.
 * @returns The wrapper element.
 */
export function screenWrapper(): Element {
	return document.querySelector('.godmin-navigation__screen-wrapper') as Element
}
