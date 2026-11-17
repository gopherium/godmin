// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { InputControl } from '@wordpress/ui'
import type { ComponentProps } from 'react'
import { expect, waitFor } from 'storybook/test'

import { ConfirmDialog, FormDialog, RenameDialog } from '../src/index.js'
import type { DialogAnswer, FormDialogProps } from '../src/index.js'
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

/** A token with no space, as a server can answer, longer than any card is wide. */
const LONG_WORD = 'token'.repeat(55)

/** Leaves the dialog where it is, since a story never takes it away. */
const stay = () => {}

/** A write time limit in milliseconds short enough for a story to run past it on a real clock. */
const SHORT_LIMIT = 500

/** How long a story waits for the time-out to show, well past the short limit. */
const PAST_LIMIT = { timeout: SHORT_LIMIT * 5 }

/** The words a write past its time limit shows, those of WordPress. */
const NO_RESPONSE = 'Could not get a valid response from the server.'

/** Never answers, as a write does once the network drops. */
const hangs = async () => new Promise(() => {})

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

/** Checks the card has come to rest in the middle of the window, as wide as given. */
async function cardAtRest(width: number) {
	await finishMotion()
	const card = boxOf(OVERLAY_CARD)
	await meets(card.width, width, 'the card width')
	await centredIn(card, new DOMRect(0, 0, document.documentElement.clientWidth, window.innerHeight))
}

/** Checks a confirm has come to rest in the middle of the window, as wide as given, with Cancel focused. */
async function settled(width: number) {
	await cardAtRest(width)
	await expect(button('Cancel')).toHaveFocus()
}

/** The words a form whose write failed answers. */
const FORM_FAILURE = 'Could not add "Maria Perez". The phone 184467235 is already in use.'

/** How many fields the tall form holds, more than a window shows. */
const TALL_FIELDS = 30

/** The props of a form dialog story: what its write answers, its title and how many fields it holds. */
interface FormOverProps {
	onSubmit?: FormDialogProps['onSubmit']
	title?: string
	fields?: number
}

/** Renders an empty list page under a form dialog asking for a contact, its title and fields as given. */
function FormOver({ onSubmit = stay, title = 'Add contact', fields = 2 }: FormOverProps) {
	return (
		<>
			<ListPage>{null}</ListPage>
			<FormDialog
				title={title}
				description="The contact joins your list."
				submitLabel="Add"
				cancelLabel="Cancel"
				onSubmit={onSubmit}
				onClose={stay}
			>
				<InputControl label="Name" />
				{Array.from({ length: fields - 1 }, (_, at) => (
					<InputControl key={at} label={at === 0 ? 'Phone' : `Note ${at}`} />
				))}
			</FormDialog>
		</>
	)
}

/** Returns the element a selector finds inside the card on show, failing when none matches. */
function inCard(selector: string): HTMLElement {
	const found = find(OVERLAY_CARD).querySelector<HTMLElement>(selector)
	if (found === null) {
		throw new Error(`the card holds no ${selector}`)
	}
	return found
}

/** Returns the first field of the form dialog. */
function firstField(): HTMLInputElement {
	return inCard('input') as HTMLInputElement
}

/** Checks a form dialog has come to rest in the middle of the window, as wide as given, its first field focused. */
async function formSettled(width: number) {
	await cardAtRest(width)
	await waitFor(() => expect(firstField()).toHaveFocus())
}

/** Returns the box of each line the text inside an element takes. */
function lineBoxesOf(element: Element): DOMRect[] {
	const range = document.createRange()
	range.selectNodeContents(element)
	return [...range.getClientRects()].filter((rect) => rect.width > 0)
}

