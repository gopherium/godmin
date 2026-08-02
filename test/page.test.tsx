// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { ErrorNotice, LoadMore, Page, PageTitle } from '../src/page.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

test('renders the title as the page heading', () => {
	renderAdmin(<Page title="Reports">body</Page>)

	expect(screen.getByRole('heading', { level: 1, name: 'Reports' })).not.toBeNull()
	expect(screen.getByText('body')).not.toBeNull()
})

test('renders the subtitle under the title', () => {
	renderAdmin(
		<Page title="Reports" subtitle="Friday, Aug 1">
			body
		</Page>,
	)

	expect(screen.getByText('Friday, Aug 1')).not.toBeNull()
})

test('omits the subtitle when a screen gives none', () => {
	const { container } = renderAdmin(<Page title="Reports">body</Page>)

	expect(container.querySelector('.godmin-page__subtitle')).toBeNull()
})

test('renders the actions beside the title', () => {
	renderAdmin(
		<Page title="Reports" actions={<button type="button">New report</button>}>
			body
		</Page>,
	)

	expect(screen.getByRole('button', { name: 'New report' })).not.toBeNull()
})

test('carries the shared page class, with a screen class when given one', () => {
	const { container: plain } = renderAdmin(<Page title="Reports">body</Page>)
	expect(plain.querySelector('.godmin-page')).not.toBeNull()

	const { container: classed } = renderAdmin(
		<Page title="Reports" className="acme-reports">
			body
		</Page>,
	)
	expect(classed.querySelector('.godmin-page.acme-reports')).not.toBeNull()
})

test('renders a page title on its own for a screen building its own chrome', () => {
	renderAdmin(<PageTitle variant="heading-md">Maria Perez</PageTitle>)

	expect(screen.getByRole('heading', { level: 1, name: 'Maria Perez' })).not.toBeNull()
})

test('load more renders nothing without a next page', () => {
	renderAdmin(
		<LoadMore query={{ hasNextPage: false, isFetchingNextPage: false, fetchNextPage: vi.fn() }}>
			Load more
		</LoadMore>,
	)

	expect(screen.queryByRole('button', { name: 'Load more' })).toBeNull()
})

test('load more fetches the next page on click', () => {
	const fetchNextPage = vi.fn().mockResolvedValue(undefined)
	renderAdmin(
		<LoadMore query={{ hasNextPage: true, isFetchingNextPage: false, fetchNextPage }}>
			Load more
		</LoadMore>,
	)

	screen.getByRole('button', { name: 'Load more' }).click()

	expect(fetchNextPage).toHaveBeenCalledOnce()
})

test('load more disables while a page is in flight', () => {
	renderAdmin(
		<LoadMore query={{ hasNextPage: true, isFetchingNextPage: true, fetchNextPage: vi.fn() }}>
			Load more
		</LoadMore>,
	)

	expect(screen.getByRole('button', { name: 'Load more' }).getAttribute('aria-disabled')).toBe(
		'true',
	)
})

test('error notices announce themselves to a screen reader', () => {
	renderAdmin(<ErrorNotice>Reports could not be loaded.</ErrorNotice>)

	expect(screen.getByRole('alert').textContent).toContain('Reports could not be loaded.')
})
