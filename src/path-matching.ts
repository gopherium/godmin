// SPDX-License-Identifier: Apache-2.0

import type { AnyRouter, StaticDataRouteOption, ToOptions } from '@tanstack/react-router'

/** Where a row goes, as a TanStack Link names it: to, with its params, search and hash. */
export type RowAddress = Pick<ToOptions, 'to' | 'from' | 'params' | 'search' | 'hash'>

/** A matched route as the sidebar reads it. */
export interface SidebarMatch {
	/** The id of the route. */
	routeId: string
	/** The static data the route declares. */
	staticData: StaticDataRouteOption
}

/** What the routes an address opens declare. */
interface AddressRoutes {
	/** The id of the deepest route that declares a Sidebar, undefined when none does. */
	drilldownParent: string | undefined
	/** The capability of every route the address opens, outermost first. */
	capabilities: readonly string[]
}

/** Where a row goes and what the routes it opens declare. */
export interface RowRoutes extends AddressRoutes {
	/** The href the router builds for the address, its hash included. */
	href: string
	/** The pathname and search of the address, the form a frame watches its location in. */
	address: string
}

/** What the lookups made on one location keep. */
interface Kept {
	/** The rows of the addresses that name only where they go, by that to. */
	rows: Map<string, RowRoutes>
	/** What the routes of each pathname declare. */
	routes: Map<string, AddressRoutes>
}

/** The answer for an address that leaves the site, which opens no route. */
const offSite: AddressRoutes = { drilldownParent: undefined, capabilities: [] }

/** A URL scheme at the start of an address. */
const scheme = /^[a-z][a-z\d+.-]*:/i

/** The lookups kept for each location a router has been on. */
const kept = new WeakMap<object, Kept>()

/**
 * Finds the deepest match whose route declares a Sidebar.
 * @param matches - The matched routes, outermost first.
 * @returns That match, or undefined when no route declares one.
 */
export function findSidebarMatch<T extends SidebarMatch>(matches: readonly T[]): T | undefined {
	return matches.findLast((match) => match.staticData.Sidebar !== undefined)
}

/**
 * Returns the pathname and search of a location, the form a frame watches its location in.
 * @param location - The location.
 * @returns The pathname followed by the search.
 */
export function locationAddress(location: { pathname: string; searchStr: string }): string {
	return location.pathname + location.searchStr
}

/**
 * Returns the lookups kept for the location a router is on now.
 * @param router - The router the addresses resolve on.
 * @returns The lookups of that location.
 */
function keptOn(router: AnyRouter): Kept {
	let found = kept.get(router.latestLocation)
	if (found === undefined) {
		found = { rows: new Map(), routes: new Map() }
		kept.set(router.latestLocation, found)
	}
	return found
}

/**
 * Returns the to of an address that names nothing else, the key its row is kept under.
 * @param address - Where the row goes.
 * @returns The to, or undefined when the address also names a from, params, a search or a hash.
 */
function plainTo(address: RowAddress): string | undefined {
	const { to, from, params, search, hash } = address
	return from === undefined && params === undefined && search === undefined && hash === undefined ? to : undefined
}

/**
 * Works out what the routes of a pathname declare, once per pathname and location.
 * @param router - The router the pathname resolves on.
 * @param routes - The answers kept for the location.
 * @param location - The pathname and the search of the built address.
 * @returns The deepest route with a Sidebar and the capability of every route.
 */
function routesOfPath(
	router: AnyRouter,
	routes: Map<string, AddressRoutes>,
	location: { pathname: string; search: Record<string, unknown> },
): AddressRoutes {
	const known = routes.get(location.pathname)
	if (known !== undefined) {
		return known
	}
	const matches = router.matchRoutes(location.pathname, location.search)
	const answer: AddressRoutes = {
		drilldownParent: findSidebarMatch(matches)?.routeId,
		capabilities: matches.flatMap((match) => match.staticData.capability ?? []),
	}
	routes.set(location.pathname, answer)
	return answer
}

/**
 * Builds an address and works out what the routes it opens declare.
 * @param router - The router the address resolves on.
 * @param found - The lookups kept for the location.
 * @param address - Where the row goes.
 * @returns The row.
 */
function buildRow(router: AnyRouter, found: Kept, address: RowAddress): RowRoutes {
	const built = router.buildLocation(address)
	return { href: built.href, address: locationAddress(built), ...routesOfPath(router, found.routes, built) }
}

/**
 * Finds where a row goes and what the routes it opens declare, once per address and location.
 * @param router - The router the address resolves on.
 * @param address - Where the row goes.
 * @returns The row, with no route for an address that leaves the site.
 */
export function findRowRoutes(router: AnyRouter, address: RowAddress): RowRoutes {
	if (typeof address.to === 'string' && scheme.test(address.to)) {
		return { ...offSite, href: address.to, address: address.to }
	}
	const found = keptOn(router)
	const key = plainTo(address)
	const known = key === undefined ? undefined : found.rows.get(key)
	if (known !== undefined) {
		return known
	}
	const row = buildRow(router, found, address)
	if (key !== undefined) {
		found.rows.set(key, row)
	}
	return row
}

/**
 * Finds the sub menu screen a row's address opens, the deepest route it matches that declares a Sidebar.
 * @param router - The router the address resolves on.
 * @param address - Where the row goes.
 * @returns That route's id, or undefined when no route declares one or the address leaves the site.
 */
export function findDrilldownParent(router: AnyRouter, address: RowAddress): string | undefined {
	return findRowRoutes(router, address).drilldownParent
}

/**
 * Returns the capability of every route a row's address opens, parents included.
 * @param router - The router the address resolves on.
 * @param address - Where the row goes.
 * @returns The capabilities, outermost route first, none when the address leaves the site.
 */
export function findRouteCapabilities(router: AnyRouter, address: RowAddress): readonly string[] {
	return findRowRoutes(router, address).capabilities
}

/**
 * Finds the pathname and search a link moves the reader to.
 * @param router - The router the address resolves on.
 * @param address - Where the link goes.
 * @returns That address, or undefined when it is the one already open.
 */
export function findMoveTarget(router: AnyRouter, address: RowAddress): string | undefined {
	const target = findRowRoutes(router, address).address
	return target === locationAddress(router.latestLocation) ? undefined : target
}
