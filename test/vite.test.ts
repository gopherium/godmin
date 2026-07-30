// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { duplicateCopies, godminDedupe, godminSingleCopy } from '../src/vite'

const REACT_A = '/app/node_modules/.pnpm/react@19.2.8/node_modules/react/index.js'
const REACT_B = '/app/node_modules/.pnpm/react@18.3.1/node_modules/react/index.js'
const THEME = '/app/node_modules/.pnpm/@wordpress+theme@1.1.0/node_modules/@wordpress/theme/index.mjs'
const OWN = '/app/src/main.tsx'

test('lists the packages that break when duplicated', () => {
	expect(godminDedupe).toContain('react')
	expect(godminDedupe).toContain('react-dom')
	expect(godminDedupe).toContain('@wordpress/theme')
	expect(godminDedupe).toContain('@wordpress/ui')
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
