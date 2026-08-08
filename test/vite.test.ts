// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import {
	duplicateCopies,
	godminDedupe,
	godminSingleCopy,
	godminStylesheetFirst,
	hoistStylesheet,
} from '../src/vite'

const REACT_A = '/app/node_modules/.pnpm/react@19.2.8/node_modules/react/index.js'
const REACT_B = '/app/node_modules/.pnpm/react@18.3.1/node_modules/react/index.js'
const THEME = '/app/node_modules/.pnpm/@wordpress+theme@1.1.0/node_modules/@wordpress/theme/index.mjs'
const AUTH_A = '/app/node_modules/.pnpm/@gopherium+react-auth@0.3.0/node_modules/@gopherium/react-auth/index.js'
const AUTH_B = '/app/node_modules/.pnpm/@gopherium+react-auth@0.2.0/node_modules/@gopherium/react-auth/index.js'
const OWN = '/app/src/main.tsx'

test('lists the packages that break when duplicated', () => {
	expect(godminDedupe).toContain('react')
	expect(godminDedupe).toContain('react-dom')
	expect(godminDedupe).toContain('@wordpress/theme')
	expect(godminDedupe).toContain('@wordpress/ui')
})

test('watches the auth client, whose transport is module state a second copy would not share', () => {
	expect(godminDedupe).toContain('@gopherium/react-auth')
})

test('reports the auth client when it resolves twice', () => {
	const found = duplicateCopies([AUTH_A, AUTH_B], godminDedupe)

	expect([...found.keys()]).toEqual(['@gopherium/react-auth'])
	expect(found.get('@gopherium/react-auth')).toHaveLength(2)
})

test('reports nothing when every watched package resolves once', () => {
	expect(duplicateCopies([REACT_A, THEME, OWN], godminDedupe).size).toBe(0)
})

test('reports the package and both paths when one resolves twice', () => {
	const found = duplicateCopies([REACT_A, REACT_B, THEME], godminDedupe)

	expect([...found.keys()]).toEqual(['react'])
	expect(found.get('react')).toHaveLength(2)
})

test('ignores duplicates of packages it does not watch', () => {
	const a = '/app/node_modules/.pnpm/clsx@1.0.0/node_modules/clsx/index.js'
	const b = '/app/node_modules/.pnpm/clsx@2.0.0/node_modules/clsx/index.js'

	expect(duplicateCopies([a, b], godminDedupe).size).toBe(0)
})

test('does not confuse a scoped package with a similarly named one', () => {
	const ui = '/app/node_modules/.pnpm/@wordpress+ui@0.19.0/node_modules/@wordpress/ui/index.mjs'
	const uiKit = '/app/node_modules/.pnpm/@wordpress+ui-kit@1.0.0/node_modules/@wordpress/ui-kit/index.mjs'

	expect(duplicateCopies([ui, uiKit], godminDedupe).size).toBe(0)
})

test('treats the same file seen twice as one copy', () => {
	expect(duplicateCopies([REACT_A, REACT_A], godminDedupe).size).toBe(0)
})

test('builds a vite plugin that fails the build on a duplicate', () => {
	const plugin = godminSingleCopy()
	const context = { getModuleIds: () => [REACT_A, REACT_B][Symbol.iterator]() }

	expect(plugin.name).toBe('godmin-single-copy')
	expect(() => plugin.buildEnd.call(context)).toThrow(/react/)
})

test('lets a clean build through', () => {
	const plugin = godminSingleCopy()
	const context = { getModuleIds: () => [REACT_A, THEME, OWN][Symbol.iterator]() }

	expect(() => plugin.buildEnd.call(context)).not.toThrow()
})

const CSS_TAG = '<link rel="stylesheet" crossorigin href="/admin/assets/index-abc.css">'
const SCRIPT_TAG = '<script type="module" crossorigin src="/admin/assets/index-def.js"></script>'
const PRELOAD_TAG = '<link rel="modulepreload" crossorigin href="/admin/assets/router-ghi.js">'

/**
 * Returns a built page carrying the given head tags in order.
 * @param head - The head tags to place, in source order.
 * @returns The page source.
 */
function page(head: string[]): string {
	return `<!doctype html><html><head><style>.boot{}</style>${head.join('')}</head><body></body></html>`
}

test('requests the stylesheet before the script that would queue ahead of it', () => {
	const out = hoistStylesheet(page([SCRIPT_TAG, PRELOAD_TAG, CSS_TAG]))

	expect(out.indexOf(CSS_TAG)).toBeLessThan(out.indexOf(SCRIPT_TAG))
	expect(out.indexOf(CSS_TAG)).toBeLessThan(out.indexOf(PRELOAD_TAG))
})

test('keeps the inline boot styles ahead of the stylesheet it hoists', () => {
	const out = hoistStylesheet(page([SCRIPT_TAG, CSS_TAG]))

	expect(out.indexOf('<style>')).toBeLessThan(out.indexOf(CSS_TAG))
})

test('hoists every stylesheet, not only the first', () => {
	const second = '<link rel="stylesheet" href="/admin/assets/editor-jkl.css">'
	const out = hoistStylesheet(page([SCRIPT_TAG, CSS_TAG, second]))

	expect(out.indexOf(CSS_TAG)).toBeLessThan(out.indexOf(SCRIPT_TAG))
	expect(out.indexOf(second)).toBeLessThan(out.indexOf(SCRIPT_TAG))
})

test('leaves a page with no stylesheet byte for byte alone', () => {
	const source = page([SCRIPT_TAG, PRELOAD_TAG])

	expect(hoistStylesheet(source)).toBe(source)
})

test('leaves a page whose stylesheet already leads byte for byte alone', () => {
	const source = page([CSS_TAG, SCRIPT_TAG])

	expect(hoistStylesheet(source)).toBe(source)
})

test('leaves a page with no module script byte for byte alone', () => {
	const source = page([CSS_TAG])

	expect(hoistStylesheet(source)).toBe(source)
})

test('builds a bundler plugin that rewrites the page after the bundler wrote it', () => {
	const plugin = godminStylesheetFirst()

	expect(plugin.name).toBe('godmin-stylesheet-first')
	expect(plugin.transformIndexHtml.order).toBe('post')
	expect(plugin.transformIndexHtml.handler(page([SCRIPT_TAG, CSS_TAG]))).toContain(CSS_TAG)
})
