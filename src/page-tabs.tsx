import { cloneElement } from 'react'
import type { ReactElement, ReactNode } from 'react'

export interface PageTabsProps {
	/** The name of the tab navigation, read by assistive technology. */
	label: string
	/** The tabs, one PageTab each. */
	children: ReactNode
}

/**
 * Renders the tabs of a page as a navigation region of links.
 * @param props - The navigation name and the tabs.
 * @returns The tab navigation element.
 */
export function PageTabs({ label, children }: PageTabsProps) {
	return (
		<nav className="godmin-page-tabs" aria-label={label}>
			{children}
		</nav>
	)
}

export interface PageTabProps {
	/** The address the tab leads to, when it renders as a plain link. */
	href?: string
	/** The link element the tab renders through, such as a router link. */
	render?: ReactElement<{ className?: string }>
	/** Whether the tab leads to the page on screen, which alone decides the underline. */
	current?: boolean
	/** The tab label. */
	children: ReactNode
}

/**
 * The class every page tab carries.
 */
const TAB_CLASS = 'godmin-page-tabs__tab'

/**
 * The class that underlines the tab of the page on screen.
 */
const CURRENT_CLASS = 'godmin-page-tabs__tab--current'

/**
 * Renders one page tab as a link, marked and underlined as the current page when it leads to the page on screen.
 * @param props - The address or the link element, whether it is current, and the label.
 * @returns The tab link element.
 */
export function PageTab({ href, render, current = false, children }: PageTabProps) {
	const ariaCurrent = current ? 'page' : undefined
	const tabClass = current ? `${TAB_CLASS} ${CURRENT_CLASS}` : TAB_CLASS
	if (render === undefined) {
		return (
			<a href={href} className={tabClass} aria-current={ariaCurrent}>
				{children}
			</a>
		)
	}
	const own = render.props.className
	return cloneElement(render, {
		className: own === undefined ? tabClass : `${own} ${tabClass}`,
		'aria-current': ariaCurrent,
		children,
	} as Record<string, unknown>)
}
