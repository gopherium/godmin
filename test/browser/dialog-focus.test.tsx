// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { ConfirmDialog } from '../../src/dialogs.js'
import type { DialogAnswer } from '../../src/dialogs.js'
import { sampleFocus } from './sample-focus.js'

/** How long a double click waits between its clicks, in milliseconds. */
const DOUBLE_CLICK_GAP = 60

/** How many times a held key repeats, long enough for a dialog asked by the first press to take the focus. */
const HELD_REPEATS = 20

/** How long a held key waits between its repeats, in milliseconds. */
const HELD_GAP = 33

/** What a bench draws: the action of its confirm, what it asks on arrival, and the place of Row A. */
interface Drawn {
	/** The action of the confirm. */
	onConfirm?: () => void | DialogAnswer | Promise<unknown>
	/** Whether the confirm is asked on the first render, with the focus on the page. */
	askedOnArrival?: boolean
}

/** Renders a link, two rows that each ask a confirm, a region and a button that drops Row B. */
function Bench({ onConfirm = () => undefined, askedOnArrival = false }: Drawn) {
	const [asking, setAsking] = useState(askedOnArrival)
	const [rowB, setRowB] = useState(true)
	return (
		<>
			<a href="#top">First link</a>
			<button type="button" onClick={() => setAsking(true)}>
				Row A
			</button>
			{rowB ? (
				<button type="button" onClick={() => setAsking(true)}>
					Row B
				</button>
			) : null}
			<div role="region" aria-label="Posts" tabIndex={-1} />
			<button type="button" onClick={() => setRowB(false)}>
				Drop Row B
			</button>
			{asking ? (
				<ConfirmDialog
					title="Empty the trash?"
					confirmLabel="Empty trash"
					cancelLabel="Cancel"
					onConfirm={onConfirm}
					onClose={() => setAsking(false)}
				/>
			) : null}
		</>
	)
}

/** Returns a control of the page, whether or not the dialog hides it. */
function pageControl(name: string): HTMLElement {
	return screen.getByRole('button', { name, hidden: true })
}

/** Returns the region of the page, whether or not the dialog hides it. */
function region(): HTMLElement {
	return screen.getByRole('region', { name: 'Posts', hidden: true })
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Waits for the dialog to take the focus and returns it, with Cancel and its confirm button. */
async function dialogInFocus() {
	const popup = await screen.findByRole('alertdialog')
	const cancel = within(popup).getByRole('button', { name: 'Cancel' })
	await expect.poll(() => document.activeElement).toBe(cancel)
	return { popup, cancel, confirm: within(popup).getByRole('button', { name: 'Empty trash' }) }
}

/** Asks the dialog by key from a control of the page and waits for the dialog to take the focus. */
async function askFrom(name: string) {
	pageControl(name).focus()
	await userEvent.keyboard('{Enter}')
	return dialogInFocus()
}

/** Waits for the dialog to leave, and for the frames in which the focus settles. */
async function left(popup: HTMLElement): Promise<void> {
	await expect.poll(() => popup.isConnected).toBe(false)
	await frames(3)
}

/** Waits for the card to end its entry and returns the middle of a control, in the page's own terms. */
async function middleOf(control: HTMLElement, popup: HTMLElement): Promise<[number, number]> {
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))
	const box = control.getBoundingClientRect()
	return [box.left + box.width / 2, box.top + box.height / 2]
}

test('puts the first focus on Cancel', async () => {
	render(<Bench />)

	const { cancel } = await askFrom('Row A')

	expect(document.activeElement).toBe(cancel)
})

test('wraps Tab inside the dialog, and Shift Tab back', async () => {
	render(<Bench />)
	const { cancel, confirm } = await askFrom('Row A')

	await userEvent.keyboard('{Tab}')
	await frames(3)
	expect(document.activeElement).toBe(confirm)

	await userEvent.keyboard('{Tab}')
	await frames(3)
	expect(document.activeElement).toBe(cancel)

	await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
	await frames(3)
	expect(document.activeElement).toBe(confirm)
})

