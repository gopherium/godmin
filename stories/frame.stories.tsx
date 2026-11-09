// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import {
	Link,
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { page, post, settings, tool } from '@wordpress/icons'
import { useState } from 'react'
import { expect, waitFor, within } from 'storybook/test'

import { Frame } from '../src/frame.js'
import type { MenuItem } from '../src/menu-item.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { Page } from '../src/page.js'
import {
	Navigation,
	NavigationItem,
	NavigationList,
	routerDefaults,
	useFrameLocation,
	useShownPath,
} from '../src/router.js'
import { onlyAt } from './frames.js'
import { find } from './measure.js'

/** How long a story waits for its screen to show. */
const WAIT = 3_000

/** The line of the chevron that points right, the one Back draws in a right to left language. */
const RIGHT_CHEVRON = 'M10 6.5L15 12L10 17.5'

/** The rows of the root screen of the sample admin. */
const ROWS: readonly MenuItem[] = [
	{ label: 'Posts', to: '/posts', icon: post },
	{ label: 'Pages', to: '/pages', icon: page },
	{ label: 'Settings', to: '/settings/general', icon: settings },
	{ label: 'Tools', to: '/tools', icon: tool },
]

/** Renders a page beside the sidebar with a title and one line. */
function TextPage({ title, line }: { title: string; line: string }) {
	return (
		<Page title={title} headingLevel={2}>
			<p>{line}</p>
		</Page>
	)
}

/** Renders the sub menu of the settings section. */
function SettingsScreen() {
	return (
		<NavigationScreen title="Settings">
			<NavigationList>
				<NavigationItem to="/settings/general">General</NavigationItem>
				<NavigationItem to="/settings/writing">Writing</NavigationItem>
			</NavigationList>
		</NavigationScreen>
	)
}

/** Renders the sub menu of the tools section. */
function ToolsScreen() {
	return (
		<NavigationScreen title="Tools">
			<p>Tool rows</p>
		</NavigationScreen>
	)
}

/** Renders the frame of the sample admin around the page its address shows. */
function Layout() {
	return (
		<Frame.Root shownPath={useShownPath()} location={useFrameLocation()}>
			<Frame.Sidebar brand={<span>Admin</span>}>
				<Navigation title="Admin" items={ROWS} home={<Link to="/posts" />} />
			</Frame.Sidebar>
			<Frame.Canvas>
				<Outlet />
			</Frame.Canvas>
		</Frame.Root>
	)
}

/** Returns a router on the router defaults drawing the sample admin at an address, its tools data never arriving. */
function adminRouter(path: string) {
	const rootRoute = createRootRoute({ component: Layout })
	const textRoute = (at: string, title: string) =>
		createRoute({
			getParentRoute: () => rootRoute,
			path: at,
			component: () => <TextPage title={title} line={`The ${title.toLowerCase()} of this site.`} />,
		})
	const settingsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/settings',
		staticData: { Sidebar: SettingsScreen },
	})
	const settingsPage = (at: string, title: string) =>
		createRoute({
			getParentRoute: () => settingsRoute,
			path: at,
			component: () => <TextPage title={title} line="The choices this site makes." />,
		})
	const toolsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/tools',
		staticData: { Sidebar: ToolsScreen },
		loader: () => new Promise<void>(() => {}),
		component: () => <TextPage title="Tools" line="The tools of this site." />,
	})
	return createRouter({
		routeTree: rootRoute.addChildren([
			textRoute('/posts', 'Posts'),
			textRoute('/pages', 'Pages'),
			settingsRoute.addChildren([
				settingsPage('general', 'General settings'),
				settingsPage('writing', 'Writing settings'),
			]),
			toolsRoute,
		]),
		history: createMemoryHistory({ initialEntries: [path] }),
		...routerDefaults(),
	})
}

/** Renders the sample admin at an address, on a router of its own. */
function FrameApp({ path }: { path: string }) {
	const [router] = useState(() => adminRouter(path))
	return <RouterProvider router={router} />
}

/** What Back paints around itself. */
interface Ring {
	style: string
	width: string
	corner: string
}

/** Waits until nothing on the page moves any more. */
async function settles() {
	await waitFor(() => expect(document.getAnimations()).toEqual([]), { timeout: WAIT })
}

/** Returns the link with a name. */
function link(canvasElement: HTMLElement, name: string): HTMLElement {
	return within(canvasElement).getByRole('link', { name })
}

/** Waits for the page with a title to show. */
async function shows(canvasElement: HTMLElement, title: string) {
	await within(canvasElement).findByRole('heading', { level: 2, name: title }, { timeout: WAIT })
}

/** Waits until Back holds the focus and nothing moves, then returns Back. */
async function settledBack(canvasElement: HTMLElement): Promise<HTMLElement> {
	const back = await within(canvasElement).findByRole('link', { name: 'Back' }, { timeout: WAIT })
	await waitFor(() => expect(back).toHaveFocus(), { timeout: WAIT })
	await settles()
	await expect(document.activeElement, 'the settled focus').toBe(back)
	return back
}

/** Focuses an element again as a mouse click leaves it, with no visible focus. */
function focusAsAMouseLeavesIt(element: HTMLElement) {
	element.blur()
	element.focus({ focusVisible: false })
}

