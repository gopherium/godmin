// SPDX-License-Identifier: Apache-2.0

import { expect, test, vi } from 'vitest'

import { bulkNotes, runEach } from '../src/index'
import type { BulkFailure, BulkWords } from '../src/index'

test('calls once for each item with the item alone', async () => {
	const call = vi.fn(async () => {})

	await runEach(['first', 'second', 'third'], call)

	expect(call.mock.calls).toEqual([['first'], ['second'], ['third']])
})

test('counts every item done when every call resolves', async () => {
	expect(await runEach(['first', 'second'], async () => 'saved')).toEqual({ asked: 2, done: 2, failures: [] })
})

test('counts a rejected call as a failure carrying its item and its error', async () => {
	const refusedRow = { id: '1', name: 'Maria Perez' }
	const savedRow = { id: '2', name: 'Ada Lovelace' }
	const refused = new Error('refused')

	const outcome = await runEach([refusedRow, savedRow], (row) =>
		row === refusedRow ? Promise.reject(refused) : Promise.resolve(),
	)

	expect(outcome).toEqual({ asked: 2, done: 1, failures: [{ item: refusedRow, error: refused }] })
})

test('counts an answer carrying an error as a failure carrying that error', async () => {
	const refused = new Error('refused')

	const outcome = await runEach(['first', 'second'], async (item) =>
		item === 'first' ? { data: undefined, error: refused } : { data: { saved: true }, error: undefined },
	)

	expect(outcome).toEqual({ asked: 2, done: 1, failures: [{ item: 'first', error: refused }] })
})

test('counts an answer with no error as done', async () => {
	expect(await runEach(['first'], async () => ({ data: { saved: true } }))).toEqual({ asked: 1, done: 1, failures: [] })
})

test('counts an answer whose error is null as done', async () => {
	const outcome = await runEach(['first'], async () => ({ data: { saved: true }, error: null }))

	expect(outcome).toEqual({ asked: 1, done: 1, failures: [] })
})

test('counts an answer by the error it carries on the first read', async () => {
	const refused = new Error('refused')
	let reads = 0
	const answer = {
		get error() {
			reads += 1
			return reads === 1 ? refused : undefined
		},
	}

	const outcome = await runEach(['first'], async () => answer)

	expect(outcome).toEqual({ asked: 1, done: 0, failures: [{ item: 'first', error: refused }] })
})

test('counts a call that throws before it returns a promise as a failure', async () => {
	const refused = new Error('refused')

	const outcome = await runEach(['first', 'second'], (item) => {
		if (item === 'first') {
			throw refused
		}
		return Promise.resolve()
	})

	expect(outcome).toEqual({ asked: 2, done: 1, failures: [{ item: 'first', error: refused }] })
})

test('starts every call before any of them finishes', async () => {
	const started: string[] = []
	const finishes: (() => void)[] = []

	const running = runEach(['first', 'second'], (item) => {
		started.push(item)
		return new Promise<void>((resolve) => finishes.push(resolve))
	})

	expect(started).toEqual(['first', 'second'])
	finishes.forEach((finish) => finish())
	expect(await running).toEqual({ asked: 2, done: 2, failures: [] })
})

test('lists the failures in the order of the items', async () => {
	const outcome = await runEach(['first', 'second', 'third'], async (item) => {
		if (item === 'second') {
			await Promise.resolve()
			throw new Error('late')
		}
		if (item === 'third') {
			throw new Error('early')
		}
	})

	expect(outcome.failures.map((failure) => failure.item)).toEqual(['second', 'third'])
})

test('keeps acting on the items it was given while the calls change the list', async () => {
	const refused = new Error('refused')
	const rows = ['first', 'second']

	const outcome = await runEach(rows, async (item) => {
		rows.splice(0, rows.length, 'other')
		if (item === 'second') {
			throw refused
		}
	})

	expect(outcome).toEqual({ asked: 2, done: 1, failures: [{ item: 'second', error: refused }] })
})

test('leaves an empty slot in the items out of the calls and the counts', async () => {
	const call = vi.fn(async () => {})
	const rows: string[] = []
	rows[0] = 'first'
	rows[2] = 'third'

	expect(await runEach(rows, call)).toEqual({ asked: 2, done: 2, failures: [] })
	expect(call.mock.calls).toEqual([['first'], ['third']])
})

test('asks nothing when no item is given', async () => {
	const call = vi.fn(async () => {})

	expect(await runEach([], call)).toEqual({ asked: 0, done: 0, failures: [] })
	expect(call).not.toHaveBeenCalled()
})

/** The words a test hands the notes, each echoing what it was given. */
const echo: BulkWords<string> = {
	done: (count, only) => `done ${count} ${only ?? 'none'}`,
	failed: (failures: BulkFailure<string>[], asked) =>
		`failed ${failures.map((failure) => `${failure.item}:${String(failure.error)}`).join(',')} of ${asked}`,
}

/**
 * Runs a bulk action whose call refuses the named items, and returns its notes.
 * @param items - The items to act on.
 * @param refused - The items whose call rejects with their own name.
 * @returns The toast and the notice the outcome reads as.
 */
async function notesFor(items: string[], refused: string[] = []) {
	const outcome = await runEach(items, async (item) => {
		if (refused.includes(item)) {
			throw item
		}
	})
	return bulkNotes(items, outcome, echo)
}

test('toasts how many finished and notices nothing when every call finished', async () => {
	expect(await notesFor(['first', 'second'])).toEqual({ toast: 'done 2 none' })
})

test('hands the toast words the one item asked, so the toast can name it', async () => {
	expect(await notesFor(['first'])).toEqual({ toast: 'done 1 first' })
})

test('hands the toast words no item when several were asked, even when only one finished', async () => {
	expect((await notesFor(['first', 'second'], ['second'])).toast).toBe('done 1 none')
})

test('hands the notice words every failure and how many items were asked', async () => {
	expect((await notesFor(['first', 'second', 'third'], ['first', 'third'])).notice).toBe(
		'failed first:first,third:third of 3',
	)
})

test('raises a toast and a notice when some calls finished and some failed', async () => {
	expect(await notesFor(['first', 'second'], ['first'])).toEqual({
		toast: 'done 1 none',
		notice: 'failed first:first of 2',
	})
})

test('toasts nothing when no call finished', async () => {
	expect(await notesFor(['first'], ['first'])).toEqual({ notice: 'failed first:first of 1' })
})

test('raises nothing when no item was asked', async () => {
	expect(await notesFor([])).toEqual({})
})

test('leaves out the toast or the notice it has no words for', async () => {
	expect(Object.keys(await notesFor([]))).toEqual([])
	expect(Object.keys(await notesFor(['first'], ['first']))).toEqual(['notice'])
	expect(Object.keys(await notesFor(['first']))).toEqual(['toast'])
})

test('names the one item asked when the items hold an empty slot before it', async () => {
	const rows: string[] = []
	rows[1] = 'second'

	const outcome = await runEach(rows, async () => {})

	expect(bulkNotes(rows, outcome, echo)).toEqual({ toast: 'done 1 second' })
})
