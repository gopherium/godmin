// SPDX-License-Identifier: Apache-2.0

import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DataViews } from '@wordpress/dataviews'
import type { Action, Field, View } from '@wordpress/dataviews'
import { useRef, useState } from 'react'
import { expect, onTestFinished, test, vi } from 'vitest'

import { focusedTrigger, useFocusBack } from '../src/index'
import type { Trigger } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** An item a list shows. */
interface Post {
	/** The id DataViews keys the item by. */
	id: string
	/** The title of the item. */
	title: string
}

/** A layout DataViews draws a list in. */
type Layout = 'grid' | 'list' | 'table'

/** The items a list shows, in the order it opens on. */
const POSTS: Post[] = [
	{ id: '1', title: 'Hello' },
	{ id: '2', title: 'Harbor at dawn' },
]

/** The fields of the list: the title marked with its item, and the media. */
const FIELDS: Field<Post>[] = [
	{
		id: 'title',
		label: 'Title',
		enableHiding: false,
		getValue: ({ item }) => item.title,
		render: ({ item }) => <span data-item-id={item.id}>{item.title}</span>,
	},
	{ id: 'media', label: 'Media', render: () => <span>media</span> },
]

/**
 * Returns the one row action, offered from each row's actions menu and from the bulk bar for ticked rows.
 * @param chosen - Told where the focus sat once the action was chosen.
 * @returns The action.
 */
function rename(chosen: (trigger: Trigger) => void): Action<Post> {
	return { id: 'rename', label: 'Rename', supportsBulk: true, callback: () => chosen(focusedTrigger()) }
}

/** What a test reads back from the list and how it changes it. */
interface Handle {
	/** Asks for the focus back on the trigger a dialog on an item opened from. */
	focusBack: (id: string, trigger: Trigger) => void
	/** The trigger each click on an item read from the focus. */
	clicked: Trigger[]
}

/** What a list probe draws. */
interface ListProps {
	/** The layout DataViews draws. */
	layout: Layout
	/** The items in the order the list draws them. */
	posts: Post[]
	/** Whether the list reads its items again. */
	busy: boolean
	/** Whether the list takes DataViews off the page while busy. */
	unmounts: boolean
	/** Whether the list draws its region. */
	region: boolean
	/** Whether the rows offer the row action. */
	withActions: boolean
	/** What the test reads back. */
	handle: Handle
}

/**
 * Renders a list region around DataViews in one layout, its titles and media opening a dialog on a click.
 * @param props - The layout, the items, whether the list is busy, how it draws then, its region and what to record.
 * @returns The list.
 */
function List({ layout, posts, busy, unmounts, region, withActions, handle }: ListProps) {
	const list = useRef<HTMLDivElement>(null)
	const [selection, setSelection] = useState<string[]>([])
	handle.focusBack = useFocusBack(busy, list)
	const view: View = { type: layout, fields: [], titleField: 'title', mediaField: 'media', page: 1, perPage: 10 }
	const views = busy && unmounts ? null : (
		<DataViews
			data={posts}
			fields={FIELDS}
			view={view}
			onChangeView={() => {}}
			defaultLayouts={{ [layout]: {} }}
			actions={withActions ? [rename((trigger) => handle.clicked.push(trigger))] : []}
			paginationInfo={{ totalItems: posts.length, totalPages: 1 }}
			getItemId={(item: Post) => item.id}
			selection={selection}
			onChangeSelection={setSelection}
			isItemClickable={() => true}
			onClickItem={() => handle.clicked.push(focusedTrigger())}
		/>
	)
	if (!region) {
		return views
	}
	return (
		<div ref={list} role="region" aria-label="Posts" tabIndex={-1}>
			{views}
		</div>
	)
}

/**
 * Renders the list in one layout.
 * @param layout - The layout DataViews draws.
 * @param props - The props beside the layout, the items in their opening order when absent.
 * @returns What the list records, a rerender with other props and what takes the list off the page.
 */
