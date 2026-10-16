// SPDX-License-Identifier: Apache-2.0

import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { ErrorNotice, Page, Toaster, useBulkRun, useListRun } from '../src/index'
import type { BulkRun, BulkWords } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** An item a list shows. */
interface Post {
	/** The id of the item. */
	id: string
	/** The title of the item. */
	title: string
}

/** The two items the list shows. */
const POSTS: Post[] = [
	{ id: '1', title: 'Hello' },
	{ id: '2', title: 'Maria Perez' },
]

/** The words a run over the list turns its outcome into. */
const WORDS: BulkWords<Post> = {
	done: (count, only) => (only === undefined ? `Moved to the trash: ${count}.` : `"${only.title}" moved to the trash.`),
	failed: (failures, asked) => `Not moved to the trash: ${failures.length} of ${asked}.`,
}

/** What the screen runs and what it hands back to the test. */
interface Bench {
	/** The items the Trash button runs over. */
	items: Post[]
	/** The call made for each item. */
	call: (post: Post) => Promise<unknown>
	/** Reloads the list, given the items the run acted on. */
	refresh: (items: Post[]) => Promise<unknown>
	/** The words the run reports its outcome in. */
	words: BulkWords<Post>
	/** The runs the Trash button started, in order. */
	runs: Promise<void>[]
}

/**
 * Renders the rows of a list with a Trash button that runs one call per item.
 * @param props - The bench the test set up.
 * @returns The page with its failure notice above the list.
 */
function TrashScreen({ bench }: { bench: Bench }) {
	const { failure, run, region } = useListRun('post publish', () => {})
	const bulk = useBulkRun<Post>(run, bench.refresh)
	return (
		<Page
			title="Posts"
			list
			listLabel="Posts"
			listRef={region}
			actions={
				<button type="button" onClick={() => bench.runs.push(bulk(bench.items, bench.call, bench.words))}>
					Trash
				</button>
			}
		>
			{failure === undefined ? null : <ErrorNotice>{failure}</ErrorNotice>}
		</Page>
	)
}

/**
 * Renders the list inside a toaster.
 * @param bench - The items, the call and the refresh the run takes.
 * @returns The bench, its runs filled as the Trash button starts them.
 */
function renderTrash(bench: Partial<Bench> = {}): Bench {
	const full: Bench = {
		items: POSTS,
		call: vi.fn(async () => undefined),
		refresh: vi.fn(async () => undefined),
		words: WORDS,
		runs: [],
		...bench,
	}
	renderAdmin(
		<Toaster>
			<TrashScreen bench={full} />
		</Toaster>,
	)
	return full
}

/**
 * Presses Trash, focused first as a pointer press leaves it.
 */
function pressTrash(): void {
	const button = screen.getByRole('button', { name: 'Trash' })
	button.focus()
	fireEvent.click(button)
}

/**
 * Presses Trash and waits for the run to settle.
 * @param bench - The bench whose run to wait for.
 */
async function trash(bench: Bench): Promise<void> {
	pressTrash()
	await act(async () => {
		await bench.runs.at(-1)
	})
}

/**
 * Returns the messages of the toasts on screen.
 * @returns Each toast's text, oldest first.
 */
function toasts(): string[] {
	return [...document.querySelectorAll('.godmin-toast')].map((toast) => toast.textContent ?? '')
}

/**
 * Fails the call for the item titled Hello.
 * @param post - The item the call is made for.
 * @returns A promise that rejects for Hello and fulfils for every other item.
 */
async function failHello(post: Post): Promise<unknown> {
	if (post.title === 'Hello') {
		throw new Error('refused')
	}
	return undefined
}

/**
 * Fails every call.
 * @returns A promise that rejects.
 */
async function failAll(): Promise<unknown> {
	throw new Error('refused')
}

test('runs one call per item, refreshes the list, then shows one toast in the given words', async () => {
	const order: string[] = []
	const bench = renderTrash({
		call: vi.fn(async (post: Post) => order.push(`call ${post.title}`)),
		refresh: vi.fn(async () => order.push('refresh')),
	})

	await trash(bench)

	expect(order).toEqual(['call Hello', 'call Maria Perez', 'refresh'])
	expect(bench.refresh).toHaveBeenCalledExactlyOnceWith(POSTS)
	expect(toasts()).toEqual(['Moved to the trash: 2.'])
})

