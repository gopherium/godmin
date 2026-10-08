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
import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { forwardRef } from 'react'
import type { AnchorHTMLAttributes } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import * as entry from '../src/index'
import { Page } from '../src/page.js'
import { PageTab, PageTabs } from '../src/page-tabs.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

/** The class that underlines the current tab. */
const CURRENT = 'godmin-page-tabs__tab--current'

/** The class that fades the start edge of a tab row. */
const FADES_START = 'godmin-page-tabs--overflowing-first'

/** The class that fades the end edge of a tab row. */
const FADES_END = 'godmin-page-tabs--overflowing-last'

/** The labels of the user tabs, in order. */
const LABELS = ['Users', 'API tokens', 'Application passwords', 'Sessions']

/** The widths a browser would measure for a tab row and its tabs. */
interface Layout {
	/** The width the row shows. */
	shown: number
	/** The width of everything in the row. */
	full: number
	/** The offset from the row's left edge and the width of each tab, by label. */
	tabs?: Record<string, [number, number]>
}

/** The four user tabs laid out left to right in a row that shows 240px of their 418px. */
const LEFT_TO_RIGHT: Layout = {
	shown: 240,
	full: 418,
	tabs: {
		Users: [0, 60],
		'API tokens': [76, 80],
		'Application passwords': [172, 160],
		Sessions: [348, 70],
	},
}

/** The four user tabs laid out right to left in a row that shows 240px of their 418px. */
const RIGHT_TO_LEFT: Layout = {
	shown: 240,
	full: 418,
	tabs: {
		Users: [180, 60],
		'API tokens': [84, 80],
		'Application passwords': [-92, 160],
		Sessions: [-178, 70],
	},
}

/**
 * Gives a tab row and its tabs the widths a browser would measure, which jsdom leaves at zero.
 * @param layout - The widths, read again on every measure so a test may change them.
 */
function measure(layout: Layout): void {
	const isRow = (element: Element) => element.classList.contains('godmin-page-tabs')
	const tabOf = (element: Element) => layout.tabs?.[element.textContent] ?? [0, 0]
	vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
		return isRow(this) ? layout.shown : 0
	})
	vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
		return isRow(this) ? layout.full : 0
	})
	vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (this: HTMLElement) {
		return tabOf(this)[0]
	})
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (this: HTMLElement) {
		return tabOf(this)[1]
	})
}

/**
 * Gives every page tab the scroll margin the stylesheet asks for, which jsdom leaves at zero.
 * @param margin - The computed scroll margin on each side.
 */
function giveScrollMargin(margin: string): void {
	const computed = window.getComputedStyle.bind(window)
	vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) =>
		element.classList.contains('godmin-page-tabs__tab')
			? ({ scrollMarginLeft: margin, scrollMarginRight: margin } as CSSStyleDeclaration)
			: computed(element, pseudo),
	)
}

/**
 * Swaps in a resize observer that records what it watches and lets a test report a resize.
 * @returns The elements watched and a function reporting a resize to every observer.
 */
function recordResizes(): { watched: Set<Element>; resize: () => void } {
	const watched = new Set<Element>()
	const callbacks: (() => void)[] = []
	vi.stubGlobal(
		'ResizeObserver',
		class {
			/**
			 * Keeps the callback a resize reports to.
			 * @param callback - The callback.
			 */
			constructor(callback: () => void) {
				callbacks.push(callback)
			}

			/**
			 * Watches an element.
			 * @param element - The element.
			 */
			observe(element: Element) {
				watched.add(element)
			}

			/** Stops watching an element. */
			unobserve() {}

			/** Stops watching every element. */
			disconnect() {
				watched.clear()
			}
		},
	)
	return { watched, resize: () => act(() => callbacks.forEach((callback) => callback())) }
}

/**
 * Draws the user tabs, the given one current.
 * @param props - The label of the current tab, if any, and how many tabs to draw.
 * @returns The tab navigation element.
 */
