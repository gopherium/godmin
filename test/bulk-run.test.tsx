// SPDX-License-Identifier: Apache-2.0

import { act, cleanup, fireEvent, screen } from '@testing-library/react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { Page, Toaster, useBulkRun, useListRun } from '../src/index'
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

/** The two items and a third, for a run whose calls end one by one. */
const THREE: Post[] = [...POSTS, { id: '3', title: 'Goodbye' }]

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
	/** Whether the list reloaded on each render, in order. */
	reloads: boolean[]
	/** Whether the Trash button sits in a footer that turns inert while the list reloads, as DataViews' footer does. */
	inertFooter: boolean
	/** Whether Add Post sits in a header part, outside the list region, that turns inert while the list reloads. */
	inertHeader: boolean
}

/** How a run has settled so far. */
interface Settling {
	/** Whether the run is still going, resolved or rejected. */
	state: 'pending' | 'resolved' | 'rejected'
	/** What the run rejected with, once it did. */
	reason?: unknown
}

/**
 * Renders a list with a search field and a Trash button inside it, where DataViews draws its bulk bar, beside Add Post.
 * @param props - The bench the test set up.
 * @returns The page with its list.
 */
function TrashScreen({ bench }: { bench: Bench }) {
	const { run, region, refreshing } = useListRun('post publish', () => {})
	const bulk = useBulkRun<Post>(run, bench.refresh)
	bench.reloads.push(refreshing)
	return (
		<Page
			title="Posts"
			list
			listLabel="Posts"
			listRef={region}
			actions={
				<div inert={bench.inertHeader && refreshing}>
					<button type="button">Add Post</button>
				</div>
			}
		>
			<input type="search" aria-label="Search posts" />
			<p>Hello</p>
			<div inert={bench.inertFooter && refreshing}>
				<button type="button" onClick={() => bench.runs.push(bulk(bench.items, bench.call, bench.words))}>
					Trash
				</button>
			</div>
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
		reloads: [],
		inertFooter: false,
		inertHeader: false,
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
 * Lets every promise already on its way run its callbacks, and React render what they changed.
 */
async function drain(): Promise<void> {
	await act(async () => {
		await new Promise((done) => setTimeout(done, 0))
	})
}

/**
 * Watches how a run settles.
 * @param run - The run to watch.
 * @returns How the run has settled so far, kept up to date.
 */
function watch(run: Promise<void>): Settling {
	const settling: Settling = { state: 'pending' }
	void run.then(
		() => {
			settling.state = 'resolved'
		},
		(reason: unknown) => {
			settling.state = 'rejected'
			settling.reason = reason
		},
	)
	return settling
}

/**
 * Returns a refresh the test ends or fails by hand.
 * @returns The refresh spy, the function that ends the reload it started and the one that fails it.
 */
function heldRefresh() {
	let reload = () => {}
	let fail = (_reason: Error) => {}
	const refresh = vi.fn(
		async () =>
			new Promise<void>((done, failed) => {
				reload = done
				fail = failed
			}),
	)
	return { refresh, reload: () => reload(), fail: (reason: Error) => fail(reason) }
}

/**
 * Returns a call the test ends by hand, for every item at once or for one item at a time.
 * @returns The call spy, the function that finishes every call made so far, and the one that ends one item's call.
 */
function heldCalls() {
	const waiting = new Map<Post, { done: () => void; failed: (reason: Error) => void }>()
	const call = vi.fn(
		async (post: Post) =>
			new Promise<void>((done, failed) => {
				waiting.set(post, { done, failed })
			}),
	)
	const finish = () => {
		for (const { done } of waiting.values()) {
			done()
		}
	}
	const end = async (post: Post, worked = true) => {
		const held = waiting.get(post)
		await act(async () => (worked ? held?.done() : held?.failed(new Error('refused'))))
		await drain()
	}
	return { call, finish, end }
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
 * Returns the messages of the toasts on screen.
 * @returns Each toast's text, oldest first.
 */
function toasts(): string[] {
	return [...document.querySelectorAll('.godmin-toast')].map((toast) => toast.textContent ?? '')
}

/**
 * Returns the list region a finished run focuses.
 * @returns The region named Posts.
 */
function listRegion(): HTMLElement {
	return screen.getByRole('region', { name: 'Posts' })
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

test('runs one call per item, shows one toast in the given words, then refreshes the list', async () => {
	const order: string[] = []
	const bench = renderTrash({
		call: vi.fn(async (post: Post) => order.push(`call ${post.title}`)),
		refresh: vi.fn(async () => order.push('refresh')),
		words: {
			...WORDS,
			done: (count, only) => {
				order.push('toast')
				return WORDS.done(count, only)
			},
		},
	})

	await trash(bench)

	expect(order).toEqual(['call Hello', 'call Maria Perez', 'toast', 'refresh'])
	expect(bench.refresh).toHaveBeenCalledExactlyOnceWith(POSTS)
	expect(toasts()).toEqual(['Moved to the trash: 2.'])
})

test('names the one item in the toast when only one was asked', async () => {
	const bench = renderTrash({ items: [POSTS[1]] })

	await trash(bench)

	expect(toasts()).toEqual(['"Maria Perez" moved to the trash.'])
})

test('shows one toast with the failure words when an item failed, as the WordPress Trash does', async () => {
	const bench = renderTrash({ call: failHello })

	await trash(bench)

	expect(toasts()).toEqual(['Not moved to the trash: 1 of 2.'])
	expect(screen.queryByRole('alert')).toBeNull()
})

test('shows one toast with the failure words when every item failed', async () => {
	const bench = renderTrash({ call: failAll })

	await trash(bench)

	expect(toasts()).toEqual(['Not moved to the trash: 2 of 2.'])
	expect(screen.queryByRole('alert')).toBeNull()
})

test('shows no toast for a run handed no items', async () => {
	const bench = renderTrash({ items: [] })

	await trash(bench)

	expect(toasts()).toEqual([])
	expect(bench.refresh).toHaveBeenCalledExactlyOnceWith([])
})

test('focuses the list once an item finished, and leaves the focus alone when every item failed', async () => {
	const { refresh, reload } = heldRefresh()
	await trash(renderTrash({ call: failHello, refresh }))
	expect(document.activeElement).toBe(listRegion())
	await act(async () => reload())
	cleanup()

	await trash(renderTrash({ call: failAll }))
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))
})

test('shows its toast and settles the run as the calls end, while the refresh still runs', async () => {
	const { refresh, reload } = heldRefresh()
	renderTrash({ call: failHello, refresh })

	pressTrash()
	await drain()

	expect(refresh).toHaveBeenCalledOnce()
	expect(toasts()).toEqual(['Not moved to the trash: 1 of 2.'])
	expect(document.activeElement).toBe(listRegion())
	await act(async () => reload())
})

test('marks the list reloading while refresh runs, and no longer once it ends', async () => {
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ refresh })
	const before = bench.reloads.at(-1)

	pressTrash()
	await drain()
	const during = bench.reloads.at(-1)
	await act(async () => reload())
	await drain()

	expect(refresh).toHaveBeenCalledOnce()
	expect([before, during, bench.reloads.at(-1)]).toEqual([false, true, false])
})

