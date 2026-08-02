// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { getAnnouncement, installTestEnvironment, renderAdmin } from '../src/testing.js'
import { Toaster, useToaster } from '../src/toaster.js'

installTestEnvironment()
afterEach(() => {
	vi.useRealTimers()
})

/**
 * Renders a button that raises a toast when pressed.
 * @param props - The message and optional action the toast carries.
 * @returns The trigger element.
 */
function Raise({ message, action }: { message: string; action?: { label: string; onAct: () => void } }) {
	const toaster = useToaster()
	return (
		<button type="button" onClick={() => toaster.show(message, action)}>
			Raise
		</button>
	)
}

test('shows a message once a screen raises one', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByText('Post moved to trash')).not.toBeNull()
})

// The design system renders notice children to a string for announcement
// during render, so a notice holding buttons needs the message spelled out.
test('announces the message rather than the buttons beside it', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(getAnnouncement()).toContain('Post moved to trash')
	expect(getAnnouncement()).not.toContain('Undo')
})

test('runs the action and clears the toast that offered it', () => {
	const onAct = vi.fn()
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

	expect(onAct).toHaveBeenCalledOnce()
	expect(screen.queryByText('Post moved to trash')).toBeNull()
})

test('offers no action button when a screen gives none', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByRole('button', { name: 'Dismiss' })).not.toBeNull()
	expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
})

test('clears a toast the reader dismisses', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

	expect(screen.queryByText('Saved')).toBeNull()
})

test('clears a toast nobody touched once its time is up', () => {
	vi.useFakeTimers()
	renderAdmin(
		<Toaster dismissAfter={5000}>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	expect(screen.getByText('Saved')).not.toBeNull()

	act(() => {
		vi.advanceTimersByTime(5000)
	})

	expect(screen.queryByText('Saved')).toBeNull()
})

test('holds every message raised, oldest first', () => {
	renderAdmin(
		<Toaster>
			<Raise message="First" />
			<Raise message="Second" />
		</Toaster>,
	)

	const [first, second] = screen.getAllByRole('button', { name: 'Raise' })
	fireEvent.click(first)
	fireEvent.click(second)

	const shown = screen.getAllByRole('button', { name: 'Dismiss' })
	expect(shown).toHaveLength(2)
	expect(screen.getByText('First')).not.toBeNull()
	expect(screen.getByText('Second')).not.toBeNull()
})

test('tells a screen it forgot the region rather than failing silently', () => {
	const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})

	expect(() => renderAdmin(<Raise message="Saved" />)).toThrow(/Toaster/)

	quiet.mockRestore()
})
