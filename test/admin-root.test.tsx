// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { beforeEach, expect, test } from 'vitest'

import { AdminRoot } from '../src/index'

interface CompatWindow extends Window {
	__wpUiCompatOverlaySlotEnabled?: boolean
}

beforeEach(() => {
	delete (window as CompatWindow).__wpUiCompatOverlaySlotEnabled
})

test('renders its children', () => {
	render(<AdminRoot><p>admin content</p></AdminRoot>)

	expect(screen.getByText('admin content')).not.toBeNull()
})

test('isolates its own stacking context', () => {
	const { container } = render(<AdminRoot><p>admin content</p></AdminRoot>)

	const root = container.firstElementChild as HTMLElement
	expect(root.style.isolation).toBe('isolate')
})

test('enables the design system overlay slot once mounted', () => {
	render(<AdminRoot><p>admin content</p></AdminRoot>)

	expect((window as CompatWindow).__wpUiCompatOverlaySlotEnabled).toBe(true)
})

test('contributes no layout, landmark or width of its own', () => {
	const { container } = render(<AdminRoot><p>admin content</p></AdminRoot>)

	const root = container.firstElementChild as HTMLElement
	expect(root.getAttribute('role')).toBeNull()
	expect(root.className).toBe('')
	expect(root.style.width).toBe('')
	expect(root.style.display).toBe('')
	expect(root.style.height).toBe('')
})

test('passes theme configuration through to the design system provider', () => {
	const { container } = render(
		<AdminRoot color={{ primary: '#3858e9' }}><p>admin content</p></AdminRoot>,
	)

	expect(container.querySelector('[style*="--wpds"]')).not.toBeNull()
})

test('accepts a custom element type for the root', () => {
	const { container } = render(<AdminRoot as="main"><p>admin content</p></AdminRoot>)

	expect(container.firstElementChild?.tagName).toBe('MAIN')
})
