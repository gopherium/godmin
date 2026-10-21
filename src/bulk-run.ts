// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'

import { bulkNotes, runEach } from './bulk.js'
import type { BulkOutcome, BulkWords } from './bulk.js'
import type { ListRun } from './list-run.js'
import { useToaster } from './toaster.js'

/** Runs one call over each item, refreshes the list and reports what the run reached in the given words. */
export type BulkRun<Item> = (
	items: Item[],
	call: (item: Item) => Promise<unknown>,
	words: BulkWords<Item>,
) => Promise<void>

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
 * Returns the handler that runs one call per item, refreshes the list, shows one toast and settles the run.
 * @param list - What the list does around a run.
 * @param refresh - Reloads the list, given the items the run acted on.
 * @returns The run handler, the same while the list run and the refresh stay the same.
 */
export function useBulkRun<Item>(list: ListRun, refresh: (items: Item[]) => Promise<unknown>): BulkRun<Item> {
	const toaster = useToaster()
	return useCallback<BulkRun<Item>>(
		async (items, call, words) => {
			const settle = list.onStart()
			const outcome = await runEach(items, call)
			try {
				await refresh(items)
			} finally {
				try {
					const message = bulkToast(items, outcome, words)
					if (message !== undefined) {
						toaster.show(message)
					}
				} finally {
					settle(outcome.done > 0)
				}
			}
		},
		[list, refresh, toaster],
	)
}
