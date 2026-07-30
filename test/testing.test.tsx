// SPDX-License-Identifier: Apache-2.0

import { setup, speak } from '@wordpress/a11y'
import { screen } from '@testing-library/react'
import { beforeAll, expect, test } from 'vitest'

import {
	WPDS_IGNORE_SELECTOR,
	assertElementPatched,
	clearAnnouncements,
	getAnnouncement,
	installTestEnvironment,
	renderAdmin,
} from '../src/testing'

installTestEnvironment()

beforeAll(() => {
	setup()
})

test('names both node kinds the design system announces through', () => {
	expect(WPDS_IGNORE_SELECTOR).toContain('script')
	expect(WPDS_IGNORE_SELECTOR).toContain('style')
	expect(WPDS_IGNORE_SELECTOR).toContain('[id^="a11y-speak"]')
})

test('queries ignore the live region that repeats an announcement', () => {
	renderAdmin(<p>Post saved</p>)

	speak('Post saved')

	expect(screen.getByText('Post saved')).not.toBeNull()
})

test('queries ignore the intro text labelling the live region', () => {
	renderAdmin(<p>Notifications</p>)

	speak('anything')

	expect(screen.getByText('Notifications')).not.toBeNull()
})

test('reports what was announced politely', () => {
	speak('Draft saved')

	expect(getAnnouncement()).toBe('Draft saved')
})

test('reports what was announced assertively', () => {
	speak('Save failed', 'assertive')

	expect(getAnnouncement('assertive')).toBe('Save failed')
})

test('clears announcements on request', () => {
	speak('Draft saved')

	clearAnnouncements()

	expect(getAnnouncement()).toBe('')
})

test('an announcement here must not leak into the next test', () => {
	speak('leaked message')

	expect(getAnnouncement()).toBe('leaked message')
})

test('starts with no announcement left over from the previous test', () => {
	expect(getAnnouncement()).toBe('')
})

test('renders inside the design system host so tokens resolve', () => {
	const { container } = renderAdmin(<p>themed</p>)

	expect(container.querySelector('[style*="isolation"]')).not.toBeNull()
	expect(screen.getByText('themed')).not.toBeNull()
})

test('passes host theme settings through to the rendered tree', () => {
	const { container } = renderAdmin(<p>themed</p>, { as: 'main', color: { primary: '#3858e9' } })

	expect(container.firstElementChild?.tagName).toBe('MAIN')
	expect(container.querySelector('[style*="--wpds"]')).not.toBeNull()
})

test('reports an empty announcement when the region is absent', () => {
	document.getElementById('a11y-speak-polite')?.remove()

	expect(getAnnouncement()).toBe('')
})

test('accepts an element build with the React 19 compatibility patch applied', async () => {
	await expect(assertElementPatched()).resolves.toBeUndefined()
})

test('rejects an element build still exposing an api React 19 removed', async () => {
	const unpatched = { findDOMNode: () => null, createRoot: () => ({}), createPortal: () => null }

	await expect(assertElementPatched(async () => unpatched)).rejects.toThrow(/findDOMNode/)
})

test('rejects an element build missing an api it must still provide', async () => {
	const broken = { findDOMNode: undefined, createRoot: undefined, createPortal: () => null }

	await expect(assertElementPatched(async () => broken)).rejects.toThrow(/createRoot/)
})

test('reports an element build that cannot be imported at all', async () => {
	const failing = async () => {
		throw new Error("Named export 'findDOMNode' not found")
	}

	await expect(assertElementPatched(failing)).rejects.toThrow(/could not be imported/)
})

test('provides the media query API jsdom lacks', () => {
	expect(typeof window.matchMedia).toBe('function')

	const query = window.matchMedia('(min-width: 600px)')

	expect(query.matches).toBe(false)
	expect(query.media).toBe('(min-width: 600px)')
	query.addEventListener('change', () => {})
	query.removeEventListener('change', () => {})
})

test('leaves an existing media query implementation alone', () => {
	const existing = window.matchMedia

	installTestEnvironment()

	expect(window.matchMedia).toBe(existing)
})
