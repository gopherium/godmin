// SPDX-License-Identifier: Apache-2.0

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/** What a dialog takes from the hook that holds it open. */
export interface DialogOpen {
	/** Whether the dialog is open, false on the first render so its entry plays. */
	open: boolean
	/** Takes the next open state, for the dialog's `onOpenChange`. */
	change: (next: boolean) => void
	/** A child of the popup that draws nothing and reports when the popup left the page. */
	exitWatch: ReactNode
}

/**
 * Renders nothing and reports when it leaves the page.
 * @param props - What it runs as it leaves.
 * @returns Nothing.
 */
function ExitWatch({ left }: { left: () => void }) {
	useLayoutEffect(() => left, [left])
	return null
}

/**
 * Holds a dialog open from its first commit and runs its close once the popup left the page.
 * @param onClose - What runs after a close, once the popup left the page.
 * @returns The open state, what changes it and the child that watches the popup leave.
 */
export function useDialogOpen(onClose: () => void): DialogOpen {
	const [open, setOpen] = useState(false)
	const closing = useRef(false)
	const latest = useRef(onClose)
	useLayoutEffect(() => {
		latest.current = onClose
	})
	useLayoutEffect(() => {
		setOpen(true)
	}, [])
	const left = useCallback(() => {
		if (closing.current) {
			latest.current()
		}
	}, [])
	const change = (next: boolean) => {
		closing.current = !next
		setOpen(next)
	}
	return { open, change, exitWatch: <ExitWatch left={left} /> }
}
