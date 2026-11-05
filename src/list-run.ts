// SPDX-License-Identifier: Apache-2.0

import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

import { HOLDERS, itemAt, triggerOnItem } from './focus-back.js'
import type { FocusBack } from './focus-back.js'

/** Finds the dialog or the alert dialog holding the focus. */
const DIALOG_IN_FOCUS = '[role="dialog"]:focus-within, [role="alertdialog"]:focus-within'

/** Finds a part that turned inert while it holds the focus. */
const INERT_IN_FOCUS = '[inert]:focus-within'

/** Finds a dialog or an alert dialog. */
const DIALOG = '[role="dialog"], [role="alertdialog"]'

/** Finds the toast region, which takes the focus a leaving toast held. */
const TOAST_REGION = '.godmin-toasts'

/** Finds every control a reader can focus inside a card or a row. */
const CONTROLS = 'a[href], button, input, select, textarea, [tabindex]'

/** Finds a button of a row that runs an action, never the actions menu button, which only opens a menu. */
const ACTION_BUTTON = '.dataviews-item-actions button:not(.dataviews-all-actions-button)'

/** Settles a run on its list, focusing the list with no scroll once an item moved while the reader is still on it. */
export type RunSettled = (moved: boolean) => void

/** What a list does around a run over its items. */
export interface ListRun {
	/** Starts a run on this list and returns what settles it. */
	onStart: () => RunSettled
	/** Marks the list as reloading after its own write and returns what ends that reload. */
	onRefresh: () => () => void
}

/** The run a list's actions start, the region a finished run focuses, and whether the list reloads. */
export interface ListRunState {
	/** What the list does around a run, the same object for as long as the screen stays. */
	run: ListRun
	/** The list region a finished run focuses, handed to `Page` as `listRef`. */
	region: RefObject<HTMLDivElement | null>
	/** Whether a run reloads the list after its own write, to pass to DataViews `isLoading`. */
	refreshing: boolean
}

/** The control outside every dialog that opened each dialog, noted once per dialog. */
type OpenedBy = WeakMap<Element, EventTarget | null>

/** Where the reader stood in the list as it took the focus: the control and its card or row. */
interface Place {
	/** The control the reader pressed, or the one the focus sat on as the list was marked reloading. */
	control: HTMLElement
	/** Where its card or row sits among those of the list, -1 for a control in none, such as the bulk bar's. */
	row: number
	/** The item its card or row holds and the trigger it stands for, none when the app marks no item there. */
	item: FocusBack | null
}

/** What counts the reloads a list has open. */
interface Reloads {
	/** Marks the list as reloading and returns what ends that reload, once however often it is called. */
	start: () => () => void
	/** Drops every open reload, for a list no longer on show, so their ends do nothing. */
	drop: () => void
}

/**
 * Counts the reloads a list has open, each ended once, and drops them all when the list changes.
 * @returns Whether a reload is open, and how to start one or drop them all.
 */
function useReloads(): [boolean, Reloads] {
	const [open, setOpen] = useState(0)
	const [reloads] = useState<Reloads>(() => {
		let generation = 0
		return {
			start: () => {
				const startedIn = generation
				let ended = false
				setOpen((count) => count + 1)
				return () => {
					if (ended || startedIn !== generation) {
						return
					}
					ended = true
					setOpen((count) => count - 1)
				}
			},
			drop: () => {
				generation += 1
				setOpen(0)
			},
		}
	})
	return [open !== 0, reloads]
}

/**
 * Reports whether a dialog holds the focus, which a write finished in the background leaves where it is.
 * @returns Whether the focus sits inside a dialog or an alert dialog.
 */
export function focusInDialog(): boolean {
	return document.querySelector(DIALOG_IN_FOCUS) !== null
}

/**
 * Reports whether the dialog a run started in has left the page while the focus sits on the control that opened it.
 * @param startedIn - The dialog that held the focus as the run started, none for a run started outside every dialog.
 * @param openedBy - The control that opened each dialog.
 * @returns Whether that dialog has gone and the focus sits on that control.
 */
function stillWhereDialogLeftIt(startedIn: Element | null, openedBy: OpenedBy): boolean {
	return startedIn?.isConnected === false && document.activeElement === openedBy.get(startedIn)
}

/**
 * Moves the focus to the list region, scrolling nothing, when it sits in a part of that list that turned inert.
 * @param list - The list region, none while the screen draws no list.
 */
function keepOnList(list: HTMLElement | null): void {
	if (list?.querySelector(INERT_IN_FOCUS)) {
		list.focus({ preventScroll: true })
	}
}

/**
 * Returns where a control stands in the list, its card or row, none for the region or outside it.
 * @param list - The list region, none while the screen draws no list.
 * @param focused - The element that holds the focus or just lost it.
 * @returns The place, none when the element is the list region itself or sits outside it.
 */
function placeOf(list: HTMLElement | null, focused: EventTarget | null): Place | null {
	if (focused === list || !list?.contains(focused as Node | null)) {
		return null
	}
	const control = focused as HTMLElement
	const row = [...list.querySelectorAll(HOLDERS)].indexOf(control.closest(HOLDERS) as Element)
	return { control, row, item: itemAt(control) }
}

