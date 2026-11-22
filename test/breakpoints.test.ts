// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { EDGE_BREAKPOINT, HUGE_BREAKPOINT, SHEET_BREAKPOINT, SMALL_VIEWPORT, TITLE_BREAKPOINT } from '../src/index'

test('offers the huge breakpoint from the package entry, the WordPress huge breakpoint', () => {
	expect(HUGE_BREAKPOINT).toBe(1440)
})

test('folds the frame one pixel under the edge breakpoint, the WordPress medium breakpoint', () => {
	expect(EDGE_BREAKPOINT).toBe(782)
	expect(SMALL_VIEWPORT).toBe('(max-width: 781px)')
})

test('offers the sheet breakpoint from the package entry, the WordPress small breakpoint', () => {
	expect(SHEET_BREAKPOINT).toBe(600)
})

test('offers the title breakpoint from the package entry, as the WordPress editor drops its title at 403px', () => {
	expect(TITLE_BREAKPOINT).toBe(404)
})
