// SPDX-License-Identifier: Apache-2.0

import { Spinner, VisuallyHidden } from '@wordpress/ui'

/**
 * Renders the design system spinner in place of a screen's content while it loads.
 * @param props - The label a screen reader announces.
 * @returns The loading screen element.
 */
export function LoadingScreen({ label }: { label: string }) {
	return (
		<div className="godmin-loading-screen">
			<VisuallyHidden role="status">{label}</VisuallyHidden>
			<Spinner />
		</div>
	)
}
