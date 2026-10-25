// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

import * as entry from '../src/index'
import * as routerEntry from '../src/router'

/** The README npm shows beside the package. */
const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8')

/** The overview page the package ships in its docs folder. */
const overview = readFileSync(resolve(import.meta.dirname, '../docs/overview.md'), 'utf8')

/** The two pages that hold the table of entry points. */
const tables = [
	['the README', readme],
	['the docs overview', overview],
]

/**
 * Returns the export row of one entry in a page's table of entry points.
 * @param page - The page text.
 * @param name - The entry as an app imports it, such as `@gopherium/godmin/router`.
 * @returns The row, or an empty string when the page has none.
 */
function exportRow(page: string, name: string): string {
	return page.split('\n').find((line) => line.startsWith(`| \`${name}\` |`)) ?? ''
}

test.each(tables)('%s names every value the main entry hands out', (_, page) => {
	const row = exportRow(page, '@gopherium/godmin')

	expect(Object.keys(entry).filter((name) => !row.includes(`\`${name}\``))).toEqual([])
})

test.each(tables)('%s names no value the main entry does not hand out', (_, page) => {
	const row = exportRow(page, '@gopherium/godmin')
	const named = [...row.matchAll(/`([^`]+)`/g)].map((found) => found[1])

	expect(named.filter((name) => name !== '@gopherium/godmin' && !(name in entry))).toEqual([])
})

test.each(tables)('%s names the MenuItem type the router entry hands out', (_, page) => {
	expect(exportRow(page, '@gopherium/godmin/router')).toContain('`MenuItem`')
})

test.each(tables)('%s names every value the router entry hands out', (_, page) => {
	const row = exportRow(page, '@gopherium/godmin/router')

	expect(Object.keys(routerEntry).filter((name) => !row.includes(`\`${name}\``))).toEqual([])
})

test('the README and the docs overview hold the same table of entry points', () => {
	const rows = (page: string) => page.split('\n').filter((line) => line.startsWith('| `@gopherium/godmin'))

	expect(rows(overview)).toEqual(rows(readme))
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
