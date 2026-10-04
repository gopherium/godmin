// SPDX-License-Identifier: Apache-2.0

import {
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen } from '@testing-library/react'
import type { Filter, SupportedLayouts, View } from '@wordpress/dataviews'
import { expect, test, vi } from 'vitest'

import { listSearch, openOnTap, useListView } from '../src/router.js'
import type { ListDefaults, ListSearch, ListView } from '../src/router.js'
import { installTestEnvironment, setViewport } from '../src/testing.js'

installTestEnvironment()
vi.stubGlobal('scrollTo', () => {})

const defaults: ListDefaults = {
	fields: ['email', 'status'],
	titleField: 'name',
	sort: { field: 'name', direction: 'asc' },
	perPage: 20,
}

test('listSearch keeps every part of a view the address may carry', () => {
	const filters = [{ field: 'status', operator: 'isAny', value: ['disabled'] }]

	const kept = listSearch({
		search: 'maria',
		page: 2,
		perPage: 50,
		sort: 'email',
		order: 'desc',
		filters,
		tab: 'other',
	})

	expect(kept).toEqual({ search: 'maria', page: 2, perPage: 50, sort: 'email', order: 'desc', filters })
})

test('listSearch drops what no list view could hold', () => {
	const kept = listSearch({
		search: '',
		page: 0,
		perPage: 2.5,
		sort: 7,
		order: 'sideways',
		filters: [{ field: 'status' }, 'role', null, { field: 'role', operator: 'isAny', value: ['admin'] }],
	})

	expect(kept).toEqual({ filters: [{ field: 'role', operator: 'isAny', value: ['admin'] }] })
})

test('listSearch drops filters that are not a list', () => {
	expect(listSearch({ filters: { field: 'status' } })).toEqual({})
})

test('listSearch keeps only the field, operator and value of a filter', () => {
	const kept = listSearch({ filters: [{ field: 'role', operator: 'isAny', value: ['admin'], isLocked: true }] })

	expect(kept).toEqual({ filters: [{ field: 'role', operator: 'isAny', value: ['admin'] }] })
})

/** Changes a shown view into the one a test writes. */
type Change = (view: View) => View

/** The search a probe route keeps: the list search beside the tab a screen may hold. */
type Kept = ListSearch & { tab?: unknown }

/**
 * Renders the view the address holds, and buttons writing a changed view and a tick.
 * @param props - The change the button writes and what the list opens on.
 * @returns The probe.
 */
function Probe({ next, opening }: { next: Change; opening: ListDefaults }) {
	const list: ListView<View> = useListView<View>(opening)
	const layouts: SupportedLayouts = list.defaultLayouts
	return (
		<>
			<output aria-label="view">{JSON.stringify(list.view)}</output>
			<output aria-label="layouts">{JSON.stringify(layouts)}</output>
			<output aria-label="selection">{JSON.stringify(list.selection)}</output>
			<output aria-label="phone">{JSON.stringify(list.phone)}</output>
			<button type="button" onClick={() => list.onChangeView(next(list.view))}>
				Change
			</button>
			<button type="button" onClick={() => list.onChangeSelection(['1'])}>
				Tick
			</button>
		</>
	)
}

/**
 * Renders the probe screen at the given address.
 * @param path - The address the memory history starts on.
 * @param next - The change the probe writes when asked.
 * @param opening - What the list opens on.
 * @param validate - The search the route keeps from the address.
 * @returns The router the probe renders under.
 */
function renderProbe(
	path: string,
	next: Change = (view) => view,
	opening: ListDefaults = defaults,
	validate: (raw: Record<string, unknown>) => Kept = listSearch,
) {
	const rootRoute = createRootRoute()
	const peopleRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: '/people',
		validateSearch: validate,
		component: () => <Probe next={next} opening={opening} />,
	})
	const router = createRouter({
		routeTree: rootRoute.addChildren([peopleRoute]),
		history: createMemoryHistory({ initialEntries: [path] }),
	})
	render(<RouterProvider router={router} />)
	return router
}

