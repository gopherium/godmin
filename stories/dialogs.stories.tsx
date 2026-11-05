// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ComponentProps } from 'react'
import { expect, waitFor } from 'storybook/test'

import { ConfirmDialog } from '../src/dialogs.js'
import type { DialogAnswer } from '../src/dialogs.js'
import { ListPage, NO_SHOT, onlyAt } from './frames.js'
import { OVERLAY_CARD, boxOf, centredIn, find, finishMotion, meets } from './measure.js'

/** The width of a card from 608px up. */
const CARD = 560

/** How far a card keeps from each side of a narrow window. */
const GUTTER = 24

/** The width of the phone window the phone stories open at. */
const PHONE = 390

/** The words a write that failed answers. */
const FAILURE = 'Could not delete "Maria Perez". The server is not answering.'

/** Leaves the dialog where it is, since a story never takes it away. */
const stay = () => {}

/** Renders an empty list page under a confirm. */
function ConfirmOver(props: ComponentProps<typeof ConfirmDialog>) {
	return (
		<>
			<ListPage>{null}</ListPage>
			<ConfirmDialog {...props} />
		</>
	)
}

/** Returns the button of the dialog that reads as given. */
function button(name: string): HTMLElement {
	const found = [...find(OVERLAY_CARD).querySelectorAll<HTMLElement>('button')].find(
		(candidate) => candidate.textContent === name,
	)
	if (found === undefined) {
		throw new Error(`no button of the dialog reads ${name}`)
	}
	return found
}

/** Checks the card has come to rest in the middle of the window, as wide as given, with Cancel focused. */
async function settled(width: number) {
	await finishMotion()
	const card = boxOf(OVERLAY_CARD)
	await meets(card.width, width, 'the card width')
	await centredIn(card, new DOMRect(0, 0, document.documentElement.clientWidth, window.innerHeight))
	await expect(button('Cancel')).toHaveFocus()
}

const meta = {
	title: 'Components/Dialogs',
	id: 'components-dialogs',
	component: ConfirmDialog,
	args: {
		intent: 'irreversible',
		title: 'Delete "Maria Perez"?',
		description: 'This will permanently delete this contact. This action cannot be undone.',
		confirmLabel: 'Delete permanently',
		cancelLabel: 'Cancel',
		onConfirm: stay,
		onClose: stay,
	},
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
	render: (args) => <ConfirmOver {...args} />,
} satisfies Meta<typeof ConfirmDialog>

export default meta

type Story = StoryObj<typeof meta>

export const ConfirmThatRemoves: Story = {
	name: 'Confirm that removes',
	play: async () => {
		await settled(CARD)
		await expect(button('Delete permanently').className).toMatch(/irreversible/)
	},
}

export const ConfirmThatRemovesOnAPhone: Story = {
	name: 'Confirm that removes, on a phone',
	...onlyAt('phone'),
	play: async () => {
		await settled(PHONE - 2 * GUTTER)
	},
}

export const ConfirmWhileItWrites: Story = {
	name: 'Confirm while it writes',
	args: { onConfirm: async () => new Promise(() => {}) },
	play: async ({ userEvent }) => {
		await settled(CARD)
		await userEvent.click(button('Delete permanently'))
		await waitFor(() => expect(button('Delete permanently')).toHaveAttribute('aria-disabled', 'true'))
		await expect(button('Cancel')).toHaveAttribute('aria-disabled', 'true')
		await expect(button('Delete permanently').querySelector('svg')).not.toBeNull()
	},
}

export const PlainConfirm: Story = {
	name: 'Plain confirm',
	parameters: { argos: { modes: NO_SHOT } },
	args: {
		intent: 'default',
		title: 'Make this the default?',
		description: 'New items will use it.',
		confirmLabel: 'Make default',
	},
	play: async () => {
		await settled(CARD)
		await expect(button('Make default').className).not.toMatch(/irreversible/)
	},
}

export const BulkConfirm: Story = {
	name: 'Bulk confirm',
	parameters: { argos: { modes: NO_SHOT } },
	args: { title: 'Delete 3 contacts?', confirmLabel: 'Delete' },
	play: async () => {
		await settled(CARD)
		await expect(document.querySelector(OVERLAY_CARD)).toHaveAccessibleName('Delete 3 contacts?')
	},
}

export const ConfirmThatFailed: Story = {
	name: 'Confirm that failed',
	parameters: { argos: { modes: NO_SHOT } },
	args: { onConfirm: (): DialogAnswer => ({ error: FAILURE }) },
	play: async ({ userEvent }) => {
		await settled(CARD)
		await userEvent.click(button('Delete permanently'))
		await waitFor(() => expect(document.querySelector(OVERLAY_CARD)).toHaveTextContent(FAILURE))
		await expect(button('Delete permanently')).toHaveAttribute('aria-disabled', 'false')
	},
}
