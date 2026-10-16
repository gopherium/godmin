// SPDX-License-Identifier: Apache-2.0

import { readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { renderHook, waitFor } from '@testing-library/react'
import type { Field, View } from '@wordpress/dataviews'
import { expect, test } from 'vitest'

import { CONTROLS as GUARD_CONTROLS, TYPE_NAMES as GUARD_TYPES } from '../src/filter-offer'
import { offeredView } from '../src/index'
import type { GuardedField } from '../src/index'

/** One filter DataViews draws for a field, as its own hook builds it. */
interface DrawnFilter {
	/** The id of the field the filter narrows by. */
	field: string
	/** The operators the filter offers. */
	operators: string[]
	/** Whether the filter picks one value, else a list. */
	singleSelection: boolean
}

/** One field of the matrix and the words that name it in a failure. */
interface Case {
	/** The words that name the field. */
	name: string
	/** The field as a list hands it to both DataViews and the guard. */
	field: Field<unknown>
}

/** The parts of one field of the matrix and the words that name them. */
interface CaseSpec {
	/** The field type, none when undefined. */
	type: string | undefined
	/** The other parts of the field. */
	parts: Record<string, unknown>
	/** The words for those other parts. */
	name: string
}

/** What DataViews draws and what the guard keeps on one field, one word per filter. */
interface Outcome {
	/** The words that name the field. */
	name: string
	/** What DataViews draws. */
	drawn: string[]
	/** What the guard keeps. */
	kept: string[]
}

/** One filter handed to the guard, on the field of its case. */
interface Handed {
	/** The operator the filter names. */
	operator: string
	/** The value the filter holds. */
	value: unknown
}

const require = createRequire(import.meta.url)
const dataviewsBuild = join(dirname(require.resolve('@wordpress/dataviews/package.json')), 'build-module')

/**
 * Imports one module of the DataViews build.
 * @param path - The module path inside the build.
 * @returns The module.
 */
async function fromDataViews<M>(path: string): Promise<M> {
	return (await import(join(dataviewsBuild, path))) as M
}

/**
 * Returns the names of the modules in one folder of the DataViews build, its index left out.
 * @param folder - The folder inside the build.
 * @returns Each module file name.
 */
function modulesIn(folder: string): string[] {
	return readdirSync(join(dataviewsBuild, folder)).filter((name) => name.endsWith('.mjs') && name !== 'index.mjs')
}

const { default: normalizeFields } = await fromDataViews<{ default: (fields: Field<unknown>[]) => unknown[] }>(
	'field-types/index.mjs',
)
const { default: useFilters } = await fromDataViews<{ default: (fields: unknown[], view: View) => DrawnFilter[] }>(
	'components/dataviews-filters/use-filters.mjs',
)
const { getAllOperatorNames } = await fromDataViews<{ getAllOperatorNames: () => string[] }>('utils/operators.mjs')
const { default: useElements } = await fromDataViews<{
	default: (field: Partial<Field<unknown>>) => { elements: { value: unknown }[], isLoading: boolean }
}>('hooks/use-elements.mjs')

/** Every operator DataViews knows. */
const OPERATORS = getAllOperatorNames()

/** The type of each field type DataViews ships, read from its build. */
const DATAVIEWS_TYPES = (
	await Promise.all(
		modulesIn('field-types').map(
			async (name) => (await fromDataViews<{ default: { type?: string } }>(`field-types/${name}`)).default.type,
		),
	)
).filter((type) => type !== undefined)

/** Each field type DataViews ships or the guard names, no type at all and a type neither knows. */
const TYPES: (string | undefined)[] = [...new Set([...DATAVIEWS_TYPES, ...GUARD_TYPES, undefined, 'unknown-type'])]

/** The name of each control DataViews draws, from its file names. */
const DATAVIEWS_CONTROLS = modulesIn('components/dataform-controls').map((name) =>
	name.replace(/\.mjs$/, '').replace(/-(\w)/g, (_, letter: string) => letter.toUpperCase()),
)

/** Each control DataViews draws or the guard names, and a name neither knows. */
const CONTROLS: string[] = [...new Set([...DATAVIEWS_CONTROLS, ...GUARD_CONTROLS, 'unknown-control'])]

/** The ways a field says which operators it filters with, absent first. */
const FILTER_BYS: unknown[] = [
	undefined,
	{},
	false,
	{ operators: [] },
	...OPERATORS.map((operator) => ({ operators: [operator] })),
	{ operators: OPERATORS },
]

/** The ways a field holds the values a filter may pick. */
const ELEMENTS: Record<string, Partial<Field<unknown>>> = {
	none: {},
	empty: { elements: [] },
	one: { elements: [{ value: 'one', label: 'One' }] },
	loaded: { getElements: async () => [{ value: 'one', label: 'One' }] },
	both: {
		elements: [{ value: 'static', label: 'Static' }],
		getElements: async () => [{ value: 'one', label: 'One' }],
	},
}

/** The ways a field gives its own control. */
const EDITS: [string, unknown][] = [
	['a component', () => null],
	...CONTROLS.map((name): [string, unknown] => [name, name]),
	...CONTROLS.map((name): [string, unknown] => [`{ control: ${name} }`, { control: name }]),
	['an object with no control', {}],
	['null', null],
]

/**
 * Returns one field of the matrix with its words.
 * @param spec - The type, the other parts and their words.
 * @param index - The position of the field, which makes its id.
 * @returns The case.
 */
function caseOf({ type, parts, name }: CaseSpec, index: number): Case {
	const typed = type === undefined ? {} : { type }
	const field = { id: `field-${index}`, ...typed, ...parts } as Field<unknown>
	return { name: `type ${String(type)}, ${name}`, field }
}

/**
 * Returns a field of every type for every way it names its operators and each given way it holds elements.
 * @param holds - The ways the fields hold elements, by name.
 * @returns The cases.
 */
function filterByCases(holds: Record<string, Partial<Field<unknown>>>): Case[] {
	return TYPES.flatMap((type) =>
		FILTER_BYS.flatMap((filterBy) =>
			Object.entries(holds).map(
				([how, held]): CaseSpec => ({
					type,
					parts: { ...(filterBy === undefined ? {} : { filterBy }), ...held },
					name: `filterBy ${JSON.stringify(filterBy)}, elements ${how}`,
				}),
			),
		),
	).map(caseOf)
}

/**
 * Returns the filter DataViews draws for each field, by field id.
 * @param cases - The fields.
 * @returns The filter of each field DataViews draws one for.
 */
function drawnBy(cases: Case[]): Map<string, DrawnFilter> {
	const normalized = normalizeFields(cases.map((one) => one.field))
	const { result, unmount } = renderHook(() => useFilters(normalized, { type: 'table' }))
	const drawn = new Map(result.current.map((filter) => [filter.field, filter]))
	unmount()
	return drawn
}

/**
 * Returns the filters the guard keeps on one field.
 * @param field - The field.
 * @param handed - The filters handed to the guard, each on that field.
 * @returns The filters kept.
 */
function keptBy(field: Field<unknown>, handed: Handed[]): NonNullable<View['filters']> {
	const view = { type: 'table', filters: handed.map((filter) => ({ field: field.id, ...filter })) } as View
	return offeredView(view, [field as GuardedField], { opening: { field: field.id, direction: 'asc' } }).filters
}

/**
 * Returns a line for each field on which the guard keeps other filters than DataViews draws.
 * @param outcomes - What DataViews draws and what the guard keeps on each field.
 * @returns One line per field that differs, none when both agree on every field.
 */
function differing(outcomes: Outcome[]): string[] {
	return outcomes.flatMap(({ name, drawn, kept }) => {
		const [want, got] = [drawn.toSorted().join(), kept.toSorted().join()]
		return want === got ? [] : [`${name}: DataViews [${want}], the guard [${got}]`]
	})
}

/**
 * Returns each field on which the guard keeps other operators than DataViews offers.
 * @param cases - The fields.
 * @returns One line per field that differs, none when the guard reads every field as DataViews does.
 */
function operatorsThatDiffer(cases: Case[]): string[] {
	const drawn = drawnBy(cases)
	const handed = OPERATORS.map((operator) => ({ operator, value: undefined }))
	return differing(
		cases.map((one) => ({
			name: one.name,
			drawn: drawn.get(one.field.id)?.operators ?? [],
			kept: keptBy(one.field, handed).map((filter) => filter.operator),
		})),
	)
}

/**
 * Returns each field on which the guard keeps another value shape than DataViews writes.
 * @param cases - The fields, each with elements.
 * @returns One line per field that differs, none when the guard keeps the shape DataViews writes.
 */
function shapesThatDiffer(cases: Case[]): string[] {
	const drawn = drawnBy(cases)
	return differing(
		cases.map((one) => {
			const filter = drawn.get(one.field.id) ?? { field: one.field.id, operators: [], singleSelection: false }
			const shape = filter.singleSelection ? 'one' : 'list'
			const handed = filter.operators.flatMap((operator) => [
				{ operator, value: 'one' },
				{ operator, value: ['one'] },
			])
			const kept = keptBy(one.field, handed)
			return {
				name: one.name,
				drawn: filter.operators.map((operator) => `${operator} ${shape}`),
				kept: kept.map(({ operator, value }) => `${operator} ${Array.isArray(value) ? 'list' : 'one'}`),
			}
		}),
	)
}

test('reads DataViews field types, controls and operators from its build', () => {
	expect(TYPES).toContain('text')
	expect(CONTROLS).toContain('adaptiveSelect')
	expect(OPERATORS).toContain('isAny')
})

test('keeps the operators DataViews offers on each field type, however a field names them or holds elements', () => {
	expect(operatorsThatDiffer(filterByCases(ELEMENTS))).toEqual([])
})

test('keeps the operators DataViews offers on each field type, for every control a field gives', () => {
	const specs = TYPES.flatMap((type) =>
		EDITS.map(([name, Edit]): CaseSpec => ({ type, parts: { Edit }, name: `Edit ${name}` })),
	)

	expect(operatorsThatDiffer(specs.map(caseOf))).toEqual([])
})

test('shows the loaded values in place of the static ones on a field with both, as DataViews does', async () => {
	const { result, unmount } = renderHook(() => useElements(ELEMENTS.both))

	await waitFor(() => expect(result.current.elements.map((element) => element.value)).toEqual(['one']))
	unmount()
})

test('keeps one value or a list on a field with elements exactly as DataViews writes it', () => {
	const holds = { one: ELEMENTS.one, loaded: ELEMENTS.loaded, both: ELEMENTS.both }

	expect(shapesThatDiffer(filterByCases(holds))).toEqual([])
})
