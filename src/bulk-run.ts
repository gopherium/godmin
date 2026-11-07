// SPDX-License-Identifier: Apache-2.0

import { useCallback } from 'react'

import { bulkNotes, runEach } from './bulk.js'
import type { BulkOutcome, BulkWords } from './bulk.js'
import type { DialogAnswer } from './dialog-open.js'
import type { ListRun } from './list-run.js'
import { useToaster } from './toaster.js'
import type { ToastAction, ToasterHandle } from './toaster.js'

/** Runs one call over each item, reports what the run reached in the given words and then reloads the list. */
export type BulkRun<Item> = (
	items: Item[],
	call: (item: Item) => Promise<unknown>,
	words: BulkWords<Item>,
) => Promise<void>

/** Runs a dialog's write over one item or several, and answers the dialog what to do next. */
export type DialogRun<Item> = (
	items: Item[],
	call: (item: Item) => Promise<unknown>,
	words: BulkWords<Item>,
) => Promise<DialogAnswer | undefined>

/** Reports what a run reached once its last call ended, and gives what the run answers. */
type RunReport<Item, Answer> = (items: Item[], outcome: BulkOutcome<Item>, words: BulkWords<Item>) => Answer

/** Runs one call over each item of a list and answers what its report gives. */
type ListWrite<Item, Answer> = (
	items: Item[],
	call: (item: Item) => Promise<unknown>,
	words: BulkWords<Item>,
) => Promise<Answer>

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
 * Returns the action the toast of a run offers, the words' Undo once every item finished, none otherwise.
 * @param items - The items the run was given.
 * @param outcome - What the run reached.
 * @param words - The words of the run.
 * @returns The action, none when an item failed or the words give no Undo.
 */
function doneAction<Item>(items: Item[], outcome: BulkOutcome<Item>, words: BulkWords<Item>): ToastAction | undefined {
	return outcome.failures.length === 0 ? words.undo?.(items) : undefined
}

/**
 * Shows the one toast a run's outcome reads as, with the words' Undo once every item finished.
 * @param toaster - Where the toast shows.
 * @param items - The items the run was given.
 * @param outcome - What the run reached.
 * @param words - The words of the run.
 */
function toastOutcome<Item>(
	toaster: ToasterHandle,
	items: Item[],
	outcome: BulkOutcome<Item>,
	words: BulkWords<Item>,
): void {
	const message = bulkToast(items, outcome, words)
	if (message !== undefined) {
		toaster.show(message, doneAction(items, outcome, words))
	}
}

/**
 * Returns the handler that runs a call per item, marks the list reloading at the first that works, reports at the last.
 * @param list - What the list does around a run.
 * @param refresh - Reloads the list once the last call ended, given the items the run acted on.
 * @param report - Reports what the run reached and gives what the handler answers.
 * @returns The run handler, the same while the list run, the refresh and the report stay the same.
 */
function useListWrite<Item, Answer>(
	list: ListRun,
	refresh: (items: Item[]) => Promise<unknown>,
	report: RunReport<Item, Answer>,
): ListWrite<Item, Answer> {
	return useCallback<ListWrite<Item, Answer>>(
		async (given, call, words) => {
			const items = given.filter(() => true)
			const settle = list.onStart()
			const reload = reloadOnce(list)
			const outcome = await runEach(items, reporting(call, reload.mark))
			void Promise.resolve()
				.then(() => refresh(items))
				.then(reload.end, reload.end)
			try {
				return report(items, outcome, words)
			} finally {
				settle(outcome.done > 0)
			}
		},
		[list, refresh, report],
	)
}

/**
 * Returns the handler that runs a call per item, marks the list reloading at the first that works, toasts at the last.
 * @param list - What the list does around a run.
 * @param refresh - Reloads the list once the last call ended, given the items the run acted on.
 * @returns The run handler, the same while the list run and the refresh stay the same.
 */
export function useBulkRun<Item>(list: ListRun, refresh: (items: Item[]) => Promise<unknown>): BulkRun<Item> {
	const toaster = useToaster()
	const report = useCallback<RunReport<Item, void>>(
		(items, outcome, words) => toastOutcome(toaster, items, outcome, words),
		[toaster],
	)
	return useListWrite(list, refresh, report)
}

/**
 * Returns the handler that runs a dialog's write on a list: one item that failed answers its words, else a toast.
 * @param list - What the list does around a run.
 * @param refresh - Reloads the list once the last call ended, given the items the run acted on.
 * @returns The run handler, the same while the list run and the refresh stay the same.
 */
export function useDialogRun<Item>(list: ListRun, refresh: (items: Item[]) => Promise<unknown>): DialogRun<Item> {
	const toaster = useToaster()
	const report = useCallback<RunReport<Item, DialogAnswer | undefined>>(
		(items, outcome, words) => {
			if (outcome.asked === 1 && outcome.done === 0) {
				return { error: words.failed(outcome.failures, 1) }
			}
			toastOutcome(toaster, items, outcome, words)
			return undefined
		},
		[toaster],
	)
	return useListWrite(list, refresh, report)
}
