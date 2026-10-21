// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Button, InputControl } from '@wordpress/ui'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { FormBody } from '../src/index'
import type { FormBodyProps } from '../src/index'
import { buttonClasses, installTestEnvironment, renderAdmin } from '../src/testing.js'
import { gapInPixels } from './styles.js'

installTestEnvironment()

/** What a test passes to the form beside its handlers. */
type Shape = Partial<Pick<FormBodyProps, 'canSubmit' | 'busy' | 'kind'>>

/**
 * Renders the fields of a page copy, its title first, as a row Duplicate asks for them.
 * @returns The two fields.
 */
function CopyFields() {
	const [title, setTitle] = useState('Hello (Copy)')
	const [author, setAuthor] = useState('Maria Perez')
	return (
		<>
			<InputControl label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
			<InputControl label="Author" value={author} onChange={(event) => setAuthor(event.target.value)} />
		</>
	)
}

/**
 * Renders a form body asking for a page copy, with spies for its handlers.
 * @param shape - The send gate, the busy flag and the kind.
 * @returns The submit and cancel spies, and a rerender taking a new shape.
 */
function renderForm(shape: Shape = {}) {
	const onSubmit = vi.fn()
	const onCancel = vi.fn()
	const body = (next: Shape) => (
		<FormBody submitLabel="Duplicate" cancelLabel="Cancel" onSubmit={onSubmit} onCancel={onCancel} {...next}>
			<CopyFields />
		</FormBody>
	)
	const { rerender } = renderAdmin(body(shape))
	return { onSubmit, onCancel, rerender: (next: Shape) => rerender(body(next)) }
}

/**
 * Returns the first field of the form.
 * @returns The input labelled Title.
 */
function field(): HTMLInputElement {
	return screen.getByLabelText('Title') as HTMLInputElement
}

/**
 * Returns the button that sends the form.
 * @returns The submit button.
 */
function submit(): HTMLElement {
	return screen.getByRole('button', { name: 'Duplicate' })
}

/**
 * Returns the button that closes the modal.
 * @returns The Cancel button.
 */
function cancel(): HTMLElement {
	return screen.getByRole('button', { name: 'Cancel' })
}

/**
 * Returns the classes a solid design system button draws while it loads.
 * @returns The class names, in order.
 */
function loadingClasses(): string[] {
	const { container, unmount } = render(<Button loading>probe</Button>)
	const classes = [...(container.firstElementChild as Element).classList]
	unmount()
	return classes
}

/**
 * Watches every form submit that reaches the window until the test ends.
 * @returns One flag per submit, true when the submit was kept from leaving the page.
 */
function watchSubmits(): boolean[] {
	const kept: boolean[] = []
	const listener = (event: Event) => kept.push(event.defaultPrevented)
	window.addEventListener('submit', listener)
	onTestFinished(() => window.removeEventListener('submit', listener))
	return kept
}

test('draws the fields it is given, then Cancel, then the submit button', () => {
	renderForm()
	const form = field().form as HTMLFormElement

	expect([...form.elements]).toEqual([field(), screen.getByLabelText('Author'), cancel(), submit()])
})

test('sends the form when the submit button is pressed', () => {
	const { onSubmit, onCancel } = renderForm()

	fireEvent.click(submit())

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(onCancel).not.toHaveBeenCalled()
})

test('sends the form once when Enter is pressed in a field, and stays on the page', async () => {
	const { onSubmit } = renderForm()
	const kept = watchSubmits()

	await userEvent.setup().type(field(), ' again{Enter}')

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(field().value).toBe('Hello (Copy) again')
	expect(kept, 'the browser would send the form and leave the page').toEqual([true])
})

test('sends nothing while it may not be sent, and keeps the submit button focusable', async () => {
	const { onSubmit } = renderForm({ canSubmit: false })
	const user = userEvent.setup()

	fireEvent.click(submit())
	await user.type(field(), '{Enter}')
	await user.tab()
	await user.tab()
	await user.tab()

	expect(onSubmit).not.toHaveBeenCalled()
	expect(submit().getAttribute('aria-disabled')).toBe('true')
	expect(document.activeElement).toBe(submit())
})

test('sends the form once it may be sent again', () => {
	const { onSubmit, rerender } = renderForm({ canSubmit: false })

	rerender({ canSubmit: true })
	fireEvent.click(submit())

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(submit().getAttribute('aria-disabled')).not.toBe('true')
})

test('sends nothing while the write runs, and shows the submit button busy', async () => {
	const { onSubmit } = renderForm({ busy: true })

	fireEvent.click(submit())
	await userEvent.setup().type(field(), '{Enter}')

	expect(onSubmit).not.toHaveBeenCalled()
	expect(submit().getAttribute('aria-disabled')).toBe('true')
	expect([...submit().classList]).toEqual(loadingClasses())
})

test('keeps Cancel live while the write runs, as WordPress forms do', () => {
	const { onCancel } = renderForm({ busy: true })

	fireEvent.click(cancel())

	expect(cancel().getAttribute('aria-disabled')).not.toBe('true')
	expect(onCancel).toHaveBeenCalledOnce()
})

test('cancels when Cancel is pressed', () => {
	const { onSubmit, onCancel } = renderForm()

	fireEvent.click(cancel())

	expect(onCancel).toHaveBeenCalledOnce()
	expect(onSubmit).not.toHaveBeenCalled()
})

test('draws Cancel as accent text like the WordPress Site Editor dialogs, and the submit as the solid one', () => {
	renderForm()

	expect([...cancel().classList]).toEqual(buttonClasses('minimal'))
	expect([...submit().classList]).toEqual(buttonClasses('solid'))
})

test('makes the submit button the one Enter presses, and never Cancel', () => {
	renderForm()

	expect(submit().getAttribute('type')).toBe('submit')
	expect(cancel().getAttribute('type')).toBe('button')
})

test.each([
	['an edit, as WordPress spaces Rename and Order', 'edit', 20],
	['a copy, as WordPress spaces Duplicate', 'copy', 12],
	['a create, as WordPress spaces Add Page and Add Pattern', 'create', 16],
] as const)('leaves the space above the buttons of %s', (_case, kind, pixels) => {
	renderForm({ kind })

	expect(gapInPixels(field().form as HTMLFormElement)).toBe(pixels)
})

test('spaces a form that names no kind as an edit, 20px above the buttons', () => {
	renderForm()

	expect(gapInPixels(field().form as HTMLFormElement)).toBe(20)
})
