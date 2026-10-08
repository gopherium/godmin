import { cloneElement, useLayoutEffect, useRef, useState } from 'react'
import type { ReactElement, ReactNode, RefObject } from 'react'

export interface PageTabsProps {
	/** The name of the tab navigation, read by assistive technology. */
	label: string
	/** The tabs, one PageTab each. */
	children: ReactNode
}

/**
 * The class every tab row carries.
 */
const ROW_CLASS = 'godmin-page-tabs'

/**
 * The class that fades the start edge of a tab row scrolled past its first tabs.
 */
const FADES_START_CLASS = 'godmin-page-tabs--overflowing-first'

/**
 * The class that fades the end edge of a tab row whose last tabs lie past it.
 */
const FADES_END_CLASS = 'godmin-page-tabs--overflowing-last'

/**
 * The class every page tab carries.
 */
const TAB_CLASS = 'godmin-page-tabs__tab'

/**
 * The class that underlines the tab of the page on screen.
 */
const CURRENT_CLASS = 'godmin-page-tabs__tab--current'

/**
 * The scroll in pixels a tab row may sit off an edge and still rest on it, for sub-pixel rounding.
 */
const SCROLL_EPSILON = 1

/**
 * Returns the classes of a tab row, fading each edge that tabs lie past.
 * @param row - The tab row element.
 * @returns The class list.
 */
function rowClass(row: HTMLElement): string {
	const travelled = Math.abs(row.scrollLeft)
	const room = row.scrollWidth - row.clientWidth
	let classes = ROW_CLASS
	if (travelled > SCROLL_EPSILON) {
		classes += ` ${FADES_START_CLASS}`
	}
	if (travelled < room - SCROLL_EPSILON) {
		classes += ` ${FADES_END_CLASS}`
	}
	return classes
}

/**
 * Returns the classes of a tab row, measured again as the row scrolls, resizes or gains and loses tabs.
 * @param ref - The tab row element.
 * @returns The class list.
 */
function useRowClass(ref: RefObject<HTMLElement | null>): string {
	const [className, setClassName] = useState(ROW_CLASS)
	useLayoutEffect(() => {
		const row = ref.current as HTMLElement
		const measure = () => setClassName(rowClass(row))
		const resizes = new ResizeObserver(measure)
		const watch = () => {
			resizes.disconnect()
			for (const box of [row, ...row.children]) {
				resizes.observe(box)
			}
			measure()
		}
		const mutations = new MutationObserver(watch)
		mutations.observe(row, { childList: true })
		row.addEventListener('scroll', measure, { passive: true })
		watch()
		return () => {
			row.removeEventListener('scroll', measure)
			mutations.disconnect()
			resizes.disconnect()
		}
	}, [ref])
	return className
}

/**
 * Scrolls a tab row the least that shows a tab whole, with the scroll margin the tab asks for.
 * @param row - The tab row element.
 * @param tab - The tab to show.
 */
function reveal(row: HTMLElement, tab: HTMLElement): void {
	const style = getComputedStyle(tab)
	const start = tab.offsetLeft - parseFloat(style.scrollMarginLeft)
	const end = tab.offsetLeft + tab.offsetWidth + parseFloat(style.scrollMarginRight)
	if (end > row.scrollLeft + row.clientWidth) {
		row.scrollLeft = end - row.clientWidth
	}
	if (start < row.scrollLeft) {
		row.scrollLeft = start
	}
}

/**
 * Scrolls a tab row to its current tab each time another tab becomes current.
 * @param ref - The tab row element.
 */
function useRevealCurrent(ref: RefObject<HTMLElement | null>): void {
	const shown = useRef<Element | null>(null)
	useLayoutEffect(() => {
		const row = ref.current as HTMLElement
		const tab = row.querySelector<HTMLElement>(`.${CURRENT_CLASS}`)
		if (tab === null || tab === shown.current) {
			return
		}
		shown.current = tab
		reveal(row, tab)
	})
}

/**
 * Renders the tabs of a page as a navigation region of links that scrolls to the current tab and fades a cut edge.
 * @param props - The navigation name and the tabs.
 * @returns The tab navigation element.
 */
export function PageTabs({ label, children }: PageTabsProps) {
	const ref = useRef<HTMLElement>(null)
	useRevealCurrent(ref)
	const className = useRowClass(ref)
	return (
		<nav ref={ref} className={className} aria-label={label}>
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
