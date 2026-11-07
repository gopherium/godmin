// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { InputControl } from '@wordpress/ui'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { POPUP_CLASS } from '../src/dialog-open.js'
import { FormDialog } from '../src/dialogs'
import type { DialogAnswer, FormDialogProps } from '../src/dialogs'
import { buttonClasses, installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** The help sentence of the dialog of these tests. */
const DESCRIPTION = 'A page holds one piece of writing.'

/** How a test opens the dialog, what it does on send, and whether the title is needed. */
type Opening = Partial<Pick<FormDialogProps, 'description' | 'cancelLabel' | 'canSubmit' | 'onSubmit'>> & {
	titleRequired?: boolean
}

/**
 * Renders the Add Page button that opens a form dialog asking for a title and a summary.
 * @param props - The help sentence, the Cancel label, the send gate, the send, the needed title and the close spy.
 * @returns The opener and the dialog while it is asked for.
 */
function AddPage({ onClose, titleRequired = false, ...opening }: Opening & { onClose: () => void }) {
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
					<InputControl
						label="Title"
						required={titleRequired}
						value={title}
						onChange={(event) => setTitle(event.target.value)}
					/>
					<InputControl label="Summary" value={summary} onChange={(event) => setSummary(event.target.value)} />
				</FormDialog>
			) : null}
		</>
	)
}

/**
 * Renders the opener and opens the dialog from it, as a pointer press does.
 * @param opening - The help sentence, the Cancel label, the send gate, the send and the needed title.
 * @returns The send spy, the close spy and the opener.
 */
async function openDialog(opening: Opening = {}) {
	const onSubmit = vi.fn(opening.onSubmit ?? (() => undefined))
	const onClose = vi.fn()
	renderAdmin(<AddPage {...opening} onSubmit={onSubmit} onClose={onClose} />)
	const opener = screen.getByRole('button', { name: 'Add Page' })
	await userEvent.setup().click(opener)
	await screen.findByRole('dialog')
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
	return screen.getByRole('textbox', { name: /^Title/ }) as HTMLInputElement
}

/**
 * Returns the form the fields sit in.
 * @returns The form element.
 */
function form(): HTMLFormElement {
	return field().form as HTMLFormElement
}

/**
 * Returns the button that sends the form.
 * @returns The submit button.
 */
function submit(): HTMLElement {
	return screen.getByRole('button', { name: 'Add' })
}

/**
 * Returns the names of the buttons in the dialog footer, in order.
 * @returns The button labels.
 */
