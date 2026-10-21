// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { InputControl } from '@wordpress/ui'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { FormDialog } from '../src/dialogs'
import type { FormDialogProps } from '../src/dialogs'
import { buttonClasses, installTestEnvironment, renderAdmin, stubLayout } from '../src/testing.js'
import { cardWidth, gapInPixels } from './styles.js'

installTestEnvironment()

/** How a test opens the dialog and what it does on send. */
type Opening = Partial<Pick<FormDialogProps, 'size' | 'kind' | 'canSubmit' | 'onSubmit'>>

/**
 * Renders the Add Page button that opens a form dialog asking for a title and a summary.
 * @param props - The size, the kind, the send gate, the send and the spy told when the dialog is taken away.
 * @returns The opener and the dialog while it is asked for.
 */
function AddPage({ onClose, ...opening }: Opening & { onClose: () => void }) {
	const [asking, setAsking] = useState(false)
	const [title, setTitle] = useState('')
	const [summary, setSummary] = useState('')
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Add Page
			</button>
			{asking ? (
				<FormDialog
					title="Add Page"
					submitLabel="Add"
					cancelLabel="Cancel"
					onSubmit={() => undefined}
					{...opening}
					onClose={() => {
						onClose()
						setAsking(false)
					}}
				>
					<InputControl label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
					<InputControl label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
				</FormDialog>
			) : null}
		</>
	)
}

/**
 * Renders the opener and opens the dialog from it, as a pointer press does.
 * @param opening - The size, the kind, the send gate and the send.
 * @returns The send spy, the close spy and the opener.
 */
async function openDialog(opening: Opening = {}) {
	const onSubmit = vi.fn(opening.onSubmit ?? (() => undefined))
	const onClose = vi.fn()
	renderAdmin(<AddPage {...opening} onSubmit={onSubmit} onClose={onClose} />)
	const opener = screen.getByRole('button', { name: 'Add Page' })
	await userEvent.setup().click(opener)
	return { onSubmit, onClose, opener }
}

/**
 * Returns a send the test settles by hand.
 * @returns The send and the functions that fulfil or reject the write it started.
 */
function heldSend() {
	let fulfil = () => {}
	let reject: (error: Error) => void = () => {}
	const send = async () =>
		new Promise<void>((done, fail) => {
			fulfil = done
			reject = fail
		})
	return { send, fulfil: () => fulfil(), reject: (error: Error) => reject(error) }
}

/**
 * Listens for rejections no code handled, until the test finishes.
 * @returns The reasons heard so far.
 */
function heardRejections(): unknown[] {
	const reasons: unknown[] = []
	const listener = (reason: unknown) => {
		reasons.push(reason)
	}
	process.on('unhandledRejection', listener)
	onTestFinished(() => {
		process.off('unhandledRejection', listener)
	})
	return reasons
}

/**
 * Returns the dialog on screen.
 * @returns The dialog element.
 */
function dialog(): HTMLElement {
	return screen.getByRole('dialog')
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
	return screen.getByRole('button', { name: 'Add' })
}

/**
 * Presses a button inside the dialog and lets the promises it started settle.
 * @param name - The name of the button.
 */
async function press(name: string): Promise<void> {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name }))
	})
}

/**
 * Presses and lets go of the pointer on the dark overlay around the dialog.
 */
function clickOutside(): void {
	const overlay = document.querySelector('.components-modal__screen-overlay') as HTMLElement
	fireEvent.pointerDown(overlay, { button: 0 })
	fireEvent.pointerUp(overlay, { button: 0 })
}

test('opens a titled dialog with a close button', async () => {
	await openDialog()

	expect(screen.getByRole('dialog', { name: 'Add Page' })).toBe(dialog())
	expect(screen.getByRole('heading', { name: 'Add Page' })).not.toBeNull()
	expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
})

test('puts the cursor in the first field when it opens', async () => {
	stubLayout()

	await openDialog()

	await waitFor(() => expect(document.activeElement).toBe(field()))
})

test('opens on the WordPress modal frame, which rises as a bottom sheet on a phone', async () => {
	await openDialog()

	expect(dialog().classList.contains('components-modal__frame')).toBe(true)
})

test.each([
	['by default', {}, 'small', '400px'],
	['when asked for the small size', { size: 'small' }, 'small', '400px'],
	['when asked for the medium size', { size: 'medium' }, 'medium', '560px'],
] as const)('opens as the WordPress card of the right width %s', async (_case, opening, size, width) => {
	await openDialog(opening)

	expect(dialog().classList.contains(`has-size-${size}`)).toBe(true)
	expect(cardWidth(size)).toBe(width)
})

