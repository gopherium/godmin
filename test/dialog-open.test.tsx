// SPDX-License-Identifier: Apache-2.0

import { render, renderHook, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { StrictMode, useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { answerOf, isThenable, passRejectionOn, useDialogOpen, useFinalFocus } from '../src/dialog-open.js'
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
 * Draws a control on the page until the test finishes.
 * @param name - The name of the control.
 * @returns The control.
 */
function control(name: string): HTMLButtonElement {
	const drawn = document.createElement('button')
	drawn.textContent = name
	document.body.append(drawn)
	onTestFinished(() => drawn.remove())
	return drawn
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

test('answers the control that held the focus as the dialog was asked, with the focus on the page', () => {
	const opener = control('Delete')
	opener.focus()
	const { result } = renderHook(useFinalFocus)

	opener.blur()

	expect(result.current()).toBe(opener)
})

test('keeps the control noted on the first render through later renders', () => {
	const opener = control('Delete')
	const other = control('Search')
	opener.focus()
	const { result, rerender } = renderHook(useFinalFocus)
	other.focus()
	rerender()

	other.blur()

	expect(result.current()).toBe(opener)
})

test('answers false once the focus moved on to another control', () => {
	const opener = control('Delete')
	const other = control('Search')
	opener.focus()
	const { result } = renderHook(useFinalFocus)

	other.focus()

	expect(result.current()).toBe(false)
})

test('answers false for a dialog asked with the focus on the page', () => {
	const { result } = renderHook(useFinalFocus)

	expect(document.activeElement).toBe(document.body)
	expect(result.current()).toBe(false)
})

test('answers a control gone from the page, so no other control takes the focus', () => {
	const opener = control('Delete')
	opener.focus()
	const { result } = renderHook(useFinalFocus)

	opener.remove()

	expect(document.activeElement).toBe(document.body)
	expect(result.current()).toBe(opener)
})

test.each([
	{ answer: { error: 'Could not save.' }, read: { error: 'Could not save.' } },
	{ answer: { error: 'Could not save.', close: true }, read: { error: 'Could not save.' } },
	{ answer: { error: '', close: false }, read: { close: false } },
	{ answer: { close: false }, read: { close: false } },
])('stays open on the answer $answer', ({ answer, read }) => {
	expect(answerOf(answer)).toEqual(read)
})

test.each([
	{ answer: undefined },
	{ answer: null },
	{ answer: 'Could not save.' },
	{ answer: 7 },
	{ answer: {} },
	{ answer: { close: true } },
	{ answer: { close: undefined } },
	{ answer: { close: 0 } },
	{ answer: { id: '1', title: 'Hello' } },
	{ answer: { data: { id: '1' }, error: {} } },
	{ answer: { data: { id: '1' }, error: null } },
	{ answer: { error: 503 } },
	{ answer: { error: '' } },
])('closes on the answer $answer', ({ answer }) => {
	expect(answerOf(answer)).toBeUndefined()
})

test('hands on only the words of an answer with others beside them', () => {
	expect(answerOf({ error: 'Could not save.', data: { id: '1' } })).toStrictEqual({ error: 'Could not save.' })
})

test.each([
	{ shape: 'a promise', value: Promise.resolve() },
	{ shape: 'an object with then', value: { then: () => undefined } },
	{ shape: 'a function with then', value: Object.assign(() => undefined, { then: () => undefined }) },
])('takes $shape as a write still running', ({ value }) => {
	expect(isThenable(value)).toBe(true)
})

test.each([
	{ value: undefined },
	{ value: null },
	{ value: 'then' },
	{ value: 7 },
	{ value: {} },
	{ value: { then: 'later' } },
])('takes $value as no write running', ({ value }) => {
	expect(isThenable(value)).toBe(false)
})

test('stays open on a rejection and hands it on to the app once', async () => {
	const failure = new Error('Could not save.')
	const reasons: unknown[] = []
	const listener = (reason: unknown) => {
		reasons.push(reason)
	}
	process.on('unhandledRejection', listener)
	onTestFinished(() => {
		process.off('unhandledRejection', listener)
	})

	expect(passRejectionOn(failure)).toEqual({ close: false })

	await vi.waitFor(() => expect(reasons).toEqual([failure]))
})
