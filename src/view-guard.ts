// SPDX-License-Identifier: Apache-2.0

import type { ListFilter, ListSortDirection, ListViewShape } from './list-view.js'

/** The parts of a list field the guard reads, as a DataViews field holds them. */
export interface GuardedField {
	/** The id a sort or a filter names. */
	id: string
	/** The DataViews type of the field, such as text or media. */
	type?: string
	/** Whether the list sorts by the field, when absent true unless the field holds media or a password. */
	enableSorting?: boolean
	/** The operators the field filters with, none when absent or false. */
	filterBy?: { operators?: readonly string[] } | false
	/** The values a filter on the field may hold, any value its check takes when absent. */
	elements?: readonly { value: unknown }[]
}

/** How a field with no elements checks a filter value, keyed by field id. */
type ValueChecks = Record<string, (value: unknown) => boolean>

/** The field types DataViews never sorts by unless the field says it sorts. */
const UNSORTED_TYPES: readonly (string | undefined)[] = ['media', 'password']

/** The order a list falls back to and how it checks a filter value with no elements to match. */
export interface ViewGuard {
	/** The order the list opens in, taken in place of a sort the fields do not offer. */
	opening: { field: string; direction: ListSortDirection }
	/** How a field with no elements checks a filter value, keyed by field id, any value taken when absent. */
	checks?: ValueChecks
}

/** A view as its fields can draw it, every filter it holds one the list offers. */
export type OfferedView<V extends ListViewShape> = V & { filters: NonNullable<V['filters']> }

/**
 * Reports whether a filter holds a value, a pick of none being no value.
 * @param value - The value the filter holds.
 * @returns Whether the value narrows the list.
 */
function holdsValue(value: unknown): boolean {
	return Array.isArray(value) ? value.length > 0 : value !== undefined
}

/**
 * Reports whether a search, or a filter holding a value, narrows a list.
 * @param view - The view the list shows.
 * @returns Whether the list may show fewer items than it holds.
 */
export function viewNarrows(view: Pick<ListViewShape, 'search' | 'filters'>): boolean {
	return Boolean(view.search) || (view.filters ?? []).some((filter) => holdsValue(filter.value))
}

/**
 * Reports whether the list sorts by a field, as DataViews reads it.
 * @param field - The field a sort names.
 * @returns The field's own setting, else whether its type sorts.
 */
function sorts(field: GuardedField): boolean {
	return field.enableSorting ?? !UNSORTED_TYPES.includes(field.type)
}

/**
 * Returns the operators a field filters with.
 * @param field - The field a filter names.
 * @returns The operators it names, none when it offers no filter.
 */
function operatorsOf(field: GuardedField): readonly string[] {
	return field.filterBy === undefined || field.filterBy === false ? [] : (field.filterBy.operators ?? [])
}

/**
 * Reports whether a field takes the value a filter holds.
 * @param field - The field the filter narrows by.
 * @param value - The value the filter holds, one value or a pick of many.
 * @param checks - How a field with no elements checks a value.
 * @returns Whether each picked value is one of the elements, or the value passes the field's check, or it has none.
 */
function takes(field: GuardedField, value: unknown, checks: ValueChecks | undefined): boolean {
	const elements = field.elements
	if (elements !== undefined) {
		const picked: unknown[] = Array.isArray(value) ? value : [value]
		return picked.every((one) => elements.some((element) => element.value === one))
	}
	const check = checks?.[field.id]
	return check === undefined || check(value)
}

/**
 * Reports whether a filter names a field the list filters by, with an operator and a value that field offers.
 * @param filter - The filter the view carries.
 * @param fields - The fields the list shows.
 * @param checks - How a field with no elements checks a value.
 * @returns Whether the list can apply the filter, one still waiting for its value included.
 */
function offers(filter: ListFilter, fields: readonly GuardedField[], checks: ValueChecks | undefined): boolean {
	const field = fields.find((held) => held.id === filter.field)
	if (field === undefined || !operatorsOf(field).includes(filter.operator)) {
		return false
	}
	return filter.value === undefined || takes(field, filter.value, checks)
}

/**
 * Returns the view as its fields can draw it, a sort or a filter naming what the list never offers dropped.
 * @param view - The view the address and the reader hold.
 * @param fields - The fields the list shows.
 * @param guard - The opening order and the value checks.
 * @returns The view the list shows and asks the server for.
 */
export function offeredView<V extends ListViewShape>(
	view: V,
	fields: readonly GuardedField[],
	guard: ViewGuard,
): OfferedView<V> {
	const sorted = fields.some((field) => field.id === view.sort?.field && sorts(field))
	return {
		...view,
		sort: sorted ? view.sort : { ...guard.opening },
		filters: (view.filters ?? []).filter((filter) => offers(filter, fields, guard.checks)),
	} as OfferedView<V>
}
