/* oxlint-disable react/only-export-components -- the page kit ships its parts
   beside the type they share. */
import { Button, Notice, Stack, Text } from '@wordpress/ui'
import { createContext, useCallback, useContext, useRef } from 'react'
import type { ComponentProps, HTMLAttributes, ReactNode, Ref } from 'react'

import { useWideList } from './wide-list.js'

type TextVariant = ComponentProps<typeof Text>['variant']

/** The level of a page title, 1 as in WordPress's admin-ui Page, 2 on a screen beside the sidebar. */
type PageLevel = 1 | 2

/** The heading element a level renders as. */
type HeadingTag = 'h1' | 'h2' | 'h3' | 'h4'

/** The level of the title of the Page around a section title, 1 outside any Page. */
const PageLevelContext = createContext<PageLevel>(1)

/**
 * Returns the heading element of a level.
 * @param level - The heading level, 1 to 4.
 * @returns The element name.
 */
function headingTag(level: number): HeadingTag {
	return `h${level}` as HeadingTag
}

/**
 * Returns the heading element one level under the title of the Page around it, an h2 outside any Page.
 * @returns The element name.
 */
export function useHeadingUnderPage(): HeadingTag {
	return headingTag(useContext(PageLevelContext) + 1)
}

/**
 * Renders a screen's title as the page heading.
 * @param props - The title text, the type scale to render it at and its heading level, 1 when absent.
 * @returns The page title element.
 */
export function PageTitle({
	children,
	variant = 'heading-lg',
	level = 1,
}: {
	children: ReactNode
	variant?: TextVariant
	level?: PageLevel
}) {
	const Heading = headingTag(level)
	return (
		<Text variant={variant} render={<Heading />}>
			{children}
		</Text>
	)
}

/**
 * Renders a section heading one size step above the field labels, one level deeper inside a level 2 Page.
 * @param props - The heading text, its rank under a level 1 page title, and the id and tab index a screen moves
 * focus with.
 * @returns The section heading element.
 */
export function SectionTitle({
	children,
	level = 2,
	id,
	tabIndex,
}: {
	children: ReactNode
	level?: 2 | 3
	id?: string
	tabIndex?: number
}) {
	const pageLevel = useContext(PageLevelContext)
	const Heading = headingTag(level + pageLevel - 1)
	return (
		<Text variant={level === 2 ? 'heading-lg' : 'heading-md'} render={<Heading />} id={id} tabIndex={tabIndex}>
			{children}
		</Text>
	)
}

export interface PageProps {
	title: string
	subtitle?: string
	actions?: ReactNode
	tabs?: ReactNode
	aside?: ReactNode
	list?: boolean
	/** The name of the list region. */
	listLabel?: string
	/** The ref to the list region. */
	listRef?: Ref<HTMLDivElement>
	className?: string
	/** The level of the page title, 1 as in WordPress's admin-ui Page. A screen beside the sidebar passes 2. */
	headingLevel?: PageLevel
	children: ReactNode
}

/**
 * Returns the props that let code focus a list with a name or a ref, and name a list region given a label.
 * @param label - The name of the list region.
 * @param reached - Whether code holds a ref to the list.
 * @returns A tab index that keeps the list out of the tab order, and the role and the name of a named one.
 */
function regionOf(label: string | undefined, reached: boolean): HTMLAttributes<HTMLDivElement> {
	const focus = label === undefined && !reached ? {} : { tabIndex: -1 }
	return label === undefined ? focus : { ...focus, role: 'region', 'aria-label': label }
}

/**
 * Hands an element to a ref object or a ref function, and to nothing when no ref is given.
 * @param ref - The ref the element goes to.
 * @param element - The element, none once it leaves.
 */
function handTo(ref: Ref<HTMLDivElement> | undefined, element: HTMLDivElement | null): void {
	if (typeof ref === 'function') {
		ref(element)
	} else if (ref) {
		ref.current = element
	}
}

