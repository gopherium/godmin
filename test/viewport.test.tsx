import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { installTestEnvironment, setViewport } from '../src/testing.js'

installTestEnvironment()

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

test('renders into a fresh document', () => {
	render(<p>first render</p>)

	expect(screen.queryAllByText(/render/)).toHaveLength(1)
})

test('leaves no rendered tree behind for the next test', () => {
	render(<p>second render</p>)

	expect(screen.queryAllByText(/render/)).toHaveLength(1)
})
