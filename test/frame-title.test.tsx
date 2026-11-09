// SPDX-License-Identifier: Apache-2.0

import {
	Navigate,
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
	lazyRouteComponent,
	redirect,
	useParams,
} from '@tanstack/react-router'
import { act, screen } from '@testing-library/react'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { StrictMode, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { Frame } from '../src/frame.js'
import { LoadingScreen } from '../src/loading.js'
import { Page } from '../src/page.js'
import { routerDefaults, useFrameLocation, useShownPath } from '../src/router.js'
import { TITLE_WAIT } from '../src/screen-title.js'
import { getAnnouncement, installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/** How a record page lays out its LoadingScreen while its record loads. */
type RecordLayout = 'alone' | 'beside content' | 'beside an aside' | 'wrapped'

/** The module the code chunk of the later route hands over. */
interface Chunk {
	default: () => ReactNode
}

/** How the test admin is drawn. */
interface TitleAppOptions {
	/** Whether the frame is given the path the router has shown, true when absent. */
	shownPath?: boolean
	/** Whether the frame is given the location the router moves to, true when absent. */
	location?: boolean
	/** The name the tab title ends with, none when absent. */
	appName?: string
	/** What the home address draws, a Page titled Dashboard when absent. */
	home?: 'page' | 'landing'
	/** What the tools loader waits for, nothing when absent. */
	tools?: Promise<void>
	/** What the code chunk of the later route waits for, nothing when absent. */
	later?: Promise<Chunk>
	/** What the bare screen waits for before its Page shows, nothing when absent. */
	bare?: Promise<void>
	/** What the landing waits for before it sends the reader to Contacts, nothing when absent. */
	landing?: Promise<void>
	/** What each record waits for, by its id, nothing for a record not named. */
	records?: Record<string, Promise<void>>
	/** How a record page lays out its LoadingScreen, alone when absent. */
	recordLayout?: RecordLayout
	/** Whether the router draws under StrictMode. */
	strict?: boolean
}

/** The name each record shows once it has loaded, by its id. */
const RECORD_NAMES: Record<string, string> = { c1: 'Maria Perez', c2: 'Second contact' }

/** The watchers of the assertive region the tests start, stopped after each test. */
const watchers: MutationObserver[] = []

afterEach(() => {
	watchers.splice(0).forEach((watcher) => watcher.disconnect())
	resetLocaleData()
	vi.useRealTimers()
	vi.unstubAllGlobals()
	document.title = ''
})

/** Returns a promise and the function that settles it. */
function held<T = void>(): { promise: Promise<T>; release: (value: T) => void } {
	let release: (value: T) => void = () => {}
	const promise = new Promise<T>((done) => {
		release = done
	})
	return { promise, release }
}

/** Tells whether a promise has settled, at once when there is none. */
function useSettled(promise: Promise<unknown> | undefined): boolean {
	const [settled, setSettled] = useState(promise === undefined)
	useEffect(() => {
		let live = true
		void promise?.then(() => {
			if (live) {
				setSettled(true)
			}
		})
		return () => {
			live = false
		}
	}, [promise])
	return settled
}

/** Draws a page titled after a screen, with one line of content. */
function titled(title: string) {
	return function TitledScreen() {
		return (
			<Page title={title}>
				<p>{title} content</p>
			</Page>
		)
	}
}

/** The Page the bare screen draws once it stops waiting. */
const BareScreen = titled('Bare screen')

/** Draws a record page while its record loads, in the layout a test asks for. */
function LoadingRecord({ layout }: { layout: RecordLayout }) {
	const spinner = <LoadingScreen label="Loading contact" />
	if (layout === 'beside an aside') {
		return (
			<Page title="Contact" aside={<p>Details</p>}>
				{spinner}
			</Page>
		)
	}
	if (layout === 'beside content') {
		return (
			<Page title="Contact">
				<p>Notes</p>
				{spinner}
			</Page>
		)
	}
	return <Page title="Contact">{layout === 'wrapped' ? <div>{spinner}</div> : spinner}</Page>
}

/** Draws one record: the loading layout until its record arrives, then a page named after it. */
function RecordPage({ id, wait, layout }: { id: string; wait?: Promise<void>; layout: RecordLayout }) {
	if (!useSettled(wait)) {
		return <LoadingRecord layout={layout} />
	}
	return (
		<Page title={RECORD_NAMES[id]}>
			<p>184467235</p>
		</Page>
	)
}

/** Returns the router of the test admin: a frame given the router's hooks, around every screen a case needs. */
function titleAppRouter(path: string, options: TitleAppOptions = {}) {
	const { shownPath = true, location = true, appName, home = 'page', records = {}, recordLayout = 'alone' } = options
	function Layout() {
		const shown = useShownPath()
		const at = useFrameLocation()
		return (
			<Frame.Root shownPath={shownPath ? shown : undefined} location={location ? at : undefined} appName={appName}>
				<Frame.Canvas>
					<Outlet />
				</Frame.Canvas>
			</Frame.Root>
		)
	}
	function Landing() {
		return useSettled(options.landing) ? <Navigate to="/contacts" replace /> : <LoadingScreen label="Loading" />
	}
	function Bare() {
		return useSettled(options.bare) ? <BareScreen /> : <LoadingScreen label="Loading" />
	}
	function Record() {
		const { contactId } = useParams({ strict: false }) as { contactId: string }
		return <RecordPage key={contactId} id={contactId} wait={records[contactId]} layout={recordLayout} />
	}
	const rootRoute = createRootRoute({ component: Layout })
	const child = (at: string, component: () => ReactNode) =>
		createRoute({ getParentRoute: () => rootRoute, path: at, component })
	const later = options.later ?? Promise.resolve({ default: titled('Later') })
	const section = createRoute({
		getParentRoute: () => rootRoute,
		path: '/section',
		component: () => (
			<Page title="Section">
				<Outlet />
			</Page>
		),
	})
	const routes = [
		child('/', home === 'page' ? titled('Dashboard') : Landing),
		child('/landing', Landing),
		child('/gate', () => <Navigate to="/" replace />),
		child('/contacts', titled('Contacts')),
		child('/people', titled('Contacts')),
		child('/settings', titled('Settings')),
		child('/bare', Bare),
		child('/plain', () => <p>Plain screen</p>),
		child('/nested', () => (
			<Page title="Settings">
				<Page title="General">
					<p>Fields</p>
				</Page>
			</Page>
		)),
		section.addChildren([
			createRoute({ getParentRoute: () => section, path: 'one', component: titled('One') }),
			createRoute({ getParentRoute: () => section, path: 'two', component: Bare }),
		]),
		child('/contacts/$contactId', Record),
		createRoute({
			getParentRoute: () => rootRoute,
			path: '/tools',
			loader: () => options.tools,
			component: titled('Tools'),
		}),
		createRoute({ getParentRoute: () => rootRoute, path: '/later', component: lazyRouteComponent(() => later) }),
		createRoute({
			getParentRoute: () => rootRoute,
			path: '/old',
			beforeLoad: () => {
				throw redirect({ to: '/settings' })
			},
		}),
	]
	return createRouter({
		routeTree: rootRoute.addChildren(routes),
		history: createMemoryHistory({ initialEntries: [path] }),
		...routerDefaults(),
	})
}

/** Draws the test admin at an address, waits for its canvas, and returns its router. */
async function renderTitleApp(path: string, options: TitleAppOptions = {}) {
	const router = titleAppRouter(path, options)
	const app = <RouterProvider router={router} />
	renderAdmin(options.strict === true ? <StrictMode>{app}</StrictMode> : app)
	await screen.findByRole('main')
	await afterFrames()
	return router
}

/** Starts recording every message spoken assertively, and returns the reader of what was spoken so far. */
function listenAssertive(): () => string[] {
	const region = document.getElementById('a11y-speak-assertive') as HTMLElement
	const spoken: string[] = []
	const keep = (records: MutationRecord[]) => {
		for (const record of records) {
			record.addedNodes.forEach((node) => spoken.push((node.textContent ?? '').trim()))
		}
	}
	const watcher = new MutationObserver(keep)
	watcher.observe(region, { childList: true })
	watchers.push(watcher)
	return () => {
		keep(watcher.takeRecords())
		return [...spoken]
	}
}

/** Waits for some rendering updates, more than a title owed now needs to be spoken. */
async function afterFrames(count = 4): Promise<void> {
	await act(async () => {
		for (let frame = 0; frame < count; frame += 1) {
			await new Promise((done) => requestAnimationFrame(done))
		}
	})
}

/** Moves the router to an address and waits until the move has shown its screen and a title could be spoken. */
async function moveTo(router: ReturnType<typeof titleAppRouter>, to: string, more: object = {}): Promise<void> {
	await act(() => router.navigate({ to, ...more }))
	await afterFrames()
}

/** Starts a move the router may hold, without waiting for it. */
async function startMove(router: ReturnType<typeof titleAppRouter>, to: string): Promise<void> {
	await act(async () => {
		void router.navigate({ to })
	})
	await afterFrames()
}

test('speaks the title of the Page a new path shows, once, assertive', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()

	await moveTo(router, '/settings')

	expect(spoken()).toEqual(['Settings'])
	expect(getAnnouncement('assertive').trim()).toBe('Settings')
	expect(getAnnouncement('polite')).toBe('')
})

test.each([false, true])('keeps the first path silent, StrictMode %s', async (strict) => {
	const spoken = listenAssertive()

	await renderTitleApp('/contacts', { strict })

	expect(spoken()).toEqual([])
	expect(screen.getByRole('heading', { name: 'Contacts' })).not.toBeNull()
})

test.each([
	{ start: 'on a search address', path: '/contacts?search=maria' },
	{ start: 'through a redirect before load', path: '/old' },
	{ start: 'on a record', path: '/contacts/c1' },
])('keeps a first load $start silent', async ({ path }) => {
	const spoken = listenAssertive()

	await renderTitleApp(path)

	expect(spoken()).toEqual([])
})

test('keeps a first load silent while its loader holds and once it is released', async () => {
	const tools = held()
	const spoken = listenAssertive()
	const router = titleAppRouter('/tools', { tools: tools.promise })
	renderAdmin(<RouterProvider router={router} />)
	await afterFrames()

	await act(async () => {
		tools.release()
	})
	await screen.findByRole('heading', { name: 'Tools' })
	await afterFrames()

	expect(spoken()).toEqual([])
})

test.each([false, true])(
	'keeps a first load silent through a landing that shows a bare LoadingScreen, then replaces itself, StrictMode %s',
	async (strict) => {
		const landing = held()
		const spoken = listenAssertive()
		const router = await renderTitleApp('/landing', { landing: landing.promise, strict })

		await act(async () => {
			landing.release()
		})
		await screen.findByRole('heading', { name: 'Contacts' })
		await afterFrames()

		expect(router.state.location.pathname).toBe('/contacts')
		expect(spoken()).toEqual([])
	},
)

test('keeps a first load silent through a gate that sends the reader home to a page', async () => {
	const spoken = listenAssertive()

	await renderTitleApp('/gate', { strict: true })
	await screen.findByRole('heading', { name: 'Dashboard' })
	await afterFrames()

	expect(spoken()).toEqual([])
})

test('keeps a first load silent through a gate that sends the reader home to a landing', async () => {
	const landing = held()
	const spoken = listenAssertive()
	const router = await renderTitleApp('/gate', { home: 'landing', landing: landing.promise, strict: true })
	expect(router.state.location.pathname).toBe('/')

	await act(async () => {
		landing.release()
	})
	await screen.findByRole('heading', { name: 'Contacts' })
	await afterFrames()

	expect(spoken()).toEqual([])
})

test('ends the first load once no move is in flight, so the move after a landing speaks', async () => {
	const landing = held()
	const router = await renderTitleApp('/landing', { landing: landing.promise })
	await act(async () => {
		landing.release()
	})
	await screen.findByRole('heading', { name: 'Contacts' })
	await afterFrames()
	const spoken = listenAssertive()

	await moveTo(router, '/settings')

	expect(spoken()).toEqual(['Settings'])
})

test('keeps a move the reader makes before any title shows silent, and speaks the move after it', async () => {
	const bare = held()
	const router = await renderTitleApp('/bare', { bare: bare.promise })
	const spoken = listenAssertive()

	await moveTo(router, '/contacts')
	expect(spoken()).toEqual([])
	await moveTo(router, '/settings')

	expect(spoken()).toEqual(['Settings'])
})

test('speaks the target once on a later move through the landing', async () => {
	const router = await renderTitleApp('/settings')
	const spoken = listenAssertive()

	await moveTo(router, '/landing')
	await screen.findByRole('heading', { name: 'Contacts' })
	await afterFrames()

	expect(spoken()).toEqual(['Contacts'])
})

test('speaks the home title once on a later move through a gate', async () => {
	const router = await renderTitleApp('/settings')
	const spoken = listenAssertive()

	await moveTo(router, '/gate')
	await screen.findByRole('heading', { name: 'Dashboard' })
	await afterFrames()

	expect(spoken()).toEqual(['Dashboard'])
})

test.each([
	{ change: 'the search', more: { search: { search: 'maria' } } },
	{ change: 'the page of the list', more: { search: { page: 2 } } },
	{ change: 'the hash', more: { hash: 'notes' } },
	{ change: 'nothing', more: {} },
])('keeps a move that changes $change on the same path silent', async ({ more }) => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()

	await moveTo(router, '/contacts', more)

	expect(spoken()).toEqual([])
})

