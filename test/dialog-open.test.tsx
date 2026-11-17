// SPDX-License-Identifier: Apache-2.0

import { render, renderHook, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { Activity, StrictMode, useState } from 'react'
import type { ReactNode } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import {
	WriteTimeoutContext,
	answerOf,
	answered,
	checkedWriteTimeout,
	isThenable,
	passRejectionOn,
	useAnswering,
	useDialogOpen,
	useFinalFocus,
} from '../src/dialog-open.js'
import type { DialogAnswer } from '../src/dialog-open.js'
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

/** A time limit in milliseconds the writes of these tests run into. */
const SHORT_LIMIT = 5_000

/** The longest delay in milliseconds a browser timer holds. */
const LONGEST_TIMER = 2 ** 31 - 1

/** The words a write that ran out of time shows while the browser is online, WordPress's own. */
const NO_RESPONSE = 'Could not get a valid response from the server.'

/** The words a write that ran out of time shows while the browser is offline, WordPress's own. */
const OFFLINE = 'Unable to connect. Please check your Internet connection.'

/** What a dialog read from its write so far. */
interface Followed {
	/** Whether the answer came. */
	came: boolean
	/** The answer, once it came. */
	value?: DialogAnswer
}

/** Starts a write that never ends. */
const neverEnds = () => new Promise<never>(() => {})

/** Runs the clock of the test by hand until the test finishes. */
function holdClock(): void {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
	onTestFinished(() => {
		vi.useRealTimers()
	})
}

/** How far in milliseconds the fake clock moves to reach a timer set for no delay while another timer fired. */
const NEXT_TASK = 1

/** Runs the clock to the time limit and through the task after it, where a write that has not answered times out. */
async function pastLimit(): Promise<void> {
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)
	await vi.advanceTimersByTimeAsync(NEXT_TASK)
}

/**
 * Follows what a write answers a dialog.
 * @param answer - What the dialog was answered.
 * @returns Whether the answer came, and the answer once it came.
 */
function follow(answer: ReturnType<typeof answered>): Followed {
	const followed: Followed = { came: false }
	void Promise.resolve(answer).then((value) => {
		followed.came = true
		followed.value = value
	})
	return followed
}

/**
 * Notes every rejection nobody caught until the test finishes.
 * @returns The reasons, in the order they came.
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
 * Waits until a marker rejection passed on now was heard, so every rejection before it was heard too, and drops it.
 * @param reasons - The reasons heard so far.
 */
async function heardAll(reasons: unknown[]): Promise<void> {
	const marker = new Error('marker')
	void Promise.reject(marker)
	await vi.waitFor(() => expect(reasons).toContain(marker))
	reasons.splice(reasons.indexOf(marker), 1)
}

/**
 * Starts a write that hands each signal it is given to a list.
 * @param signals - Where the signals go.
 * @param run - What the write does once it has the signal.
 * @returns The write.
 */
function handing(signals: AbortSignal[], run: (signal: AbortSignal) => unknown = neverEnds) {
	return (signal: AbortSignal) => {
		signals.push(signal)
		return run(signal)
	}
}

/** How a write settles as its signal fires, given the signal and what fulfils or rejects it. */
type Settle = (signal: AbortSignal, done: (value: unknown) => void, failed: (reason: unknown) => void) => void

/**
 * Starts a write that settles as the signal fires.
 * @param settle - How it settles.
 * @returns The write.
 */
function onAbort(settle: Settle) {
	return async (signal: AbortSignal) =>
		new Promise((done, failed) => {
			signal.addEventListener('abort', () => settle(signal, done, failed))
		})
}

test('hands the write a signal that has not fired', () => {
	const signals: AbortSignal[] = []

	void answered(handing(signals), SHORT_LIMIT)

	expect(signals).toHaveLength(1)
	expect(signals[0]).toBeInstanceOf(AbortSignal)
	expect(signals[0].aborted).toBe(false)
})

test('hands every write a signal of its own', () => {
	const signals: AbortSignal[] = []

	void answered(handing(signals), SHORT_LIMIT)
	void answered(handing(signals), SHORT_LIMIT)

	expect(signals[0]).not.toBe(signals[1])
})

test('starts no clock for an answer given at once', () => {
	holdClock()

	expect(answered(() => ({ error: 'Could not save.' }), SHORT_LIMIT)).toEqual({ error: 'Could not save.' })
	expect(vi.getTimerCount()).toBe(0)
})

