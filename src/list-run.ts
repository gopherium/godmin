// SPDX-License-Identifier: Apache-2.0

import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** Finds the dialog or the alert dialog holding the focus. */
const DIALOG_IN_FOCUS = '[role="dialog"]:focus-within, [role="alertdialog"]:focus-within'

/** Settles a run on its list, focusing the list once an item moved while the reader is still on it. */
export type RunSettled = (moved: boolean) => void

/** What a list does around a run over its items. */
export interface ListRun {
	/** Starts a run on this list and returns what settles it. */
	onStart: () => RunSettled
}

/** The run a list's actions start and the region a finished run focuses. */
export interface ListRunState {
	/** What the list does around a run, the same object for as long as the screen stays. */
	run: ListRun
	/** The list region a finished run focuses, handed to `Page` as `listRef`. */
	region: RefObject<HTMLDivElement | null>
}

/** Where the focus first landed outside the dialog a run started in, and what stops watching for it. */
interface Landing {
	/** The element the focus first landed on outside that dialog while it was on the page, none until it does. */
	element: EventTarget | null
	/** Stops watching the focus, and does nothing once stopped. */
	stop: () => void
}

/** Stops nothing, for a run that watches no focus. */
function stopNothing(): void {}

/**
 * Reports whether a dialog holds the focus, which a write finished in the background leaves where it is.
 * @returns Whether the focus sits inside a dialog or an alert dialog.
 */
export function focusInDialog(): boolean {
	return document.querySelector(DIALOG_IN_FOCUS) !== null
}

/**
 * Watches where the focus first lands outside the dialog a run started in while that dialog is still on the page.
 * @param startedIn - The dialog that held the focus as the run started, none for a run started outside every dialog.
 * @returns The landing, filled in once the focus lands, which watches nothing for a run started outside every dialog.
 */
function watchLanding(startedIn: Element | null): Landing {
	const landing: Landing = { element: null, stop: stopNothing }
	if (startedIn === null) {
		return landing
	}
	const note = (event: FocusEvent) => {
		if (startedIn.isConnected && !startedIn.contains(event.target as Node)) {
			landing.element = event.target
			landing.stop()
		}
	}
	document.addEventListener('focusin', note, true)
	landing.stop = () => document.removeEventListener('focusin', note, true)
	return landing
}

/**
 * Reports whether the dialog a run started in has closed while the focus stays where it first landed, in no dialog.
 * @param startedIn - The dialog that held the focus as the run started, none for a run started outside every dialog.
 * @param landed - The element the focus first landed on outside that dialog, none while it never did.
 * @returns Whether that dialog has gone and the focus stays on the element it handed the focus back to.
 */
function stillWhereDialogLeftIt(startedIn: Element | null, landed: EventTarget | null): boolean {
	return startedIn?.isConnected === false && document.activeElement === landed && !focusInDialog()
}

/**
 * Reports whether the focus sits on the page, in the list, in the dialog that ran, or where that dialog left it.
 * @param list - The list region, none while the screen draws no list.
 * @param startedIn - The dialog that held the focus as the run started, none for a run started outside every dialog.
 * @param landed - The element the focus first landed on outside that dialog, none while it never did.
 * @returns Whether a finished run may move the focus to the list.
 */
function readerOnList(list: HTMLElement | null, startedIn: Element | null, landed: EventTarget | null): boolean {
	const active = document.activeElement
	const holds = [list, startedIn].some((holder) => holder !== null && holder.contains(active))
	return active === document.body || holds || stillWhereDialogLeftIt(startedIn, landed)
}

/**
 * Holds the region a run focuses while the reader stays on it, and drops older runs and ticked rows on a list change.
 * @param scope - Names the list on show.
 * @param onChangeSelection - Replaces the ticked rows, emptied when the list changes.
 * @returns The run and the region.
 */
export function useListRun(scope: string, onChangeSelection: (selection: string[]) => void): ListRunState {
	const region = useRef<HTMLDivElement>(null)
	const latest = useRef(0)
	const watching = useRef(stopNothing)
	const committed = useRef(scope)
	useLayoutEffect(() => {
		latest.current += 1
		return () => watching.current()
	}, [scope])
	useLayoutEffect(() => {
		if (committed.current !== scope) {
			committed.current = scope
			onChangeSelection([])
		}
	}, [scope, onChangeSelection])
	const [run] = useState<ListRun>(() => ({
		onStart: () => {
			watching.current()
			latest.current += 1
			const id = latest.current
			const startedIn = document.querySelector(DIALOG_IN_FOCUS)
			const landing = watchLanding(startedIn)
			watching.current = landing.stop
			return (moved) => {
				landing.stop()
				if (latest.current !== id || !moved) {
					return
				}
				if (readerOnList(region.current, startedIn, landing.element)) {
					region.current?.focus()
				}
			}
		},
	}))
	return { run, region }
}
