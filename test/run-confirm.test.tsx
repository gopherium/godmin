// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import type { ActionModal } from '@wordpress/dataviews'
import { expect, onTestFinished, test, vi } from 'vitest'

import { RunConfirm } from '../src/index'
import type { RunConfirmProps } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** An item a list shows. */
interface Post {
	/** The id of the item. */
	id: string
	/** The title of the item. */
	title: string
}

/** The item the confirm runs over. */
const HELLO: Post = { id: '1', title: 'Hello' }

/**
 * Returns a run the test fulfils by hand.
 * @returns The run spy and the function that settles the run it started.
 */
function heldRun() {
	let settle = () => {}
	const run = vi.fn(
		async () =>
			new Promise<void>((done) => {
				settle = done
			}),
	)
	return { run, settle: () => settle() }
}

/**
 * Returns a run that rejects with the given error.
 * @param thrown - The error the run rejects with.
 * @returns The run spy.
 */
function failingRun(thrown: Error) {
	return vi.fn(async () => {
		throw thrown
	})
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
 * Renders a run confirm over the one item, with spies for its handlers.
 * @param props - The props beside the items, the labels and the question.
 * @returns The run and close spies.
 */
function renderConfirm(props: Partial<RunConfirmProps<Post>> = {}) {
	const run = vi.fn(async () => undefined)
	const closeModal = vi.fn()
	renderAdmin(
		<RunConfirm items={[HELLO]} closeModal={closeModal} confirmLabel="Trash" cancelLabel="Cancel" run={run} {...props}>
			Move "Hello" to the trash?
		</RunConfirm>,
	)
	return { run, closeModal, ...props }
}

/**
 * Presses a button and lets the promises it started settle.
 * @param name - The name of the button.
 */
async function press(name: string): Promise<void> {
	await act(async () => {
		fireEvent.click(screen.getByRole('button', { name }))
	})
}

test('asks its question with Cancel first and the confirm button after it', () => {
	renderConfirm()

	expect(screen.getByText('Move "Hello" to the trash?')).not.toBeNull()
	expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Cancel', 'Trash'])
})

test('runs the action over the items it was handed when confirmed, then closes', async () => {
	const { run, closeModal } = renderConfirm()

	await press('Trash')

	expect(run).toHaveBeenCalledExactlyOnceWith([HELLO])
	expect(closeModal).toHaveBeenCalledOnce()
})

test('closes only once the run settles', async () => {
	const held = heldRun()
	const { closeModal } = renderConfirm({ run: held.run })

	await press('Trash')
	expect(closeModal).not.toHaveBeenCalled()

	await act(async () => held.settle())
	expect(closeModal).toHaveBeenCalledOnce()
})

test('shows the confirm busy and keeps Cancel inert while the run goes', async () => {
	const held = heldRun()
	const { run, closeModal } = renderConfirm({ run: held.run })

	await press('Trash')
	await press('Trash')
	await press('Cancel')

	expect(screen.getByRole('button', { name: 'Trash' }).getAttribute('aria-disabled')).toBe('true')
	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled')).toBe('true')
	expect(run).toHaveBeenCalledOnce()
	expect(closeModal).not.toHaveBeenCalled()
	await act(async () => held.settle())
})

test('closes once a run that rejects settles, and hands the error on', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	const { closeModal } = renderConfirm({ run: failingRun(thrown) })

	await press('Trash')

	await waitFor(() => expect(reasons).toEqual([thrown]))
	expect(closeModal).toHaveBeenCalledOnce()
})

test('takes the confirm again after a run that rejects, when it has no way to close', async () => {
	const thrown = new Error('offline')
	const reasons = heardRejections()
	renderConfirm({ closeModal: undefined, run: failingRun(thrown) })

	await press('Trash')
	await waitFor(() => expect(reasons).toEqual([thrown]))

	expect(screen.getByRole('button', { name: 'Trash' }).getAttribute('aria-disabled')).not.toBe('true')
	expect(screen.getByRole('button', { name: 'Cancel' }).getAttribute('aria-disabled')).not.toBe('true')
})

test('closes when Cancel is pressed before anything runs', async () => {
	const { run, closeModal } = renderConfirm()

	await press('Cancel')

	expect(closeModal).toHaveBeenCalledOnce()
	expect(run).not.toHaveBeenCalled()
})

test('runs the action when it was handed no way to close, as a body drawn outside a modal', async () => {
	const { run } = renderConfirm({ closeModal: undefined })

	await press('Trash')

	expect(run).toHaveBeenCalledExactlyOnceWith([HELLO])
})

test('takes the props a DataViews action modal hands over', async () => {
	const run = vi.fn(async () => undefined)
	const closeModal = vi.fn()
	const trash: ActionModal<Post> = {
		id: 'move-to-trash',
		label: 'Move to trash',
		supportsBulk: true,
		hideModalHeader: true,
		modalFocusOnMount: 'firstContentElement',
		RenderModal: (props) => (
			<RunConfirm {...props} confirmLabel="Trash" cancelLabel="Cancel" run={run}>
				Move "Hello" to the trash?
			</RunConfirm>
		),
	}
	const { RenderModal } = trash
	renderAdmin(<RenderModal items={[HELLO]} closeModal={closeModal} onActionPerformed={vi.fn()} />)

	await press('Trash')

	expect(run).toHaveBeenCalledExactlyOnceWith([HELLO])
	expect(closeModal).toHaveBeenCalledOnce()
})
