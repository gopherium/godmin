// SPDX-License-Identifier: Apache-2.0

import { EmptyState } from '@wordpress/ui'
import type { ComponentProps } from 'react'

export interface ListEmptyProps {
	/** The icon drawn above the title, from `@wordpress/icons`. */
	icon: ComponentProps<typeof EmptyState.Icon>['icon']
	/** The sentence saying the list is empty. */
	title: string
	/** The line under the title, such as what to do to fill the list. */
	hint?: string
}

/**
 * Renders what a list shows when it has no rows: an icon, a title and an optional hint.
 * @param props - The icon, the title and the hint.
 * @returns The empty state element.
 */
export function ListEmpty({ icon, title, hint }: ListEmptyProps) {
	return (
		<EmptyState.Root className="godmin-empty">
			<EmptyState.Icon icon={icon} />
			<EmptyState.Title>{title}</EmptyState.Title>
			{hint === undefined ? null : <EmptyState.Description>{hint}</EmptyState.Description>}
		</EmptyState.Root>
	)
}
