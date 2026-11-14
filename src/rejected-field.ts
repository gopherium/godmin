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

/** A form control that holds a validity message of its own. */
type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement

/** What a field takes from the hook, and the way to put a server's message under it. */
export interface RejectedField {
	/** The ref the field takes, so the hook knows the field it rejects. */
	ref: (field: FieldElement | null) => void
	/** The custom validity the field takes, none while no message stands. */
	validity: RejectedValidity | undefined
	/** Puts the message under the field and answers true, or answers false so the caller says it another way. */
	reject: (message: string, sent: string) => boolean
}

/** A server's message standing under a field, and the value it is about. */
interface Standing {
	/** The custom validity the field takes. */
	validity: RejectedValidity
	/** The value the message is about. */
	value: string
}

/** A server's message waiting to be spoken, and the field it stands under. */
interface Spoken {
	/** The field the message stands under. */
	field: FieldElement
	/** The words of the message. */
	message: string
}

/** The server messages each form shows in the current commit, so only one is spoken. */
const toSpeak = new WeakMap<HTMLFormElement, Spoken[]>()

/**
 * Returns the form a field sits in.
 * @param field - The field, null when it is not on the page.
 * @returns The form, null when the field is not on the page or sits in no form.
 */
function formOf(field: FieldElement | null): HTMLFormElement | null {
	return field?.form ?? null
}

/**
 * Tells whether a server's message can stand under a field.
 * @param field - The field, null when it is not on the page.
 * @param message - The server's message.
 * @returns True when there are words and the field sits in a form.
 */
function canStand(field: FieldElement | null, message: string): boolean {
	return message !== '' && formOf(field) !== null
}

/**
 * Speaks one server message for a form once every report of the commit ran, the focused field's when it is one.
 * @param form - The form that was reported.
 * @param spoken - The server's message and the field it stands under.
 */
function speakOnce(form: HTMLFormElement, spoken: Spoken): void {
	const queued = toSpeak.get(form)
	if (queued !== undefined) {
		queued.push(spoken)
		return
	}
	const all = [spoken]
	toSpeak.set(form, all)
	queueMicrotask(() => {
		toSpeak.delete(form)
		const focused = all.find((entry) => entry.field === document.activeElement) ?? spoken
		speak(focused.message, 'assertive')
	})
}

/**
 * Shows the message of every field of a form that fails and speaks a server's message about one of them.
 * @param field - The field the server's message stands under, null once it left the page.
 * @param validity - The custom validity holding the server's message.
 * @returns The field when its form was reported, undefined when it is not on the page in a form.
 */
function report(field: FieldElement | null, validity: RejectedValidity): FieldElement | undefined {
	const form = formOf(field)
	if (field === null || form === null) {
		return undefined
	}
	form.reportValidity()
	speakOnce(form, { field, message: validity.message })
	return field
}

/**
 * Holds a server's message about a value, forgetting it once the value changes.
 * @param held - What the message is about now.
 * @returns The message standing and the way to put one.
 */
function useStanding(held: string): [Standing | undefined, (standing: Standing) => void] {
	const [standing, setStanding] = useState<Standing>()
	if (standing !== undefined && standing.value !== held) {
		setStanding(undefined)
	}
	return [standing, setStanding]
}

/**
 * Keeps what a field held in the last commit.
 * @param held - What the field holds now.
 * @returns The ref holding it.
 */
function useHolding(held: string): RefObject<string> {
	const holding = useRef(held)
	useInsertionEffect(() => {
		holding.current = held
	})
	return holding
}

/**
 * Reports a server's message once it stands under a field, and takes it off the field once it goes.
 * @param field - The field the message stands under.
 * @param standing - The message standing, none once it went.
 */
function useReport(field: RefObject<FieldElement | null>, standing: Standing | undefined): void {
	const shownOn = useRef<FieldElement | undefined>(undefined)
	useInsertionEffect(() => {
		if (standing === undefined && shownOn.current !== undefined) {
			shownOn.current.setCustomValidity('')
			shownOn.current = undefined
		}
	})
	useEffect(() => {
		if (standing !== undefined) {
			shownOn.current = report(field.current, standing.validity)
		}
	}, [field, standing])
}

/**
 * Holds a server's message about one field under it, until what the message is about changes.
 * @param held - What the message is about now, the value of the field in most forms.
 * @returns The ref and the custom validity the field takes, and the way to reject what was sent.
 */
export function useRejectedField(held: string): RejectedField {
	const [standing, setStanding] = useStanding(held)
	const holding = useHolding(held)
	const field = useRef<FieldElement | null>(null)
	useReport(field, standing)
	const ref = useCallback((element: FieldElement | null) => {
		field.current = element
	}, [])
	const reject = useCallback(
		(message: string, sent: string) => {
			if (holding.current !== sent || !canStand(field.current, message)) {
				return false
			}
			setStanding({ validity: { type: 'invalid', message }, value: sent })
			return true
		},
		[holding, setStanding],
	)
	return { ref, validity: standing?.validity, reject }
}
