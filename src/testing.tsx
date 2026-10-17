// SPDX-License-Identifier: Apache-2.0

import { cleanup, configure, render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import { Badge, Button, Text } from '@wordpress/ui'
import type { ComponentProps, ReactElement, ReactNode } from 'react'
import { afterEach, vi } from 'vitest'
import type { MockInstance } from 'vitest'

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
		throw new Error('@wordpress/element could not be imported', { cause })
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
 * What the media queries report: one answer for every query, or each width query answered by a width in pixels.
 */
export type TestViewport = { matches: boolean } | { width: number }

/**
 * The viewport the media queries currently read.
 */
let viewport: TestViewport = { matches: false }

/**
 * The listeners registered on the media query lists handed out so far.
 */
const viewportListeners = new Set<() => void>()

/**
 * One width condition of a media query, such as `(max-width: 599px)`.
 */
const WIDTH_CONDITION = /^\(\s*(min|max)-width\s*:\s*(\d+(?:\.\d+)?)px\s*\)$/

/**
 * The media types a screen matches, such as `screen` or `only all`.
 */
const SCREEN_MEDIA = /^(?:only\s+)?(?:all|screen)$/

/**
 * Sets what the media queries report, and tells their listeners.
 * @param next - Whether every query reports a match, or the width in pixels the width queries are answered by.
 */
export function setViewport(next: TestViewport): void {
	viewport = next
	for (const listener of [...viewportListeners]) {
		listener()
	}
}

/**
 * Returns every media query to reporting no match, with no listeners left.
 */
function resetViewport(): void {
	viewport = { matches: false }
	viewportListeners.clear()
}

/**
 * Tells whether one condition of a media query holds at a width.
 * @param condition - The condition, such as `screen` or `(max-width: 599px)`.
 * @param width - The viewport width in pixels.
 * @returns Whether it holds, always for a screen media type, never for a condition other than a width in pixels.
 */
function conditionHolds(condition: string, width: number): boolean {
	const part = condition.trim()
	if (SCREEN_MEDIA.test(part)) {
		return true
	}
	const found = WIDTH_CONDITION.exec(part)
	if (found === null) {
		return false
	}
	const bound = Number(found[2])
	return found[1] === 'min' ? width >= bound : width <= bound
}

/**
 * Tells whether a media query list matches at a width.
 * @param media - The media query text, queries parted by commas and conditions joined by and.
 * @param width - The viewport width in pixels.
 * @returns Whether every condition of any one query holds.
 */
function matchesWidth(media: string, width: number): boolean {
	return media
		.toLowerCase()
		.split(',')
		.some((query) => conditionsOf(query).every((condition) => conditionHolds(condition, width)))
}

/**
 * Returns the conditions a media query joins with and, its spaces folded to one.
 * @param query - One query of a media query list, in lower case.
 * @returns The conditions, such as `screen` and `(max-width: 599px)`.
 */
function conditionsOf(query: string): string[] {
	return query.trim().split(/\s+/).join(' ').split(' and ')
}

/**
 * Answers a media query from the viewport this module controls.
 * @param media - The media query text.
 * @returns Whether the query matches.
 */
function answer(media: string): boolean {
	return 'width' in viewport ? matchesWidth(media, viewport.width) : viewport.matches
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
			return answer(media)
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
			/**
			 * Watches an element.
			 */
			observe() {}

			/**
			 * Stops watching an element.
			 */
			unobserve() {}

			/**
			 * Stops watching every element.
			 */
			disconnect() {}
		}
	}
}

/** The one layout box every element reports while the layout is stubbed. */
const LAYOUT_BOX = { x: 0, y: 0, width: 1, height: 1, top: 0, right: 1, bottom: 1, left: 0 }

/** The stub that gives every element a layout box, held until the test ends. */
let layoutStub: MockInstance | undefined

/**
 * Makes every element report one layout box until the test ends, as a browser does for an element on screen.
 */
export function stubLayout(): void {
	layoutStub = vi
		.spyOn(Element.prototype, 'getClientRects')
		.mockReturnValue([LAYOUT_BOX] as unknown as DOMRectList)
}

/**
 * Gives every element back the layout jsdom reports, none.
 */
function restoreLayout(): void {
	layoutStub?.mockRestore()
	layoutStub = undefined
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
	afterEach(restoreLayout)
}

/**
 * Returns the classes the outer element of a tree draws with, removing the tree once read.
 * @param tree - The tree to sample.
 * @returns The class names, in order.
 */
function classesOf(tree: ReactElement): string[] {
	const { container, unmount } = render(tree)
	const classes = [...(container.firstElementChild as Element).classList]
	unmount()
	return classes
}

/**
 * Returns the classes a design system text draws at the given variant.
 * @param variant - The text variant to sample.
 * @returns The class names, in order.
 */
export function textClasses(variant: ComponentProps<typeof Text>['variant']): string[] {
	return classesOf(<Text variant={variant} />)
}

/**
 * Returns the classes a design system badge draws at the given intent.
 * @param intent - The badge intent to sample.
 * @returns The class names, in order.
 */
export function badgeClasses(intent: ComponentProps<typeof Badge>['intent']): string[] {
	return classesOf(<Badge intent={intent}>probe</Badge>)
}

/**
 * Returns the classes a design system button draws at the given variant and size.
 * @param variant - The button variant to sample.
 * @param size - The button size, the default one when absent.
 * @param tone - The button tone, the brand one when absent.
 * @returns The class names, in order.
 */
export function buttonClasses(
	variant: ComponentProps<typeof Button>['variant'],
	size?: ComponentProps<typeof Button>['size'],
	tone?: ComponentProps<typeof Button>['tone'],
): string[] {
	return classesOf(
		<Button variant={variant} size={size} tone={tone}>
			probe
		</Button>,
	)
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
