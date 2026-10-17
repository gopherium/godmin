// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'

/** The part of a list view that names the page it shows, as a DataViews view holds it. */
export interface PagedView {
	/** The page the view shows, counted from 1. */
	page?: number
	/** How many rows a page holds. */
	perPage?: number
}

/** The rows a list asks the server for. */
export interface PageWindow {
	/** How many rows to ask for, or null for the size the server serves by default. */
	limit: number | null
	/** How many rows to skip before the first one. */
	offset: number
}

/** The part of a page the server served that says its size and its total. */
export interface ServedPage {
	/** How many rows match, across every page. */
	total: number
	/** The page size the server used, not the rows on this page. */
	limit: number
}

/** The totals a DataViews list pages through. */
export interface PaginationInfo {
	/** How many rows match, across every page. */
	totalItems: number
	/** How many pages those rows fill. */
	totalPages: number
}

/** The size the server last put on one page, and the size the request it answered asked for. */
export interface ServedSize {
	/** The rows that request asked for, or null when it asked for the size the server serves by default. */
	asked: number | null
	/** The rows the server put on the page. */
	served: number
}

/** The page a view asks the server for, and the recorder of each page the server serves. */
export interface ServerPaging {
	/** The rows to ask the server for. */
	window: PageWindow
	/** Records the page size the server used, when the request that got that page asked the limit the view asks now. */
	record: (page: ServedPage | undefined, asked: number | null) => void
}

/**
 * Reports whether the size the server last served answered this same ask with rows on the page.
 * @param limit - The rows asked for on one page, or null for the size the server serves by default.
 * @param last - The size the server last served, absent before it served any.
 * @returns Whether that size answered the ask and is above zero.
 */
function answers(limit: number | null, last?: ServedSize): last is ServedSize {
	return last !== undefined && last.asked === limit && last.served > 0
}

/**
 * Returns how many rows each page before the shown one holds.
 * @param limit - The rows asked for on one page, or null for the size the server serves by default.
 * @param last - The size the server last served, absent before it served any.
 * @returns The size served when it answered this same ask, the size asked otherwise.
 */
function stepOf(limit: number | null, last?: ServedSize): number {
	return answers(limit, last) ? last.served : (limit ?? 0)
}

/**
 * Returns the rows to ask the server for the page a view shows.
 * @param view - The view the list shows.
 * @param last - The size the server last served, absent before it served any.
 * @param cap - The largest page the server serves.
 * @returns The limit and offset of the page.
 */
export function pageWindow({ page = 1, perPage }: PagedView, last?: ServedSize, cap = Infinity): PageWindow {
	const limit = perPage === undefined ? null : Math.min(perPage, cap)
	return { limit, offset: (page - 1) * stepOf(limit, last) }
}

/**
 * Returns the totals a DataViews list pages through, counting pages by the size the server served.
 * @param page - The page the server served, absent until it arrives.
 * @returns The pagination info.
 */
export function paginationOf(page: ServedPage | undefined): PaginationInfo {
	if (page === undefined) {
		return { totalItems: 0, totalPages: 0 }
	}
	const totalPages = page.limit > 0 ? Math.ceil(page.total / page.limit) : Math.min(page.total, 1)
	return { totalItems: page.total, totalPages }
}

/**
 * Returns the page size a list shows: the one asked while the sizes offer it or are unknown, the fallback otherwise.
 * @param asked - The page size the view holds, absent when it names none.
 * @param sizes - The page sizes the list offers, absent while unknown.
 * @param fallback - The size the list opens on, taken in place of one the sizes do not offer.
 * @returns The page size.
 */
export function offeredSize(
	asked: number | undefined,
	sizes: readonly number[] | undefined,
	fallback: number | undefined,
): number | undefined {
	if (sizes === undefined || sizes.some((size) => size === asked)) {
		return asked
	}
	return fallback
}

/**
 * Returns the part of a view a server pages by, leaving its page size out while the sizes are unknown.
 * @param view - The view the list shows.
 * @param sizes - The page sizes the list offers, absent while unknown.
 * @returns The page alone while the sizes are unknown, else the page and its size.
 */
export function sizedView(view: PagedView, sizes: readonly number[] | undefined): PagedView {
	return sizes === undefined ? { page: view.page } : { page: view.page, perPage: view.perPage }
}

/**
 * Holds the size the server last served and answers the rows to ask for the page a view shows.
 * @param view - The view the list shows.
 * @param cap - The largest page the server serves.
 * @returns The page window and the recorder of each page the server serves.
 */
export function useServerPaging(view: PagedView, cap?: number): ServerPaging {
	const [last, setLast] = useState<ServedSize>()
	const window = pageWindow(view, last, cap)
	return {
		window,
		record: (page, asked) => {
			if (page === undefined || asked !== window.limit) {
				return
			}
			if (page.limit !== last?.served || asked !== last.asked) {
				setLast({ asked, served: page.limit })
			}
		},
	}
}
