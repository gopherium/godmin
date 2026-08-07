// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef, useState } from 'react'

const SHOW_AFTER = 200
const SHOW_FOR = 500

/**
 * Returns whether a loading ghost should stand in for the pending work.
 * @param pending - Whether the work the ghost stands in for is still pending.
 * @returns Whether to render the ghost.
 */
export function useLoadingGate(pending: boolean): boolean {
	const [showing, setShowing] = useState(false)
	const holdUntil = useRef(0)

	useEffect(() => {
		if (pending && !showing) {
			const delay = setTimeout(() => {
				holdUntil.current = Date.now() + SHOW_FOR
				setShowing(true)
			}, SHOW_AFTER)
			return () => clearTimeout(delay)
		}
		if (!pending && showing) {
			const left = holdUntil.current - Date.now()
			if (left <= 0) {
				setShowing(false)
				return
			}
			const hold = setTimeout(() => setShowing(false), left)
			return () => clearTimeout(hold)
		}
	}, [pending, showing])

	return showing
}
