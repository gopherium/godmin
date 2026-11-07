// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { InputControl } from '@wordpress/ui'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'

import { ConfirmDialog, FormDialog } from '../../src/dialogs.js'

/** How long every transition of a dialog runs, in milliseconds. */
const DURATION = 200

/** The dialogs these tests play: a confirm, and a form dialog. */
type Shape = 'confirm' | 'form'

/** Both shapes, for the tests that hold for each. */
const SHAPES: Shape[] = ['confirm', 'form']

/** The role each shape of dialog takes. */
const ROLES: Record<Shape, string> = { confirm: 'alertdialog', form: 'dialog' }

/** Renders the dialog of the given shape, with the close it runs once it has gone. */
function dialogOf(shape: Shape, close: () => void): ReactNode {
	return shape === 'confirm' ? (
		<ConfirmDialog
			title="Empty the trash?"
			confirmLabel="Empty trash"
			cancelLabel="Cancel"
			onConfirm={() => undefined}
			onClose={close}
		/>
	) : (
		<FormDialog title="Add Page" submitLabel="Add" cancelLabel="Cancel" onSubmit={() => undefined} onClose={close}>
			<InputControl label="Title" />
		</FormDialog>
	)
}

/** Renders a button that asks a dialog of the given shape, and tells the spy when the dialog has gone. */
function Asker({ shape, onClose }: { shape: Shape; onClose: () => void }) {
	const [asking, setAsking] = useState(false)
	const close = () => {
		onClose()
		setAsking(false)
	}
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Ask
			</button>
			{asking ? dialogOf(shape, close) : null}
		</>
	)
}

/** Draws the page, asks a dialog of the given shape and returns its popup and its backdrop, with the close spy. */
async function ask(shape: Shape) {
	const onClose = vi.fn()
	render(<Asker shape={shape} onClose={onClose} />)
	screen.getByRole('button', { name: 'Ask' }).click()
	const popup = await screen.findByRole(ROLES[shape])
	return { onClose, popup, backdrop: document.querySelector('[class*="backdrop"]') as Element }
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Waits up to ten frames for an element to start its transitions and returns them, none when it starts none. */
async function transitionsOf(element: Element): Promise<CSSTransition[]> {
	for (let frame = 0; frame < 10; frame += 1) {
		const running = element.getAnimations() as CSSTransition[]
		if (running.length > 0) {
			return running
		}
		await frames(1)
	}
	return []
}

/** Reads the property, the length and the curve of each transition, with the curve named by the token it matches. */
function readings(transitions: CSSTransition[], element: Element): [string, number, string][] {
	const style = getComputedStyle(element)
	const named = (curve: string) =>
		['subtle', 'expressive'].find(
			(name) => style.getPropertyValue(`--wpds-motion-easing-${name}`).trim() === curve,
		) ?? curve
	return transitions
		.map((transition): [string, number, string] => {
			const timing = (transition.effect as KeyframeEffect).getComputedTiming()
			return [transition.transitionProperty, Number(timing.duration), named(timing.easing as string)]
		})
		.toSorted(([first], [second]) => first.localeCompare(second))
}

/** Ends the given transitions at once. */
function finish(transitions: CSSTransition[]): void {
	transitions.forEach((transition) => transition.finish())
}

/** Asks a dialog of the given shape and ends its entry at once. */
async function askAndSettle(shape: Shape) {
	const asked = await ask(shape)
	finish(await transitionsOf(asked.popup))
	await frames(2)
	return asked
}

test.each(SHAPES)('plays the entry of a %s on the card alone, its exit on the card and the backdrop', async (shape) => {
	const { popup, backdrop } = await ask(shape)

	const entry = await transitionsOf(popup)
	expect(readings(entry, popup)).toEqual([
		['opacity', DURATION, 'expressive'],
		['transform', DURATION, 'expressive'],
	])
	expect(backdrop.getAnimations(), 'the backdrop snaps in').toEqual([])
	finish(entry)
	await frames(2)

	screen.getByRole('button', { name: 'Cancel' }).click()

	const exit = await transitionsOf(popup)
	const fading = await transitionsOf(backdrop)
	expect(readings(exit, popup)).toEqual([
		['opacity', DURATION, 'expressive'],
		['transform', DURATION, 'expressive'],
	])
	expect(readings(fading, backdrop)).toEqual([['opacity', DURATION, 'subtle']])
	finish([...exit, ...fading])
})

test.each(SHAPES)('starts the entry of a %s fully faded and at nine tenths of its size', async (shape) => {
	const { popup } = await ask(shape)

	const entry = await transitionsOf(popup)
	entry.forEach((transition) => {
		transition.pause()
		transition.currentTime = 0
	})

	const style = getComputedStyle(popup)
	expect(style.opacity).toBe('0')
	expect(new DOMMatrix(style.transform).a).toBeCloseTo(0.9)
	finish(entry)
})

test.each(SHAPES)('keeps a %s on the page until its exit ended, and runs onClose after', async (shape) => {
	const { onClose, popup } = await askAndSettle(shape)

	screen.getByRole('button', { name: 'Cancel' }).click()

	const exit = await transitionsOf(popup)
	exit.forEach((transition) => transition.pause())
	await frames(3)
	expect(popup.isConnected).toBe(true)
	expect(onClose).not.toHaveBeenCalled()

	finish(exit)
	await expect.poll(() => popup.isConnected).toBe(false)
	expect(onClose).toHaveBeenCalledOnce()
})

test.each(SHAPES)('moves no %s under a reduced motion preference, and runs onClose as it leaves', async (shape) => {
	await commands.reduceMotion(true)
	const { onClose, popup, backdrop } = await ask(shape)

	await frames(3)
	expect(popup.getAnimations()).toEqual([])
	expect(backdrop.getAnimations()).toEqual([])

	screen.getByRole('button', { name: 'Cancel' }).click()

	await expect.poll(() => popup.isConnected).toBe(false)
	expect(onClose).toHaveBeenCalledOnce()
})
