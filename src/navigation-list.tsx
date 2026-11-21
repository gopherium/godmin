// SPDX-License-Identifier: Apache-2.0

import { useRouter, useRouterState } from '@tanstack/react-router'
import type { AnyRouter } from '@tanstack/react-router'
import { __ } from '@wordpress/i18n'
import { Text } from '@wordpress/ui'
import { Children, isValidElement, useContext, useId } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { DrilldownItem } from './drilldown-item.js'
import { MenuCount } from './menu-count.js'
import { canOpenRoutes, useCanAccess } from './menu-item.js'
import type { MenuGroup, MenuItem } from './menu-item.js'
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

/** A row of data the reader sees, in the section of the item it stands for. */
interface ShownRow {
	/** The row drawn, the item or one of its fallbacks. */
	row: MenuItem
	/** The section of the item, whatever section a fallback names. */
	group: MenuGroup | undefined
}

/** One part of a list: a section and its rows, or rows outside every section. */
interface ListPart {
	/** The section, undefined for rows outside every section. */
	group: MenuGroup | undefined
	/** The rows of the part, in the order given. */
	rows: MenuItem[]
}

/**
 * Returns the part a row joins: its section, the list of rows with no section just before it, or a new part.
 * @param parts - The parts so far, in order, which a new part joins at the end.
 * @param sections - The part of each section shown so far, which a new section joins.
 * @param group - The section of the row, undefined outside every section.
 * @returns The part.
 */
function partFor(parts: ListPart[], sections: Map<MenuGroup, ListPart>, group: MenuGroup | undefined): ListPart {
	const last = parts.at(-1)
	const found = group === undefined ? last : sections.get(group)
	if (found !== undefined && found.group === group) {
		return found
	}
	const part: ListPart = { group, rows: [] }
	parts.push(part)
	if (group !== undefined) {
		sections.set(group, part)
	}
	return part
}

/**
 * Splits the shown rows into the sections and lists of a screen, each section at the place of its first row.
 * @param rows - The rows the reader sees, in the order given.
 * @param drawsRows - Whether the app draws rows of its own after them.
 * @returns The parts, in order.
 */
function partsOf(rows: readonly ShownRow[], drawsRows: boolean): ListPart[] {
	const parts: ListPart[] = []
	const sections = new Map<MenuGroup, ListPart>()
	for (const { row, group } of rows) {
		partFor(parts, sections, group).rows.push(row)
	}
	if (drawsRows || parts.length === 0) {
		partFor(parts, sections, undefined)
	}
	return parts
}

/**
 * Returns the name of a section in the reader language, the words of WordPress's new admin.
 * @param group - The section.
 * @returns Its name.
 */
function sectionName(group: MenuGroup): string {
	const names: Record<MenuGroup, string> = { content: __('Content'), design: __('Design'), manage: __('Manage') }
	return names[group]
}

/**
 * Renders rows as a list: the rows of data, then any rows the app draws.
 * @param props - The rows as data, the id of the sub menu route shown now, and the rows the app draws.
 * @returns The list element.
 */
function RowList({ rows, shown, children }: { rows: MenuItem[]; shown: string | undefined; children?: ReactNode }) {
	return (
		<ul role="list" className="godmin-navigation-list">
			{rows.map((row) => (
				<DataRow key={row.to} item={row} shown={shown} />
			))}
			{children}
		</ul>
	)
}

/**
 * Renders a menu section as WordPress's new admin does: a group named by its small label, over a list of its rows.
 * @param props - The section, its rows and the id of the sub menu route shown now.
 * @returns The section element.
 */
function MenuSection({ group, rows, shown }: { group: MenuGroup; rows: MenuItem[]; shown: string | undefined }) {
	const id = useId()
	return (
		<div role="group" aria-labelledby={id} className="godmin-navigation-group">
			<Text id={id} variant="body-sm" className="godmin-navigation-group__label">
				{sectionName(group)}
			</Text>
			<RowList rows={rows} shown={shown} />
		</div>
	)
}

/**
 * Renders the rows of a sidebar screen the reader may access in their sections, then the rows the app draws.
 * @param props - The rows as data and the rows the app draws itself.
 * @returns The lists and sections of the screen.
 */
export function NavigationList({ items = [], children }: NavigationListProps) {
	const router = useRouter()
	const { can } = useContext(ScreenContext)
	const canAccess = useCanAccess(can)
	const shown = useRouterState({ select: (state): string | undefined => findSidebarMatch(state.matches)?.routeId })
	const rows = items.flatMap((item): ShownRow[] => {
		const row = shownRow(item, canAccess)
		return row === undefined ? [] : [{ row, group: item.group }]
	})
	const drawn = Children.toArray(children)
	const placeholder =
		rows.some(({ row }) => row.icon !== undefined) || drawn.some((child) => showsIcon(child, router, can))
	const parts = partsOf(rows, drawn.length > 0)
	return (
		<IconPlaceholderContext.Provider value={placeholder}>
			{parts.map((part, index) =>
				part.group === undefined ? (
					<RowList key={`rows-${index}`} rows={part.rows} shown={shown}>
						{index === parts.length - 1 ? children : null}
					</RowList>
				) : (
					<MenuSection key={part.group} group={part.group} rows={part.rows} shown={shown} />
				),
			)}
		</IconPlaceholderContext.Provider>
	)
}