function UserTabs({ current, count = LABELS.length }: { current?: string; count?: number }) {
	return (
		<PageTabs label="User sections">
			{LABELS.slice(0, count).map((label) => (
				<PageTab key={label} href={`#${label}`} current={label === current}>
					{label}
				</PageTab>
			))}
		</PageTabs>
	)
}

/**
 * Returns which edges of a tab row fade.
 * @param row - The tab row element.
 * @returns Whether the start edge and the end edge fade.
 */
function fades(row: Element): { start: boolean; end: boolean } {
	return { start: row.classList.contains(FADES_START), end: row.classList.contains(FADES_END) }
}

/**
 * Returns the tab row on screen.
 * @returns The navigation element of the user tabs.
 */
function tabRow(): HTMLElement {
	return screen.getByRole('navigation', { name: 'User sections' })
}

/**
 * Stands in for a router link, which renders an anchor for a route.
 */
const RouteLink = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { to: string }>(
	function RouteLink({ to, ...props }, ref) {
		return <a ref={ref} href={`#${to}`} data-route={to} {...props} />
	},
)

/**
 * Renders the users and tokens tabs on router links, inside a router started at the given address.
 * @param path - The address the router starts at.
 * @param exact - Whether each link counts as active on its own address only.
 * @returns The testing library render result.
 */
function renderRoutedTabs(path: string, exact: boolean) {
	function Tabs({ on }: { on: string }) {
		return (
			<PageTabs label="User sections">
				<PageTab render={<Link to="/users" activeOptions={{ exact }} />} current={on === '/users'}>
					Users
				</PageTab>
				<PageTab render={<Link to="/users/tokens" activeOptions={{ exact }} />} current={on === '/users/tokens'}>
					API tokens
				</PageTab>
			</PageTabs>
		)
	}
	const rootRoute = createRootRoute({ component: Outlet })
	const users = createRoute({ getParentRoute: () => rootRoute, path: '/users', component: () => <Tabs on="/users" /> })
	const tokens = createRoute({
		getParentRoute: () => rootRoute,
		path: '/users/tokens',
		component: () => <Tabs on="/users/tokens" />,
	})
	const router = createRouter({
		routeTree: rootRoute.addChildren([users, tokens]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
	return renderAdmin(<RouterProvider router={router} />)
}

test('renders the tabs as links in a navigation region named by its label', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users" current>
				Users
			</PageTab>
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	const nav = screen.getByRole('navigation', { name: 'User sections' })
	expect([...nav.querySelectorAll('a')].map((link) => link.textContent)).toEqual(['Users', 'API tokens'])
})

test('marks the current tab as the page on screen and leaves the others unmarked', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users" current>
				Users
			</PageTab>
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	expect(screen.getByRole('link', { name: 'Users' }).getAttribute('aria-current')).toBe('page')
	expect(screen.getByRole('link', { name: 'API tokens' }).hasAttribute('aria-current')).toBe(false)
})

test('gives the current tab the class that underlines it and leaves the others without', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users" current>
				Users
			</PageTab>
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	expect(screen.getByRole('link', { name: 'Users' }).classList.contains(CURRENT)).toBe(true)
	expect(screen.getByRole('link', { name: 'API tokens' }).classList.contains(CURRENT)).toBe(false)
})

test('underlines only the tab the screen marks current, even where a router link counts itself active', async () => {
	renderRoutedTabs('/users/tokens', false)

	const tokens = await screen.findByRole('link', { name: 'API tokens' })
	const users = screen.getByRole('link', { name: 'Users' })
	expect(tokens.classList.contains(CURRENT)).toBe(true)
	expect(users.classList.contains(CURRENT)).toBe(false)
})

test('marks only the current tab when the router links match their own address only, as the docs show', async () => {
	renderRoutedTabs('/users/tokens', true)

	const tokens = await screen.findByRole('link', { name: 'API tokens' })
	const users = screen.getByRole('link', { name: 'Users' })
	expect(tokens.getAttribute('aria-current')).toBe('page')
	expect(users.hasAttribute('aria-current')).toBe(false)
	expect(tokens.classList.contains(CURRENT)).toBe(true)
	expect(users.classList.contains(CURRENT)).toBe(false)
})

