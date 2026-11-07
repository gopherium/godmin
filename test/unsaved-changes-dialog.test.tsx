// SPDX-License-Identifier: Apache-2.0

import {
	Link,
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	useNavigate,
} from '@tanstack/react-router'
import { act, screen, waitFor, within } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { InputControl } from '@wordpress/ui'
import { useState } from 'react'
import { expect, onTestFinished, test } from 'vitest'

import { UnsavedChangesDialog } from '../src/router'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** The phone the record holds before any edit. */
const STORED = '184467235'

/** The address of the record the tests open. */
const RECORD = '/contacts/42'

/** Renders a record with a phone field and its guard, its handlers that save and leave, and links to leave it by. */
function RecordScreen() {
	const navigate = useNavigate()
	const [stored, setStored] = useState(STORED)
	const [phone, setPhone] = useState(STORED)
	const save = () => setStored(phone)
	return (
		<>
			<Link to="/contacts">Contacts</Link>
			<Link to="/tasks">Tasks</Link>
			<Link to={RECORD} search={{ sort: 'name' }}>
				Sort
			</Link>
			<InputControl label="Phone" value={phone} onChange={(event) => setPhone(event.target.value)} />
			<button type="button" onClick={save}>
				Save
			</button>
			<button
				type="button"
				onClick={() => {
					save()
					void navigate({ to: '/contacts', ignoreBlocker: true })
				}}
			>
				Save and close
			</button>
			<button
				type="button"
				onClick={() => {
					save()
					void navigate({ to: '/contacts' })
				}}
			>
				Save and leave
			</button>
			<UnsavedChangesDialog
				when={phone !== stored}
				title="Discard changes?"
				description="Your changes to Maria Perez are not saved."
				discardLabel="Discard"
				keepLabel="Keep editing"
			/>
		</>
	)
}

/**
 * Renders the record on a memory history, beside a list and a task screen.
 * @param listLoads - What the list waits for before it shows, settled at once when left out.
 * @returns The router, to read where it stands.
 */
function renderRecord(listLoads: () => Promise<void> = async () => undefined) {
	const rootRoute = createRootRoute({ component: Outlet })
	const list = createRoute({
		getParentRoute: () => rootRoute,
		path: '/contacts',
		loader: listLoads,
		component: () => <p>Contacts list</p>,
	})
	const tasks = createRoute({ getParentRoute: () => rootRoute, path: '/tasks', component: () => <p>Tasks list</p> })
	const record = createRoute({ getParentRoute: () => rootRoute, path: '/contacts/$id', component: RecordScreen })
	const router = createRouter({
		routeTree: rootRoute.addChildren([list, tasks, record]),
		history: createMemoryHistory({ initialEntries: [RECORD] }),
	})
	renderAdmin(<RouterProvider router={router} />)
	return router
}

/** Returns the confirm on show, or null. */
function card(): HTMLElement | null {
	return screen.queryByRole('alertdialog')
}

/** Returns the button of the confirm that reads as given. */
function cardButton(name: string): HTMLElement {
	return within(screen.getByRole('alertdialog')).getByRole('button', { name })
}

/** Opens the record and changes its phone, so it holds unsaved work. */
async function editRecord(listLoads?: () => Promise<void>) {
	const router = renderRecord(listLoads)
	const user = userEvent.setup()
	const field = await screen.findByRole('textbox', { name: 'Phone' })
	await user.type(field, '0')
	return { router, user, field }
}

/**
 * Holds every motion an element runs from now on, as a browser holds a card through its exit.
 * @returns What ends the held motion.
 */
function holdMotion(): () => void {
	let release = () => {}
	const finished = new Promise<void>((done) => (release = done))
	const motion = { finished, effect: { getTiming: () => ({ duration: 200, iterations: 1 }) } }
	Object.defineProperty(Element.prototype, 'getAnimations', { configurable: true, value: () => [motion] })
	onTestFinished(() => {
		Reflect.deleteProperty(Element.prototype, 'getAnimations')
	})
	return release
}

/** Presses a link of the record and waits for the confirm it asks. */
async function askBy(user: ReturnType<typeof userEvent.setup>, name: string): Promise<HTMLElement> {
	await user.click(screen.getByRole('link', { name }))
	return screen.findByRole('alertdialog')
}

