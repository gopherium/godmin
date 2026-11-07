// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import type { RenderResult } from '@testing-library/react'
import { setup, speak } from '@wordpress/a11y'
import { Modal, Popover as WpPopover, SlotFillProvider } from '@wordpress/components'
import { Button, Dialog, Select, Stack } from '@wordpress/ui'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { expect, onTestFinished, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { ConfirmDialog, FormDialog } from '../../src/dialogs.js'
import { Toaster, useToaster } from '../../src/index.js'

/** Loads the WordPress components stylesheet an app loads for DataViews, for the running test only. */
async function loadComponentsSheet(): Promise<void> {
	await new Promise((loaded, failed) => {
		const link = document.createElement('link')
		link.rel = 'stylesheet'
		link.href = '/node_modules/@wordpress/components/build-style/style.css'
		link.onload = loaded
		link.onerror = failed
		document.head.append(link)
		onTestFinished(() => link.remove())
	})
}

/** Draws a bench as an app draws its screens, inside the admin root and with the components stylesheet. */
async function draw(ui: ReactNode): Promise<RenderResult> {
	await loadComponentsSheet()
	return render(<AdminRoot>{ui}</AdminRoot>)
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Waits for every motion on the page to end, and for two more frames. */
async function settled(): Promise<void> {
	await Promise.all(document.getAnimations().map(async (motion) => motion.finished))
	await frames(2)
}

/** Returns the element on top at the middle of the given one. */
function topAtMiddleOf(element: Element): Element | null {
	const box = element.getBoundingClientRect()
	return document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)
}

/** Returns the dimmed layers on the page. */
function backdrops(): Element[] {
	return [...document.querySelectorAll('[class*="backdrop"]')]
}

/** Renders a form dialog that sends nothing and never closes, around the given fields. */
function FormWith({ children }: { children: ReactNode }) {
	return (
		<FormDialog
			title="Edit Page"
			submitLabel="Save"
			cancelLabel="Cancel"
			onSubmit={() => ({ close: false })}
			onClose={() => {}}
		>
			{children}
		</FormDialog>
	)
}

/** Renders a button that raises a toast and opens a form dialog. */
function ToastThenDialog() {
	const toaster = useToaster()
	const [asking, setAsking] = useState(false)
	return (
		<>
			<button
				type="button"
				onClick={() => {
					toaster.show('3 posts moved to the trash.')
					setAsking(true)
				}}
			>
				Trash and ask
			</button>
			{asking ? (
				<FormWith>
					<input aria-label="Title" />
				</FormWith>
			) : null}
		</>
	)
}

test('draws the dimmed page over a toast while a dialog is open, the toast still on the page', async () => {
	await draw(
		<Toaster>
			<ToastThenDialog />
		</Toaster>,
	)
	screen.getByRole('button', { name: 'Trash and ask' }).click()
	await screen.findByRole('dialog')
	await settled()

	const toast = document.querySelector('.godmin-toast') as Element
	expect(toast.isConnected).toBe(true)
	expect(topAtMiddleOf(toast)).toBe(backdrops()[0])
})

test('draws a WPDS select opened in a form dialog above the dialog, where a press reaches its option', async () => {
	await draw(
		<FormWith>
			<Select.Root defaultValue="draft">
				<Select.Trigger aria-label="Status" />
				<Select.Popup>
					<Select.Item value="draft">
						<Select.ItemLabel>Draft</Select.ItemLabel>
					</Select.Item>
					<Select.Item value="published">
						<Select.ItemLabel>Published</Select.ItemLabel>
					</Select.Item>
				</Select.Popup>
			</Select.Root>
		</FormWith>,
	)
	await userEvent.click(await screen.findByRole('combobox', { name: 'Status' }))
	const option = await screen.findByRole('option', { name: 'Published' })
	await settled()

	expect(option.contains(topAtMiddleOf(option))).toBe(true)
})

/** Renders a form dialog holding a button that asks a confirm drawn inside the form dialog. */
function FormAsking() {
	const [asking, setAsking] = useState(false)
	const confirm = asking ? (
		<ConfirmDialog
			title="Remove the image?"
			confirmLabel="Remove"
			cancelLabel="Keep"
			onConfirm={() => undefined}
			onClose={() => setAsking(false)}
		/>
	) : null
	return (
		<>
			<FormWith>
				<button type="button" onClick={() => setAsking(true)}>
					Remove the image
				</button>
				{confirm}
			</FormWith>
		</>
	)
}

test('draws a confirm asked from inside a form dialog above it, over one dimmed layer', async () => {
	await draw(<FormAsking />)
	;(await screen.findByRole('button', { name: 'Remove the image' })).click()
	const confirm = await screen.findByRole('alertdialog')
	await settled()

	const keep = within(confirm).getByRole('button', { name: 'Keep' })
	expect(topAtMiddleOf(keep)).toBe(keep)
	expect(backdrops()).toHaveLength(1)
})

test('draws a WordPress components popover opened in a form dialog under the card', async () => {
	await draw(
		<FormWith>
			<div>
				<WpPopover placement="bottom-start" focusOnMount={false}>
					<p>Words in a popover</p>
				</WpPopover>
			</div>
		</FormWith>,
	)
	const words = await screen.findByText('Words in a popover')
	await settled()

	const top = topAtMiddleOf(words)
	expect(words.contains(top)).toBe(false)
	expect(screen.getByRole('dialog').contains(top)).toBe(true)
})

/** Renders a button that opens a WordPress components popover, which tells when it closes. */
function PanelToggle() {
	const [open, setOpen] = useState(false)
	return (
		<div>
			<Button variant="outline" onClick={() => setOpen((now) => !now)}>
				Toggle panel
			</Button>
			{open ? (
				<WpPopover placement="bottom-start" onClose={() => setOpen(false)}>
					<Button>Inside the panel</Button>
				</WpPopover>
			) : null}
		</div>
	)
}

/** Renders a dialog drawn from the WPDS parts, with the components popover slot after its footer. */
function SlotShell({ children }: { children: ReactNode }) {
	const form = useId()
	return (
		<SlotFillProvider>
			<Dialog.Root open>
				<Dialog.Popup>
					<Dialog.Header>
						<Dialog.Title>Slot in the popup</Dialog.Title>
					</Dialog.Header>
					<Dialog.Content>
						<Stack render={<form id={form} />} direction="column" gap="lg">
							{children}
						</Stack>
					</Dialog.Content>
					<Dialog.Footer>
						<Button type="submit" form={form}>
							Save
						</Button>
					</Dialog.Footer>
					<WpPopover.Slot />
				</Dialog.Popup>
			</Dialog.Root>
		</SlotFillProvider>
	)
}

test('leaves a panel in the slot after the footer open on a press in the card, so a WordPress fix shows', async () => {
	await draw(
		<SlotShell>
			<PanelToggle />
		</SlotShell>,
	)
	await userEvent.click(await screen.findByRole('button', { name: 'Toggle panel' }))
	const inside = await screen.findByRole('button', { name: 'Inside the panel' })
	await settled()

	await userEvent.click(screen.getByRole('heading', { name: 'Slot in the popup' }))
	await frames(3)

	expect(inside.isConnected).toBe(true)
})

/** Renders a button that opens a WordPress components modal. */
function ModalToggle() {
	const [open, setOpen] = useState(false)
	return (
		<>
			<button type="button" onClick={() => setOpen(true)}>
				Pick a file
			</button>
			{open ? (
				<Modal title="Pick a file" onRequestClose={() => setOpen(false)}>
					<p>Files</p>
				</Modal>
			) : null}
		</>
	)
}

test('draws a WordPress components modal opened from a form dialog under the dialog, a known limit', async () => {
	await draw(
		<FormWith>
			<ModalToggle />
		</FormWith>,
	)
	;(await screen.findByRole('button', { name: 'Pick a file' })).click()
	await expect.poll(() => document.querySelector('.components-modal__frame')).not.toBeNull()
	await settled()

	const frame = document.querySelector('.components-modal__frame') as Element
	expect(frame.contains(topAtMiddleOf(frame))).toBe(false)
})

test('leaves the spoken region exposed while a dialog hides the rest of the page', async () => {
	setup()
	const { container } = await draw(
		<FormWith>
			<input aria-label="Title" />
		</FormWith>,
	)
	await screen.findByRole('dialog')
	await settled()
	speak('Could not save the page.', 'assertive')

	const spoken = document.getElementById('a11y-speak-assertive') as HTMLElement
	expect(container.closest('[aria-hidden="true"]')).toBe(container)
	expect(spoken.closest('[aria-hidden="true"]')).toBeNull()
})