test('draws Cancel first as accent text and the submit button after it as the solid one', async () => {
	await openDialog()

	const buttons = [...(field().form as HTMLFormElement).querySelectorAll('button')]
	expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Add'])
	expect([...buttons[0].classList]).toEqual(buttonClasses('minimal'))
	expect([...buttons[1].classList]).toEqual(buttonClasses('solid'))
})

test.each([
	['16px for a create, the default, as WordPress spaces Add Page', {}, 16],
	['20px for an edit', { kind: 'edit' }, 20],
	['12px for a copy', { kind: 'copy' }, 12],
] as const)('leaves %s above the buttons', async (_case, opening, pixels) => {
	await openDialog(opening)

	expect(gapInPixels(field().form as HTMLFormElement)).toBe(pixels)
})

test('sends the form once when Enter is pressed in a field, through a real form', async () => {
	const { onSubmit } = await openDialog()

	await userEvent.setup().type(field(), 'Hello{Enter}')

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(field().form).not.toBeNull()
})

test('sends nothing while a needed field is empty, and keeps the submit button focusable', async () => {
	const { onSubmit } = await openDialog({ canSubmit: false })

	await press('Add')
	await userEvent.setup().type(field(), '{Enter}')

	expect(onSubmit).not.toHaveBeenCalled()
	expect(submit().getAttribute('aria-disabled')).toBe('true')
	expect(submit().hasAttribute('disabled')).toBe(false)
})

test('keeps the submit busy while the returned promise runs and ignores a second send', async () => {
	const held = heldSend()
	const { onSubmit } = await openDialog({ onSubmit: held.send })

	await press('Add')
	await press('Add')
	await userEvent.setup().type(field(), '{Enter}')

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(submit().getAttribute('aria-disabled')).toBe('true')
	await act(async () => held.fulfil())
	expect(submit().getAttribute('aria-disabled')).not.toBe('true')
})

test('keeps the submit busy until a write that ends with the saved item ends', async () => {
	let finish: (saved: { id: string }) => void = () => {}
	await openDialog({
		onSubmit: () =>
			new Promise<{ id: string }>((done) => {
				finish = done
			}),
	})

	await press('Add')
	expect(submit().getAttribute('aria-disabled')).toBe('true')

	await act(async () => finish({ id: '1' }))
	expect(submit().getAttribute('aria-disabled')).not.toBe('true')
})

test('keeps Cancel live while the send runs', async () => {
	const held = heldSend()
	await openDialog({ onSubmit: held.send })

	await press('Add')

	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled')).not.toBe('true')
	await act(async () => held.fulfil())
})

test('never turns busy for a send that returns nothing', async () => {
	const { onSubmit } = await openDialog()

	await press('Add')
	await press('Add')

	expect(onSubmit).toHaveBeenCalledTimes(2)
	expect(submit().getAttribute('aria-disabled')).not.toBe('true')
})

test('stays open when the send settles, until the caller closes it', async () => {
	const held = heldSend()
	const { onClose } = await openDialog({ onSubmit: held.send })

	await press('Add')
	await act(async () => held.fulfil())

	expect(dialog()).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
})

test.each([
	['Cancel', async () => press('Cancel')],
	['Escape', async () => fireEvent.keyDown(field(), { key: 'Escape', code: 'Escape' })],
	['a click on the dimmed page', async () => clickOutside()],
	['its close button', async () => press('Close')],
])('closes on %s, also while the send runs', async (_way, close) => {
	const held = heldSend()
	const { onClose } = await openDialog({ onSubmit: held.send })
	await press('Add')

	await close()

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
	await act(async () => held.fulfil())
	expect(onClose).toHaveBeenCalledOnce()
})

test('lets the reader send again after a send that throws, and hands the error on', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const held = heldSend()
	const { onSubmit } = await openDialog({ onSubmit: held.send })

	await press('Add')
	await act(async () => held.reject(thrown))
	await waitFor(() => expect(reasons).toEqual([thrown]))
	await press('Add')

	expect(dialog()).not.toBeNull()
	expect(onSubmit).toHaveBeenCalledTimes(2)
	await act(async () => held.fulfil())
})

test('keeps what was typed after a send that throws', async () => {
	const reasons = heardRejections()
	const held = heldSend()
	await openDialog({ onSubmit: held.send })
	await userEvent.setup().type(field(), 'Hello')

	await press('Add')
	await act(async () => held.reject(new Error('offline')))
	await waitFor(() => expect(reasons).toHaveLength(1))

	expect(field().value).toBe('Hello')
})

test('gives the focus back to the button that opened it once closed', async () => {
	stubLayout()
	const { opener } = await openDialog()
	await waitFor(() => expect(document.activeElement).toBe(field()))

	await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))

	expect(screen.queryByRole('dialog')).toBeNull()
	expect(document.activeElement).toBe(opener)
})
