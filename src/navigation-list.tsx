// SPDX-License-Identifier: Apache-2.0

import { useRouter, useRouterState } from '@tanstack/react-router'
import { useContext } from 'react'
import type { ReactNode } from 'react'

import { DrilldownItem } from './drilldown-item.js'
import { useCanAccess } from './menu-item.js'
import type { MenuItem } from './menu-item.js'
import { NavigationItem } from './navigation-item.js'
import { IconPlaceholderContext, ScreenContext } from './navigation-state.js'
import { findDrilldownParent, findSidebarMatch } from './path-matching.js'

export interface NavigationListProps {
	/** The rows as data, checked against the can of the Navigation the list sits in. */
	items?: readonly MenuItem[]
	/** Rows the app draws itself, each a NavigationItem or a DrilldownItem, after the rows of items. */
	children?: ReactNode
}

/**
 * Returns the row a reader sees in a menu item's place: the item, else its fallback, else nothing.
 * @param item - The menu item, or the fallback of one.
 * @param canAccess - Tells whether the reader may access a row.
 * @returns The first of the item and its fallbacks the reader may access, or undefined.
 */
function shownRow(item: MenuItem | undefined, canAccess: (row: MenuItem) => boolean): MenuItem | undefined {
	if (item === undefined || canAccess(item)) {
		return item
	}
	return shownRow(item.fallback, canAccess)
}

/**
 * Renders a row of data as a DrilldownItem when it opens a sub menu other than the one shown, else a NavigationItem.
 * @param props - The row, and the id of the sub menu route shown now, undefined on the root screen.
 * @returns The row element.
 */
function DataRow({ item, shown }: { item: MenuItem; shown: string | undefined }) {
	const router = useRouter()
	const target = findDrilldownParent(router, { to: item.to })
	if (target !== undefined && target !== shown) {
		return (
			<DrilldownItem to={item.to} icon={item.icon}>
				{item.label}
			</DrilldownItem>
		)
	}
	return (
		<NavigationItem to={item.to} icon={item.icon}>
			{item.label}
		</NavigationItem>
	)
}

/**
 * Renders the rows of a sidebar screen as a list: the rows of items the reader may access, then the rows the app draws.
 * @param props - The rows as data and the rows the app draws itself.
 * @returns The list element.
 */
export function NavigationList({ items = [], children }: NavigationListProps) {
	const { can } = useContext(ScreenContext)
	const canAccess = useCanAccess(can)
	const shown = useRouterState({ select: (state): string | undefined => findSidebarMatch(state.matches)?.routeId })
	const rows = items.map((item) => shownRow(item, canAccess))
	return (
		<IconPlaceholderContext.Provider value={rows.some((row) => row?.icon !== undefined)}>
			<ul role="list" className="godmin-navigation-list">
				{rows.map((row) => (row === undefined ? null : <DataRow key={row.to} item={row} shown={shown} />))}
				{children}
			</ul>
		</IconPlaceholderContext.Provider>
	)
}
