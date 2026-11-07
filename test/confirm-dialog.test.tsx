// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { useState } from 'react'
import type { ComponentProps } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { POPUP_CLASS } from '../src/dialog-open.js'
import { ConfirmDialog } from '../src/dialogs'
import type { DialogAnswer } from '../src/dialogs'
import { installTestEnvironment, renderAdmin, stubLayout } from '../src/testing.js'

installTestEnvironment()

/** The question the dialog of these tests asks. */
const TITLE = 'Move "Hello" to the trash?'

/** What the dialog of these tests says will happen. */
const DESCRIPTION = 'It stays there for 30 days.'

/** The words a write that failed answers. */
const FAILURE = 'Could not move "Hello" to the trash.'

/** What a test changes on the dialog. */
type Opening = Partial<Pick<ComponentProps<typeof ConfirmDialog>, 'description' | 'intent' | 'onConfirm'>>

/**
 * Renders a button that asks the dialog, beside a list region an action may focus.
 * @param props - What the test changes on the dialog, the action and the spy told when the dialog is gone.
 * @returns The opener, the region and the dialog while it is asked for.
 */
function TrashButton({
	onConfirm,
	onClose,
	...opening
}: Required<Pick<Opening, 'onConfirm'>> & Omit<Opening, 'onConfirm'> & { onClose: () => void }) {
	const [asking, setAsking] = useState(false)
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Ask
			</button>
			<div role="region" aria-label="Posts" tabIndex={-1} />
			{asking ? (
				<ConfirmDialog
					title={TITLE}
					confirmLabel="Trash"
					cancelLabel="Keep"
					onConfirm={onConfirm}
					onClose={() => {
						onClose()
						setAsking(false)
					}}
					{...opening}
				/>
			) : null}
		</>
	)
}

/**
 * Renders the opener and asks the dialog from it.
 * @param opening - What the test changes on the dialog.
 * @returns The action spy, the close spy, the opener and the region.
 */
async function openDialog(opening: Opening = {}) {
	const onConfirm = vi.fn(opening.onConfirm ?? (() => undefined))
	const onClose = vi.fn()
	renderAdmin(<TrashButton {...opening} onConfirm={onConfirm} onClose={onClose} />)
	const opener = screen.getByRole('button', { name: 'Ask' })
	await userEvent.setup().click(opener)
	await screen.findByRole('alertdialog')
	return { onConfirm, onClose, opener, region: screen.getByRole('region', { name: 'Posts', hidden: true }) }
}

/**
 * Returns a write the test ends by hand.
 * @returns The write and what ends it with an answer or a rejection.
 */