test('ends the reload it marked when refresh settles at once', async () => {
	const bench = renderTrash()

	await trash(bench)
	await drain()

	expect(bench.refresh).toHaveBeenCalledOnce()
	expect(bench.reloads.at(-1)).toBe(false)
})

test('marks the list again for a second run on the same list', async () => {
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ refresh })
	pressTrash()
	await drain()
	const first = bench.reloads.at(-1)
	await act(async () => reload())
	await drain()
	const between = bench.reloads.at(-1)

	pressTrash()
	await drain()

	expect([first, between, bench.reloads.at(-1)]).toEqual([true, false, true])
	expect(refresh).toHaveBeenCalledTimes(2)
	await act(async () => reload())
})

test('leaves the list unmarked when every call failed, and still refreshes it', async () => {
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ call: failAll, refresh })

	pressTrash()
	await drain()

	expect(refresh).toHaveBeenCalledExactlyOnceWith(POSTS)
	expect(bench.reloads).not.toContain(true)
	await act(async () => reload())
})

test('hands the failure words the error each call rejected or answered with, and marks no reload', async () => {
	const refused = new Error('refused')
	const answered = { message: 'not allowed' }
	const seen: unknown[] = []
	const bench = renderTrash({
		call: async (post) => {
			if (post.title === 'Hello') {
				throw refused
			}
			return { error: answered }
		},
		words: {
			...WORDS,
			failed: (failures, asked) => {
				seen.push(...failures.map((failure) => failure.error))
				return WORDS.failed(failures, asked)
			},
		},
	})

	await trash(bench)

	expect(seen).toHaveLength(2)
	expect(seen[0]).toBe(refused)
	expect(seen[1]).toBe(answered)
	expect(bench.reloads).not.toContain(true)
})

