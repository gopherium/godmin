// SPDX-License-Identifier: Apache-2.0

import { useLayoutEffect, useRef, useState } from 'react'

/** The identities of a list's rows and the operations that change the list, each ignoring a key no row holds. */
export interface RowKeys<T> {
	/** One key per row, in row order, that a row keeps through every operation and every list still holding it. */
	keys: readonly number[]
	/** Appends a row with a fresh key. */
	add: (row: T) => void
	/** Replaces the row holding a key. */
	update: (key: number, row: T) => void
	/** Moves the row holding a key by an offset, doing nothing past either end. */
	move: (key: number, offset: number) => void
	/** Takes away the row holding a key. */
	remove: (key: number) => void
}

/** A list of rows, the key of each, and the next key to hand out. */
interface Held<T> {
	rows: readonly T[]
	keys: readonly number[]
	next: number
}

/** The rows last shown and the rows last handed to the owner, each with its keys. */
interface Lists<T> {
	shown: Held<T>
	sent: Held<T>
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
 * Returns a list with a key per row, each row taking a key it held before and any other row a fresh one.
 * @param rows - The list to key.
 * @param known - The lists keyed before, the one to trust first leading.
 * @returns The list and its keys.
 */
function keyed<T>(rows: readonly T[], known: readonly Held<T>[]): Held<T> {
	const held = new Map<T, number[]>()
	for (const list of known) {
		list.rows.forEach((row, at) => held.set(row, [...(held.get(row) ?? []), list.keys[at]]))
	}
	const used = new Set<number>()
	let next = Math.max(0, ...known.map((list) => list.next))
	const keys = rows.map((row) => {
		const key = held.get(row)?.find((candidate) => !used.has(candidate)) ?? next++
		used.add(key)
		return key
	})
	return { rows, keys, next }
}

/**
 * Returns the rows to show with their keys.
 * @param lists - The rows last shown and last handed to the owner.
 * @param rows - The rows the owner holds now.
 * @returns The rows and their keys.
 */
function shownFor<T>({ shown, sent }: Lists<T>, rows: readonly T[]): Held<T> {
	if (rows === shown.rows) {
		return shown
	}
	if (rows === sent.rows) {
		return sent
	}
	return keyed(rows, [sent, shown])
}

/**
 * Returns a key per row that survives every change, and the operations that change the list by key.
 * @param rows - The rows the list holds, each known by its identity.
 * @param onChange - What to call with the rows a change leaves.
 * @returns The keys and the operations adding, replacing, moving and removing a row.
 */
export function useRowKeys<T>(rows: readonly T[], onChange: (rows: T[]) => void): RowKeys<T> {
	const [lists, setLists] = useState<Lists<T>>(() => {
		const first = keyed(rows, [])
		return { shown: first, sent: first }
	})
	const current = shownFor(lists, rows)
	if (current !== lists.shown) {
		setLists({ shown: current, sent: current })
	}
	const latest = useRef({ held: current, onChange })
	useLayoutEffect(() => {
		latest.current = { held: current, onChange }
	})
	const emit = (held: Held<T> & { rows: T[] }) => {
		latest.current = { ...latest.current, held }
		setLists((before) => ({ ...before, sent: held }))
		latest.current.onChange(held.rows)
	}
	const placeOf = (key: number) => latest.current.held.keys.indexOf(key)
	return {
		keys: current.keys,
		add: (row) => {
			const { rows: before, keys, next } = latest.current.held
			emit({ rows: [...before, row], keys: [...keys, next], next: next + 1 })
		},
		update: (key, row) => {
			const at = placeOf(key)
			const held = latest.current.held
			if (at >= 0) {
				emit({ ...held, rows: held.rows.map((kept, place) => (place === at ? row : kept)) })
			}
		},
		move: (key, offset) => {
			const at = placeOf(key)
			const held = latest.current.held
			if (at >= 0 && at + offset >= 0 && at + offset < held.rows.length) {
				emit({ ...held, rows: movedIn(held.rows, at, offset), keys: movedIn(held.keys, at, offset) })
			}
		},
		remove: (key) => {
			const at = placeOf(key)
			const held = latest.current.held
			if (at >= 0) {
				const kept = (_: unknown, place: number) => place !== at
				emit({ ...held, rows: held.rows.filter(kept), keys: held.keys.filter(kept) })
			}
		},
	}
}
