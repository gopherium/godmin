// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { SUPPORTED_WPDS } from '../src/index'

test('names the design system window this build was tested against', () => {
	expect(SUPPORTED_WPDS['@wordpress/ui']).toBe('>=0.19.0 <0.20.0')
	expect(SUPPORTED_WPDS['@wordpress/theme']).toBe('>=1.1.0 <2.0.0')
})

test('every declared window is a longhand range rather than a caret', () => {
	for (const [name, range] of Object.entries(SUPPORTED_WPDS)) {
		expect(range, `${name} must not use caret notation`).not.toMatch(/[\^~]/)
		expect(range, `${name} must declare both bounds`).toMatch(/^>=\S+ <\S+$/)
	}
})

test('the declared windows match the versions this package develops against', async () => {
	const manifest = await import('../package.json')
	for (const name of Object.keys(SUPPORTED_WPDS)) {
		const pinned = (manifest.default.devDependencies as Record<string, string>)[name]
		expect(pinned, `${name} must be pinned exactly in devDependencies`).toMatch(/^\d+\.\d+\.\d+$/)
	}
})
