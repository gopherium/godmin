// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { Button } from '@wordpress/ui'
import { expect, test, vi } from 'vitest'

import { RenameBody } from '../src/index'
import { buttonClasses, installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Renders a rename body for a post named Hello, with spies for its handlers.
 * @param props - The busy flag and the failure to show.
 * @returns The submit and cancel spies, and a rerender taking new busy and failure values.
 */
function renderRename(props: { busy?: boolean; failure?: string } = {}) {
	const onSubmit = vi.fn()
	const onCancel = vi.fn()
	const body = (next: { busy?: boolean; failure?: string }) => (
		<RenameBody
			name="Hello"
			fieldLabel="Name"
			submitLabel="Rename"
			cancelLabel="Cancel"
			onSubmit={onSubmit}
			onCancel={onCancel}
			{...next}
		/>
	)
	const { rerender } = renderAdmin(body(props))
	return { onSubmit, onCancel, rerender: (next: { busy?: boolean; failure?: string }) => rerender(body(next)) }
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
 * Returns the name field.
 * @returns The input labelled Name.
 */
function field(): HTMLInputElement {
	return screen.getByLabelText('Name') as HTMLInputElement
}

/**
 * Types a value into the name field.
 * @param value - The value to type.
 */
function type(value: string): void {
	fireEvent.change(field(), { target: { value } })
}

test('labels the field with the given label and fills it with the current name', () => {
	renderRename()

	expect(field().value).toBe('Hello')
})

test('writes the typed name when the submit button is pressed', () => {
	const { onSubmit, onCancel } = renderRename()

	type('Hello world')
	fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello world')
	expect(onCancel).not.toHaveBeenCalled()
})

test('writes the typed name when the form is submitted, as Enter in the field does, and stays on the page', () => {
	const { onSubmit } = renderRename()

	type('Hello world')
	const navigates = fireEvent.submit(field().form as HTMLFormElement)

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello world')
	expect(navigates, 'the browser would send the form and leave the page').toBe(false)
})

test('makes the submit button the one Enter presses, and never Cancel', () => {
	renderRename()

	expect(screen.getByRole('button', { name: 'Rename' }).getAttribute('type')).toBe('submit')
	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('type')).toBe('button')
})

test('keeps the submit button from writing the name the item already has', () => {
	const { onSubmit } = renderRename()
	const submit = screen.getByRole('button', { name: 'Rename' })

	fireEvent.click(submit)

	expect(submit.getAttribute('aria-disabled')).toBe('true')
	expect(onSubmit).not.toHaveBeenCalled()
})

test('keeps the submit button from writing a blank name', () => {
	const { onSubmit } = renderRename()
	const submit = screen.getByRole('button', { name: 'Rename' })

	type('   ')
	fireEvent.click(submit)

	expect(submit.getAttribute('aria-disabled')).toBe('true')
	expect(onSubmit).not.toHaveBeenCalled()
})

test('cancels when Cancel is pressed', () => {
	const { onSubmit, onCancel } = renderRename()

	fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

	expect(onCancel).toHaveBeenCalledOnce()
	expect(onSubmit).not.toHaveBeenCalled()
})

test('draws Cancel as a minimal button and the submit as the solid blue one', () => {
	renderRename()
	type('Hello world')

	expect([...screen.getByRole('button', { name: 'Cancel' }).classList]).toEqual(buttonClasses('minimal'))
	expect([...screen.getByRole('button', { name: 'Rename' }).classList]).toEqual(buttonClasses('solid'))
})

test('puts the submit button after Cancel', () => {
	renderRename()

	expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Cancel', 'Rename'])
})

test('keeps the submit button from a second press while the write runs, and shows it busy', () => {
	const { onSubmit, rerender } = renderRename()
	type('Hello world')
	rerender({ busy: true })
	const submit = screen.getByRole('button', { name: 'Rename' })

	fireEvent.click(submit)

	expect(submit.getAttribute('aria-disabled')).toBe('true')
	expect(onSubmit).not.toHaveBeenCalled()
	expect([...submit.classList]).toEqual(loadingClasses())
})

test('shows a failure under the field, announced as an alert, with the typed name kept', () => {
	const { rerender } = renderRename()
	type('Hello world')

	rerender({ failure: 'The name could not be updated.' })
	const alert = screen.getByRole('alert')

	expect(alert.textContent).toBe('The name could not be updated.')
	expect(field().value).toBe('Hello world')
	expect(field().compareDocumentPosition(alert) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
	expect(
		alert.compareDocumentPosition(screen.getByRole('button', { name: 'Cancel' })) & Node.DOCUMENT_POSITION_FOLLOWING,
	).toBeTruthy()
})

test('shows no alert while nothing failed', () => {
	renderRename()

	expect(screen.queryByRole('alert')).toBeNull()
})
