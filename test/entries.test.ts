// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { expect, test } from 'vitest'

import manifest from '../package.json'

/** The source folder the entries are built from. */
const source = resolve(import.meta.dirname, '../src')

/** The packages that bring the date engine, moment and its time zone data. */
const datePackages = ['@wordpress/date', '@wordpress/i18n']

/**
 * Returns the source file a relative import names.
 * @param from - The file holding the import.
 * @param specifier - The relative specifier, such as ./list-dates.js.
 * @returns The path of the TypeScript source it resolves to.
 */
function sourceOf(from: string, specifier: string): string {
	const base = join(dirname(from), specifier).replace(/\.js$/, '')
	const found = ['.ts', '.tsx', '/index.ts'].map((ending) => base + ending).find((path) => existsSync(path))
	if (found === undefined) {
		throw new Error(`${from} imports ${specifier}, which names no source file`)
	}
	return found
}

/**
 * Returns every specifier a source file imports, in either quote style.
 * @param file - The source file.
 * @returns The specifiers, relative and package ones alike.
 */
function importsOf(file: string): string[] {
	return [...readFileSync(file, 'utf8').matchAll(/(?:from|import)\s*\(?\s*(['"])([^'"]+)\1/g)].map((match) => match[2])
}

/**
 * Returns every package an entry reaches through its own source files.
 * @param entry - The entry source file.
 * @returns The package names it imports, directly or through the files it imports.
 */
function packagesReachedFrom(entry: string): Set<string> {
	const packages = new Set<string>()
	const seen = new Set<string>()
	const pending = [entry]
	while (pending.length > 0) {
		const file = pending.pop() as string
		const specifiers = seen.has(file) ? [] : importsOf(file)
		seen.add(file)
		pending.push(...specifiers.filter((name) => name.startsWith('.')).map((name) => sourceOf(file, name)))
		specifiers.filter((name) => !name.startsWith('.')).forEach((name) => packages.add(name))
	}
	return packages
}

test('the walk follows imports written with either quote', () => {
	const tree = mkdtempSync(join(tmpdir(), 'godmin-entries-'))
	writeFileSync(join(tree, 'index.ts'), `export { listDate } from "./dates.js"\n`)
	writeFileSync(join(tree, 'dates.ts'), `import { dateI18n } from '@wordpress/date'\n`)

	expect([...packagesReachedFrom(join(tree, 'index.ts'))]).toEqual(['@wordpress/date'])
})

test('the main entry reaches no date package, so importing it never loads moment', () => {
	const reached = packagesReachedFrom(join(source, 'index.ts'))

	expect(datePackages.filter((name) => reached.has(name))).toEqual([])
})

test('the dates entry hands out the list date functions', async () => {
	const dates = (await import(join(source, 'dates.ts'))) as Record<string, unknown>

	expect(typeof dates.startListDates).toBe('function')
	expect(typeof dates.listDate).toBe('function')
})

test('the package publishes the dates entry beside the main one', () => {
	expect(manifest.exports['./dates']).toEqual({ types: './dist/dates.d.ts', default: './dist/dates.js' })
})

test('the date packages are optional peers, needed only by the dates entry', () => {
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(datePackages.map((name) => meta[name]?.optional)).toEqual([true, true])
})