/** Returns the outline Back draws and its corner. */
function ringOf(back: HTMLElement): Ring {
	const style = getComputedStyle(back)
	return { style: style.outlineStyle, width: style.outlineWidth, corner: style.borderTopLeftRadius }
}

const meta = {
	title: 'Components/Frame',
	id: 'components-frame',
	component: FrameApp,
	args: { path: '/posts' },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof FrameApp>

export default meta

type Story = StoryObj<typeof meta>

/** What a play is handed. */
type PlayContext = Parameters<NonNullable<Story['play']>>[0]

/** The desktop viewport a story runs at, the size of its shot. */
const DESKTOP = { viewport: { value: 'desktop', isRotated: false } }

/** The phone viewport a story runs at and its only shot. */
const PHONE = onlyAt('phone')

/** Opens the drawer of the phone frame on the settings sub menu and waits until it rests, then returns it. */
async function openDrawer({ canvasElement, userEvent }: PlayContext): Promise<HTMLElement> {
	await shows(canvasElement, 'General settings')
	await userEvent.click(within(canvasElement).getByRole('button', { name: 'Open navigation panel' }))
	const drawer = await within(canvasElement).findByRole('dialog', {}, { timeout: WAIT })
	await waitFor(() => expect(drawer).not.toHaveAttribute('data-starting-style'), { timeout: WAIT })
	await settles()
	await expect(within(drawer).getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument()
	return drawer
}

export const BackKeyboardFocus: Story = {
	name: 'Back, keyboard focus',
	globals: DESKTOP,
	play: async ({ canvasElement, userEvent }) => {
		await shows(canvasElement, 'Posts')
		link(canvasElement, 'Pages').focus()
		await userEvent.tab()
		await expect(link(canvasElement, 'Settings')).toHaveFocus()
		await userEvent.keyboard('{Enter}')
		const back = await settledBack(canvasElement)
		await expect(back.matches(':focus-visible'), 'a keyboard focus').toBe(true)
		await expect(ringOf(back)).toEqual({ style: 'solid', width: '2px', corner: '2px' })
	},
}

export const BackMouseFocus: Story = {
	name: 'Back, mouse focus',
	globals: DESKTOP,
	play: async ({ canvasElement, userEvent }) => {
		await shows(canvasElement, 'Posts')
		await userEvent.click(link(canvasElement, 'Settings'))
		const back = await settledBack(canvasElement)
		focusAsAMouseLeavesIt(back)
		await expect(document.activeElement, 'the focus after the click').toBe(back)
		await expect(back.matches(':focus-visible'), 'a mouse focus').toBe(false)
		await expect(ringOf(back).style, 'no ring').toBe('none')
	},
}

export const SubMenuLoading: Story = {
	name: 'Sub menu loading',
	globals: DESKTOP,
	play: async ({ canvasElement, userEvent }) => {
		await shows(canvasElement, 'Posts')
		await userEvent.click(link(canvasElement, 'Tools'))
		await waitFor(() => expect(link(canvasElement, 'Posts')).not.toHaveAttribute('aria-current'), { timeout: WAIT })
		await settles()
		await expect(within(canvasElement).getByRole('heading', { level: 1, name: 'Admin' })).toBeInTheDocument()
		await expect(within(canvasElement).getByRole('heading', { level: 2, name: 'Posts' })).toBeInTheDocument()
		await expect(canvasElement.querySelector('[aria-current]'), 'no row filled').toBeNull()
	},
}

export const PhoneDrawerRightToLeft: Story = {
	name: 'Phone drawer, right to left',
	...PHONE,
	globals: { ...PHONE.globals, direction: 'rtl' },
	args: { path: '/settings/general' },
	play: async (context) => {
		const drawer = await openDrawer(context)
		const box = drawer.getBoundingClientRect()
		await expect([box.left, box.right, box.width], 'at the right edge').toEqual([90, 390, 300])
		await expect(getComputedStyle(drawer).boxShadow, 'the shadow on its inner edge').toBe(
			'rgba(0, 0, 0, 0.2) -2px 0px 8px 0px',
		)
		const back = within(drawer).getByRole('link', { name: 'Back' })
		await expect(back.querySelector('path')?.getAttribute('d'), 'Back points to the start side').toBe(RIGHT_CHEVRON)
	},
}

export const PhoneDrawer: Story = {
	name: 'Phone drawer',
	...PHONE,
	args: { path: '/settings/general' },
	play: async (context) => {
		const box = (await openDrawer(context)).getBoundingClientRect()
		await expect([box.left, box.right, box.width], 'at the left edge').toEqual([0, 300, 300])
	},
}

export const RouteNotFound: Story = {
	name: 'Route not found',
	globals: DESKTOP,
	args: { path: '/missing' },
	play: async ({ canvasElement }) => {
		await shows(canvasElement, 'Route not found')
		await settles()
		const screen = within(find('.godmin-page'))
		await expect(screen.getByRole('heading', { level: 2, name: 'Route not found' })).toBeInTheDocument()
		await expect(screen.getByText("The page you're looking for does not exist")).toBeInTheDocument()
	},
}
