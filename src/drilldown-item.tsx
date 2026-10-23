// SPDX-License-Identifier: Apache-2.0

import { useRouter } from '@tanstack/react-router'
import type { AnyRouter, LinkComponentProps, LinkProps, RegisteredRouter } from '@tanstack/react-router'
import { isRTL } from '@wordpress/i18n'
import { Icon, chevronLeftSmall, chevronRightSmall } from '@wordpress/icons'
import { useContext } from 'react'
import type { MouseEvent, ReactElement, ReactNode } from 'react'

import { ROW_CLASS, Row } from './navigation-item.js'
import { NavigationStateContext, isPlainClick, recordDrilldown } from './navigation-state.js'
import { findMoveTarget, findRowRoutes } from './path-matching.js'

/** The start of the id a drilldown row takes from its address. */
const ID_PREFIX = 'godmin-drilldown-item-'

/** A row whose address opens a route that declares a Sidebar. Draws the chevron. Sits inside a NavigationList. */
export type DrilldownItemProps<
	TRouter extends AnyRouter = RegisteredRouter,
	TFrom extends string = string,
	TTo extends string | undefined = undefined,
	TMaskFrom extends string = TFrom,
	TMaskTo extends string = '',
> = LinkProps<'a', TRouter, TFrom, TTo, TMaskFrom, TMaskTo> & {
	/** A glyph from `@wordpress/icons`, drawn at 24px. */
	icon?: ReactElement
	children: ReactNode
}

/**
 * Renders a sidebar row that opens a sub menu: its icon, its label and the chevron, with an id taken from its address.
 * A plain click inside a frame records a forward move from this row to its address.
 * @param props - The TanStack Link props, the icon and the label.
 * @returns The row element, or null when its address opens a route the reader may not open.
 */
export function DrilldownItem<
	TRouter extends AnyRouter = RegisteredRouter,
	const TFrom extends string = string,
	const TTo extends string | undefined = undefined,
	const TMaskFrom extends string = TFrom,
	const TMaskTo extends string = '',
>({ icon, children, ...link }: DrilldownItemProps<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>) {
	const router = useRouter()
	const state = useContext(NavigationStateContext)
	const address = link as LinkComponentProps
	const routes = findRowRoutes(router, address)
	const id = ID_PREFIX + routes.href
	const onClick = (event: MouseEvent) => {
		if (state !== undefined && isPlainClick(event)) {
			recordDrilldown(state, id, findMoveTarget(router, address))
		}
	}
	return (
		<Row
			link={{ ...address, onClick }}
			routes={routes}
			icon={icon}
			className={ROW_CLASS}
			id={id}
			end={
				<Icon
					icon={isRTL() ? chevronLeftSmall : chevronRightSmall}
					size={24}
					className="godmin-navigation-item__drilldown-indicator"
				/>
			}
		>
			{children}
		</Row>
	)
}
