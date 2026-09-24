// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, screen, within } from '@testing-library/react'
import { startTransition, useLayoutEffect, useState } from 'react'
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
 * @param props - The rows it starts with, the bounds it keeps, and what to call with every change.
 * @returns The rendered editor.
 */
function Notes(props: { initial: string[], min?: number, max?: number, changed?: (rows: string[]) => void }) {
	const [rows, setRows] = useState(props.initial)
	return (
		<RepeatRows
			rows={rows}
			onChange={(next) => {
				props.changed?.(next)
				setRows(next)
			}}
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

/** A row whose date may still be empty. */
interface Dated {
	date: string | null
}

/**
 * Renders a row's date and fills in a default once the row mounts without one.
 * @param props - The row and what to call when it changes.
 * @returns The rendered date.
 */
function DateCell({ row, update }: { row: Dated, update: (row: Dated) => void }) {
	useLayoutEffect(() => {
		if (row.date === null) {
			update({ date: 'default' })
		}
	})
	return <input aria-label="Date" readOnly value={row.date ?? 'none'} />
}

/**
 * Renders a rows editor of dates whose owner can append a row of its own.
 * @returns The rendered editor and the owner's append button.
 */
function Dates() {
	const [rows, setRows] = useState<Dated[]>([{ date: '2026-01-01' }])
	return (
		<>
			<button type="button" onClick={() => setRows((before) => [...before, { date: null }])}>Append</button>
			<RepeatRows
				rows={rows}
				onChange={setRows}
				blank={() => ({ date: null })}
				rowLabel={(at) => `Entry ${at + 1}`}
				labels={labels}
				renderRow={(row, update) => <DateCell row={row} update={update} />}
			/>
		</>
	)
}

/**
 * Renders a rows editor of dates over rows its owner hands in and never changes.
 * @param props - The rows the owner holds.
 * @returns The rendered editor.
 */
function FixedDates(props: { rows: Dated[] }) {
	return (
		<RepeatRows
			rows={props.rows}
			onChange={vi.fn()}
			blank={() => ({ date: null })}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			renderRow={(row, update) => <DateCell row={row} update={update} />}
		/>
	)
}

/**
 * Renders a rows editor of dates whose owner takes every change inside a transition.
 * @returns The rendered editor.
 */
function TransitionDates() {
	const [rows, setRows] = useState<Dated[]>([{ date: '2026-01-01' }])
	return (
		<RepeatRows
			rows={rows}
			onChange={(next) => startTransition(() => setRows(next))}
			blank={() => ({ date: null })}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			renderRow={(row, update) => <DateCell row={row} update={update} />}
		/>
	)
}

/**
 * Renders a row's note with a clear button while the note has text.
 * @param props - The row and what to call when it changes.
 * @returns The rendered note and button.
 */
function ClearableCell({ row, update }: { row: string, update: (row: string) => void }) {
	return (
		<>
			<span>{row}</span>
			{row === '' ? null : <button type="button" onClick={() => update('')}>Clear</button>}
		</>
	)
}

/**
 * Renders a rows editor whose owner can drop the rows left empty.
 * @returns The rendered editor and the owner's prune button.
 */
function Pruned() {
	const [rows, setRows] = useState(['first', 'second', 'third'])
	return (
		<>
			<button type="button" onClick={() => setRows((before) => before.filter((row) => row !== ''))}>Prune</button>
			<RepeatRows
				rows={rows}
				onChange={setRows}
				blank={() => ''}
				rowLabel={(at) => `Entry ${at + 1}`}
				labels={labels}
				renderRow={(row, update) => <ClearableCell row={row} update={update} />}
			/>
		</>
	)
}

/**
 * Renders a rows editor whose owner shows an undo button that takes focus once a row goes.
 * @returns The rendered editor and, after a removal, the undo button.
 */
function Undoable() {
	const [rows, setRows] = useState(['first', 'second'])
	const [removed, setRemoved] = useState(false)
	return (
		<>
			{removed ? <button type="button" autoFocus>Undo</button> : null}
			<RepeatRows
				rows={rows}
				onChange={(next) => {
					setRemoved(next.length < rows.length)
					setRows(next)
				}}
				blank={() => ''}
				rowLabel={(at) => `Entry ${at + 1}`}
				labels={labels}
				renderRow={(row) => <span>{row}</span>}
			/>
		</>
	)
}

/**
 * Renders a rows editor over its own state, each row showing its text and the place it is handed.
 * @param props - The rows it starts with.
 * @returns The rendered editor.
 */
function Places(props: { initial: string[] }) {
	const [rows, setRows] = useState(props.initial)
	return (
		<RepeatRows
			rows={rows}
			onChange={setRows}
			blank={() => ''}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			renderRow={(row, _update, at) => <span>{`${row} at ${at}`}</span>}
		/>
	)
}

/**
 * Returns the date inputs' values in row order.
 * @returns The values.
 */
function dates(): string[] {
	return screen.queryAllByLabelText('Date').map((input) => (input as HTMLInputElement).value)
}

/**
 * Runs a check with element scrolling recorded, which jsdom leaves out.
 * @param check - What to run with the recorded calls.
 */
function withScrolling(check: (scrolled: ReturnType<typeof vi.fn>) => void) {
	const scrolled = vi.fn()
	HTMLElement.prototype.scrollIntoView = scrolled
	try {
		check(scrolled)
	} finally {
		delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView
	}
}

/**
 * Renders a rows editor whose owner sorts the list it is handed in place.
 * @returns The rendered editor.
 */
function Sorted() {
	const [rows, setRows] = useState(['a', 'c'])
	return (
		<RepeatRows
			rows={rows}
			onChange={(next) => setRows(next.sort())}
			blank={() => 'b'}
			rowLabel={(at) => `Entry ${at + 1}`}
			labels={labels}
			renderRow={(row) => <input aria-label="Note" defaultValue={row} />}
		/>
	)
}

/**
 * Focuses a button and clicks it, the way a keyboard press does.
 * @param button - The button to press.
 */
function press(button: HTMLElement) {
	act(() => button.focus())
	fireEvent.click(button)
}

/**
 * Returns the button with a name inside the row group with a name.
 * @param group - The name of the row group.
 * @param name - The name of the button.
 * @returns The button.
 */
function buttonIn(group: string, name: string): HTMLElement {
	return within(screen.getByRole('group', { name: group })).getByRole('button', { name })
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

test('row controls let the row go when removable is left out', () => {
	const removed = vi.fn()
	renderAdmin(<RowControls at={0} count={1} labels={labels} onMove={vi.fn()} onRemove={removed} />)

	const remove = screen.getByRole('button', { name: 'Remove entry' })
	fireEvent.click(remove)

	expect(isDisabled(remove)).toBe(false)
	expect(removed).toHaveBeenCalledTimes(1)
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
	const changed = vi.fn()
	renderAdmin(<Notes initial={['first', 'second']} changed={changed} />)
	const second = notes()[1] as HTMLInputElement

	fireEvent.change(second, { target: { value: 'second, edited' } })
	fireEvent.blur(second)
	fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

	expect(changed.mock.calls).toEqual([[['first', 'second, edited']], [['first', 'second, edited', '']]])
	expect(notes().map((input) => input.value)).toEqual(['first', 'second, edited', ''])
})

test('lets a row fill a default as it mounts after the owner appends it', () => {
	renderAdmin(<Dates />)

	fireEvent.click(screen.getByRole('button', { name: 'Append' }))

	expect(screen.getAllByLabelText('Date').map((input) => (input as HTMLInputElement).value))
		.toEqual(['2026-01-01', 'default'])
})

test('lets a row fill a default as it mounts under an owner that refuses the change', () => {
	renderAdmin(<FixedDates rows={[{ date: '2026-01-01' }, { date: null }]} />)

	expect(dates()).toEqual(['2026-01-01', 'none'])
})

test('lets a row fill a default as it mounts under an owner that takes changes in a transition', () => {
	renderAdmin(<TransitionDates />)

	fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

	expect(dates()).toEqual(['2026-01-01', 'default'])
})

test('hands each row the place it holds after a row before it goes', () => {
	renderAdmin(<Places initial={['first', 'second', 'third']} />)

	fireEvent.click(buttonIn('Entry 1', 'Remove entry'))

	expect(screen.getByText('second at 0')).toBeTruthy()
	expect(screen.getByText('third at 1')).toBeTruthy()
})

test('keeps typed text in its row when the owner refuses a move of two equal rows', () => {
	renderAdmin(<Owned rows={['', '']} />)
	fireEvent.change(notes()[0] as HTMLInputElement, { target: { value: 'typed' } })

	press(buttonIn('Entry 1', 'Move entry down'))

	expect(notes().map((input) => input.value)).toEqual(['typed', ''])
})

test('shows the order an owner sorts the handed list into', () => {
	renderAdmin(<Sorted />)

	fireEvent.click(screen.getByRole('button', { name: 'Add entry' }))

	expect(notes().map((input) => input.value)).toEqual(['a', 'b', 'c'])
})

test('moves focus to the row that takes the place of a removed row', () => {
	renderAdmin(<Notes initial={['first', 'second', 'third']} />)

	press(buttonIn('Entry 2', 'Remove entry'))

	expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Entry 2' }))
	expect(within(document.activeElement as HTMLElement).getByLabelText('Note')).toHaveProperty('value', 'third')
})

test('moves focus to the row before a removed last row', () => {
	renderAdmin(<Notes initial={['first', 'second']} />)

	press(buttonIn('Entry 2', 'Remove entry'))

	expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Entry 1' }))
})

test('moves focus to the add button when the only row goes', () => {
	renderAdmin(<Notes initial={['first']} />)

	press(buttonIn('Entry 1', 'Remove entry'))

	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Add entry' }))
})

test('moves focus to the row that takes the place of a removed row an add appended', () => {
	renderAdmin(<Notes initial={['first']} />)
	const add = screen.getByRole('button', { name: 'Add entry' })
	press(add)
	press(add)

	press(buttonIn('Entry 2', 'Remove entry'))

	expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Entry 2' }))
})

test('moves focus to the row that takes the place of a removed row that moved', () => {
	renderAdmin(<Notes initial={['first', 'second', 'third']} />)
	press(buttonIn('Entry 3', 'Move entry up'))
	press(buttonIn('Entry 2', 'Move entry up'))

	press(buttonIn('Entry 1', 'Remove entry'))

	expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Entry 1' }))
	expect(within(document.activeElement as HTMLElement).getByLabelText('Note')).toHaveProperty('value', 'first')
})

test('leaves focus alone on later renders after the only row goes', () => {
	const { rerender } = renderAdmin(<Notes initial={['first']} />)
	press(buttonIn('Entry 1', 'Remove entry'))
	const add = screen.getByRole('button', { name: 'Add entry' })

	act(() => add.blur())
	rerender(<Notes initial={['first']} />)

	expect(document.activeElement).toBe(document.body)
})

test('leaves focus alone when the owner drops a row that focus already left', () => {
	const { rerender } = renderAdmin(<Owned rows={['first', 'second', 'third']} />)
	const second = notes()[1] as HTMLInputElement
	act(() => second.focus())
	act(() => second.blur())

	rerender(<Owned rows={['first', 'third']} />)

	expect(document.activeElement).toBe(document.body)
})

test('leaves focus alone when the owner drops a row whose focused control went first', () => {
	renderAdmin(<Pruned />)
	press(buttonIn('Entry 2', 'Clear'))

	fireEvent.click(screen.getByRole('button', { name: 'Prune' }))

	expect(screen.queryByRole('group', { name: 'Entry 3' })).toBeNull()
	expect(document.activeElement).toBe(document.body)
})

test('leaves focus on what the owner focuses as a row goes', () => {
	renderAdmin(<Undoable />)

	press(buttonIn('Entry 1', 'Remove entry'))

	expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Undo' }))
})

test('leaves focus on the add button when the owner ignores the add', () => {
	renderAdmin(<Owned rows={['first']} />)
	const add = screen.getByRole('button', { name: 'Add entry' })

	press(add)

	expect(document.activeElement).toBe(add)
})

test('leaves focus on the add button when the owner ignores the add and later adds a row itself', () => {
	const { rerender } = renderAdmin(<Owned rows={['first']} />)
	const add = screen.getByRole('button', { name: 'Add entry' })
	press(add)

	rerender(<Owned rows={['first', 'second']} />)

	expect(document.activeElement).toBe(add)
})

test('leaves focus on the add button while rows arrive without a press', () => {
	const { rerender } = renderAdmin(<Owned rows={[]} />)
	const add = screen.getByRole('button', { name: 'Add entry' })
	act(() => add.focus())

	rerender(<Owned rows={['first', 'second']} />)

	expect(document.activeElement).toBe(add)
})

test('moves focus into the row an add made wherever the owner sorts it', () => {
	renderAdmin(<Sorted />)

	press(screen.getByRole('button', { name: 'Add entry' }))

	expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Entry 2' }))
	expect(within(document.activeElement as HTMLElement).getByLabelText('Note')).toHaveProperty('value', 'b')
})

test('keeps the focused button in view after a keyboard move', () => {
	withScrolling((scrolled) => {
		renderAdmin(<Notes initial={['first', 'second', 'third']} />)
		const down = buttonIn('Entry 1', 'Move entry down')

		press(down)

		expect(document.activeElement).toBe(down)
		expect(scrolled.mock.contexts).toEqual([down])
		expect(scrolled).toHaveBeenCalledWith({ block: 'nearest' })
	})
})

test('leaves the scroll alone when the rows change around a row that holds focus', () => {
	withScrolling((scrolled) => {
		const { rerender } = renderAdmin(<Owned rows={['first']} />)
		act(() => (notes()[0] as HTMLInputElement).focus())

		rerender(<Owned rows={['first', 'second']} />)

		expect(scrolled).not.toHaveBeenCalled()
	})
})

test('leaves focus on the remove button when the owner keeps the row', () => {
	renderAdmin(<Owned rows={['first', 'second']} />)
	const remove = buttonIn('Entry 1', 'Remove entry')

	press(remove)

	expect(document.activeElement).toBe(remove)
})

test('moves focus into the row an add appends', () => {
	renderAdmin(<Notes initial={['first']} />)

	press(screen.getByRole('button', { name: 'Add entry' }))

	expect(document.activeElement).toBe(screen.getByRole('group', { name: 'Entry 2' }))
})

test('leaves focus alone when the owner appends a row', () => {
	renderAdmin(<Dates />)
	const append = screen.getByRole('button', { name: 'Append' })

	press(append)

	expect(document.activeElement).toBe(append)
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

test('stops adding at the most rows allowed when two clicks come before the list does', () => {
	renderAdmin(<Notes initial={['first']} max={2} />)
	const add = screen.getByRole('button', { name: 'Add entry' })

	act(() => {
		add.click()
		add.click()
	})

	expect(notes().map((input) => input.value)).toEqual(['first', ''])
})

test('stops removing at the fewest rows allowed when two clicks come before the list does', () => {
	renderAdmin(<Notes initial={['first', 'second']} min={1} />)
	const removes = screen.getAllByRole('button', { name: 'Remove entry' })

	act(() => {
		removes[0]?.click()
		removes[1]?.click()
	})

	expect(notes().map((input) => input.value)).toEqual(['second'])
})

test('stops removing at the fewest rows allowed', () => {
	renderAdmin(<Notes initial={['first']} min={1} />)

	expect(isDisabled(screen.getByRole('button', { name: 'Remove entry' }))).toBe(true)
})

test('holds the add button back when the most rows allowed is not a number', () => {
	renderAdmin(<Notes initial={['first']} max={Number.NaN} />)

	expect(isDisabled(screen.getByRole('button', { name: 'Add entry' }))).toBe(true)
})

test('shows the rows the owner holds even below the fewest rows allowed', () => {
	const changed = vi.fn()
	renderAdmin(<Notes initial={[]} min={1} changed={changed} />)

	expect(notes()).toEqual([])
	expect(changed).not.toHaveBeenCalled()
})
