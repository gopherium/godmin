// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { expect, test, vi } from 'vitest'

import { useDialogOpen } from '../src/dialog-open.js'
import { installTestEnvironment } from '../src/testing.js'

installTestEnvironment()

/** Does nothing, for a test that never reads the close. */
const ignoreClose = () => {}

/**
 * Renders a popup the hook holds, with buttons that close it, reopen it and take it off the page.
 * @param props - What the hook runs on close, and where the open state of each render goes.
 * @returns The buttons, and the popup's watch while it is on the page.
 */
function Popup({ onClose, seen = [] }: { onClose: () => void; seen?: boolean[] }) {
	const { open, change, exitWatch } = useDialogOpen(onClose)
	const [onPage, setOnPage] = useState(true)
	seen.push(open)
	return (
		<>
			<button type="button" onClick={() => change(false)}>
				Close
			</button>
			<button type="button" onClick={() => change(true)}>
				Reopen
			</button>
			<button type="button" onClick={() => setOnPage(false)}>
				Leave
			</button>
			{onPage ? exitWatch : null}
		</>
	)
}

/**
 * Presses the buttons of the popup in turn.
 * @param names - The names of the buttons.
 */
async function press(...names: string[]): Promise<void> {
	for (const name of names) {
		await userEvent.click(screen.getByRole('button', { name }))
	}
}

test('stays closed on its first render and opens after the commit', () => {
	const seen: boolean[] = []

	render(<Popup onClose={ignoreClose} seen={seen} />)

	expect(seen).toEqual([false, true])
})

test('closes and opens again as it is told', async () => {
	const seen: boolean[] = []
	render(<Popup onClose={ignoreClose} seen={seen} />)

	await press('Close')
	expect(seen.at(-1)).toBe(false)

	await press('Reopen')
	expect(seen.at(-1)).toBe(true)
})

test('runs onClose once the popup left the page, not at the press', async () => {
	const onClose = vi.fn()
	render(<Popup onClose={onClose} />)

	await press('Close')
	expect(onClose).not.toHaveBeenCalled()

	await press('Leave')
	expect(onClose).toHaveBeenCalledOnce()
})

test('runs no onClose as StrictMode mounts the popup twice, and runs it once it left', async () => {
	const onClose = vi.fn()
	render(
		<StrictMode>
			<Popup onClose={onClose} />
		</StrictMode>,
	)
	expect(onClose).not.toHaveBeenCalled()

	await press('Close', 'Leave')

	expect(onClose).toHaveBeenCalledOnce()
})

test('runs the onClose of the latest render', async () => {
	const first = vi.fn()
	const latest = vi.fn()
	const { rerender } = render(<Popup onClose={first} />)
	rerender(<Popup onClose={latest} />)

	await press('Close', 'Leave')

	expect(first).not.toHaveBeenCalled()
	expect(latest).toHaveBeenCalledOnce()
})

test('runs no onClose when the app takes an open popup off the page', async () => {
	const onClose = vi.fn()
	render(<Popup onClose={onClose} />)

	await press('Leave')

	expect(onClose).not.toHaveBeenCalled()
})

test('runs no onClose for a popup opened again before it left', async () => {
	const onClose = vi.fn()
	render(<Popup onClose={onClose} />)

	await press('Close', 'Reopen', 'Leave')

	expect(onClose).not.toHaveBeenCalled()
})
