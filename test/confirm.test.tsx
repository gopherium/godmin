// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { Button } from '@wordpress/ui'
import type { ComponentProps } from 'react'
import { expect, test, vi } from 'vitest'

import { ConfirmBody } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'
import { declaredValue, gapInPixels } from './styles.js'

installTestEnvironment()

/**
 * Renders a confirmation body asking to trash a post, with spies for its handlers.
 * @param props - The busy flag, and any prop the body no longer takes.
 * @returns The confirm and cancel spies.
 */
function renderConfirm(props: { busy?: boolean } & Record<string, unknown> = {}) {
	const onConfirm = vi.fn()
	const onCancel = vi.fn()
	renderAdmin(
		<ConfirmBody confirmLabel="Trash" cancelLabel="Cancel" onConfirm={onConfirm} onCancel={onCancel} {...props}>
			Are you sure you want to move "Hello" to the trash?
		</ConfirmBody>,
	)
	return { onConfirm, onCancel }
}

/**
 * Returns the classes a design system button draws with at the given variant and tone.
 * @param variant - The button variant to sample.
 * @param tone - The button tone to sample, the brand one when absent.
 * @returns The class list.
 */
function classesOf(
	variant: ComponentProps<typeof Button>['variant'],
	tone?: ComponentProps<typeof Button>['tone'],
): string {
	const { container, unmount } = render(
		<Button variant={variant} tone={tone}>
			probe
		</Button>,
	)
	const classes = (container.firstElementChild as Element).className
	unmount()
	return classes
}

test('asks its question', () => {
	renderConfirm()

	expect(screen.getByText('Are you sure you want to move "Hello" to the trash?')).not.toBeNull()
})

test('confirms when the confirm button is pressed', () => {
	const { onConfirm, onCancel } = renderConfirm()

	fireEvent.click(screen.getByRole('button', { name: 'Trash' }))

	expect(onConfirm).toHaveBeenCalledOnce()
	expect(onCancel).not.toHaveBeenCalled()
})

test('cancels when Cancel is pressed', () => {
	const { onConfirm, onCancel } = renderConfirm()

	fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))

	expect(onCancel).toHaveBeenCalledOnce()
	expect(onConfirm).not.toHaveBeenCalled()
})

test('draws Cancel as accent text like the WordPress Site Editor dialogs, and the confirm as the solid one', () => {
	renderConfirm()

	expect(screen.getByRole('button', { name: 'Cancel' }).className).toBe(classesOf('minimal'))
	expect(screen.getByRole('button', { name: 'Trash' }).className).toBe(classesOf('solid'))
})

test('puts the confirm button after Cancel', () => {
	renderConfirm()

	expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Cancel', 'Trash'])
})

test('keeps the confirm button from a second press while the action runs', () => {
	const { onConfirm } = renderConfirm({ busy: true })
	const confirm = screen.getByRole('button', { name: 'Trash' })

	fireEvent.click(confirm)

	expect(confirm.getAttribute('aria-disabled')).toBe('true')
	expect(onConfirm).not.toHaveBeenCalled()
})

test('greys Cancel out and keeps it from closing the modal while the action runs', () => {
	const { onConfirm, onCancel } = renderConfirm({ busy: true })
	const cancel = screen.getByRole('button', { name: 'Cancel' })

	fireEvent.click(cancel)

	expect(cancel.getAttribute('aria-disabled')).toBe('true')
	expect(cancel.hasAttribute('data-disabled'), 'the design system greys out only a data-disabled button').toBe(true)
	expect(cancel.className).toBe(classesOf('minimal'))
	expect(onCancel).not.toHaveBeenCalled()
	expect(onConfirm).not.toHaveBeenCalled()
})

test('keeps a greyed Cancel focusable, and Enter or Space on it closes nothing while the action runs', async () => {
	const { onCancel } = renderConfirm({ busy: true })
	const user = userEvent.setup()

	await user.tab()
	await user.keyboard('{Enter}')
	await user.keyboard(' ')

	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
	expect(onCancel).not.toHaveBeenCalled()
})

test('shows no failure inside the body, since a failure belongs in a toast', () => {
	renderConfirm({ failure: 'The post could not be moved to the trash.' })

	expect(screen.queryByRole('alert')).toBeNull()
	expect(screen.queryByText('The post could not be moved to the trash.')).toBeNull()
})

test('sets the question on the line WordPress gives its confirm text, 1.4 times the 13px text', () => {
	renderConfirm()
	const question = screen.getByText('Are you sure you want to move "Hello" to the trash?')

	expect(declaredValue(question, 'line-height')).toBe('1.4')
})

test('leaves 20px between the question and the buttons, as the WordPress row confirms do', () => {
	renderConfirm()
	const body = (screen.getByRole('button', { name: 'Cancel' }).parentElement as HTMLElement).parentElement

	expect(gapInPixels(body as HTMLElement)).toBe(20)
})
