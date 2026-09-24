// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'

/** The identities of a list's rows and the operations that change the list with them. */
export interface RowKeys<T> {
	/** One key per row, in row order, that stays with its row through every change. */
	keys: readonly number[]
	/** Appends a row with a fresh key. */
	add: (row: T) => void
	/** Moves the row at a place by an offset, doing nothing past either end. */
	move: (at: number, offset: number) => void
	/** Takes away the row at a place. */
	remove: (at: number) => void
}

/** The keys held for a list and the next key to hand out. */
interface Held {
	keys: number[]
	next: number
}

/**
 * Returns the list with the item at one place moved by an offset.
 * @param list - The list to move within.
 * @param at - The place of the item to move.
 * @param offset - How far to move it.
 * @returns The reordered list.
 */
function movedIn<T>(list: readonly T[], at: number, offset: number): T[] {
	const moved = [...list]
	const [item] = moved.splice(at, 1) as [T]
	moved.splice(at + offset, 0, item)
	return moved
}

/**
 * Returns the keys held grown or trimmed to a list's length.
 * @param held - The keys held so far.
 * @param length - How many rows the list holds now.
 * @returns The keys in step with the list.
 */
function inStep(held: Held, length: number): Held {
	const keys = held.keys.slice(0, length)
	let next = held.next
	while (keys.length < length) {
		keys.push(next)
		next += 1
	}
	return { keys, next }
}

/**
 * Returns a key per row that survives moves and removals, and the operations that keep it in step.
 * @param rows - The rows the list holds.
 * @param onChange - What to call with the rows a change leaves.
 * @returns The keys and the operations adding, moving and removing a row.
 */
export function useRowKeys<T>(rows: readonly T[], onChange: (rows: T[]) => void): RowKeys<T> {
	const [held, setHeld] = useState<Held>(() => inStep({ keys: [], next: 0 }, rows.length))
	const current = held.keys.length === rows.length ? held : inStep(held, rows.length)
	if (current !== held) {
		setHeld(current)
	}
	return {
		keys: current.keys,
		add: (row) => {
			setHeld({ keys: [...current.keys, current.next], next: current.next + 1 })
			onChange([...rows, row])
		},
		move: (at, offset) => {
			const to = at + offset
			if (to < 0 || to >= rows.length) {
				return
			}
			setHeld({ ...current, keys: movedIn(current.keys, at, offset) })
			onChange(movedIn(rows, at, offset))
		},
		remove: (at) => {
			setHeld({ ...current, keys: current.keys.filter((_, place) => place !== at) })
			onChange(rows.filter((_, place) => place !== at))
		},
	}
}
