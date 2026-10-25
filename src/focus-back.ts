// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** Finds each cell an app marks with the id DataViews keys its item by, the title cell at least. */
const MARKED = '[data-item-id]'

/** Finds the card of a grid, the row of a phone list or the row of a table holding an item. */
const HOLDERS = '.dataviews-view-grid__card, .dataviews-view-list__item-wrapper, .dataviews-view-table__row'

/** Finds each trigger a dialog on an item opens from, inside the card or the row holding the item. */
const TRIGGERS = {
	title: '.dataviews-title-field[role="button"]',
	media: '.dataviews-view-grid__media[role="button"], .dataviews-column-primary__media[role="button"]',
	row: '.dataviews-view-list__item',
	actions: '[aria-haspopup="menu"]',
}

/** Finds the bar DataViews draws the actions on the ticked items in. */
const BULK_BAR = '.dataviews-bulk-actions-footer__container'

/** A trigger on a card or a row a dialog on its item opens from. */
type ItemTrigger = keyof typeof TRIGGERS

/** The trigger a list dialog opened from: an item's title, media, phone row or actions menu, or the bulk bar. */
export type Trigger = ItemTrigger | 'bulk'

/** One request to put the focus back on the trigger a dialog opened from, a new one each time it is asked. */
interface FocusBack {
	/** The item the dialog acted on. */
	id: string
	/** The trigger the dialog opened from. */
	trigger: Trigger
}

/**
 * Returns the trigger a click, a tap or a key opened a dialog from, read from the focus it left there.
 * @returns The bulk bar, the media, the title or the phone row holding the focus, the actions menu otherwise.
 */
export function focusedTrigger(): Trigger {
	const focused = document.activeElement as Element
	if (focused.closest(BULK_BAR) !== null) {
		return 'bulk'
	}
	const triggers: ItemTrigger[] = ['media', 'title', 'row']
	return triggers.find((trigger) => focused.closest(TRIGGERS[trigger]) !== null) ?? 'actions'
}

/**
 * Returns the card or the row holding an item inside the list, found through the mark on its cells.
 * @param list - The list region.
 * @param id - The id DataViews keys the item by.
 * @returns The card or the row, none once the item left the list or its mark sits outside every card and row.
 */
function holderOf(list: HTMLElement, id: string): Element | null {
	const marked = [...list.querySelectorAll<HTMLElement>(MARKED)].find((cell) => cell.dataset.itemId === id)
	return marked?.closest(HOLDERS) ?? null
}

/**
 * Returns the trigger a dialog on an item opened from, found wherever its card or row now sits.
 * @param list - The list region.
 * @param asked - The item and the trigger.
 * @returns The trigger, else the item's actions menu, else the list, which a bulk action always gets.
 */
function triggerOf(list: HTMLElement, { id, trigger }: FocusBack): HTMLElement {
	const holder = holderOf(list, id)
	if (trigger === 'bulk' || holder === null) {
		return list
	}
	const found = holder.querySelector<HTMLElement>(TRIGGERS[trigger])
	return found ?? holder.querySelector<HTMLElement>(TRIGGERS.actions) ?? list
}

/** Stops nothing, for a focus put on the list region, which no layout of the list takes off the page. */
function stopNothing(): void {}

/**
 * Reports whether a batch of changes to the list took an element off the page, to draw it anew or to move it.
 * @param records - The changes to the list.
 * @param element - The element.
 * @returns Whether a change removed the element or a node holding it.
 */
function tookOff(records: MutationRecord[], element: Element): boolean {
	return records.some((record) => [...record.removedNodes].some((node) => node.contains(element)))
}

/**
 * Puts the focus on the trigger a dialog on an item opened from, again on each redraw, on the list once the item left.
 * @param list - The list region.
 * @param asked - The item and the trigger.
 * @returns What stops it, which also stops once the reader moves the focus or presses elsewhere, or the list takes it.
 */
function keepFocusOn(list: HTMLElement, asked: FocusBack): () => void {
	let held = triggerOf(list, asked)
	held.focus()
	if (held === list) {
		return stopNothing
	}
	const redrawn = new MutationObserver((records) => {
		if (!tookOff(records, held)) {
			return
		}
		held = triggerOf(list, asked)
		held.focus()
		if (held === list) {
			stop()
		}
	})
	const moved = (event: Event) => {
		if (!held.contains(event.target as Node)) {
			stop()
		}
	}
	const stop = () => {
		redrawn.disconnect()
		document.removeEventListener('focusin', moved, true)
		document.removeEventListener('pointerdown', moved, true)
	}
	redrawn.observe(list, { childList: true, subtree: true })
	document.addEventListener('focusin', moved, true)
	document.addEventListener('pointerdown', moved, true)
	return stop
}

/**
 * Returns the handler putting a focus the page lost back on the trigger a list dialog opened from, once drawn again.
 * @param busy - Whether the list reads its items again, its cards and rows then out of reach of the focus.
 * @param region - The list region, whose cells carry the `data-item-id` mark, none while the screen draws no list.
 * @returns The handler, given the id of the item and the trigger the dialog opened from.
 */
export function useFocusBack(
	busy: boolean,
	region: RefObject<HTMLElement | null>,
): (id: string, trigger: Trigger) => void {
	const [asked, setAsked] = useState<FocusBack>()
	const handled = useRef<FocusBack>(undefined)
	const keeping = useRef(stopNothing)
	useEffect(() => () => keeping.current(), [])
	useEffect(() => {
		if (busy || asked === handled.current) {
			return
		}
		handled.current = asked
		const list = region.current
		if (list !== null && document.activeElement === document.body) {
			keeping.current = keepFocusOn(list, asked as FocusBack)
		}
	}, [asked, busy, region])
	return useCallback((id: string, trigger: Trigger) => {
		keeping.current()
		setAsked({ id, trigger })
	}, [])
}
