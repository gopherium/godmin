// SPDX-License-Identifier: Apache-2.0

import { useNavigate, useSearch } from '@tanstack/react-router'
import { useState } from 'react'

import { DENSE_BREAKPOINT } from './breakpoints.js'
import { useMediaQuery } from './use-media-query.js'

/** The direction the rows of a list are sorted in. */
export type ListSortDirection = 'asc' | 'desc'

/** A filter narrowing the rows of a list, as a DataViews view holds it. */
export interface ListFilter {
	/** The field the filter reads. */
	field: string
	/** How the field is compared, such as isAny. */
	operator: string
	/** The value the field is compared with. */
	value?: unknown
}

/** The parts of a list view the hook reads and writes, as a DataViews view holds them. */
export interface ListViewShape {
	/** The layout the list is drawn in. */
	type: string
	/** The words the list is searched for. */
	search?: string
	/** The filters narrowing the rows. */
	filters?: ListFilter[]
	/** The field and direction the rows are sorted by. */
	sort?: { field: string; direction: ListSortDirection }
	/** The page shown, counted from one. */
	page?: number
	/** How many rows a page holds. */
	perPage?: number
	/** The fields shown beside the title. */
	fields?: string[]
}

/** The part of a list view the address carries. */
export interface ListSearch {
	/** The words the list is searched for. */
	search?: string
	/** The page shown, counted from one. */
	page?: number
	/** How many rows a page holds. */
	perPage?: number
	/** The field the rows are sorted by. */
	sort?: string
	/** The direction the rows are sorted in. */
	order?: ListSortDirection
	/** The filters narrowing the rows. */
	filters?: ListFilter[]
}

/** What one layout opens on, as DataViews takes it for each of its layouts. */
export interface LayoutDefaults {
	/** The fields the layout shows, over the list fields. */
	fields?: string[]
	/** The settings of the layout, such as the preview size of a grid. */
	layout?: Record<string, unknown>
}

/** What a list opens on when the address says nothing. */
export interface ListDefaults {
	/** The fields shown beside the title. */
	fields: string[]
	/** The fields the phone layout shows beside the title, the list fields when absent. */
	phoneFields?: string[]
	/** The field that links to the record. */
	titleField?: string
	/** The field shown under the title, none when absent. */
	descriptionField?: string
	/** The field drawn before the title, such as an avatar, none when absent. */
	mediaField?: string
	/** The order a list opens in. */
	sort: { field: string; direction: ListSortDirection }
	/** How many rows a page holds when the address names none, every row while it is unknown. */
	perPage?: number
	/** The one layout offered from 640px and the one below it, table and list when absent. */
	layouts?: { wide: string; phone: string }
	/** What each layout opens on, such as the preview size of a grid. */
	layoutSettings?: Record<string, LayoutDefaults>
}

/** The view the address holds beside the controls DataViews takes. */
export interface ListView<V extends ListViewShape> {
	/** The view the address holds, laid out for the viewport. */
	view: V
	/** Writes a changed view into the address, holding the parts it leaves out in memory. */
	onChangeView: (view: V) => void
	/** The one layout the viewport takes, with what it opens on. */
	defaultLayouts: Record<string, LayoutDefaults>
	/** The rows ticked in the wide layout, always none in the phone layout. */
	selection: string[]
	/** Holds the rows ticked in the wide layout, and drops the tap the phone layout reports. */
	onChangeSelection: (selection: string[]) => void
	/** Whether the viewport takes the phone layout. */
	phone: boolean
}

/** The part of a list view a reader changes that the address leaves out, such as the columns. */
type ListShape = Record<string, unknown>

/** The side of the phone breakpoint a viewport sits on. */
type ListSide = 'wide' | 'phone'

/** The selection a list holds beside the control that changes it. */
type ListSelection = Pick<ListView<ListViewShape>, 'selection' | 'onChangeSelection'>

/** The layouts a list takes when it names none. */
const TABLE_AND_LIST = { wide: 'table', phone: 'list' }

/** The selection a list opens on and the one a phone layout always holds. */
const NO_SELECTION: string[] = []

/** The selection of a phone layout, always none and never changed. */
const INERT: ListSelection = { selection: NO_SELECTION, onChangeSelection: () => {} }

