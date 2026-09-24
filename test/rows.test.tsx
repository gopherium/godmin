// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { expect, test, vi } from 'vitest'

import { RepeatRows, RowControls } from '../src/rows.js'
import type { RowLabels } from '../src/rows.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

const labels: RowLabels = {
	add: 'Add entry',
	empty: 'No entries yet.',
	moveUp: 'Move entry up',
	moveDown: 'Move entry down',
	remove: 'Remove entry',
}

/**
 * Renders a rows editor over its own state, each row an uncontrolled note input.
 * @param props - The rows it starts with and the bounds it keeps.
 * @returns The rendered editor.
 */
function Notes(props: { initial: string[], min?: number, max?: number }) {
	const [rows, setRows] = useState(props.initial)
	return (
		<RepeatRows
			rows={rows}
			onChange={setRows}
			blank={() => ''}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			min={props.min}
			max={props.max}
			renderRow={(row, update) => (
				<input aria-label="Note" defaultValue={row} onBlur={(event) => update(event.target.value)} />
			)}
		/>
	)
}

/**
 * Renders a rows editor over rows its owner hands in, each row an uncontrolled note input.
 * @param props - The rows the owner holds.
 * @returns The rendered editor.
 */
function Owned(props: { rows: string[] }) {
	return (
		<RepeatRows
			rows={props.rows}
			onChange={vi.fn()}
			blank={() => ''}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			renderRow={(row) => <input aria-label="Note" defaultValue={row} />}
		/>
	)
}

/**
 * Renders a rows editor over its own state that keeps the first edit callback each row is handed.
 * @param props - The rows it starts with, where to keep each callback, and what to call with every change.
 * @returns The rendered editor.
 */
function Kept(props: {
	initial: string[],
	kept: Map<string, (row: string) => void>,
	changed: (rows: string[]) => void,
}) {
	const [rows, setRows] = useState(props.initial)
	return (
		<RepeatRows
			rows={rows}
			onChange={(next) => {
				props.changed(next)
				setRows(next)
			}}
			blank={() => ''}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			renderRow={(row, update) => {
				if (!props.kept.has(row)) {
					props.kept.set(row, update)
				}
				return <span>{row}</span>
			}}
		/>
	)
}

/**
 * Reports whether a design system button is disabled, which it marks with aria-disabled.
 * @param button - The button to read.
 * @returns Whether the button is disabled.
 */
function isDisabled(button: HTMLElement | undefined): boolean {
	return button?.getAttribute('aria-disabled') === 'true'
}

/**
 * Returns the note inputs in row order.
 * @returns The inputs.
 */
function notes(): HTMLInputElement[] {
	return screen.queryAllByLabelText('Note') as HTMLInputElement[]
}

test('row controls stop moving up at the first row and down at the last', () => {
	const moved = vi.fn()
	renderAdmin(
		<>
			<RowControls at={0} count={2} labels={labels} onMove={moved} onRemove={vi.fn()} />
			<RowControls at={1} count={2} labels={labels} onMove={moved} onRemove={vi.fn()} />
		</>,
	)

	const ups = screen.getAllByRole('button', { name: 'Move entry up' })
	const downs = screen.getAllByRole('button', { name: 'Move entry down' })
	fireEvent.click(ups[1] as HTMLElement)
	fireEvent.click(downs[0] as HTMLElement)

	expect(isDisabled(ups[0])).toBe(true)
	expect(isDisabled(downs[1])).toBe(true)
	expect(isDisabled(ups[1])).toBe(false)
	expect(moved.mock.calls).toEqual([[-1], [1]])
})

test('row controls hold the remove button back when the row may not go', () => {
	const removed = vi.fn()
	renderAdmin(<RowControls at={0} count={1} removable={false} labels={labels} onMove={vi.fn()} onRemove={removed} />)

	const remove = screen.getByRole('button', { name: 'Remove entry' })
	fireEvent.click(remove)

	expect(isDisabled(remove)).toBe(true)
	expect(removed).not.toHaveBeenCalled()
})

