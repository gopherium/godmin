// SPDX-License-Identifier: Apache-2.0

import { render, screen, within } from '@testing-library/react'
import { InputControl } from '@wordpress/ui'
import { useState } from 'react'
import type { ReactElement } from 'react'
import { beforeEach, expect, onTestFinished, test, vi } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { ConfirmDialog, FormDialog, Page, RenameDialog, Toaster, useDialogRun, useListRun } from '../../src/index.js'
import type { BulkWords, DialogAnswer } from '../../src/index.js'
import { clearAnnouncements, getAnnouncement } from '../../src/testing.js'
import { sampleFocus } from './sample-focus.js'

/** A write time limit in milliseconds short enough for a test to run past it on a real clock. */
const SHORT_LIMIT = 500

/** How long a test waits for the time-out to show, well past the short limit. */
const PAST_LIMIT = { timeout: SHORT_LIMIT * 5 }

/** The words a write past its time limit shows, those of WordPress. */
const NO_RESPONSE = 'Could not get a valid response from the server.'

/** The words a write past its time limit shows while the browser is offline, those of WordPress. */
const OFFLINE = 'Unable to connect. Please check your Internet connection.'

/** A window height in pixels too short for the whole body of the form dialog, so it scrolls. */
const SHORT_WINDOW = 480

/** A height in pixels of a block in the form taller than its body on the short window. */
const TALL_BLOCK = 900

/** What a bench hands its dialog. */
interface Writes {
	/** The write the dialog waits on. */
	write: (signal: AbortSignal) => void | DialogAnswer | PromiseLike<unknown>
	/** Runs once the dialog left the page. */
	onClose?: () => void
}

/** Renders the Add Page button and its form dialog, a block taller than the body between field and notice. */
function FormBench({ write, onClose = () => undefined }: Writes) {
	const [asking, setAsking] = useState(false)
	const [title, setTitle] = useState('')
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Add Page
			</button>
			{asking ? (
				<FormDialog
					title="Add Page"
					submitLabel="Add"
					cancelLabel="Cancel"
					onSubmit={write}
					onClose={() => {
						onClose()
						setAsking(false)
					}}
				>
					<InputControl label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
					<div style={{ height: TALL_BLOCK }} />
				</FormDialog>
			) : null}
		</>
	)
}

/** Renders the Trash button and the confirm it asks. */
function ConfirmBench({ write, onClose = () => undefined }: Writes) {
	const [asking, setAsking] = useState(false)
	return (
		<>
			<button type="button" onClick={() => setAsking(true)}>
				Trash post
			</button>
			{asking ? (
				<ConfirmDialog
					title="Move this post to the trash?"
					confirmLabel="Trash"
					cancelLabel="Keep"
					onConfirm={write}
					onClose={() => {
						onClose()
						setAsking(false)
					}}
				/>
			) : null}
		</>
	)
}

/** Renders the rename dialog over an item named Hello. */
function RenameBench({ write }: Pick<Writes, 'write'>) {
	return (
		<RenameDialog
			title="Rename"
			name="Hello"
			fieldLabel="Name"
			submitLabel="Save"
			cancelLabel="Cancel"
			onSubmit={(_name, signal) => write(signal)}
			onClose={() => undefined}
		/>
	)
}

/** A post of the list bench. */
interface Post {
	/** The id of the post. */
	id: string
	/** The title of the post. */
	title: string
}

/** The two posts the dialog run of the list bench is over. */
const POSTS: Post[] = [
	{ id: '1', title: 'Hello' },
	{ id: '2', title: 'Maria Perez' },
]

/** The words the dialog run of the list bench toasts. */
const RUN_WORDS: BulkWords<Post> = {
	done: (count) => `Moved to the trash: ${count}.`,
	failed: (failures, asked) => `Not moved to the trash: ${failures.length} of ${asked}.`,
}

/** Renders a list whose Trash posts button asks a confirm that runs a dialog run over both posts. */
function RunBench({ call }: { call: (post: Post, signal: AbortSignal) => Promise<unknown> }) {
	const [asking, setAsking] = useState(false)
	const { run, region } = useListRun('posts', () => {})
	const write = useDialogRun<Post>(run, async () => undefined)
	return (
		<Page
			title="Posts"
			list
			listLabel="Posts"
			listRef={region}
			actions={
				<button type="button" onClick={() => setAsking(true)}>
					Trash posts
				</button>
			}
		>
			<p>Hello</p>
			{asking ? (
				<ConfirmDialog
					title="Move these posts to the trash?"
					confirmLabel="Trash"
					cancelLabel="Keep"
					onConfirm={async (signal) => write(POSTS, async (post) => call(post, signal), RUN_WORDS, signal)}
					onClose={() => setAsking(false)}
				/>
			) : null}
		</Page>
	)
}

