// SPDX-License-Identifier: Apache-2.0

import { Badge, VisuallyHidden } from '@wordpress/ui'

export interface MenuCountProps {
	/** The number the count shows, nothing drawn at zero or below. */
	count: number
	/** The sentence a screen reader reads in place of the number, such as "1 update available". */
	label: string
}

/**
 * Renders the small count beside a menu label, such as the number of pending updates.
 * @param props - The number and the sentence a screen reader reads for it.
 * @returns The count element, or null when there is nothing to count.
 */
export function MenuCount({ count, label }: MenuCountProps) {
	if (!(count > 0)) {
		return null
	}
	return (
		<span className="godmin-menu-count">
			<Badge intent="high" className="godmin-menu-count__badge" aria-hidden="true">
				{count.toLocaleString()}
			</Badge>
			<VisuallyHidden render={<span />}>{label}</VisuallyHidden>
		</span>
	)
}
