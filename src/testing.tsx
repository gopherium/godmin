// SPDX-License-Identifier: Apache-2.0

import { configure, render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach } from 'vitest'

import { AdminRoot } from './admin-root.js'
import type { AdminRootProps } from './admin-root.js'

/**
 * The elements the design system announces through rather than displays.
 */
export const WPDS_IGNORE_SELECTOR = 'script, style, [id^="a11y-speak"]'

/**
 * The urgency an announcement was made with.
 */
export type Politeness = 'polite' | 'assertive'

/**
 * Returns the message currently announced at the given urgency.
 * @param politeness - The urgency to read, polite by default.
 * @returns The announced message, or an empty string when there is none.
 */
export function getAnnouncement(politeness: Politeness = 'polite'): string {
	return document.getElementById(`a11y-speak-${politeness}`)?.textContent ?? ''
}

/**
 * Empties every announcement region.
 */
export function clearAnnouncements(): void {
	for (const region of document.querySelectorAll('[id^="a11y-speak"]')) {
		region.textContent = ''
	}
}

/**
 * The APIs React 19 removed, which `@wordpress/element` must no longer provide.
 */
const REMOVED_BY_REACT_19 = ['findDOMNode', 'render', 'hydrate', 'unmountComponentAtNode']

/**
 * The APIs `@wordpress/element` must still provide.
 */
const STILL_PROVIDED = ['createRoot', 'createPortal']

/**
 * Loads a module by specifier.
 */
export type LoadModule = () => Promise<Record<string, unknown>>

/**
 * Asserts `@wordpress/element` works on React 19.
 * @param load - The loader for the element module, its own import by default.
 */
export async function assertElementPatched(
	load: LoadModule = () => import('@wordpress/element') as Promise<Record<string, unknown>>,
): Promise<void> {
	let element: Record<string, unknown>
	try {
		element = await load()
	} catch (cause) {
		throw new Error(
			'@wordpress/element could not be imported, which is what an unpatched build does on React 19',
			{ cause },
		)
	}
	for (const name of REMOVED_BY_REACT_19) {
		if (element[name] !== undefined) {
			throw new Error(`@wordpress/element still provides ${name}, which React 19 removed`)
		}
	}
	for (const name of STILL_PROVIDED) {
		if (typeof element[name] !== 'function') {
			throw new Error(`@wordpress/element does not provide ${name}`)
		}
	}
}

/**
 * Prepares the test environment a design system application needs.
 */
export function installTestEnvironment(): void {
	if (typeof window.matchMedia !== 'function') {
		window.matchMedia = (media: string) => ({
			media,
			matches: false,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
		}) as unknown as MediaQueryList
	}
	if (typeof globalThis.ResizeObserver !== 'function') {
		globalThis.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	}
	configure({ defaultIgnore: WPDS_IGNORE_SELECTOR })
	afterEach(clearAnnouncements)
}

/**
 * Renders the given tree inside the design system host.
 * @param ui - The tree to render.
 * @param options - The testing library options, plus the host theme settings.
 * @returns The testing library render result.
 */
export function renderAdmin(
	ui: ReactNode,
	options: RenderOptions & Omit<AdminRootProps, 'children'> = {},
): RenderResult {
	const { color, cursor, cornerRadius, as, ...renderOptions } = options
	return render(ui, {
		...renderOptions,
		wrapper: function Host({ children }) {
			return <AdminRoot {...{ color, cursor, cornerRadius, as }}>{children}</AdminRoot>
		},
	})
}
