// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { ruleOf } from './css-rules.js'

test("drops the start gap of a repeated row's trash when no arrows come before it", () => {
	expect(ruleOf('.godmin-rows__remove:first-child')).toMatch(/margin-inline-start:\s*0;/)
})

test('keeps the medium gap between the trash of a repeated row and the arrows before it', () => {
	expect(ruleOf('.godmin-rows__remove')).toMatch(
		/margin-inline-start:\s*calc\(var\(--wpds-dimension-gap-md\) - var\(--wpds-dimension-gap-xs\)\)/,
	)
})