/**
 * Returns what one probe output shows.
 * @param name - The output to read.
 * @returns The parsed value.
 */
async function shown(name: 'view' | 'layouts' | 'selection' | 'phone') {
	return JSON.parse((await screen.findByRole('status', { name })).textContent ?? '') as unknown
}

test('a list opens on its defaults when the address says nothing', async () => {
	renderProbe('/people')

	expect(await shown('view')).toEqual({
		type: 'table',
		fields: ['email', 'status'],
		titleField: 'name',
		search: '',
		filters: [],
		sort: { field: 'name', direction: 'asc' },
		page: 1,
		perPage: 20,
	})
	expect(await shown('layouts')).toEqual({ table: {} })
})

test('a list sets the field it names as the description under the title', async () => {
	renderProbe('/people', undefined, { ...defaults, fields: ['status'], descriptionField: 'email' })

	expect(await shown('view')).toMatchObject({ titleField: 'name', descriptionField: 'email', fields: ['status'] })
})

test('a list sets the field it names as the media before the title', async () => {
	renderProbe('/people', undefined, { ...defaults, descriptionField: 'email', mediaField: 'avatar' })

	expect(await shown('view')).toMatchObject({ titleField: 'name', descriptionField: 'email', mediaField: 'avatar' })
})

test('a list keeps the media a reader hid while it stays open, out of the address', async () => {
	const router = renderProbe('/people', (view) => ({ ...view, showMedia: false }), {
		...defaults,
		mediaField: 'avatar',
	})

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/showMedia/)
	expect(await shown('view')).toMatchObject({ mediaField: 'avatar', showMedia: false })
	expect(router.state.location.search).toEqual({})
})

test('a list reads its search, filters, sort and page from the address', async () => {
	const filters = encodeURIComponent(JSON.stringify([{ field: 'status', operator: 'isAny', value: ['disabled'] }]))
	renderProbe(`/people?search=maria&page=2&perPage=50&sort=email&order=desc&filters=${filters}`)

	expect(await shown('view')).toMatchObject({
		search: 'maria',
		filters: [{ field: 'status', operator: 'isAny', value: ['disabled'] }],
		sort: { field: 'email', direction: 'desc' },
		page: 2,
		perPage: 50,
	})
})

test('a list opens on every row while its page size is unknown', async () => {
	renderProbe('/people', undefined, { ...defaults, perPage: undefined })

	expect(await shown('view')).not.toHaveProperty('perPage')
})

test('a changed view lands in the address without the parts left at their defaults', async () => {
	const router = renderProbe('/people?search=perez', (view) => ({
		...view,
		search: 'maria',
		page: 3,
		sort: { field: 'name', direction: 'desc' },
	}))

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/maria/)
	expect(await shown('view')).toMatchObject({ search: 'maria', page: 3, sort: { field: 'name', direction: 'desc' } })
	expect(router.state.location.search).toEqual({ search: 'maria', page: 3, order: 'desc' })
})

test('a changed view writes the filters, the page size and the sort field it holds', async () => {
	const filters: Filter[] = [{ field: 'status', operator: 'isAny', value: ['disabled'] }]
	const router = renderProbe('/people', (view) => ({
		...view,
		filters,
		perPage: 50,
		sort: { field: 'email', direction: 'asc' },
	}))

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/disabled/)
	expect(router.state.location.search).toEqual({ filters, perPage: 50, sort: 'email' })
})

test('a view back at its defaults leaves a bare address', async () => {
	const router = renderProbe('/people?search=maria&page=2&sort=email&perPage=50', (view) => ({
		...view,
		search: '',
		page: 1,
		perPage: 20,
		sort: undefined,
		filters: [],
	}))

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/"page":1/)
	expect(await shown('view')).toMatchObject({ search: '', page: 1, sort: { field: 'name', direction: 'asc' } })
	expect(router.state.location.search).toEqual({})
})

