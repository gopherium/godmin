// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import { DropdownMenu, MenuGroup, MenuItem, Modal } from '@wordpress/components'
import { AlertDialog, Dialog, Menu } from '@wordpress/ui'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { expect, test } from 'vitest'
import { userEvent } from 'vitest/browser'

import { Page, Toaster, useListRun } from '../../src/index.js'
import type { ListRunState, RunSettled } from '../../src/index.js'

/** Keeps the ticked rows as they are, since these lists tick none. */
const keepTicks = () => {}

/** What a dialog on a screen draws: whether it is asked, what closes it and what starts a run. */
interface Asked {
	/** Whether the screen asks the dialog. */
	asking: boolean
	/** Takes the dialog away. */
	close: () => void
	/** Starts a run on the list. */
	startRun: () => void
}

/**
 * Renders a list with Empty Trash in its header, which asks a dialog that starts a run.
 * @param props - What the dialog draws, and where each run's settle goes.
 * @returns The list, its header button and the dialog.
 */
function TrashScreen({ dialog, settles }: { dialog: (asked: Asked) => ReactNode; settles: RunSettled[] }) {
	const [asking, setAsking] = useState(false)
	const list: ListRunState = useListRun('post trash', keepTicks)
	const startRun = () => {
		settles.push(list.run.onStart())
	}
	return (
		<>
			<Page
				title="Posts"
				list
				listLabel="Posts"
				listRef={list.region}
				actions={
					<button type="button" onClick={() => setAsking(true)}>
						Empty Trash
					</button>
				}
			>
				<button type="button">Restore</button>
			</Page>
			{dialog({ asking, close: () => setAsking(false), startRun })}
		</>
	)
}

/** Draws a WPDS alert dialog, whose focus guards sit beside its popup. */
function alertDialog({ asking, close, startRun }: Asked): ReactNode {
	return (
		<AlertDialog.Root open={asking} onOpenChange={(open) => (open ? undefined : close())} onConfirm={startRun}>
			<AlertDialog.Popup title="Empty the trash?" confirmButtonText="Empty trash">
				Gone for good.
			</AlertDialog.Popup>
		</AlertDialog.Root>
	)
}

/** Draws the button that starts a run and closes the dialog around it. */
function SaveButton({ close, startRun }: Pick<Asked, 'close' | 'startRun'>) {
	return (
		<button
			type="button"
			onClick={() => {
				startRun()
				close()
			}}
		>
			Save
		</button>
	)
}

/** Draws a WPDS dialog around what the screen gives it. */
function WpdsDialog({ asking, close, children }: Pick<Asked, 'asking' | 'close'> & { children: ReactNode }) {
	return (
		<Dialog.Root open={asking} onOpenChange={(open) => (open ? undefined : close())}>
			<Dialog.Popup>
				<Dialog.Header>
					<Dialog.Title>Edit</Dialog.Title>
				</Dialog.Header>
				<Dialog.Content>{children}</Dialog.Content>
			</Dialog.Popup>
		</Dialog.Root>
	)
}

/** Draws a WPDS dialog holding a WPDS menu, whose items sit in a portal outside the dialog. */
function dialogWithMenu({ asking, close, startRun }: Asked): ReactNode {
	return (
		<WpdsDialog asking={asking} close={close}>
			<Menu.Root>
				<Menu.Trigger>More</Menu.Trigger>
				<Menu.Popup>
					<Menu.Item>
						<Menu.ItemLabel>First</Menu.ItemLabel>
					</Menu.Item>
					<Menu.Item>
						<Menu.ItemLabel>Pick</Menu.ItemLabel>
					</Menu.Item>
				</Menu.Popup>
			</Menu.Root>
			<SaveButton close={close} startRun={startRun} />
		</WpdsDialog>
	)
}

/** Draws a components modal holding a components menu, whose items sit in a portal outside the modal. */
function modalWithMenu({ asking, close, startRun }: Asked): ReactNode {
	return asking ? (
		<Modal title="Edit" onRequestClose={close}>
			<DropdownMenu label="More" icon={null} text="More" toggleProps={{ 'aria-label': 'More' }}>
				{({ onClose }) => (
					<MenuGroup>
						<MenuItem onClick={onClose}>First</MenuItem>
						<MenuItem onClick={onClose}>Pick</MenuItem>
					</MenuGroup>
				)}
			</DropdownMenu>
			<SaveButton close={close} startRun={startRun} />
		</Modal>
	) : null
}

/** Draws Delete, which asks a nested alert dialog, beside Save. */
function DeleteAndSave({ close, startRun }: Pick<Asked, 'close' | 'startRun'>) {
	const [nested, setNested] = useState(false)
	return (
		<>
			<button type="button" onClick={() => setNested(true)}>
				Delete
			</button>
			<SaveButton close={close} startRun={startRun} />
			<AlertDialog.Root open={nested} onOpenChange={(open) => (open ? undefined : setNested(false))}>
				<AlertDialog.Popup title="Delete it?" confirmButtonText="Delete it">
					Gone for good.
				</AlertDialog.Popup>
			</AlertDialog.Root>
		</>
	)
}

/** Draws a WPDS dialog that asks a nested alert dialog. */
function dialogAskingAlert({ asking, close, startRun }: Asked): ReactNode {
	return (
		<WpdsDialog asking={asking} close={close}>
			<DeleteAndSave close={close} startRun={startRun} />
		</WpdsDialog>
	)
}