test('keeps a held loader silent until its release, then speaks its title once', async () => {
	const tools = held()
	const router = await renderTitleApp('/contacts', { tools: tools.promise })
	const spoken = listenAssertive()

	await startMove(router, '/tools')
	expect(router.state.location.pathname).toBe('/tools')
	expect(spoken()).toEqual([])
	await act(async () => {
		tools.release()
	})
	await screen.findByRole('heading', { name: 'Tools' })
	await afterFrames()

	expect(spoken()).toEqual(['Tools'])
})

test('keeps a held code chunk silent until it loads, then speaks its title once', async () => {
	const chunk = held<Chunk>()
	const router = await renderTitleApp('/contacts', { later: chunk.promise })
	const spoken = listenAssertive()

	await startMove(router, '/later')
	expect(spoken()).toEqual([])
	await act(async () => {
		chunk.release({ default: titled('Later') })
	})
	await screen.findByRole('heading', { name: 'Later' })
	await afterFrames()

	expect(spoken()).toEqual(['Later'])
})

test('speaks only the screen the reader went to when they leave a held move', async () => {
	const tools = held()
	const router = await renderTitleApp('/contacts', { tools: tools.promise })
	const spoken = listenAssertive()

	await startMove(router, '/tools')
	await moveTo(router, '/settings')
	await act(async () => {
		tools.release()
	})
	await afterFrames()

	expect(spoken()).toEqual(['Settings'])
})

