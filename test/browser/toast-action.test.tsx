// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import * as stories from '../../stories/toaster.stories.js'

const { Plain } = composeStories(stories)

/** Half the side of the smallest press area WCAG 2.2 asks for, in pixels, less half a pixel to stay inside it. */
const HALF_TARGET = 11.5

/** Shows a toast with an action, ends its arrival and returns its action button. */
async function shownAction(): Promise<HTMLElement> {
	render(<Plain />)
	screen.getByRole('button', { name: 'Action' }).click()
	const action = await screen.findByRole('button', { name: 'Undo' })
	const item = action.closest('.godmin-toasts__item') as HTMLElement
	item.getAnimations({ subtree: true }).forEach((animation) => animation.finish())
	return action
}

test('takes a press anywhere in a square of 24 by 24 around the action, and just beside its words', async () => {
	const action = await shownAction()
	const box = action.getBoundingClientRect()
	const [x, y] = [box.left + box.width / 2, box.top + box.height / 2]

	expect(box.height, 'the words alone are shorter than the target').toBeLessThan(2 * HALF_TARGET)
	expect(document.elementFromPoint(x, y - HALF_TARGET), 'above the words').toBe(action)
	expect(document.elementFromPoint(x, y + HALF_TARGET), 'below the words').toBe(action)
	expect(document.elementFromPoint(box.left - 3, y), 'just before the words').toBe(action)
	expect(document.elementFromPoint(box.right + 3, y), 'just after the words').toBe(action)
})

test('leaves a press on the message to the toast, which it clears', async () => {
	const action = await shownAction()
	const message = action.parentElement?.querySelector('.godmin-toast__message') as HTMLElement
	const box = message.getBoundingClientRect()

	expect(document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)).toBe(message)
})