test('asks nothing before a link leaves a record with no unsaved work', async () => {
	const router = renderRecord()
	const user = userEvent.setup()

	await user.click(await screen.findByRole('link', { name: 'Contacts' }))

	await screen.findByText('Contacts list')
	expect(router.state.location.pathname).toBe('/contacts')
	expect(card()).toBeNull()
})

test('asks in red with the words given before a link leaves a record with unsaved work', async () => {
	const { router, user } = await editRecord()

	const asking = await askBy(user, 'Contacts')

	expect(
		screen.getByRole('alertdialog', {
			name: 'Discard changes?',
			description: 'Your changes to Maria Perez are not saved.',
		}),
	).toBe(asking)
	expect(cardButton('Discard').className).toMatch(/irreversible/)
	expect(within(asking).getAllByRole('button').map(({ textContent }) => textContent)).toEqual([
		'Keep editing',
		'Discard',
	])
	expect(router.state.location.pathname).toBe(RECORD)
})

test.each(['the Keep editing button', 'Escape'])('stays on the record with its edits on %s', async (way) => {
	const { router, user, field } = await editRecord()
	await askBy(user, 'Contacts')
	await waitFor(() => expect(document.activeElement).toBe(cardButton('Keep editing')))

	await (way === 'Escape' ? user.keyboard('{Escape}') : user.click(cardButton('Keep editing')))

	await waitFor(() => expect(card()).toBeNull())
	expect(router.state.location.pathname).toBe(RECORD)
	expect((field as HTMLInputElement).value).toBe(`${STORED}0`)
})

test('leaves on Discard only once the card has left', async () => {
	const { router, user } = await editRecord()
	await askBy(user, 'Contacts')
	const release = holdMotion()

	await user.click(cardButton('Discard'))
	await act(async () => new Promise((done) => setTimeout(done, 20)))
	expect([document.querySelector('[role="alertdialog"]') !== null, router.state.location.pathname]).toEqual([
		true,
		RECORD,
	])

	await act(async () => release())
	await screen.findByText('Contacts list')
	expect(router.state.location.pathname).toBe('/contacts')
})

test('asks nothing on a press after a save', async () => {
	const { router, user } = await editRecord()
	await user.click(screen.getByRole('button', { name: 'Save' }))

	await user.click(screen.getByRole('link', { name: 'Contacts' }))

	await screen.findByText('Contacts list')
	expect(router.state.location.pathname).toBe('/contacts')
	expect(card()).toBeNull()
})

test('asks nothing when one handler saves and leaves past the guard', async () => {
	const { router, user } = await editRecord()

	await user.click(screen.getByRole('button', { name: 'Save and close' }))

	await screen.findByText('Contacts list')
	expect(router.state.location.pathname).toBe('/contacts')
	expect(card()).toBeNull()
})

test('asks when one handler saves and leaves without passing the guard, since the save has not drawn yet', async () => {
	const { router, user } = await editRecord()

	await user.click(screen.getByRole('button', { name: 'Save and leave' }))

	expect(await screen.findByRole('alertdialog', { name: 'Discard changes?' })).not.toBeNull()
	expect(router.state.location.pathname).toBe(RECORD)
})

test('asks nothing when only the search of the record changes, and keeps its edits', async () => {
	const { router, user, field } = await editRecord()

	await user.click(screen.getByRole('link', { name: 'Sort' }))

	await waitFor(() => expect(router.state.location.search).toEqual({ sort: 'name' }))
	expect(router.state.location.pathname).toBe(RECORD)
	expect(card()).toBeNull()
	expect((field as HTMLInputElement).value).toBe(`${STORED}0`)
})

test('keeps the reader from the next place on Keep editing in a card asked while a Discard still loads', async () => {
	let listShows = () => {}
	const { router, user } = await editRecord(async () => new Promise<void>((done) => (listShows = done)))
	await askBy(user, 'Contacts')
	await user.click(cardButton('Discard'))
	await waitFor(() => expect(router.state.location.pathname).toBe('/contacts'))
	await waitFor(() => expect(card()).toBeNull())

	await askBy(user, 'Tasks')
	await user.click(cardButton('Keep editing'))
	await waitFor(() => expect(card()).toBeNull())
	await act(async () => listShows())

	await screen.findByText('Contacts list')
	expect(router.state.location.pathname).toBe('/contacts')
})