function heldWrite() {
	let answer: (value?: unknown) => void = () => {}
	let reject: (error: Error) => void = () => {}
	const write = async () =>
		new Promise<unknown>((done, fail) => {
			answer = done
			reject = fail
		})
	return { write, end: (value?: unknown) => answer(value), fail: (error: Error) => reject(error) }
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
 * Returns the dialog on screen, none once it left.
 * @returns The dialog element.
 */
function dialog(): HTMLElement | null {
	return screen.queryByRole('alertdialog')
}

/**
 * Returns a button of the dialog.
 * @param name - The name of the button.
 * @returns The button.
 */
function button(name: string): HTMLElement {
	return screen.getByRole('button', { name })
}

/**
 * Presses a button of the dialog and lets the promises it started settle.
 * @param name - The name of the button.
 */
async function press(name: string): Promise<void> {
	await act(async () => {
		fireEvent.click(button(name))
	})
}

/**
 * Presses Escape where the focus sits and lets what it started settle.
 */
async function pressEscape(): Promise<void> {
	await act(async () => {
		fireEvent.keyDown(document.activeElement as Element, { key: 'Escape', code: 'Escape' })
	})
}

/**
 * Reports whether the confirm button shows its spinner.
 * @returns Whether it is busy.
 */
function spinning(): boolean {
	return /is-loading/.test(button('Trash').className)
}

test('names an alert dialog by its title and describes it by its description', async () => {
	await openDialog({ description: DESCRIPTION })

	expect(screen.getByRole('alertdialog', { name: TITLE, description: DESCRIPTION })).toBe(dialog())
})

test('draws no description when it has none', async () => {
	await openDialog()

	expect(dialog()?.getAttribute('aria-describedby')).toBeNull()
})

test('puts the focus on Cancel', async () => {
	stubLayout()

	await openDialog()

	await waitFor(() => expect(document.activeElement).toBe(button('Keep')))
})

test('draws a confirm button of the brand colour for a default confirm', async () => {
	await openDialog()

	expect(button('Trash').className).not.toMatch(/irreversible/)
})

test('draws a red confirm button for an irreversible action', async () => {
	await openDialog({ intent: 'irreversible' })

	expect(button('Trash').className).toMatch(/irreversible/)
})

test('draws both labels as given', async () => {
	await openDialog()

	expect(screen.getAllByRole('button').map(({ textContent }) => textContent)).toEqual(['Keep', 'Trash'])
})

test('carries the class that breaks a long word', async () => {
	await openDialog()

	expect(dialog()?.classList.contains(POPUP_CLASS)).toBe(true)
})

test('runs no action and closes on Cancel', async () => {
	const { onConfirm, onClose } = await openDialog()

	await press('Keep')

	expect(onConfirm).not.toHaveBeenCalled()
	expect(onClose).toHaveBeenCalledOnce()
	expect(dialog()).toBeNull()
})

test('closes on Escape while idle', async () => {
	stubLayout()
	const { onClose } = await openDialog()
	await waitFor(() => expect(document.activeElement).toBe(button('Keep')))

	await pressEscape()

	expect(onClose).toHaveBeenCalledOnce()
	expect(dialog()).toBeNull()
})

test('stays open on a click on the dimmed page', async () => {
	const { onClose } = await openDialog()
	const backdrop = document.querySelector('[class*="backdrop"]') as Element

	await act(async () => {
		fireEvent.pointerDown(backdrop, { button: 0 })
		fireEvent.pointerUp(backdrop, { button: 0 })
		fireEvent.click(backdrop)
	})

	expect(onClose).not.toHaveBeenCalled()
	expect(dialog()).not.toBeNull()
})

test('runs a plain handler and closes at once with no spinner', async () => {
	const { onConfirm, onClose } = await openDialog()

	fireEvent.click(button('Trash'))
	expect(onConfirm).toHaveBeenCalledOnce()
	expect(spinning()).toBe(false)

	await waitFor(() => expect(dialog()).toBeNull())
	expect(onClose).toHaveBeenCalledOnce()
})

test('stays and shows the words of a plain handler that answers an error', async () => {
	const { onClose } = await openDialog({ onConfirm: (): DialogAnswer => ({ error: FAILURE }) })

	await press('Trash')

	expect(screen.getByText(FAILURE)).not.toBeNull()
	expect(onClose).not.toHaveBeenCalled()
	expect(dialog()).not.toBeNull()
})

test('stays with no words on a plain handler that answers a plain stay', async () => {
	const { onClose } = await openDialog({ onConfirm: (): DialogAnswer => ({ close: false }) })

	await press('Trash')

	expect(onClose).not.toHaveBeenCalled()
	expect(button('Trash').getAttribute('aria-disabled')).toBe('false')
})

test('greys both buttons, spins and refuses Escape while a promise runs, then closes', async () => {
	const held = heldWrite()
	stubLayout()
	const { onClose } = await openDialog({ onConfirm: held.write })
	await waitFor(() => expect(document.activeElement).toBe(button('Keep')))

	await press('Trash')
	await pressEscape()

	expect(spinning()).toBe(true)
	expect(button('Trash').getAttribute('aria-disabled')).toBe('true')
	expect(button('Keep').getAttribute('aria-disabled')).toBe('true')
	expect(onClose).not.toHaveBeenCalled()
	expect(dialog()).not.toBeNull()

	await act(async () => held.end())

	expect(onClose).toHaveBeenCalledOnce()
	expect(dialog()).toBeNull()
})

test('sends once on a second press while a promise runs', async () => {
	const held = heldWrite()
	const { onConfirm } = await openDialog({ onConfirm: held.write })

	await press('Trash')
	await press('Trash')

	expect(onConfirm).toHaveBeenCalledOnce()
	await act(async () => held.end())
})

test('spins for a thenable that is not a promise', async () => {
	let end = () => {}
	const thenable = {
		then: (done: (value?: unknown) => void) => {
			end = () => done()
		},
	} as unknown as PromiseLike<unknown>
	await openDialog({ onConfirm: () => thenable })

	await press('Trash')

	expect(spinning()).toBe(true)
	await act(async () => end())
	expect(dialog()).toBeNull()
})

test('stays and shows the words of a promise that ends with an error, and a retry clears them', async () => {
	const held = heldWrite()
	const { onClose } = await openDialog({ onConfirm: held.write })

	await press('Trash')
	await act(async () => held.end({ error: FAILURE }))

	expect(screen.getByText(FAILURE)).not.toBeNull()
	expect(spinning()).toBe(false)
	expect(onClose).not.toHaveBeenCalled()

	await press('Trash')

	expect(screen.queryByText(FAILURE)).toBeNull()
	await act(async () => held.end())
	expect(onClose).toHaveBeenCalledOnce()
})

test('stays on a promise that ends with a plain stay', async () => {
	const held = heldWrite()
	const { onClose } = await openDialog({ onConfirm: held.write })

	await press('Trash')
	await act(async () => held.end({ close: false }))

	expect(spinning()).toBe(false)
	expect(onClose).not.toHaveBeenCalled()
	expect(dialog()).not.toBeNull()
})

test('closes with no crash on a write that ends with an object in its error', async () => {
	const held = heldWrite()
	const { onClose } = await openDialog({ onConfirm: held.write })

	await press('Trash')
	await act(async () => held.end({ data: null, error: { message: FAILURE } }))

	expect(onClose).toHaveBeenCalledOnce()
	expect(dialog()).toBeNull()
})

test('stays on a rejection with the spinner ended, and hands it on to the app once', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const logged = vi.spyOn(console, 'error')
	onTestFinished(() => logged.mockRestore())
	const held = heldWrite()
	const { onClose } = await openDialog({ onConfirm: held.write })

	await press('Trash')
	await act(async () => held.fail(thrown))

	await waitFor(() => expect(reasons).toEqual([thrown]))
	expect(logged).not.toHaveBeenCalled()
	expect(spinning()).toBe(false)
	expect(onClose).not.toHaveBeenCalled()
	expect(dialog()).not.toBeNull()
})

