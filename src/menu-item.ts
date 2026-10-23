// SPDX-License-Identifier: Apache-2.0

import { useRouter } from '@tanstack/react-router'
import { useCallback } from 'react'
import type { ReactElement } from 'react'

import type { Can } from './navigation-state.js'
import { findRouteCapabilities } from './path-matching.js'

/** One row of a sidebar menu, as data. WordPress's new admin names it MenuItem too. */
export interface MenuItem {
	/** The words the row shows. */
	label: string
	/** A real address with its params filled in, such as '/users/42'. */
	to: string
	/** A glyph from `@wordpress/icons`, drawn at 24px. */
	icon?: ReactElement
	/** The capability the reader must hold, besides the ones the routes it opens ask for. */
	capability?: string
	/** The row shown in this one's place when the reader cannot open it. */
	fallback?: MenuItem
}

/**
 * Tells whether a reader holds a capability, never when there is no check.
 * @param can - The check of a capability, absent outside a Navigation.
 * @param capability - The capability asked for.
 * @returns Whether the check allows it.
 */
function holds(can: Can | undefined, capability: string): boolean {
	return can?.(capability) === true
}

/**
 * Tells whether a reader may open every route an address opens, parents and params included.
 * @param capabilities - The capability of every route the address opens.
 * @param can - The check of a capability, absent outside a Navigation.
 * @returns Whether the check allows every one of them, so with no check only routes that name none.
 */
export function canOpenRoutes(capabilities: readonly string[], can: Can | undefined): boolean {
	return capabilities.every((capability) => holds(can, capability))
}

/**
 * Returns the check of whether the reader may access a row: its own capability and that of every route it opens.
 * A row that names a capability fails when can is absent.
 * @param can - Tells whether the reader holds a capability.
 * @returns The check of one row.
 */
export function useCanAccess(
	can?: (capability: string) => boolean,
): (item: Pick<MenuItem, 'to' | 'capability'>) => boolean {
	const router = useRouter()
	return useCallback(
		(item: Pick<MenuItem, 'to' | 'capability'>) =>
			(item.capability === undefined || holds(can, item.capability)) &&
			canOpenRoutes(findRouteCapabilities(router, { to: item.to }), can),
		[router, can],
	)
}
