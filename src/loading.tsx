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

/**
 * Renders a stack of row-shaped ghosts while a list's data loads.
 * @param props - The label a screen reader announces and the row count.
 * @returns The loading rows element.
 */
export function LoadingRows({ label, rows = 5 }: { label: string, rows?: number }) {
	return (
		<div className="godmin-loading-rows">
			<VisuallyHidden role="status">{label}</VisuallyHidden>
			<div className="godmin-loading-rows__ghost" aria-hidden="true">
				{Array.from({ length: rows }, (_, row) => (
					<Skeleton key={row} className="godmin-loading-rows__row" />
				))}
			</div>
		</div>
	)
}
