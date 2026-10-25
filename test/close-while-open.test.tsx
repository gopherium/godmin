// SPDX-License-Identifier: Apache-2.0

import { renderHook } from '@testing-library/react'
import { StrictMode } from 'react'
import { expect, test, vi } from 'vitest'

import { useCloseWhileOpen } from '../src/index'
import { installTestEnvironment } from '../src/testing.js'

installTestEnvironment()

test('closes the dialog while its body is on screen', () => {
	const close = vi.fn()
	const { result } = renderHook(() => useCloseWhileOpen(close))

	result.current()

	expect(close).toHaveBeenCalledOnce()
})

test('closes nothing once its body left the screen, so a dialog opened since stays open', () => {
	const close = vi.fn()
	const { result, unmount } = renderHook(() => useCloseWhileOpen(close))
	const held = result.current
	unmount()

	held()

	expect(close).not.toHaveBeenCalled()
})

test('closes the dialog while its body is on screen under strict mode, which mounts it twice', () => {
	const close = vi.fn()
	const { result } = renderHook(() => useCloseWhileOpen(close), { wrapper: StrictMode })

	result.current()

	expect(close).toHaveBeenCalledOnce()
})

test('does nothing for a body drawn outside a dialog, handed no close', () => {
	const { result } = renderHook(() => useCloseWhileOpen(undefined))

	expect(() => result.current()).not.toThrow()
})
