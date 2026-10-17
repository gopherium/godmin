// SPDX-License-Identifier: Apache-2.0

import { CONTROLS, offerOf, SINGLE_OPERATORS } from './filter-offer.js'
import type { ListFilter, ListSortDirection, ListViewShape } from './list-view.js'

/** The parts of a list field the guard reads, as a DataViews field holds them. */
export interface GuardedField {
	/** The id a sort or a filter names. */
	id: string
	/** The DataViews type of the field, such as text or media. */
	type?: string
	/** Whether the list sorts by the field, when absent true unless the field holds media or a password. */
	enableSorting?: boolean
	/** The operators the field filters with, its type's defaults when it names none, none when false. */
	filterBy?: { operators?: readonly string[] } | false
	/** The values a filter on the field may hold, any value its check takes when absent or empty. */
	elements?: readonly { value: unknown }[]
	/** Loads the values a filter on the field may hold in place of elements, any value its check takes then. */
	getElements?: unknown
	/** The control that edits the field: a component, a control name or a control config. */
	Edit?: unknown
}

/** How a field with no elements to match checks a filter value, keyed by field id. */
type ValueChecks = Record<string, (value: unknown) => boolean>

/** The field types DataViews never sorts by unless the field says it sorts. */
const UNSORTED_TYPES: readonly (string | undefined)[] = ['media', 'password']

/** The order a list falls back to and how it checks a filter value with no elements to match. */
export interface ViewGuard {
	/** The order the list opens in, taken in place of a sort the fields do not offer. */
	opening: { field: string; direction: ListSortDirection }
	/** How a field with no elements to match checks a filter value, keyed by field id, any value taken when absent. */
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
 * Reports whether a field holds the values a filter on it may pick, as DataViews reads it.
 * @param field - The field a filter names.
 * @returns Whether it holds at least one element or loads them.
 */
function hasElements(field: GuardedField): boolean {
	return (field.elements?.length ?? 0) > 0 || typeof field.getElements === 'function'
}

/**
 * Reports whether a field draws a control, as DataViews reads its Edit and else its type.
 * @param field - The field a filter names.
 * @returns Whether its Edit is a component or names a control DataViews knows, or else its type draws one.
 */
function hasControl(field: GuardedField): boolean {
	const edit = field.Edit
	if (typeof edit === 'function') {
		return true
	}
	const name = typeof edit === 'object' && edit !== null ? (edit as { control?: unknown }).control : edit
	return typeof name === 'string' ? CONTROLS.includes(name) : offerOf(field.type).control
}

/**
 * Reports whether DataViews can draw a filter for a field, from its elements or its control.
 * @param field - The field a filter names.
 * @returns Whether the field has elements or a control.
 */
function canDraw(field: GuardedField): boolean {
	return hasElements(field) || hasControl(field)
}

/**
 * Returns the operators a field filters with, as DataViews resolves them.
 * @param field - The field a filter names.
 * @returns The named operators its type takes, else its type's defaults, none when DataViews draws no filter.
 */
function operatorsOf(field: GuardedField): readonly string[] {
	const filterBy = field.filterBy
	if (filterBy === false || !canDraw(field)) {
		return []
	}
	const offer = offerOf(field.type)
	return filterBy?.operators?.filter((operator) => offer.valid.includes(operator)) ?? offer.defaults
}

/**
 * Reports whether a field picks one value, as DataViews reads it from the field's operators.
 * @param operators - The operators the field filters with.
 * @returns Whether any of them picks one value.
 */
function picksOne(operators: readonly string[]): boolean {
	return operators.some((operator) => SINGLE_OPERATORS.includes(operator))
}

/**
 * Reports whether a value has the shape DataViews writes on a field with elements.
 * @param field - The field the filter narrows by.
 * @param operators - The operators the field filters with.
 * @param value - The value the filter holds.
 * @returns Whether it is one value where the field picks one or a list where it picks many, or it has no elements.
 */
function fitsShape(field: GuardedField, operators: readonly string[], value: unknown): boolean {
	return !hasElements(field) || Array.isArray(value) !== picksOne(operators)
}

/**
 * Returns the elements a filter value must be one of, as DataViews shows them.
 * @param field - The field the filter narrows by.
 * @returns Its elements, none when it loads its own.
 */
function matchedElements(field: GuardedField): readonly { value: unknown }[] {
	return typeof field.getElements === 'function' ? [] : (field.elements ?? [])
}

/**
 * Reports whether a field takes the value a filter holds.
 * @param field - The field the filter narrows by.
 * @param value - The value the filter holds, one value or a pick of many.
 * @param checks - How a field with no elements to match checks a value.
 * @returns Whether each picked value is one of the elements, or the value passes the field's check, or it has none.
 */
function takes(field: GuardedField, value: unknown, checks: ValueChecks | undefined): boolean {
	const elements = matchedElements(field)
	if (elements.length > 0) {
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
 * @param checks - How a field with no elements to match checks a value.
 * @returns Whether the list can apply the filter, one still waiting for its value included.
 */
function offers(filter: ListFilter, fields: readonly GuardedField[], checks: ValueChecks | undefined): boolean {
	const field = fields.find((held) => held.id === filter.field)
	if (field === undefined) {
		return false
	}
	const operators = operatorsOf(field)
	if (!operators.includes(filter.operator)) {
		return false
	}
	const value = filter.value
	return value === undefined || (fitsShape(field, operators, value) && takes(field, value, checks))
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
