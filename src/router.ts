import { useRouterState } from '@tanstack/react-router'
import type { ComponentType } from 'react'

import type { CanvasMode } from './frame.js'
import { locationAddress } from './path-matching.js'

export { DrilldownItem } from './drilldown-item.js'
export type { DrilldownItemProps } from './drilldown-item.js'
export { listSearch, openOnTap, useListView } from './list-view.js'
export type {
	LayoutDefaults,
	ListDefaults,
	ListFilter,
	ListSearch,
	ListSortDirection,
	ListView,
	ListViewShape,
} from './list-view.js'
export { useCanAccess } from './menu-item.js'
export type { MenuItem } from './menu-item.js'
export { Navigation } from './navigation.js'
export type { NavigationProps } from './navigation.js'
export { NavigationItem } from './navigation-item.js'
export type { NavigationItemProps } from './navigation-item.js'
export { NavigationList } from './navigation-list.js'
export type { NavigationListProps } from './navigation-list.js'

declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		canvas?: CanvasMode
		/** The sidebar screen every page under this route shows, a NavigationScreen. */
		Sidebar?: ComponentType
		/** The capability a reader must hold to open the route. */
		capability?: string
	}
}

/**
 * Returns the canvas the deepest matching route asks for.
 * @returns The canvas mode, padded when no route asks for one.
 */
export function useCanvas(): CanvasMode {
	return useRouterState({
		select: (state) => {
			const asking = [...state.matches].reverse().find((match) => match.staticData.canvas)
			return asking?.staticData.canvas ?? 'padded'
		},
	})
}

/**
 * Returns the current pathname and search, for a frame to close its drawer on.
 * @returns The pathname of the active location followed by its search.
 */
export function useFrameLocation(): string {
	return useRouterState({ select: (state) => locationAddress(state.location) })
}

/**
 * Returns the options a router spreads into createRouter, as WordPress's new admin sets them.
 * @returns Preload on intent, and no pending screen.
 */
export function routerDefaults(): { defaultPreload: 'intent' } {
	return { defaultPreload: 'intent' }
}
