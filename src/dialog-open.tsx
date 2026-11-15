// SPDX-License-Identifier: Apache-2.0

import { __ } from '@wordpress/i18n'
import { createContext, useCallback, useContext, useLayoutEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, ReactNode } from 'react'

/** The class every dialog's popup carries, so a long word breaks inside the card. */
export const POPUP_CLASS = 'godmin-dialog-popup'

/** The longest delay in milliseconds a browser timer holds, past which it fires at the wrong time. */
const LONGEST_TIMER = 2 ** 31 - 1

/** The name of the abort reason of a write past its time limit, the one `AbortSignal.timeout` gives. */
const TIMEOUT_ERROR = 'TimeoutError'

/** The time limit in milliseconds the nearest `AdminRoot` sets on a busy dialog's write, none outside any. */
export const WriteTimeoutContext = createContext<number | undefined>(undefined)

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
 * Returns the words a write past its time limit shows, WordPress's own, picked by whether the browser is online.
 * @returns The words, in the language the app loaded.
 */
function timeOutWords(): string {
	return navigator.onLine
		? __('Could not get a valid response from the server.')
		: __('Unable to connect. Please check your Internet connection.')
}

/**
 * Returns a write time limit a browser timer holds, or Infinity for none, and throws on any other value.
 * @param limit - The time limit in milliseconds the app set.
 * @returns The same time limit.
 */
export function checkedWriteTimeout(limit: number): number {
	const holds = Number.isFinite(limit) ? limit > 0 && limit <= LONGEST_TIMER : limit === Number.POSITIVE_INFINITY
	if (!holds) {
		const range = `above 0 and up to ${LONGEST_TIMER}, or Infinity for no limit`
		throw new RangeError(`godmin: writeTimeout takes milliseconds ${range}, not ${String(limit)}.`)
	}
	return limit
}

/**
 * Returns what a dialog reads once its write ran past the time limit.
 * @param signal - The signal aborted at the limit.
 * @returns The time-out words picked at the limit.
 */
function timedOut(signal: AbortSignal): DialogAnswer {
	return { error: (signal.reason as DOMException).message }
}

/**
 * Reads a rejection of a write: the time-out once the dialog fired the signal, else handed on to the app.
 * @param error - What the write rejected with.
 * @param signal - The signal the write was handed.
 * @returns The time-out words, or a plain stay.
 */
function rejectionOf(error: unknown, signal: AbortSignal): DialogAnswer {
	return signal.aborted ? timedOut(signal) : passRejectionOn(error)
}

/**
 * Aborts a write past its time limit, then gives it until the next task to answer before the time-out shows.
 * @param controller - What aborts the signal the write was handed.
 * @param show - What gives the dialog its answer.
 * @returns The timer of the next task.
 */
function runOut(controller: AbortController, show: (answer: DialogAnswer) => void): ReturnType<typeof setTimeout> {
	controller.abort(new DOMException(timeOutWords(), TIMEOUT_ERROR))
	return setTimeout(() => show(timedOut(controller.signal)), 0)
}

/**
 * Waits for a write still running, aborting it at the time limit and showing the time-out once it ran past.
 * @param running - The write.
 * @param controller - What aborts the signal the write was handed.
 * @param limit - The time limit in milliseconds, Infinity or none for no limit.
 * @returns What the dialog reads, the first answer only.
 */
function timed(
	running: PromiseLike<unknown>,
	controller: AbortController,
	limit: number | undefined,
): Promise<DialogAnswer | undefined> {
	return new Promise((resolve) => {
		let timer: ReturnType<typeof setTimeout> | undefined
		const show = (answer: DialogAnswer | undefined) => {
			clearTimeout(timer)
			resolve(answer)
		}
		if (Number.isFinite(limit)) {
			timer = setTimeout(() => {
				timer = runOut(controller, show)
			}, limit)
		}
		void Promise.resolve(running).then(
			(value) => show(answerOf(value)),
			(error: unknown) => show(rejectionOf(error, controller.signal)),
		)
	})
}

/**
 * Carries a dialog's action out and reads what it answers, handing what it throws or rejects with on to the app.
 * @param action - The action, handed the signal that fires once its write ran past the time limit.
 * @param limit - The time limit in milliseconds a write still running gets, Infinity or none for no limit.
 * @returns What the dialog reads, at once unless the action returned a write still running.
 */
export function answered(
	action: (signal: AbortSignal) => unknown,
	limit: number | undefined,
): DialogAnswer | undefined | Promise<DialogAnswer | undefined> {
	const controller = new AbortController()
	try {
		const running = action(controller.signal)
		return isThenable(running) ? timed(running, controller, limit) : answerOf(running)
	} catch (error) {
		return passRejectionOn(error)
	}
}

/** Where a dialog's answers wait while React hides it. */
interface AnswerGate {
	/** Whether the dialog shows on the page. */
	shown: boolean
	/** The answers that came while it was hidden, each as the step that gives it. */
	held: (() => void)[]
}

/**
 * Gives a dialog what its action answered while it shows, and holds it while it is hidden.
 * @param answer - What the action answered.
 * @param gate - Where answers wait while the dialog is hidden.
 * @returns The answer, given at once or once the dialog shows again, never once it left the page.
 */
function gated(answer: ReturnType<typeof answered>, gate: AnswerGate): ReturnType<typeof answered> {
	if (!(answer instanceof Promise)) {
		return answer
	}
	return new Promise((resolve) => {
		void answer.then((value) => {
			const give = () => resolve(value)
			if (gate.shown) {
				give()
			} else {
				gate.held.push(give)
			}
		})
	})
}

/**
 * Returns what carries a dialog's action out under the nearest time limit, its answer held while the dialog is hidden.
 * @returns What runs an action and reads what it answers, as `answered` does.
 */
export function useAnswering(): (action: (signal: AbortSignal) => unknown) => ReturnType<typeof answered> {
	const limit = useContext(WriteTimeoutContext)
	const gate = useRef<AnswerGate>({ shown: false, held: [] })
	useLayoutEffect(() => {
		const shown = gate.current
		shown.shown = true
		const held = shown.held
		shown.held = []
		held.forEach((give) => give())
		return () => {
			shown.shown = false
		}
	}, [])
	return (action) => gated(answered(action, limit), gate.current)
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
