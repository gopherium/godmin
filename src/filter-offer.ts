// SPDX-License-Identifier: Apache-2.0

/** How DataViews 20 filters a field of one type. */
export interface TypeOffer {
	/** The operators a field of the type filters with when it names none. */
	defaults: readonly string[]
	/** The operators a field of the type may name. */
	valid: readonly string[]
	/** Whether the type draws a control of its own. */
	control: boolean
}

/** The operators DataViews 20 picks one value with. */
export const SINGLE_OPERATORS: readonly string[] = [
	'is',
	'isNot',
	'lessThan',
	'greaterThan',
	'lessThanOrEqual',
	'greaterThanOrEqual',
	'before',
	'after',
	'beforeInc',
	'afterInc',
	'contains',
	'notContains',
	'startsWith',
	'on',
	'notOn',
]

/** Every operator DataViews 20 knows. */
const ALL_OPERATORS = ['isAny', 'isNone', 'isAll', 'isNotAll', 'between', 'inThePast', 'over', ...SINGLE_OPERATORS]

/** The operators a text field may name. */
const TEXT_VALID = ['is', 'isNot', 'contains', 'notContains', 'startsWith', 'isAny', 'isNone', 'isNotAll']

/** The operators a number field filters with when it names none. */
const NUMBER_DEFAULTS = ['is', 'isNot', 'lessThan', 'greaterThan', 'lessThanOrEqual', 'greaterThanOrEqual', 'between']

/** The operators every date and time type takes. */
const MOMENT = ['on', 'notOn', 'before', 'after', 'beforeInc', 'afterInc']

/** The operators a date and time field takes. */
const DATETIME = [...MOMENT, 'inThePast', 'over']

/** How DataViews 20 filters a text field. */
const TEXT: TypeOffer = { defaults: ['isAny', 'isNone'], valid: TEXT_VALID, control: true }

/** How DataViews 20 filters a number field. */
const NUMBER: TypeOffer = {
	defaults: NUMBER_DEFAULTS,
	valid: [...NUMBER_DEFAULTS, 'isAny', 'isNone', 'isNotAll'],
	control: true,
}

/** How DataViews 20 filters each field type it knows, by type name. */
const TYPE_OFFERS = new Map<string | undefined, TypeOffer>([
	['text', TEXT],
	['email', TEXT],
	['telephone', TEXT],
	['url', TEXT],
	['integer', NUMBER],
	['number', NUMBER],
	['datetime', { defaults: DATETIME, valid: DATETIME, control: true }],
	['date', { defaults: [...DATETIME, 'between'], valid: [...DATETIME, 'between'], control: true }],
	['time', { defaults: [...MOMENT, 'between'], valid: [...MOMENT, 'between'], control: true }],
	['boolean', { defaults: ['is', 'isNot'], valid: ['is', 'isNot'], control: true }],
	['array', { defaults: ['isAny', 'isNone'], valid: ['isAny', 'isNone', 'isAll', 'isNotAll'], control: true }],
	['color', { defaults: ['isAny', 'isNone'], valid: ['is', 'isNot', 'isAny', 'isNone'], control: true }],
	['media', { defaults: [], valid: [], control: false }],
	['password', { defaults: [], valid: [], control: true }],
])

/** How DataViews 20 filters a field of no type, or of a type it does not know. */
const UNTYPED: TypeOffer = { defaults: ['is', 'isNot'], valid: ALL_OPERATORS, control: false }

/** The field types DataViews 20 knows. */
export const TYPE_NAMES = [...TYPE_OFFERS.keys()]

/** The controls DataViews 20 draws, by the name a field's Edit gives. */
export const CONTROLS: readonly string[] = [
	'adaptiveSelect',
	'array',
	'checkbox',
	'color',
	'combobox',
	'datetime',
	'date',
	'email',
	'telephone',
	'url',
	'integer',
	'number',
	'password',
	'radio',
	'select',
	'text',
	'time',
	'toggle',
	'textarea',
	'toggleGroup',
]

/**
 * Returns how DataViews 20 filters a field of the given type.
 * @param type - The field type, none when undefined.
 * @returns The offer of the type, the untyped one for a type DataViews does not know.
 */
export function offerOf(type: string | undefined): TypeOffer {
	return TYPE_OFFERS.get(type) ?? UNTYPED
}
