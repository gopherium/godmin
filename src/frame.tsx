/* oxlint-disable react/only-export-components -- a compound component is an
   object export standing beside the parts it is built from. */
import { __ } from '@wordpress/i18n'
import { ThemeProvider } from '@wordpress/theme'
import { Drawer, Text, VisuallyHidden } from '@wordpress/ui'
import { Children, createContext, useContext, useEffect, useId, useRef, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { SMALL_VIEWPORT } from './breakpoints.js'
import { Menu } from './frame-bar.js'
import { DrawerContext, FrameContext, useDrawer } from './frame-state.js'
import type { DrawerState } from './frame-state.js'
import { NavigationStateContext, createNavigationState, takeDrawerStays } from './navigation-state.js'
import type { NavigationState } from './navigation-state.js'
import { ScreenTitleContext, TitleWatch, createScreenTitles } from './screen-title.js'
import { siteAddress } from './site-address.js'
import { useMediaQuery } from './use-media-query.js'

type ThemeColor = ComponentProps<typeof ThemeProvider>['color']

/**
 * The chrome background seeded when an application names none.
 */
const CHROME_COLOR = { background: '#26292b' }

/**
 * The canvas background seeded when an application names none, the design system default background.
 */
const CANVAS_COLOR = { background: '#fcfcfc' }

export interface FrameRootProps {
	children: ReactNode
	location?: string
	/** The path the router has finished showing, whose change speaks the new screen's title, nothing without it. */
	shownPath?: string
	/** The name of the app, which heads the menu and the drawer and ends the tab title, left alone without it. */
	appName?: string
	/** The theme colour of the frame, a #26292b background when absent. */
	chromeColor?: ThemeColor
	/** The theme colour of the canvas, a #fcfcfc background when absent. */
	canvasColor?: ThemeColor
}

/**
 * Holds the drawer of a frame, which the frame shuts on a page change no drilldown row or Back made, and on a widen.
 * @param small - Whether the window is narrower than 782px.
 * @param location - The location the frame shows.
 * @param navigation - The moves the sidebar parts record.
 * @returns The drawer state.
 */
function useFrameDrawer(small: boolean, location: string | undefined, navigation: NavigationState): DrawerState {
	const [open, setDrawerOpen] = useState(false)
	const id = useId()
	const menu = useRef<HTMLButtonElement>(null)
	const closedByFrame = useRef(false)
	useEffect(() => {
		if (!takeDrawerStays(navigation, location)) {
			closedByFrame.current = true
			setDrawerOpen(false)
		}
	}, [location, navigation])
	useEffect(() => {
		if (!small) {
			closedByFrame.current = true
			setDrawerOpen(false)
		}
	}, [small])
	const setOpen = (next: boolean) => {
		closedByFrame.current = false
		setDrawerOpen(next)
	}
	const finalFocus = () => (closedByFrame.current ? false : menu.current)
	return { open, id, menu, setOpen, finalFocus }
}

/**
 * Frames an admin application, folding its sidebar away on a narrow viewport, holds the moves its sidebar
 * parts share and its drawer, and speaks the title of each new screen and sets the tab title from it.
 * @param props - The regions, the current location, the shown path, the app name, and the region colors.
 * @returns The frame element.
 */
function Root({
	children,
	location,
	shownPath,
	appName,
	chromeColor = CHROME_COLOR,
	canvasColor = CANVAS_COLOR,
}: FrameRootProps) {
	const small = useMediaQuery(SMALL_VIEWPORT)
	const [layout, setLayout] = useState<HTMLElement | null>(null)
	const [navigation] = useState(createNavigationState)
	const [titles] = useState(createScreenTitles)
	const drawer = useFrameDrawer(small, location, navigation)
	const classes = small ? 'godmin-layout godmin-layout--small' : 'godmin-layout'
	return (
		<ThemeProvider color={chromeColor}>
			<FrameContext.Provider value={{ small, location, layout, navigation, appName }}>
				<DrawerContext.Provider value={drawer}>
					<NavigationStateContext.Provider value={navigation}>
						<ScreenTitleContext.Provider value={titles}>
							<TitleWatch titles={titles} shownPath={shownPath} location={location} appName={appName} />
							<div ref={setLayout} className={classes}>
								<CanvasColorContext.Provider value={canvasColor}>
									{children}
								</CanvasColorContext.Provider>
							</div>
						</ScreenTitleContext.Provider>
					</NavigationStateContext.Provider>
				</DrawerContext.Provider>
			</FrameContext.Provider>
		</ThemeProvider>
	)
}

const CanvasColorContext = createContext<ThemeColor>(undefined)

export interface FrameSidebarProps {
	children: ReactNode
	/** The name of Menu and its tooltip, godmin's translated "Menu" when absent. */
	menuLabel?: string
	/** The name of the column's nav and of the drawer, godmin's translated "Admin" when absent. */
	label?: string
	/** What sits under the menu and never moves, such as the account panel. */
	footer?: ReactNode
	/** One short line of small grey text under the footer, such as the version. */
	footerNote?: ReactNode
}

/**
 * Renders the sidebar footer: the panel, then the note, or nothing when the app gives neither.
 * @param props - The footer panel and the note.
 * @returns The footer element, or null.
 */
function SidebarFooter({ footer, footerNote }: Pick<FrameSidebarProps, 'footer' | 'footerNote'>) {
	if (footer === undefined && footerNote === undefined) {
		return null
	}
	return (
		<div className="godmin-sidebar__footer">
			{footer}
			{footerNote === undefined ? null : <div className="godmin-sidebar__footer-note">{footerNote}</div>}
		</div>
	)
}

/**
 * Renders the identity block heading the menu: the app name over the host the admin is served at, as plain text.
 * @returns The identity block element.
 */
function SidebarIdentity() {
	const { appName } = useContext(FrameContext)
	return (
		<div className="godmin-sidebar__identity">
			{appName === undefined ? null : (
				<Text variant="body-md" className="godmin-sidebar__name">
					{appName}
				</Text>
			)}
			<Text variant="body-sm" className="godmin-sidebar__address">
				{siteAddress(window.location.host)}
			</Text>
		</div>
	)
}

/**
 * Renders the admin nav, as a sidebar when there is room and as a top bar
 * with a drawer when there is not, its identity block, content and footer in both.
 * @param props - The sidebar content, the menu button label, the nav name, the footer and its note.
 * @returns The sidebar element.
 */
function Sidebar({
	children,
	menuLabel = __('Menu'),
	label = __('Admin'),
	footer,
	footerNote,
}: FrameSidebarProps) {
	const { small } = useContext(FrameContext)
	const drawer = useDrawer()
	const content = (
		<>
			<SidebarIdentity />
			<div className="godmin-sidebar__content">{children}</div>
			<SidebarFooter footer={footer} footerNote={footerNote} />
		</>
	)
	if (!small) {
		return (
			<nav className="godmin-layout__sidebar" aria-label={label}>
				{content}
			</nav>
		)
	}
	return (
		<>
			<TopBar menuLabel={menuLabel} />
			<SidebarDrawer drawer={drawer} label={label}>
				{content}
			</SidebarDrawer>
		</>
	)
}

/**
 * Returns the edge the drawer opens from and swipes away to, the start edge of the frame.
 * @param layout - The frame element, null before it is drawn.
 * @returns Right in a right-to-left frame, else left.
 */
function drawerSide(layout: HTMLElement | null): 'left' | 'right' {
	return layout !== null && getComputedStyle(layout).direction === 'rtl' ? 'right' : 'left'
}

/**
 * Renders the drawer, titled by the nav name and ending in a close button only assistive technology meets.
 * @param props - The drawer, the nav name and the sidebar content.
 * @returns The drawer root around its popup, which portals into the frame.
 */
function SidebarDrawer({ drawer, label, children }: { drawer: DrawerState; label: string; children: ReactNode }) {
	const { layout } = useContext(FrameContext)
	return (
		<Drawer.Root open={drawer.open} onOpenChange={drawer.setOpen} swipeDirection={drawerSide(layout)}>
			<Drawer.Popup
				id={drawer.id}
				className="godmin-layout__drawer"
				portal={<Drawer.Portal container={layout} />}
				finalFocus={drawer.finalFocus}
			>
				<VisuallyHidden render={<Drawer.Title />}>{label}</VisuallyHidden>
				{children}
				<VisuallyHidden render={<Drawer.Action variant="unstyled" tabIndex={-1} />}>
					{__('Close navigation panel')}
				</VisuallyHidden>
			</Drawer.Popup>
		</Drawer.Root>
	)
}

/**
 * Renders the narrow viewport chrome of a frame with no bar, Menu alone.
 * @param props - The name of Menu.
 * @returns The top bar element.
 */
function TopBar({ menuLabel }: Required<Pick<FrameSidebarProps, 'menuLabel'>>) {
	return (
		<div className="godmin-layout__topbar">
			<Menu label={menuLabel} />
		</div>
	)
}

/**
 * How a screen fills its canvas region.
 */
export type CanvasMode = 'padded' | 'bleed'

export interface FrameCanvasProps {
	children: ReactNode
	canvas?: CanvasMode
	/** The notices drawn in a band above the screen, such as a notice that an update is available. */
	notices?: ReactNode
}

/**
 * Tells whether notices hold anything React draws.
 * @param notices - The notices the app gives.
 * @returns Whether any of them is something other than nothing or an empty string.
 */
function hasNotices(notices: ReactNode): boolean {
	return Children.toArray(notices).some((notice) => notice !== '')
}

/**
 * Renders the notices in a band of their own, with square corners on a bleed canvas, or nothing when there are none.
 * @param props - The notices and how the screen fills the canvas.
 * @returns The band element, or null.
 */
function Notices({ notices, canvas }: { notices: ReactNode; canvas: CanvasMode }) {
	if (!hasNotices(notices)) {
		return null
	}
	const band = <div className="godmin-layout__notices">{notices}</div>
	return canvas === 'bleed' ? <ThemeProvider cornerRadius="none">{band}</ThemeProvider> : band
}

/**
 * Renders the region showing the active screen, under a band of notices when the app gives some.
 * @param props - The screen, whether it fills the canvas edge to edge, and the notices.
 * @returns The canvas element.
 */
function Canvas({ children, canvas = 'padded', notices }: FrameCanvasProps) {
	const color = useContext(CanvasColorContext)
	const classes =
		canvas === 'bleed'
			? 'godmin-layout__canvas godmin-layout__canvas--bleed'
			: 'godmin-layout__canvas'
	return (
		<ThemeProvider color={color}>
			<main className={classes} style={{ isolation: 'isolate' }}>
				<Notices notices={notices} canvas={canvas} />
				{children}
			</main>
		</ThemeProvider>
	)
}

/**
 * The admin frame, whose regions are present when their element is rendered.
 */
export const Frame = { Root, Sidebar, Canvas }
