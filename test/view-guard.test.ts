// SPDX-License-Identifier: Apache-2.0

import type { Field, View } from '@wordpress/dataviews'
import { expect, test } from 'vitest'

import { offeredView, viewNarrows } from '../src/index'
import type { GuardedField, OfferedView, ViewGuard } from '../src/index'

/** The fields of a list of posts, as a list hands them to the guard. */
const FIELDS: GuardedField[] = [
	{ id: 'title', enableSorting: true, filterBy: false },
	{ id: 'excerpt', enableSorting: false, filterBy: false },
	{ id: 'author', filterBy: { operators: ['isAny', 'isNone'] } },
	{ id: 'date', filterBy: { operators: ['before', 'after'] } },
	{
		id: 'status',
		enableSorting: false,
		filterBy: { operators: ['is', 'isAny'] },
		elements: [{ value: 'draft' }, { value: 'publish' }],
	},
	{ id: 'genre', filterBy: { operators: ['is'] } },
	{ id: 'tags', filterBy: {} },
	{ id: 'slug' },
	{ id: 'cover', type: 'media' },
	{ id: 'passcode', type: 'password' },
	{ id: 'poster', type: 'media', enableSorting: true },
]

/** The order the list opens in. */
const OPENING = { field: 'date', direction: 'desc' } as const

/** Reports whether a value names accounts, each one a whole number. */
const namesAccounts = (value: unknown) => Array.isArray(value) && value.every((id) => /^\d+$/.test(String(id)))

/** The opening order and the check of the field with no elements. */
const GUARD: ViewGuard = { opening: OPENING, checks: { author: namesAccounts } }

/**
 * Returns the view the guard hands back for a table view holding the given parts.
 * @param parts - The search, sort, filters and page of the view.
 * @returns The offered view.
 */
function offered(parts: Partial<View>): OfferedView<View> {
	return offeredView({ type: 'table', ...parts } as View, FIELDS, GUARD)
}

test('reads a search as narrowing a list', () => {
	expect(viewNarrows({ search: 'Hello' })).toBe(true)
})

test('reads a filter holding a value as narrowing a list', () => {
	expect(viewNarrows({ filters: [{ field: 'status', operator: 'is', value: 'draft' }] })).toBe(true)
	expect(viewNarrows({ filters: [{ field: 'author', operator: 'isAny', value: ['184467235'] }] })).toBe(true)
})

test('reads a filter holding an empty pick, or no value yet, as narrowing nothing', () => {
	expect(viewNarrows({ filters: [{ field: 'author', operator: 'isAny', value: [] }] })).toBe(false)
	expect(viewNarrows({ filters: [{ field: 'status', operator: 'is' }] })).toBe(false)
})

test('reads a view with no search and no filter as narrowing nothing', () => {
	expect(viewNarrows({})).toBe(false)
	expect(viewNarrows({ search: '', filters: [] })).toBe(false)
})

test('keeps a sort by a field the list sorts by', () => {
	expect(offered({ sort: { field: 'title', direction: 'asc' } }).sort).toEqual({ field: 'title', direction: 'asc' })
	expect(offered({ sort: { field: 'author', direction: 'asc' } }).sort).toEqual({ field: 'author', direction: 'asc' })
})

test('falls back to the opening order for a field that does not sort, or that the list does not have', () => {
	expect(offered({ sort: { field: 'excerpt', direction: 'asc' } }).sort).toEqual(OPENING)
	expect(offered({ sort: { field: 'menu_order', direction: 'asc' } }).sort).toEqual(OPENING)
	expect(offered({}).sort).toEqual(OPENING)
})

test('sorts by a media or a password field only when the field says it sorts, as DataViews does', () => {
	expect(offered({ sort: { field: 'cover', direction: 'asc' } }).sort).toEqual(OPENING)
	expect(offered({ sort: { field: 'passcode', direction: 'asc' } }).sort).toEqual(OPENING)
	expect(offered({ sort: { field: 'poster', direction: 'asc' } }).sort).toEqual({ field: 'poster', direction: 'asc' })
})

