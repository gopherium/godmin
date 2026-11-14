// SPDX-License-Identifier: Apache-2.0

import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { expect, expectTypeOf, test } from 'vitest'

import manifest from '../package.json'
import * as MainEntry from '../src/index'
import type * as RouterEntry from '../src/router'

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

	expect(manifest.peerDependencies[i18nPackage]).toBe('>=7.0.0 <8.0.0')
	expect(meta[i18nPackage]).toBeUndefined()
})

test('no source file reaches the components package, so no entry ever loads the WordPress components', () => {
	const files = readdirSync(source, { recursive: true, encoding: 'utf8' }).filter((name) => /\.tsx?$/.test(name))

	expect(files.length, 'the walk finds the source files').toBeGreaterThan(1)
	expect(files.filter((name) => importsOf(join(source, name)).map(packageOf).includes(componentsPackage))).toEqual([])
})

test('the main entry reaches no DataViews package, so importing it never loads DataViews', () => {
	expect(packagesReachedFrom(join(source, 'index.ts')).has(dataviewsPackage)).toBe(false)
})

test('the DataViews package is an optional peer, its filter rules copied by the view guard', () => {
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(meta[dataviewsPackage]?.optional).toBe(true)
})

test('the main entry hands out the confirm, the form and the rename dialogs', () => {
	const main = MainEntry as Record<string, unknown>

	expect(['ConfirmDialog', 'FormDialog', 'RenameDialog'].map((name) => typeof main[name])).toEqual([
		'function',
		'function',
		'function',
	])
})

test('the main entry hands out the rejected field hook, which reaches React and the announcer alone', async () => {
	const own = (await import(join(source, 'rejected-field.ts'))) as Record<string, unknown>

	expect(MainEntry.useRejectedField).toBe(own.useRejectedField)
	expect([...packagesReachedFrom(join(source, 'rejected-field.ts'))].sort()).toEqual(['@wordpress/a11y', 'react'])
})

test('the package publishes no dialogs entry, since the main one hands the dialogs out', () => {
	expect(Object.keys(manifest.exports)).not.toContain('./dialogs')
})

test('the router entry hands out the sidebar rows, their list and the access check', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>
	const parts = ['NavigationList', 'NavigationItem', 'DrilldownItem', 'useCanAccess']

	expect(parts.map((name) => typeof router[name])).toEqual(['function', 'function', 'function', 'function'])
})

test('the router entry hands out the dialog that asks before a move leaves unsaved work', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>

	expect(typeof router.UnsavedChangesDialog).toBe('function')
	expect(packagesReachedFrom(join(source, 'unsaved-changes-dialog.tsx')).has('@tanstack/react-router')).toBe(true)
})

test('the router entry hands out the menu, which reads the matched routes', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>

	expect(typeof router.Navigation).toBe('function')
	expect(packagesReachedFrom(join(source, 'navigation.tsx')).has('@tanstack/react-router')).toBe(true)
})

test('the router entry hands out the hook that reads the path the router has shown', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>

	expect(typeof router.useShownPath).toBe('function')
})

test.each(['frame.tsx', 'screen-title.ts'])('%s reaches no router, so the main entry speaks without one', (file) => {
	expect(packagesReachedFrom(join(source, file)).has('@tanstack/react-router')).toBe(false)
})

test('the screen titles reach React, the announcer and the translations alone', () => {
	expect([...packagesReachedFrom(join(source, 'screen-title.ts'))].sort()).toEqual([
		'@wordpress/a11y',
		'@wordpress/i18n',
		'react',
	])
})

test('neither entry hands out the not found screen, which only the router defaults give', async () => {
	const router = (await import(join(source, 'router.ts'))) as Record<string, unknown>
	const main = MainEntry as Record<string, unknown>

	expect([router.RouteNotFound, main.RouteNotFound]).toEqual([undefined, undefined])
})

test('the state the sidebar parts share reaches React alone, so the main entry may read it without the router', () => {
	expect([...packagesReachedFrom(join(source, 'navigation-state.ts'))]).toEqual(['react'])
})

test('the main entry hands out the store of unsaved text, which reaches React alone', async () => {
	const main = (await import(join(source, 'index.ts'))) as Record<string, unknown>

	expect([typeof main.useUnsavedText, typeof main.markLatest]).toEqual(['function', 'function'])
	expect([...packagesReachedFrom(join(source, 'unsaved-text.ts'))]).toEqual(['react'])
})

test('the main entry hands out the tap handler of a phone list, which reaches no package, so no router', async () => {
	const main = (await import(join(source, 'index.ts'))) as Record<string, unknown>

	expect(typeof main.openOnTap).toBe('function')
	expect([...packagesReachedFrom(join(source, 'open-on-tap.ts'))]).toEqual([])
})

test.each([
	{ file: 'list-run.ts', hooks: ['useListRun', 'focusInDialog'] },
	{ file: 'focus-back.ts', hooks: ['useFocusBack', 'focusedTrigger'] },
])('the main entry hands out the dialog and focus hooks of $file, which reach React alone', async ({ file, hooks }) => {
	const main = (await import(join(source, 'index.ts'))) as Record<string, unknown>
	const own = (await import(join(source, file))) as Record<string, unknown>

	expect(hooks.map((name) => typeof main[name])).toEqual(hooks.map(() => 'function'))
	expect(hooks.filter((name) => main[name] !== own[name])).toEqual([])
	expect([...packagesReachedFrom(join(source, file))]).toEqual(['react'])
})

test('the main entry hands out the list view types of the router entry, to type a list without the router', () => {
	type Shape = RouterEntry.ListViewShape

	expectTypeOf<MainEntry.ListViewShape>().toEqualTypeOf<Shape>()
	expectTypeOf<MainEntry.ListView<Shape>>().toEqualTypeOf<RouterEntry.ListView<Shape>>()
	expectTypeOf<MainEntry.ListDefaults>().toEqualTypeOf<RouterEntry.ListDefaults>()
})

test('the router peer starts at a release whose route matching runs no route context', () => {
	expect(manifest.peerDependencies['@tanstack/react-router']).toBe('^1.170.44')
})

test('the components package is no peer, since no source file reaches it', () => {
	const peers = manifest.peerDependencies as Record<string, string | undefined>
	const meta = manifest.peerDependenciesMeta as Record<string, { optional?: boolean } | undefined>

	expect(peers[componentsPackage]).toBeUndefined()
	expect(meta[componentsPackage]).toBeUndefined()
})
