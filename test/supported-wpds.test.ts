// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { SUPPORTED_WPDS } from '../src/index'

const numeric = { numeric: true }

test('names the design system window this build was tested against', () => {
	expect(SUPPORTED_WPDS['@wordpress/ui']).toBe('>=0.24.0 <0.25.0')
	expect(SUPPORTED_WPDS['@wordpress/theme']).toBe('>=2.3.0 <3.0.0')
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

test.each(['@wordpress/a11y', '@wordpress/icons', '@wordpress/style-runtime', '@wordpress/theme', '@wordpress/ui'])(
	'pins %s inside its peer window',
	async (name) => {
		const manifest = await import('../package.json')
		const peers: Record<string, string> = manifest.default.peerDependencies
		const pins: Record<string, string> = manifest.default.devDependencies
		const range = /^>=(\S+) <(\S+)$/.exec(peers[name])
		const pin = pins[name]

		expect(range, `${name} has no longhand peer range`).not.toBeNull()
		expect(pin, `${name} is not pinned exactly`).toMatch(/^\d+\.\d+\.\d+$/)
		expect(pin.localeCompare(range?.[1] ?? '', 'en', numeric), `${pin} is below ${range?.[1]}`).toBeGreaterThanOrEqual(0)
		expect(pin.localeCompare(range?.[2] ?? '', 'en', numeric), `${pin} reaches ${range?.[2]}`).toBeLessThan(0)
	},
)