test('a changed view replaces the address, so Back leaves the list', async () => {
	const router = renderProbe('/people', (view) => ({ ...view, search: 'maria' }))

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/maria/)
	expect(router.history.length).toBe(1)
})

test('a list keeps the columns and density a reader picked while it stays open, out of the address', async () => {
	const router = renderProbe('/people', (view) => ({
		...view,
		fields: ['email'],
		layout: { density: 'compact' },
	}))

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/compact/)
	expect(await shown('view')).toMatchObject({ fields: ['email'], layout: { density: 'compact' } })
	expect(router.state.location.search).toEqual({})
})

/**
 * Keeps the list search beside the tab a screen holds in its address.
 * @param raw - The search the router parsed from the address.
 * @returns The list search and the tab.
 */
function withTab(raw: Record<string, unknown>): Kept {
	return { ...listSearch(raw), tab: raw.tab }
}

test('a changed view keeps the address choices that are not the list own', async () => {
	const router = renderProbe('/people?tab=other', (view) => ({ ...view, search: 'maria' }), defaults, withTab)

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/maria/)
	expect(router.state.location.search).toEqual({ tab: 'other', search: 'maria' })
})

test('a view back at its defaults leaves only the choices that are not the list own', async () => {
	const router = renderProbe('/people?tab=other&page=2', (view) => ({ ...view, page: 1 }), defaults, withTab)
	await screen.findByText(/"page":2/)

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/"page":1/)
	expect(router.state.location.search).toEqual({ tab: 'other' })
})

test('a phone keeps the fields the list names for it after a reader picked table columns', async () => {
	renderProbe('/people', (view) => ({ ...view, fields: ['email'] }), { ...defaults, phoneFields: ['status'] })
	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
	await screen.findByText(/"fields":\["email"\]/)

	act(() => setViewport({ matches: true }))

	expect(await shown('view')).toMatchObject({ type: 'list', fields: ['status'] })
})

test('a table shows the columns a reader picked again once the phone layout is left', async () => {
	renderProbe('/people', (view) => ({ ...view, fields: ['email'] }), { ...defaults, phoneFields: ['status'] })
	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))
	await screen.findByText(/"fields":\["email"\]/)

	act(() => setViewport({ matches: true }))
	act(() => setViewport({ matches: false }))

	expect(await shown('view')).toMatchObject({ type: 'table', fields: ['email'] })
})

test('a phone lays a list out as a list, not a table', async () => {
	setViewport({ matches: true })
	renderProbe('/people')

	expect(await shown('view')).toMatchObject({ type: 'list' })
	expect(await shown('layouts')).toEqual({ list: {} })
	expect(await shown('phone')).toBe(true)
})

test('a wide viewport reports it does not take the phone layout', async () => {
	renderProbe('/people')

	expect(await shown('phone')).toBe(false)
})

test('a phone lays a list out with the fields the list names for a phone', async () => {
	setViewport({ matches: true })
	renderProbe('/people', undefined, { ...defaults, phoneFields: ['status'] })

	expect(await shown('view')).toMatchObject({ type: 'list', fields: ['status'] })
})

test('a table keeps its columns when the list names other fields for a phone', async () => {
	renderProbe('/people', undefined, { ...defaults, phoneFields: ['status'] })

	expect(await shown('view')).toMatchObject({ type: 'table', fields: ['email', 'status'] })
})

test('a phone keeps the columns when the list names no fields for a phone', async () => {
	setViewport({ matches: true })
	renderProbe('/people')

	expect(await shown('view')).toMatchObject({ type: 'list', fields: ['email', 'status'] })
})

/** What a media list opens on: a grid from 640px and the list below. */
const gallery: ListDefaults = {
	...defaults,
	layouts: { wide: 'grid', phone: 'list' },
	layoutSettings: { grid: { layout: { previewSize: 230 } } },
}