test('keeps the focus in the popup through the exit, then lands on the control that asked it', async () => {
	render(<Bench />)
	const { popup, cancel } = await askFrom('Row A')
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))
	const focus = sampleFocus()

	await userEvent.keyboard('{Enter}')

	await expect.poll(() => popup.getAnimations().length).toBeGreaterThan(0)
	await Promise.all(popup.getAnimations().map(async (transition) => transition.finished))
	focus.stop()
	expect([...focus.seen]).toEqual([cancel])
	await left(popup)
	expect(document.activeElement).toBe(pageControl('Row A'))
})

test('leaves the focus on the page once the control that asked left, never on a control used earlier', async () => {
	render(<Bench />)
	const first = await askFrom('Row A')
	await userEvent.keyboard('{Escape}')
	await left(first.popup)
	expect(document.activeElement).toBe(pageControl('Row A'))

	const { popup } = await askFrom('Row B')
	pageControl('Drop Row B').click()
	await expect.poll(() => screen.queryByRole('button', { name: 'Row B', hidden: true })).toBeNull()
	await userEvent.keyboard('{Escape}')
	await left(popup)

	expect(document.activeElement).toBe(document.body)
})

test('keeps the focus where a handler that ended well moved it', async () => {
	render(
		<Bench
			onConfirm={async () => {
				region().focus()
			}}
		/>,
	)
	const { popup, confirm } = await askFrom('Row A')
	confirm.focus()

	await userEvent.keyboard('{Enter}')
	await left(popup)

	expect(document.activeElement).toBe(region())
})

test('leaves the focus on the page for a dialog asked from the page, never on the first link', async () => {
	render(<Bench askedOnArrival />)
	const { popup } = await dialogInFocus()

	await userEvent.keyboard('{Escape}')
	await left(popup)

	expect(document.activeElement).toBe(document.body)
})

test('sends once on a double click on the confirm button of a dialog that stays, then on Enter and Space', async () => {
	const onConfirm = vi.fn((): DialogAnswer => ({ close: false }))
	render(<Bench onConfirm={onConfirm} />)
	const { popup, confirm } = await askFrom('Row A')

	const [x, y] = await middleOf(confirm, popup)
	await commands.doubleClickAt(x, y, DOUBLE_CLICK_GAP)
	await frames(3)
	expect(onConfirm).toHaveBeenCalledOnce()

	confirm.focus()
	await userEvent.keyboard('{Enter}')
	await frames(3)
	expect(onConfirm).toHaveBeenCalledTimes(2)

	await userEvent.keyboard('[Space]')
	await frames(3)
	expect(onConfirm).toHaveBeenCalledTimes(3)
})

test('confirms nothing on a double click on a control that sits under the confirm button', async () => {
	const onConfirm = vi.fn()
	render(<Bench onConfirm={onConfirm} />)
	const measured = await askFrom('Row A')
	const [x, y] = await middleOf(measured.confirm, measured.popup)
	await userEvent.keyboard('{Escape}')
	await left(measured.popup)
	const opener = pageControl('Row A')
	Object.assign(opener.style, {
		position: 'fixed',
		left: `${x - 40}px`,
		top: `${y - 20}px`,
		width: '80px',
		height: '40px',
	})

	await commands.doubleClickAt(x, y, DOUBLE_CLICK_GAP)
	const popup = await screen.findByRole('alertdialog')
	await frames(3)

	expect(popup.isConnected).toBe(true)
	expect(onConfirm).not.toHaveBeenCalled()
})

test('sends once on a held Enter on the confirm button of a dialog that stays', async () => {
	const onConfirm = vi.fn((): DialogAnswer => ({ close: false }))
	render(<Bench onConfirm={onConfirm} />)
	const { confirm } = await askFrom('Row A')
	confirm.focus()

	await commands.holdKey('Enter', HELD_REPEATS, HELD_GAP)
	await frames(3)

	expect(onConfirm).toHaveBeenCalledOnce()
})

test('stays open on an Enter held from the control that asked it', async () => {
	const onConfirm = vi.fn()
	render(<Bench onConfirm={onConfirm} />)
	pageControl('Row A').focus()

	await commands.holdKey('Enter', HELD_REPEATS, HELD_GAP)
	const { popup } = await dialogInFocus()
	await frames(3)

	expect(popup.isConnected).toBe(true)
	expect(onConfirm).not.toHaveBeenCalled()
})
