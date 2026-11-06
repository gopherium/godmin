// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { commands } from 'vitest/browser'

import { Toaster, useToaster } from '../../src/index.js'
import * as stories from '../../stories/toaster.stories.js'

const { Plain } = composeStories(stories)

/** Half the side of the smallest press area WCAG 2.2 asks for, in pixels, less half a pixel to stay inside it. */
const HALF_TARGET = 11.5

/** How far past its words the action takes a press, in pixels, less half a pixel to stay inside it. */
const REACH = 7.5

/** How long a double click waits between its clicks, in milliseconds. */
const DOUBLE_CLICK_GAP = 60

/** Shows a toast with an action, ends its arrival and returns its action button. */
async function shownAction(): Promise<HTMLElement> {
	render(<Plain />)
	screen.getByRole('button', { name: 'Action' }).click()
	const action = await screen.findByRole('button', { name: 'Undo' })
	const item = action.closest('.godmin-toasts__item') as HTMLElement
	item.getAnimations({ subtree: true }).forEach((animation) => animation.finish())
	return action
}

test('takes a press anywhere in a square of 24 by 24 around the action, and up to 8px beside its words', async () => {
	const action = await shownAction()
	const box = action.getBoundingClientRect()
	const [x, y] = [box.left + box.width / 2, box.top + box.height / 2]

	expect(box.height, 'the words alone are shorter than the target').toBeLessThan(2 * HALF_TARGET)
	expect(document.elementFromPoint(x, y - HALF_TARGET), 'above the words').toBe(action)
	expect(document.elementFromPoint(x, y + HALF_TARGET), 'below the words').toBe(action)
	expect(document.elementFromPoint(box.left - REACH, y), 'up to 8px before the words').toBe(action)
	expect(document.elementFromPoint(box.right + REACH, y), 'up to 8px after the words').toBe(action)
})

/** Renders a button that shows a toast with Undo, and a control of the page the test moves under that toast. */
function UnderTheToast({ onAct, onBeneath }: { onAct: () => void; onBeneath: () => void }) {
	const toaster = useToaster()
	return (
		<>
			<button type="button" onClick={() => toaster.show('3 posts moved to the trash.', { label: 'Undo', onAct })}>
				Trash
			</button>
			<button type="button" onClick={onBeneath}>
				Beneath
			</button>
		</>
	)
}

test('keeps the second click of a double click on the action from what lies under the toast', async () => {
	const onAct = vi.fn()
	const onBeneath = vi.fn()
	render(
		<Toaster>
			<UnderTheToast onAct={onAct} onBeneath={onBeneath} />
		</Toaster>,
	)
	screen.getByRole('button', { name: 'Trash' }).click()
	const action = await screen.findByRole('button', { name: 'Undo' })
	const item = action.closest('.godmin-toasts__item') as HTMLElement
	await Promise.all(item.getAnimations({ subtree: true }).map(async (motion) => motion.finished))
	const box = action.getBoundingClientRect()
	const [x, y] = [box.left + box.width / 2, box.top + box.height / 2]
	Object.assign(screen.getByRole('button', { name: 'Beneath' }).style, {
		position: 'fixed',
		left: `${x - 40}px`,
		top: `${y - 20}px`,
		width: '80px',
		height: '40px',
	})
	expect(document.elementFromPoint(x, y), 'the action lies over the control').toBe(action)

	await commands.doubleClickAt(x, y, DOUBLE_CLICK_GAP)
	await new Promise((done) => requestAnimationFrame(done))

	expect(onAct).toHaveBeenCalledOnce()
	expect(onBeneath).not.toHaveBeenCalled()
})

test('leaves a press on the message to the toast, which it clears', async () => {
	const action = await shownAction()
	const message = action.parentElement?.querySelector('.godmin-toast__message') as HTMLElement
	const box = message.getBoundingClientRect()

	expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(message)
})
