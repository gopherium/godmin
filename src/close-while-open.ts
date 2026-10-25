// SPDX-License-Identifier: Apache-2.0

import { useEffect, useRef } from 'react'

/**
 * Returns the close of a dialog body that acts only while that body is on screen, never on a dialog opened since.
 * @param close - Closes the dialog, none for a body drawn outside a dialog.
 * @returns The close, which does nothing once the body left the screen.
 */
export function useCloseWhileOpen(close: (() => void) | undefined): () => void {
	const open = useRef(true)
	useEffect(() => {
		open.current = true
		return () => {
			open.current = false
		}
	}, [])
	return () => {
		if (open.current) {
			close?.()
		}
	}
}