/**
 * Returns the trigger on the item the reader stood on, found wherever its card or row now sits.
 * @param list - The list region.
 * @param place - Where the reader stood.
 * @returns The trigger, none once the item left the list or when the app marks no item there.
 */
function onSameItem(list: HTMLElement, { item }: Place): HTMLElement | null {
	return item === null ? null : triggerOnItem(list, item)
}

/**
 * Returns the first control of the card or row that now sits where the place's sat, the last one when fewer came back.
 * @param list - The list region.
 * @param place - Where the reader stood.
 * @returns The control, its box in a list with bulk actions, none for an action button or with no row in that place.
 */
function firstInPlace(list: HTMLElement, { row }: Place): HTMLElement | null | undefined {
	const rows = list.querySelectorAll(HOLDERS)
	const first = rows.item(Math.min(row, rows.length - 1))?.querySelector<HTMLElement>(CONTROLS)
	return first?.matches(ACTION_BUTTON) ? null : first
}

/**
 * Gives the focus back from the list region to the pressed control, else the same item, else the row in its place.
 * @param list - The list region, none while the screen draws no list.
 * @param place - Where the reader stood as the list took the focus, none when they stood nowhere in it.
 */
function putBack(list: HTMLElement | null, place: Place | null): void {
	if (list === null || place === null) {
		return
	}
	const preventScroll = !list.matches(':focus-visible')
	for (const control of [place.control, onSameItem(list, place), firstInPlace(list, place)]) {
		if (document.activeElement === list) {
			control?.focus({ preventScroll })
		}
	}
}

/**
 * Notes what the focus leaves for a dialog: the control that opened it, and its place when it stands in the list.
 * @param region - The list region, none while the screen draws no list.
 * @param opener - Where the place goes, none once the focus leaves the list for anything but a dialog.
 * @param openedBy - Where the control goes, the first one only for each dialog.
 * @returns What stops noting.
 */
function noteOpener(
	region: RefObject<HTMLElement | null>,
	opener: { current: Place | null },
	openedBy: OpenedBy,
): () => void {
	const note = (event: FocusEvent) => {
		const list = region.current
		const dialog = (event.relatedTarget as Element | null)?.closest(DIALOG)
		if (list?.contains(event.target as Node)) {
			opener.current = dialog ? placeOf(list, event.target) : null
		}
		if (dialog && !(event.target as Element).closest(DIALOG)) {
			openedBy.set(dialog, openedBy.get(dialog) ?? event.target)
		}
	}
	document.addEventListener('focusout', note, true)
	return () => document.removeEventListener('focusout', note, true)
}

/**
 * Reports whether the focus sits on the page, the toast region, the list, the dialog that ran, or where it left it.
 * @param list - The list region, none while the screen draws no list.
 * @param startedIn - The dialog that held the focus as the run started, none for a run started outside every dialog.
 * @param openedBy - The control that opened each dialog.
 * @returns Whether a finished run may move the focus to the list.
 */
function readerOnList(list: HTMLElement | null, startedIn: Element | null, openedBy: OpenedBy): boolean {
	const active = document.activeElement
	const holds = [list, startedIn].some((holder) => holder !== null && holder.contains(active))
	const leftByToast = active?.matches(TOAST_REGION) === true
	return active === document.body || leftByToast || holds || stillWhereDialogLeftIt(startedIn, openedBy)
}

/**
 * Holds the region a run focuses, gives its focus back once the list reloaded, and drops old runs on a list change.
 * @param scope - Names the list on show.
 * @param onChangeSelection - Replaces the ticked rows, emptied when the list changes.
 * @returns The run, the region and whether the list reloads.
 */
export function useListRun(scope: string, onChangeSelection: (selection: string[]) => void): ListRunState {
	const region = useRef<HTMLDivElement>(null)
	const latest = useRef(0)
	const committed = useRef(scope)
	const place = useRef<Place | null>(null)
	const opener = useRef<Place | null>(null)
	const [openedBy] = useState<OpenedBy>(() => new WeakMap())
	const [refreshing, reloads] = useReloads()
	useLayoutEffect(() => noteOpener(region, opener, openedBy), [openedBy])
	useLayoutEffect(() => {
		latest.current += 1
	}, [scope])
	useLayoutEffect(() => {
		if (committed.current !== scope) {
			committed.current = scope
			place.current = null
			reloads.drop()
			onChangeSelection([])
		}
	}, [scope, onChangeSelection, reloads])
	useLayoutEffect(() => {
		if (refreshing) {
			keepOnList(region.current)
			return
		}
		putBack(region.current, place.current)
		place.current = null
	}, [refreshing])
	const [run] = useState<ListRun>(() => ({
		onStart: () => {
			latest.current += 1
			const id = latest.current
			const startedIn = document.querySelector(DIALOG_IN_FOCUS)
			place.current = startedIn === null ? null : opener.current
			return (moved) => {
				if (latest.current !== id) {
					return
				}
				if (!moved) {
					place.current = null
					return
				}
				if (readerOnList(region.current, startedIn, openedBy)) {
					place.current ??= placeOf(region.current, document.activeElement)
					region.current?.focus({ preventScroll: true })
				}
			}
		},
		onRefresh: () => {
			place.current = placeOf(region.current, document.activeElement) ?? place.current
			return reloads.start()
		},
	}))
	return { run, region, refreshing }
}
