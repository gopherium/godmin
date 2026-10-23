// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { HUGE_BREAKPOINT, SHEET_BREAKPOINT, SIDEBAR_BREAKPOINT, SMALL_VIEWPORT, TITLE_BREAKPOINT } from '../src/index'

test('offers the huge breakpoint from the package entry, the WordPress huge breakpoint', () => {
	expect(HUGE_BREAKPOINT).toBe(1440)
})

test('offers the sidebar breakpoint from the package entry, where the sidebar becomes a drawer', () => {
	expect(SIDEBAR_BREAKPOINT).toBe(1024)
})

test('folds the frame one pixel under the sidebar breakpoint', () => {
	expect(SMALL_VIEWPORT).toBe('(max-width: 1023px)')
})

test('offers the sheet breakpoint from the package entry, the WordPress small breakpoint', () => {
	expect(SHEET_BREAKPOINT).toBe(600)
})

test('offers the title breakpoint from the package entry, as the WordPress editor drops its title at 403px', () => {
	expect(TITLE_BREAKPOINT).toBe(404)
})