function renderList(layout: Layout, props: Partial<Omit<ListProps, 'layout' | 'handle'>> = {}) {
	const handle: Handle = { focusBack: () => {}, clicked: [] }
	const drawn = { posts: POSTS, busy: false, unmounts: false, region: true, withActions: true, ...props }
	const { rerender, unmount } = renderAdmin(<List layout={layout} handle={handle} {...drawn} />)
	return {
		handle,
		rerender: (next: Partial<Omit<ListProps, 'layout' | 'handle'>>) =>
			rerender(<List layout={layout} handle={handle} {...drawn} {...next} />),
		unmount,
	}
}

/**
 * Returns the card or row each layout draws an item in.
 * @param title - The title the item shows.
 * @returns The card or row.
 */
function holderOf(title: string): HTMLElement {
	const holders = '.dataviews-view-grid__card, .dataviews-view-list__item-wrapper, .dataviews-view-table__row'
	return screen.getByText(title, { selector: '[data-item-id]' }).closest(holders) as HTMLElement
}

/**
 * Returns an element of the card or row holding an item.
 * @param title - The title the item shows.
 * @param selector - Finds the element inside the card or row.
 * @returns The element.
 */
function partOf(title: string, selector: string): HTMLElement {
	return holderOf(title).querySelector(selector) as HTMLElement
}

/** Finds the actions menu of a card or row. */
const MENU = '[aria-haspopup="menu"]'

/** Finds the title a click opens a dialog from. */
const TITLE = '.dataviews-title-field[role="button"]'

/** Finds the media of a grid card a click opens a dialog from. */
const GRID_MEDIA = '.dataviews-view-grid__media[role="button"]'

/** Finds the media of a table row a click opens a dialog from. */
const TABLE_MEDIA = '.dataviews-column-primary__media[role="button"]'

/** Finds the row of a phone list a tap opens a dialog from. */
const PHONE_ROW = '.dataviews-view-list__item'

/**
 * Drops the focus to the page body, as a browser does once a closed dialog's trigger left the page.
 */
function dropFocus(): void {
	act(() => (document.activeElement as HTMLElement).blur())
}

/**
 * Asks for the focus back with the focus on the page body, the items drawn in the reverse order, as a write moved them.
 * @param layout - The layout DataViews draws.
 * @param trigger - The trigger the dialog opened from.
 */
function askAfterMove(layout: Layout, trigger: Trigger): void {
	const { handle, rerender } = renderList(layout)
	rerender({ posts: [...POSTS].reverse() })
	dropFocus()
	act(() => handle.focusBack('1', trigger))
}

/**
 * Returns the region the list is drawn in.
 * @returns The region.
 */
function region(): HTMLElement {
	return screen.getByRole('region', { name: 'Posts' })
}

/** A grid width DataViews lays three cards across at its default preview size. */
const ROW_OF_THREE = 800

/** A grid width DataViews lays one card across at its default preview size. */
const ROW_OF_ONE = 400

/**
 * Makes each grid DataViews mounts measure a width, and lets the test report another one, as a browser does.
 * @param width - The width each grid measures as it mounts.
 * @returns What reports another width to every grid on the page, as a resize after a layout does.
 */
function measureGrids(width: number): (next: number) => void {
	let measured = width
	const offset = vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(() => measured)
	const watched = new Map<Element, ResizeObserverCallback>()
	vi.stubGlobal(
		'ResizeObserver',
		class {
			/** What the page runs on a resize. */
			readonly callback: ResizeObserverCallback

			/**
			 * Holds what the page runs on a resize.
			 * @param callback - What the page runs on a resize.
			 */
			constructor(callback: ResizeObserverCallback) {
				this.callback = callback
			}

			/**
			 * Watches an element.
			 * @param element - The element.
			 */
			observe(element: Element) {
				watched.set(element, this.callback)
			}

			/**
			 * Stops watching an element.
			 * @param element - The element.
			 */
			unobserve(element: Element) {
				watched.delete(element)
			}

			/** Stops watching every element. */
			disconnect() {}
		},
	)
	onTestFinished(() => {
		offset.mockRestore()
		vi.unstubAllGlobals()
	})
	return (next) => {
		measured = next
		const grids = [...watched].filter(([element]) => element.isConnected)
		const entry = (element: Element) => ({ target: element, borderBoxSize: [{ inlineSize: next, blockSize: 0 }] })
		act(() => grids.forEach(([element, resized]) => resized([entry(element)] as never, {} as ResizeObserver)))
	}
}

