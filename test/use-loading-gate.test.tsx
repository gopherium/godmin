// SPDX-License-Identifier: Apache-2.0

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { useLoadingGate } from '../src/use-loading-gate.js'

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
})

afterEach(() => {
	vi.useRealTimers()
})

test('stays hidden through a fast load', () => {
	const { result, rerender } = renderHook(({ pending }) => useLoadingGate(pending), {
		initialProps: { pending: true },
	})

	act(() => vi.advanceTimersByTime(199))
	rerender({ pending: false })
	act(() => vi.advanceTimersByTime(2000))

	expect(result.current).toBe(false)
})

test('shows only after the delay', () => {
	const { result } = renderHook(({ pending }) => useLoadingGate(pending), {
		initialProps: { pending: true },
	})

	expect(result.current).toBe(false)
	act(() => vi.advanceTimersByTime(200))

	expect(result.current).toBe(true)
})

test('holds the ghost for the minimum once shown', () => {
	const { result, rerender } = renderHook(({ pending }) => useLoadingGate(pending), {
		initialProps: { pending: true },
	})
	act(() => vi.advanceTimersByTime(200))

	rerender({ pending: false })
	act(() => vi.advanceTimersByTime(499))
	expect(result.current).toBe(true)

	act(() => vi.advanceTimersByTime(1))
	expect(result.current).toBe(false)
})

test('hides at once when the minimum already passed', () => {
	const { result, rerender } = renderHook(({ pending }) => useLoadingGate(pending), {
		initialProps: { pending: true },
	})
	act(() => vi.advanceTimersByTime(900))

	rerender({ pending: false })
	act(() => vi.advanceTimersByTime(0))

	expect(result.current).toBe(false)
})

test('a new load starts the cycle again', () => {
	const { result, rerender } = renderHook(({ pending }) => useLoadingGate(pending), {
		initialProps: { pending: true },
	})
	act(() => vi.advanceTimersByTime(900))
	rerender({ pending: false })
	act(() => vi.advanceTimersByTime(100))

	rerender({ pending: true })
	act(() => vi.advanceTimersByTime(199))
	expect(result.current).toBe(false)

	act(() => vi.advanceTimersByTime(1))
	expect(result.current).toBe(true)
})