test('a list lays itself out in the wide layout it names, such as a grid', async () => {
	renderProbe('/people', undefined, gallery)

	expect(await shown('view')).toMatchObject({ type: 'grid', layout: { previewSize: 230 } })
	expect(await shown('layouts')).toEqual({ grid: { layout: { previewSize: 230 } } })
})

test('a phone lays a list out in the phone layout it names, without the wide layout settings', async () => {
	setViewport({ matches: true })
	renderProbe('/people', undefined, { ...defaults, layouts: { wide: 'grid', phone: 'table' } })

	expect(await shown('view')).toMatchObject({ type: 'table' })
	expect(await shown('view')).not.toHaveProperty('layout')
	expect(await shown('layouts')).toEqual({ table: {} })
})

test('a layout opens on the fields its settings name over the list fields', async () => {
	renderProbe('/people', undefined, { ...gallery, layoutSettings: { grid: { fields: ['status'] } } })

	expect(await shown('view')).toMatchObject({ type: 'grid', fields: ['status'] })
})

test('a reader change of a layout setting wins over the setting the list opens on', async () => {
	renderProbe('/people', (view) => ({ ...view, layout: { previewSize: 290 } }) as View, gallery)

	fireEvent.click(await screen.findByRole('button', { name: 'Change' }))

	await screen.findByText(/290/)
	expect(await shown('view')).toMatchObject({ type: 'grid', layout: { previewSize: 290 } })
})

test('a table holds the rows a reader ticks', async () => {
	renderProbe('/people')

	fireEvent.click(await screen.findByRole('button', { name: 'Tick' }))

	expect(await shown('selection')).toEqual(['1'])
})

test('a list on a phone selects nothing, so a tap on a row changes nothing', async () => {
	setViewport({ matches: true })
	renderProbe('/people')

	fireEvent.click(await screen.findByRole('button', { name: 'Tick' }))

	expect(await shown('selection')).toEqual([])
})

test('a list drops the rows ticked in the table once the layout flips', async () => {
	renderProbe('/people')
	fireEvent.click(await screen.findByRole('button', { name: 'Tick' }))
	await screen.findByText('["1"]')

	act(() => setViewport({ matches: true }))
	act(() => setViewport({ matches: false }))

	expect(await shown('view')).toMatchObject({ type: 'table' })
	expect(await shown('selection')).toEqual([])
})

/**
 * Builds the list view a screen holds on a phone or a wide viewport, its ticks held by the given handler.
 * @param phone - Whether the viewport takes the phone layout.
 * @param onChangeSelection - The handler holding the ticks.
 * @returns The list view.
 */
function listOn(phone: boolean, onChangeSelection: (selection: string[]) => void): ListView<View> {
	return {
		view: { type: phone ? 'list' : 'table', fields: [] },
		onChangeView: () => {},
		defaultLayouts: {},
		selection: [],
		onChangeSelection,
		phone,
	}
}

test('a tap in the list a phone shows opens the record it lands on', () => {
	const ticked: string[][] = []
	const opened: string[] = []

	openOnTap(listOn(true, (selection) => ticked.push(selection)), (id) => opened.push(id))(['7'])

	expect({ ticked, opened }).toEqual({ ticked: [], opened: ['7'] })
})

test('a tap that lands on no row opens nothing', () => {
	const opened: string[] = []

	openOnTap(listOn(true, () => {}), (id) => opened.push(id))([])

	expect(opened).toEqual([])
})

test('a tick in a table stays a selection and opens nothing', () => {
	const ticked: string[][] = []
	const opened: string[] = []

	openOnTap(listOn(false, (selection) => ticked.push(selection)), (id) => opened.push(id))(['7'])

	expect({ ticked, opened }).toEqual({ ticked: [['7']], opened: [] })
})
