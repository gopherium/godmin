// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { ConfirmDialog } from '../src/dialogs'
import { buttonClasses, installTestEnvironment, renderAdmin, stubLayout } from '../src/testing.js'

installTestEnvironment()

/** The question a confirm that removes something asks. */
const TRASH_QUESTION = 'Move "Hello" to the trash?'

/** The failure the action resolves with when the move fails. */
const FAILURE = 'The post could not be moved to the trash.'

/** How a test opens the dialog and what it does on confirm. */
interface Opening {
	/** The title of a plain confirm, none for one that removes something. */
	title?: string
	/** The question the dialog asks. */
	question?: string
	/** Carries the action out. */
	onConfirm?: () => Promise<string | undefined>
}

/**
 * Renders a button that opens a confirmation dialog, beside a list region an action may focus.
 * @param props - The title, the question, the action and the spy told when the dialog is taken away.
 * @returns The opener, the region and the dialog while it is asked for.
 */
function TrashButton({
	title,
	question = TRASH_QUESTION,
	onConfirm,
	onClose,
}: Required<Pick<Opening, 'onConfirm'>> & Omit<Opening, 'onConfirm'> & { onClose: () => void }) {
	const [asking, setAsking] = useState(false)
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Move to trash
			</button>
			<div role="region" aria-label="Posts" tabIndex={-1} />
			{asking ? (
				<ConfirmDialog
					title={title}
					confirmLabel="Trash"
					cancelLabel="Cancel"
					onConfirm={onConfirm}
					onClose={() => {
						onClose()
						setAsking(false)
					}}
				>
					{question}
				</ConfirmDialog>
			) : null}
		</>
	)
}

/**
 * Renders the opener and opens the dialog from it, as a pointer press does.
 * @param opening - The title, the question and the action.
 * @returns The action spy, the close spy, the opener and the region.
 */
async function openDialog(opening: Opening = {}) {
	const onConfirm = vi.fn(opening.onConfirm ?? (async () => undefined))
	const onClose = vi.fn()
	renderAdmin(<TrashButton {...opening} onConfirm={onConfirm} onClose={onClose} />)
	const opener = screen.getByRole('button', { name: 'Move to trash' })
	const region = screen.getByRole('region', { name: 'Posts' })
	await userEvent.setup().click(opener)
	return { onConfirm, onClose, opener, region }
}

/**
 * Returns an action the test settles by hand.
 * @returns The action and the function that settles the run it started with the given failure.
 */
function heldAction() {
	let settle: (failure: string | undefined) => void = () => {}
	const action = async () =>
		new Promise<string | undefined>((done) => {
			settle = done
		})
	return { action, settle: (failure?: string) => settle(failure) }
}

/**
 * Returns the dialog on screen.
 * @returns The dialog element.
 */
function dialog(): HTMLElement {
	return screen.getByRole('dialog')
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

/**
 * Waits longer than the dialog's exit animation.
 */
async function outlastExit(): Promise<void> {
	await act(async () => {
		await new Promise((done) => setTimeout(done, 300))
	})
}

test('asks its question in a dialog named by the question when it has no title', async () => {
	await openDialog()

	expect(screen.getByRole('dialog', { name: TRASH_QUESTION })).toBe(dialog())
	expect(screen.getByText(TRASH_QUESTION)).not.toBeNull()
})

test(
	'draws no header and no close button on a confirm with no title, as WordPress does for one that removes something',
	async () => {
		await openDialog()

		expect(dialog().querySelector('.components-modal__header')).toBeNull()
		expect(screen.queryByRole('heading')).toBeNull()
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
	},
)

test('draws a plain confirm\'s title as the dialog heading, with a close button', async () => {
	await openDialog({ title: 'Set as homepage', question: 'Set "Hello" as the site homepage?' })

	expect(screen.getByRole('dialog', { name: 'Set as homepage' })).toBe(dialog())
	expect(screen.getByRole('heading', { name: 'Set as homepage' })).not.toBeNull()
	expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
})

test.each([
	['without a title', undefined],
	['with a title', 'Set as homepage'],
])('focuses Cancel when it opens, %s', async (_case, title) => {
	stubLayout()

	await openDialog({ title })

	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))
})

test('draws Cancel as accent text and the confirm as the solid button, never in the error colour', async () => {
	await openDialog()

	expect([...screen.getByRole('button', { name: 'Cancel' }).classList]).toEqual(buttonClasses('minimal'))
	expect([...screen.getByRole('button', { name: 'Trash' }).classList]).toEqual(buttonClasses('solid'))
	expect(dialog().querySelector('.is-destructive')).toBeNull()
})

