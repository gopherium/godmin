// SPDX-License-Identifier: Apache-2.0

import { createLink, useRouter } from '@tanstack/react-router'
import type { AnyRouter, LinkComponentProps, NavigateOptions, RegisteredRouter } from '@tanstack/react-router'
import { isRTL } from '@wordpress/i18n'
import { Icon, chevronLeftSmall, chevronRightSmall } from '@wordpress/icons'
import { useContext } from 'react'
import type { ComponentProps, MouseEvent, ReactElement, ReactNode } from 'react'

import { ROW_CLASS, Row, RowSuffix } from './navigation-item.js'
import { NavigationStateContext, isPlainClick, recordDrilldown } from './navigation-state.js'
import { findMoveTarget, findRowRoutes } from './path-matching.js'

/** The start of the id a drilldown row takes from its address. */
const ID_PREFIX = 'godmin-drilldown-item-'

/** The props TanStack's Link hands the anchor of a drilldown row. */
interface AnchorProps extends ComponentProps<'a'> {
	/** Whether the address is open. */
	'data-status'?: string
	/** Whether the link goes nowhere. */
	disabled?: boolean
}

/**
 * Renders the anchor of a drilldown row without the marks of the current page.
 * @param props - The props TanStack's Link hands the anchor.
 * @returns The anchor element.
 */
function UnmarkedAnchor({
	'aria-current': _current,
	'data-status': _status,
	disabled: _disabled,
	...anchor
}: AnchorProps) {
	return <a {...anchor} />
}

/** The router link of a drilldown row, never marked current. */
const DrilldownLink = createLink(UnmarkedAnchor)

/** The props TanStack adds to a drilldown row on its own address, none. */
const NO_ACTIVE_PROPS = {}

/** The TanStack Link props besides the address that a drilldown row takes, all but those of the current page. */
type OtherLinkProps = Omit<LinkComponentProps, 'activeProps' | 'activeOptions' | keyof NavigateOptions>

/** A row whose address opens a route that declares a Sidebar. Draws the chevron. Sits inside a NavigationList. */
export type DrilldownItemProps<
	TRouter extends AnyRouter = RegisteredRouter,
	TFrom extends string = string,
	TTo extends string | undefined = undefined,
	TMaskFrom extends string = TFrom,
	TMaskTo extends string = '',
> = NavigateOptions<TRouter, TFrom, TTo, TMaskFrom, TMaskTo> & OtherLinkProps & {
	/** None, since the row takes its id from its address. */
	id?: never
	/** A glyph from `@wordpress/icons`, drawn at 24px. */
	icon?: ReactElement
	/** Drawn before the chevron, such as a MenuCount. */
	suffix?: ReactNode
	children: ReactNode
}

/**
 * Renders a sidebar row that opens a sub menu: its icon, label, suffix and chevron, with an id taken from its address.
 * A plain click inside a frame records a forward move from this row to its address.
 * @param props - The TanStack Link props, the icon, the suffix and the label.
 * @returns The row element, or null when its address opens a route the reader may not open.
 */
export function DrilldownItem<
	TRouter extends AnyRouter = RegisteredRouter,
	const TFrom extends string = string,
	const TTo extends string | undefined = undefined,
	const TMaskFrom extends string = TFrom,
	const TMaskTo extends string = '',
>({ icon, suffix, children, ...link }: DrilldownItemProps<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>) {
	const router = useRouter()
	const state = useContext(NavigationStateContext)
	const address = link as LinkComponentProps
	const routes = findRowRoutes(router, address)
	const id = ID_PREFIX + routes.href
	const onClick = (event: MouseEvent<HTMLAnchorElement>) => {
		address.onClick?.(event)
		if (state !== undefined && isPlainClick(event)) {
			recordDrilldown(state, id, findMoveTarget(router, address))
		}
	}
	return (
		<Row
			link={{ ...address, onClick, activeProps: NO_ACTIVE_PROPS }}
			linkComponent={DrilldownLink}
			routes={routes}
			icon={icon}
			className={ROW_CLASS}
			id={id}
			end={
				<>
					{suffix === undefined ? null : <RowSuffix>{suffix}</RowSuffix>}
					<Icon
						icon={isRTL() ? chevronLeftSmall : chevronRightSmall}
						size={24}
						className="godmin-navigation-item__drilldown-indicator"
					/>
				</>
			}
		>
			{children}
		</Row>
	)
}