test('speaks the same title twice for two paths that share it', async () => {
	const router = await renderTitleApp('/settings')
	const spoken = listenAssertive()

	await moveTo(router, '/contacts')
	await moveTo(router, '/people')

	expect(spoken()).toEqual(['Contacts', 'Contacts'])
})

test('keeps a screen with no Page silent, as the Page it left withdrew its title, until a Page mounts', async () => {
	const bare = held()
	const router = await renderTitleApp('/contacts', { bare: bare.promise })
	const spoken = listenAssertive()

	await moveTo(router, '/bare')
	expect(spoken()).toEqual([])
	await act(async () => {
		bare.release()
	})
	await screen.findByRole('heading', { name: 'Bare screen' })
	await afterFrames()

	expect(spoken()).toEqual(['Bare screen'])
})

test('keeps a screen that never draws a Page silent', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()

	await moveTo(router, '/plain')

	expect(spoken()).toEqual([])
})

test('speaks the title of the deepest of two nested Pages', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()

	await moveTo(router, '/nested')

	expect(spoken()).toEqual(['General'])
})

test('speaks the Page around a screen that shows a bare LoadingScreen, and not the Page it draws later', async () => {
	const bare = held()
	const router = await renderTitleApp('/section/one', { bare: bare.promise })
	const spoken = listenAssertive()

	await moveTo(router, '/section/two')
	await act(async () => {
		bare.release()
	})
	await screen.findByRole('heading', { name: 'Bare screen' })
	await afterFrames()

	expect(spoken()).toEqual(['Section'])
})

