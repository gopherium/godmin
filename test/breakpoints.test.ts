// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { SHEET_BREAKPOINT, TITLE_BREAKPOINT } from '../src/index'

test('offers the sheet breakpoint from the package entry, the WordPress small breakpoint', () => {
	expect(SHEET_BREAKPOINT).toBe(600)
})

test('offers the title breakpoint from the package entry, as the WordPress editor drops its title at 403px', () => {
	expect(TITLE_BREAKPOINT).toBe(404)
})