test('renders a tab with an address as a plain link carrying the tab class', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab href="/users/tokens">API tokens</PageTab>
		</PageTabs>,
	)

	const tab = screen.getByRole('link', { name: 'API tokens' })
	expect(tab.getAttribute('href')).toBe('/users/tokens')
	expect(tab.classList.contains('godmin-page-tabs__tab')).toBe(true)
})

test('renders a tab through the link element a screen gives, such as a router link', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab render={<RouteLink to="/users/tokens" />} current>
				API tokens
			</PageTab>
		</PageTabs>,
	)

	const tab = screen.getByRole('link', { name: 'API tokens' })
	expect(tab.getAttribute('data-route')).toBe('/users/tokens')
	expect(tab.getAttribute('aria-current')).toBe('page')
	expect(tab.classList.contains('godmin-page-tabs__tab')).toBe(true)
})

test('keeps the class of the link element a screen gives', () => {
	renderAdmin(
		<PageTabs label="User sections">
			<PageTab render={<RouteLink to="/users" className="acme-link" />}>Users</PageTab>
		</PageTabs>,
	)

	const tab = screen.getByRole('link', { name: 'Users' })
	expect([...tab.classList]).toEqual(['acme-link', 'godmin-page-tabs__tab'])
})

test('sets the tabs of a page under the title block, before the content', () => {
	const { container } = renderAdmin(
		<Page
			title="Users"
			tabs={
				<PageTabs label="User sections">
					<PageTab href="/users" current>
						Users
					</PageTab>
				</PageTabs>
			}
		>
			<p>rows</p>
		</Page>,
	)

	const tabs = container.querySelector('.godmin-page > .godmin-page__header + .godmin-page__tabs')
	expect(tabs?.querySelector('nav')).toBe(screen.getByRole('navigation', { name: 'User sections' }))
	expect(tabs?.nextElementSibling?.textContent).toBe('rows')
})

test('offers the page tabs from the package entry', () => {
	expect(entry.PageTabs).toBe(PageTabs)
	expect(entry.PageTab).toBe(PageTab)
})

test('sets no tabs region on a page that gives none', () => {
	const { container } = renderAdmin(<Page title="Users">rows</Page>)

	expect(container.querySelector('.godmin-page__tabs')).toBeNull()
})

test('fades neither edge of a tab row that fits', () => {
	measure({ ...LEFT_TO_RIGHT, shown: 418 })
	renderAdmin(<UserTabs />)

	expect(fades(tabRow())).toEqual({ start: false, end: false })
})

test('fades the end edge of a tab row cut at its end, as the WordPress tabs do', () => {
	measure(LEFT_TO_RIGHT)
	renderAdmin(<UserTabs />)

	expect(fades(tabRow())).toEqual({ start: false, end: true })
})

test('fades both edges once the reader scrolls the row between its ends', () => {
	measure(LEFT_TO_RIGHT)
	renderAdmin(<UserTabs />)
	const row = tabRow()

	row.scrollLeft = 50
	fireEvent.scroll(row)

	expect(fades(row)).toEqual({ start: true, end: true })
})

test('fades only the start edge once the reader scrolls the row to its end', () => {
	measure(LEFT_TO_RIGHT)
	renderAdmin(<UserTabs />)
	const row = tabRow()

	row.scrollLeft = 178
	fireEvent.scroll(row)

	expect(fades(row)).toEqual({ start: true, end: false })
})

test('counts a row a pixel off an edge as resting on it, for sub-pixel rounding', () => {
	measure(LEFT_TO_RIGHT)
	renderAdmin(<UserTabs />)
	const row = tabRow()

	row.scrollLeft = 1
	fireEvent.scroll(row)
	expect(fades(row)).toEqual({ start: false, end: true })

	row.scrollLeft = 177
	fireEvent.scroll(row)
	expect(fades(row)).toEqual({ start: true, end: false })
})

