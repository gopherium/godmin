// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react'
import type { DataViewsProps, View } from '@wordpress/dataviews'
import { expect, test } from 'vitest'

import { pageWindow, paginationOf, useServerPaging } from '../src/index'
import type { PagedView, ServedPage } from '../src/index'

test('asks for the page size the view names from the first row of the first page', () => {
	expect(pageWindow({ page: 1, perPage: 20 })).toEqual({ limit: 20, offset: 0 })
})

test('skips the rows of the pages before the one the view shows', () => {
	expect(pageWindow({ page: 3, perPage: 20 })).toEqual({ limit: 20, offset: 40 })
})

test('opens on the first page when the view names no page', () => {
	expect(pageWindow({ perPage: 20 })).toEqual({ limit: 20, offset: 0 })
})

test('holds the page size under the cap', () => {
	expect(pageWindow({ page: 2, perPage: 10 }, undefined, 3)).toEqual({ limit: 3, offset: 3 })
})

test('keeps a page size the cap allows', () => {
	expect(pageWindow({ page: 2, perPage: 2 }, undefined, 3)).toEqual({ limit: 2, offset: 2 })
})

test('asks for the size the server serves by default when the view names none', () => {
	expect(pageWindow({ page: 1 })).toEqual({ limit: null, offset: 0 })
})

test('asks from the first row while the size the server serves is unknown', () => {
	expect(pageWindow({ page: 3 })).toEqual({ limit: null, offset: 0 })
})

test('steps by the size the server served when the view names none', () => {
	expect(pageWindow({ page: 3 }, { asked: null, served: 2 })).toEqual({ limit: null, offset: 4 })
})

test('steps by the size the server served when it is smaller than the one asked', () => {
	expect(pageWindow({ page: 2, perPage: 500 }, { asked: 500, served: 200 })).toEqual({ limit: 500, offset: 200 })
})

test('steps by the size asked when the server served a larger one', () => {
	expect(pageWindow({ page: 2, perPage: 2 }, { asked: 2, served: 4 })).toEqual({ limit: 2, offset: 2 })
})

test('steps by the size asked when the size served answered another page size', () => {
	expect(pageWindow({ page: 3, perPage: 50 }, { asked: 20, served: 20 })).toEqual({ limit: 50, offset: 100 })
})

test('asks from the first row when the view names no size and the size served answered one', () => {
	expect(pageWindow({ page: 3 }, { asked: 20, served: 20 })).toEqual({ limit: null, offset: 0 })
})

test('takes a DataViews view as it is', () => {
	const view: View = { type: 'table', page: 2, perPage: 10 }

	expect(pageWindow(view)).toEqual({ limit: 10, offset: 10 })
})

test('counts no rows and no pages before the server answers', () => {
	expect(paginationOf(undefined)).toEqual({ totalItems: 0, totalPages: 0 })
})

test('counts the pages by the size the server served', () => {
	expect(paginationOf({ total: 5, limit: 2 })).toEqual({ totalItems: 5, totalPages: 3 })
})

test('counts one page when every row fits on it', () => {
	expect(paginationOf({ total: 3, limit: 20 })).toEqual({ totalItems: 3, totalPages: 1 })
})

test('counts no pages when no row matches', () => {
	expect(paginationOf({ total: 0, limit: 20 })).toEqual({ totalItems: 0, totalPages: 0 })
})

test('answers the totals DataViews pages through', () => {
	const info: DataViewsProps<unknown>['paginationInfo'] = paginationOf({ total: 5, limit: 2 })

	expect(info).toEqual({ totalItems: 5, totalPages: 3 })
})

/** The view a list shows and the page the server served it last. */
interface Shown {
	view: PagedView
	page?: ServedPage
}

/**
 * Renders the server paging of a view, recording each page the server served.
 * @param view - The view the list shows first.
 * @param cap - The largest page the server serves.
 * @returns The hook render result, rerendered with the next view and page.
 */
function renderPaging(view: PagedView, cap?: number) {
	const initialProps: Shown = { view }
	return renderHook(
		({ view: shown, page }: Shown) => {
			const paging = useServerPaging(shown, cap)
			paging.record(page)
			return paging.window
		},
		{ initialProps },
	)
}

test('asks for the page the view names before the server answers', () => {
	const paging = renderPaging({ page: 2, perPage: 10 })

	expect(paging.result.current).toEqual({ limit: 10, offset: 10 })
})

test('holds the page size under the cap it is given', () => {
	const paging = renderPaging({ page: 2, perPage: 10 }, 3)

	expect(paging.result.current).toEqual({ limit: 3, offset: 3 })
})

test('steps to the page the view names by the size the server served', () => {
	const paging = renderPaging({ page: 2 })
	expect(paging.result.current).toEqual({ limit: null, offset: 0 })

	paging.rerender({ view: { page: 2 }, page: { total: 5, limit: 2 } })

	expect(paging.result.current).toEqual({ limit: null, offset: 2 })
})

test('keeps the size the server served while the next page has not arrived', () => {
	const paging = renderPaging({ page: 1 })
	paging.rerender({ view: { page: 1 }, page: { total: 5, limit: 2 } })

	paging.rerender({ view: { page: 3 } })

	expect(paging.result.current).toEqual({ limit: null, offset: 4 })
})

test('steps by the size asked while the page shown answered an older page size', () => {
	const answered: ServedPage = { total: 100, limit: 20 }
	const paging = renderPaging({ page: 1, perPage: 20 })
	paging.rerender({ view: { page: 1, perPage: 20 }, page: answered })

	paging.rerender({ view: { page: 3, perPage: 50 }, page: answered })
	expect(paging.result.current).toEqual({ limit: 50, offset: 100 })

	paging.rerender({ view: { page: 3, perPage: 50 }, page: { total: 100, limit: 30 } })
	expect(paging.result.current).toEqual({ limit: 50, offset: 60 })
})

test('records a page built afresh on every render once', () => {
	const paging = renderPaging({ page: 2, perPage: 50 })
	paging.rerender({ view: { page: 2, perPage: 50 }, page: { total: 100, limit: 30 } })
	paging.rerender({ view: { page: 2, perPage: 50 }, page: { total: 100, limit: 30 } })

	expect(paging.result.current).toEqual({ limit: 50, offset: 30 })
})

test('steps by the newest size the server served', () => {
	const paging = renderPaging({ page: 2, perPage: 500 })
	paging.rerender({ view: { page: 2, perPage: 500 }, page: { total: 1000, limit: 200 } })
	expect(paging.result.current).toEqual({ limit: 500, offset: 200 })

	paging.rerender({ view: { page: 2, perPage: 500 }, page: { total: 1000, limit: 100 } })

	expect(paging.result.current).toEqual({ limit: 500, offset: 100 })
})
