// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { expect, test } from 'vitest'

import manifest from '../package.json'
import * as dialogs from '../src/dialogs.js'

/** The source folder the entries are built from. */
const source = resolve(import.meta.dirname, '../src')

/** The package that brings the date engine, moment and its time zone data. */
const datePackage = '@wordpress/date'

/** The package godmin translates its own words with, as the design system translates its own. */
const i18nPackage = '@wordpress/i18n'

/** The package that brings the WordPress components. */
const componentsPackage = '@wordpress/components'

/** The package that brings DataViews. */
const dataviewsPackage = '@wordpress/dataviews'

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
		specifiers.filter((name) => !name.startsWith('.')).forEach((name) => packages.add(packageOf(name)))
	}
	return packages
}

/**
 * Returns the package a bare import specifier names, without any subpath.
 * @param specifier - The specifier, such as `@wordpress/dataviews/build-module/field-types`.
 * @returns The package name, such as `@wordpress/dataviews`.
 */
function packageOf(specifier: string): string {
	const parts = specifier.split('/')
	return parts.slice(0, specifier.startsWith('@') ? 2 : 1).join('/')
}

test('the walk follows imports written with either quote', () => {
	const tree = mkdtempSync(join(tmpdir(), 'godmin-entries-'))
	writeFileSync(join(tree, 'index.ts'), `export { listDate } from "./dates.js"\n`)
	writeFileSync(join(tree, 'dates.ts'), `import { dateI18n } from '@wordpress/date'\n`)

	expect([...packagesReachedFrom(join(tree, 'index.ts'))]).toEqual(['@wordpress/date'])
})

test('the walk names a package reached through a subpath by the package itself', () => {
	const tree = mkdtempSync(join(tmpdir(), 'godmin-entries-'))
	writeFileSync(join(tree, 'index.ts'), `import { fieldTypes } from '@wordpress/dataviews/build-module/field-types'\n`)

	expect([...packagesReachedFrom(join(tree, 'index.ts'))]).toEqual([dataviewsPackage])
})

test('the main entry reaches no date package, so importing it never loads moment', () => {
	expect(packagesReachedFrom(join(source, 'index.ts')).has(datePackage)).toBe(false)
})

test('the main entry translates its own words through the i18n package', () => {
	expect(packagesReachedFrom(join(source, 'index.ts')).has(i18nPackage)).toBe(true)
})

test('the i18n package brings no moment, so translating the main entry loads none', () => {
	const i18nManifest = JSON.parse(
		readFileSync(createRequire(import.meta.url).resolve(`${i18nPackage}/package.json`), 'utf8'),
	) as { dependencies?: Record<string, string> }

	expect(Object.keys(i18nManifest.dependencies ?? {}).filter((name) => name.includes('moment'))).toEqual([])
	expect(Object.keys(i18nManifest.dependencies ?? {})).not.toContain(datePackage)
})

test('the dates entry hands out the list date functions', async () => {
	const dates = (await import(join(source, 'dates.ts'))) as Record<string, unknown>

	expect(typeof dates.startListDates).toBe('function')
	expect(typeof dates.listDate).toBe('function')
})

test('the package publishes the dates entry beside the main one', () => {
	expect(manifest.exports['./dates']).toEqual({ types: './dist/dates.d.ts', default: './dist/dates.js' })
})

test('the date package is an optional peer, needed only by the dates entry', () => {
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(meta[datePackage]?.optional).toBe(true)
})

test('the i18n package is a required peer, which every app already has through the design system', () => {
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(manifest.peerDependencies[i18nPackage]).toBe('>=6.30.0 <7.0.0')
	expect(meta[i18nPackage]).toBeUndefined()
})

test('the main entry reaches no components package, so importing it never loads the WordPress components', () => {
	expect(packagesReachedFrom(join(source, 'index.ts')).has(componentsPackage)).toBe(false)
})

test('the main entry reaches no DataViews package, so importing it never loads DataViews', () => {
	expect(packagesReachedFrom(join(source, 'index.ts')).has(dataviewsPackage)).toBe(false)
})

test('the DataViews package is an optional peer, its filter rules copied by the view guard', () => {
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(meta[dataviewsPackage]?.optional).toBe(true)
})

test('the dialogs entry hands out the confirm dialog and the form dialog', () => {
	const entry = dialogs as Record<string, unknown>

	expect(typeof entry.ConfirmDialog).toBe('function')
	expect(typeof entry.FormDialog).toBe('function')
	expect(packagesReachedFrom(join(source, 'dialogs.ts')).has(componentsPackage)).toBe(true)
})

test('the main entry hands out the form body, which needs no components package', async () => {
	const main = (await import(join(source, 'index.ts'))) as Record<string, unknown>

	expect(typeof main.FormBody).toBe('function')
	expect(packagesReachedFrom(join(source, 'form.tsx')).has(componentsPackage)).toBe(false)
})

test('the package publishes the dialogs entry beside the main one', () => {
	const exported = manifest.exports as Record<string, unknown>

	expect(exported['./dialogs']).toEqual({ types: './dist/dialogs.d.ts', default: './dist/dialogs.js' })
})

test('the router entry hands out the sidebar rows, their list and the access check', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>
	const parts = ['NavigationList', 'NavigationItem', 'DrilldownItem', 'useCanAccess']

	expect(parts.map((name) => typeof router[name])).toEqual(['function', 'function', 'function', 'function'])
})

test('the router entry hands out the menu, which reads the matched routes', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>

	expect(typeof router.Navigation).toBe('function')
	expect(packagesReachedFrom(join(source, 'navigation.tsx')).has('@tanstack/react-router')).toBe(true)
})

test('the state the sidebar parts share reaches React alone, so the main entry may read it without the router', () => {
	expect([...packagesReachedFrom(join(source, 'navigation-state.ts'))]).toEqual(['react'])
})

test('the main entry hands out the store of unsaved text, which reaches React alone', async () => {
	const main = (await import(join(source, 'index.ts'))) as Record<string, unknown>

	expect([typeof main.useUnsavedText, typeof main.markLatest]).toEqual(['function', 'function'])
	expect([...packagesReachedFrom(join(source, 'unsaved-text.ts'))]).toEqual(['react'])
})

test.each([
	{ file: 'close-while-open.ts', hooks: ['useCloseWhileOpen'] },
])('the main entry hands out the dialog and focus hooks of $file, which reach React alone', async ({ file, hooks }) => {
	const main = (await import(join(source, 'index.ts'))) as Record<string, unknown>
	const own = (await import(join(source, file))) as Record<string, unknown>

	expect(hooks.map((name) => typeof main[name])).toEqual(hooks.map(() => 'function'))
	expect(hooks.filter((name) => main[name] !== own[name])).toEqual([])
	expect([...packagesReachedFrom(join(source, file))]).toEqual(['react'])
})

test('the router peer starts at a release whose route matching runs no route context', () => {
	expect(manifest.peerDependencies['@tanstack/react-router']).toBe('^1.170.44')
})

test('the components package is an optional peer, needed only by the dialogs entry', () => {
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(meta[componentsPackage]?.optional).toBe(true)
})