test('marks the list reloading as its first call that works ends, while the other calls still run', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ call: calls.call, refresh })
	pressTrash()
	const run = watch(bench.runs[0])
	await drain()
	const before = bench.reloads.at(-1)

	await calls.end(POSTS[0])

	expect([before, bench.reloads.at(-1)]).toEqual([false, true])
	expect(run.state).toBe('pending')
	expect(refresh).not.toHaveBeenCalled()
	await calls.end(POSTS[1])
	await act(async () => reload())
})

test('shows its toast, settles and resolves only once the last call ended, the list already reloading', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ call: calls.call, refresh })
	pressTrash()
	const run = watch(bench.runs[0])
	await calls.end(POSTS[0])
	const midway = [bench.reloads.at(-1), run.state, toasts(), document.activeElement?.textContent]

	await calls.end(POSTS[1])

	expect(midway).toEqual([true, 'pending', [], 'Trash'])
	expect([run.state, toasts()]).toEqual(['resolved', ['Moved to the trash: 2.']])
	expect(document.activeElement).toBe(listRegion())
	expect(refresh).toHaveBeenCalledExactlyOnceWith(POSTS)
	await act(async () => reload())
})

test('marks the list once however many calls work, so it is no longer marked once refresh ends', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ items: THREE, call: calls.call, refresh })
	pressTrash()
	const marked: (boolean | undefined)[] = []
	for (const post of THREE) {
		await calls.end(post)
		marked.push(bench.reloads.at(-1))
	}

	await act(async () => reload())
	await drain()

	expect(marked).toEqual([true, true, true])
	expect(bench.reloads.at(-1)).toBe(false)
})

test('marks the list reloading at the first call that works after earlier calls failed', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ items: THREE, call: calls.call, refresh })
	pressTrash()

	await calls.end(THREE[0], false)
	const afterFailure = bench.reloads.at(-1)
	await calls.end(THREE[1])

	expect([afterFailure, bench.reloads.at(-1)]).toEqual([false, true])
	expect(toasts()).toEqual([])
	await calls.end(THREE[2])
	expect(toasts()).toEqual(['Not moved to the trash: 1 of 3.'])
	await act(async () => reload())
})

test('focuses the list at the last call when the focus fell to the page as the list went inert mid run', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ call: calls.call, refresh })
	pressTrash()
	await calls.end(POSTS[0])
	const marked = bench.reloads.at(-1)
	act(() => (document.activeElement as HTMLElement).blur())
	const fell = document.activeElement

	await calls.end(POSTS[1])

	expect([marked, fell]).toEqual([true, document.body])
	expect(document.activeElement).toBe(listRegion())
	await act(async () => reload())
})

test('moves the focus to the list region as the first call that works makes its part inert, mid run', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ call: calls.call, refresh, inertFooter: true })
	pressTrash()
	const run = watch(bench.runs[0])

	await calls.end(POSTS[0])

	expect([bench.reloads.at(-1), run.state, document.activeElement]).toEqual([true, 'pending', listRegion()])
	await calls.end(POSTS[1])
	expect(document.activeElement).toBe(listRegion())
	await act(async () => reload())
})