/**
 * Renders the list region of a page, marked wide while its DataViews table is wider than its space.
 * @param props - The name of the region, the ref code holds to it, and the list.
 * @returns The list region element.
 */
function ListRegion({
	label,
	listRef,
	children,
}: {
	label?: string
	listRef?: Ref<HTMLDivElement>
	children: ReactNode
}) {
	const own = useRef<HTMLDivElement>(null)
	const wide = useWideList(own)
	const handOn = useCallback(
		(element: HTMLDivElement | null) => {
			own.current = element
			handTo(listRef, element)
		},
		[listRef],
	)
	return (
		<div
			className={wide ? 'godmin-page__list godmin-page__list--wide' : 'godmin-page__list'}
			ref={handOn}
			{...regionOf(label, listRef !== undefined)}
		>
			{children}
		</div>
	)
}

/**
 * Renders a screen: a header with the title, actions and subtitle, then optional tabs and the content.
 * @param props - The title, subtitle, actions, tabs, aside, list flag, list name and ref, extra class, title level
 * and content.
 * @returns The page element.
 */
export function Page({
	title,
	subtitle,
	actions,
	tabs,
	aside,
	list = false,
	listLabel,
	listRef,
	className,
	headingLevel = 1,
	children,
}: PageProps) {
	const classes = className === undefined ? 'godmin-page' : `godmin-page ${className}`
	return (
		<PageLevelContext.Provider value={headingLevel}>
			<Stack direction="column" gap="lg" className={classes}>
				<Stack direction="column" render={<header />} className="godmin-page__header">
					<Stack
						direction="row"
						wrap="wrap"
						gap="md"
						align="center"
						justify="space-between"
						className="godmin-page__head"
					>
						<PageTitle level={headingLevel}>{title}</PageTitle>
						{actions !== undefined && (
							<Stack direction="row" gap="sm" align="center">
								{actions}
							</Stack>
						)}
					</Stack>
					{subtitle !== undefined && (
						<Text variant="body-md" render={<p />} className="godmin-page__subtitle">
							{subtitle}
						</Text>
					)}
				</Stack>
				{tabs !== undefined && <div className="godmin-page__tabs">{tabs}</div>}
				<PageBody aside={aside}>
					{list ? (
						<ListRegion label={listLabel} listRef={listRef}>
							{children}
						</ListRegion>
					) : (
						children
					)}
				</PageBody>
			</Stack>
		</PageLevelContext.Provider>
	)
}

/**
 * Renders a page's content, beside its aside when it has one.
 * @param props - The content and the optional aside.
 * @returns The content alone, or a main column followed by the aside.
 */
function PageBody({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
	if (aside === undefined) {
		return children
	}
	return (
		<div className="godmin-page__split">
			<Stack direction="column" gap="lg" className="godmin-page__main">
				{children}
			</Stack>
			<Stack direction="column" gap="lg" className="godmin-page__aside">
				{aside}
			</Stack>
		</div>
	)
}

/**
 * Renders a failure message that a screen reader announces.
 * @param props - The message to announce.
 * @returns The error notice element.
 */
export function ErrorNotice({ children }: { children: ReactNode }) {
	return (
		<Notice.Root intent="error" role="alert">
			<Notice.Description>{children}</Notice.Description>
		</Notice.Root>
	)
}

export interface LoadMoreQuery {
	hasNextPage: boolean
	isFetchingNextPage: boolean
	fetchNextPage: () => Promise<unknown>
}

/**
 * Renders the cursor pagination button for an infinite query, or nothing once
 * every page is loaded.
 * @param props - The query to page through and the button label.
 * @returns The load more button, or null.
 */
export function LoadMore({ query, children }: { query: LoadMoreQuery; children: ReactNode }) {
	if (!query.hasNextPage) {
		return null
	}
	return (
		<Button
			variant="minimal"
			tone="neutral"
			size="compact"
			onClick={() => void query.fetchNextPage()}
			disabled={query.isFetchingNextPage}
		>
			{children}
		</Button>
	)
}