test('speaks the target of a redirect once', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()

	await moveTo(router, '/old')

	expect(router.state.location.pathname).toBe('/settings')
	expect(spoken()).toEqual(['Settings'])
})

test('speaks the new record on a move from one record to another', async () => {
	const router = await renderTitleApp('/contacts/c1')
	const spoken = listenAssertive()

	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c2' } })

	expect(spoken()).toEqual(['Second contact'])
})

test('speaks Route not found for an address no route serves', async () => {
	const router = await renderTitleApp('/contacts', { appName: 'Acme' })
	const spoken = listenAssertive()

	await moveTo(router, '/gone')

	expect(spoken()).toEqual(['Route not found'])
	expect(document.title).toBe('Route not found ‹ Acme')
})

test('speaks nothing in a frame given no shown path', async () => {
	const router = await renderTitleApp('/contacts', { shownPath: false })
	const spoken = listenAssertive()

	await moveTo(router, '/settings')

	expect(spoken()).toEqual([])
})

test('ends the first load on the first title in a frame given no location, and speaks the next move', async () => {
	const router = await renderTitleApp('/contacts', { location: false })
	const spoken = listenAssertive()

	await moveTo(router, '/settings')

	expect(spoken()).toEqual(['Settings'])
})

test('moves no focus when it speaks', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()
	const button = document.createElement('button')
	document.body.append(button)
	button.focus()

	await moveTo(router, '/settings')

	expect(spoken()).toEqual(['Settings'])
	expect(document.activeElement).toBe(button)
	button.remove()
})

