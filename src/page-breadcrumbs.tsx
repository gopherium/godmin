import { Link, Text } from '@wordpress/ui'
import type { ComponentProps, ReactNode } from 'react'

export interface PageBreadcrumbsProps {
	/** The name of the navigation region, read by assistive technology. */
	label: string
	/** The links, one PageBreadcrumb each. */
	children: ReactNode
}

/**
 * Renders the links that lead back from a record as a navigation region holding a list, as admin-ui draws its trail.
 * @param props - The navigation name and the links.
 * @returns The navigation element.
 */
export function PageBreadcrumbs({ label, children }: PageBreadcrumbsProps) {
	return (
		<nav aria-label={label} className="godmin-page__breadcrumbs">
			<ul role="list">{children}</ul>
		</nav>
	)
}

export interface PageBreadcrumbProps {
	/** The address the link leads to, when it renders as a plain link. */
	href?: string
	/** The link element the breadcrumb renders through, such as a router link. */
	render?: ComponentProps<typeof Link>['render']
	/** The link label. */
	children: ReactNode
}

/**
 * Renders one link of the breadcrumbs as a list item, with the slash after it.
 * @param props - The address or the link element, and the label.
 * @returns The list item element.
 */
export function PageBreadcrumb({ href, render, children }: PageBreadcrumbProps) {
	return (
		<li>
			<Text variant="body-lg" render={<Link tone="neutral" href={href} render={render} />}>
				{children}
			</Text>
			<Text variant="body-lg" aria-hidden="true" className="godmin-page__separator">
				/
			</Text>
		</li>
	)
}