/** Draws a components modal that asks a nested alert dialog. */
function modalAskingAlert({ asking, close, startRun }: Asked): ReactNode {
	return asking ? (
		<Modal title="Edit" onRequestClose={close}>
			<DeleteAndSave close={close} startRun={startRun} />
		</Modal>
	) : null
}

/**
 * Waits for the given number of frames.
 * @param count - How many frames to wait.
 */
async function frames(count: number): Promise<void> {
	for (let drawn = 0; drawn < count; drawn += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/**
 * Draws the screen and opens its dialog by key from Empty Trash.
 * @param dialog - What the dialog draws.
 * @param role - The role of its popup.
 * @returns The popup and where each run's settle goes.
 */
async function openFromHeader(dialog: (asked: Asked) => ReactNode, role: string) {
	const settles: RunSettled[] = []
	render(
		<Toaster>
			<TrashScreen dialog={dialog} settles={settles} />
		</Toaster>,
	)
	screen.getByRole('button', { name: 'Empty Trash' }).focus()
	await userEvent.keyboard('{Enter}')
	const popup = await screen.findByRole(role)
	await expect.poll(() => popup.contains(document.activeElement)).toBe(true)
	return { popup, settles }
}

/**
 * Waits for the dialog to leave with the focus back on Empty Trash, then settles the run and reads the focus.
 * @param popup - The popup of the dialog.
 * @param settles - Where each run's settle goes.
 */
async function expectListTakesFocus(popup: HTMLElement, settles: RunSettled[]): Promise<void> {
	await expect.poll(() => settles.length).toBe(1)
	await expect.poll(() => popup.isConnected).toBe(false)
	await frames(3)
	const opener = screen.getByRole('button', { name: 'Empty Trash' })
	expect(document.activeElement, 'the focus once the dialog left').toBe(opener)

	settles[0](true)

	expect(document.activeElement, 'the focus once the run moved an item').toBe(
		screen.getByRole('region', { name: 'Posts' }),
	)
}

/**
 * Steps to the second item of the menu inside a dialog and picks it by key, then presses Save by key.
 * @param popup - The popup of the dialog.
 */
async function pickThenSave(popup: HTMLElement): Promise<void> {
	within(popup).getByRole('button', { name: 'More' }).focus()
	await userEvent.keyboard('{Enter}')
	const pick = await screen.findByRole('menuitem', { name: 'Pick' })
	await expect.poll(() => document.activeElement?.getAttribute('role')).toBe('menuitem')
	await expect
		.poll(async () => {
			if (document.activeElement !== pick) {
				await userEvent.keyboard('{ArrowDown}')
			}
			return document.activeElement
		})
		.toBe(pick)
	await userEvent.keyboard('{Enter}')
	await expect.poll(() => screen.queryByRole('menuitem', { name: 'Pick' })).toBeNull()
	await frames(3)
	within(popup).getByRole('button', { name: 'Save' }).focus()
	await userEvent.keyboard('{Enter}')
}

test.each([
	{ move: 'one Tab to the confirm button', keys: ['{Tab}'] },
	{ move: 'a Tab that wraps round through the focus guards', keys: ['{Tab}', '{Tab}', '{Tab}'] },
	{ move: 'a Shift Tab from Cancel through the focus guard', keys: ['{Shift>}{Tab}{/Shift}'] },
])('takes the focus from the button that opened an alert dialog after $move', async ({ keys }) => {
	const { popup, settles } = await openFromHeader(alertDialog, 'alertdialog')
	for (const key of keys) {
		await userEvent.keyboard(key)
		await frames(3)
	}
	expect(document.activeElement, 'the focus before the press').toBe(
		within(popup).getByRole('button', { name: 'Empty trash' }),
	)

	await userEvent.keyboard('{Enter}')

	await expectListTakesFocus(popup, settles)
})

test.each([
	{ shell: 'a WPDS dialog', dialog: dialogWithMenu },
	{ shell: 'a components modal', dialog: modalWithMenu },
])('takes the focus from the button that opened $shell after a pick in a menu inside it', async ({ dialog }) => {
	const { popup, settles } = await openFromHeader(dialog, 'dialog')

	await pickThenSave(popup)

	await expectListTakesFocus(popup, settles)
})

test.each([
	{ shell: 'a WPDS dialog', dialog: dialogAskingAlert },
	{ shell: 'a components modal', dialog: modalAskingAlert },
])('takes the focus from the button that opened $shell after a guard of a nested alert dialog', async ({ dialog }) => {
	const { popup, settles } = await openFromHeader(dialog, 'dialog')
	within(popup).getByRole('button', { name: 'Delete' }).focus()
	await userEvent.keyboard('{Enter}')
	const nested = await screen.findByRole('alertdialog', { hidden: true })
	await expect.poll(() => nested.contains(document.activeElement)).toBe(true)
	await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
	await frames(3)
	await userEvent.keyboard('{Escape}')
	await expect.poll(() => nested.isConnected).toBe(false)
	await frames(3)

	within(popup).getByRole('button', { name: 'Save', hidden: true }).focus()
	await userEvent.keyboard('{Enter}')

	await expectListTakesFocus(popup, settles)
})