/** The viewports that take the phone layout. */
const PHONE_QUERY = `(max-width: ${DENSE_BREAKPOINT - 1}px)`

/** The parts of a view the address or the viewport decides. */
const ADDRESSED = new Set(['type', 'search', 'filters', 'sort', 'page', 'perPage'])

/** The address keys a list view owns. */
const LIST_KEYS = new Set(['search', 'page', 'perPage', 'sort', 'order', 'filters'])

/** The shape each side holds before a reader changes one. */
const NO_SHAPES: Record<ListSide, ListShape> = { wide: {}, phone: {} }

/**
 * Returns the part of a view the address leaves out.
 * @param view - The view the list shows.
 * @returns The columns, layout settings and every other part the reader changed.
 */
function shapeOf(view: ListViewShape): ListShape {
	return Object.fromEntries(Object.entries(view).filter(([key]) => !ADDRESSED.has(key)))
}

/**
 * Returns the value when it is a whole number above zero.
 * @param value - The raw address value.
 * @returns The number, or undefined.
 */
function positive(value: unknown): number | undefined {
	return Number.isInteger(value) && (value as number) > 0 ? (value as number) : undefined
}

/**
 * Returns the value when it is a string holding something.
 * @param value - The raw address value.
 * @returns The string, or undefined.
 */
