// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'

import { markLatest, useUnsavedText } from '../src/index'
import type { UnsavedText } from '../src/index'
import { installTestEnvironment } from '../src/testing.js'

installTestEnvironment()

test('keeps one store of unsaved text for as long as the screen stays', () => {
	const { result, rerender } = renderHook(() => useUnsavedText())
	const first = result.current
	first.set('item', 'A typed name')

	rerender()

	expect(result.current).toBe(first)
	expect(result.current.get('item')).toBe('A typed name')
})

test('starts an empty store for each new screen', () => {
	const first = renderHook(() => useUnsavedText())
	first.result.current.set('item', 'A typed name')

	const second = renderHook(() => useUnsavedText())

	expect(second.result.current).not.toBe(first.result.current)
	expect(second.result.current.size).toBe(0)
})

test('holds any value a form keeps, every field of it', () => {
	const { result } = renderHook(() => useUnsavedText<{ title: string, excerpt: string }>())
	const store: UnsavedText<{ title: string, excerpt: string }> = result.current

	store.set('item', { title: 'A title', excerpt: 'A summary' })

	expect(store.get('item')).toEqual({ title: 'A title', excerpt: 'A summary' })
})

test('lets only the latest write sent to an item keep its text', () => {
	const store: UnsavedText = new Map()

	const earlier = markLatest(store, 'item')
	const later = markLatest(store, 'item')

	expect([earlier(), later()]).toEqual([false, true])
})

test('keeps the latest write of each item apart', () => {
	const store: UnsavedText = new Map()

	const first = markLatest(store, 'first')
	const second = markLatest(store, 'second')

	expect([first(), second()]).toEqual([true, true])
})

test('keeps the latest writes of each store apart', () => {
	const one: UnsavedText = new Map()
	const other: UnsavedText = new Map()

	const inOne = markLatest(one, 'item')
	const inOther = markLatest(other, 'item')

	expect([inOne(), inOther()]).toEqual([true, true])
})