/** The animation frame callbacks a test runs by hand, by their id. */
const frames = new Map<number, FrameRequestCallback>()

/** Holds every animation frame until the test runs it by hand. */
function holdFrames(): void {
	let next = 0
	frames.clear()
	vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
		next += 1
		frames.set(next, callback)
		return next
	})
	vi.stubGlobal('cancelAnimationFrame', (id: number) => {
		frames.delete(id)
	})
}

/** Runs the frame callbacks due now, as one rendering update does. */
function runFrame(): void {
	const due = [...frames.values()]
	frames.clear()
	act(() => {
		due.forEach((callback) => callback(performance.now()))
	})
}

test('speaks two frames after the new screen shows, not one', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()
	holdFrames()

	await act(() => router.navigate({ to: '/settings' }))
	runFrame()
	expect(spoken()).toEqual([])
	runFrame()

	expect(spoken()).toEqual(['Settings'])
})

test('speaks only the second of two screens that show less than two frames apart', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()
	holdFrames()

	await act(() => router.navigate({ to: '/settings' }))
	runFrame()
	await act(() => router.navigate({ to: '/nested' }))
	runFrame()
	runFrame()

	expect(spoken()).toEqual(['General'])
})

test('speaks both of two screens that show two frames apart, in order', async () => {
	const router = await renderTitleApp('/contacts')
	const spoken = listenAssertive()
	holdFrames()

	await act(() => router.navigate({ to: '/settings' }))
	runFrame()
	runFrame()
	await act(() => router.navigate({ to: '/nested' }))
	runFrame()
	runFrame()

	expect(spoken()).toEqual(['Settings', 'General'])
})

test('holds the title of a Page holding one LoadingScreen until its record loads, then speaks its name', async () => {
	const record = held()
	const router = await renderTitleApp('/contacts', { records: { c1: record.promise } })
	const spoken = listenAssertive()

	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c1' } })
	expect(screen.getByRole('heading', { name: 'Contact' })).not.toBeNull()
	expect(spoken()).toEqual([])
	await act(async () => {
		record.release()
	})
	await afterFrames()

	expect(spoken()).toEqual(['Maria Perez'])
})

test.each(['beside content', 'beside an aside', 'wrapped'] as const)(
	'speaks the placeholder at once for a LoadingScreen %s',
	async (recordLayout) => {
		const record = held()
		const router = await renderTitleApp('/contacts', { records: { c1: record.promise }, recordLayout })
		const spoken = listenAssertive()

		await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c1' } })

		expect(spoken()).toEqual(['Contact'])
	},
)

/** Moves to a record whose fetch holds, with the clock of the cap faked, and returns what is spoken. */
async function moveToHeldRecord(record: Promise<void>, appName?: string) {
	const router = await renderTitleApp('/contacts', { records: { c1: record, c2: new Promise(() => {}) }, appName })
	const spoken = listenAssertive()
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c1' } })
	return { router, spoken }
}

