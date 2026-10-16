// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen } from '@testing-library/react'
import { useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { ErrorNotice, Page, useListRun } from '../src/index'
import type { ListRun, RunSettled } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** What a test reads back from the list screen. */
interface Seen {
	/** The settle function of each run started, in the order started. */
	settles: RunSettled[]
	/** The run the list handed on each render, in the order rendered. */
	runs: ListRun[]
	/** The ticked rows the screen held on each render. */
	ticked: string[][]
}

/**
 * Renders a list screen around one list run, with a button that starts a run.
 * @param props - The list on show, whether it draws its region, the spy on the selection setter and what to record.
 * @returns The page with its list region and failure notice.
 */
function ListScreen({
	scope,
	region = true,
	onTicks,
	seen,
}: {
	scope: string
	region?: boolean
	onTicks: (selection: string[]) => void
	seen: Seen
}) {
	const [ticked, setTicked] = useState(['1', '2'])
	const { failure, run, region: listRef } = useListRun(scope, (selection) => {
		onTicks(selection)
		setTicked(selection)
	})
	seen.runs.push(run)
	seen.ticked.push(ticked)
	return (
		<Page
			title="Posts"
			list={region}
			listLabel="Posts"
			listRef={listRef}
			actions={
				<button type="button" onClick={() => seen.settles.push(run.onStart())}>
					Trash
				</button>
			}
		>
			{failure === undefined ? null : <ErrorNotice>{failure}</ErrorNotice>}
		</Page>
	)
}

/**
 * Renders the list screen on the given list.
 * @param scope - The list on show.
 * @param region - Whether the screen draws its list region.
 * @returns What the screen recorded, the selection spy and a rerender onto another list.
 */
function renderList(scope: string, region = true) {
	const seen: Seen = { settles: [], runs: [], ticked: [] }
	const onTicks = vi.fn()
	const { rerender, unmount } = renderAdmin(<ListScreen scope={scope} region={region} onTicks={onTicks} seen={seen} />)
	return {
		seen,
		onTicks,
		unmount,
		show: (next: string) => rerender(<ListScreen scope={next} region={region} onTicks={onTicks} seen={seen} />),
	}
}

/**
 * Starts a run from the Trash button, focused first as a pointer press leaves it.
 */
function start(): void {
	const trash = screen.getByRole('button', { name: 'Trash' })
	trash.focus()
	fireEvent.click(trash)
}

/**
 * Settles a run the list started.
 * @param settle - The settle function the run was handed.
 * @param failure - The failure to show, none when every item finished.
 * @param moved - Whether an item moved.
 */
function settle(settle: RunSettled, failure: string | undefined, moved: boolean): void {
	act(() => settle(failure, moved))
}

test('shows the failure a run settles with, and clears it once the next run starts', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], '"Hello" could not be moved to the trash.', false)
	expect(screen.getByRole('alert').textContent).toBe('"Hello" could not be moved to the trash.')

	start()
	expect(screen.queryByRole('alert')).toBeNull()
})

test('shows no failure once a run settles with none', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], undefined, true)

	expect(screen.queryByRole('alert')).toBeNull()
})

test('focuses the list region once a run moved an item', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], undefined, true)

	expect(document.activeElement).toBe(screen.getByRole('region', { name: 'Posts' }))
})

test('leaves the focus alone when a run moved nothing', () => {
	const { seen } = renderList('post publish')
	start()

	settle(seen.settles[0], '"Hello" could not be moved to the trash.', false)

	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))
})

test('ignores a run that is no longer the latest', () => {
	const { seen } = renderList('post publish')
	start()
	start()

	settle(seen.settles[1], undefined, false)
	settle(seen.settles[0], '"Hello" could not be moved to the trash.', true)

	expect(screen.queryByRole('alert')).toBeNull()
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))
})

test('ignores a run started before the list changed, and leaves the focus alone', () => {
	const { seen, show } = renderList('post publish')
	start()
	show('post trash')

	settle(seen.settles[0], '"Hello" could not be moved to the trash.', true)

	expect(screen.queryByRole('alert')).toBeNull()
	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))
})

test('forgets the failure of one list once another is shown', () => {
	const { seen, show } = renderList('post publish')
	start()
	settle(seen.settles[0], '"Hello" could not be moved to the trash.', false)

	show('post trash')

	expect(screen.queryByRole('alert')).toBeNull()
})

test('clears the ticked rows once another list is shown, and only then', () => {
	const { seen, onTicks, show } = renderList('post publish')
	show('post publish')
	expect(onTicks).not.toHaveBeenCalled()

	show('post trash')

	expect(onTicks).toHaveBeenCalledExactlyOnceWith([])
	expect(seen.ticked.at(-1)).toEqual([])
})

/**
 * Runs a list run with the selection setter a parent handed down.
 * @param props - The list on show and the parent's setter.
 * @returns Nothing.
 */
function ChildList({ scope, onChangeSelection }: { scope: string; onChangeSelection: (selection: string[]) => void }) {
	useListRun(scope, onChangeSelection)
	return null
}

/**
 * Holds the ticked rows and hands their setter to a child list.
 * @param props - The list on show and the ticked rows seen on each render.
 * @returns The child list.
 */
function ParentList({ scope, ticked }: { scope: string; ticked: string[][] }) {
	const [rows, setRows] = useState(['1', '2'])
	ticked.push(rows)
	return <ChildList scope={scope} onChangeSelection={setRows} />
}

test('clears ticked rows a parent holds once another list is shown, with no warning from React', () => {
	const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
	onTestFinished(() => {
		errors.mockRestore()
	})
	const ticked: string[][] = []
	const { rerender } = renderAdmin(<ParentList scope="post publish" ticked={ticked} />)

	rerender(<ParentList scope="post trash" ticked={ticked} />)

	expect(errors.mock.calls.filter(([message]) => /Cannot update a component/.test(String(message)))).toEqual([])
	expect(ticked.at(-1)).toEqual([])
})

test('hands the same run while the list stays the same', () => {
	const { seen, show } = renderList('post publish')
	show('post publish')
	expect(seen.runs.at(-1)).toBe(seen.runs[0])

	show('post trash')

	expect(seen.runs.at(-1)).not.toBe(seen.runs[0])
})

test('settles a run on a screen that draws no list region, with nothing to focus', () => {
	const { seen } = renderList('post publish', false)
	start()

	settle(seen.settles[0], undefined, true)

	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Trash' }))
})
