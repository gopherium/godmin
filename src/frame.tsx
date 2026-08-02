/* oxlint-disable react/only-export-components -- a compound component is an
   object export standing beside the parts it is built from. */
import { ThemeProvider } from '@wordpress/theme'
import { Drawer, IconButton, VisuallyHidden } from '@wordpress/ui'
import { createContext, useContext, useEffect, useState } from 'react'
import type { ComponentProps, ReactNode } from 'react'

import { SMALL_VIEWPORT } from './breakpoints.js'
import { useMediaQuery } from './use-media-query.js'

type ThemeColor = ComponentProps<typeof ThemeProvider>['color']

/**
 * The glyph on the button that opens the rail drawer.
 */
const menuIcon = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
		<path d="M5 5v1.5h14V5H5zm0 7.8h14v-1.5H5v1.5zM5 19h14v-1.5H5V19z" />
	</svg>
)


interface FrameState {
	small: boolean
	location: string | undefined
}

const FrameContext = createContext<FrameState>({ small: false, location: undefined })

export interface FrameRootProps {
	children: ReactNode
	location?: string
	chromeColor?: ThemeColor
	canvasColor?: ThemeColor
}

/**
 * Frames an admin application, folding its rail away on a narrow viewport.
 * @param props - The regions, the current location, and the region colors.
 * @returns The frame element.
 */
function Root({ children, location, chromeColor, canvasColor }: FrameRootProps) {
	const small = useMediaQuery(SMALL_VIEWPORT)
	const classes = small ? 'godmin-layout godmin-layout--small' : 'godmin-layout'
	return (
		<ThemeProvider color={chromeColor}>
			<FrameContext.Provider value={{ small, location }}>
				<div className={classes}>
					<CanvasColorContext.Provider value={canvasColor}>
						{children}
					</CanvasColorContext.Provider>
				</div>
			</FrameContext.Provider>
		</ThemeProvider>
	)
}

const CanvasColorContext = createContext<ThemeColor>(undefined)

export interface FrameRailProps {
	children: ReactNode
	brand?: ReactNode
	menuLabel?: string
}

/**
 * Renders the navigation region, as a rail when there is room and as a top bar
 * with a drawer when there is not.
 * @param props - The rail content, the brand, and the menu button label.
 * @returns The rail element.
 */
function Rail({ children, brand, menuLabel = 'Open navigation' }: FrameRailProps) {
	const { small } = useContext(FrameContext)
	if (!small) {
		return <div className="godmin-layout__rail">{children}</div>
	}
	return (
		<TopBar brand={brand} menuLabel={menuLabel}>
			{children}
		</TopBar>
	)
}

/**
 * Renders the narrow viewport chrome: a menu button opening the rail content in
 * a drawer, beside the brand.
 * @param props - The rail content, the brand, and the menu button label.
 * @returns The top bar element.
 */
function TopBar({ children, brand, menuLabel }: Required<Pick<FrameRailProps, 'children' | 'menuLabel'>> & { brand?: ReactNode }) {
	const { location } = useContext(FrameContext)
	const [open, setOpen] = useState(false)
	useEffect(() => {
		setOpen(false)
	}, [location])
	return (
		<div className="godmin-layout__topbar">
			<Drawer.Root open={open} onOpenChange={setOpen}>
				<Drawer.Trigger render={<IconButton icon={menuIcon} label={menuLabel} />} />
				<Drawer.Popup className="godmin-layout__drawer">
					<VisuallyHidden render={<Drawer.Title />}>{menuLabel}</VisuallyHidden>
					{children}
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
}

/**
 * Renders the region showing the active screen.
 * @param props - The screen, and whether it fills the canvas edge to edge.
 * @returns The canvas element.
 */
function Canvas({ children, canvas = 'padded' }: FrameCanvasProps) {
	const color = useContext(CanvasColorContext)
	const classes =
		canvas === 'bleed'
			? 'godmin-layout__canvas godmin-layout__canvas--bleed'
			: 'godmin-layout__canvas'
	return (
		<ThemeProvider color={color}>
			<main className={classes}>{children}</main>
		</ThemeProvider>
	)
}

/**
 * The admin frame, whose regions are present when their element is rendered.
 */
export const Frame = { Root, Rail, Canvas }
