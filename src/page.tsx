/* oxlint-disable react/only-export-components -- the page kit ships its parts
   beside the type they share. */
import { Button, Notice, Stack, Text } from '@wordpress/ui'
import type { ComponentProps, HTMLAttributes, ReactNode, Ref } from 'react'

type TextVariant = ComponentProps<typeof Text>['variant']

/**
 * Renders a screen's title as the page heading.
 * @param props - The title text and the type scale to render it at.
 * @returns The page title element.
 */
export function PageTitle({
	children,
	variant = 'heading-lg',
}: {
	children: ReactNode
	variant?: TextVariant
}) {
	return (
		<Text variant={variant} render={<h1 />}>
			{children}
		</Text>
	)
}

/**
 * Renders a section heading one size step above the field labels.
 * @param props - The heading text, its level, and the id and tab index a screen moves focus with.
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
	const second = level === 2
	return (
		<Text
			variant={second ? 'heading-lg' : 'heading-md'}
			render={second ? <h2 /> : <h3 />}
			id={id}
			tabIndex={tabIndex}
		>
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
 * Renders a screen: a header with the title, actions and subtitle, then optional tabs and the content.
 * @param props - The title, subtitle, actions, tabs, aside, list flag, list name and ref, extra class and content.
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
	children,
}: PageProps) {
	const classes = className === undefined ? 'godmin-page' : `godmin-page ${className}`
	return (
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
					<PageTitle>{title}</PageTitle>
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
					<div className="godmin-page__list" ref={listRef} {...regionOf(listLabel, listRef !== undefined)}>
						{children}
					</div>
				) : (
					children
				)}
			</PageBody>
		</Stack>
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
