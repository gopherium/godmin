// SPDX-License-Identifier: Apache-2.0

import { useRouter, useRouterState } from '@tanstack/react-router'
import type { AnyRouter } from '@tanstack/react-router'
import { Children, isValidElement, useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { DrilldownItem } from './drilldown-item.js'
import { MenuCount } from './menu-count.js'
import { canOpenRoutes, useCanAccess } from './menu-item.js'
import type { MenuItem } from './menu-item.js'
import { NavigationItem } from './navigation-item.js'
import { IconPlaceholderContext, ScreenContext } from './navigation-state.js'
import type { Can } from './navigation-state.js'
import { findDrilldownParent, findRouteCapabilities, findSidebarMatch } from './path-matching.js'
import type { RowAddress } from './path-matching.js'

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
 * Tells whether a row the app draws shows with an icon.
 * @param child - The row element.
 * @param router - The router its address resolves on.
 * @param can - Tells whether the reader holds a capability.
 * @returns Whether the row has an icon and the reader may open every route its address opens.
 */
function showsIcon(child: ReactNode, router: AnyRouter, can: Can | undefined): boolean {
	if (!isValidElement<RowAddress & { icon?: ReactElement }>(child) || child.props.icon === undefined) {
		return false
	}
	return canOpenRoutes(findRouteCapabilities(router, child.props), can)
}

/**
 * Returns the MenuCount a row of data draws after its label, none when its count is absent or not above zero.
 * @param count - The count of the row.
 * @returns The count element, or undefined.
 */
function countSuffix(count: MenuItem['count']): ReactElement | undefined {
	return count !== undefined && count.value > 0 ? <MenuCount count={count.value} label={count.label} /> : undefined
}

/**
 * Renders a row of data as a DrilldownItem when it opens a sub menu other than the one shown, else a NavigationItem.
 * @param props - The row, and the id of the sub menu route shown now, undefined on the root screen.
 * @returns The row element.
 */
function DataRow({ item, shown }: { item: MenuItem; shown: string | undefined }) {
	const router = useRouter()
	const target = findDrilldownParent(router, { to: item.to })
	const suffix = countSuffix(item.count)
	if (target !== undefined && target !== shown) {
		return (
			<DrilldownItem to={item.to} icon={item.icon} suffix={suffix}>
				{item.label}
			</DrilldownItem>
		)
	}
	return (
		<NavigationItem to={item.to} icon={item.icon} suffix={suffix}>
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
	const router = useRouter()
	const { can } = useContext(ScreenContext)
	const canAccess = useCanAccess(can)
	const shown = useRouterState({ select: (state): string | undefined => findSidebarMatch(state.matches)?.routeId })
	const rows = items.map((item) => shownRow(item, canAccess))
	const placeholder =
		rows.some((row) => row?.icon !== undefined) ||
		Children.toArray(children).some((child) => showsIcon(child, router, can))
	return (
		<IconPlaceholderContext.Provider value={placeholder}>
			<ul role="list" className="godmin-navigation-list">
				{rows.map((row) => (row === undefined ? null : <DataRow key={row.to} item={row} shown={shown} />))}
				{children}
			</ul>
		</IconPlaceholderContext.Provider>
	)
}
