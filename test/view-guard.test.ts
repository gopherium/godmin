// SPDX-License-Identifier: Apache-2.0

import type { Field, View } from '@wordpress/dataviews'
import { expect, test } from 'vitest'

import { offeredView, viewNarrows } from '../src/index'
import type { GuardedField, OfferedView, ViewGuard } from '../src/index'

/** The fields of a list of posts, as a list hands them to the guard. */
const FIELDS: GuardedField[] = [
	{ id: 'title', enableSorting: true, filterBy: false },
	{ id: 'excerpt', enableSorting: false, filterBy: false },
	{ id: 'author', type: 'text', filterBy: { operators: ['isAny', 'isNone'] } },
	{ id: 'date', type: 'date', filterBy: { operators: ['before', 'after'] } },
	{
		id: 'status',
		enableSorting: false,
		filterBy: { operators: ['is', 'isAny'] },
		elements: [{ value: 'draft' }, { value: 'publish' }],
	},
	{ id: 'genre', type: 'text', filterBy: { operators: ['is'] } },
	{ id: 'tags', filterBy: {} },
	{ id: 'slug' },
	{ id: 'cover', type: 'media', filterBy: { operators: ['is'] } },
	{ id: 'passcode', type: 'password' },
	{ id: 'poster', type: 'media', enableSorting: true },
	{ id: 'kind', elements: [{ value: 'post' }, { value: 'page' }] },
	{ id: 'topic', type: 'text', filterBy: {} },
	{ id: 'headline', type: 'text', filterBy: { operators: ['before', 'is'] } },
	{ id: 'note', filterBy: { operators: ['is'] } },
	{ id: 'rating', Edit: () => null },
	{ id: 'mood', Edit: 'nope', filterBy: { operators: ['is'] } },
	{
		id: 'format',
		filterBy: { operators: ['isAny', 'isNone'] },
		elements: [{ value: 'standard' }, { value: 'aside' }],
	},
	{ id: 'label', type: 'text', elements: [], filterBy: { operators: ['is'] } },
	{ id: 'category', getElements: async () => [], filterBy: { operators: ['isAny'] } },
	{
		id: 'writer',
		elements: [{ value: 'me' }],
		getElements: async () => [{ value: '184467235' }],
		filterBy: { operators: ['isAny'] },
	},
]

/** The order the list opens in. */
const OPENING = { field: 'date', direction: 'desc' } as const

/** Reports whether a value names accounts, each one a whole number. */
const namesAccounts = (value: unknown) => Array.isArray(value) && value.every((id) => /^\d+$/.test(String(id)))

/** The opening order and the checks of the fields with no elements to match. */
const GUARD: ViewGuard = { opening: OPENING, checks: { author: namesAccounts, writer: namesAccounts } }

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
		{ field: 'tags', operator: 'is' as const, value: 'news' },
	]

	expect(offered({ filters }).filters).toEqual([])
})

test('drops a filter with an operator the field does not name', () => {
	expect(offered({ filters: [{ field: 'status', operator: 'isNot', value: 'draft' }] }).filters).toEqual([])
})

test('keeps a filter on a field that names no operators, by the operators DataViews gives its type', () => {
	const filters = [
		{ field: 'kind', operator: 'is' as const, value: 'page' },
		{ field: 'topic', operator: 'isAny' as const, value: ['news'] },
	]

	expect(offered({ filters }).filters).toEqual(filters)
})

test('drops an operator the type does not take, and any filter on a field with no elements and no control', () => {
	const kept = { field: 'headline', operator: 'is' as const, value: 'Hello' }
	const filters = [
		{ field: 'headline', operator: 'before' as const, value: 'Hello' },
		{ field: 'note', operator: 'is' as const, value: 'Hello' },
		{ field: 'cover', operator: 'is' as const, value: 'hello.png' },
		kept,
	]

	expect(offered({ filters }).filters).toEqual([kept])
})

test('keeps a filter on a field whose own Edit draws a control, and drops one whose Edit names no control', () => {
	const kept = { field: 'rating', operator: 'isNot' as const, value: 3 }
	const dropped = { field: 'mood', operator: 'is' as const, value: 'calm' }

	expect(offered({ filters: [kept, dropped] }).filters).toEqual([kept])
})

test('drops a filter whose value is not one of the field\'s elements', () => {
	expect(offered({ filters: [{ field: 'status', operator: 'is', value: 'trash' }] }).filters).toEqual([])
})

test('keeps a pick whose every value is one of the field\'s elements, and drops one holding any other', () => {
	const kept = { field: 'format', operator: 'isAny' as const, value: ['standard', 'aside'] }
	const dropped = { field: 'format', operator: 'isAny' as const, value: ['standard', 'gallery'] }

	expect(offered({ filters: [kept, dropped] }).filters).toEqual([kept])
})

test('drops a value of the wrong shape, a list where the field picks one or one value where it picks many', () => {
	const filters = [
		{ field: 'kind', operator: 'is' as const, value: ['page'] },
		{ field: 'status', operator: 'isAny' as const, value: ['draft'] },
		{ field: 'format', operator: 'isAny' as const, value: 'standard' },
		{ field: 'category', operator: 'isAny' as const, value: 'news' },
	]

	expect(offered({ filters }).filters).toEqual([])
})

test('keeps one value under isAny on a field that mixes single and many operators, as DataViews writes it', () => {
	const filters = [{ field: 'status', operator: 'isAny' as const, value: 'draft' }]

	expect(offered({ filters }).filters).toEqual(filters)
})

test('takes any pick of the right shape on a field that loads its elements', () => {
	const filters = [{ field: 'category', operator: 'isAny' as const, value: ['news'] }]

	expect(offered({ filters }).filters).toEqual(filters)
})

test('checks a value on a field with elements and getElements by its check, as DataViews shows the loaded ones', () => {
	const kept = { field: 'writer', operator: 'isAny' as const, value: ['184467235'] }
	const dropped = { field: 'writer', operator: 'isAny' as const, value: ['maria@example.com'] }

	expect(offered({ filters: [kept, dropped] }).filters).toEqual([kept])
})

test('reads an empty elements list as none, as DataViews does', () => {
	const filters = [{ field: 'label', operator: 'is' as const, value: 'Hello' }]

	expect(offered({ filters }).filters).toEqual(filters)
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
