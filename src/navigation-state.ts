// SPDX-License-Identifier: Apache-2.0

import { createContext } from 'react'
import type { MouseEvent, ReactElement } from 'react'

/** Tells whether the reader holds a capability. */
export type Can = (capability: string) => boolean

/** Which way the sidebar moved: into a sub menu, or back out of one. */
export type Direction = 'forward' | 'backward'

/** A move a drilldown row or Back makes, read once by the screen it lands on. */
export interface Move {
	/** Which way the move goes. */
	direction: Direction
	/** The pathname and search the move goes to. */
	address: string
	/** The drilldown row a forward move leaves, or the row a backward move returns to. */
	rowId?: string
}

/** What the sidebar parts record about a move, read once by the menu and the drawer. */
export interface NavigationState {
	/** The move a drilldown row or Back made, until a screen lands from it. */
	move?: Move
	/** The id of the drilldown row that opened the sub menu shown, for Back to focus. */
	openedFrom?: string
	/** The address the phone drawer stays open on, until the next page change. */
	drawerStaysOn?: string
}

/** The state the sidebar parts share, which a Frame.Root creates and provides. */
export const NavigationStateContext = createContext<NavigationState | undefined>(undefined)

/** What a Navigation hands each screen it draws. */
export interface ScreenState {
	/** Whether the screen is the root screen, drawn from the menu items. */
	isRoot?: boolean
	/** The app's link to the list its home address lands on, where Back on a sub menu goes. */
	home?: ReactElement<Record<string, unknown>>
	/** The app's check of a capability, read by every row inside. */
	can?: Can
	/** Returns the pathname and search an app's router link goes to, undefined when it is the one already open. */
	targetOf?: (link: ReactElement<Record<string, unknown>>) => string | undefined
}

/** The screen a sidebar part sits in, empty outside a Navigation. */
export const ScreenContext = createContext<ScreenState>({})

/** Whether a row with no icon draws a 24px placeholder in its place. */
export const IconPlaceholderContext = createContext(false)

/**
 * Creates the state of a frame with no move recorded.
 * @returns The state.
 */
export function createNavigationState(): NavigationState {
	return {}
}

/** The link targets that open in the same tab, as TanStack's Link reads them. */
const SAME_TAB = ['', '_self']

/**
 * Tells whether a click follows its link in the same tab, as the router follows it.
 * @param event - The click.
 * @returns Whether it is a main button click with no modifier key, not stopped, on a link that opens in this tab.
 */
export function isPlainClick(event: MouseEvent): boolean {
	return (
		event.button === 0 &&
		!event.defaultPrevented &&
		!(event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) &&
		SAME_TAB.includes(event.currentTarget.getAttribute('target') ?? '')
	)
}

/**
 * Records a move into a sub menu from a drilldown row, unless the row goes nowhere.
 * @param state - The state of the frame.
 * @param rowId - The id of the row.
 * @param address - The pathname and search the row goes to, undefined when it is the one already open.
 */
export function recordDrilldown(state: NavigationState, rowId: string, address: string | undefined): void {
	if (address !== undefined) {
		state.move = { direction: 'forward', address, rowId }
		state.drawerStaysOn = address
	}
}

/**
 * Records a move back out of a sub menu, unless Back goes nowhere.
 * @param state - The state of the frame.
 * @param address - The pathname and search Back goes to, undefined when it is the one already open.
 */
export function recordBack(state: NavigationState, address: string | undefined): void {
	if (address !== undefined) {
		state.move = { direction: 'backward', address }
		state.drawerStaysOn = address
	}
}

/**
 * Reads once the move a new screen lands from, when the screen's address is the one the move went to.
 * @param state - The state of the frame.
 * @param address - The pathname and search the screen landed on.
 * @returns The move, a backward one with the row it returns to, or undefined when the screen came from anywhere else.
 */
export function takeMove(state: NavigationState, address: string): Move | undefined {
	const { move, openedFrom } = state
	state.move = undefined
	state.openedFrom = undefined
	if (move?.address !== address) {
		return undefined
	}
	if (move.direction === 'forward') {
		state.openedFrom = move.rowId
		return move
	}
	return { ...move, rowId: openedFrom }
}

/**
 * Forgets a move that kept the screen.
 * @param state - The state of the frame.
 */
export function forgetUnusedMove(state: NavigationState): void {
	state.move = undefined
}

/**
 * Reads once whether the phone drawer stays open on the page just opened.
 * @param state - The state of the frame.
 * @param location - The location the frame shows now.
 * @returns Whether a drilldown row or Back went to that location.
 */
export function takeDrawerStays(state: NavigationState, location: string | undefined): boolean {
	const stays = location !== undefined && state.drawerStaysOn === location
	state.drawerStaysOn = undefined
	return stays
}
