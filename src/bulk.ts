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
	return typeof answer === 'object' && answer !== null && 'error' in answer ? answer.error : undefined
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
 * @param items - The items to act on.
 * @param call - The action on one item, failing when it rejects, throws, or answers with an error.
 * @returns How many items were asked, how many finished, and each failure with its item.
 */
export async function runEach<Item>(
	items: readonly Item[],
	call: (item: Item) => Promise<unknown>,
): Promise<BulkOutcome<Item>> {
	const given = [...items]
	const settled = await Promise.allSettled(given.map(async (item) => call(item)))
	const failures = settled.flatMap((result, at) => failureOf(result, given[at]))
	return { asked: given.length, done: given.length - failures.length, failures }
}