/**
 * Lets the page answer the changes the last step drew, as a browser does before the reader acts again.
 */
async function settle(): Promise<void> {
	await act(async () => {})
}

/**
 * Puts the focus back on the trigger of the item at the second place of a grid three cards wide.
 * @param trigger - The trigger the dialog opened from.
 * @returns What the list records, a rerender, what takes it off the page, lays it out again and counts its watches.
 */
async function focusBackInGrid(trigger: Trigger) {
	const layOut = measureGrids(ROW_OF_THREE)
	const list = renderList('grid', { posts: [...POSTS].reverse() })
	const live = liveWatches(region())
	act(() => list.handle.focusBack('1', trigger))
	await settle()
	return { ...list, layOut, live }
}

/**
 * Counts what the page keeps watching from now on: observers of the list and focus and press listeners on the page.
 * @param list - The list region.
 * @returns What counts the observers of the list and the listeners still live, each in that order.
 */
function liveWatches(list: HTMLElement): () => [number, number] {
	const observed = vi.spyOn(MutationObserver.prototype, 'observe')
	const disconnected = vi.spyOn(MutationObserver.prototype, 'disconnect')
	const added = vi.spyOn(document, 'addEventListener')
	const removed = vi.spyOn(document, 'removeEventListener')
	onTestFinished(() => [observed, disconnected, added, removed].forEach((spy) => spy.mockRestore()))
	const watching = (type: unknown) => type === 'focusin' || type === 'pointerdown'
	const gone = (type: unknown, listener: unknown, options: unknown) =>
		removed.mock.calls.some((call) => call[0] === type && call[1] === listener && call[2] === options)
	return () => [
		observed.mock.contexts.filter(
			(observer, call) => observed.mock.calls[call][0] === list && !disconnected.mock.contexts.includes(observer),
		).length,
		added.mock.calls.filter(([type, listener, options]) => watching(type) && !gone(type, listener, options)).length,
	]
}

test.each([
	{ trigger: 'title' as const, selector: TITLE },
	{ trigger: 'media' as const, selector: GRID_MEDIA },
	{ trigger: 'actions' as const, selector: MENU },
])('puts the focus back on the $trigger of a grid card where the card moved', ({ trigger, selector }) => {
	askAfterMove('grid', trigger)

	expect(document.activeElement).toBe(partOf('Hello', selector))
	expect(document.querySelectorAll('.dataviews-view-grid__card')[1]).toBe(holderOf('Hello'))
})

test.each([
	{ trigger: 'title' as const, selector: TITLE },
	{ trigger: 'media' as const, selector: TABLE_MEDIA },
	{ trigger: 'actions' as const, selector: MENU },
])('puts the focus back on the $trigger of a table row where the row moved', ({ trigger, selector }) => {
	askAfterMove('table', trigger)

	expect(document.activeElement).toBe(partOf('Hello', selector))
	expect(document.querySelectorAll('tbody tr.dataviews-view-table__row')[1]).toBe(holderOf('Hello'))
})

test.each([
	{ trigger: 'row' as const, selector: PHONE_ROW },
	{ trigger: 'actions' as const, selector: MENU },
])('puts the focus back on the $trigger of a phone list row where the row moved', ({ trigger, selector }) => {
	askAfterMove('list', trigger)

	expect(document.activeElement).toBe(partOf('Hello', selector))
	expect(document.querySelectorAll('.dataviews-view-list__item-wrapper')[1]).toBe(holderOf('Hello'))
})