/** Draws a bench inside an admin root that sets the short write time limit. */
function renderTimed(bench: ReactElement): void {
	render(<AdminRoot writeTimeout={SHORT_LIMIT}>{bench}</AdminRoot>)
}

/** Starts a write that never ends, as one the network dropped does. */
async function neverEnds(): Promise<unknown> {
	return new Promise(() => {})
}

/** Returns a write the test ends by hand, and what ends it. */
function heldWrite() {
	let answer: (value?: unknown) => void = () => {}
	const write = async () =>
		new Promise<unknown>((done) => {
			answer = done
		})
	return { write, end: (value?: unknown) => answer(value) }
}

/** Waits for the browser to draw the given number of frames. */
async function frames(count: number): Promise<void> {
	for (let frame = 0; frame < count; frame += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

/** Opens a dialog from its page button and waits for it. */
async function openFrom(opener: string, role: 'dialog' | 'alertdialog'): Promise<HTMLElement> {
	await userEvent.click(screen.getByRole('button', { name: opener }))
	const popup = await screen.findByRole(role)
	await frames(2)
	return popup
}

/** Waits for the time-out words to show inside a dialog, those of a browser online by default. */
async function timedOut(popup: HTMLElement, words: string = NO_RESPONSE): Promise<HTMLElement> {
	return within(popup).findByText(words, {}, PAST_LIMIT)
}

/** Returns a button by its name. */
function button(name: string): HTMLElement {
	return screen.getByRole('button', { name })
}

/** Reports whether one box sits wholly inside another. */
function inside(inner: DOMRect, outer: DOMRect): boolean {
	return inner.top >= outer.top && inner.bottom <= outer.bottom && inner.left >= outer.left && inner.right <= outer.right
}

beforeEach(async () => {
	clearAnnouncements()
	await commands.reduceMotion(true)
})

test('keeps the focus on the send, scrolls the time-out into view and keeps the title past the limit', async () => {
	await page.viewport(1280, SHORT_WINDOW)
	renderTimed(<FormBench write={neverEnds} />)
	const popup = await openFrom('Add Page', 'dialog')
	const field = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement
	await userEvent.fill(field, 'Maria Perez')
	const add = button('Add')

	await userEvent.click(add)
	expect(add.getAttribute('aria-disabled')).toBe('true')
	const focus = sampleFocus()
	const words = await timedOut(popup)
	await frames(2)
	focus.stop()

	const body = (field.form as HTMLFormElement).parentElement as HTMLElement
	expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
	expect(inside(words.getBoundingClientRect(), body.getBoundingClientRect())).toBe(true)
	expect(getAnnouncement('assertive')).toContain(NO_RESPONSE)
	expect([...focus.seen]).toEqual([add])
	expect(add.getAttribute('aria-disabled')).not.toBe('true')
	expect(field.value).toBe('Maria Perez')
})

test('keeps the focus in a name sent by Enter, frees the field and keeps the name past the limit', async () => {
	renderTimed(<RenameBench write={neverEnds} />)
	const popup = await screen.findByRole('dialog')
	const field = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
	await userEvent.fill(field, 'Maria Perez')

	await userEvent.keyboard('{Enter}')
	expect(field.readOnly).toBe(true)
	const focus = sampleFocus()
	await timedOut(popup)
	await frames(2)
	focus.stop()

	expect([...focus.seen]).toEqual([field])
	expect(field.readOnly).toBe(false)
	expect(field.value).toBe('Maria Perez')
})

test('shows the time-out under the buttons of a confirm, speaks it and leaves the focus on Trash', async () => {
	renderTimed(<ConfirmBench write={neverEnds} />)
	const popup = await openFrom('Trash post', 'alertdialog')
	const trash = button('Trash')

	await userEvent.click(trash)
	expect(trash.getAttribute('aria-disabled')).toBe('true')
	const focus = sampleFocus()
	const words = await timedOut(popup)
	await frames(2)
	focus.stop()

	expect(words.getBoundingClientRect().top).toBeGreaterThanOrEqual(trash.getBoundingClientRect().bottom)
	expect(words.getBoundingClientRect().top).toBeGreaterThanOrEqual(button('Keep').getBoundingClientRect().bottom)
	expect(inside(words.getBoundingClientRect(), popup.getBoundingClientRect())).toBe(true)
	expect(getAnnouncement('assertive')).toContain(NO_RESPONSE)
	expect([...focus.seen]).toEqual([trash])
	expect(trash.getAttribute('aria-disabled')).not.toBe('true')
})

test.each([
	{ dialog: 'a form dialog', bench: FormBench, opener: 'Add Page', role: 'dialog' as const, send: 'Add' },
	{ dialog: 'a confirm', bench: ConfirmBench, opener: 'Trash post', role: 'alertdialog' as const, send: 'Trash' },
])('closes $dialog on Escape once the write ran past the limit', async ({ bench: Bench, opener, role, send }) => {
	const onClose = vi.fn()
	renderTimed(<Bench write={neverEnds} onClose={onClose} />)
	const popup = await openFrom(opener, role)
	await userEvent.click(button(send))
	await timedOut(popup)

	await userEvent.keyboard('{Escape}')

	await expect.poll(() => popup.isConnected).toBe(false)
	expect(onClose).toHaveBeenCalledOnce()
})

test.each([
	{ dialog: 'a form dialog', bench: FormBench, opener: 'Add Page', role: 'dialog' as const, send: 'Add' },
	{ dialog: 'a confirm', bench: ConfirmBench, opener: 'Trash post', role: 'alertdialog' as const, send: 'Trash' },
])('changes nothing on $dialog on an answer after the time-out', async ({ bench: Bench, opener, role, send }) => {
	const held = heldWrite()
	const onClose = vi.fn()
	renderTimed(<Bench write={held.write} onClose={onClose} />)
	const popup = await openFrom(opener, role)
	await userEvent.click(button(send))
	await timedOut(popup)

	held.end()
	await frames(5)

	expect(popup.isConnected).toBe(true)
	expect(within(popup).getByText(NO_RESPONSE)).not.toBeNull()
	expect(button(send).getAttribute('aria-disabled')).not.toBe('true')
	expect(onClose).not.toHaveBeenCalled()
})

test('shows and speaks the offline words when the browser went offline before the limit ran out', async () => {
	const online: boolean[] = []
	const write = async (signal: AbortSignal) => {
		signal.addEventListener('abort', () => online.push(navigator.onLine))
		return neverEnds()
	}
	renderTimed(<ConfirmBench write={write} />)
	const popup = await openFrom('Trash post', 'alertdialog')
	await userEvent.click(button('Trash'))

	await commands.goOfflineFor(SHORT_LIMIT * 2)

	expect(online).toEqual([false])
	expect(navigator.onLine).toBe(true)
	expect(await timedOut(popup, OFFLINE)).not.toBeNull()
	expect(within(popup).queryByText(NO_RESPONSE)).toBeNull()
	expect(getAnnouncement('assertive')).toContain(OFFLINE)
})

test('shows the time-out for a write that rejects with its abort, as a fetch does, and hands nothing on', async () => {
	const heard: unknown[] = []
	const listener = (event: PromiseRejectionEvent) => heard.push(event.reason)
	window.addEventListener('unhandledrejection', listener)
	onTestFinished(() => window.removeEventListener('unhandledrejection', listener))
	const stopsOnSignal = async (signal: AbortSignal) =>
		new Promise((_, fail) => {
			signal.addEventListener('abort', () => fail(signal.reason))
		})
	renderTimed(<FormBench write={stopsOnSignal} />)
	const popup = await openFrom('Add Page', 'dialog')

	await userEvent.click(button('Add'))
	await timedOut(popup)
	await frames(5)

	expect(heard).toEqual([])
})

test('closes a run over two posts past the limit and toasts both as failed, one stopped on the signal', async () => {
	const call = async (post: Post, signal: AbortSignal) =>
		post === POSTS[0]
			? new Promise((_, fail) => {
					signal.addEventListener('abort', () => fail(signal.reason))
				})
			: neverEnds()
	renderTimed(
		<Toaster>
			<RunBench call={call} />
		</Toaster>,
	)
	const popup = await openFrom('Trash posts', 'alertdialog')

	await userEvent.click(button('Trash'))

	await expect.poll(() => popup.isConnected, PAST_LIMIT).toBe(false)
	await expect
		.poll(() => [...document.querySelectorAll('.godmin-toast')].map((toast) => toast.textContent))
		.toEqual(['Not moved to the trash: 2 of 2.'])
	expect(screen.queryByText(NO_RESPONSE)).toBeNull()
})
