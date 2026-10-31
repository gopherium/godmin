// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'

import { bulkNotes, runEach } from './bulk.js'
import type { BulkOutcome, BulkWords } from './bulk.js'
import type { ListRun } from './list-run.js'
import { useToaster } from './toaster.js'

/** Runs one call over each item, reports what the run reached in the given words and then reloads the list. */
export type BulkRun<Item> = (
	items: Item[],
	call: (item: Item) => Promise<unknown>,
	words: BulkWords<Item>,
) => Promise<void>

/** What marks the list reloading once in a run, and what ends that reload. */
interface RunReload {
	/** Marks the list reloading the first time it is called, and does nothing after. */
	mark: () => void
	/** Ends the reload once it was marked, and does nothing when it never was. */
	end: () => void
}

/**
 * Returns what marks a list reloading once in a run, and what ends that reload.
 * @param list - What the list does around a run.
 * @returns The mark and the end.
 */
function reloadOnce(list: ListRun): RunReload {
	let ended: (() => void) | undefined
	return {
		mark: () => {
			ended ??= list.onRefresh()
		},
		end: () => ended?.(),
	}
}

/**
 * Returns the call on one item that fails as the given call fails, and calls `worked` once it works.
 * @param call - The action on one item.
 * @param worked - What runs each time the call on an item works.
 * @returns The call that reports each item it finished.
 */
function reporting<Item>(call: (item: Item) => Promise<unknown>, worked: () => void): (item: Item) => Promise<void> {
	return async (item) => {
		const { failures } = await runEach([item], call)
		if (failures.length > 0) {
			throw failures[0].error
		}
		worked()
	}
}

/**
 * Returns the one message a bulk outcome shows: the failure words when an item failed, else the done words.
 * @param items - The items the run was given.
 * @param outcome - What the run reached.
 * @param words - The words for the items that finished and for the ones that failed.
 * @returns The message, none when the run was given no items.
 */
function bulkToast<Item>(items: Item[], outcome: BulkOutcome<Item>, words: BulkWords<Item>): string | undefined {
	const notes = bulkNotes(items, outcome, words)
	return notes.notice ?? notes.toast
}

/**
 * Returns the handler that runs a call per item, marks the list reloading at the first that works, toasts at the last.
 * @param list - What the list does around a run.
 * @param refresh - Reloads the list once the last call ended, given the items the run acted on.
 * @returns The run handler, the same while the list run and the refresh stay the same.
 */
export function useBulkRun<Item>(list: ListRun, refresh: (items: Item[]) => Promise<unknown>): BulkRun<Item> {
	const toaster = useToaster()
	return useCallback<BulkRun<Item>>(
		async (items, call, words) => {
			const settle = list.onStart()
			const reload = reloadOnce(list)
			const outcome = await runEach(items, reporting(call, reload.mark))
			void Promise.resolve()
				.then(() => refresh(items))
				.then(reload.end, reload.end)
			try {
				const message = bulkToast(items, outcome, words)
				if (message !== undefined) {
					toaster.show(message)
				}
			} finally {
				settle(outcome.done > 0)
			}
		},
		[list, refresh, toaster],
	)
}
