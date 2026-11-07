// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { RenameDialog } from '../src/index'
import type { RenameDialogProps } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** The name the item carries when the dialog opens. */
const NAME = 'Hello'

/** What a test changes on the dialog. */
type Opening = Partial<Pick<RenameDialogProps, 'name' | 'onSubmit'>>

/**
 * Renders the rename dialog over an item, with the send and the close spies.
 * @param opening - The name the item carries and the send.
 * @returns The send spy and the close spy.
 */
async function openRename(opening: Opening = {}) {
	const onSubmit = vi.fn(opening.onSubmit ?? (() => undefined))
	const onClose = vi.fn()
	renderAdmin(
		<RenameDialog
			title="Rename"
			name={opening.name ?? NAME}
			fieldLabel="Name"
			submitLabel="Save"
			cancelLabel="Cancel"
			onSubmit={onSubmit}
			onClose={onClose}
		/>,
	)
	await screen.findByRole('dialog', { name: 'Rename' })
	return { onSubmit, onClose }
}

/**
 * Returns the name field.
 * @returns The one text field of the dialog.
 */
function field(): HTMLInputElement {
	return screen.getByRole('textbox') as HTMLInputElement
}

/**
 * Returns the button that sends the name.
 * @returns The Save button.
 */
function save(): HTMLElement {
	return screen.getByRole('button', { name: 'Save' })
}

/**
 * Types a whole new name into the field.
 * @param value - The new name.
 */
function retype(value: string): void {
	fireEvent.change(field(), { target: { value } })
}

/**
 * Presses Save and lets the promises it started settle.
 */
async function pressSave(): Promise<void> {
	await act(async () => {
		fireEvent.click(save())
	})
}

test('names the dialog by its title, fills the field with the current name and puts the cursor there', async () => {
	await openRename()

	expect(field().value).toBe(NAME)
	await waitFor(() => expect(document.activeElement).toBe(field()))
})

test('labels the field as given, needed but with no mark in its name', async () => {
	await openRename()

	expect(screen.getByRole('textbox', { name: 'Name' })).toBe(field())
	expect(field().required).toBe(true)
})

test('keeps Save on with a blank field', async () => {
	await openRename()

	retype('')

	expect(save().getAttribute('aria-disabled')).not.toBe('true')
})

test.each([
	['blank', ''],
	['only spaces', '   '],
])('sends nothing on a press on Save with a name that is %s, and stays open', async (_name, value) => {
	const { onSubmit, onClose } = await openRename()
	retype(value)

	await pressSave()

	expect(onSubmit).not.toHaveBeenCalled()
	expect(onClose).not.toHaveBeenCalled()
	expect(screen.getByRole('dialog')).not.toBeNull()
})

test('sends the name the item already has, as the WordPress Rename does', async () => {
	const { onSubmit } = await openRename()

	await pressSave()

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith(NAME)
})

test('sends the name as typed, the spaces around it kept', async () => {
	const { onSubmit } = await openRename()
	retype('  Maria Perez  ')

	await pressSave()

	expect(onSubmit).toHaveBeenCalledExactlyOnceWith('  Maria Perez  ')
})

test('keeps the field read only while the write runs, then closes once it ends', async () => {
	let finish = () => {}
	const { onClose } = await openRename({
		onSubmit: async () =>
			new Promise<void>((done) => {
				finish = done
			}),
	})
	expect(field().readOnly).toBe(false)

	await pressSave()

	expect(field().readOnly).toBe(true)
	await act(async () => finish())
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
})
