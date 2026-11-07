// SPDX-License-Identifier: Apache-2.0

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

/** The class every dialog's popup carries, so a long word breaks inside the card. */
export const POPUP_CLASS = 'godmin-dialog-popup'

/** What a write may answer a dialog: words to show, or a plain stay. Any other answer closes it. */
export type DialogAnswer = { error: string } | { close: false }

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

/**
 * Notes the control that held the focus as a dialog was asked, for the place the focus goes once the popup left.
 * @returns What answers `finalFocus`: that control while the focus sits on the page, otherwise false to leave it.
 */
export function useFinalFocus(): () => HTMLElement | false {
	const [opener] = useState(() => document.activeElement as HTMLElement)
	return () => (document.activeElement === document.body && opener !== document.body ? opener : false)
}

/**
 * Reads what a write answered a dialog, whatever its shape.
 * @param answer - What the write answered.
 * @returns The words to show or a plain stay, none for a dialog that closes.
 */
export function answerOf(answer: unknown): DialogAnswer | undefined {
	const { error, close } = (answer ?? {}) as { error?: unknown; close?: unknown }
	if (typeof error === 'string' && error !== '') {
		return { error }
	}
	return close === false ? { close } : undefined
}

/**
 * Reports whether a value is a write still running, a promise or any object with a `then` method.
 * @param value - What the write's handler returned.
 * @returns Whether the value is one to wait for.
 */
export function isThenable(value: unknown): value is PromiseLike<unknown> {
	return typeof (value as PromiseLike<unknown> | null | undefined)?.then === 'function'
}

/**
 * Keeps a dialog open after a rejection and hands the rejection on to the app as one nobody caught.
 * @param error - What the write rejected with.
 * @returns A plain stay.
 */
export function passRejectionOn(error: unknown): DialogAnswer {
	void Promise.reject(error)
	return { close: false }
}

/**
 * Carries a dialog's action out and reads what it answers, handing what it throws or rejects with on to the app.
 * @param action - The action.
 * @returns What the dialog reads, at once unless the action returned a write still running.
 */
export function answered(action: () => unknown): DialogAnswer | undefined | Promise<DialogAnswer | undefined> {
	try {
		const running = action()
		return isThenable(running) ? Promise.resolve(running).then(answerOf, passRejectionOn) : answerOf(running)
	} catch (error) {
		return passRejectionOn(error)
	}
}

/**
 * Refuses the second click of a double click, while Enter and Space still press.
 * @param event - The click on its way into the popup.
 */
export function refuseSecondClick(event: MouseEvent): void {
	if (event.detail > 1) {
		event.preventDefault()
		event.stopPropagation()
	}
}

/**
 * Refuses an Enter a held key repeats, so holding it sends once.
 * @param event - The key press on its way into the popup.
 */
export function refuseRepeatedEnter(event: KeyboardEvent): void {
	if (event.repeat && event.key === 'Enter') {
		event.preventDefault()
	}
}
