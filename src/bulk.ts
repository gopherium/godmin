// SPDX-License-Identifier: Apache-2.0

/** An item a bulk run could not finish, with the error its call failed with. */
export interface BulkFailure<Item> {
	/** The item the call was made for. */
	item: Item
	/** What the call rejected with, threw, or answered as its error. */
	error: unknown
}

/** What a bulk run reached. */
export interface BulkOutcome<Item> {
	/** How many items the run was given. */
	asked: number
	/** How many of them finished. */
	done: number
	/** The items that failed, in the order they were given. */
	failures: BulkFailure<Item>[]
}

/**
 * Returns the error an answer carries, or undefined when it carries none.
 * @param answer - What a call resolved with.
 * @returns The answer's error.
 */
function answeredError(answer: unknown): unknown {
	if (typeof answer !== 'object' || answer === null || !('error' in answer)) {
		return undefined
	}
	const error = answer.error
	return error === null ? undefined : error
}

/**
 * Returns the failure one settled call stands for, or none when it finished.
 * @param settled - How the call settled.
 * @param item - The item the call was made for.
 * @returns The failure, or an empty list.
 */
function failureOf<Item>(settled: PromiseSettledResult<unknown>, item: Item): BulkFailure<Item>[] {
	if (settled.status === 'rejected') {
		return [{ item, error: settled.reason }]
	}
	const error = answeredError(settled.value)
	return error === undefined ? [] : [{ item, error }]
}

/**
 * Runs one call for each item, all at once, and counts the calls that finished and the ones that failed.
 * @param items - The items to act on, an empty slot left out.
 * @param call - The action on one item, failing when it rejects, throws, or answers with an error.
 * @returns How many items were asked, how many finished, and each failure with its item.
 */
export async function runEach<Item>(
	items: readonly Item[],
	call: (item: Item) => Promise<unknown>,
): Promise<BulkOutcome<Item>> {
	const given = items.filter(() => true)
	const settled = await Promise.allSettled(given.map(async (item) => call(item)))
	const failures = settled.flatMap((result, at) => failureOf(result, given[at]))
	return { asked: given.length, done: given.length - failures.length, failures }
}

/** The words a product turns a bulk outcome into. */
export interface BulkWords<Item> {
	/** The toast for the items that finished, given their count and the one item when only one was asked. */
	done: (count: number, only: Item | undefined) => string
	/** The notice for the items that failed, given every failure and how many items were asked. */
	failed: (failures: BulkFailure<Item>[], asked: number) => string
}

/** The messages a bulk outcome reads as, each absent when nothing calls for it. */
export interface BulkNotes {
	/** The toast confirming the items that finished. */
	toast?: string
	/** The notice naming the items that failed. */
	notice?: string
}

/**
 * Returns the toast and the notice a bulk outcome reads as, in the product's words.
 * @param items - The items the run was given.
 * @param outcome - What the run reached.
 * @param words - The words for the items that finished and for the ones that failed.
 * @returns A toast when an item finished and a notice when one failed.
 */
export function bulkNotes<Item>(items: readonly Item[], outcome: BulkOutcome<Item>, words: BulkWords<Item>): BulkNotes {
	const only = outcome.asked === 1 ? items.filter(() => true)[0] : undefined
	return {
		toast: outcome.done > 0 ? words.done(outcome.done, only) : undefined,
		notice: outcome.failures.length > 0 ? words.failed(outcome.failures, outcome.asked) : undefined,
	}
}
