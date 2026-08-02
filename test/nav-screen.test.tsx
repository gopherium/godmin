// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { NavScreen } from '../src/nav-screen.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

test('renders the title, back affordance, description, actions, content and footer', () => {
	renderAdmin(
		<NavScreen
			title="Conversations"
			back={<a href="/" />}
			description="Everything unanswered"
			actions={<button type="button">New</button>}
			footer={<span>footer text</span>}
		>
			<p>screen content</p>
		</NavScreen>,
	)

	expect(screen.getByRole('heading', { level: 2, name: 'Conversations' })).not.toBeNull()
	expect(screen.getByRole('link', { name: 'Back' })).not.toBeNull()
	expect(screen.getByText('Everything unanswered')).not.toBeNull()
	expect(screen.getByRole('button', { name: 'New' })).not.toBeNull()
	expect(screen.getByText('screen content')).not.toBeNull()
	expect(screen.getByText('footer text')).not.toBeNull()
})

test('omits the back affordance and optional regions on a root screen', () => {
	const { container } = renderAdmin(
		<NavScreen title="Home">
			<p>root content</p>
		</NavScreen>,
	)

	expect(screen.getByRole('heading', { level: 2, name: 'Home' })).not.toBeNull()
	expect(screen.queryByRole('link', { name: 'Back' })).toBeNull()
	expect(screen.getByText('root content')).not.toBeNull()
	expect(container.querySelector('.godmin-nav-screen__description')).toBeNull()
	expect(container.querySelector('.godmin-nav-screen__actions')).toBeNull()
	expect(container.querySelector('.godmin-nav-screen__footer')).toBeNull()
})

test('moves focus to the title on arrival, so the drill down is announced', () => {
	renderAdmin(
		<NavScreen title="Conversations">
			<p>screen content</p>
		</NavScreen>,
	)

	expect(document.activeElement).toBe(screen.getByRole('heading', { name: 'Conversations' }))
})

test('renders the back affordance through the element the screen supplied', () => {
	renderAdmin(
		<NavScreen title="Conversations" back={<a href="/inbox" data-testid="own-link" />}>
			<p>screen content</p>
		</NavScreen>,
	)

	const back = screen.getByRole('link', { name: 'Back' })
	expect(back.getAttribute('href')).toBe('/inbox')
	expect(back.getAttribute('data-testid')).toBe('own-link')
})

test('lets a screen name the back affordance itself', () => {
	renderAdmin(
		<NavScreen title="Conversations" back={<a href="/" />} backLabel="Back to sections">
			<p>screen content</p>
		</NavScreen>,
	)

	expect(screen.getByRole('link', { name: 'Back to sections' })).not.toBeNull()
})