test.each([
	{ layout: 'grid' as const, trigger: 'row' as const },
	{ layout: 'table' as const, trigger: 'row' as const },
	{ layout: 'list' as const, trigger: 'title' as const },
	{ layout: 'list' as const, trigger: 'media' as const },
])('falls back to the actions menu once the $layout draws no $trigger', ({ layout, trigger }) => {
	askAfterMove(layout, trigger)

	expect(document.activeElement).toBe(partOf('Hello', MENU))
})

test.each(['grid', 'list', 'table'] as const)(
	'puts the focus on the %s list once the item left it',
	(layout) => {
		const { handle, rerender } = renderList(layout)
		rerender({ posts: POSTS.slice(1) })
		dropFocus()

		act(() => handle.focusBack('1', 'title'))

		expect(document.activeElement).toBe(region())
	},
)

test.each(['grid', 'list', 'table'] as const)(
	'puts the focus on the %s list once the row draws neither the trigger nor an actions menu to fall back to',
	(layout) => {
		const { handle } = renderList(layout, { withActions: false })
		dropFocus()

		act(() => handle.focusBack('1', 'actions'))

		expect(document.activeElement).toBe(region())
	},
)

test.each(['grid', 'list', 'table'] as const)(
	'puts the focus on the %s list after a bulk action, the bar gone with the selection',
	(layout) => {
		const { handle } = renderList(layout)
		dropFocus()

		act(() => handle.focusBack('1', 'bulk'))

		expect(document.activeElement).toBe(region())
	},
)

test('puts the focus on the list when the mark sits outside every card and row', () => {
	const handle: Handle = { focusBack: () => {}, clicked: [] }
	/**
	 * Renders a list region holding a marked item outside DataViews.
	 * @returns The region.
	 */
	function Loose() {
		const list = useRef<HTMLDivElement>(null)
		handle.focusBack = useFocusBack(false, list)
		return (
			<div ref={list} role="region" aria-label="Posts" tabIndex={-1}>
				<button type="button" data-item-id="1">
					Hello
				</button>
			</div>
		)
	}
	renderAdmin(<Loose />)

	act(() => handle.focusBack('1', 'title'))

	expect(document.activeElement).toBe(region())
})

test('finds the item inside its own list, never a cell marked with its id elsewhere on the page', () => {
	const handle: Handle = { focusBack: () => {}, clicked: [] }
	renderAdmin(
		<>
			<span data-item-id="1">Details</span>
			<List layout="table" posts={POSTS} busy={false} unmounts={false} region withActions handle={handle} />
		</>,
	)
	dropFocus()

	act(() => handle.focusBack('1', 'title'))

	expect(document.activeElement).toBe(partOf('Hello', TITLE))
})

test('waits for the list to read its items again before it puts the focus back', () => {
	const { handle, rerender } = renderList('table', { busy: true })
	dropFocus()
	act(() => handle.focusBack('1', 'title'))
	expect(document.activeElement).toBe(document.body)

	rerender({ busy: false })

	expect(document.activeElement).toBe(partOf('Hello', TITLE))
})

test('leaves a focus the page kept where it is', () => {
	const { handle } = renderList('table')
	const other = partOf('Harbor at dawn', TITLE)
	act(() => other.focus())

	act(() => handle.focusBack('1', 'title'))

	expect(document.activeElement).toBe(other)
})

test('puts the focus back each time it is asked, even for the same trigger', () => {
	const { handle } = renderList('table')
	dropFocus()
	act(() => handle.focusBack('1', 'title'))
	dropFocus()

	act(() => handle.focusBack('1', 'title'))

	expect(document.activeElement).toBe(partOf('Hello', TITLE))
})