test('stays on a handler that throws, and hands the error on to the app once', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const logged = vi.spyOn(console, 'error')
	onTestFinished(() => logged.mockRestore())
	const { onClose } = await openDialog({
		onConfirm: () => {
			throw thrown
		},
	})

	await press('Trash')

	await waitFor(() => expect(reasons).toEqual([thrown]))
	expect(logged).not.toHaveBeenCalled()
	expect(onClose).not.toHaveBeenCalled()
	expect(dialog()).not.toBeNull()
})

test.each([
	{ click: 'a double click', detail: 2, sent: 0 },
	{ click: 'a third click', detail: 3, sent: 0 },
	{ click: 'a single click', detail: 1, sent: 1 },
	{ click: 'Enter or Space', detail: 0, sent: 1 },
])('sends $sent times on the confirm button on $click', async ({ detail, sent }) => {
	const { onConfirm } = await openDialog({ onConfirm: (): DialogAnswer => ({ close: false }) })
	let passedOn = false

	await act(async () => {
		passedOn = fireEvent.click(button('Trash'), { detail })
	})

	expect(onConfirm).toHaveBeenCalledTimes(sent)
	expect(passedOn).toBe(sent === 1)
})

test.each([
	{ held: 'a repeated Enter', key: 'Enter', repeat: true, refused: true },
	{ held: 'a first Enter', key: 'Enter', repeat: false, refused: false },
	{ held: 'a repeated Tab', key: 'Tab', repeat: true, refused: false },
])('refuses $refused on $held', async ({ key, repeat, refused }) => {
	await openDialog()

	expect(fireEvent.keyDown(button('Trash'), { key, repeat })).toBe(!refused)
})

test('gives the focus back to the control that asked it once it closed', async () => {
	stubLayout()
	const { opener } = await openDialog()
	await waitFor(() => expect(document.activeElement).toBe(button('Keep')))

	await press('Keep')

	await waitFor(() => expect(document.activeElement).toBe(opener))
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
	await waitFor(() => expect(document.activeElement).toBe(button('Keep')))

	await press('Trash')

	expect(dialog()).toBeNull()
	expect(document.activeElement).toBe(moved.region)
})
