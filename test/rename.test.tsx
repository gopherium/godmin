// SPDX-License-Identifier: Apache-2.0

import { fireEvent, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { expect, onTestFinished, test, vi } from 'vitest'

import { RenameBody } from '../src/index'
import { buttonClasses, installTestEnvironment, renderAdmin } from '../src/testing.js'
import { gapInPixels } from './styles.js'

installTestEnvironment()

/**
 * Renders a rename body for a post named Hello, with spies for its handlers.
 * @param props - Any prop the body no longer takes.
 * @returns The submit and cancel spies.
 */
function renderRename(props: Record<string, unknown> = {}) {
	const onSubmit = vi.fn()
	const onCancel = vi.fn()
	renderAdmin(
		<RenameBody
			name="Hello"
			fieldLabel="Name"
			submitLabel="Rename"
			cancelLabel="Cancel"
			onSubmit={onSubmit}
			onCancel={onCancel}
			{...props}
		/>,
	)
	return { onSubmit, onCancel }
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

/**
 * Submits the rename form from code, as a caller holding the form can, without the submit button.
 */
function submitFromCode(): void {
	const form = field().form as HTMLFormElement
	form.requestSubmit()
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

test('labels the field with the given label and fills it with the current name', () => {
	renderRename()

	expect(field().value).toBe('Hello')
})

test('fills the field with the text a caller hands back, such as a name a failed write turned away', () => {
	renderAdmin(
		<RenameBody name="Hello world" fieldLabel="Name" submitLabel="Rename" cancelLabel="Cancel" onSubmit={vi.fn()} />,
	)

	expect(field().value).toBe('Hello world')
})

test('writes the typed name when the submit button is pressed', () => {
	const { onSubmit, onCancel } = renderRename()

	type('Hello world')
	fireEvent.click(screen.getByRole('button', { name: 'Rename' }))

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello world')
	expect(onCancel).not.toHaveBeenCalled()
})

test('writes the typed name once when Enter is pressed in the field, and stays on the page', async () => {
	const { onSubmit } = renderRename()
	const kept = watchSubmits()

	await userEvent.setup().type(field(), ' world{Enter}')

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello world')
	expect(kept, 'the browser would send the form and leave the page').toEqual([true])
})

test('writes the name the item already has when Enter is pressed, as the WordPress Rename does', async () => {
	const { onSubmit } = renderRename()

	await userEvent.setup().type(field(), '{Enter}')

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello')
})

test('offers the submit button for the name the item already has, as the WordPress Rename does', () => {
	const { onSubmit } = renderRename()
	const submit = screen.getByRole('button', { name: 'Rename' })

	fireEvent.click(submit)

	expect(submit.getAttribute('aria-disabled')).not.toBe('true')
	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('Hello')
})

test('writes nothing when Enter is pressed in the field with a blank name', async () => {
	const { onSubmit } = renderRename()
	const user = userEvent.setup()

	await user.clear(field())
	await user.type(field(), '   {Enter}')

	expect(onSubmit).not.toHaveBeenCalled()
})

test('writes nothing when code submits the form with a blank name, and stays on the page', () => {
	const { onSubmit } = renderRename()
	const kept = watchSubmits()

	type('   ')
	submitFromCode()

	expect(onSubmit).not.toHaveBeenCalled()
	expect(kept, 'the browser would send the form and leave the page').toEqual([true])
})

test('keeps the submit button from writing a blank name', () => {
	const { onSubmit } = renderRename()
	const submit = screen.getByRole('button', { name: 'Rename' })

	type('   ')
	fireEvent.click(submit)

	expect(submit.getAttribute('aria-disabled')).toBe('true')
	expect(onSubmit).not.toHaveBeenCalled()
})

test('makes the submit button the one Enter presses, and never Cancel', () => {
	renderRename()

	expect(screen.getByRole('button', { name: 'Rename' }).getAttribute('type')).toBe('submit')
	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('type')).toBe('button')
})

test('cancels when Cancel is pressed', () => {
	const { onSubmit, onCancel } = renderRename()

	fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

	expect(onCancel).toHaveBeenCalledOnce()
	expect(onSubmit).not.toHaveBeenCalled()
})

test('draws Cancel as accent text like the WordPress Site Editor dialogs, and the submit as the solid one', () => {
	renderRename()

	expect([...screen.getByRole('button', { name: 'Cancel' }).classList]).toEqual(buttonClasses('minimal'))
	expect([...screen.getByRole('button', { name: 'Rename' }).classList]).toEqual(buttonClasses('solid'))
})

test('puts the submit button after Cancel', () => {
	renderRename()

	expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Cancel', 'Rename'])
})

test('leaves 20px between the field and the buttons, as the WordPress Rename does', () => {
	renderRename()

	expect(gapInPixels(field().form as HTMLFormElement)).toBe(20)
})

test('shows no failure inside the body, since a failure belongs in a toast', () => {
	renderRename({ failure: 'The name could not be updated.' })

	expect(screen.queryByRole('alert')).toBeNull()
	expect(screen.queryByText('The name could not be updated.')).toBeNull()
})

test('takes no busy flag, so Cancel and the submit stay live, since a rename closes before its write', () => {
	const { onSubmit, onCancel } = renderRename({ busy: true })

	fireEvent.click(screen.getByRole('button', { name: 'Rename' }))
	fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(onCancel).toHaveBeenCalledOnce()
})
