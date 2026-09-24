// SPDX-License-Identifier: Apache-2.0

import { act, renderHook } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { useRowKeys } from '../src/row-keys.js'
import type { RowBounds } from '../src/row-keys.js'

/**
 * Renders the hook over a list and records every list a change hands back.
 * @param initial - The rows the list starts with.
 * @param bounds - The fewest and the most rows the list keeps.
 * @returns The hook result, the changes seen, and a way to hand the hook another list.
 */
function held(initial: string[], bounds?: RowBounds) {
	const changes: string[][] = []
	const hook = renderHook(({ rows }) => useRowKeys(rows, (next) => changes.push(next), bounds), {
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
	act(() => result.current.move(first, 2))
	act(() => result.current.move(second, -2))

	expect(changes).toEqual([])
})

test('moves a row by the whole offset', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second, third] = result.current.keys as [number, number, number]

	act(() => result.current.move(first, 2))
	rerender({ rows: last() })

	expect(last()).toEqual(['b', 'c', 'a'])
	expect(result.current.keys).toEqual([second, third, first])
})

test('keeps its operations the same across renders', () => {
	const { result, rerender } = held(['a'])
	const before = result.current

	rerender({ rows: ['a', 'b'] })

	expect(result.current).toMatchObject({
		add: before.add,
		update: before.update,
		move: before.move,
		remove: before.remove,
	})
})

test('keeps every key when the owner refuses a move of two equal rows', () => {
	const { result } = held(['', ''])
	const keys = result.current.keys

	act(() => result.current.move(keys[0] as number, 1))

	expect(result.current.keys).toEqual(keys)
})

test('keeps the key of a row a refused removal dropped when a list from elsewhere still holds it', () => {
	const { result, rerender } = held(['a', 'b'])
	const [first, second] = result.current.keys as [number, number]

	act(() => result.current.remove(second))
	rerender({ rows: ['a', 'b', 'c'] })

	expect(result.current.keys.slice(0, 2)).toEqual([first, second])
})

test('keeps the key of an edited row when the owner appends a blank row to every change', () => {
	const { result, rerender, last } = held(['', 'b'])
	const [first, second] = result.current.keys as [number, number]

	act(() => result.current.update(first, 'b'))
	rerender({ rows: [...last(), ''] })

	expect(result.current.keys.slice(0, 2)).toEqual([first, second])
})

test('gives a fresh key to a row a list from elsewhere brings back', () => {
	const { result, rerender } = held(['a', 'b'])
	const keys = result.current.keys

	rerender({ rows: ['a'] })
	rerender({ rows: ['a', 'b'] })

	expect(result.current.keys[0]).toBe(keys[0])
	expect(keys).not.toContain(result.current.keys[1])
})

test('keys a row the owner pushes onto the list it handed in', () => {
	const initial = ['a']
	const { result, rerender } = held(initial)

	initial.push('b')
	rerender({ rows: initial })

	expect(result.current.keys).toHaveLength(2)
	expect(new Set(result.current.keys).size).toBe(2)
})

test('keeps each key on its row when the owner sorts the list it handed in', () => {
	const rows = ['b', 'a']
	const { result, rerender } = held(rows)
	const [forB, forA] = result.current.keys as [number, number]

	rows.sort()
	rerender({ rows })

	expect(result.current.keys).toEqual([forA, forB])
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

test('adds no row past the most rows allowed when the list has not come back yet', () => {
	const { result, changes } = held(['a'], { max: 2 })

	act(() => {
		result.current.add('b')
		result.current.add('c')
	})

	expect(changes).toEqual([['a', 'b']])
})

test('removes no row below the fewest rows allowed when the list has not come back yet', () => {
	const { result, changes } = held(['a', 'b'], { min: 1 })
	const [first, second] = result.current.keys as [number, number]

	act(() => {
		result.current.remove(first)
		result.current.remove(second)
	})

	expect(changes).toEqual([['b']])
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

test('moves the row holding a key that differs from its place', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, , third] = result.current.keys as [number, number, number]
	act(() => result.current.remove(first))
	rerender({ rows: last() })

	act(() => result.current.move(third, -1))

	expect(last()).toEqual(['c', 'b'])
})

test('moves one of two equal rows with its key', () => {
	const { result, rerender, last } = held(['a', 'a'])
	const [first, second] = result.current.keys as [number, number]

	act(() => result.current.move(first, 1))
	rerender({ rows: last() })

	expect(result.current.keys).toEqual([second, first])
})

test('never hands a list from elsewhere the key of a removed row', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second, third] = result.current.keys as [number, number, number]
	act(() => result.current.remove(first))
	rerender({ rows: last() })

	rerender({ rows: ['x', 'b', 'c'] })

	expect(result.current.keys.slice(1)).toEqual([second, third])
	expect([first, second, third]).not.toContain(result.current.keys[0])
})

