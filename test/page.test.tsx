// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { Text } from '@wordpress/ui'
import { expect, test, vi } from 'vitest'

import { ErrorNotice, LoadMore, Page, PageTitle, SectionTitle } from '../src/page.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Returns the class tokens the design system gives a sampled element.
 * @param element - The element to sample, carrying id="sample".
 * @returns The class tokens.
 */
function sampledClasses(element: React.ReactElement): string[] {
	const { container } = renderAdmin(element)
	return [...(container.querySelector('#sample') as Element).classList]
}

test('renders a section title as a level 2 heading at the large heading size', () => {
	const large = sampledClasses(<Text id="sample" variant="heading-lg" />)

	renderAdmin(<SectionTitle>Identities</SectionTitle>)

	const heading = screen.getByRole('heading', { level: 2, name: 'Identities' })
	expect([...heading.classList]).toEqual(expect.arrayContaining(large))
})

test('renders a level 3 section title at the medium heading size', () => {
	const medium = sampledClasses(<Text id="sample" variant="heading-md" />)

	renderAdmin(<SectionTitle level={3}>Sub fields</SectionTitle>)

	const heading = screen.getByRole('heading', { level: 3, name: 'Sub fields' })
	expect([...heading.classList]).toEqual(expect.arrayContaining(medium))
})

test('sets a section title apart from a field label', () => {
	const label = sampledClasses(<Text id="sample" variant="heading-sm" />)

	renderAdmin(<SectionTitle>Identities</SectionTitle>)

	const heading = screen.getByRole('heading', { level: 2, name: 'Identities' })
	expect([...heading.classList].sort()).not.toEqual([...label].sort())
})

test('passes an id and a tab index through, so a screen can move focus to a section', () => {
	renderAdmin(
		<SectionTitle id="fields" tabIndex={-1}>
			Fields
		</SectionTitle>,
	)

	const heading = screen.getByRole('heading', { level: 2, name: 'Fields' })
	expect(heading.getAttribute('id')).toBe('fields')
	expect(heading.getAttribute('tabindex')).toBe('-1')
})

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

test('renders the aside beside the content, under a title spanning both', () => {
	const { container } = renderAdmin(
		<Page title="Reports" aside={<p>Details</p>}>
			<p>body</p>
		</Page>,
	)

	const split = container.querySelector('.godmin-page__split')
	expect(split?.querySelector('.godmin-page__main')?.textContent).toBe('body')
	expect(split?.querySelector('.godmin-page__aside')?.textContent).toBe('Details')
	expect(split?.contains(screen.getByRole('heading', { level: 1, name: 'Reports' }))).toBe(false)
})

test('keeps the aside after the content in reading order', () => {
	const { container } = renderAdmin(
		<Page title="Reports" aside={<p>Details</p>}>
			<p>body</p>
		</Page>,
	)

	const main = container.querySelector('.godmin-page__main')
	const aside = container.querySelector('.godmin-page__aside')

	expect(main).not.toBeNull()
	expect(aside).not.toBeNull()
	expect(main?.compareDocumentPosition(aside as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
})

/**
 * Renders nothing, as a panel with nothing to show does.
 * @returns Nothing.
 */
function Nothing() {
	return null
}

test('leaves an aside that renders nothing empty, so the stylesheet hides it', () => {
	const { container } = renderAdmin(
		<Page title="Reports" aside={<Nothing />}>
			<p>body</p>
		</Page>,
	)

	expect(container.querySelector('.godmin-page__aside:empty')).not.toBeNull()
})

test('renders one column when a screen gives no aside', () => {
	const { container } = renderAdmin(<Page title="Reports">body</Page>)

	expect(container.querySelector('.godmin-page__split')).toBeNull()
	expect(screen.getByText('body')).not.toBeNull()
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
