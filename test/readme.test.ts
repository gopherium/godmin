// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import * as entry from '../src/index'
import * as routerEntry from '../src/router'

/** The README npm shows beside the package. */
const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8')

/**
 * Returns the README export row of one entry.
 * @param name - The entry as an app imports it, such as `@gopherium/godmin/router`.
 * @returns The row, or an empty string when the README has none.
 */
function exportRow(name: string): string {
	return readme.split('\n').find((line) => line.startsWith(`| \`${name}\` |`)) ?? ''
}

test('the README names every value the main entry hands out', () => {
	const row = readme.split('\n').find((line) => line.startsWith('| `@gopherium/godmin` |'))

	expect(Object.keys(entry).filter((name) => !row?.includes(`\`${name}\``))).toEqual([])
})

test('the README names no value the main entry does not hand out', () => {
	const row = readme.split('\n').find((line) => line.startsWith('| `@gopherium/godmin` |')) ?? ''
	const named = [...row.matchAll(/`([^`]+)`/g)].map((found) => found[1])

	expect(named.filter((name) => name !== '@gopherium/godmin' && !(name in entry))).toEqual([])
})

test('the README names the MenuItem type the router entry hands out', () => {
	expect(exportRow('@gopherium/godmin/router')).toContain('`MenuItem`')
})

test('the README names every value the router entry hands out', () => {
	const row = exportRow('@gopherium/godmin/router')

	expect(Object.keys(routerEntry).filter((name) => !row.includes(`\`${name}\``))).toEqual([])
})

test('the README says godmin translates its own words in the default domain through a required i18n peer', () => {
	const start = readme.indexOf('\n## Translations\n')
	const section = readme.slice(start, readme.indexOf('\n## ', start + 1))

	expect(start, 'the README has no Translations section').toBeGreaterThan(-1)
	for (const name of ['@wordpress/i18n', 'default', 'LIST_CHROME_DOMAIN', 'listChromeCatalogFor']) {
		expect(section, name).toContain(`\`${name}\``)
	}
	expect(section).toContain('required peer')
})

test('the README tells an app of the dialogs entry to load the components stylesheet', () => {
	const row = readme.split('\n').find((line) => line.startsWith('| `@gopherium/godmin/dialogs` |'))

	expect(row).toContain('@wordpress/components/build-style/style.css')
})
