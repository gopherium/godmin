// SPDX-License-Identifier: Apache-2.0

import { Button, IconButton, Stack, Text } from '@wordpress/ui'
import type { ReactNode } from 'react'

import { useRowKeys } from './row-keys.js'

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
export interface RepeatRowsProps<T> {
	/** The rows the list holds, each known by its identity. */
	rows: readonly T[]
	/** What to call with the rows a change leaves. */
	onChange: (rows: T[]) => void
	/** Returns the row an added row starts as. */
	blank: () => T
	/** Renders the inputs of one row, with what to call when the row changes. */
	renderRow: (row: T, update: (row: T) => void, at: number) => ReactNode
	/** Returns the name a row's group is announced by. */
	rowLabel: (at: number) => string
	/** The words the editor shows. */
	labels: RowLabels
	/** The fewest rows the list keeps. */
	min?: number
	/** The most rows the list takes. */
	max?: number
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
 * Renders one group of inputs per row with controls to add, move and remove rows.
 * @param props - The rows, what to call with a change, how to render a row, the words and the bounds.
 * @returns The rows editor element.
 */
export function RepeatRows<T>({
	rows, onChange, blank, renderRow, rowLabel, labels, min = 0, max,
}: RepeatRowsProps<T>) {
	const { keys, add, update, move, remove } = useRowKeys(rows, onChange)
	return (
		<Stack direction="column" gap="md" className="godmin-rows">
			{rows.length === 0 ? <Text>{labels.empty}</Text> : null}
			{keys.map((key, at) => (
				<div key={key} role="group" aria-label={rowLabel(at)} className="godmin-rows__row">
					<Stack direction="column" gap="xs">
						{renderRow(rows[at], (changed) => update(key, changed), at)}
						<RowControls
							at={at}
							count={rows.length}
							removable={rows.length > min}
							labels={labels}
							onMove={(offset) => move(key, offset)}
							onRemove={() => remove(key)}
						/>
					</Stack>
				</div>
			))}
			<div>
				<Button variant="outline" disabled={max !== undefined && rows.length >= max} onClick={() => add(blank())}>
					{labels.add}
				</Button>
			</div>
		</Stack>
	)
}
