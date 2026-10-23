/* oxlint-disable react/only-export-components -- a compound component is an
   object export standing beside the parts it is built from. */
import { __ } from '@wordpress/i18n'
import { Icon, menu } from '@wordpress/icons'
import { ThemeProvider } from '@wordpress/theme'
import { Drawer, VisuallyHidden } from '@wordpress/ui'
import { Children, createContext, useContext, useEffect, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { SMALL_VIEWPORT } from './breakpoints.js'
import { NavigationStateContext, createNavigationState, takeDrawerStays } from './navigation-state.js'
import type { NavigationState } from './navigation-state.js'
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

interface FrameState {
	small: boolean
	location: string | undefined
	layout: HTMLElement | null
	/** The moves the sidebar parts record, read by the drawer. */
	navigation: NavigationState
}

const FrameContext = createContext<FrameState>({
	small: false,
	location: undefined,
	layout: null,
	navigation: createNavigationState(),
})

export interface FrameRootProps {
	children: ReactNode
	location?: string
	/** The theme colour of the frame, a #26292b background when absent. */
	chromeColor?: ThemeColor
	/** The theme colour of the canvas, a #fcfcfc background when absent. */
	canvasColor?: ThemeColor
}

/**
 * Frames an admin application, folding its sidebar away on a narrow viewport,
 * and holds the moves its sidebar parts share.
 * @param props - The regions, the current location, and the region colors.
 * @returns The frame element.
 */
function Root({ children, location, chromeColor = CHROME_COLOR, canvasColor = CANVAS_COLOR }: FrameRootProps) {
	const small = useMediaQuery(SMALL_VIEWPORT)
	const [layout, setLayout] = useState<HTMLElement | null>(null)
	const [navigation] = useState(createNavigationState)
	const classes = small ? 'godmin-layout godmin-layout--small' : 'godmin-layout'
	return (
		<ThemeProvider color={chromeColor}>
			<FrameContext.Provider value={{ small, location, layout, navigation }}>
				<NavigationStateContext.Provider value={navigation}>
					<div ref={setLayout} className={classes}>
						<CanvasColorContext.Provider value={canvasColor}>
							{children}
						</CanvasColorContext.Provider>
					</div>
				</NavigationStateContext.Provider>
			</FrameContext.Provider>
		</ThemeProvider>
	)
}

const CanvasColorContext = createContext<ThemeColor>(undefined)

export interface FrameSidebarProps {
	children: ReactNode
	brand?: ReactNode
	/** The name of the menu button, godmin's translated "Open navigation panel" when absent. */
	menuLabel?: string
	/** The name of the region the column is, godmin's translated "Navigation" when absent. */
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
 * Renders the navigation region, as a sidebar when there is room and as a top bar
 * with a drawer when there is not, its content above its footer in both.
 * @param props - The sidebar content, the brand, the menu button label, the region name, the footer and its note.
 * @returns The sidebar element.
 */
function Sidebar({
	children,
	brand,
	menuLabel = __('Open navigation panel'),
	label = __('Navigation'),
	footer,
	footerNote,
}: FrameSidebarProps) {
	const { small } = useContext(FrameContext)
	const content = (
		<>
			<div className="godmin-sidebar__content">{children}</div>
			<SidebarFooter footer={footer} footerNote={footerNote} />
		</>
	)
	if (!small) {
		return (
			<div className="godmin-layout__sidebar" role="region" aria-label={label} tabIndex={-1}>
				{content}
			</div>
		)
	}
	return (
		<TopBar brand={brand} menuLabel={menuLabel}>
			{content}
		</TopBar>
	)
}

/**
 * Renders the narrow viewport chrome: a menu button opening the sidebar content in
 * a drawer, beside the brand. The drawer closes on a page change, unless a drilldown row or Back made it,
 * and ends in a close button only assistive technology meets, the name of WordPress's phone backdrop.
 * @param props - The sidebar content, the brand, and the menu button label.
 * @returns The top bar element.
 */
function TopBar({
	children,
	brand,
	menuLabel,
}: Required<Pick<FrameSidebarProps, 'children' | 'menuLabel'>> & { brand?: ReactNode }) {
	const { location, layout, navigation } = useContext(FrameContext)
	const [open, setOpen] = useState(false)
	useEffect(() => {
		if (!takeDrawerStays(navigation, location)) {
			setOpen(false)
		}
	}, [location, navigation])
	return (
		<div className="godmin-layout__topbar">
			<Drawer.Root open={open} onOpenChange={setOpen}>
				<Drawer.Trigger render={<button type="button" className="godmin-layout__menu" aria-label={menuLabel} />}>
					<Icon icon={menu} />
				</Drawer.Trigger>
				<Drawer.Popup className="godmin-layout__drawer" portal={<Drawer.Portal container={layout} />}>
					<VisuallyHidden render={<Drawer.Title />}>{__('Navigation')}</VisuallyHidden>
					{children}
					<VisuallyHidden render={<Drawer.Action variant="unstyled" tabIndex={-1} />}>
						{__('Close navigation panel')}
					</VisuallyHidden>
				</Drawer.Popup>
			</Drawer.Root>
			{brand}
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