test('puts the focus back once only, a later render of the list leaving it alone', () => {
	const { handle, rerender } = renderList('table')
	dropFocus()
	act(() => handle.focusBack('1', 'title'))
	dropFocus()

	rerender({ busy: true })
	rerender({ busy: false })

	expect(document.activeElement).toBe(document.body)
})

test('puts no focus anywhere while the list draws no region, and throws nothing', () => {
	const { handle } = renderList('table', { region: false })
	dropFocus()

	act(() => handle.focusBack('1', 'title'))

	expect(document.activeElement).toBe(document.body)
})

test('drops an ask made while the list drew no region, so a region drawn later takes no focus', () => {
	const { handle, rerender } = renderList('table', { region: false })
	dropFocus()
	act(() => handle.focusBack('1', 'title'))

	rerender({ region: true, busy: true })
	rerender({ region: true, busy: false })

	expect(document.activeElement).toBe(document.body)
})

test.each([
	{ trigger: 'title' as const, selector: TITLE },
	{ trigger: 'media' as const, selector: GRID_MEDIA },
	{ trigger: 'actions' as const, selector: MENU },
])('keeps the focus on the $trigger of a grid card the grid drew anew as it measured its columns', async (each) => {
	measureGrids(ROW_OF_THREE)
	const { handle, rerender } = renderList('grid', { posts: [...POSTS].reverse(), busy: true, unmounts: true })
	act(() => handle.focusBack('1', each.trigger))

	rerender({ busy: false })
	await settle()

	expect(document.activeElement).toBe(partOf('Hello', each.selector))
})

test('keeps the focus on the title of a grid card the grid draws anew in another row at another width', async () => {
	const { layOut } = await focusBackInGrid('title')

	layOut(ROW_OF_ONE)
	await settle()

	expect(holderOf('Hello').closest('[role="row"]')?.getAttribute('aria-rowindex')).toBe('2')
	expect(document.activeElement).toBe(partOf('Hello', TITLE))
})

test('keeps the focus on the title of a grid card through each layout that draws the card anew', async () => {
	const { layOut } = await focusBackInGrid('title')
	layOut(ROW_OF_ONE)
	await settle()

	layOut(ROW_OF_THREE)
	await settle()

	expect(holderOf('Hello').closest('[role="row"]')?.getAttribute('aria-rowindex')).toBe('1')
	expect(document.activeElement).toBe(partOf('Hello', TITLE))
})

test('watches nothing once the focus went to the list, which no layout of the list redraws', async () => {
	measureGrids(ROW_OF_THREE)
	const { handle, rerender } = renderList('grid', { posts: [...POSTS].reverse() })
	const live = liveWatches(region())
	rerender({ posts: POSTS.slice(1) })

	act(() => handle.focusBack('1', 'title'))

	expect(document.activeElement).toBe(region())
	expect(live()).toEqual([0, 0])
})

test('keeps the focus on the title after the reader pressed on that title', async () => {
	const { layOut } = await focusBackInGrid('title')
	await userEvent.click(screen.getByText('Hello', { selector: '[data-item-id]' }))

	layOut(ROW_OF_ONE)
	await settle()

	expect(document.activeElement).toBe(partOf('Hello', TITLE))
})

test('stops putting the focus back once the reader moved it, even to the same card', async () => {
	const { layOut, live } = await focusBackInGrid('title')
	act(() => partOf('Hello', MENU).focus())

	layOut(ROW_OF_ONE)
	await settle()

	expect(document.activeElement).toBe(document.body)
	expect(live()).toEqual([0, 0])
})

test('stops putting the focus back once the reader pressed elsewhere on the page', async () => {
	const { layOut, live } = await focusBackInGrid('title')
	await userEvent.click(document.body)

	layOut(ROW_OF_ONE)
	await settle()

	expect(document.activeElement).toBe(document.body)
	expect(live()).toEqual([0, 0])
})

