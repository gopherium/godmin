// SPDX-License-Identifier: Apache-2.0

import { cleanup, configure, render } from '@testing-library/react'
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
 * Whether every media query currently reports a match.
 */
let viewportMatches = false

/**
 * The listeners registered on the media query lists handed out so far.
 */
const viewportListeners = new Set<() => void>()

/**
 * Sets what every media query reports, and tells its listeners.
 * @param viewport - Whether queries should report a match.
 */
export function setViewport(viewport: { matches: boolean }): void {
	viewportMatches = viewport.matches
	for (const listener of [...viewportListeners]) {
		listener()
	}
}

/**
 * Returns every media query to reporting no match, with no listeners left.
 */
function resetViewport(): void {
	viewportMatches = false
	viewportListeners.clear()
}

/**
 * Returns a media query list reading the viewport this module controls.
 * @param media - The media query text.
 * @returns The media query list.
 */
function mediaQueryList(media: string): MediaQueryList {
	return {
		media,
		get matches() {
			return viewportMatches
		},
		addEventListener: (_type: string, listener: () => void) => {
			viewportListeners.add(listener)
		},
		removeEventListener: (_type: string, listener: () => void) => {
			viewportListeners.delete(listener)
		},
		addListener: (listener: () => void) => {
			viewportListeners.add(listener)
		},
		removeListener: (listener: () => void) => {
			viewportListeners.delete(listener)
		},
	} as unknown as MediaQueryList
}

/**
 * Provides the media query API jsdom leaves out.
 */
function installMediaQueries(): void {
	if (typeof window.matchMedia !== 'function') {
		window.matchMedia = mediaQueryList
	}
}

/**
 * Provides the feature detection API jsdom leaves out.
 */
function installFeatureDetection(): void {
	if (typeof globalThis.CSS !== 'object' || globalThis.CSS === null) {
		globalThis.CSS = {} as typeof globalThis.CSS
	}
	if (typeof globalThis.CSS.supports !== 'function') {
		globalThis.CSS.supports = () => false
	}
}

/**
 * Provides the element resize API jsdom leaves out.
 */
function installResizeObserver(): void {
	if (typeof globalThis.ResizeObserver !== 'function') {
		globalThis.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		}
	}
}

/**
 * Prepares the test environment a design system application needs.
 */
export function installTestEnvironment(): void {
	installMediaQueries()
	installFeatureDetection()
	installResizeObserver()
	configure({ defaultIgnore: WPDS_IGNORE_SELECTOR })
	afterEach(cleanup)
	afterEach(clearAnnouncements)
	afterEach(resetViewport)
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
