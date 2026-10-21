// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { SHEET_BREAKPOINT } from '../src/breakpoints.js'
import { ConfirmDialog } from '../src/dialogs'
import { buttonClasses, installTestEnvironment, renderAdmin, stubLayout } from '../src/testing.js'
import { cardWidth, components } from './styles.js'

installTestEnvironment()

/** The question a confirm that removes something asks. */
const TRASH_QUESTION = 'Move "Hello" to the trash?'

/** How a test opens the dialog and what it does on confirm. */
interface Opening {
	/** The title of a plain confirm, none for one that removes something. */
	title?: string
	/** The size of the card, the default one when absent. */
	size?: 'small' | 'medium'
	/** The question the dialog asks. */
	question?: string
	/** Carries the action out, returning nothing or the write's promise. */
	onConfirm?: () => void | Promise<void>
}

/**
 * Renders a button that opens a confirmation dialog, beside a list region an action may focus.
 * @param props - The title, the size, the question, the action and the spy told when the dialog is taken away.
 * @returns The opener, the region and the dialog while it is asked for.
 */
function TrashButton({
	title,
	size,
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
					size={size}
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
	const onConfirm = vi.fn(opening.onConfirm ?? (() => undefined))
	const onClose = vi.fn()
	renderAdmin(<TrashButton {...opening} onConfirm={onConfirm} onClose={onClose} />)
	const opener = screen.getByRole('button', { name: 'Move to trash' })
	const region = screen.getByRole('region', { name: 'Posts' })
	await userEvent.setup().click(opener)
	return { onConfirm, onClose, opener, region }
}

/**
 * Returns an action the test settles by hand.
 * @returns The action and the functions that fulfil or reject the write it started.
 */
function heldAction() {
	let fulfil = () => {}
	let reject: (error: Error) => void = () => {}
	const action = async () =>
		new Promise<void>((done, fail) => {
			fulfil = done
			reject = fail
		})
	return { action, settle: () => fulfil(), fail: (error: Error) => reject(error) }
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

test('describes a plain confirm by its question, so a screen reader reads it after the title', async () => {
	await openDialog({ title: 'Set as homepage', question: 'Set "Hello" as the site homepage?' })

	expect(screen.getByRole('dialog', { name: 'Set as homepage', description: 'Set "Hello" as the site homepage?' }))
		.toBe(dialog())
})

test('gives a confirm with no title no description, since its question already names it', async () => {
	await openDialog()

	expect(dialog().getAttribute('aria-describedby')).toBeNull()
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

test('rises as a sheet below the sheet breakpoint and centres a card from it, as the WordPress modal does', () => {
	const card = `@media (min-width: ${SHEET_BREAKPOINT}px) {\n  .components-modal__frame {\n    align-self: auto;`

	expect(components.includes(card), `the modal stylesheet has no ${card} rule`).toBe(true)
})

test.each([
	['small', '400px', 'medium'],
	['medium', '560px', 'small'],
] as const)('draws a %s confirm as the WordPress card %s wide from the sheet width', async (size, width, other) => {
	await openDialog({ size })

	expect(dialog().classList.contains(`has-size-${size}`)).toBe(true)
	expect(dialog().classList.contains(`has-size-${other}`)).toBe(false)
	expect(cardWidth(size)).toBe(width)
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

test('runs the action and closes at once when the action returns nothing, as the WordPress editor trash does', () => {
	const order: string[] = []
	const onClose = vi.fn(() => order.push('close'))
	renderAdmin(
		<ConfirmDialog confirmLabel="Trash" cancelLabel="Cancel" onConfirm={() => void order.push('run')} onClose={onClose}>
			{TRASH_QUESTION}
		</ConfirmDialog>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Trash' }))

	expect(order).toEqual(['run', 'close'])
	expect(onClose).toHaveBeenCalledOnce()
})

test('stays busy with Cancel greyed while the returned promise runs, then closes, as row Trash does', async () => {
	const held = heldAction()
	const { onClose } = await openDialog({ onConfirm: held.action })

	await press('Trash')

	expect(screen.getByRole('button', { name: 'Trash' }).getAttribute('aria-disabled')).toBe('true')
	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled')).toBe('true')
	expect(onClose).not.toHaveBeenCalled()
	await act(async () => held.settle())
	expect(onClose).toHaveBeenCalledOnce()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('waits for a write that ends with the saved item, then closes', async () => {
	let finish: (saved: { id: string }) => void = () => {}
	const onClose = vi.fn()
	renderAdmin(
		<ConfirmDialog
			confirmLabel="Trash"
			cancelLabel="Cancel"
			onConfirm={() =>
				new Promise<{ id: string }>((done) => {
					finish = done
				})
			}
			onClose={onClose}
		>
			{TRASH_QUESTION}
		</ConfirmDialog>,
	)

	await press('Trash')
	expect(onClose).not.toHaveBeenCalled()

	await act(async () => finish({ id: '1' }))
	expect(onClose).toHaveBeenCalledOnce()
})

test('closes after a promise that rejects, and hands the error on', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const held = heldAction()
	const { onClose } = await openDialog({ onConfirm: held.action })

	await press('Trash')
	await act(async () => held.fail(thrown))

	await waitFor(() => expect(reasons).toEqual([thrown]))
	expect(onClose).toHaveBeenCalledOnce()
	expect(screen.queryByRole('dialog')).toBeNull()
})

test('shows no failure inside, since a failure belongs in a toast', async () => {
	const held = heldAction()
	await openDialog({ onConfirm: held.action })

	await press('Trash')
	await act(async () => held.settle())

	expect(screen.queryByRole('alert')).toBeNull()
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

test.each([
	['Escape', () => fireEvent.keyDown(dialog(), { key: 'Escape', code: 'Escape' })],
	['a click on the dimmed page', clickOutside],
	['the close button of a titled confirm', () => fireEvent.click(screen.getByRole('button', { name: 'Close' }))],
])('closes on %s while the action runs, and only once', async (_way, close) => {
	const held = heldAction()
	const { onClose } = await openDialog({ title: 'Set as homepage', onConfirm: held.action })
	await press('Trash')

	close()

	await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
	await act(async () => held.settle())
	expect(onClose).toHaveBeenCalledOnce()
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
		},
	})
	region = moved.region
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))

	await press('Trash')

	expect(screen.queryByRole('dialog')).toBeNull()
	expect(document.activeElement).toBe(moved.region)
})
