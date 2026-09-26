// SPDX-License-Identifier: Apache-2.0

import { screen, within } from '@testing-library/react'
import { Text } from '@wordpress/ui'
import { expect, test } from 'vitest'

import { LogItem, LogList, LogTime } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Returns the class tokens the design system gives a sampled element.
 * @param element - The element to sample, carrying id="sample".
 * @returns The class tokens.
 */
function sampledClasses(element: React.ReactElement): string[] {
	const { container } = renderAdmin(element)
	return [...(container.querySelector('#sample') as Element).classList]
}

test('renders each item as an item of one list, in the order given', () => {
	renderAdmin(
		<LogList>
			<LogItem>Third</LogItem>
			<LogItem>First</LogItem>
			<LogItem>Second</LogItem>
		</LogList>,
	)

	const items = within(screen.getByRole('list')).getAllByRole('listitem')
	expect(items.map((item) => item.textContent)).toEqual(['Third', 'First', 'Second'])
	expect(items.every((item) => item.classList.contains('godmin-log-list__item'))).toBe(true)
})

test('names the list by the heading it points at', () => {
	renderAdmin(
		<>
			<h3 id="notes">Notes</h3>
			<LogList aria-labelledby="notes">
				<LogItem>First</LogItem>
			</LogList>
		</>,
	)

	expect(screen.getByRole('list', { name: 'Notes' })).not.toBeNull()
})

test('keeps the list role that a list with no markers loses in some screen readers', () => {
	renderAdmin(
		<LogList>
			<LogItem>First</LogItem>
		</LogList>,
	)

	expect(screen.getByRole('list').getAttribute('role')).toBe('list')
})

test('names each item with the name the caller gives it', () => {
	renderAdmin(
		<LogList>
			<LogItem aria-label="Note from Jan 1" actions={<button type="button">Edit</button>} />
			<LogItem aria-label="Note from Jan 2" actions={<button type="button">Edit</button>} />
		</LogList>,
	)

	const second = screen.getByRole('listitem', { name: 'Note from Jan 2' })
	expect(within(second).getByRole('button', { name: 'Edit' })).not.toBeNull()
})

test('leaves a list with no items empty, so the stylesheet hides it', () => {
	const { container } = renderAdmin(<LogList>{[]}</LogList>)

	expect(container.querySelector('.godmin-log-list:empty')).not.toBeNull()
})

test('renders the label on the item header line', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem label={<span>Jan 1</span>} />
		</LogList>,
	)

	const label = container.querySelector('.godmin-log-list__header .godmin-log-list__label')
	expect(label?.textContent).toBe('Jan 1')
})

test('renders the actions after the label on the header line', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem label={<span>Jan 1</span>} actions={<button type="button">Edit</button>} />
		</LogList>,
	)

	const label = container.querySelector('.godmin-log-list__header .godmin-log-list__label')
	const actions = container.querySelector('.godmin-log-list__header .godmin-log-list__actions')
	expect(label).not.toBeNull()
	expect(actions?.contains(screen.getByRole('button', { name: 'Edit' }))).toBe(true)
	expect(label?.compareDocumentPosition(actions as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
})

test('renders a header line with a label alone and no actions region', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem label={<span>Jan 1</span>} />
		</LogList>,
	)

	expect(container.querySelector('.godmin-log-list__header')).not.toBeNull()
	expect(container.querySelector('.godmin-log-list__actions')).toBeNull()
})

test('renders a header line with actions alone and no label region', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem actions={<button type="button">Edit</button>} />
		</LogList>,
	)

	const header = container.querySelector('.godmin-log-list__header')
	expect(header?.contains(screen.getByRole('button', { name: 'Edit' }))).toBe(true)
	expect(container.querySelector('.godmin-log-list__label')).toBeNull()
})

test('renders no header line for an item with neither label nor actions, so a form can take its place', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem>
				<form aria-label="Edit note" />
			</LogItem>
		</LogList>,
	)

	expect(container.querySelector('.godmin-log-list__header')).toBeNull()
	expect(screen.getByRole('listitem').contains(screen.getByRole('form', { name: 'Edit note' }))).toBe(
		true,
	)
})

test('renders the body as a paragraph after the header line', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem label={<span>Jan 1</span>} body={'First line\nSecond line'} />
		</LogList>,
	)

	const header = container.querySelector('.godmin-log-list__header')
	const body = container.querySelector('p.godmin-log-list__body')
	expect(body?.textContent).toBe('First line\nSecond line')
	expect(header?.compareDocumentPosition(body as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
})

test('renders the body at the design system body size', () => {
	const text = sampledClasses(<Text id="sample" />)
	expect(text.length).toBeGreaterThan(0)
	const { container } = renderAdmin(
		<LogList>
			<LogItem body="Entry" />
		</LogList>,
	)

	const body = container.querySelector('.godmin-log-list__body') as Element
	for (const token of text) {
		expect([...body.classList]).toContain(token)
	}
})

test('renders no body for an item that gives none', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem label={<span>Jan 1</span>} />
		</LogList>,
	)

	expect(container.querySelector('.godmin-log-list__body')).toBeNull()
})

test('renders other content after the body', () => {
	const { container } = renderAdmin(
		<LogList>
			<LogItem body="Entry">
				<p>Minutes: 30</p>
			</LogItem>
		</LogList>,
	)

	const body = container.querySelector('.godmin-log-list__body')
	expect(body?.compareDocumentPosition(screen.getByText('Minutes: 30'))).toBe(
		Node.DOCUMENT_POSITION_FOLLOWING,
	)
})

test('marks a time with its machine readable value', () => {
	const { container } = renderAdmin(<LogTime dateTime="2026-01-01">Jan 1</LogTime>)

	const time = container.querySelector('time[datetime="2026-01-01"]')
	expect(time?.textContent).toBe('Jan 1')
	expect(time?.classList.contains('godmin-log-list__time')).toBe(true)
})

test('renders a time at the design system small body size', () => {
	const small = sampledClasses(<Text id="sample" variant="body-sm" />)
	expect(small.length).toBeGreaterThan(0)
	const { container } = renderAdmin(<LogTime dateTime="2026-01-01">Jan 1</LogTime>)

	const time = container.querySelector('time') as Element
	for (const token of small) {
		expect([...time.classList]).toContain(token)
	}
})
