// SPDX-License-Identifier: Apache-2.0

import { configure, render } from '@testing-library/react'
import type { RenderOptions, RenderResult } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach } from 'vitest'

import { AdminRoot } from './admin-root'
import type { AdminRootProps } from './admin-root'

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
 * Prepares the test environment a design system application needs.
 */
export function installTestEnvironment(): void {
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