test('shows the empty message when there are no rows', () => {
	renderAdmin(<Notes initial={[]} />)

	expect(screen.getByText('No entries yet.')).toBeTruthy()
	expect(notes()).toEqual([])
})

test('names every row as a group of its own', () => {
	renderAdmin(<Notes initial={['first', 'second']} />)

	const second = screen.getByRole('group', { name: 'Entry 2' })

	expect(within(second).getByLabelText('Note')).toHaveProperty('value', 'second')
	expect(screen.queryByText('No entries yet.')).toBeNull()
})

test('adds a blank row at the end', () => {
	renderAdmin(<Notes initial={['first']} />)

	fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

	expect(notes().map((input) => input.value)).toEqual(['first', ''])
})

test('keeps typed text with its row when the row moves', () => {
	renderAdmin(<Notes initial={['first', 'second']} />)
	fireEvent.change(notes()[0] as HTMLInputElement, { target: { value: 'first, edited' } })

	fireEvent.click(screen.getAllByRole('button', { name: 'Move entry down' })[0] as HTMLElement)

	expect(notes().map((input) => input.value)).toEqual(['second', 'first, edited'])
})

test('removes only the row asked for', () => {
	renderAdmin(<Notes initial={['first', 'second', 'third']} />)

	fireEvent.click(screen.getAllByRole('button', { name: 'Remove entry' })[1] as HTMLElement)

	expect(notes().map((input) => input.value)).toEqual(['first', 'third'])
})

test('hands a row edit back as the whole list', () => {
	renderAdmin(<Notes initial={['first', 'second']} />)
	const second = notes()[1] as HTMLInputElement

	fireEvent.change(second, { target: { value: 'second, edited' } })
	fireEvent.blur(second)
	fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

	expect(notes().map((input) => input.value)).toEqual(['first', 'second, edited', ''])
})

test('shows the rows an owner hands in over the rows they replace', () => {
	const { rerender } = renderAdmin(<Owned rows={['first', 'second']} />)

	rerender(<Owned rows={['third', 'fourth']} />)

	expect(notes().map((input) => input.value)).toEqual(['third', 'fourth'])
})

test('keeps typed text with its row when the owner puts a row in front', () => {
	const { rerender } = renderAdmin(<Owned rows={['first', 'second']} />)
	fireEvent.change(notes()[0] as HTMLInputElement, { target: { value: 'first, typed' } })

	rerender(<Owned rows={['zero', 'first', 'second']} />)

	expect(notes().map((input) => input.value)).toEqual(['zero', 'first, typed', 'second'])
})

test('sends an edit held from before a move to the row that moved', () => {
	const kept = new Map<string, (row: string) => void>()
	const changed = vi.fn()
	renderAdmin(<Kept initial={['first', 'second']} kept={kept} changed={changed} />)
	const edit = kept.get('first') as (row: string) => void

	fireEvent.click(screen.getAllByRole('button', { name: 'Move entry down' })[0] as HTMLElement)
	act(() => edit('first, edited'))

	expect(changed).toHaveBeenLastCalledWith(['second', 'first, edited'])
})

test('drops an edit held from a row that was removed', () => {
	const kept = new Map<string, (row: string) => void>()
	const changed = vi.fn()
	renderAdmin(<Kept initial={['first', 'second']} kept={kept} changed={changed} />)
	const edit = kept.get('first') as (row: string) => void

	fireEvent.click(screen.getAllByRole('button', { name: 'Remove entry' })[0] as HTMLElement)
	act(() => edit('first, edited'))

	expect(changed.mock.calls).toEqual([[['second']]])
})

test('stops adding at the most rows allowed', () => {
	renderAdmin(<Notes initial={['first', 'second']} max={2} />)

	expect(isDisabled(screen.getByRole('button', { name: 'Add entry' }))).toBe(true)
})

test('stops removing at the fewest rows allowed', () => {
	renderAdmin(<Notes initial={['first']} min={1} />)

	expect(isDisabled(screen.getByRole('button', { name: 'Remove entry' }))).toBe(true)
})
