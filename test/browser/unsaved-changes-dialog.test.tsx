// SPDX-License-Identifier: Apache-2.0

import {
	Link,
	Outlet,
	RouterProvider,
	createHashHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import { InputControl } from '@wordpress/ui'
import { useState } from 'react'
import { expect, onTestFinished, test } from 'vitest'
import { commands, userEvent } from 'vitest/browser'

import { UnsavedChangesDialog } from '../../src/router.js'

/** How long a double press waits between its presses, in milliseconds. */
const DOUBLE_PRESS_GAP = 80

/** The address of the record the tests open. */
const RECORD = '/contacts/42'

/** Renders a record with a phone field and its guard, and a link back to its list. */
function RecordScreen() {
	const [phone, setPhone] = useState('184467235')
	return (
		<>
			<Link to="/contacts">Contacts</Link>
			<InputControl label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
			<UnsavedChangesDialog
				when={phone !== '184467235'}
				title="Discard changes?"
				description="Your changes to Maria Perez are not saved."
				discardLabel="Discard"
				keepLabel="Keep editing"
			/>
		</>
	)
}

/** Renders every screen under a shell that keeps a link to the tasks on show. */
function Shell() {
	return (
		<>
			<Link to="/tasks">Tasks</Link>
			<Outlet />
		</>
	)
}

/**
 * Renders the record and its list on a hash history that starts at the given address, and counts the moves.
 * @param start - The address the history starts at.
 * @returns The router and the paths each move reached in order, the first load included.
 */
function renderOnHistory(start: string) {
	const before = window.location.href
	window.history.replaceState(null, '', `#${start}`)
	onTestFinished(() => window.history.replaceState(null, '', before))
	const rootRoute = createRootRoute({ component: Shell })
	const list = createRoute({
		getParentRoute: () => rootRoute,
		path: '/contacts',
		component: () => <Link to={RECORD}>Maria Perez</Link>,
	})
	const tasks = createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: () => <p>Tasks list</p> })
	const record = createRoute({ getParentRoute: () => rootRoute, path: '/contacts/$id', component: RecordScreen })
	const router = createRouter({ routeTree: rootRoute.addChildren([list, tasks, record]), history: createHashHistory() })
	const moves: string[] = []
	onTestFinished(router.subscribe('onResolved', (event) => event.pathChanged && moves.push(event.toLocation.pathname)))
	render(<RouterProvider router={router} />)
	return { router, moves }
}

/** Waits for the record and changes its phone, so it holds unsaved work. */
async function editRecord(): Promise<void> {
	await userEvent.type(await screen.findByRole('textbox', { name: 'Phone' }), '0')
}

/** Waits for the confirm to take the focus and to end its entry, and returns it. */
async function cardAtRest(): Promise<HTMLElement> {
	const card = await screen.findByRole('alertdialog')
	await expect.poll(() => document.activeElement).toBe(within(card).getByRole('button', { name: 'Keep editing' }))
	await Promise.all(card.getAnimations().map(async (motion) => motion.finished))
	return card
}

/** Waits for the confirm to leave the page. */
async function cardLeft(card: HTMLElement): Promise<void> {
	await expect.poll(() => card.isConnected).toBe(false)
}

test('asks on Back with unsaved work, puts the address back on Keep editing, and moves once on Discard', async () => {
	const { moves } = renderOnHistory('/contacts')
	await userEvent.click(await screen.findByRole('link', { name: 'Maria Perez' }))
	await editRecord()

	window.history.back()
	const kept = await cardAtRest()
	await userEvent.click(within(kept).getByRole('button', { name: 'Keep editing' }))
	await cardLeft(kept)

	await expect.poll(() => window.location.hash).toBe(`#${RECORD}`)
	expect(screen.getByRole<HTMLInputElement>('textbox', { name: 'Phone' }).value).toBe('1844672350')

	window.history.back()
	const discarded = await cardAtRest()
	await userEvent.click(within(discarded).getByRole('button', { name: 'Discard' }))
	await cardLeft(discarded)

	await screen.findByRole('link', { name: 'Maria Perez' })
	expect(window.location.hash).toBe('#/contacts')
	expect(moves).toEqual(['/contacts', RECORD, '/contacts'])
})

test('moves once on a double press on Discard with a link under it, since the page leaves after the card', async () => {
	const { moves } = renderOnHistory(RECORD)
	await editRecord()
	await userEvent.click(screen.getByRole('link', { name: 'Contacts' }))
	const card = await cardAtRest()
	const discard = within(card).getByRole('button', { name: 'Discard' }).getBoundingClientRect()
	const [x, y] = [discard.left + discard.width / 2, discard.top + discard.height / 2]
	const under = screen.getByRole('link', { name: 'Tasks', hidden: true })
	Object.assign(under.style, {
		position: 'fixed',
		left: `${x - 40}px`,
		top: `${y - 20}px`,
		width: '80px',
		height: '40px',
	})

	await commands.doubleClickAt(x, y, DOUBLE_PRESS_GAP)
	await cardLeft(card)
	await screen.findByRole('link', { name: 'Maria Perez' })
	await new Promise((done) => setTimeout(done, 4 * DOUBLE_PRESS_GAP))

	expect(moves).toEqual([RECORD, '/contacts'])
	expect(window.location.hash).toBe('#/contacts')
})

test('lets the browser ask before the tab leaves a record with unsaved work, and only then', async () => {
	renderOnHistory(RECORD)
	await screen.findByRole('textbox', { name: 'Phone' })
	const clean = new Event('beforeunload', { cancelable: true })
	window.dispatchEvent(clean)

	await editRecord()
	const edited = new Event('beforeunload', { cancelable: true })
	window.dispatchEvent(edited)

	expect([clean.defaultPrevented, edited.defaultPrevented]).toEqual([false, true])
})
