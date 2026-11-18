import { createContext, useContext } from 'react'
import type { RefObject } from 'react'

import { createNavigationState } from './navigation-state.js'
import type { NavigationState } from './navigation-state.js'

/** What a frame tells the parts drawn inside it. */
export interface FrameState {
	/** Whether the window is narrower than 782px, so the sidebar folds into the drawer. */
	small: boolean
	/** The location the frame shows. */
	location: string | undefined
	/** The frame element, null before it is drawn. */
	layout: HTMLElement | null
	/** The moves the sidebar parts record, read by the drawer. */
	navigation: NavigationState
}

/** The frame a part sits in, a wide one with nothing recorded outside any Frame.Root. */
export const FrameContext = createContext<FrameState>({
	small: false,
	location: undefined,
	layout: null,
	navigation: createNavigationState(),
})

/** The drawer that holds the sidebar below 782px, which Menu opens. */
export interface DrawerState {
	/** Whether the drawer is open. */
	open: boolean
	/** The id of the drawer popup, which Menu names while the drawer is open. */
	id: string
	/** Menu, where the focus goes back once the reader closes the drawer. */
	menu: RefObject<HTMLButtonElement | null>
	/** Opens the drawer, or closes it as the reader asks. */
	setOpen: (open: boolean) => void
	/** Returns where the focus goes as the drawer closes: Menu, or nowhere when the frame closed it. */
	finalFocus: () => HTMLElement | null | false
}

/** The drawer of the frame a part sits in, which a Frame.Root holds. */
export const DrawerContext = createContext<DrawerState | undefined>(undefined)

/** The error a sidebar part throws with no Frame.Root above it. */
const NO_FRAME = 'Frame.Sidebar must sit inside a Frame.Root, which holds its drawer.'

/**
 * Returns the drawer of the frame around the part.
 * @returns The drawer state.
 */
export function useDrawer(): DrawerState {
	const drawer = useContext(DrawerContext)
	if (drawer === undefined) {
		throw new Error(NO_FRAME)
	}
	return drawer
}