test('leaves a focus outside the list region where it is as a run marks the list reloading', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	renderTrash({ call: calls.call, refresh, inertFooter: true })
	pressTrash()
	const outside = screen.getByRole('button', { name: 'Add Post' })
	act(() => outside.focus())

	await calls.end(POSTS[0])

	expect(document.activeElement).toBe(outside)
	await calls.end(POSTS[1])
	await act(async () => reload())
})

test('never pulls a focus from an inert part outside the list region into the list as a run marks it', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	renderTrash({ call: calls.call, refresh, inertHeader: true })
	pressTrash()
	const outside = screen.getByRole('button', { name: 'Add Post' })
	act(() => outside.focus())

	await calls.end(POSTS[0])

	expect(outside.closest('[inert]'), 'the header part is inert').not.toBeNull()
	expect(document.activeElement).toBe(outside)
	await calls.end(POSTS[1])
	await act(async () => reload())
})

test('leaves the focus on the list region as a run marks the list reloading', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	renderTrash({ call: calls.call, refresh, inertFooter: true })
	pressTrash()
	act(() => listRegion().focus())

	await calls.end(POSTS[0])

	expect(document.activeElement).toBe(listRegion())
	await calls.end(POSTS[1])
	await act(async () => reload())
})

test('leaves a focus in a part of the list that stays live, such as its search field, as a run marks it', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	renderTrash({ call: calls.call, refresh, inertFooter: true })
	pressTrash()
	const search = screen.getByRole('searchbox', { name: 'Search posts' })
	act(() => search.focus())

	await calls.end(POSTS[0])

	expect(document.activeElement).toBe(search)
	await calls.end(POSTS[1])
	await act(async () => reload())
})

test('resolves as the toast shows, before refresh ends', async () => {
	const calls = heldCalls()
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({ call: calls.call, refresh })
	pressTrash()
	const run = watch(bench.runs[0])
	await drain()
	const whileCalling = run.state

	await act(async () => calls.finish())
	await drain()

	expect([whileCalling, run.state]).toEqual(['pending', 'resolved'])
	expect(toasts()).toEqual(['Moved to the trash: 2.'])
	expect(refresh).toHaveBeenCalledOnce()
	expect(bench.reloads.at(-1)).toBe(true)
	await act(async () => reload())
})

test('ends the reload when refresh rejects, with no unhandled rejection, and stays resolved', async () => {
	const reasons = heardRejections()
	const { refresh, fail } = heldRefresh()
	const bench = renderTrash({ call: failHello, refresh })

	pressTrash()
	const run = watch(bench.runs[0])
	await drain()
	const during = bench.reloads.at(-1)
	await act(async () => fail(new Error('offline')))
	await drain()
	await drain()

	expect(run).toEqual({ state: 'resolved' })
	expect(toasts()).toEqual(['Not moved to the trash: 1 of 2.'])
	expect([during, bench.reloads.at(-1)]).toEqual([true, false])
	expect(reasons).toEqual([])
})

test('puts the focus back on the pressed control when the reload fails', async () => {
	const { refresh, fail } = heldRefresh()
	renderTrash({ call: failHello, refresh })
	pressTrash()
	await drain()
	const during = document.activeElement

	await act(async () => fail(new Error('offline')))
	await drain()

	expect([during, document.activeElement]).toEqual([listRegion(), screen.getByRole('button', { name: 'Trash' })])
})

test('still refreshes and ends the reload when the words throw, settles, then hands the error on', async () => {
	const thrown = new Error('no words')
	const { refresh, reload } = heldRefresh()
	const bench = renderTrash({
		call: failHello,
		refresh,
		words: {
			...WORDS,
			failed: () => {
				throw thrown
			},
		},
	})

	pressTrash()
	const run = watch(bench.runs[0])
	await drain()
	const during = bench.reloads.at(-1)
	await act(async () => reload())
	await drain()

	expect(run).toEqual({ state: 'rejected', reason: thrown })
	expect(refresh).toHaveBeenCalledExactlyOnceWith(POSTS)
	expect([during, bench.reloads.at(-1)]).toEqual([true, false])
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
