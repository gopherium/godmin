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
	/** How many rows the server put on one page. */
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
	/** Records the size of the page the server served, given as the object the query answered. */
	record: (page: ServedPage | undefined) => void
}

/**
 * Returns how many rows each page before the shown one holds.
 * @param limit - The rows asked for on one page, or null for the size the server serves by default.
 * @param last - The size the server last served, absent before it served any.
 * @returns The size served when it answered this same ask and is no larger, the size asked otherwise.
 */
function stepOf(limit: number | null, last?: ServedSize): number {
	const answered = last !== undefined && last.asked === limit
	if (limit === null) {
		return answered ? last.served : 0
	}
	return answered && last.served < limit ? last.served : limit
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
	return { totalItems: page.total, totalPages: Math.ceil(page.total / page.limit) }
}

/** The size the server last served, with the page that carried it. */
interface Recorded extends ServedSize {
	/** The page the query answered. */
	page: ServedPage
}

/**
 * Holds the size the server last served and answers the rows to ask for the page a view shows.
 * @param view - The view the list shows.
 * @param cap - The largest page the server serves.
 * @returns The page window and the recorder of each page the server serves.
 */
export function useServerPaging(view: PagedView, cap?: number): ServerPaging {
	const [last, setLast] = useState<Recorded>()
	const window = pageWindow(view, last, cap)
	return {
		window,
		record: (page) => {
			if (page === undefined || page === last?.page) {
				return
			}
			if (page.limit !== last?.served || window.limit !== last.asked) {
				setLast({ asked: window.limit, served: page.limit, page })
			}
		},
	}
}
