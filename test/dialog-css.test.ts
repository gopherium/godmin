// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { POPUP_CLASS } from '../src/dialog-open.js'
import { ruleOf } from './css-rules.js'

test('breaks only a word too long for a dialog card, so a token stays in the card and buttons keep their words', () => {
	expect(ruleOf(`.${POPUP_CLASS}`)).toMatch(/overflow-wrap:\s*break-word;/)
})

test('lets a dialog title shrink below its longest word, so the word breaks in the card beside the close icon', () => {
	expect(ruleOf(`.${POPUP_CLASS} > * > h2`)).toMatch(/min-inline-size:\s*0;/)
})
