// SPDX-License-Identifier: Apache-2.0

import { Button, IconButton, Stack, Text } from '@wordpress/ui'
import { memo, useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode, RefObject } from 'react'

import { useRowKeys } from './row-keys.js'
import type { RowBounds, RowKeys } from './row-keys.js'

/** The words a rows editor shows, each supplied by the application. */
export interface RowLabels {
	/** The button that appends a row. */
	add: string
	/** The message shown when the list holds no rows. */
	empty: string
	/** The button that moves a row up. */
	moveUp: string
	/** The button that moves a row down. */
	moveDown: string
	/** The button that takes a row away. */
	remove: string
}

/** What the controls of one row need. */
export interface RowControlsProps {
	/** The row's place in the list. */
	at: number
	/** How many rows the list holds. */
	count: number
	/** Whether the row may be taken away, true by default. */
	removable?: boolean
	/** The words the controls show. */
	labels: Pick<RowLabels, 'moveUp' | 'moveDown' | 'remove'>
	/** What to call with the offset a move asks for. */
	onMove: (offset: number) => void
	/** What to call when the row is taken away. */
	onRemove: () => void
}

/** What a rows editor needs. */
export interface RepeatRowsProps<T> extends RowBounds {
	/** The rows the list holds, each known by its identity. */
	rows: readonly T[]
	/** What to call with a copy of the rows a change leaves, set right away and never in a transition. */
	onChange: (rows: T[]) => void
	/** Returns the row an added row starts as. */
	blank: () => T
	/** Renders the inputs of one row, with what to call when the row changes and the row's place in the list. */
	renderRow: (row: T, update: (row: T) => void, at: number) => ReactNode
	/** Returns the name a row's group is announced by. */
	rowLabel: (at: number) => string
	/** The words the editor shows. */
	labels: RowLabels
}

/** Where focus goes after the rows shown change: a row's key, the add button, or nowhere. */
type FocusTarget = number | 'add' | undefined

/** What holds focus: nothing, the add button, or anything else. */
type Holder = 'none' | 'add' | 'other'

/** The row that last took focus and the element in it that did. */
interface Entered {
	key: number
	target: EventTarget
}

/** What changed between two commits of a rows editor, as focus sees it. */
interface FocusChange {
	/** The keys shown before the change. */
	before: readonly number[]
	/** The keys shown now. */
	keys: readonly number[]
	/** The key of the row that held focus as it went, or null. */
	lost: number | null
	/** Whether the add button was pressed and no row it made has taken focus yet. */
	adding: boolean
	/** What holds focus now. */
	holder: Holder
}

/** The refs and handlers that keep keyboard focus in a rows editor as rows come and go. */
interface RowFocus {
	/** Registers the group of the row holding a key, or lets it go. */
	register: (key: number, element: HTMLDivElement | null) => void
	/** Records that an element in the row holding a key took focus. */
	entered: (key: number, target: EventTarget) => void
	/** Records that the add button was pressed. */
	pressed: () => void
	/** The ref of the add button. */
	adder: RefObject<HTMLButtonElement | null>
}

/** What one row of a rows editor needs. */
interface RowGroupProps<T> {
	/** The key of the row. */
	rowKey: number
	/** The row. */
	row: T
	/** The row's place in the list. */
	at: number
	/** How many rows the list holds. */
	count: number
	/** Whether the row may be taken away. */
	removable: boolean
	/** The words the row's controls show. */
	labels: RowLabels
	/** Renders the inputs of the row. */
	renderRow: RepeatRowsProps<T>['renderRow']
	/** Returns the name the row's group is announced by. */
	rowLabel: (at: number) => string
	/** Replaces the row holding a key. */
	update: RowKeys<T>['update']
	/** Moves the row holding a key. */
	move: RowKeys<T>['move']
	/** Takes away the row holding a key. */
	remove: RowKeys<T>['remove']
	/** Registers the group of the row holding a key, or lets it go. */
	register: RowFocus['register']
	/** Records that an element in the row holding a key took focus. */
	entered: RowFocus['entered']
}

const upIcon = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
		<path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
	</svg>
)

const downIcon = (
	<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
		<path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
	</svg>
)

/**
 * Renders the buttons that move a row among its siblings and take it away.
 * @param props - The row's place, the list's length, the words and what to call on a change.
 * @returns The controls element.
 */
export function RowControls({ at, count, removable = true, labels, onMove, onRemove }: RowControlsProps) {
	return (
		<Stack direction="row" gap="xs" align="center">
			<IconButton
				icon={upIcon}
				label={labels.moveUp}
				size="compact"
				variant="minimal"
				tone="neutral"
				disabled={at === 0}
				onClick={() => onMove(-1)}
			/>
			<IconButton
				icon={downIcon}
				label={labels.moveDown}
				size="compact"
				variant="minimal"
				tone="neutral"
				disabled={at === count - 1}
				onClick={() => onMove(1)}
			/>
			<Button variant="outline" size="compact" disabled={!removable} onClick={onRemove}>
				{labels.remove}
			</Button>
		</Stack>
	)
}

/**
 * Returns where focus goes after the rows shown change.
 * @param change - The keys before and after, the row that held focus as it went, the add press and the holder.
 * @returns The key of the row to focus, the add button, or undefined to leave focus alone.
 */
function focusTarget({ before, keys, lost, adding, holder }: FocusChange): FocusTarget {
	if (holder === 'none' && lost !== null) {
		return keys[Math.min(before.indexOf(lost), keys.length - 1)] ?? 'add'
	}
	if (holder !== 'add' || !adding) {
		return undefined
	}
	const fresh = keys.filter((key) => !before.includes(key))
	return fresh.length > 0 ? Math.max(...fresh) : undefined
}

