// SPDX-License-Identifier: Apache-2.0

import { useInsertionEffect, useReducer, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** The identities of a list's rows and the operations that change the list, each ignoring a key no row holds. */
export interface RowKeys<T> {
	/** One key per row, in row order, that a row keeps through every operation and every list still holding it. */
	keys: readonly number[]
	/** Whether an add would append a row now. */
	canAdd: boolean
	/** Whether a removal would take a row away now. */
	canRemove: boolean
	/** Appends a row with a fresh key, doing nothing at the most rows allowed. */
	add: (row: T) => void
	/** Replaces the row holding a key. */
	update: (key: number, row: T) => void
	/** Moves the row holding a key by an offset, doing nothing past either end. */
	move: (key: number, offset: number) => void
	/** Takes away the row holding a key, doing nothing at the fewest rows allowed. */
	remove: (key: number) => void
}

/** The fewest rows a removal leaves and the most an add reaches, neither applied to the rows handed in. */
export interface RowBounds {
	/** The fewest rows a removal leaves, none by default. */
	min?: number
	/** The most rows an add reaches, no limit by default. */
	max?: number
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

/** The rows the next operation builds on and the props it answers to. */
interface Latest<T> {
	held: Held<T>
	onChange: (rows: T[]) => void
	min: number
	max: number
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
 * Returns a copy of a list with a key per row, each row taking a key it held before and any other row a fresh one.
 * @param rows - The list to key.
 * @param known - The lists keyed before, the one to trust first leading.
 * @returns The copy and its keys.
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
	return { rows: [...rows], keys, next }
}

/**
 * Reports whether a keyed list holds the same rows in the same order as a list.
 * @param list - The keyed list.
 * @param rows - The list to compare.
 * @returns Whether both hold the same rows.
 */
function holds<T>(list: Held<T>, rows: readonly T[]): boolean {
	return list.rows.length === rows.length && list.rows.every((row, at) => Object.is(row, rows[at]))
}

/**
 * Returns the rows to show with their keys.
 * @param lists - The rows last shown and last handed to the owner.
 * @param rows - The rows the owner holds now.
 * @param given - The rows the owner handed in when the list was last shown.
 * @returns The rows and their keys.
 */
function shownFor<T>({ shown, sent }: Lists<T>, rows: readonly T[], given: readonly T[]): Held<T> {
	const trusted = rows === given ? [shown, sent] : [sent, shown]
	return trusted.find((list) => holds(list, rows)) ?? keyed(rows, [sent, shown])
}

/**
 * Returns the operations that change a list by key, each building on the latest rows and handing the owner a copy.
 * @param lists - The rows last shown and last handed to the owner.
 * @param latest - The rows the next operation builds on and the props it answers to.
 * @param rendered - What renders the host again.
 * @returns The operations adding, replacing, moving and removing a row.
 */
function operationsOn<T>(
	lists: RefObject<Lists<T>>,
	latest: RefObject<Latest<T>>,
	rendered: () => void,
): Pick<RowKeys<T>, 'add' | 'update' | 'move' | 'remove'> {
	const emit = (held: Held<T>) => {
		lists.current = { ...lists.current, sent: held }
		latest.current = { ...latest.current, held }
		rendered()
		latest.current.onChange([...held.rows])
	}
	const placeOf = (key: number) => latest.current.held.keys.indexOf(key)
	return {
		add: (row) => {
			const { rows: before, keys, next } = latest.current.held
			if (before.length < latest.current.max) {
				emit({ rows: [...before, row], keys: [...keys, next], next: next + 1 })
			}
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
			if (at >= 0 && held.rows.length > latest.current.min) {
				const kept = (_: unknown, place: number) => place !== at
				emit({ ...held, rows: held.rows.filter(kept), keys: held.keys.filter(kept) })
			}
		},
	}
}

/**
 * Returns a key per row that survives every change, and the operations that change the list by key.
 * @param rows - The rows the list holds, each known by its identity.
 * @param onChange - What to call with a copy of the rows a change leaves, set right away and never in a transition.
 * @param bounds - The fewest rows a removal leaves and the most rows an add reaches.
 * @returns The keys, whether an add or a removal would do anything, and the operations.
 */
export function useRowKeys<T>(
	rows: readonly T[],
	onChange: (rows: T[]) => void,
	{ min = 0, max = Infinity }: RowBounds = {},
): RowKeys<T> {
	const [first] = useState(() => keyed(rows, []))
	const lists = useRef<Lists<T>>({ shown: first, sent: first })
	const given = useRef(rows)
	const [, rendered] = useReducer((count: number) => count + 1, 0)
	const current = shownFor(lists.current, rows, given.current)
	const latest = useRef<Latest<T>>({ held: current, onChange, min, max })
	const [operations] = useState(() => operationsOn(lists, latest, rendered))
	useInsertionEffect(() => {
		given.current = rows
		if (current !== lists.current.shown) {
			lists.current = { shown: current, sent: current }
		}
		latest.current = { held: current, onChange, min, max }
	})
	return {
		keys: current.keys,
		canAdd: current.rows.length < max,
		canRemove: current.rows.length > min,
		...operations,
	}
}
