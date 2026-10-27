// SPDX-License-Identifier: Apache-2.0

import { act, screen } from '@testing-library/react'
import { DataViews } from '@wordpress/dataviews'
import type { Field, View } from '@wordpress/dataviews'
import type { ReactElement } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { Page } from '../src/page.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()
afterEach(() => {
	vi.useRealTimers()
})

/** A row of the list. */
interface Report {
	id: string
	title: string
}

/** The one field of the list, its title. */
const FIELDS: Field<Report>[] = [{ id: 'title', label: 'Title', getValue: ({ item }) => item.title }]

/** The view the list shows: a table of ten rows on its first page. */
const VIEW: View = { type: 'table', titleField: 'title', page: 1, perPage: 10 }

/** What draws the list with a loading flag, the first time and every time after. */
type Show = (isLoading: boolean) => void

/** Renders a list page holding a DataViews list with no rows and the given loading flag. */
function ListPage({ isLoading }: { isLoading: boolean }) {
	return (
		<Page title="Reports" list>
			<DataViews
				data={[]}
				fields={FIELDS}
				view={VIEW}
				onChangeView={() => {}}
				defaultLayouts={{ table: {} }}
				paginationInfo={{ totalItems: 0, totalPages: 0 }}
				isLoading={isLoading}
			/>
		</Page>
	)
}

/** Returns what draws the list page, rendering it the first time and rendering it again after. */
function listShower(): Show {
	let rerender: ((page: ReactElement) => void) | undefined
	return (isLoading) => {
		const page = <ListPage isLoading={isLoading} />
		if (rerender === undefined) {
			rerender = renderAdmin(page).rerender
		} else {
			rerender(page)
		}
	}
}

/** Tells whether the list shows the spinner of a first load. */
function spinning(): boolean {
	return document.querySelector('.dataviews-loading') !== null
}

/** Tells whether the empty state of the list is dimmed. */
function dimmed(): boolean | undefined {
	return document.querySelector('.dataviews-no-results')?.classList.contains('is-refreshing')
}

/** Moves the clock on by the given milliseconds. */
function wait(milliseconds: number) {
	act(() => vi.advanceTimersByTime(milliseconds))
}

/** Opens the list with a loading flag of false, which shows its empty state on the first render. */
function startsFalse(show: Show) {
	show(false)
	expect(screen.getByText('No results')).toBeDefined()
}

/** Opens the list on a first load that ends with no rows, which shows the spinner during that load only. */
function endsEmpty(show: Show) {
	show(true)
	wait(250)
	expect(spinning(), 'the spinner of the first load').toBe(true)
	show(false)
	expect(spinning(), 'the spinner once the first load ended').toBe(false)
}

test.each([
	{ case: 'whose loading flag starts false', open: startsFalse },
	{ case: 'whose last answer was empty', open: endsEmpty },
])('keeps the empty state of a list $case and dims it after 400ms, never showing the spinner', ({ open }) => {
	vi.useFakeTimers()
	const show = listShower()
	open(show)

	show(true)
	const readings = [[spinning(), dimmed()]]
	wait(399)
	readings.push([spinning(), dimmed()])
	wait(1)
	readings.push([spinning(), dimmed()])
	wait(1000)
	readings.push([spinning(), dimmed()])

	expect(screen.getByText('No results')).toBeDefined()
	expect(readings).toEqual([
		[false, false],
		[false, false],
		[false, true],
		[false, true],
	])
})
