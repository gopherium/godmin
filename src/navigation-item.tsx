// SPDX-License-Identifier: Apache-2.0

import { Link, useRouter } from '@tanstack/react-router'
import type { AnyRouter, LinkComponentProps, LinkProps, RegisteredRouter } from '@tanstack/react-router'
import { Icon } from '@wordpress/icons'
import { useContext } from 'react'
import type { ReactElement, ReactNode } from 'react'

import { canOpenRoutes } from './menu-item.js'
import { IconPlaceholderContext, ScreenContext } from './navigation-state.js'
import { findRowRoutes } from './path-matching.js'
import type { RowRoutes } from './path-matching.js'

/** The class every sidebar row link carries. */
export const ROW_CLASS = 'godmin-navigation-item'

/** The class of a row icon and of the placeholder drawn in its place. */
const ICON_CLASS = 'godmin-navigation-item__icon'

/**
 * A row that goes to a page. Takes the TanStack Link props, such as to, params and search.
 * An address with a scheme draws a plain link. Sits inside a NavigationList.
 */
export type NavigationItemProps<
	TRouter extends AnyRouter = RegisteredRouter,
	TFrom extends string = string,
	TTo extends string | undefined = undefined,
	TMaskFrom extends string = TFrom,
	TMaskTo extends string = '',
> = LinkProps<'a', TRouter, TFrom, TTo, TMaskFrom, TMaskTo> & {
	/** A glyph from `@wordpress/icons`, drawn at 24px. */
	icon?: ReactElement
	/** Drawn at the end of the row, such as a MenuCount. */
	suffix?: ReactNode
	children: ReactNode
}

/** What a sidebar row draws. */
interface RowProps {
	/** The TanStack Link props of the row. */
	link: LinkComponentProps
	/** Where the row goes and what the routes it opens declare. */
	routes: RowRoutes
	/** A glyph from `@wordpress/icons`, drawn at 24px. */
	icon: ReactElement | undefined
	/** The classes of the row link. */
	className: string
	/** The id of the row link, when the row needs one. */
	id?: string
	/** What ends the row, such as a suffix or a chevron. */
	end?: ReactNode
	children: ReactNode
}

/**
 * Renders the icon of a row, the placeholder in its place when the rows beside it have icons, or nothing.
 * @param props - The glyph of the row, if any.
 * @returns The icon element, the placeholder, or null.
 */
function RowIcon({ icon }: { icon: ReactElement | undefined }) {
	const placeholder = useContext(IconPlaceholderContext)
	if (icon !== undefined) {
		return <Icon icon={icon} size={24} className={ICON_CLASS} />
	}
	return placeholder ? <span className={ICON_CLASS} aria-hidden="true" /> : null
}

/**
 * Renders a sidebar row as a list item holding its link, or nothing when the reader may not open its routes.
 * @param props - The link props, where the row goes, the icon, the classes, the id, the end of the row and its label.
 * @returns The list item element, or null.
 */
export function Row({ link, routes, icon, className, id, end, children }: RowProps) {
	const { can } = useContext(ScreenContext)
	if (!canOpenRoutes(routes.capabilities, can)) {
		return null
	}
	return (
		<li>
			<Link {...link} id={id} className={className}>
				<RowIcon icon={icon} />
				<div className="godmin-navigation-item__label">{children}</div>
				{end}
			</Link>
		</li>
	)
}

/**
 * Renders a sidebar row that goes to a page: its icon, its label and its suffix, current on every address under it.
 * @param props - The TanStack Link props, the icon, the suffix and the label.
 * @returns The row element, or null when its address opens a route the reader may not open.
 */
export function NavigationItem<
	TRouter extends AnyRouter = RegisteredRouter,
	const TFrom extends string = string,
	const TTo extends string | undefined = undefined,
	const TMaskFrom extends string = TFrom,
	const TMaskTo extends string = '',
>({ icon, suffix, children, ...link }: NavigationItemProps<TRouter, TFrom, TTo, TMaskFrom, TMaskTo>) {
	const router = useRouter()
	const address = link as LinkComponentProps
	const routes = findRowRoutes(router, address)
	if (suffix === undefined) {
		return (
			<Row link={address} routes={routes} icon={icon} className={ROW_CLASS}>
				{children}
			</Row>
		)
	}
	return (
		<Row
			link={address}
			routes={routes}
			icon={icon}
			className={`${ROW_CLASS} ${ROW_CLASS}--with-suffix`}
			end={<span className="godmin-navigation-item__suffix">{suffix}</span>}
		>
			{children}
		</Row>
	)
}
