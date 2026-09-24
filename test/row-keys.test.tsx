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
	const [first, second] = result.current.keys

	act(() => result.current.move(0, 1))
	rerender({ rows: last() })

	expect(last()).toEqual(['b', 'a', 'c'])
	expect(result.current.keys.slice(0, 2)).toEqual([second, first])
})

test('drops only the removed row and its key', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, , third] = result.current.keys

	act(() => result.current.remove(1))
	rerender({ rows: last() })

	expect(last()).toEqual(['a', 'c'])
	expect(result.current.keys).toEqual([first, third])
})

test('gives an added row a fresh key and never reuses a removed one', () => {
	const { result, rerender, last } = held(['a', 'b'])
	const [, removed] = result.current.keys
	act(() => result.current.remove(1))
	rerender({ rows: last() })

	act(() => result.current.add('c'))
	rerender({ rows: last() })

	expect(last()).toEqual(['a', 'c'])
	expect(result.current.keys[1]).not.toBe(removed)
	expect(new Set(result.current.keys).size).toBe(2)
})

test('ignores a move past either end', () => {
	const { result, changes } = held(['a', 'b'])

	act(() => result.current.move(0, -1))
	act(() => result.current.move(1, 1))

	expect(changes).toEqual([])
})

test('keeps its keys in step with a list the owner replaces', () => {
	const { result, rerender } = held(['a', 'b'])
	const [first, second] = result.current.keys

	rerender({ rows: ['a', 'b', 'c'] })
	const grown = result.current.keys
	rerender({ rows: ['a'] })

	expect(grown.slice(0, 2)).toEqual([first, second])
	expect(new Set(grown).size).toBe(3)
	expect(result.current.keys).toEqual([first])
})
