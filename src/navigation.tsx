// SPDX-License-Identifier: Apache-2.0

import { useRouter, useRouterState } from '@tanstack/react-router'
import { Suspense, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ComponentType, ReactElement, ReactNode } from 'react'

import type { MenuItem } from './menu-item.js'
import { NavigationList } from './navigation-list.js'
import { NavigationScreen } from './navigation-screen.js'
import { NavigationStateContext, ScreenContext, forgetUnusedMove, takeMove } from './navigation-state.js'
import type { Can, Direction, Move, NavigationState } from './navigation-state.js'
import { findMoveTarget, findSidebarMatch, locationAddress } from './path-matching.js'
import type { RowAddress } from './path-matching.js'

/** The key of the root screen, shown when no matched route declares a Sidebar. */
const ROOT_KEY = 'root'

/** The class of the keyed wrapper a screen slides in, the Site Editor's name for it. */
const WRAPPER = 'godmin-navigation__screen-wrapper'

/** The error Navigation throws with no Frame.Root above it. */
const NO_FRAME = 'Navigation must sit inside a Frame.Root, which holds the moves its screens share.'

/** The controls the Tab key reaches, the ones a screen may focus after a move. */
const TABBABLE = [
	'a[href]',
	'button:not(:disabled)',
	'input:not(:disabled):not([type="hidden"])',
	'select:not(:disabled)',
	'textarea:not(:disabled)',
	'[tabindex]',
]
	.map((control) => `${control}:not([tabindex="-1"])`)
	.join(', ')

export interface NavigationProps {
	/** The title of the root screen, the brand. */
	title: ReactNode
	/** The rows of the root screen. */
	items: readonly MenuItem[]
	/** The app's link to the list its home address lands on. Back on a sub menu goes there. */
	home: ReactElement<Record<string, unknown>>
	/**
	 * Tells whether the reader holds a capability, for every row inside.
	 * When absent, a row that names a capability is hidden.
	 */
	can?: Can
}

/** The sidebar screen the current address shows. */
interface SidebarParent {
	/** The id of the deepest matched route that declares a Sidebar, or root. */
	key: string
	/** That route's Sidebar, undefined on the root screen. */
	Sidebar: ComponentType | undefined
}

/**
 * Returns the sidebar screen the current address shows, keyed by its route alone.
 * @returns The screen's key and its Sidebar.
 */
function useSidebarParent(): SidebarParent {
	const key = useRouterState({ select: (state): string => findSidebarMatch(state.matches)?.routeId ?? ROOT_KEY })
	const Sidebar = useRouterState({ select: (state) => findSidebarMatch(state.matches)?.staticData.Sidebar })
	return { key, Sidebar }
}

/**
 * Returns the address of the deepest matched route.
 * @returns Its pathname and search.
 */
function useMatchedAddress(): string {
	return useRouterState({
		select: (state) =>
			state.matches
				.slice(-1)
				.map((deepest) => deepest.pathname + JSON.stringify(deepest.search))
				.join(),
	})
}

/**
 * Returns the moves the Frame.Root above records.
 * @returns The state of the frame.
 */
function useFrameState(): NavigationState {
	const state = useContext(NavigationStateContext)
	if (state === undefined) {
		throw new Error(NO_FRAME)
	}
	return state
}

/**
 * Forgets a move whose routes matched without a change of screen.
 * @param state - The state of the frame.
 * @param key - The key of the screen shown.
 */
function useForgetUnusedMove(state: NavigationState, key: string): void {
	const address = useMatchedAddress()
	const shown = useRef(key)
	useEffect(() => {
		if (shown.current === key) {
			forgetUnusedMove(state)
		}
		shown.current = key
	}, [state, key, address])
}

/**
 * Finds the drilldown row a backward move returns to.
 * @param move - The move the screen landed from.
 * @returns The row link, or null on a forward move or when the row is gone.
 */
function rowCameFrom(move: Move): HTMLElement | null {
	if (move.direction !== 'backward' || move.rowId === undefined) {
		return null
	}
	return document.getElementById(move.rowId)
}

/**
 * Finds what a screen focuses after a move: the row the reader came from on the way back,
 * else its Back, else the first control the Tab key reaches, else the screen wrapper itself.
 * @param wrapper - The keyed wrapper of the screen.
 * @param move - The move the screen landed from.
 * @returns The element to focus.
 */
function focusAfterMove(wrapper: HTMLElement, move: Move): HTMLElement {
	return (
		rowCameFrom(move) ??
		wrapper.querySelector<HTMLElement>('.godmin-navigation-screen__back') ??
		wrapper.querySelector<HTMLElement>(TABBABLE) ??
		wrapper
	)
}

/**
 * Renders the keyed wrapper of one screen, which slides in and takes focus after a move from a drilldown row or Back.
 * @param props - The state of the frame and the screen.
 * @returns The wrapper element.
 */
function ScreenWrapper({ state, children }: { state: NavigationState; children: ReactNode }) {
	const router = useRouter()
	const wrapper = useRef<HTMLDivElement>(null)
	const [direction, setDirection] = useState<Direction>()
	useLayoutEffect(() => {
		const move = takeMove(state, locationAddress(router.latestLocation))
		if (move !== undefined) {
			focusAfterMove(wrapper.current as HTMLDivElement, move).focus()
			setDirection(move.direction)
		}
	}, [state, router])
	return (
		<div
			ref={wrapper}
			tabIndex={-1}
			className={direction === undefined ? WRAPPER : `${WRAPPER} ${WRAPPER}--${direction}`}
		>
			{children}
		</div>
	)
}

/**
 * Renders the sidebar menu, as WordPress's new admin names it: the root screen drawn from its title and rows,
 * or the Sidebar screen of the deepest matched route, keyed by that route alone and sliding in on a move.
 * @param props - The root title and rows, the app's home and its check of a capability.
 * @returns The sidebar menu element.
 */
export function Navigation({ title, items, home, can }: NavigationProps) {
	const router = useRouter()
	const state = useFrameState()
	const { key, Sidebar } = useSidebarParent()
	useForgetUnusedMove(state, key)
	const screen = useMemo(
		() => ({
			isRoot: Sidebar === undefined,
			home,
			can,
			targetOf: (link: ReactElement<Record<string, unknown>>) => findMoveTarget(router, link.props as RowAddress),
		}),
		[Sidebar, home, can, router],
	)
	return (
		<div className="godmin-navigation">
			<ScreenContext.Provider value={screen}>
				<Suspense fallback={null}>
					<ScreenWrapper key={key} state={state}>
						{Sidebar === undefined ? (
							<NavigationScreen title={title}>
								<NavigationList items={items} />
							</NavigationScreen>
						) : (
							<Sidebar />
						)}
					</ScreenWrapper>
				</Suspense>
			</ScreenContext.Provider>
		</div>
	)
}