/** Checks the title breaks its long word and every line of the title and the description ends inside the card. */
async function wordsInCard() {
	const card = boxOf(OVERLAY_CARD)
	const title = lineBoxesOf(inCard('h2'))
	await expect(new Set(title.map((line) => line.top)).size, 'the title breaks its long word').toBeGreaterThan(1)
	for (const line of [...title, ...lineBoxesOf(inCard('p'))]) {
		await expect(line.right, 'a line runs past the card').toBeLessThanOrEqual(card.right)
	}
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

export const ConfirmWithALongWord: Story = {
	name: 'Confirm with a long word',
	parameters: { argos: { modes: NO_SHOT } },
	args: { title: `Delete "${LONG_WORD}"?`, description: `It holds ${LONG_WORD}.` },
	play: async () => {
		await settled(CARD)
		await wordsInCard()
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

export const ConfirmThatTimedOut: Story = {
	name: 'Confirm that timed out',
	parameters: { writeTimeout: SHORT_LIMIT },
	args: { onConfirm: hangs },
	play: async ({ userEvent }) => {
		await settled(CARD)
		await userEvent.click(button('Delete permanently'))
		await waitFor(() => expect(button('Cancel')).toHaveAttribute('aria-disabled', 'true'))
		await waitFor(() => expect(find(OVERLAY_CARD)).toHaveTextContent(NO_RESPONSE), PAST_LIMIT)
		await expect(button('Delete permanently')).toHaveAttribute('aria-disabled', 'false')
		await expect(button('Delete permanently').querySelector('svg')).toBeNull()
		await expect(button('Cancel')).toHaveAttribute('aria-disabled', 'false')
		await expect(button('Delete permanently')).toHaveFocus()
	},
}

export const FormThatAdds: Story = {
	name: 'Form dialog',
	render: () => <FormOver />,
	play: async () => {
		await formSettled(CARD)
		await expect(inCard('[data-wp-ui-dialog-close-icon]')).toBeVisible()
		await expect(button('Cancel').className).toMatch(/outline/)
		await expect(inCard('footer')).toContainElement(button('Add'))
	},
}

export const FormWithALongWord: Story = {
	name: 'Form dialog with a long word',
	parameters: { argos: { modes: NO_SHOT } },
	render: () => <FormOver title={`Add "${LONG_WORD}"`} />,
	play: async () => {
		await formSettled(CARD)
		await wordsInCard()
		const close = inCard('[data-wp-ui-dialog-close-icon]').getBoundingClientRect()
		await expect(close.right, 'the close icon runs past the card').toBeLessThanOrEqual(boxOf(OVERLAY_CARD).right)
	},
}

export const FormThatAddsOnAPhone: Story = {
	name: 'Form dialog, on a phone',
	...onlyAt('phone'),
	render: () => <FormOver />,
	play: async () => {
		await formSettled(PHONE - 2 * GUTTER)
	},
}

export const FormThatFailed: Story = {
	name: 'Form dialog that failed',
	render: () => <FormOver onSubmit={(): DialogAnswer => ({ error: FORM_FAILURE })} />,
	play: async ({ userEvent }) => {
		await formSettled(CARD)
		await userEvent.type(firstField(), 'Maria Perez')
		await userEvent.click(button('Add'))
		await waitFor(() => expect(inCard('form').lastElementChild).toHaveTextContent(FORM_FAILURE))
		await expect(firstField()).toHaveValue('Maria Perez')
	},
}

export const FormThatTimedOut: Story = {
	name: 'Form dialog that timed out',
	parameters: { writeTimeout: SHORT_LIMIT },
	render: () => <FormOver onSubmit={hangs} />,
	play: async ({ userEvent }) => {
		await formSettled(CARD)
		await userEvent.type(firstField(), 'Maria Perez')
		await userEvent.click(button('Add'))
		await waitFor(() => expect(button('Cancel')).toHaveAttribute('aria-disabled', 'true'))
		await waitFor(() => expect(inCard('form').lastElementChild).toHaveTextContent(NO_RESPONSE), PAST_LIMIT)
		await expect(button('Add')).not.toHaveAttribute('aria-disabled', 'true')
		await expect(button('Cancel')).not.toHaveAttribute('aria-disabled', 'true')
		await expect(inCard('[data-wp-ui-dialog-close-icon]')).not.toHaveAttribute('aria-disabled', 'true')
		await expect(firstField()).toHaveValue('Maria Perez')
		await expect(button('Add')).toHaveFocus()
	},
}

export const TallForm: Story = {
	name: 'Form dialog, tall',
	parameters: { argos: { modes: NO_SHOT } },
	render: () => <FormOver fields={TALL_FIELDS} />,
	play: async () => {
		await formSettled(CARD)
		const card = boxOf(OVERLAY_CARD)
		const body = inCard('form').parentElement as HTMLElement
		await expect(body.scrollHeight, 'the body holds more than it shows').toBeGreaterThan(body.clientHeight)
		await expect(card.bottom, 'the card ends inside the window').toBeLessThanOrEqual(window.innerHeight)
		const footer = inCard('footer').getBoundingClientRect()
		await expect(footer.bottom, 'the footer stays in the card').toBeLessThanOrEqual(card.bottom)
		await expect(inCard('header').getBoundingClientRect().top, 'the header stays in the card').toBeGreaterThanOrEqual(
			card.top,
		)
	},
}

export const Rename: Story = {
	parameters: { argos: { modes: NO_SHOT } },
	render: () => (
		<>
			<ListPage>{null}</ListPage>
			<RenameDialog
				title="Rename"
				name="Maria Perez"
				fieldLabel="Name"
				submitLabel="Save"
				cancelLabel="Cancel"
				onSubmit={stay}
				onClose={stay}
			/>
		</>
	),
	play: async ({ userEvent }) => {
		await formSettled(CARD)
		await expect(firstField()).toHaveValue('Maria Perez')
		await userEvent.clear(firstField())
		await expect(firstField()).toBeRequired()
		await expect(button('Save')).not.toHaveAttribute('aria-disabled', 'true')
	},
}