function footerButtons(): HTMLElement[] {
	return [...(submit().closest('footer') as HTMLElement).querySelectorAll('button')]
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
 * Presses and lets go of the pointer on the dimmed page around the dialog.
 */
async function clickOutside(): Promise<void> {
	const backdrop = document.querySelector('[class*="backdrop"]') as Element
	await act(async () => {
		fireEvent.pointerDown(backdrop, { button: 0 })
		fireEvent.pointerUp(backdrop, { button: 0 })
		fireEvent.click(backdrop)
	})
}

/**
 * Presses Escape in the first field and lets what it started settle.
 */
async function pressEscape(): Promise<void> {
	await act(async () => {
		fireEvent.keyDown(field(), { key: 'Escape', code: 'Escape' })
	})
}

test('opens a dialog named by its title, with a close icon', async () => {
	await openDialog()

	expect(screen.getByRole('dialog', { name: 'Add Page' })).toBe(dialog())
	expect(screen.getByRole('heading', { level: 2, name: 'Add Page' })).not.toBeNull()
	expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
})

test('describes the dialog by its help sentence, the first child of the form', async () => {
	await openDialog({ description: DESCRIPTION })

	expect(screen.getByRole('dialog', { description: DESCRIPTION })).toBe(dialog())
	expect(form().firstElementChild?.textContent).toBe(DESCRIPTION)
})

test('describes the dialog by nothing when it has no help sentence', async () => {
	await openDialog()

	expect(dialog().hasAttribute('aria-describedby')).toBe(false)
})

test('puts the cursor in the first field when it opens, past the close icon', async () => {
	await openDialog()

	await waitFor(() => expect(document.activeElement).toBe(field()))
})

test('opens on the WPDS dialog at its medium width, with the class that breaks a long word', async () => {
	await openDialog()

	expect(dialog().className).toMatch(/__is-medium\b/)
	expect(dialog().classList.contains(POPUP_CLASS)).toBe(true)
})

test('draws a neutral outline Cancel first and the solid submit button after it, in the footer', async () => {
	await openDialog()

	const buttons = footerButtons()
	expect(buttons.map((button) => button.textContent)).toEqual(['Cancel', 'Add'])
	expect([...buttons[0].classList]).toEqual(buttonClasses('outline', undefined, 'neutral'))
	expect([...buttons[1].classList]).toEqual(buttonClasses('solid'))
})

test('draws the submit button alone when it has no Cancel', async () => {
	await openDialog({ cancelLabel: undefined })

	expect(footerButtons().map((button) => button.textContent)).toEqual(['Add'])
})

test('sends the form once on a press on the submit button, which sits outside the form and names it', async () => {
	const { onSubmit } = await openDialog()
	expect(submit().closest('form')).toBeNull()
	expect(submit().getAttribute('form')).toBe(form().id)

	await press('Add')

	expect(onSubmit).toHaveBeenCalledOnce()
})

test('sends nothing on a press while a field the form needs is blank', async () => {
	const { onSubmit } = await openDialog({ titleRequired: true })

	await press('Add')

	expect(onSubmit).not.toHaveBeenCalled()
})

test('sends nothing while a needed field is empty, and keeps the submit button focusable', async () => {
	const { onSubmit } = await openDialog({ canSubmit: false })

	await press('Add')

	expect(onSubmit).not.toHaveBeenCalled()
	expect(submit().getAttribute('aria-disabled')).toBe('true')
	expect(submit().hasAttribute('disabled')).toBe(false)
})

test('keeps the submit busy while the write runs, ignores a second send, and closes once it ends', async () => {
	const held = heldSend()
	const { onSubmit, onClose } = await openDialog({ onSubmit: held.send })

	await press('Add')
	await press('Add')

	expect(onSubmit).toHaveBeenCalledOnce()
	expect(submit().getAttribute('aria-disabled')).toBe('true')
	expect(onClose).not.toHaveBeenCalled()
	await act(async () => held.fulfil())
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
})

test('spins for a write that is a thenable but not a promise', async () => {
	const held = heldSend()
	const thenable = { then: (done: () => void) => void held.send().then(done) } as unknown as PromiseLike<void>
	await openDialog({ onSubmit: () => thenable })

	await press('Add')

	expect(submit().getAttribute('aria-disabled')).toBe('true')
	await act(async () => held.fulfil())
})

test('hands a function given as the fields whether the write runs', async () => {
	const held = heldSend()
	renderAdmin(
		<FormDialog title="Add Page" submitLabel="Add" onSubmit={held.send} onClose={() => undefined}>
			{(busy) => <InputControl label="Title" readOnly={busy} />}
		</FormDialog>,
	)
	await screen.findByRole('dialog')
	expect(field().readOnly).toBe(false)

	await press('Add')

	expect(field().readOnly).toBe(true)
	await act(async () => held.fulfil())
})

test('sends nothing more from a plain button in the fields pressed while the send runs', async () => {
	const held = heldSend()
	const onSubmit = vi.fn(held.send)
	renderAdmin(
		<FormDialog title="Add Page" submitLabel="Add" onSubmit={onSubmit} onClose={() => undefined}>
			<button type="submit">Send from the fields</button>
		</FormDialog>,
	)
	await screen.findByRole('dialog')

	await press('Send from the fields')
	await press('Send from the fields')

	expect(onSubmit).toHaveBeenCalledOnce()
	await act(async () => held.fulfil())
})

test('closes itself once a write that ends with the saved item ends', async () => {
	let finish: (saved: { id: string }) => void = () => {}
	const { onClose } = await openDialog({
		onSubmit: () =>
			new Promise<{ id: string }>((done) => {
				finish = done
			}),
	})

	await press('Add')
	expect(submit().getAttribute('aria-disabled')).toBe('true')

	await act(async () => finish({ id: '1' }))
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
})

test('greys Cancel and the close icon while the send runs', async () => {
	const held = heldSend()
	await openDialog({ onSubmit: held.send })

	await press('Add')

	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled')).toBe('true')
	expect(screen.getByRole('button', { name: 'Close' }).getAttribute('aria-disabled')).toBe('true')
	await act(async () => held.fulfil())
})

test('closes at once on a send that returns nothing', async () => {
	const { onSubmit, onClose } = await openDialog()

	await press('Add')

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onSubmit).toHaveBeenCalledOnce()
	expect(onClose).toHaveBeenCalledOnce()
})

test.each([
	['at once', (): DialogAnswer => ({ close: false })],
	['once its promise ends', async (): Promise<DialogAnswer> => ({ close: false })],
])('stays open with nothing drawn on a send that answers a plain stay %s', async (_when, answer) => {
	const { onSubmit, onClose } = await openDialog({ onSubmit: answer })

	await press('Add')

	expect(dialog()).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
	expect(submit().getAttribute('aria-disabled')).not.toBe('true')
	await press('Add')
	expect(onSubmit).toHaveBeenCalledTimes(2)
})

test.each([
	['Cancel', async () => press('Cancel')],
	['Escape', pressEscape],
	['a click on the dimmed page', clickOutside],
	['its close icon', async () => press('Close')],
])('stays open on %s while the send runs, and closes once it ends', async (_way, close) => {
	const held = heldSend()
	const { onClose } = await openDialog({ onSubmit: held.send })
	await press('Add')

	await close()

	expect(dialog()).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
	await act(async () => held.fulfil())
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
})

test.each([
	['Cancel', async () => press('Cancel')],
	['Escape', pressEscape],
	['a click on the dimmed page', clickOutside],
	['its close icon', async () => press('Close')],
])('closes on %s while idle, sends nothing, and runs onClose once the card left', async (_way, close) => {
	const { onSubmit, onClose } = await openDialog()

	await close()

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
	expect(onSubmit).not.toHaveBeenCalled()
})

test('stays on a rejection with the spinner ended, hands it on once, and lets the reader send again', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const held = heldSend()
	const { onSubmit, onClose } = await openDialog({ onSubmit: held.send })

	await press('Add')
	await act(async () => held.reject(thrown))
	await waitFor(() => expect(reasons).toEqual([thrown]))

	expect(dialog()).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
	expect(submit().getAttribute('aria-disabled')).not.toBe('true')
	await press('Add')
	expect(onSubmit).toHaveBeenCalledTimes(2)
	await act(async () => held.fulfil())
})

test('stays on a handler that throws, and hands the error on to the app once', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const { onClose } = await openDialog({
		onSubmit: () => {
			throw thrown
		},
	})

	await press('Add')
	await waitFor(() => expect(reasons).toEqual([thrown]))

	expect(dialog()).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
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
	const { opener } = await openDialog()
	await waitFor(() => expect(document.activeElement).toBe(field()))

	await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	await waitFor(() => expect(document.activeElement).toBe(opener))
})
