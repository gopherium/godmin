// SPDX-License-Identifier: Apache-2.0

import { Skeleton, VisuallyHidden } from '@wordpress/ui'

const STROKES = 3

/**
 * Renders a content-shaped ghost while a screen's data loads.
 * @param props - The label a screen reader announces.
 * @returns The loading screen element.
 */
export function LoadingScreen({ label }: { label: string }) {
	return (
		<div className="godmin-loading-screen">
			<VisuallyHidden role="status">{label}</VisuallyHidden>
			<div className="godmin-loading-screen__ghost" aria-hidden="true">
				<Skeleton className="godmin-loading-screen__title" />
				{Array.from({ length: STROKES }, (_, stroke) => (
					<Skeleton key={stroke} className="godmin-loading-screen__stroke" />
				))}
			</div>
		</div>
	)
}
