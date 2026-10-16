// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'

import { bulkNotes, runEach } from './bulk.js'
import type { BulkWords } from './bulk.js'
import type { ListRun } from './list-run.js'
import { useToaster } from './toaster.js'

/** Runs one call over each item, refreshes the list and reports what the run reached in the given words. */
export type BulkRun<Item> = (
	items: Item[],
	call: (item: Item) => Promise<unknown>,
	words: BulkWords<Item>,
) => Promise<void>

/**
 * Returns the handler that runs one call per item, refreshes the list, toasts what finished and settles the run.
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
				const notes = bulkNotes(items, outcome, words)
				if (notes.toast !== undefined) {
					toaster.show(notes.toast)
				}
				settle(notes.notice, outcome.done > 0)
			}
		},
		[list, refresh, toaster],
	)
}