test('opens on the WordPress modal frame at the medium size', async () => {
	await openDialog()

	expect(dialog().classList.contains('components-modal__frame')).toBe(true)
	expect(dialog().classList.contains('has-size-medium')).toBe(true)
})

test('closes when Cancel is pressed', async () => {
	const { onConfirm, onClose } = await openDialog()

	await press('Cancel')

	expect(onClose).toHaveBeenCalledOnce()
	expect(onConfirm).not.toHaveBeenCalled()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('closes on Escape and on a click outside it', async () => {
	const { onClose } = await openDialog()
	fireEvent.keyDown(screen.getByRole('button', { name: 'Cancel' }), { key: 'Escape', code: 'Escape' })
	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()

	await userEvent.setup().click(screen.getByRole('button', { name: 'Move to trash' }))
	clickOutside()

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledTimes(2)
})

test('closes once the action resolves with nothing', async () => {
	const { onConfirm, onClose } = await openDialog()

	await press('Trash')

	expect(onConfirm).toHaveBeenCalledOnce()
	expect(onClose).toHaveBeenCalledOnce()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('shows the failure the action resolves with inside it, above the buttons, and stays open', async () => {
	const { onClose } = await openDialog({ onConfirm: async () => FAILURE })

	await press('Trash')

	const alert = screen.getByRole('alert')
	expect(alert.textContent).toBe(FAILURE)
	expect(dialog().contains(alert)).toBe(true)
	expect(
		alert.compareDocumentPosition(screen.getByRole('button', { name: 'Cancel' })) & Node.DOCUMENT_POSITION_FOLLOWING,
	).toBeTruthy()
	expect(onClose).not.toHaveBeenCalled()
})

test('clears the last failure as the next try starts', async () => {
	const held = heldAction()
	const onConfirm = vi.fn(async (): Promise<string | undefined> => FAILURE)
	await openDialog({ onConfirm })
	await press('Trash')
	expect(screen.getByRole('alert')).not.toBeNull()
	onConfirm.mockImplementation(held.action)

	await press('Trash')

	expect(screen.queryByRole('alert')).toBeNull()
	await act(async () => held.settle(FAILURE))
	expect(screen.getByRole('alert').textContent).toBe(FAILURE)
})

test('keeps the confirm button from a second press while the action runs', async () => {
	const held = heldAction()
	const { onConfirm } = await openDialog({ onConfirm: held.action })

	await press('Trash')
	await press('Trash')

	expect(onConfirm).toHaveBeenCalledOnce()
	expect(screen.getByRole('button', { name: 'Trash' }).getAttribute('aria-disabled')).toBe('true')
	await act(async () => held.settle())
})

test('closes nothing on Cancel, Escape or a click outside while the action runs', async () => {
	const held = heldAction()
	const { onClose } = await openDialog({ onConfirm: held.action })
	await press('Trash')

	await press('Cancel')
	fireEvent.keyDown(dialog(), { key: 'Escape', code: 'Escape' })
	clickOutside()
	await outlastExit()

	expect(screen.getByRole('dialog')).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
	await act(async () => held.settle())
	expect(onClose).toHaveBeenCalledOnce()
})

test('lets the reader close the dialog again when the action throws, and hands the error on', async () => {
	const thrown = new Error('offline')
	const reasons: unknown[] = []
	const listener = (reason: unknown) => {
		reasons.push(reason)
	}
	process.on('unhandledRejection', listener)
	onTestFinished(() => {
		process.off('unhandledRejection', listener)
	})
	const { onClose } = await openDialog({
		onConfirm: async () => {
			throw thrown
		},
	})

	await press('Trash')
	await waitFor(() => expect(reasons).toEqual([thrown]))
	fireEvent.keyDown(dialog(), { key: 'Escape', code: 'Escape' })

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
})

test('hides the close button of a titled confirm while the action runs', async () => {
	const held = heldAction()
	await openDialog({ title: 'Set as homepage', onConfirm: held.action })
	expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()

	await press('Trash')

	expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
	await act(async () => held.settle(FAILURE))
	expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
})

test('gives the focus back to the button that opened it once cancelled', async () => {
	stubLayout()
	const { opener } = await openDialog()
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))

	await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))

	expect(screen.queryByRole('dialog')).toBeNull()
	expect(document.activeElement).toBe(opener)
})

test('leaves the focus where the action moved it', async () => {
	stubLayout()
	let region: HTMLElement | undefined
	const moved = await openDialog({
		onConfirm: async () => {
			region?.focus()
			return undefined
		},
	})
	region = moved.region
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))

	await press('Trash')

	expect(screen.queryByRole('dialog')).toBeNull()
	expect(document.activeElement).toBe(moved.region)
})