function filled(value: unknown): string | undefined {
	return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Returns the value when it names a sort direction.
 * @param value - The raw address value.
 * @returns The direction, or undefined.
 */
function direction(value: unknown): ListSortDirection | undefined {
	return value === 'asc' || value === 'desc' ? value : undefined
}

/**
 * Reports whether one raw entry is a filter a list can apply.
 * @param entry - One raw entry of the address filters.
 * @returns Whether it names a field and an operator.
 */
function isFilter(entry: unknown): entry is ListFilter {
	const held = entry as Partial<ListFilter> | null
	return typeof held?.field === 'string' && typeof held.operator === 'string'
}

/**
 * Returns the filters an address value holds, keeping only the ones a list can apply.
 * @param value - The raw address value.
 * @returns The filters, or undefined when none remain.
 */
function filtersOf(value: unknown): ListFilter[] | undefined {
	if (!Array.isArray(value)) {
		return undefined
	}
	const kept = value.filter(isFilter).map(({ field, operator, value: chosen }) => ({ field, operator, value: chosen }))
	return kept.length > 0 ? kept : undefined
}

/**
 * Returns the search without its undefined entries.
 * @param search - The search with possibly undefined entries.
 * @returns The search holding only what was set.
 */
function withoutGaps(search: ListSearch): ListSearch {
	return Object.fromEntries(Object.entries(search).filter(([, value]) => value !== undefined)) as ListSearch
}

/**
 * Keeps the parts of a list view an address may carry, dropping anything malformed.
 * @param raw - The search the router parsed from the address.
 * @returns The list search.
 */
export function listSearch(raw: Record<string, unknown>): ListSearch {
	return withoutGaps({
		search: filled(raw.search),
		page: positive(raw.page),
		perPage: positive(raw.perPage),
		sort: filled(raw.sort),
		order: direction(raw.order),
		filters: filtersOf(raw.filters),
	})
}

/**
 * Returns what a layout opens on.
 * @param defaults - What the list opens on.
 * @param layout - The layout the viewport takes.
 * @returns The fields and settings the list names for the layout, or nothing.
 */
function settingsOf(defaults: ListDefaults, layout: string): LayoutDefaults {
	return defaults.layoutSettings?.[layout] ?? {}
}

/**
 * Returns the fields a list opens on beside the title on one side of the phone breakpoint.
 * @param defaults - What the list opens on.
 * @param side - The side the viewport sits on.
 * @returns The fields shown beside the title.
 */
function fieldsFor(defaults: ListDefaults, side: ListSide): string[] {
	return side === 'phone' ? (defaults.phoneFields ?? defaults.fields) : defaults.fields
}

/**
 * Builds the view a list shows from its address, the reader's other changes and its defaults.
 * @param search - The list search the address carries.
 * @param defaults - What the list opens on.
 * @param shape - The part of the view the reader changed that the address leaves out.
 * @param side - The side of the phone breakpoint the viewport sits on.
 * @param layout - The layout the viewport takes.
 * @returns The view.
 */
function viewOf(
	search: ListSearch,
	defaults: ListDefaults,
	shape: ListShape,
	side: ListSide,
	layout: string,
): ListViewShape {
	return {
		fields: fieldsFor(defaults, side),
		titleField: defaults.titleField,
		descriptionField: defaults.descriptionField,
		mediaField: defaults.mediaField,
		...settingsOf(defaults, layout),
		...shape,
		type: layout,
		search: search.search ?? '',
		filters: search.filters ?? [],
		sort: { field: search.sort ?? defaults.sort.field, direction: search.order ?? defaults.sort.direction },
		page: search.page ?? 1,
		perPage: search.perPage ?? defaults.perPage,
	} as ListViewShape
}

/**
 * Returns the value unless it matches what the list opens on.
 * @param value - The value the view holds.
 * @param opening - The value the list opens on.
 * @returns The value, or undefined when it is the opening one.
 */
function unlessOpening<T>(value: T, opening: T): T | undefined {
	return value === opening ? undefined : value
}

/**
 * Builds the address search a view is written to, leaving out what matches the defaults.
 * @param view - The view the list shows.
 * @param defaults - What the list opens on.
 * @returns The list search.
 */
function searchOf(view: ListViewShape, defaults: ListDefaults): ListSearch {
	const sort = view.sort ?? defaults.sort
	return withoutGaps({
		search: filled(view.search),
		page: unlessOpening(view.page, 1),
		perPage: unlessOpening(view.perPage, defaults.perPage),
		sort: unlessOpening(sort.field, defaults.sort.field),
		order: unlessOpening(sort.direction, defaults.sort.direction),
		filters: filtersOf(view.filters),
	})
}

/**
 * Returns the address search without the keys a list view owns.
 * @param held - The search the address holds.
 * @returns The choices of the screen around the list.
 */
function besideList(held: Record<string, unknown>): Record<string, unknown> {
	return Object.fromEntries(Object.entries(held).filter(([key]) => !LIST_KEYS.has(key)))
}

/**
 * Holds the rows ticked in the wide layout, none in the phone layout, and drops them when the viewport flips.
 * @param phone - Whether the viewport takes the phone layout.
 * @returns The selection beside the control that changes it.
 */
function useSelection(phone: boolean): ListSelection {
	const [ticked, setTicked] = useState(NO_SELECTION)
	const [tickedOnPhone, setTickedOnPhone] = useState(phone)
	if (tickedOnPhone !== phone) {
		setTickedOnPhone(phone)
		setTicked(NO_SELECTION)
	}
	return phone ? INERT : { selection: ticked, onChangeSelection: setTicked }
}

/**
 * Holds a list view in the address, one layout per side of the phone breakpoint, and its columns in memory.
 * @param defaults - What the list opens on.
 * @returns The view beside the controls DataViews takes.
 */
export function useListView<V extends ListViewShape>(defaults: ListDefaults): ListView<V> {
	const raw = useSearch({ strict: false }) as Record<string, unknown>
	const navigate = useNavigate()
	const phone = useMediaQuery(PHONE_QUERY)
	const side: ListSide = phone ? 'phone' : 'wide'
	const layout = (defaults.layouts ?? TABLE_AND_LIST)[side]
	const [shapes, setShapes] = useState(NO_SHAPES)
	const selection = useSelection(phone)
	return {
		view: viewOf(listSearch(raw), defaults, shapes[side], side, layout) as V,
		onChangeView: (view) => {
			setShapes((held) => ({ ...held, [side]: shapeOf(view) }))
			void navigate({
				to: '.',
				search: (held: Record<string, unknown>) => ({ ...besideList(held), ...searchOf(view, defaults) }),
				replace: true,
			})
		},
		defaultLayouts: { [layout]: settingsOf(defaults, layout) },
		phone,
		...selection,
	}
}

/**
 * Returns the selection handler a list hands DataViews, opening the record a tap lands on in the phone layout.
 * @param list - The list view the screen holds.
 * @param open - Opens the record with the given id.
 * @returns The handler.
 */
export function openOnTap<V extends ListViewShape>(
	list: ListView<V>,
	open: (id: string) => void,
): (selection: string[]) => void {
	if (!list.phone) {
		return list.onChangeSelection
	}
	return ([id]) => open(id)
}
