// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'

import { expect, test } from 'vitest'

import ownManifest from '../package.json'
import { SUPPORTED_WPDS } from '../src/index'

const numeric = { numeric: true }

/** A peer range written out in full, its first accepted version and its first rejected one. */
const longhand = /^>=(\S+) <(\S+)$/

/** The peer ranges godmin declares. */
const ownPeers: Record<string, string> = ownManifest.peerDependencies

/** The versions godmin develops against. */
const ownPins: Record<string, string> = ownManifest.devDependencies

/** The `@wordpress` packages godmin develops against. */
const wordpressPins = Object.keys(ownPins).filter((name) => name.startsWith('@wordpress/'))

/** The `@wordpress` packages godmin declares as peers. */
const wordpressPeers = Object.keys(ownPeers).filter((name) => name.startsWith('@wordpress/'))

/** The installed manifest of each `@wordpress` package godmin develops against. */
const installed = wordpressPins
	.map((name) => readFileSync(createRequire(import.meta.url).resolve(`${name}/package.json`), 'utf8'))
	.map((text) => JSON.parse(text) as { name: string; version: string; dependencies?: Record<string, string> })

/** Returns each range the installed `@wordpress` packages give one package in their dependencies. */
function asksFor(name: string): { ask: string; lowest: string | undefined }[] {
	return installed.flatMap(({ name: asking, version, dependencies }) => {
		const range = dependencies?.[name]
		const lowest = /^\^?(\d+\.\d+\.\d+)$/.exec(range ?? '')?.[1]
		return range === undefined ? [] : [{ ask: `${asking}@${version} asks ${name} ${range}`, lowest }]
	})
}

test('names the design system window this build was tested against', () => {
	expect(SUPPORTED_WPDS['@wordpress/ui']).toBe('>=0.26.0 <0.27.0')
	expect(SUPPORTED_WPDS['@wordpress/theme']).toBe('>=4.0.0 <5.0.0')
})

test('every declared window is the peer range the package asks for', async () => {
	const manifest = await import('../package.json')
	const peers: Record<string, string> = manifest.default.peerDependencies
	const asked = Object.fromEntries(Object.keys(SUPPORTED_WPDS).map((name) => [name, peers[name]]))

	expect(asked).toEqual(SUPPORTED_WPDS)
})

test('the build tools package is an optional peer, needed only by the stylelint entry', async () => {
	const manifest = await import('../package.json')
	const peers: Record<string, string> = manifest.default.peerDependencies
	const meta = manifest.default.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(peers['@wordpress/theme-build-tools']).toBe('>=1.0.0 <2.0.0')
	expect(meta['@wordpress/theme-build-tools']?.optional).toBe(true)
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

test.each([
	'@wordpress/a11y',
	'@wordpress/dataviews',
	'@wordpress/date',
	'@wordpress/i18n',
	'@wordpress/icons',
	'@wordpress/style-runtime',
	'@wordpress/theme',
	'@wordpress/theme-build-tools',
	'@wordpress/ui',
])(
	'pins %s inside its peer window',
	async (name) => {
		const manifest = await import('../package.json')
		const peers: Record<string, string> = manifest.default.peerDependencies
		const pins: Record<string, string> = manifest.default.devDependencies
		const range = longhand.exec(peers[name])
		const pin = pins[name]

		expect(range, `${name} has no longhand peer range`).not.toBeNull()
		expect(pin, `${name} is not pinned exactly`).toMatch(/^\d+\.\d+\.\d+$/)
		expect(pin.localeCompare(range?.[1] ?? '', 'en', numeric), `${pin} is below ${range?.[1]}`).toBeGreaterThanOrEqual(0)
		expect(pin.localeCompare(range?.[2] ?? '', 'en', numeric), `${pin} reaches ${range?.[2]}`).toBeLessThan(0)
	},
)

test('the floor check reads each @wordpress package godmin pins and checks the a11y, date and i18n peers', () => {
	expect(installed.map(({ name, version }) => `${name}@${version}`)).toEqual(
		wordpressPins.map((name) => `${name}@${ownPins[name]}`),
	)
	expect(wordpressPins).toEqual(
		expect.arrayContaining(['@wordpress/components', '@wordpress/dataviews', '@wordpress/ui']),
	)
	expect(wordpressPeers).toEqual(expect.arrayContaining(['@wordpress/a11y', '@wordpress/date', '@wordpress/i18n']))
	expect(
		['@wordpress/a11y', '@wordpress/date', '@wordpress/i18n'].filter((name) => asksFor(name).length === 0),
		'the installed @wordpress packages ask for each of these peers',
	).toEqual([])
})

test.each(wordpressPeers)('starts the %s window no lower than the installed @wordpress packages ask for', (name) => {
	const floor = longhand.exec(ownPeers[name])?.[1]
	const asks = asksFor(name)

	expect(installed.length, 'the check reads the installed @wordpress packages').toBeGreaterThan(0)
	expect(floor, `${name} has no longhand peer range`).toBeDefined()
	expect(
		asks.filter(({ lowest }) => lowest === undefined).map(({ ask }) => ask),
		'each range asked is a caret or an exact version',
	).toEqual([])
	expect(
		asks.filter(({ lowest }) => (lowest ?? '').localeCompare(floor ?? '', 'en', numeric) > 0).map(({ ask }) => ask),
		`${name} starts at ${floor}`,
	).toEqual([])
})
