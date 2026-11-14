// SPDX-License-Identifier: Apache-2.0

import { speak } from '@wordpress/a11y'
import { useCallback, useEffect, useInsertionEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** The custom validity a WPDS field takes while a server's message stands under it. */
export interface RejectedValidity {
	/** Always invalid, so the message shows and holds the form back. */
	type: 'invalid'
	/** The words the field shows under it. */
	message: string
}

/** What a field takes from the hook, and the way to put a server's message under it. */
export interface RejectedField {
	/** The custom validity the field takes, none while no message stands. */
	validity: RejectedValidity | undefined
	/** Puts the message under the field and answers true, or answers false so the caller says it another way. */
	reject: (message: string, sent: string) => boolean
}

/** A form control that holds a validity message of its own. */
type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** A server's message standing under a field, and the value it is about. */
interface Standing {
	/** The custom validity the field takes. */
	validity: RejectedValidity
	/** The value the message is about. */
	value: string
}

/** The server messages each form shows in the current commit, so only one is spoken. */
const toSpeak = new WeakMap<HTMLFormElement, string[]>()

/**
 * Tells whether an element is a form control with a validity message.
 * @param element - The element to check.
 * @returns True for an input, a textarea or a select.
 */
function isField(element: Element | null): element is FieldElement {
	return (
		element instanceof HTMLInputElement ||
		element instanceof HTMLTextAreaElement ||
		element instanceof HTMLSelectElement
	)
}

/**
 * Returns the message of the field of a form that holds the focus.
 * @param form - The form the field sits in.
 * @returns The message, empty when the focus is on no field of the form.
 */
function focusedMessage(form: HTMLFormElement): string {
	const focused = document.activeElement
	return isField(focused) && form.contains(focused) ? focused.validationMessage : ''
}

/**
 * Speaks one server message for a form once every report of the commit ran, the focused field's when it is one.
 * @param form - The form that was reported.
 * @param message - The server's message about one of its fields.
 */
function speakOnce(form: HTMLFormElement, message: string): void {
	const queued = toSpeak.get(form)
	if (queued !== undefined) {
		queued.push(message)
		return
	}
	const messages = [message]
	toSpeak.set(form, messages)
	queueMicrotask(() => {
		toSpeak.delete(form)
		const focused = focusedMessage(form)
		speak(messages.includes(focused) ? focused : message, 'assertive')
	})
}

/**
 * Returns the field of a form that holds a server's message, the one holding the value it is about when several do.
 * @param form - The form the rejected field sits in.
 * @param standing - The server's message and the value it is about.
 * @returns The field, or undefined when none holds the message or several do and none holds the value.
 */
function holderOf(form: HTMLFormElement, standing: Standing): FieldElement | undefined {
	const holding = Array.from(form.elements).filter(
		(element): element is FieldElement =>
			isField(element) && element.validity.customError && element.validationMessage === standing.validity.message,
	)
	return holding.find((field) => field.value === standing.value) ?? (holding.length === 1 ? holding[0] : undefined)
}

/**
 * Shows the message of every field of a form that fails, speaks a server's message and finds the field holding it.
 * @param form - The form the rejected field sits in.
 * @param standing - The server's message and the value it is about.
 * @returns The field holding the message as its custom validity, or undefined when none is found.
 */
function report(form: HTMLFormElement, standing: Standing): FieldElement | undefined {
	form.reportValidity()
	speakOnce(form, standing.validity.message)
	return holderOf(form, standing)
}

/**
 * Holds a server's message about one field under it, until what the message is about changes.
 * @param form - The form the field sits in.
 * @param held - What the message is about now, the value of the field in most forms.
 * @returns The custom validity the field takes and the way to reject what was sent.
 */
export function useRejectedField(form: RefObject<HTMLFormElement | null>, held: string): RejectedField {
	const [standing, setStanding] = useState<Standing>()
	if (standing !== undefined && standing.value !== held) {
		setStanding(undefined)
	}
	const holding = useRef<string | undefined>(held)
	const shownOn = useRef<FieldElement | undefined>(undefined)
	useInsertionEffect(() => {
		holding.current = held
		if (standing === undefined && shownOn.current !== undefined) {
			shownOn.current.setCustomValidity('')
			shownOn.current = undefined
		}
		return () => {
			holding.current = undefined
		}
	})
	useEffect(() => {
		const target = form.current
		if (standing === undefined || target === null) {
			return
		}
		shownOn.current = report(target, standing)
	}, [form, standing])
	const reject = useCallback(
		(message: string, sent: string) => {
			if (message === '' || form.current === null || holding.current !== sent) {
				return false
			}
			setStanding({ validity: { type: 'invalid', message }, value: sent })
			return true
		},
		[form],
	)
	return { validity: standing?.validity, reject }
}