test('reads a right to left row from its start edge, where the scroll runs negative', () => {
	measure(RIGHT_TO_LEFT)
	renderAdmin(<UserTabs />)
	const row = tabRow()

	row.scrollLeft = -50
	fireEvent.scroll(row)
	expect(fades(row)).toEqual({ start: true, end: true })

	row.scrollLeft = -178
	fireEvent.scroll(row)
	expect(fades(row)).toEqual({ start: true, end: false })
})

test('measures the row again when it or one of its tabs changes size', () => {
	const { watched, resize } = recordResizes()
	const layout = { ...LEFT_TO_RIGHT }
	measure(layout)
	renderAdmin(<UserTabs />)
	const row = tabRow()

	expect(watched).toEqual(new Set([row, ...screen.getAllByRole('link')]))

	layout.shown = 418
	resize()

	expect(fades(row)).toEqual({ start: false, end: false })
})

test('watches and measures a tab added after the row drew', async () => {
	const { watched } = recordResizes()
	const layout = { ...LEFT_TO_RIGHT, shown: 340, full: 332 }
	measure(layout)
	const { rerender } = renderAdmin(<UserTabs count={3} />)
	const row = tabRow()
	expect(fades(row)).toEqual({ start: false, end: false })

	layout.full = 418
	rerender(<UserTabs />)

	await waitFor(() => expect(fades(row)).toEqual({ start: false, end: true }))
	expect(watched).toEqual(new Set([row, ...screen.getAllByRole('link')]))
})

test('lets go of the row once the tabs leave', () => {
	const { watched } = recordResizes()
	measure(LEFT_TO_RIGHT)
	const { unmount } = renderAdmin(<UserTabs />)
	const row = tabRow()
	const removed = vi.spyOn(row, 'removeEventListener')

	unmount()

	expect(watched.size).toBe(0)
	expect(removed).toHaveBeenCalledWith('scroll', expect.any(Function))
})

test('scrolls the row so the current tab shows whole with the scroll margin it asks for', () => {
	measure(LEFT_TO_RIGHT)
	giveScrollMargin('24px')
	renderAdmin(<UserTabs current="Application passwords" />)

	expect(tabRow().scrollLeft).toBe(116)
	expect(fades(tabRow())).toEqual({ start: true, end: true })
})

test('scrolls a right to left row toward its end to show the current tab', () => {
	measure(RIGHT_TO_LEFT)
	giveScrollMargin('24px')
	renderAdmin(<UserTabs current="Application passwords" />)

	expect(tabRow().scrollLeft).toBe(-116)
})

test('leaves the row where it is when the current tab already shows', () => {
	measure(LEFT_TO_RIGHT)
	giveScrollMargin('24px')
	renderAdmin(<UserTabs current="API tokens" />)

	expect(tabRow().scrollLeft).toBe(0)
})

test('scrolls to a tab once it becomes current and leaves a row the reader scrolled alone until then', () => {
	measure(LEFT_TO_RIGHT)
	giveScrollMargin('24px')
	const { rerender } = renderAdmin(<UserTabs current="API tokens" />)
	const row = tabRow()

	row.scrollLeft = 178
	rerender(<UserTabs current="API tokens" />)
	expect(row.scrollLeft).toBe(178)

	rerender(<UserTabs current="Application passwords" />)
	expect(row.scrollLeft).toBe(148)
})

test('scrolls to a tab that becomes current again after a spell with no current tab', () => {
	measure(LEFT_TO_RIGHT)
	giveScrollMargin('24px')
	const { rerender } = renderAdmin(<UserTabs current="Application passwords" />)
	const row = tabRow()
	expect(row.scrollLeft).toBe(116)

	row.scrollLeft = 0
	rerender(<UserTabs />)
	expect(row.scrollLeft).toBe(0)

	rerender(<UserTabs current="Application passwords" />)
	expect(row.scrollLeft).toBe(116)
})
