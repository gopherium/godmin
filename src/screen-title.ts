// SPDX-License-Identifier: Apache-2.0

import { speak } from '@wordpress/a11y'
import { __, sprintf } from '@wordpress/i18n'
import {
	createContext,
	useContext,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'

/** How long in milliseconds a waiting title holds after the shown path changes, before the frame takes it as it is. */
export const TITLE_WAIT = 1000

/** The title one mounted screen reports. */
interface TitleReport {
	/** The title of the screen. */
	title: string
	/** How many Pages hold the one that reports, 1 for a Page inside no other, 0 for a PageTitle outside any Page. */
	depth: number
	/** Whether the Page holds nothing but one LoadingScreen, so its title only names the kind of record. */
	waiting: boolean
}

/** The titles the mounted screens of one frame report. */
export interface ScreenTitles {
	/** Reports a title and returns the function that withdraws it. */
	report: (report: TitleReport) => () => void
	/** Returns the deepest title, the newest of those as deep, or undefined while no screen reports one. */
	deepest: () => TitleReport | undefined
	/** Calls a listener whenever a title is reported or withdrawn, and returns the function that stops it. */
	subscribe: (listener: () => void) => () => void
}

/** The titles of the frame around a screen, undefined outside any frame. */
export const ScreenTitleContext = createContext<ScreenTitles | undefined>(undefined)

/**
 * Returns the deepest of the reported titles, the newest of those as deep.
 * @param reports - The reported titles, oldest first.
 * @returns That title, or undefined when there is none.
 */
function deepestOf(reports: readonly TitleReport[]): TitleReport | undefined {
	return reports.reduce<TitleReport | undefined>(
		(found, report) => (found === undefined || report.depth >= found.depth ? report : found),
		undefined,
	)
}

/**
 * Creates the store of the titles the mounted screens of one frame report.
 * @returns The store, holding no title.
 */
export function createScreenTitles(): ScreenTitles {
	let reports: TitleReport[] = []
	let deepest: TitleReport | undefined
	const listeners = new Set<() => void>()
	const changed = (next: TitleReport[]) => {
		reports = next
		deepest = deepestOf(reports)
		listeners.forEach((listener) => listener())
	}
	return {
		report: (report) => {
			changed([...reports, report])
			return () => changed(reports.filter((held) => held !== report))
		},
		deepest: () => deepest,
		subscribe: (listener) => {
			listeners.add(listener)
			return () => {
				listeners.delete(listener)
			}
		},
	}
}

/**
 * Reports a screen title to the frame around it while the screen is mounted.
 * @param title - The title, undefined for a screen that reports none.
 * @param depth - How many Pages hold the one that reports.
 * @param waiting - Whether the title only names the kind of record while the record loads.
 */
export function useReportTitle(title: string | undefined, depth: number, waiting: boolean): void {
	const titles = useContext(ScreenTitleContext)
	useLayoutEffect(() => {
		if (titles === undefined || title === undefined) {
			return
		}
		return titles.report({ title, depth, waiting })
	}, [titles, title, depth, waiting])
}

/**
 * Tells whether a waiting title still holds, for at most TITLE_WAIT after the shown path changes.
 * @param waiting - Whether the title only names the kind of record.
 * @param shownPath - The path the router has finished showing.
 * @returns Whether the title waits and the cap has not passed since this wait began.
 */
function useHeld(waiting: boolean, shownPath: string | undefined): boolean {
	const wait = useMemo(() => ({ waiting, shownPath }), [waiting, shownPath])
	const [capped, setCapped] = useState<typeof wait>()
	useEffect(() => {
		if (!wait.waiting) {
			return
		}
		const timer = setTimeout(() => setCapped(wait), TITLE_WAIT)
		return () => clearTimeout(timer)
	}, [wait])
	return waiting && capped !== wait
}

/** What a frame keeps of the paths its router showed. */
interface ShownPaths {
	/** The path shown last, undefined before the first. */
	path?: string
	/** Whether the first load is over, so that a new path owes its title. */
	firstOver: boolean
	/** Whether the path shown still owes its title to the reader. */
	owed: boolean
}

/**
 * Notes the path the router shows: a new one replaces the last, and owes its title once the first load is over.
 * @param shown - What the frame keeps of the paths shown.
 * @param path - The path shown now.
 */
function notePath(shown: ShownPaths, path: string): void {
	if (shown.path !== path) {
		shown.path = path
		shown.owed = shown.firstOver
	}
}

/**
 * Speaks a title assertively two animation frames from now.
 * @param title - The title.
 * @param shown - What the frame keeps of the paths shown, whose title is no longer owed once spoken.
 * @returns The function that cancels both frames.
 */
function speakLater(title: string, shown: ShownPaths): () => void {
	let second = 0
	const first = requestAnimationFrame(() => {
		second = requestAnimationFrame(() => {
			shown.owed = false
			speak(title, 'assertive')
		})
	})
	return () => {
		cancelAnimationFrame(first)
		cancelAnimationFrame(second)
	}
}

/**
 * Tells whether a move to another path has started and not shown yet.
 * @param location - The address the router moves to, its path before any search or hash.
 * @param shownPath - The path the router has finished showing.
 * @returns Whether the path of the address differs from the shown path, never without an address.
 */
function moveInFlight(location: string | undefined, shownPath: string): boolean {
	return location !== undefined && location.split(/[?#]/)[0] !== shownPath
}

/**
 * Speaks the title of each screen a new path shows, never during the first load, which lasts until the frame
 * first holds a title it would speak with no move in flight.
 * @param title - The title to speak, undefined while no screen reports one or it still waits.
 * @param shownPath - The path the router has finished showing.
 * @param location - The address the router moves to.
 */
function useSpokenTitle(title: string | undefined, shownPath: string | undefined, location: string | undefined): void {
	const shown = useRef<ShownPaths>({ firstOver: false, owed: false })
	const inFlight = shownPath !== undefined && moveInFlight(location, shownPath)
	useEffect(() => {
		if (shownPath === undefined) {
			return
		}
		notePath(shown.current, shownPath)
		if (title === undefined) {
			return
		}
		if (!shown.current.firstOver) {
			shown.current.firstOver = !inFlight
			return
		}
		return shown.current.owed ? speakLater(title, shown.current) : undefined
	}, [title, shownPath, inFlight])
}

/**
 * Sets the tab title to the screen title and the app name, through the translated pattern.
 * @param title - The screen title, undefined while no screen reports one or it still waits.
 * @param appName - The name of the app, undefined to leave the tab title alone.
 */
function useTabTitle(title: string | undefined, appName: string | undefined): void {
	useEffect(() => {
		if (title !== undefined && appName !== undefined) {
			document.title = sprintf(__('%1$s ‹ %2$s'), title, appName)
		}
	}, [title, appName])
}

/** What a frame hands the part that speaks its titles. */
interface TitleWatchProps {
	/** The titles the screens of the frame report. */
	titles: ScreenTitles
	/** The path the router has finished showing, nothing spoken without it. */
	shownPath?: string
	/** The address the router moves to. */
	location?: string
	/** The name of the app the tab title ends with, the tab title left alone without it. */
	appName?: string
}

/**
 * Speaks the title of each new screen of a frame and sets the tab title from it, drawing nothing.
 * @param props - The titles of the frame, the shown path, the address the router moves to and the app name.
 * @returns Nothing.
 */
export function TitleWatch({ titles, shownPath, location, appName }: TitleWatchProps): null {
	const shown = useSyncExternalStore(titles.subscribe, titles.deepest)
	const held = useHeld(shown?.waiting === true, shownPath)
	const title = held ? undefined : shown?.title
	useTabTitle(title, appName)
	useSpokenTitle(title, shownPath, location)
	return null
}