test('hands back an opening order the caller may change without changing the guard', () => {
	const sort = offered({}).sort as { field: string }
	sort.field = 'title'

	expect(offered({}).sort).toEqual({ field: 'date', direction: 'desc' })
})

test('keeps a filter on an offered field, operator and value', () => {
	const filters = [
		{ field: 'status', operator: 'is' as const, value: 'draft' },
		{ field: 'author', operator: 'isNone' as const, value: ['184467235'] },
	]

	expect(offered({ filters }).filters).toEqual(filters)
})

test('drops a filter on a field the list does not have, or one that offers no filter', () => {
	const filters = [
		{ field: 'menu_order', operator: 'is' as const, value: 1 },
		{ field: 'title', operator: 'is' as const, value: 'Hello' },
		{ field: 'slug', operator: 'is' as const, value: 'hello' },
	]

	expect(offered({ filters }).filters).toEqual([])
})

test('drops a filter with an operator the field does not name, or on a field that names none', () => {
	const filters = [
		{ field: 'status', operator: 'isNot' as const, value: 'draft' },
		{ field: 'tags', operator: 'isAny' as const, value: ['news'] },
	]

	expect(offered({ filters }).filters).toEqual([])
})

test('drops a filter whose value is not one of the field\'s elements', () => {
	expect(offered({ filters: [{ field: 'status', operator: 'is', value: 'trash' }] }).filters).toEqual([])
})

test('keeps a pick whose every value is one of the field\'s elements, and drops one holding any other', () => {
	const kept = { field: 'status', operator: 'isAny' as const, value: ['draft', 'publish'] }
	const dropped = { field: 'status', operator: 'isAny' as const, value: ['draft', 'trash'] }

	expect(offered({ filters: [kept, dropped] }).filters).toEqual([kept])
})

test('keeps a filter still waiting for its value', () => {
	const filters = [
		{ field: 'status', operator: 'is' as const, value: undefined },
		{ field: 'author', operator: 'isAny' as const, value: undefined },
	]

	expect(offered({ filters }).filters).toEqual(filters)
})

test('checks the value of a field with no elements by the check named for it', () => {
	const kept = { field: 'author', operator: 'isAny' as const, value: ['184467235'] }
	const dropped = { field: 'author', operator: 'isAny' as const, value: ['maria@example.com'] }

	expect(offered({ filters: [kept, dropped] }).filters).toEqual([kept])
})

test('takes any value on a field with no elements and no check', () => {
	const filters = [
		{ field: 'date', operator: 'before' as const, value: 'not a date' },
		{ field: 'genre', operator: 'is' as const, value: 42 },
	]

	expect(offered({ filters }).filters).toEqual(filters)
	expect(offeredView({ type: 'table', filters } as View, FIELDS, { opening: OPENING }).filters).toEqual(filters)
})

test('hands back an empty filter list for a view holding none, and every other part of the view as it was', () => {
	const view: View = { type: 'list', search: 'Hello', page: 3, perPage: 20, fields: ['author'], titleField: 'title' }

	expect(offeredView(view, FIELDS, GUARD)).toEqual({ ...view, sort: OPENING, filters: [] })
})

test('takes the fields and the views DataViews hands over', () => {
	const fields: Field<{ id: string }>[] = [
		{ id: 'title', enableSorting: true },
		{ id: 'status', elements: [{ value: 'draft', label: 'Draft' }], filterBy: { operators: ['is'] } },
	]
	const view: View = { type: 'grid', filters: [{ field: 'status', operator: 'is', value: 'draft' }] }

	const shown: View = offeredView(view, fields, GUARD)

	expect(shown.filters).toEqual(view.filters)
	expect(viewNarrows(shown)).toBe(true)
})