/**
 * Returns what holds focus now.
 * @param adder - The add button.
 * @returns Nothing, the add button, or anything else.
 */
function holderOf(adder: HTMLElement | null): Holder {
	const active = document.activeElement
	if (active === null || active === document.body) {
		return 'none'
	}
	return active === adder ? 'add' : 'other'
}

/**
 * Scrolls the focused element into view when the row holding it changed place.
 * @param before - The keys shown before the change.
 * @param keys - The keys shown now.
 * @param entered - The row that last took focus and the element in it that did.
 */
function keepInView(before: readonly number[], keys: readonly number[], entered: Entered | null): void {
	if (entered === null || entered.target !== document.activeElement) {
		return
	}
	if (before.indexOf(entered.key) !== keys.indexOf(entered.key)) {
		const focused = entered.target as HTMLElement
		focused.scrollIntoView?.({ block: 'nearest' })
	}
}

/**
 * Returns the handlers that record the row groups, the focus inside them and the add press.
 * @param groups - The group of each row shown, by key.
 * @param record - The row that last took focus and the element in it that did.
 * @param lost - The key of the row that held focus as it went.
 * @param adding - Whether the add button was pressed and no row it made has taken focus yet.
 * @returns The handlers.
 */
function focusHandlers(
	groups: RefObject<Map<number, HTMLDivElement>>,
	record: RefObject<Entered | null>,
	lost: RefObject<number | null>,
	adding: RefObject<boolean>,
): Omit<RowFocus, 'adder'> {
	return {
		register: (key, element) => {
			if (element !== null) {
				groups.current.set(key, element)
				return
			}
			if (record.current?.key === key && record.current.target === document.activeElement) {
				lost.current = key
			}
			groups.current.delete(key)
		},
		entered: (key, target) => {
			record.current = { key, target }
		},
		pressed: () => {
			adding.current = true
		},
	}
}

/**
 * Returns what moves focus to a neighbour when the focused row goes, and into the row an add made.
 * @param keys - The keys of the rows shown.
 * @returns The refs and handlers to wire into the rows and the add button.
 */
function useRowFocus(keys: readonly number[]): RowFocus {
	const groups = useRef(new Map<number, HTMLDivElement>())
	const adder = useRef<HTMLButtonElement>(null)
	const record = useRef<Entered | null>(null)
	const lost = useRef<number | null>(null)
	const adding = useRef(false)
	const placed = useRef(keys)
	const [handlers] = useState(() => focusHandlers(groups, record, lost, adding))
	useLayoutEffect(() => {
		const holder = holderOf(adder.current)
		const before = placed.current
		const target = focusTarget({ before, keys, lost: lost.current, adding: adding.current, holder })
		placed.current = keys
		lost.current = null
		adding.current = holder === 'add' && target === undefined && adding.current
		if (target === undefined) {
			keepInView(before, keys, record.current)
		} else {
			(target === 'add' ? adder.current : groups.current.get(target))?.focus()
		}
	})
	return { ...handlers, adder }
}

/**
 * Renders the group of one row, its inputs and its controls.
 * @param props - The row, its key and place, the list's length, the words and what changes the list.
 * @returns The row's group element.
 */
function RowGroup<T>({
	rowKey, row, at, count, removable, labels, renderRow, rowLabel, update, move, remove, register, entered,
}: RowGroupProps<T>) {
	const changed = useCallback((next: T) => update(rowKey, next), [update, rowKey])
	const ref = useCallback((element: HTMLDivElement | null) => register(rowKey, element), [register, rowKey])
	return (
		<div
			ref={ref}
			role="group"
			aria-label={rowLabel(at)}
			tabIndex={-1}
			className="godmin-rows__row"
			onFocus={(event) => entered(rowKey, event.target)}
		>
			<Stack direction="column" gap="xs">
				{renderRow(row, changed, at)}
				<RowControls
					at={at}
					count={count}
					removable={removable}
					labels={labels}
					onMove={(offset) => move(rowKey, offset)}
					onRemove={() => remove(rowKey)}
				/>
			</Stack>
		</div>
	)
}

/** The group of one row, rendered again only when its own props change. */
const Row = memo(RowGroup) as typeof RowGroup

/**
 * Renders one group of inputs per row with controls to add, move and remove rows.
 * @param props - The rows, what to call with a change, how to render a row, the words and the bounds.
 * @returns The rows editor element.
 */
export function RepeatRows<T>({
	rows, onChange, blank, renderRow, rowLabel, labels, min, max,
}: RepeatRowsProps<T>) {
	const { keys, canAdd, canRemove, add, update, move, remove } = useRowKeys(rows, onChange, { min, max })
	const focus = useRowFocus(keys)
	return (
		<Stack direction="column" gap="md" className="godmin-rows">
			{rows.length === 0 ? <Text>{labels.empty}</Text> : null}
			{keys.map((key, at) => (
				<Row
					key={key}
					rowKey={key}
					row={rows[at]}
					at={at}
					count={rows.length}
					removable={canRemove}
					labels={labels}
					renderRow={renderRow}
					rowLabel={rowLabel}
					update={update}
					move={move}
					remove={remove}
					register={focus.register}
					entered={focus.entered}
				/>
			))}
			<div>
				<Button
					ref={focus.adder}
					variant="outline"
					disabled={!canAdd}
					onClick={() => {
						focus.pressed()
						add(blank())
					}}
				>
					{labels.add}
				</Button>
			</div>
		</Stack>
	)
}
