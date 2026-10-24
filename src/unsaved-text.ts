// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'

/** What a failed write left unsaved, by the id of the item it was typed for, the text of one field unless named. */
export type UnsavedText<Value = string> = Map<string, Value>

/**
 * Returns what failed writes left unsaved, the same store for as long as the screen stays.
 * @returns The store a row form takes its first value from when it opens again.
 */
export function useUnsavedText<Value = string>(): UnsavedText<Value> {
	const [held] = useState<UnsavedText<Value>>(() => new Map())
	return held
}

/** The latest write each store sent, by the id of the item it went to. */
const latestWrites = new WeakMap<UnsavedText<unknown>, Map<string, symbol>>()

/**
 * Marks a write as the latest one sent for an item, the only one that may keep its text.
 * @param unsaved - The store the latest writes of the item are marked on.
 * @param id - The item the write goes to.
 * @returns The check telling whether no later write went to the item since.
 */
export function markLatest(unsaved: UnsavedText<unknown>, id: string): () => boolean {
	const writes = latestWrites.get(unsaved) ?? new Map<string, symbol>()
	latestWrites.set(unsaved, writes)
	const write = Symbol(id)
	writes.set(id, write)
	return () => writes.get(id) === write
}
