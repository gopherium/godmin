// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { post } from '@wordpress/icons'
import { afterEach, expect, test } from 'vitest'

import { DrilldownItem } from '../src/drilldown-item.js'
import { NavigationStateContext, createNavigationState } from '../src/navigation-state.js'
import type { NavigationState } from '../src/navigation-state.js'
import { installTestEnvironment } from '../src/testing.js'
import { holdsEvery, renderRows } from './sidebar-routes.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

/** The line chevronRightSmall draws, the glyph the Site Editor ends a drilldown row with. */
const RIGHT_CHEVRON = 'M10.5 8.5L13.5 12L10.5 15.5'

/** The line chevronLeftSmall draws, the glyph a right to left locale ends a drilldown row with. */
const LEFT_CHEVRON = 'M13.5 8.5L10.5 12L13.5 15.5'

/**
 * Returns the last element a row link holds.
 * @param name - The accessible name of the row link.
 * @returns That element.
 */
function lastPartOf(name: string): Element {
	return screen.getByRole('link', { name }).lastElementChild as Element
}

test('draws the chevron at the end of the row as the drilldown indicator, 24px and hidden', async () => {
	await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things" icon={post}>
				Things
			</DrilldownItem>
		</ul>,
		holdsEvery,
	)

	const chevron = lastPartOf('Things')
	expect(chevron.getAttribute('class')).toBe('godmin-navigation-item__drilldown-indicator')
	expect(chevron.querySelector('path')?.getAttribute('d')).toBe(RIGHT_CHEVRON)
	expect(chevron.getAttribute('width')).toBe('24')
	expect(chevron.getAttribute('aria-hidden')).toBe('true')
})

test('draws the left chevron when the locale reads right to left, as WordPress picks it with isRTL', async () => {
	setLocaleData({ 'text direction\u0004ltr': ['rtl'] })
	await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things">Things</DrilldownItem>
		</ul>,
		holdsEvery,
	)

	expect(lastPartOf('Things').querySelector('path')?.getAttribute('d')).toBe(LEFT_CHEVRON)
})

test('draws a list item holding a link with the classes and parts of a navigation item, no suffix', async () => {
	await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things" icon={post}>
				Things
			</DrilldownItem>
		</ul>,
		holdsEvery,
	)

	const link = screen.getByRole('link', { name: 'Things' })
	expect(link.getAttribute('href')).toBe('/things')
	expect(link.parentElement?.tagName).toBe('LI')
	expect(link.className).toBe('godmin-navigation-item')
	expect([...link.children].map((part) => part.getAttribute('class'))).toEqual([
		'godmin-navigation-item__icon',
		'godmin-navigation-item__label',
		'godmin-navigation-item__drilldown-indicator',
	])
})

test('takes its id from its address, the same however the address is written and another for another', async () => {
	await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things/$thingId" params={{ thingId: 'one' }}>
				Thing one by its route
			</DrilldownItem>
			<DrilldownItem to="/things/one">Thing one by its path</DrilldownItem>
			<DrilldownItem to="/things/two">Thing two</DrilldownItem>
		</ul>,
		holdsEvery,
	)

	const byRoute = screen.getByRole('link', { name: 'Thing one by its route' })
	const byPath = screen.getByRole('link', { name: 'Thing one by its path' })
	const other = screen.getByRole('link', { name: 'Thing two' })
	expect(byRoute.id).not.toBe('')
	expect(byRoute.id).toBe(byPath.id)
	expect(other.id).not.toBe(byRoute.id)
	expect(document.getElementById(other.id)).toBe(other)
})

test('hides a row whose address opens a route asking for a capability the reader lacks', async () => {
	await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things/one">Thing one</DrilldownItem>
			<DrilldownItem to="/things">Things</DrilldownItem>
		</ul>,
		(capability) => capability === 'list_things',
	)

	expect(screen.queryByRole('link', { name: 'Thing one' })).toBeNull()
	expect(screen.getByRole('link', { name: 'Things' })).not.toBeNull()
})

/**
 * Renders a drilldown row to the things section inside a frame's shared state.
 * @param path - The address to start at.
 * @returns The state the row records its moves in.
 */
async function renderInFrame(path = '/posts'): Promise<NavigationState> {
	const state = createNavigationState()
	await renderRows(
		path,
		<NavigationStateContext.Provider value={state}>
			<ul>
				<DrilldownItem to="/things">Things</DrilldownItem>
			</ul>
		</NavigationStateContext.Provider>,
		holdsEvery,
	)
	return state
}

test('records a forward move to its address with its own id, and a drawer that stays on that address', async () => {
	const state = await renderInFrame()
	const row = screen.getByRole('link', { name: 'Things' })

	await act(async () => {
		fireEvent.click(row)
	})

	expect(state.move).toEqual({ direction: 'forward', address: '/things', rowId: row.id })
	expect(state.drawerStaysOn).toBe('/things')
})

test('records nothing when clicked on the address already open, which moves nowhere', async () => {
	const state = await renderInFrame('/things')

	await act(async () => {
		fireEvent.click(screen.getByRole('link', { name: 'Things' }))
	})

	expect(state).toEqual(createNavigationState())
})

test.each([['ctrlKey'], ['metaKey'], ['shiftKey'], ['altKey']])(
	'records nothing on a click with %s, which opens a new tab or window',
	async (key) => {
		const state = await renderInFrame()

		fireEvent.click(screen.getByRole('link', { name: 'Things' }), { [key]: true })

		expect(state).toEqual(createNavigationState())
	},
)

test('records nothing on a click with another button than the main one', async () => {
	const state = await renderInFrame()

	fireEvent.click(screen.getByRole('link', { name: 'Things' }), { button: 1 })

	expect(state).toEqual(createNavigationState())
})

test('opens its address outside a frame', async () => {
	const router = await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things">Things</DrilldownItem>
		</ul>,
		holdsEvery,
	)

	await act(async () => {
		fireEvent.click(screen.getByRole('link', { name: 'Things' }))
	})

	expect(router.state.location.pathname).toBe('/things')
})

test('hides that row when no can reaches it, as capabilities fail closed', async () => {
	await renderRows(
		'/posts',
		<ul>
			<DrilldownItem to="/things">Things</DrilldownItem>
		</ul>,
	)

	expect(screen.queryByRole('link', { name: 'Things' })).toBeNull()
})
