// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { ValidatedInputControl } from '@wordpress/ui'
import { useRef, useState } from 'react'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { useRejectedField } from '../../src/index.js'

/** The address every send of these tests carries. */
const SENT = 'taken@example.com'

/**
 * Renders an email form whose send waits for its answer, then hands the server's words to the hook.
 * @param props - The server's words about every send.
 * @returns The form.
 */
function EmailBench({ words }: { words: string }) {
	const form = useRef<HTMLFormElement>(null)
	const [email, setEmail] = useState('')
	const rejected = useRejectedField(form, email)
	const send = async (sent: string) => {
		await Promise.resolve()
		rejected.reject(words, sent)
	}
	return (
		<form
			ref={form}
			onSubmit={(event) => {
				event.preventDefault()
				void send(email)
			}}
		>
			<ValidatedInputControl
				label="Email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				customValidity={rejected.validity}
			/>
			<button type="submit">Send</button>
		</form>
	)
}

/**
 * Returns the email field of the bench.
 * @returns The field.
 */
function emailField(): HTMLInputElement {
	return screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
}

/**
 * Returns the words that describe a field, read from every element its description names.
 * @param field - The field.
 * @returns The words, empty when nothing describes it.
 */
function descriptionOf(field: HTMLElement): string {
	return (field.getAttribute('aria-describedby') ?? '')
		.split(' ')
		.filter((id) => id !== '')
		.map((id) => document.getElementById(id)?.textContent ?? '')
		.join(' ')
}

/**
 * Renders the bench, types the address, presses Send and waits for the words to stand under the field.
 * @param words - The server's words about the send.
 */
async function rejectedOnSend(words: string): Promise<void> {
	render(<EmailBench words={words} />)
	await userEvent.click(emailField())
	await userEvent.keyboard(SENT)
	await userEvent.click(screen.getByRole('button', { name: 'Send' }))
	await expect.poll(() => descriptionOf(emailField())).toContain(words)
}

test('moves the focus to the rejected field and describes it by the words in a real browser', async () => {
	const words = 'A real browser sees this address taken.'

	await rejectedOnSend(words)

	expect(document.activeElement).toBe(emailField())
	expect(emailField().matches(':invalid')).toBe(true)
})

test('Enter, then a keyboard edit, clears the words, the invalid state and the invalid mark', async () => {
	await rejectedOnSend('A real browser keeps this address back.')
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => emailField().getAttribute('aria-invalid')).toBe('true')

	await userEvent.keyboard('{Control>}a{/Control}ok@example.com')

	await expect.poll(() => emailField().hasAttribute('aria-invalid')).toBe(false)
	expect(emailField().matches(':invalid')).toBe(false)
	expect(descriptionOf(emailField())).toBe('')
})

test('keeps every keystroke while the words stand and go', async () => {
	await rejectedOnSend('A real browser rejects this address once.')

	await userEvent.keyboard('{End}abc')

	await expect.poll(() => emailField().value).toBe(`${SENT}abc`)
	expect(descriptionOf(emailField())).toBe('')
})