test('starts the clock for a write still running', () => {
	holdClock()

	void answered(neverEnds, SHORT_LIMIT)

	expect(vi.getTimerCount()).toBe(1)
})

test('reads a write that ends before the limit as it always did, and stops the clock', async () => {
	holdClock()
	const signals: AbortSignal[] = []

	const followed = follow(answered(handing(signals, async () => ({ error: 'Could not save.' })), SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(0)

	expect(followed).toEqual({ came: true, value: { error: 'Could not save.' } })
	expect(vi.getTimerCount()).toBe(0)
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)
	expect(signals[0].aborted).toBe(false)
})

test('hands on a write that rejects before the limit as it always did, and stops the clock', async () => {
	holdClock()
	const reasons = heardRejections()
	const failure = new Error('Could not save.')

	const followed = follow(answered(async () => Promise.reject(failure), SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(0)

	expect(followed).toEqual({ came: true, value: { close: false } })
	expect(vi.getTimerCount()).toBe(0)
	await vi.waitFor(() => expect(reasons).toEqual([failure]))
})

test('reads a write that rejects with nothing before the limit as a rejection, not as the time-out', async () => {
	holdClock()
	const reasons = heardRejections()

	const followed = follow(answered(async () => Promise.reject(undefined), SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(0)

	expect(followed).toEqual({ came: true, value: { close: false } })
	await vi.waitFor(() => expect(reasons).toEqual([undefined]))
})

test('fires the signal at the limit, with a reason named TimeoutError that carries the time-out words', async () => {
	holdClock()
	const signals: AbortSignal[] = []

	void answered(handing(signals), SHORT_LIMIT)
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT - 1)
	expect(signals[0].aborted).toBe(false)
	await vi.advanceTimersByTimeAsync(1)

	expect(signals[0].aborted).toBe(true)
	expect(signals[0].reason).toBeInstanceOf(DOMException)
	expect((signals[0].reason as DOMException).name).toBe('TimeoutError')
	expect((signals[0].reason as DOMException).message).toBe(NO_RESPONSE)
})

test('waits for the write until the next task once the signal fired', async () => {
	holdClock()

	const followed = follow(answered(neverEnds, SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)
	expect(followed.came).toBe(false)
	await vi.advanceTimersByTimeAsync(NEXT_TASK)

	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
})

test('keeps the answer of a write that stops on the signal', async () => {
	holdClock()

	const followed = follow(answered(onAbort((_, done) => done({ error: 'Could not rename.' })), SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)

	expect(followed).toEqual({ came: true, value: { error: 'Could not rename.' } })
})

test('keeps the answer a write gives in the steps it runs after the signal, before the next task', async () => {
	holdClock()
	const write = async (signal: AbortSignal) => {
		await new Promise((done) => signal.addEventListener('abort', done))
		await Promise.resolve()
		await Promise.resolve()
		return undefined
	}

	const followed = follow(answered(write, SHORT_LIMIT))
	await pastLimit()

	expect(followed).toEqual({ came: true, value: undefined })
})

test('reads a write that rejects with the abort it was handed as the time-out, and hands it on to nobody', async () => {
	holdClock()
	const reasons = heardRejections()

	const followed = follow(answered(onAbort((signal, _, failed) => failed(signal.reason)), SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)

	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
	await heardAll(reasons)
	expect(reasons).toEqual([])
})

test('reads a rejection of its own after the signal as the time-out, and hands it on to nobody', async () => {
	holdClock()
	const reasons = heardRejections()
	const failure = new Error('Could not rename.')

	const followed = follow(answered(onAbort((_, __, failed) => failed(failure)), SHORT_LIMIT))
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)

	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
	await heardAll(reasons)
	expect(reasons).toEqual([])
})

test('shows the time-out words once the write ran past the next task, and ignores its later answer', async () => {
	holdClock()

	const followed = follow(answered(onAbort((_, done) => setTimeout(done, SHORT_LIMIT)), SHORT_LIMIT))
	await pastLimit()
	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)

	expect(vi.getTimerCount()).toBe(0)
	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
})

test('hands on nothing for a rejection of its own that comes after the time-out showed', async () => {
	holdClock()
	const reasons = heardRejections()
	const failure = new Error('Could not rename.')

	const late = onAbort((_, __, failed) => setTimeout(failed, SHORT_LIMIT, failure))
	const followed = follow(answered(late, SHORT_LIMIT))
	await pastLimit()
	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)

	await heardAll(reasons)
	expect(reasons).toEqual([])
	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
})

test('hands on nothing for the abort it handed, when the write rejects with it after the time-out showed', async () => {
	holdClock()
	const reasons = heardRejections()

	const late = onAbort((signal, _, failed) => setTimeout(failed, SHORT_LIMIT, signal.reason))
	const followed = follow(answered(late, SHORT_LIMIT))
	await pastLimit()
	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT)

	expect(vi.getTimerCount()).toBe(0)
	await heardAll(reasons)
	expect(reasons).toEqual([])
})

test('shows the offline words when the browser is offline as the limit runs out', async () => {
	holdClock()
	const followed = follow(answered(neverEnds, SHORT_LIMIT))
	const offline = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
	onTestFinished(() => {
		offline.mockRestore()
	})

	await pastLimit()

	expect(followed).toEqual({ came: true, value: { error: OFFLINE } })
})

test.each([
	{ online: true, words: NO_RESPONSE },
	{ online: false, words: OFFLINE },
])('shows the time-out words in the language the app loaded, online $online', async ({ online, words }) => {
	holdClock()
	setLocaleData({ [words]: ['The server gave no valid answer in time.'] })
	const state = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(online)
	onTestFinished(() => {
		state.mockRestore()
		resetLocaleData()
	})

	const followed = follow(answered(neverEnds, SHORT_LIMIT))
	await pastLimit()

	expect(followed).toEqual({ came: true, value: { error: 'The server gave no valid answer in time.' } })
})

test('sets no limit without one, as outside any admin root', async () => {
	holdClock()
	const signals: AbortSignal[] = []

	const followed = follow(answered(handing(signals), undefined))
	expect(vi.getTimerCount()).toBe(0)
	await vi.advanceTimersByTimeAsync(LONGEST_TIMER)

	expect(signals[0].aborted).toBe(false)
	expect(followed.came).toBe(false)
})

test('sets no limit for Infinity, the limit of an app that turned it off', async () => {
	holdClock()
	const signals: AbortSignal[] = []

	const followed = follow(answered(handing(signals), Number.POSITIVE_INFINITY))
	expect(vi.getTimerCount()).toBe(0)
	await vi.advanceTimersByTimeAsync(LONGEST_TIMER)

	expect(signals[0].aborted).toBe(false)
	expect(followed.came).toBe(false)
})

test.each([1, SHORT_LIMIT, LONGEST_TIMER, Number.POSITIVE_INFINITY])('takes %d as a write time limit', (limit) => {
	expect(checkedWriteTimeout(limit)).toBe(limit)
})

test.each([
	{ limit: 0, shown: '0' },
	{ limit: -SHORT_LIMIT, shown: '-5000' },
	{ limit: Number.NaN, shown: 'NaN' },
	{ limit: Number.NEGATIVE_INFINITY, shown: '-Infinity' },
	{ limit: LONGEST_TIMER + 1, shown: '2147483648' },
	{ limit: '5000' as unknown as number, shown: '5000' },
])('throws for $shown, a write time limit no browser timer holds and no off switch', ({ limit, shown }) => {
	expect(() => checkedWriteTimeout(limit)).toThrow(RangeError)
	expect(() => checkedWriteTimeout(limit)).toThrow(
		`godmin: writeTimeout takes milliseconds above 0 and up to ${LONGEST_TIMER}, or Infinity for no limit, not ${shown}.`,
	)
})

test('holds the longest limit a browser timer holds', async () => {
	holdClock()
	const signals: AbortSignal[] = []

	void answered(handing(signals), LONGEST_TIMER)
	await vi.advanceTimersByTimeAsync(LONGEST_TIMER - 1)
	expect(signals[0].aborted).toBe(false)
	await vi.advanceTimersByTimeAsync(1)

	expect(signals[0].aborted).toBe(true)
})

/**
 * Draws a tree under the short time limit, as an admin root sets it.
 * @param props - The tree.
 * @returns The tree under the limit.
 */
function UnderLimit({ children }: { children: ReactNode }) {
	return <WriteTimeoutContext.Provider value={SHORT_LIMIT}>{children}</WriteTimeoutContext.Provider>
}

test('runs a write under the time limit of the nearest admin root', async () => {
	holdClock()
	const { result } = renderHook(() => useAnswering(), { wrapper: UnderLimit })

	const followed = follow(result.current(neverEnds))
	await pastLimit()

	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
})

test('runs each write under the time limit in force as it starts, though the limit changes after', async () => {
	holdClock()
	let limit = Number.POSITIVE_INFINITY
	const { result, rerender } = renderHook(() => useAnswering(), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<WriteTimeoutContext.Provider value={limit}>{children}</WriteTimeoutContext.Provider>
		),
	})
	const before = follow(result.current(neverEnds))

	limit = SHORT_LIMIT
	rerender()
	const after = follow(result.current(neverEnds))
	await pastLimit()

	expect(before).toEqual({ came: false })
	expect(after).toEqual({ came: true, value: { error: NO_RESPONSE } })
})

test('keeps the clock of a write once the dialog that started it left the page, and drops its answer', async () => {
	holdClock()
	const signals: AbortSignal[] = []
	const { result, unmount } = renderHook(() => useAnswering(), { wrapper: UnderLimit })

	const followed = follow(result.current(handing(signals)))
	unmount()
	await vi.advanceTimersByTimeAsync(SHORT_LIMIT - 1)
	expect(signals[0].aborted).toBe(false)
	await vi.advanceTimersByTimeAsync(1)
	expect(signals[0].aborted).toBe(true)
	await vi.advanceTimersByTimeAsync(NEXT_TASK)

	expect(vi.getTimerCount()).toBe(0)
	expect(followed.came).toBe(false)
})

/** A write that ends once the test says so, with an answer or a rejection. */
interface HeldOpen {
	/** The write. */
	write: () => Promise<unknown>
	/** Ends the write with an answer. */
	finish: (value: unknown) => void
	/** Ends the write with a rejection. */
	fail: (reason: unknown) => void
}

/**
 * Starts a write that ends once the test says so.
 * @returns The write, and what ends it.
 */
function heldOpen(): HeldOpen {
	const held: HeldOpen = { write: neverEnds, finish: () => {}, fail: () => {} }
	held.write = async () =>
		new Promise((done, failed) => {
			held.finish = done
			held.fail = failed
		})
	return held
}

test('reads no answer a write gives once its dialog left the page', async () => {
	holdClock()
	const held = heldOpen()
	const { result, unmount } = renderHook(() => useAnswering(), { wrapper: UnderLimit })

	const followed = follow(result.current(held.write))
	unmount()
	held.finish({ error: 'Could not save.' })
	await vi.advanceTimersByTimeAsync(0)

	expect(followed.came).toBe(false)
})

test('still hands on a rejection a write makes before the limit once its dialog left the page', async () => {
	holdClock()
	const reasons = heardRejections()
	const failure = new Error('Could not save.')
	const held = heldOpen()
	const { result, unmount } = renderHook(() => useAnswering(), { wrapper: UnderLimit })

	const followed = follow(result.current(held.write))
	unmount()
	held.fail(failure)

	await vi.waitFor(() => expect(reasons).toEqual([failure]))
	expect(followed.came).toBe(false)
})

/** What a dialog uses to run its write and read the answer. */
type Answering = ReturnType<typeof useAnswering>

/**
 * Hands what the dialog it stands for uses to run its write to the test.
 * @param props - Where it goes.
 * @returns Nothing to draw.
 */
function AnsweringProbe({ found }: { found: (answering: Answering) => void }) {
	found(useAnswering())
	return null
}

/**
 * Draws the probe of a dialog inside an Activity under the short time limit.
 * @param props - Whether the Activity shows its content, and where the probe hands its way of answering.
 * @returns The Activity.
 */
function Shown({ mode, found }: { mode: 'visible' | 'hidden'; found: (answering: Answering) => void }) {
	return (
		<UnderLimit>
			<Activity mode={mode}>
				<AnsweringProbe found={found} />
			</Activity>
		</UnderLimit>
	)
}

test('holds the answer while the dialog is hidden and gives it once the dialog shows again', async () => {
	holdClock()
	const drawn: Answering[] = []
	const found = (answering: Answering) => {
		drawn.push(answering)
	}
	const { rerender } = render(<Shown mode="visible" found={found} />)

	const followed = follow(drawn[0](neverEnds))
	rerender(<Shown mode="hidden" found={found} />)
	await pastLimit()
	expect(followed.came).toBe(false)
	rerender(<Shown mode="visible" found={found} />)
	await vi.advanceTimersByTimeAsync(0)

	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
})

test('keeps the clock of a dialog in strict mode, which draws it, takes it away and draws it again', async () => {
	holdClock()
	const { result } = renderHook(() => useAnswering(), { wrapper: UnderLimit, reactStrictMode: true })

	const followed = follow(result.current(neverEnds))
	await pastLimit()

	expect(followed).toEqual({ came: true, value: { error: NO_RESPONSE } })
})
