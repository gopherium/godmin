// SPDX-License-Identifier: Apache-2.0

import { act, renderHook } from '@testing-library/react'
import { expect, test } from 'vitest'

import { useRowKeys } from '../src/row-keys.js'

/**
 * Renders the hook over a list and records every list a change hands back.
 * @param initial - The rows the list starts with.
 * @returns The hook result, the changes seen, and a way to hand the hook another list.
 */
function held(initial: string[]) {
	const changes: string[][] = []
	const hook = renderHook(({ rows }) => useRowKeys(rows, (next) => changes.push(next)), {
		initialProps: { rows: initial },
	})
	return { ...hook, changes, last: () => changes[changes.length - 1] as string[] }
}

test('gives every row its own key', () => {
	const { result } = held(['a', 'b', 'c'])

	expect(new Set(result.current.keys).size).toBe(3)
})

test('keeps a row and its key together when the row moves', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second] = result.current.keys as [number, number]

	act(() => result.current.move(first, 1))
	rerender({ rows: last() })

	expect(last()).toEqual(['b', 'a', 'c'])
	expect(result.current.keys.slice(0, 2)).toEqual([second, first])
})

test('drops only the removed row and its key', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second, third] = result.current.keys as [number, number, number]

	act(() => result.current.remove(second))
	rerender({ rows: last() })

	expect(last()).toEqual(['a', 'c'])
	expect(result.current.keys).toEqual([first, third])
})

test('gives an added row a fresh key and never reuses a removed one', () => {
	const { result, rerender, last } = held(['a', 'b'])
	const [, removed] = result.current.keys as [number, number]
	act(() => result.current.remove(removed))
	rerender({ rows: last() })

	act(() => result.current.add('c'))
	rerender({ rows: last() })

	expect(last()).toEqual(['a', 'c'])
	expect(result.current.keys[1]).not.toBe(removed)
	expect(new Set(result.current.keys).size).toBe(2)
})

test('replaces only the row holding the key', () => {
	const { result, rerender, last } = held(['a', 'b'])
	const keys = result.current.keys

	act(() => result.current.update(keys[1] as number, 'B'))
	rerender({ rows: last() })

	expect(last()).toEqual(['a', 'B'])
	expect(result.current.keys).toEqual(keys)
})

test('ignores a move past either end', () => {
	const { result, changes } = held(['a', 'b'])
	const [first, second] = result.current.keys as [number, number]

	act(() => result.current.move(first, -1))
	act(() => result.current.move(second, 1))

	expect(changes).toEqual([])
})

test('ignores a key no row holds', () => {
	const { result, changes } = held(['a', 'b', 'c'])
	const unheld = Math.max(...result.current.keys) + 1

	act(() => result.current.move(unheld, -1))
	act(() => result.current.remove(unheld))
	act(() => result.current.update(unheld, 'x'))

	expect(changes).toEqual([])
})

test('builds each change on the one before when the list has not come back yet', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second, third] = result.current.keys as [number, number, number]

	act(() => {
		result.current.add('d')
		result.current.add('e')
	})
	expect(last()).toEqual(['a', 'b', 'c', 'd', 'e'])

	rerender({ rows: last() })
	act(() => {
		result.current.move(third, -1)
		result.current.remove(first)
	})
	rerender({ rows: last() })

	expect(last()).toEqual(['c', 'b', 'd', 'e'])
	expect(result.current.keys.slice(0, 2)).toEqual([third, second])
})

test('sends an operation held from an earlier render to the row it named', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second] = result.current.keys as [number, number]
	const earlier = result.current

	act(() => result.current.move(first, 1))
	rerender({ rows: last() })
	act(() => earlier.update(first, 'A'))
	rerender({ rows: last() })
	act(() => earlier.remove(second))
	rerender({ rows: last() })

	expect(last()).toEqual(['A', 'c'])
})

test('keeps every key when the owner hands back a copy of the list', () => {
	const { result, rerender } = held(['a', 'b'])
	const keys = result.current.keys

	rerender({ rows: ['a', 'b'] })

	expect(result.current.keys).toEqual(keys)
})

test('keeps the keys of the rows a list from elsewhere still holds', () => {
	const { result, rerender } = held(['a', 'b'])
	const [first, second] = result.current.keys as [number, number]

	rerender({ rows: ['c', 'a', 'b'] })
	const grown = result.current.keys
	rerender({ rows: ['b'] })

	expect(grown.slice(1)).toEqual([first, second])
	expect(new Set(grown).size).toBe(3)
	expect(result.current.keys).toEqual([second])
})

test('gives rows holding the same value keys of their own', () => {
	const { result, rerender } = held(['a', 'a'])
	const keys = result.current.keys

	rerender({ rows: ['a', 'a', 'a'] })

	expect(result.current.keys.slice(0, 2)).toEqual(keys)
	expect(new Set(result.current.keys).size).toBe(3)
})

test('gives fresh keys to the rows a list from elsewhere replaces', () => {
	const { result, rerender } = held(['a', 'b'])
	const before = result.current.keys

	rerender({ rows: ['c', 'd'] })

	expect(result.current.keys.filter((key) => before.includes(key))).toEqual([])
	expect(new Set(result.current.keys).size).toBe(2)
})