test('builds on the rows shown when the owner never takes a change', () => {
	const initial = ['a']
	const { result, rerender, changes } = held(initial)
	act(() => result.current.add('b'))
	rerender({ rows: initial })

	act(() => result.current.add('c'))

	expect(changes).toEqual([['a', 'b'], ['a', 'c']])
})

test('builds on the rows shown when the owner ignores a change without rendering again', () => {
	const { result, changes } = held(['a', 'b', 'c'])
	const [first, second] = result.current.keys as [number, number]

	act(() => result.current.remove(first))
	act(() => result.current.remove(second))

	expect(changes).toEqual([['b', 'c'], ['a', 'c']])
})

test('builds a change on a list from elsewhere', () => {
	const { result, rerender, changes } = held(['a', 'b'])
	rerender({ rows: ['x', 'y', 'z'] })

	act(() => result.current.remove(result.current.keys[2] as number))

	expect(changes).toEqual([['x', 'y']])
})

test('calls the latest onChange and keeps the latest bounds', () => {
	const first = vi.fn()
	const second = vi.fn()
	const rows = ['a']
	const { result, rerender } = renderHook(
		({ onChange, min, max }: { onChange: (rows: string[]) => void, min: number, max: number }) =>
			useRowKeys(rows, onChange, { min, max }),
		{ initialProps: { onChange: first, min: 0, max: 5 } },
	)
	rerender({ onChange: second, min: 0, max: 5 })
	act(() => result.current.add('b'))
	rerender({ onChange: second, min: 1, max: 1 })

	act(() => {
		result.current.add('c')
		result.current.remove(result.current.keys[0] as number)
	})

	expect(first).not.toHaveBeenCalled()
	expect(second.mock.calls).toEqual([[['a', 'b']]])
})

test('keeps every key when the owner refuses a change and hands in a copy of its list', () => {
	const { result, rerender } = held(['', 'b', ''])
	const keys = result.current.keys

	act(() => result.current.update(keys[0] as number, 'b'))
	rerender({ rows: ['', 'b', ''] })

	expect(result.current.keys).toEqual(keys)
})

test('keeps each key on its row when the owner sorts the list it was handed', () => {
	const { result, rerender, last } = held(['a', 'b', 'c'])
	const [first, second, third] = result.current.keys as [number, number, number]

	act(() => result.current.update(first, 'd'))
	rerender({ rows: last().sort() })

	expect(result.current.keys).toEqual([second, third, first])
})

test('keys a row the owner pushes onto the list it was handed', () => {
	const { result, rerender, last } = held(['a'])
	act(() => result.current.add('b'))
	const handed = last()

	handed.push('c')
	rerender({ rows: handed })

	expect(result.current.keys).toHaveLength(3)
	expect(new Set(result.current.keys).size).toBe(3)
})

test('settles when the owner hands in a new empty list on every render', () => {
	const { result, rerender } = renderHook(() => useRowKeys<string>([], vi.fn()))

	rerender()

	expect(result.current.keys).toEqual([])
})

test('settles when the owner parses its list on every render', () => {
	const changes: object[][] = []
	const { result } = renderHook(() => useRowKeys(JSON.parse('[{"note":"first"}]') as object[], (next) => {
		changes.push(next)
	}))

	act(() => result.current.add({ note: '' }))

	expect(changes).toEqual([[{ note: 'first' }, { note: '' }]])
})

test('tells whether an add or a removal would change the list now', () => {
	expect(held(['a', 'b'], { min: 2, max: 3 }).result.current).toMatchObject({ canAdd: true, canRemove: false })
	expect(held(['a', 'b'], { min: 1, max: 2 }).result.current).toMatchObject({ canAdd: false, canRemove: true })
	expect(held(['a'], { max: Number.NaN }).result.current).toMatchObject({ canAdd: false })
})

test('gives fresh keys to the rows a list from elsewhere replaces', () => {
	const { result, rerender } = held(['a', 'b'])
	const before = result.current.keys

	rerender({ rows: ['c', 'd'] })

	expect(result.current.keys.filter((key) => before.includes(key))).toEqual([])
	expect(new Set(result.current.keys).size).toBe(2)
})
