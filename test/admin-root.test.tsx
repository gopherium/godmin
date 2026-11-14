// SPDX-License-Identifier: Apache-2.0

import { render, renderHook, screen } from '@testing-library/react'
import { useContext } from 'react'
import type { ReactNode } from 'react'
import { beforeEach, expect, expectTypeOf, onTestFinished, test, vi } from 'vitest'

import { WriteTimeoutContext } from '../src/dialog-open.js'
import { AdminRoot } from '../src/index'
import type { AdminRootProps } from '../src/index'

interface CompatWindow extends Window {
	__wpUiCompatOverlaySlotEnabled?: boolean
}

/** The write time limit in milliseconds an app feeds from its own settings. */
const APP_LIMIT = 30_000

beforeEach(() => {
	delete (window as CompatWindow).__wpUiCompatOverlaySlotEnabled
})

test('renders its children', () => {
	render(<AdminRoot writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	expect(screen.getByText('admin content')).not.toBeNull()
})

test('isolates its own stacking context', () => {
	const { container } = render(<AdminRoot writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	const root = container.firstElementChild as HTMLElement
	expect(root.style.isolation).toBe('isolate')
})

test('enables the design system overlay slot once mounted', () => {
	render(<AdminRoot writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	expect((window as CompatWindow).__wpUiCompatOverlaySlotEnabled).toBe(true)
})

test('contributes no layout, landmark or width of its own', () => {
	const { container } = render(<AdminRoot writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	const root = container.firstElementChild as HTMLElement
	expect(root.getAttribute('role')).toBeNull()
	expect(root.className).toBe('')
	expect(root.style.width).toBe('')
	expect(root.style.display).toBe('')
	expect(root.style.height).toBe('')
})

test('seeds the design system accent when the app passes no color', () => {
	render(<AdminRoot writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	expect(document.documentElement.style.getPropertyValue('--wp-admin-theme-color')).toBe('#3858e9')
})

test('keeps the accent the app passes', () => {
	render(<AdminRoot color={{ primary: '#c9356e' }} writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	expect(document.documentElement.style.getPropertyValue('--wp-admin-theme-color')).toBe('#c9356e')
})

test('hands the primary colour to the WordPress admin colours DataViews and components read', () => {
	render(<AdminRoot color={{ primary: '#c9356e' }} writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	const root = document.documentElement.style
	expect(root.getPropertyValue('--wp-admin-theme-color')).toBe('#c9356e')
	expect(root.getPropertyValue('--wp-admin-theme-color--rgb')).toBe('201, 53, 110')
	expect(root.getPropertyValue('--wp-components-color-accent')).toBe('var(--wp-admin-theme-color)')
})

test('passes theme configuration through to the design system provider', () => {
	const { container } = render(
		<AdminRoot color={{ primary: '#3858e9' }} writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>,
	)

	expect(container.querySelector('[style*="--wpds"]')).not.toBeNull()
})

test('accepts a custom element type for the root', () => {
	const { container } = render(<AdminRoot as="main" writeTimeout={APP_LIMIT}><p>admin content</p></AdminRoot>)

	expect(container.firstElementChild?.tagName).toBe('MAIN')
})

test('asks every app for a write time limit in milliseconds', () => {
	expectTypeOf<AdminRootProps['writeTimeout']>().toEqualTypeOf<number>()
})

test('hands the write time limit down to what it holds', () => {
	const { result } = renderHook(() => useContext(WriteTimeoutContext), {
		wrapper: ({ children }: { children: ReactNode }) => <AdminRoot writeTimeout={APP_LIMIT}>{children}</AdminRoot>,
	})

	expect(result.current).toBe(APP_LIMIT)
})

test('sets no write time limit outside any admin root', () => {
	const { result } = renderHook(() => useContext(WriteTimeoutContext))

	expect(result.current).toBeUndefined()
})

test('hands Infinity down for an app that turned the write time limit off', () => {
	const { result } = renderHook(() => useContext(WriteTimeoutContext), {
		wrapper: ({ children }: { children: ReactNode }) => (
			<AdminRoot writeTimeout={Number.POSITIVE_INFINITY}>{children}</AdminRoot>
		),
	})

	expect(result.current).toBe(Number.POSITIVE_INFINITY)
})

test.each([0, -APP_LIMIT, Number.NaN, 2 ** 31])('fails to render with a broken writeTimeout of %d', (limit) => {
	const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
	onTestFinished(() => {
		quiet.mockRestore()
	})

	const container = document.body.appendChild(document.createElement('div'))
	onTestFinished(() => {
		container.remove()
	})

	expect(() => render(<AdminRoot writeTimeout={limit}><p>admin content</p></AdminRoot>, { container })).toThrow(
		/^godmin: writeTimeout takes milliseconds above 0/,
	)
	expect(container.textContent).toBe('')
})
