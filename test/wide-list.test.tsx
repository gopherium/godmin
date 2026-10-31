// SPDX-License-Identifier: Apache-2.0

import { act, render, waitFor } from '@testing-library/react'
import { useRef } from 'react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { installTestEnvironment } from '../src/testing.js'
import { useWideList } from '../src/wide-list.js'

installTestEnvironment()

afterEach(() => {
	vi.restoreAllMocks()
	vi.unstubAllGlobals()
})

/** The class of the box DataViews scrolls its rows in. */
const SCROLL_BOX = 'dataviews-layout__container'

/** The widths a browser would measure for the DataViews scroll box. */
interface Layout {
	/** The width the box shows. */
	shown: number
	/** The width of everything in the box. */
	full: number
}

/** A mutation observer as a test sees it: whether it still watches. */
interface Watcher {
	/** Whether the observer watches an element. */
	watching: boolean
}

/**
 * Gives the DataViews scroll box the widths a browser would measure, which jsdom leaves at zero.
 * @param layout - The widths, read again on every measure so a test may change them.
 */
function measure(layout: Layout): void {
	const isBox = (element: Element) => element.classList.contains(SCROLL_BOX)
	vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
		return isBox(this) ? layout.shown : 0
	})
	vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
		return isBox(this) ? layout.full : 0
	})
}

/**
 * Swaps in a resize observer that records what it watches and lets a test report a resize.
 * @returns The elements watched and a function reporting a resize to every observer.
 */
function recordResizes(): { watched: Set<Element>; resize: () => void } {
	const watched = new Set<Element>()
	const callbacks: (() => void)[] = []
	vi.stubGlobal(
		'ResizeObserver',
		class {
			/**
			 * Keeps the callback a resize reports to.
			 * @param callback - The callback.
			 */
			constructor(callback: () => void) {
				callbacks.push(callback)
			}

			/**
			 * Watches an element.
			 * @param element - The element.
			 */
			observe(element: Element) {
				watched.add(element)
			}

			/** Stops watching an element. */
			unobserve() {}

			/** Stops watching every element. */
			disconnect() {
				watched.clear()
			}
		},
	)
	return { watched, resize: () => act(() => callbacks.forEach((callback) => callback())) }
}

/**
 * Swaps in a mutation observer that records whether each one still watches.
 * @returns Every observer made, in the order made.
 */
function recordMutations(): Watcher[] {
	const made: Watcher[] = []
	vi.stubGlobal(
		'MutationObserver',
		class {
			/** Whether this observer watches. */
			watcher: Watcher = { watching: false }

			/** Records the observer. */
			constructor() {
				made.push(this.watcher)
			}

			/** Starts watching. */
			observe() {
				this.watcher.watching = true
			}

			/** Stops watching. */
			disconnect() {
				this.watcher.watching = false
			}

			/**
			 * Hands over the changes not yet reported, none here.
			 * @returns No changes.
			 */
			takeRecords() {
				return []
			}
		},
	)
	return made
}

/**
 * Renders a list region that says in a data attribute whether its list is wide.
 * @param props - What the region holds.
 * @returns The region element.
 */
function Region({ children }: { children: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null)
	const wide = useWideList(ref)
	return (
		<div ref={ref} className="godmin-page__list" data-wide={wide}>
			{children}
		</div>
	)
}

/**
 * Renders a DataViews list as the region holds it: the wrapper, the scroll box, and the table or the empty state.
 * @param props - Whether the list has rows, which DataViews draws in a table and otherwise as an empty state.
 * @returns The wrapper element.
 */
function List({ rows = true }: { rows?: boolean }) {
	return (
		<div className="dataviews-wrapper">
			<div className={SCROLL_BOX}>
				{rows ? (
					<table className="dataviews-view-table">
						<tbody>
							<tr>
								<td>Report 1</td>
							</tr>
						</tbody>
					</table>
				) : (
					<div className="dataviews-no-results">No reports yet</div>
				)}
			</div>
		</div>
	)
}

/**
 * Returns whether the region on screen says its list is wide.
 * @param container - The element the region rendered into.
 * @returns The data attribute, true or false.
 */
function wideOf(container: HTMLElement): string | undefined {
	return (container.querySelector('.godmin-page__list') as HTMLElement).dataset.wide
}

test('marks a list wide while its DataViews scroll box holds more than its width', () => {
	measure({ shown: 964, full: 1980 })
	const { container } = render(
		<Region>
			<List />
		</Region>,
	)

	expect(wideOf(container)).toBe('true')
})

test('keeps a list that overflows by one pixel or less as fitting, as DataViews rounds a scroll end', () => {
	measure({ shown: 964, full: 965 })
	const { container } = render(
		<Region>
			<List />
		</Region>,
	)

	expect(wideOf(container)).toBe('false')
})

test('measures again when the scroll box or its table resizes', () => {
	const { watched, resize } = recordResizes()
	const layout = { shown: 1604, full: 1604 }
	measure(layout)
	const { container } = render(
		<Region>
			<List />
		</Region>,
	)
	const box = container.querySelector(`.${SCROLL_BOX}`) as HTMLElement

	expect(wideOf(container)).toBe('false')
	expect(watched).toEqual(new Set([container.querySelector('.godmin-page__list'), box, box.firstElementChild]))

	layout.shown = 964
	resize()

	expect(wideOf(container)).toBe('true')
})

test('measures again when the table gives way to the empty state', async () => {
	const layout = { shown: 964, full: 1980 }
	measure(layout)
	const { container, rerender } = render(
		<Region>
			<List />
		</Region>,
	)
	expect(wideOf(container)).toBe('true')

	layout.full = 964
	rerender(
		<Region>
			<List rows={false} />
		</Region>,
	)

	await waitFor(() => expect(wideOf(container)).toBe('false'))
})

test('reports a region with no DataViews list as fitting', () => {
	measure({ shown: 964, full: 1980 })
	const { container } = render(
		<Region>
			<p>Loading the reports.</p>
		</Region>,
	)

	expect(wideOf(container)).toBe('false')
})

test('stops watching once the list region goes', () => {
	const { watched } = recordResizes()
	const mutations = recordMutations()
	measure({ shown: 964, full: 1980 })
	const { unmount } = render(
		<Region>
			<List />
		</Region>,
	)

	unmount()

	expect(watched.size).toBe(0)
	expect(mutations.filter((observer) => observer.watching)).toEqual([])
})
