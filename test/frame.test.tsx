// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { Icon, menu } from '@wordpress/icons'
import type { ReactNode } from 'react'
import { afterEach, expect, test } from 'vitest'

import { Frame } from '../src/frame.js'
import type { CanvasMode } from '../src/frame.js'
import { EDGE_BREAKPOINT } from '../src/index'
import spanish from '../src/list-chrome/es-ES.js'
import { installTestEnvironment, renderAdmin, setViewport } from '../src/testing.js'
import { clickLink, renderSidebarApp, screenWrapper } from './sidebar-app.js'
import { DRAWER_BACKDROP, declaredValue, gapInPixels, ruleValue } from './styles.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

/**
 * Renders a narrow frame whose sidebar names no menu label.
 * @returns The testing library render result.
 */
function renderUnnamedMenu() {
	setViewport({ matches: true })
	return renderAdmin(
		<Frame.Root>
			<Frame.Sidebar>
				<nav aria-label="Sections" />
			</Frame.Sidebar>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
}

/**
 * Renders a frame with a sidebar and a canvas.
 * @param props - The location and canvas mode to render with.
 * @returns The testing library render result.
 */
function renderFrame(props: { location?: string; canvas?: 'padded' | 'bleed' } = {}) {
	return renderAdmin(
		<Frame.Root location={props.location}>
			<Frame.Sidebar brand={<span>Acme</span>} menuLabel="Open navigation">
				<nav aria-label="Sections">
					<a href="/reports">Reports</a>
				</nav>
			</Frame.Sidebar>
			<Frame.Canvas canvas={props.canvas}>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
}

test('shows the sidebar beside the canvas on a wide viewport', () => {
	renderFrame()

	expect(screen.getByRole('navigation', { name: 'Sections' })).not.toBeNull()
	expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull()
})

test('renders the sidebar as a child of the layout itself, where the canvas margin rule looks for it', () => {
	renderFrame()

	expect(document.querySelector('.godmin-layout > .godmin-layout__sidebar')).not.toBeNull()
})

test('replaces the sidebar with a menu button on a narrow viewport', () => {
	setViewport({ matches: true })
	renderFrame()

	expect(screen.getByRole('button', { name: 'Open navigation' })).not.toBeNull()
	expect(screen.queryByRole('navigation', { name: 'Sections' })).toBeNull()
})

test('draws the menu button glyph as the new admin draws its toggle, the WordPress menu icon at 24px', () => {
	const drawn = render(<Icon icon={menu} />)
	const wordpress = drawn.container.innerHTML
	drawn.unmount()
	setViewport({ matches: true })
	renderFrame()

	const button = screen.getByRole('button', { name: 'Open navigation' })
	expect(button.classList.contains('godmin-layout__menu')).toBe(true)
	expect(button.innerHTML).toBe(wordpress)
	expect(button.querySelector('svg')?.getAttribute('width')).toBe('24')
})

test('hides the menu glyph from assistive technology, since the button name says it', () => {
	setViewport({ matches: true })
	renderFrame()

	const glyph = screen.getByRole('button', { name: 'Open navigation' }).querySelector('svg')
	expect(glyph?.getAttribute('aria-hidden')).toBe('true')
	expect(glyph?.getAttribute('focusable')).toBe('false')
})

test('names the menu button Open navigation panel, as WordPress does, and the drawer Navigation', async () => {
	renderUnnamedMenu()

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation panel' }))

	expect(await screen.findByRole('dialog', { name: 'Navigation' })).not.toBeNull()
})

test('names the menu button and the drawer in the reader language from the words godmin ships', async () => {
	setLocaleData(spanish)
	renderUnnamedMenu()

	fireEvent.click(screen.getByRole('button', { name: 'Abrir el panel de navegación' }))

	expect(await screen.findByRole('dialog', { name: 'Navegación' })).not.toBeNull()
})

test('names the drawer Navigation whatever the menu button is called', async () => {
	setViewport({ matches: true })
	renderAdmin(
		<Frame.Root>
			<Frame.Sidebar menuLabel="Open the menu">
				<nav aria-label="Sections" />
			</Frame.Sidebar>
		</Frame.Root>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Open the menu' }))

	expect(await screen.findByRole('dialog', { name: 'Navigation' })).not.toBeNull()
})

test('offers the edge breakpoint from the package entry', () => {
	expect(EDGE_BREAKPOINT).toBe(782)
})

test('opens the sidebar content in a drawer', async () => {
	setViewport({ matches: true })
	renderFrame()

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

	const drawer = await screen.findByRole('dialog')
	expect(within(drawer).getByRole('navigation', { name: 'Sections' })).not.toBeNull()
})

test('keeps the chrome theme on the drawer it portals out', async () => {
	setViewport({ matches: true })
	renderAdmin(
		<Frame.Root chromeColor={{ primary: '#3858e9' }} canvasColor={{ primary: '#d63638' }}>
			<Frame.Sidebar menuLabel="Open navigation">
				<nav aria-label="Sections" />
			</Frame.Sidebar>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
	const menu = screen.getByRole('button', { name: 'Open navigation' })
	const chrome = menu.closest('[style*="--wpds-color"]')

	fireEvent.click(menu)

	const drawer = await screen.findByRole('dialog')
	expect(chrome).not.toBeNull()
	expect(drawer.closest('[style*="--wpds-color"]')).toBe(chrome)
})

test('portals the drawer inside the layout that raises it', async () => {
	setViewport({ matches: true })
	renderFrame()

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

	const drawer = await screen.findByRole('dialog')
	expect(drawer.closest('.godmin-layout')).not.toBeNull()
})

test('isolates the canvas so its stacking stays under the drawer', () => {
	renderFrame()

	expect(screen.getByRole('main').getAttribute('style')).toContain('isolation: isolate')
})

test('closes the drawer when the location changes', async () => {
	setViewport({ matches: true })
	const view = renderFrame({ location: '/tasks' })
	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	await screen.findByRole('dialog')

	view.rerender(
		<Frame.Root location="/reports">
			<Frame.Sidebar brand={<span>Acme</span>} menuLabel="Open navigation">
				<nav aria-label="Sections">
					<a href="/reports">Reports</a>
				</nav>
			</Frame.Sidebar>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)

	expect(screen.queryByRole('dialog')).toBeNull()
})

test('names the brand without making it a heading', () => {
	setViewport({ matches: true })
	renderFrame()

	expect(screen.getByText('Acme')).not.toBeNull()
	expect(screen.queryByRole('heading')).toBeNull()
})

test('marks a full bleed canvas so it can fill its region', () => {
	renderFrame({ canvas: 'bleed' })

	expect(screen.getByRole('main').className).toContain('godmin-layout__canvas--bleed')
})

test('leaves a padded canvas unmarked', () => {
	renderFrame()

	expect(screen.getByRole('main').className).not.toContain('--bleed')
})

/**
 * Returns the value one design token takes on the nearest theme around an element.
 * @param element - The element the theme wraps.
 * @param token - The custom property name.
 * @returns The value the nearest theme sets.
 */
function tokenAround(element: Element, token: string): string {
	return (element.closest(`[style*="${token}:"]`) as HTMLElement).style.getPropertyValue(token)
}

test('paints the canvas from the default WordPress palette when no colour is given, its greys as wp-admin', () => {
	renderFrame()
	const canvas = screen.getByRole('main')

	expect(tokenAround(canvas, '--wpds-color-background-surface-neutral-strong')).toBe('#fff')
	expect(tokenAround(canvas, '--wpds-color-stroke-surface-neutral-weak')).toBe('#f0f0f0')
	expect(tokenAround(canvas, '--wpds-color-stroke-interactive-neutral-strong')).toBe('#6e6e6e')
	expect(tokenAround(canvas, '--wpds-color-stroke-interactive-neutral')).toBe('#8d8d8d')
	expect(tokenAround(canvas, '--wpds-color-foreground-content-neutral-weak')).toBe('#707070')
})

test('paints the sidebar and the top bar one step from the WordPress admin bar grey when no colour is given', () => {
	renderFrame()
	const token = '--wpds-color-background-surface-neutral-weak'

	expect(tokenAround(document.querySelector('.godmin-layout') as Element, token)).toBe('#1d2428')
})

test('keeps the canvas on the default WordPress palette when only the chrome colour is given', () => {
	renderAdmin(
		<Frame.Root chromeColor={{ background: '#1e1e1e' }}>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)

	expect(tokenAround(screen.getByRole('main'), '--wpds-color-stroke-surface-neutral-weak')).toBe('#f0f0f0')
})

test('paints the chrome and the canvas from the colours an application gives', () => {
	renderAdmin(
		<Frame.Root chromeColor={{ background: '#1e1e1e' }} canvasColor={{ background: '#ffffff' }}>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
	const token = '--wpds-color-background-surface-neutral-weak'

	expect(tokenAround(document.querySelector('.godmin-layout') as Element, token)).toBe('#171717')
	expect(tokenAround(screen.getByRole('main'), '--wpds-color-stroke-surface-neutral-weak')).toBe('#f3f3f3')
})

/**
 * Renders a canvas holding a screen and the notices given.
 * @param props - The notices and the canvas mode to render with.
 * @returns The testing library render result.
 */
function renderCanvas(props: { notices?: ReactNode; canvas?: CanvasMode }) {
	return renderAdmin(
		<Frame.Root>
			<Frame.Canvas canvas={props.canvas} notices={props.notices}>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)
}

test('draws the notices in a band of their own above the screen, inside the canvas', () => {
	renderCanvas({ notices: <p>An update is available.</p> })

	const band = screen.getByRole('main').firstElementChild as Element
	expect(band.className).toBe('godmin-layout__notices')
	expect(band.textContent).toBe('An update is available.')
	expect(band.nextElementSibling?.textContent).toBe('Canvas content')
})

test('draws no band when the app gives no notices', () => {
	renderCanvas({})

	expect(document.querySelector('.godmin-layout__notices')).toBeNull()
	expect(screen.getByRole('main').firstElementChild?.textContent).toBe('Canvas content')
})

test.each([
	['null', null],
	['false', false],
	['an empty string', ''],
	['an empty list', []],
	['a list of nothing', [null, false, '']],
])('draws no band for notices that are %s', (_condition, notices) => {
	renderCanvas({ notices })

	expect(document.querySelector('.godmin-layout__notices')).toBeNull()
})

test.each<CanvasMode>(['padded', 'bleed'])('keeps the band inside a %s canvas', (canvas) => {
	renderCanvas({ notices: <p>An update is available.</p>, canvas })

	const band = document.querySelector('.godmin-layout__notices') as Element
	expect(band.closest('main')).toBe(screen.getByRole('main'))
	expect(band.closest('main')?.className.includes('--bleed')).toBe(canvas === 'bleed')
})

test('draws every notice given in the one band, in order', () => {
	renderCanvas({ notices: [<p key="first">First notice</p>, <p key="second">Second notice</p>] })

	const bands = document.querySelectorAll('.godmin-layout__notices')
	expect(bands.length).toBe(1)
	expect([...bands[0].children].map((notice) => notice.textContent)).toEqual(['First notice', 'Second notice'])
})

/**
 * Returns the band a canvas draws around one notice.
 * @returns The band element.
 */
function noticesBand(): Element {
	renderCanvas({ notices: <p>An update is available.</p> })
	return document.querySelector('.godmin-layout__notices') as Element
}

test('stacks the notices in a column 12px apart, as the WordPress inline notices are', () => {
	const band = noticesBand()

	expect(declaredValue(band, 'display')).toBe('flex')
	expect(declaredValue(band, 'flex-direction')).toBe('column')
	expect(gapInPixels(band)).toBe(12)
})

test('keeps the band at its own height, so the screen under it takes the rest of the canvas', () => {
	expect(declaredValue(noticesBand(), 'flex')).toBe('none')
})

test('parts the band from the screen by the canvas block gutter, so a full bleed canvas sets them flush', () => {
	expect(declaredValue(noticesBand(), 'margin-block-end')).toBe('var(--godmin-canvas-gutter-block)')
})

test('leaves the side inset of the band to the canvas gutter, so it follows the gutter at every width', () => {
	const band = noticesBand()

	for (const property of ['padding', 'padding-inline', 'margin', 'margin-inline']) {
		expect(declaredValue(band, property), property).toBeUndefined()
	}
})

test('lines the band of a padded canvas up with the title of a list page, which sits 24px in at every width', () => {
	const canvas = '.godmin-layout__canvas:not(.godmin-layout__canvas--bleed)'
	const band = `${canvas}:has(.godmin-page > .godmin-page__list) > .godmin-layout__notices`
	const header = '.godmin-page:has(> .godmin-page__list) > .godmin-page__header'

	expect(ruleValue(band, 'padding-inline')).toBe('calc(var(--wpds-dimension-padding-2xl) - var(--godmin-canvas-gutter))')
	expect(ruleValue(header, 'padding-inline')).toBe(
		'calc(var(--wpds-dimension-padding-2xl) - var(--godmin-canvas-gutter, 0px))',
	)
})

test('hides a band whose notices render nothing themselves', () => {
	expect(ruleValue('.godmin-layout__notices:empty', 'display')).toBe('none')
})

test('stacks the notices of a bleed canvas with no space between them, as the WordPress editors do', () => {
	expect(ruleValue('.godmin-layout__canvas--bleed .godmin-layout__notices', 'gap')).toBe('0')
})

test('drops the top and side borders of the notices of a bleed canvas, so they run as full width strips', () => {
	const notice = '.godmin-layout__canvas--bleed .godmin-layout__notices > *'

	expect(ruleValue(notice, 'border-block-start-width')).toBe('0')
	expect(ruleValue(notice, 'border-inline-width')).toBe('0')
})

test('squares the notices of a bleed canvas, as the WordPress editors square theirs', () => {
	renderCanvas({ notices: <p>An update is available.</p>, canvas: 'bleed' })

	const band = document.querySelector('.godmin-layout__notices') as Element
	expect(band.closest('[data-wpds-corner-radius]')?.getAttribute('data-wpds-corner-radius')).toBe('none')
})

test('keeps the notices of a padded canvas on the corners of the frame', () => {
	renderCanvas({ notices: <p>An update is available.</p> })

	const band = document.querySelector('.godmin-layout__notices') as Element
	expect(band.closest('[data-wpds-corner-radius]')).toBe(screen.getByRole('main').closest('[data-wpds-corner-radius]'))
})

/**
 * Renders a frame whose sidebar holds a menu, and a footer and a note when given.
 * @param props - The footer and the note of the sidebar.
 * @returns The testing library render result.
 */
function renderFooter(props: { footer?: ReactNode; footerNote?: ReactNode }) {
	return renderAdmin(
		<Frame.Root>
			<Frame.Sidebar menuLabel="Open navigation" footer={props.footer} footerNote={props.footerNote}>
				<nav aria-label="Sections" />
			</Frame.Sidebar>
		</Frame.Root>,
	)
}

test('draws the sidebar content and then its footer, the panel the app gives and then the note', () => {
	renderFooter({ footer: <button type="button">Maria Perez</button>, footerNote: 'v1.2.3' })

	const sidebar = document.querySelector('.godmin-layout__sidebar') as Element
	const [content, footer] = [...sidebar.children]
	expect(sidebar.children.length).toBe(2)
	expect(content.className).toBe('godmin-sidebar__content')
	expect(content.firstElementChild).toBe(screen.getByRole('navigation', { name: 'Sections' }))
	expect(footer.className).toBe('godmin-sidebar__footer')
	expect(footer.firstElementChild).toBe(screen.getByRole('button', { name: 'Maria Perez' }))
	expect(footer.lastElementChild?.className).toBe('godmin-sidebar__footer-note')
	expect(footer.lastElementChild?.textContent).toBe('v1.2.3')
})

test('draws the note alone when the app gives no footer panel', () => {
	renderFooter({ footerNote: 'v1.2.3' })

	const footer = document.querySelector('.godmin-sidebar__footer') as Element
	expect([...footer.children].map((part) => part.className)).toEqual(['godmin-sidebar__footer-note'])
})

test('draws the footer panel alone when the app gives no note', () => {
	renderFooter({ footer: <button type="button">Maria Perez</button> })

	const footer = document.querySelector('.godmin-sidebar__footer') as Element
	expect(footer.children.length).toBe(1)
	expect(document.querySelector('.godmin-sidebar__footer-note')).toBeNull()
})

test('draws no footer when the app gives neither a panel nor a note', () => {
	renderFooter({})

	expect(document.querySelector('.godmin-sidebar__content')).not.toBeNull()
	expect(document.querySelector('.godmin-sidebar__footer')).toBeNull()
})

test('wraps the whole column, menu and footer, in one region named Navigation, as the Site Editor does', async () => {
	await renderSidebarApp('/posts')

	const region = screen.getByRole('region', { name: 'Navigation' })
	expect(region.className).toBe('godmin-layout__sidebar')
	expect(region.getAttribute('tabindex')).toBe('-1')
	expect(region.contains(screenWrapper())).toBe(true)
	expect(within(region).getByRole('button', { name: 'Maria Perez' })).not.toBeNull()
	expect(within(region).getByText('v1.2.3').className).toBe('godmin-sidebar__footer-note')
})

test('names the column region in the reader language from the words godmin ships', async () => {
	setLocaleData(spanish)
	await renderSidebarApp('/posts')

	expect(screen.getByRole('region', { name: 'Navegación' }).className).toBe('godmin-layout__sidebar')
})

test('names the column region with the label the app gives', async () => {
	await renderSidebarApp('/posts', { label: 'Main menu' })

	expect(screen.getByRole('region', { name: 'Main menu' }).className).toBe('godmin-layout__sidebar')
	expect(screen.queryByRole('region', { name: 'Navigation' })).toBeNull()
})

test('keeps the footer in the column region, outside the screen that slides, and never redraws it', async () => {
	await renderSidebarApp('/posts')
	const panel = screen.getByRole('button', { name: 'Maria Perez' })

	await clickLink('Chats')

	expect(screen.getByRole('button', { name: 'Maria Perez' })).toBe(panel)
	expect(panel.closest('[role="region"]')).toBe(screen.getByRole('region', { name: 'Navigation' }))
	expect(panel.closest('.godmin-navigation__screen-wrapper')).toBeNull()
	expect(panel.closest('.godmin-layout__sidebar > .godmin-sidebar__footer')).not.toBeNull()
})

test('draws the same content and footer in the drawer on a narrow viewport', async () => {
	setViewport({ matches: true })
	renderFooter({ footer: <button type="button">Maria Perez</button>, footerNote: 'v1.2.3' })

	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))

	const drawer = await screen.findByRole('dialog')
	const content = drawer.querySelector(':scope > .godmin-sidebar__content') as HTMLElement
	const footer = drawer.querySelector(':scope > .godmin-sidebar__footer') as HTMLElement
	expect(content.firstElementChild).toBe(within(drawer).getByRole('navigation', { name: 'Sections' }))
	expect(content.nextElementSibling).toBe(footer)
	expect(within(footer).getByRole('button', { name: 'Maria Perez' })).not.toBeNull()
	expect(within(footer).getByText('v1.2.3').className).toBe('godmin-sidebar__footer-note')
})

/**
 * Draws the whole admin on a narrow viewport and opens its drawer.
 * @param path - The address to start at.
 * @returns The router, once the drawer is open.
 */
async function openDrawerAt(path: string) {
	setViewport({ matches: true })
	const router = await renderSidebarApp(path)
	fireEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	await screen.findByRole('dialog')
	return router
}

test('draws no region in the drawer, so on a narrow viewport the dialog alone is named Navigation', async () => {
	await openDrawerAt('/posts')

	const drawer = screen.getByRole('dialog', { name: 'Navigation' })
	expect(within(drawer).getByRole('button', { name: 'Maria Perez' })).not.toBeNull()
	expect(within(drawer).queryByRole('region')).toBeNull()
	expect(within(drawer).queryByRole('navigation')).toBeNull()
	expect(document.querySelector('.godmin-layout__sidebar')).toBeNull()
})

test('keeps the drawer open when a drilldown row opens a sub menu in it', async () => {
	await openDrawerAt('/posts')

	await clickLink('Chats')

	expect(within(screen.getByRole('dialog')).getByRole('heading', { level: 1, name: 'Chats' })).not.toBeNull()
})

test('keeps the drawer open when Back goes home from a sub menu', async () => {
	const router = await openDrawerAt('/chats/one')

	await clickLink('Back')

	expect(router.state.location.pathname).toBe('/posts')
	expect(within(screen.getByRole('dialog')).getByRole('heading', { level: 1, name: 'Acme' })).not.toBeNull()
})

test('closes the drawer when a navigation row opens a page', async () => {
	await openDrawerAt('/posts')

	await clickLink('Pages')

	expect(await screen.findByText('Pages page')).not.toBeNull()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('closes the drawer when a page under a sub menu opens, after the drilldown row kept it open', async () => {
	await openDrawerAt('/posts')
	await clickLink('Chats')

	await clickLink('First chat')

	expect(await screen.findByText('Chat page')).not.toBeNull()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('closes the drawer on a later page change after the app blocked a drilldown row in it', async () => {
	const router = await openDrawerAt('/posts')
	const unblock = router.history.block({ blockerFn: () => true, enableBeforeUnload: false })
	await clickLink('Chats')
	expect(router.state.location.pathname).toBe('/posts')
	unblock()

	await act(() => router.navigate({ to: '/pages' }))

	expect(await screen.findByText('Pages page')).not.toBeNull()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('closes the drawer when only the search of the address changes', async () => {
	const router = await openDrawerAt('/posts')

	await act(() => router.navigate({ to: '/posts', search: { status: 'trash' } }))

	expect(router.state.location.searchStr).toBe('?status=trash')
	expect(screen.queryByRole('dialog')).toBeNull()
})

/**
 * Returns the dimmed layer @wordpress/ui lays over the page under the open drawer.
 * @returns The backdrop element.
 */
function backdrop(): HTMLElement {
	return screen.getByTestId('drawer-backdrop')
}

/**
 * Returns the close button at the end of the open drawer.
 * @returns The button element.
 */
function closeButton(): HTMLElement {
	return within(screen.getByRole('dialog')).getByRole('button', { name: 'Close navigation panel' })
}

/** The ways a reader closes the open drawer, by name. */
const CLOSE_WAYS = {
	tap: ['a tap on the dimmed page', async () => userEvent.setup().click(backdrop())],
	escape: ['Escape', async () => userEvent.setup().keyboard('{Escape}')],
	button: ['a press of the close button', async () => userEvent.setup().click(closeButton())],
} as const

test.each([CLOSE_WAYS.tap, CLOSE_WAYS.escape, CLOSE_WAYS.button])(
	'closes the drawer on %s and keeps the address',
	async (_way, close) => {
		const router = await openDrawerAt('/chats/one')

		await close()

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(router.state.location.href).toBe('/chats/one')
	},
)

test.each([CLOSE_WAYS.escape, CLOSE_WAYS.button])(
	'gives the focus back to the menu button once %s closes the drawer',
	async (_way, close) => {
		await openDrawerAt('/posts')

		await close()

		await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Open navigation' })))
	},
)

test('ends the drawer with a close button out of sight and out of the tab order, as the backdrop is', async () => {
	await openDrawerAt('/posts')

	const close = closeButton()
	expect(close.previousElementSibling?.className).toBe('godmin-sidebar__footer')
	expect(close.nextElementSibling).toBeNull()
	expect(close.getAttribute('tabindex')).toBe('-1')
	expect(close.hasAttribute('data-visually-hidden')).toBe(true)
	expect(document.activeElement).not.toBe(close)
})

test('names the close button in the reader language from the words godmin ships', async () => {
	setLocaleData(spanish)
	renderUnnamedMenu()

	fireEvent.click(screen.getByRole('button', { name: 'Abrir el panel de navegación' }))

	expect(await screen.findByRole('button', { name: 'Cerrar el panel de navegación' })).not.toBeNull()
})

test('paints the backdrop of its own drawer alone, not the layer Base UI lays under it', async () => {
	await openDrawerAt('/posts')

	expect([...document.querySelectorAll(DRAWER_BACKDROP)]).toEqual([backdrop()])
	expect(document.querySelector('[data-base-ui-inert]')?.matches(DRAWER_BACKDROP)).toBe(false)
})

test('collapses the sidebar region when a screen renders none', () => {
	renderAdmin(
		<Frame.Root>
			<Frame.Canvas>
				<p>Canvas content</p>
			</Frame.Canvas>
		</Frame.Root>,
	)

	expect(screen.getByRole('main')).not.toBeNull()
	expect(screen.queryByRole('button', { name: /open/i })).toBeNull()
})