test('stops putting the focus back on an item once the focus is asked back for another', async () => {
	const { handle, rerender, layOut, live } = await focusBackInGrid('title')
	rerender({ busy: true })
	act(() => handle.focusBack('2', 'title'))

	layOut(ROW_OF_ONE)
	await settle()

	expect(document.activeElement).toBe(document.body)
	expect(live()).toEqual([0, 0])
})

test('stops putting the focus back once the item left the list, even when it comes back', async () => {
	const { rerender, live } = await focusBackInGrid('title')
	rerender({ posts: POSTS.slice(1) })
	await settle()
	const left = live()

	rerender({ posts: [...POSTS].reverse() })
	await settle()

	expect(document.activeElement).toBe(region())
	expect(left).toEqual([0, 0])
})

test.each([
	{ layout: 'grid' as const, trigger: 'title' as const },
	{ layout: 'list' as const, trigger: 'row' as const },
	{ layout: 'table' as const, trigger: 'title' as const },
])('puts the focus on the list once the item left the $layout while its $trigger kept the focus', async (each) => {
	const { handle, rerender } = renderList(each.layout)
	const live = liveWatches(region())
	dropFocus()
	act(() => handle.focusBack('1', each.trigger))
	const kept = live()

	rerender({ posts: POSTS.slice(1) })
	await settle()

	expect(document.activeElement).toBe(region())
	expect([kept, live()]).toEqual([
		[1, 2],
		[0, 0],
	])
})

test('leaves the focus on a control the reader moved to when the item then left the list', async () => {
	const { rerender } = await focusBackInGrid('title')
	const other = partOf('Harbor at dawn', TITLE)
	act(() => other.focus())

	rerender({ posts: POSTS.slice(1) })
	await settle()

	expect(document.activeElement).toBe(other)
})

test('stops watching the list and the focus once the screen leaves', async () => {
	const { unmount, live } = await focusBackInGrid('title')
	const kept = live()

	unmount()

	expect([kept, live()]).toEqual([
		[1, 2],
		[0, 0],
	])
})

test('puts the focus back again only once its trigger leaves the page, not on other changes to the list', async () => {
	const { rerender } = await focusBackInGrid('title')
	dropFocus()

	rerender({ posts: [...POSTS, { id: '3', title: 'Lighthouse' }].reverse() })
	await settle()

	expect(document.activeElement).toBe(document.body)
})

test.each([
	{ layout: 'grid' as const, selector: TITLE, trigger: 'title' },
	{ layout: 'grid' as const, selector: GRID_MEDIA, trigger: 'media' },
	{ layout: 'table' as const, selector: TITLE, trigger: 'title' },
	{ layout: 'table' as const, selector: TABLE_MEDIA, trigger: 'media' },
])('reads a click on the $trigger of a $layout item as that trigger', async ({ layout, selector, trigger }) => {
	const { handle } = renderList(layout)

	await userEvent.click(partOf('Hello', selector))

	expect(handle.clicked).toEqual([trigger])
})

test('reads a focus on a phone list row as the row', () => {
	renderList('list')

	act(() => partOf('Hello', PHONE_ROW).focus())

	expect(focusedTrigger()).toBe('row')
})

test.each(['grid', 'table'] as const)('reads an action chosen in the bulk bar of a %s as the bar', async (layout) => {
	const { handle } = renderList(layout)
	await userEvent.click(within(holderOf('Hello')).getByRole('checkbox'))
	const bar = document.querySelector('.dataviews-bulk-actions-footer__container') as HTMLElement

	await userEvent.click(within(bar).getByRole('button', { name: 'Rename' }))

	expect(handle.clicked).toEqual(['bulk'])
})

test.each(['grid', 'list', 'table'] as const)(
	'reads an action chosen in the actions menu of a %s item as the actions menu',
	async (layout) => {
		const { handle } = renderList(layout)
		await userEvent.click(within(holderOf('Hello')).getByRole('button', { name: 'Actions' }))

		await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }))

		expect(handle.clicked).toEqual(['actions'])
	},
)
