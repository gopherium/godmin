import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

import { act, render, renderHook, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { EDGE_BREAKPOINT, SHEET_BREAKPOINT, TITLE_BREAKPOINT } from '../src/breakpoints.js'
import { installTestEnvironment, setViewport } from '../src/testing.js'
import type { TestViewport } from '../src/testing.js'
import { useMediaQuery } from '../src/use-media-query.js'

installTestEnvironment()

/** The side of a breakpoint the WordPress viewport hook asks about. */
type Operator = '<' | '>='

const require = createRequire(import.meta.url)
const besideDataViews = createRequire(require.resolve('@wordpress/dataviews/package.json'))
const composeBuild = join(dirname(besideDataViews.resolve('@wordpress/compose/package.json')), 'build-module')

/** The WordPress viewport hook DataViews and the components modal read a breakpoint through. */
const { default: useViewportMatch } = (await import(join(composeBuild, 'hooks/use-viewport-match/index.mjs'))) as {
	default: (breakpoint: string, operator?: Operator) => boolean
}

/**
 * Answers a media query at the given width.
 * @param width - The viewport width in pixels.
 * @param media - The media query text.
 * @returns Whether the query matches at that width.
 */
function matchesAt(width: number, media: string): boolean {
	setViewport({ width })
	return window.matchMedia(media).matches
}

test('reports no match until a test says otherwise', () => {
	expect(window.matchMedia('(max-width: 1023px)').matches).toBe(false)
})

test('reports a match once the viewport is set', () => {
	setViewport({ matches: true })

	expect(window.matchMedia('(max-width: 1023px)').matches).toBe(true)
})

test('resets between tests so one cannot leak into the next', () => {
	expect(window.matchMedia('(max-width: 1023px)').matches).toBe(false)
})

test('tells listeners the viewport changed', () => {
	const seen: boolean[] = []
	const list = window.matchMedia('(max-width: 1023px)')
	list.addEventListener('change', () => seen.push(list.matches))

	setViewport({ matches: true })
	setViewport({ matches: false })

	expect(seen).toEqual([true, false])
})

test('stops telling a listener that removed itself', () => {
	const seen: boolean[] = []
	const list = window.matchMedia('(max-width: 1023px)')
	const listener = () => seen.push(list.matches)
	list.addEventListener('change', listener)
	list.removeEventListener('change', listener)

	setViewport({ matches: true })

	expect(seen).toEqual([])
})

test('answers a max-width query by the width it was given, the bound itself included', () => {
	expect(matchesAt(599, '(max-width: 599px)')).toBe(true)
	expect(matchesAt(600, '(max-width: 599px)')).toBe(false)
})

test('answers a min-width query by the width it was given, the bound itself included', () => {
	expect(matchesAt(600, '(min-width: 600px)')).toBe(true)
	expect(matchesAt(599, '(min-width: 600px)')).toBe(false)
})

test('answers a band joined with and only inside both bounds', () => {
	const band = '(min-width: 404px) and (max-width: 599px)'

	expect([403, 404, 599, 600].map((width) => matchesAt(width, band))).toEqual([false, true, true, false])
})

test('answers a query list when any of its queries matches', () => {
	const ends = '(max-width: 403px), (min-width: 782px)'

	expect([390, 500, 1280].map((width) => matchesAt(width, ends))).toEqual([true, false, true])
})

test('reads a width written with a fraction or without spaces', () => {
	expect(matchesAt(599, '(max-width:599.98px)')).toBe(true)
	expect(matchesAt(600, '(max-width:599.98px)')).toBe(false)
})

test('answers a query for a screen or for every medium by the width, as a browser on a screen does', () => {
	expect(matchesAt(390, 'screen and (max-width: 599px)')).toBe(true)
	expect(matchesAt(600, 'screen and (max-width: 599px)')).toBe(false)
	expect(matchesAt(600, 'only screen and (min-width: 600px)')).toBe(true)
	expect(matchesAt(599, 'only screen and (min-width: 600px)')).toBe(false)
	expect(matchesAt(390, 'all and (max-width: 599px)')).toBe(true)
	expect(matchesAt(390, 'screen')).toBe(true)
})

test('answers the query the WordPress viewport hook asks at the edge breakpoint, the bound included', () => {
	const wordpressNarrow = 'screen and (max-width: 782px)'

	expect([390, 782, 783].map((width) => matchesAt(width, wordpressNarrow))).toEqual([true, true, false])
})

test('reports no match for print, a negated query, a width in em or a feature other than the width', () => {
	expect(matchesAt(390, 'print and (max-width: 599px)')).toBe(false)
	expect(matchesAt(390, 'not screen and (max-width: 599px)')).toBe(false)
	expect(matchesAt(390, '(max-width: 40em)')).toBe(false)
	expect(matchesAt(390, '(prefers-reduced-motion: reduce)')).toBe(false)
})

test('tells the WordPress viewport hook which side of a breakpoint the width lies, as DataViews asks', () => {
	const { result, rerender } = renderHook(({ operator }) => useViewportMatch('medium', operator), {
		initialProps: { operator: '<' as Operator },
	})
	const across = () =>
		[390, 782, 783].map((width) => {
			act(() => setViewport({ width }))
			return result.current
		})

	const narrow = across()
	rerender({ operator: '>=' })
	const wide = across()

	expect(narrow).toEqual([true, true, false])
	expect(wide).toEqual([false, true, true])
})

test('places a width in the band between the title and the sheet breakpoints', () => {
	setViewport({ width: 500 })

	expect(window.matchMedia(`(max-width: ${TITLE_BREAKPOINT - 1}px)`).matches).toBe(false)
	expect(window.matchMedia(`(max-width: ${SHEET_BREAKPOINT - 1}px)`).matches).toBe(true)
	expect(window.matchMedia(`(max-width: ${EDGE_BREAKPOINT - 1}px)`).matches).toBe(true)
})

test('places a width in the band between the sheet and the edge breakpoints', () => {
	setViewport({ width: 700 })

	expect(window.matchMedia(`(max-width: ${SHEET_BREAKPOINT - 1}px)`).matches).toBe(false)
	expect(window.matchMedia(`(max-width: ${EDGE_BREAKPOINT - 1}px)`).matches).toBe(true)
})

test('re-renders a component reading a query once the width crosses it', () => {
	const { result } = renderHook(() => useMediaQuery(`(max-width: ${SHEET_BREAKPOINT - 1}px)`))
	expect(result.current).toBe(false)

	act(() => setViewport({ width: 390 }))
	expect(result.current).toBe(true)

	act(() => setViewport({ width: 700 }))
	expect(result.current).toBe(false)
})

test('forgets the width the last test left, so every query reports no match again', () => {
	expect(window.matchMedia('(min-width: 600px)').matches).toBe(false)
	expect(window.matchMedia('(max-width: 599px)').matches).toBe(false)
})

test('answers every query alike again once told to match', () => {
	setViewport({ width: 1280 })

	setViewport({ matches: true })

	expect(window.matchMedia('(max-width: 403px)').matches).toBe(true)
})

test('lets a helper of the test name the viewport it hands on by its type', () => {
	const phone: TestViewport = { width: 390 }
	const everyQuery: TestViewport = { matches: true }

	setViewport(phone)
	const wideAtPhone = window.matchMedia('(min-width: 600px)').matches
	setViewport(everyQuery)

	expect(wideAtPhone).toBe(false)
	expect(window.matchMedia('(min-width: 600px)').matches).toBe(true)
})

test('renders into a fresh document', () => {
	render(<p>first render</p>)

	expect(screen.queryAllByText(/render/)).toHaveLength(1)
})

test('leaves no rendered tree behind for the next test', () => {
	render(<p>second render</p>)

	expect(screen.queryAllByText(/render/)).toHaveLength(1)
})
