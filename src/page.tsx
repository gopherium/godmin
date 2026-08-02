/* oxlint-disable react/only-export-components -- the page kit ships its parts
   beside the type they share. */
import { Button, Notice, Stack, Text } from '@wordpress/ui'
import type { ComponentProps, ReactNode } from 'react'

type TextVariant = ComponentProps<typeof Text>['variant']

/**
 * Renders a screen's title as the page heading.
 * @param props - The title text and the type scale to render it at.
 * @returns The page title element.
 */
export function PageTitle({
	children,
	variant = 'heading-xl',
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

export interface PageProps {
	title: string
	subtitle?: string
	actions?: ReactNode
	className?: string
	children: ReactNode
}

/**
 * Renders a screen: its title top left, an optional subtitle under it,
 * optional actions top right, and the content below.
 * @param props - The title, subtitle, actions, extra class and content.
 * @returns The page element.
 */
export function Page({ title, subtitle, actions, className, children }: PageProps) {
	const classes = className === undefined ? 'godmin-page' : `godmin-page ${className}`
	return (
		<Stack direction="column" gap="lg" className={classes}>
			<Stack direction="row" gap="md" align="center" justify="space-between">
				<Stack direction="column" gap="xs">
					<PageTitle>{title}</PageTitle>
					{subtitle !== undefined && (
						<Text variant="body-sm" className="godmin-page__subtitle">
							{subtitle}
						</Text>
					)}
				</Stack>
				{actions !== undefined && (
					<Stack direction="row" gap="sm" align="center">
						{actions}
					</Stack>
				)}
			</Stack>
			{children}
		</Stack>
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
