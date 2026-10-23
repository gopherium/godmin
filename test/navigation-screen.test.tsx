// SPDX-License-Identifier: Apache-2.0

import { createEvent, fireEvent, screen } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import type { MouseEvent, ReactElement, ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import spanish from '../src/list-chrome/es-ES.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { NavigationStateContext, ScreenContext, createNavigationState } from '../src/navigation-state.js'
import type { NavigationState, ScreenState } from '../src/navigation-state.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

afterEach(() => {
	resetLocaleData()
})

/** The line chevronLeft draws, the glyph of the Site Editor's Back. */
const LEFT_CHEVRON = 'M14 6.5L9 12L14 17.5'

/** The line chevronRight draws, the glyph of Back in a right to left locale. */
const RIGHT_CHEVRON = 'M10 6.5L15 12L10 17.5'

/** The class of the title row, the Site Editor's name for it. */
const TITLE_ROW = 'godmin-navigation-screen__title-icon'

/**
 * Renders a screen inside what a Navigation hands each screen it draws.
 * @param screenState - Whether the screen is the root, the app's home and its can.
 * @param ui - The screen to render.
 * @returns The testing library render result.
 */
function renderInside(screenState: ScreenState, ui: ReactNode) {
	return renderAdmin(<ScreenContext.Provider value={screenState}>{ui}</ScreenContext.Provider>)
}

/**
 * Renders a screen with every region, its Back through the element given.
 * @param back - The element Back renders through.
 * @returns The testing library render result.
 */
function renderFull(back: ReactElement<Record<string, unknown>> = <a href="#sections" />) {
	return renderAdmin(
		<NavigationScreen
			title="Conversations"
			back={back}
			description="Everything unanswered"
			actions={<button type="button">New</button>}
			footer={<span>footer text</span>}
		>
			<p>screen content</p>
		</NavigationScreen>,
	)
}

test('renders the title as the level 1 heading, then Back, description, actions, content and footer', () => {
	renderFull()

	expect(screen.getByRole('heading', { level: 1, name: 'Conversations' })).not.toBeNull()
	expect(screen.getByRole('link', { name: 'Back' })).not.toBeNull()
	expect(screen.getByText('Everything unanswered')).not.toBeNull()
	expect(screen.getByRole('button', { name: 'New' })).not.toBeNull()
	expect(screen.getByText('screen content')).not.toBeNull()
	expect(screen.getByText('footer text')).not.toBeNull()
})

test('takes any node as its title, so the root screen can hold the brand', () => {
	renderAdmin(
		<NavigationScreen title={<span data-testid="brand">Acme</span>}>
			<p>root content</p>
		</NavigationScreen>,
	)

	const heading = screen.getByRole('heading', { level: 1, name: 'Acme' })
	expect(heading.contains(screen.getByTestId('brand'))).toBe(true)
})

test('names the screen and each of its regions with the names the Site Editor gives them', () => {
	const { container } = renderFull()

	const block = container.querySelector('.godmin-navigation-screen') as Element
	const main = block.querySelector('.godmin-navigation-screen__main') as Element
	const row = main.querySelector(`.${TITLE_ROW}`) as Element
	const content = main.querySelector('.godmin-navigation-screen__content') as Element
	expect([...row.children].map((part) => part.classList[part.classList.length - 1])).toEqual([
		'godmin-navigation-screen__back',
		'godmin-navigation-screen__title',
		'godmin-navigation-screen__actions',
	])
	expect(row.querySelector('.godmin-navigation-screen__title')?.tagName).toBe('H1')
	expect(content.firstElementChild?.className).toBe('godmin-navigation-screen__description')
	expect(content.lastElementChild?.textContent).toBe('screen content')
	expect(main.nextElementSibling?.className).toBe('godmin-navigation-screen__footer')
	expect(main.nextElementSibling?.textContent).toBe('footer text')
})

test('draws the screen footer as a footer element, as the Site Editor does', () => {
	const { container } = renderFull()

	expect(container.querySelector('.godmin-navigation-screen__footer')?.tagName).toBe('FOOTER')
})

test('marks the main region of a screen with a footer, as the Site Editor drops its bottom space', () => {
	const { container } = renderFull()

	expect(container.querySelector('.godmin-navigation-screen__main')?.className).toBe(
		'godmin-navigation-screen__main godmin-navigation-screen__main--has-footer',
	)
})

test('omits Back and the optional regions on a screen that gives none', () => {
	const { container } = renderAdmin(
		<NavigationScreen title="Home">
			<p>root content</p>
		</NavigationScreen>,
	)

	expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
	expect(screen.getByText('root content')).not.toBeNull()
	expect(container.querySelector('.godmin-navigation-screen__description')).toBeNull()
	expect(container.querySelector('.godmin-navigation-screen__actions')).toBeNull()
	expect(container.querySelector('.godmin-navigation-screen__footer')).toBeNull()
	expect(container.querySelector('.godmin-navigation-screen__main')?.className).toBe('godmin-navigation-screen__main')
})

test('keeps the Back slot of a screen with no Back, so its title lines up with the title of a sub screen', () => {
	const { container } = renderAdmin(
		<NavigationScreen title="Home">
			<p>root content</p>
		</NavigationScreen>,
	)

	expect(container.querySelector(`.${TITLE_ROW}`)?.className).toBe(`${TITLE_ROW} ${TITLE_ROW}--root`)
})

test('leaves the title row of a screen with Back unmarked', () => {
	const { container } = renderFull()

	expect(container.querySelector(`.${TITLE_ROW}`)?.className).toBe(TITLE_ROW)
})

test('moves no focus on mount, since the menu around it owns focus', () => {
	renderFull()

	expect(document.activeElement).toBe(document.body)
	expect(screen.getByRole('heading', { level: 1 }).hasAttribute('tabindex')).toBe(false)
})

test('draws Back as the chevron left line at 24px, hidden from assistive technology', () => {
	renderFull()

	const glyph = screen.getByRole('link', { name: 'Back' }).querySelector('svg')
	expect(glyph?.querySelector('path')?.getAttribute('d')).toBe(LEFT_CHEVRON)
	expect(glyph?.getAttribute('width')).toBe('24')
	expect(glyph?.getAttribute('aria-hidden')).toBe('true')
})

test('draws Back as the chevron right line in a right to left locale, as WordPress picks it with isRTL', () => {
	setLocaleData({ 'text direction\u0004ltr': ['rtl'] })
	renderFull()

	const glyph = screen.getByRole('link', { name: 'Back' }).querySelector('svg')
	expect(glyph?.querySelector('path')?.getAttribute('d')).toBe(RIGHT_CHEVRON)
})

test('names Back in the reader language from the words godmin ships in the default domain', () => {
	setLocaleData(spanish)
	renderFull()

	expect(screen.getByRole('link', { name: 'Volver' })).not.toBeNull()
})

test('renders Back through the element the screen supplied', () => {
	renderFull(<a href="#inbox" data-testid="own-link" />)

	const back = screen.getByRole('link', { name: 'Back' })
	expect(back.getAttribute('href')).toBe('#inbox')
	expect(back.getAttribute('data-testid')).toBe('own-link')
})

test('lets a screen name Back itself', () => {
	renderAdmin(
		<NavigationScreen title="Conversations" back={<a href="#sections" />} backLabel="Back to sections">
			<p>screen content</p>
		</NavigationScreen>,
	)

	expect(screen.getByRole('link', { name: 'Back to sections' })).not.toBeNull()
})

test('goes to the home of the Navigation around it when a sub screen names no back', () => {
	renderInside(
		{ isRoot: false, home: <a href="#home" /> },
		<NavigationScreen title="Conversations">
			<p>screen content</p>
		</NavigationScreen>,
	)

	expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('#home')
})

test('goes to its own back before the home of the Navigation around it', () => {
	renderInside(
		{ isRoot: false, home: <a href="#home" /> },
		<NavigationScreen title="Conversations" back={<a href="#parent" />}>
			<p>screen content</p>
		</NavigationScreen>,
	)

	expect(screen.getByRole('link', { name: 'Back' }).getAttribute('href')).toBe('#parent')
})

test('draws no Back on the root screen of a Navigation, whatever back it names', () => {
	const { container } = renderInside(
		{ isRoot: true, home: <a href="#home" /> },
		<NavigationScreen title="Acme" back={<a href="#parent" />}>
			<p>root content</p>
		</NavigationScreen>,
	)

	expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
	expect(container.querySelector(`.${TITLE_ROW}`)?.className).toBe(`${TITLE_ROW} ${TITLE_ROW}--root`)
})

/**
 * Renders a sub screen inside a frame's shared state and what a Navigation hands each screen.
 * @param back - The element Back renders through.
 * @param targetOf - Where the Navigation says a link moves the reader, the link's href when absent.
 * @returns The state Back records its moves in.
 */
function renderInNavigation(
	back: ReactElement<Record<string, unknown>>,
	targetOf: ScreenState['targetOf'] = (link) => String(link.props.href),
): NavigationState {
	const state = createNavigationState()
	renderAdmin(
		<NavigationStateContext.Provider value={state}>
			<ScreenContext.Provider value={{ isRoot: false, targetOf }}>
				<NavigationScreen title="Conversations" back={back}>
					<p>screen content</p>
				</NavigationScreen>
			</ScreenContext.Provider>
		</NavigationStateContext.Provider>,
	)
	return state
}

test('records a backward move to where its link goes, and a drawer that stays there, when Back is clicked', () => {
	const state = renderInNavigation(<a href="#sections" />)

	fireEvent.click(screen.getByRole('link', { name: 'Back' }))

	expect(state.move).toEqual({ direction: 'backward', address: '#sections' })
	expect(state.drawerStaysOn).toBe('#sections')
})

test('records nothing when Back goes to the address already open, which moves nowhere', () => {
	const state = renderInNavigation(<a href="#sections" />, () => undefined)

	fireEvent.click(screen.getByRole('link', { name: 'Back' }))

	expect(state).toEqual(createNavigationState())
})

test('records nothing when Back is clicked with a modifier key, which opens a new tab', () => {
	const state = renderInNavigation(<a href="#sections" />)

	fireEvent.click(screen.getByRole('link', { name: 'Back' }), { ctrlKey: true })

	expect(state).toEqual(createNavigationState())
})

test('records nothing when the element Back renders through stops the move itself', () => {
	const stop = vi.fn((event: MouseEvent) => event.preventDefault())
	const state = renderInNavigation(<a href="#stopped" onClick={stop} />)

	fireEvent.click(screen.getByRole('link', { name: 'Back' }))

	expect(stop).toHaveBeenCalledTimes(1)
	expect(state).toEqual(createNavigationState())
})

test('records nothing when Back is clicked inside a frame but outside a Navigation, which slides no screen', () => {
	const state = createNavigationState()
	renderAdmin(
		<NavigationStateContext.Provider value={state}>
			<NavigationScreen title="Conversations" back={<a href="#sections" />}>
				<p>screen content</p>
			</NavigationScreen>
		</NavigationStateContext.Provider>,
	)

	fireEvent.click(screen.getByRole('link', { name: 'Back' }))

	expect(state).toEqual(createNavigationState())
})

test('leaves the click on Back to its link outside a frame', () => {
	renderFull(<a href="#outside" />)
	const back = screen.getByRole('link', { name: 'Back' })
	const click = createEvent.click(back)

	fireEvent(back, click)

	expect(click.defaultPrevented).toBe(false)
})