test('names the one item in the toast when only one was asked', async () => {
	const bench = renderTrash({ items: [POSTS[1]] })

	await trash(bench)

	expect(toasts()).toEqual(['"Maria Perez" moved to the trash.'])
})

test('settles the list with the notice for the items that failed', async () => {
	const bench = renderTrash({ call: failHello })

	await trash(bench)

	expect(screen.getByRole('alert').textContent).toBe('Not moved to the trash: 1 of 2.')
	expect(toasts()).toEqual(['Moved to the trash: 1.'])
})

test('shows no toast when every item failed', async () => {
	const bench = renderTrash({ call: failAll })

	await trash(bench)

	expect(toasts()).toEqual([])
	expect(screen.getByRole('alert').textContent).toBe('Not moved to the trash: 2 of 2.')
})

test('focuses the list once an item finished, and leaves the focus alone when every item failed', async () => {
	await trash(renderTrash({ call: failHello }))
	expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Posts' }))
	cleanup()

	await trash(renderTrash({ call: failAll }))
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))
})

test('waits for the refresh before it settles the list', async () => {
	let reload = () => {}
	const refresh = vi.fn(
		async () =>
			new Promise<void>((done) => {
				reload = done
			}),
	)
	const bench = renderTrash({ call: failHello, refresh })
	pressTrash()
	await act(async () => {
		await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
	})

	expect(screen.queryByRole('alert')).toBeNull()
	expect(toasts()).toEqual([])
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))

	await act(async () => {
		reload()
		await bench.runs[0]
	})

	expect(screen.getByRole('alert').textContent).toBe('Not moved to the trash: 1 of 2.')
	expect(toasts()).toEqual(['Moved to the trash: 1.'])
})

test('reports what the run reached and settles it when the refresh fails, then hands the error on', async () => {
	const thrown = new Error('offline')
	const bench = renderTrash({
		call: failHello,
		refresh: vi.fn(async () => {
			throw thrown
		}),
	})

	pressTrash()
	const handed = expect(bench.runs[0]).rejects.toBe(thrown)
	await act(async () => {
		await handed
	})

	expect(screen.getByRole('alert').textContent).toBe('Not moved to the trash: 1 of 2.')
	expect(toasts()).toEqual(['Moved to the trash: 1.'])
	expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Posts' }))
})

test('settles the run when the words it reports in throw, then hands the error on', async () => {
	const thrown = new Error('no words')
	const bench = renderTrash({
		call: failHello,
		words: {
			...WORDS,
			failed: () => {
				throw thrown
			},
		},
	})

	pressTrash()
	const handed = expect(bench.runs[0]).rejects.toBe(thrown)
	await act(async () => {
		await handed
	})

	expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Posts' }))
})

/**
 * Records the bulk run a list hands on each render.
 * @param props - The refresh the run takes and the runs seen so far.
 * @returns Nothing.
 */
function RunRecorder({ refresh, seen }: { refresh: (items: Post[]) => Promise<unknown>; seen: BulkRun<Post>[] }) {
	const { run } = useListRun('post publish', () => {})
	seen.push(useBulkRun<Post>(run, refresh))
	return null
}

test('hands the same run while the list run and the refresh stay the same, and a new one for a new refresh', () => {
	const seen: BulkRun<Post>[] = []
	const refresh = vi.fn(async () => undefined)
	const { rerender } = renderAdmin(
		<Toaster>
			<RunRecorder refresh={refresh} seen={seen} />
		</Toaster>,
	)

	rerender(
		<Toaster>
			<RunRecorder refresh={refresh} seen={seen} />
		</Toaster>,
	)
	expect(seen.at(-1)).toBe(seen[0])

	rerender(
		<Toaster>
			<RunRecorder refresh={vi.fn(async () => undefined)} seen={seen} />
		</Toaster>,
	)
	expect(seen.at(-1)).not.toBe(seen[0])
})

test('clears the last failure as the run starts', async () => {
	const bench = renderTrash({ call: failHello })
	await trash(bench)
	expect(screen.getByRole('alert')).not.toBeNull()

	pressTrash()

	expect(screen.queryByRole('alert')).toBeNull()
	await act(async () => {
		await bench.runs[1]
	})
})