/** Moves the faked clock on, then waits for the frames a title owed then needs. */
async function advance(ms: number): Promise<void> {
	await act(() => vi.advanceTimersByTimeAsync(ms))
	await afterFrames()
}

test('speaks the placeholder of a held record at the cap, not a millisecond before, never its name', async () => {
	const record = held()
	const { spoken } = await moveToHeldRecord(record.promise)

	await advance(TITLE_WAIT - 1)
	expect(spoken()).toEqual([])
	await advance(1)
	expect(spoken()).toEqual(['Contact'])
	await act(async () => {
		record.release()
	})
	await afterFrames()

	expect(screen.getByRole('heading', { name: 'Maria Perez' })).not.toBeNull()
	expect(spoken()).toEqual(['Contact'])
})

test('holds the next record again after one that reached the cap', async () => {
	const { router, spoken } = await moveToHeldRecord(new Promise(() => {}))
	await advance(TITLE_WAIT)

	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c2' } })
	expect(spoken()).toEqual(['Contact'])
	await advance(TITLE_WAIT - 1)
	expect(spoken()).toEqual(['Contact'])
	await advance(1)

	expect(spoken()).toEqual(['Contact', 'Contact'])
})

test('holds a record again when the reader comes back to it after it reached the cap', async () => {
	const { router, spoken } = await moveToHeldRecord(new Promise(() => {}))
	await advance(TITLE_WAIT)
	await moveTo(router, '/contacts')
	expect(spoken()).toEqual(['Contact', 'Contacts'])

	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c1' } })
	expect(spoken()).toEqual(['Contact', 'Contacts'])
	await advance(TITLE_WAIT)

	expect(spoken()).toEqual(['Contact', 'Contacts', 'Contact'])
})

test('holds the tab title of a second record after one that reached the cap, given no shown path', async () => {
	const records = { c1: new Promise<void>(() => {}), c2: new Promise<void>(() => {}) }
	const router = await renderTitleApp('/contacts', { shownPath: false, appName: 'Acme', records })
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c1' } })
	await advance(TITLE_WAIT)
	expect(document.title).toBe('Contact ‹ Acme')
	await moveTo(router, '/contacts')

	await moveTo(router, '/contacts/$contactId', { params: { contactId: 'c2' } })
	expect(document.title).toBe('Contacts ‹ Acme')
	await advance(TITLE_WAIT)

	expect(document.title).toBe('Contact ‹ Acme')
})

test('sets the tab title to the screen title and the app name on the first load and on each screen', async () => {
	const router = await renderTitleApp('/contacts', { appName: 'Acme' })
	expect(document.title).toBe('Contacts ‹ Acme')

	await moveTo(router, '/settings')

	expect(document.title).toBe('Settings ‹ Acme')
})

test('keeps the last tab title on a screen with no Page', async () => {
	const router = await renderTitleApp('/contacts', { appName: 'Acme' })

	await moveTo(router, '/plain')

	expect(document.title).toBe('Contacts ‹ Acme')
})

test('keeps the last tab title while a record waits, and sets the placeholder at the cap', async () => {
	const { router } = await moveToHeldRecord(new Promise(() => {}), 'Acme')
	expect(router.state.location.pathname).toBe('/contacts/c1')
	expect(document.title).toBe('Contacts ‹ Acme')

	await advance(TITLE_WAIT - 1)
	expect(document.title).toBe('Contacts ‹ Acme')
	await advance(1)

	expect(document.title).toBe('Contact ‹ Acme')
})

test('leaves the tab title alone in a frame given no app name', async () => {
	document.title = 'Static title'
	const router = await renderTitleApp('/contacts')

	await moveTo(router, '/settings')

	expect(document.title).toBe('Static title')
})

test('reads the tab title pattern from the reader language, so a right to left catalogue can turn it', async () => {
	setLocaleData({ '%1$s ‹ %2$s': ['%2$s › %1$s'] })

	await renderTitleApp('/contacts', { appName: 'Acme' })

	expect(document.title).toBe('Acme › Contacts')
})
