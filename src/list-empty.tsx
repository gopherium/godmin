// SPDX-License-Identifier: Apache-2.0

import { __ } from '@wordpress/i18n'
import { search } from '@wordpress/icons'
import { EmptyState } from '@wordpress/ui'
import type { ComponentProps, ReactNode } from 'react'

import { useHeadingUnderPage } from './page.js'

export interface ListEmptyProps {
	/** The icon drawn above the title, from `@wordpress/icons`. */
	icon: ComponentProps<typeof EmptyState.Icon>['icon']
	/** The words saying the list is empty, one short phrase. */
	title: string
	/** The sentence under the title, such as what fills the list. */
	description?: string
	/** The buttons under the description, such as the add button of the list at its default size. */
	actions?: ReactNode
}

/**
 * Renders what a list with no rows shows: an icon, a title one level under the page title, a description and buttons.
 * @param props - The icon, the title, the description and the buttons.
 * @returns The empty state element.
 */
export function ListEmpty({ icon, title, description, actions }: ListEmptyProps) {
	const Heading = useHeadingUnderPage()
	const buttons = actions ?? false
	return (
		<EmptyState.Root className="godmin-empty">
			<EmptyState.Icon icon={icon} />
			<EmptyState.Title render={<Heading />}>{title}</EmptyState.Title>
			{description === undefined ? null : <EmptyState.Description>{description}</EmptyState.Description>}
			{buttons === false ? null : <EmptyState.Actions>{buttons}</EmptyState.Actions>}
		</EmptyState.Root>
	)
}

/**
 * Renders what a list shows when a search or a filter finds no rows, as Jetpack Forms says it.
 * @returns The empty state element with the search icon and no buttons.
 */
export function ListNoResults() {
	return (
		<ListEmpty
			icon={search}
			title={__('No results found')}
			description={__("Try adjusting your search or filters to find what you're looking for.")}
		/>
	)
}
