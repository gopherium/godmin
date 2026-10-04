// SPDX-License-Identifier: Apache-2.0

import { speak } from '@wordpress/a11y'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, useEffect } from 'react'
import { afterEach, beforeEach, expect, onTestFinished, test, vi } from 'vitest'

import manifest from '../package.json'
import { getAnnouncement, installTestEnvironment, renderAdmin } from '../src/testing.js'
import { Toaster, useToaster } from '../src/toaster.js'
import type { ToasterHandle } from '../src/toaster.js'

vi.mock('@wordpress/a11y', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@wordpress/a11y')>()
	return { ...actual, speak: vi.fn(actual.speak) }
})

installTestEnvironment()
beforeEach(() => {
	vi.mocked(speak).mockClear()
})
afterEach(() => {
	vi.useRealTimers()
	Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
})

/**
 * Renders a button that raises a toast when pressed.
 * @param props - The message and optional action the toast carries.
 * @returns The trigger element.
 */
function Raise({ message, action }: { message: string; action?: { label: string; onAct: () => void } }) {
	const toaster = useToaster()
	return (
		<button type="button" onClick={() => toaster.show(message, action)}>
			Raise
		</button>
	)
}

/**
 * Hands the toaster handle out once rendered, so a test can keep it past the region.
 * @param props - The handler taking the handle.
 * @returns Nothing visible.
 */
function Keep({ onHandle }: { onHandle: (handle: ToasterHandle) => void }) {
	const toaster = useToaster()
	useEffect(() => {
		onHandle(toaster)
	}, [toaster, onHandle])
	return null
}

/**
 * Makes every element report one running fade until a returned call settles it.
 * @returns The calls that finish the fade or cut it short, each waiting for the region to catch up.
 */
function holdFade(): { finish: () => Promise<void>, cutShort: () => Promise<void> } {
	let resolve = () => {}
	let reject = () => {}
	const finished = new Promise<void>((done, fail) => {
		resolve = done
		reject = () => fail(new Error('The fade was cut short.'))
	})
	finished.catch(() => undefined)
	Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
		configurable: true,
		value: () => [{ finished }],
	})
	const settle = (end: () => void) =>
		act(async () => {
			end()
			await new Promise((wait) => setTimeout(wait, 0))
		})
	return { finish: () => settle(resolve), cutShort: () => settle(reject) }
}

test('loads where the platform offers no grapheme splitter', async () => {
	const held = Object.getOwnPropertyDescriptor(Intl, 'Segmenter') as PropertyDescriptor
	Reflect.deleteProperty(Intl, 'Segmenter')
	onTestFinished(() => {
		Object.defineProperty(Intl, 'Segmenter', held)
	})
	vi.resetModules()

	await expect(import('../src/toaster.js')).resolves.toHaveProperty('Toaster')
})

test('shows a message once a screen raises one', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByText('Post moved to trash')).not.toBeNull()
})

test('announces the message rather than the buttons beside it', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(getAnnouncement()).toContain('Post moved to trash')
	expect(getAnnouncement()).not.toContain('Undo')
})

test('announces each message once, politely, when a screen raises it', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

	expect(speak).toHaveBeenCalledOnce()
	expect(speak).toHaveBeenCalledWith('Post moved to trash', 'polite')
})

test('asks the application for the announcer, so the page keeps one live region', () => {
	const peers: Record<string, string> = manifest.peerDependencies

	expect(peers['@wordpress/a11y']).toBe('>=4.56.0 <5.0.0')
	expect(manifest.devDependencies['@wordpress/a11y']).toBe('4.56.0')
})

test('leaves the toast region silent, since the live region already spoke', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	const region = container.querySelector('.godmin-toasts')
	expect(region).not.toBeNull()
	expect(region?.querySelector('[aria-live], [role="status"], [role="alert"]')).toBeNull()
	expect(region?.hasAttribute('aria-live')).toBe(false)
})

test('draws a plain toast as one snackbar button inside the toast region', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	const toast = screen.getByRole('button', { name: 'Saved' })
	expect(toast.classList.contains('godmin-toast')).toBe(true)
	expect(toast.classList.contains('godmin-toast--plain')).toBe(true)
	expect(toast.parentElement?.classList.contains('godmin-toasts')).toBe(true)
})

test('clears a plain toast on a click anywhere on it', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Saved' }))

	expect(screen.queryByText('Saved')).toBeNull()
})

test('clears only the toast the reader clicked and keeps the others', () => {
	renderAdmin(
		<Toaster>
			<Raise message="First" />
			<Raise message="Second" />
		</Toaster>,
	)
	for (const raise of screen.getAllByRole('button', { name: 'Raise' })) {
		fireEvent.click(raise)
	}

	fireEvent.click(screen.getByRole('button', { name: 'First' }))

	expect(screen.queryByText('First')).toBeNull()
	expect(screen.getByRole('button', { name: 'Second' })).not.toBeNull()
})

test('offers no close button on a plain toast', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
	expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull()
})

test('tells the reader a click clears a plain toast', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByRole('button', { name: 'Saved', description: 'Dismiss' })).not.toBeNull()
})

test('tells the reader a click clears a plain toast in the words the application gives', () => {
	renderAdmin(
		<Toaster dismissLabel="Close">
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByRole('button', { name: 'Saved', description: 'Close' })).not.toBeNull()
})

test('draws a toast with an action as the message, the action and a close button, in that order', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	const toast = screen.getByText('Post moved to trash').parentElement
	expect(toast?.classList.contains('godmin-toast')).toBe(true)
	expect(toast?.parentElement?.classList.contains('godmin-toasts')).toBe(true)
	expect([...(toast?.children ?? [])].map((part) => part.className)).toEqual([
		'godmin-toast__message',
		'godmin-toast__action',
		'godmin-toast__dismiss',
	])
})

test('keeps a toast with an action from being a button itself, so no button sits inside another', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.queryByRole('button', { name: /Post moved to trash/ })).toBeNull()
	expect(container.querySelector('button button, [role="button"] button')).toBeNull()
})

test('draws the close button as the cross the snackbar shows, named by its label rather than the cross', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	const close = screen.getByRole('button', { name: 'Dismiss' })
	expect(close.textContent).toBe('✕')
	expect(close.querySelector('svg')).toBeNull()
})

test('shows no tooltip on a plain toast, as the snackbar shows none', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByRole('button', { name: 'Saved' }).hasAttribute('title')).toBe(false)
})

test('keeps the hint of a plain toast out of the toast region, so the region holds only toasts', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	const region = container.querySelector('.godmin-toasts')
	expect([...(region?.children ?? [])].map((toast) => toast.textContent)).toEqual(['Saved'])
	expect(screen.getByText('Dismiss').hidden).toBe(true)
})

test('runs the action and clears the toast that offered it', () => {
	const onAct = vi.fn()
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

	expect(onAct).toHaveBeenCalledOnce()
	expect(screen.queryByText('Post moved to trash')).toBeNull()
})

test('clears a toast with an action through its close button without running the action', () => {
	const onAct = vi.fn()
	renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

	expect(onAct).not.toHaveBeenCalled()
	expect(screen.queryByText('Post moved to trash')).toBeNull()
})

test('names the close button as the application asks', () => {
	renderAdmin(
		<Toaster dismissLabel="Close">
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByRole('button', { name: 'Close' })).not.toBeNull()
	expect(screen.queryByRole('button', { name: 'Dismiss' })).toBeNull()
})

test('keeps a leaving toast on screen until its fade ends, and lets nobody press it meanwhile', async () => {
	const fade = holdFade()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Saved' }))

	const leaving = screen.getByText('Saved')
	expect(leaving.classList.contains('godmin-toast--leaving')).toBe(true)
	expect(leaving.hasAttribute('inert')).toBe(true)

	await fade.finish()

	expect(screen.queryByText('Saved')).toBeNull()
})

test('clears a leaving toast whose fade was cut short', async () => {
	const fade = holdFade()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
	expect(screen.getByText('Saved')).not.toBeNull()

	await fade.cutShort()

	expect(screen.queryByText('Saved')).toBeNull()
})

test('lets nobody press a toast with an action while it fades out', () => {
	holdFade()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

	const leaving = screen.getByText('Saved').parentElement
	expect(leaving?.classList.contains('godmin-toast--leaving')).toBe(true)
	expect(leaving?.hasAttribute('inert')).toBe(true)
})

test('draws a toast that is not leaving without the leaving look', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	const toast = screen.getByRole('button', { name: 'Saved' })
	expect(toast.classList.contains('godmin-toast--leaving')).toBe(false)
	expect(toast.hasAttribute('inert')).toBe(false)
})

test('clears a toast nobody touched once its time is up', () => {
	vi.useFakeTimers()
	renderAdmin(
		<Toaster dismissAfter={5000}>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	expect(screen.getByText('Saved')).not.toBeNull()

	act(() => {
		vi.advanceTimersByTime(5000)
	})

	expect(screen.queryByText('Saved')).toBeNull()
})

test('clears a toast nobody touched after six seconds when the application sets no time', () => {
	vi.useFakeTimers()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	act(() => {
		vi.advanceTimersByTime(5999)
	})
	expect(screen.getByText('Saved')).not.toBeNull()

	act(() => {
		vi.advanceTimersByTime(1)
	})
	expect(screen.queryByText('Saved')).toBeNull()
})

test('keeps three toasts at most when the application sets no limit, dropping the oldest', () => {
	renderAdmin(
		<Toaster>
			<Raise message="First" />
			<Raise message="Second" />
			<Raise message="Third" />
			<Raise message="Fourth" />
		</Toaster>,
	)

	for (const raise of screen.getAllByRole('button', { name: 'Raise' })) {
		fireEvent.click(raise)
	}

	expect(screen.queryByText('First')).toBeNull()
	const shown = screen.getByText('Second').parentElement?.children ?? []
	expect([...shown].map((toast) => toast.textContent)).toEqual(['Second', 'Third', 'Fourth'])
})

test('keeps as many toasts as the application asks', () => {
	renderAdmin(
		<Toaster limit={2}>
			<Raise message="First" />
			<Raise message="Second" />
			<Raise message="Third" />
		</Toaster>,
	)

	for (const raise of screen.getAllByRole('button', { name: 'Raise' })) {
		fireEvent.click(raise)
	}

	expect(screen.queryByText('First')).toBeNull()
	expect(screen.getByText('Second')).not.toBeNull()
	expect(screen.getByText('Third')).not.toBeNull()
})

test('fades out the toast dropped past the limit before it goes', async () => {
	const fade = holdFade()
	renderAdmin(
		<Toaster limit={1}>
			<Raise message="First" />
			<Raise message="Second" />
		</Toaster>,
	)
	const [first, second] = screen.getAllByRole('button', { name: 'Raise' })
	fireEvent.click(first)

	fireEvent.click(second)

	expect(screen.getByText('First').classList.contains('godmin-toast--leaving')).toBe(true)
	expect(screen.getByText('Second').classList.contains('godmin-toast--leaving')).toBe(false)
	await fade.finish()
	expect(screen.queryByText('First')).toBeNull()
})

test('counts only the toasts still showing against the limit, not those fading out', () => {
	holdFade()
	renderAdmin(
		<Toaster limit={2}>
			<Raise message="First" />
			<Raise message="Second" />
			<Raise message="Third" />
		</Toaster>,
	)
	const [first, second, third] = screen.getAllByRole('button', { name: 'Raise' })
	fireEvent.click(first)
	fireEvent.click(second)
	fireEvent.click(screen.getByRole('button', { name: 'Second' }))

	fireEvent.click(third)

	expect(screen.getByText('First').classList.contains('godmin-toast--leaving')).toBe(false)
	expect(screen.getByText('Second').classList.contains('godmin-toast--leaving')).toBe(true)
	expect(screen.getByText('Third').classList.contains('godmin-toast--leaving')).toBe(false)
})

test('forgets the timer of a toast dropped past the limit', () => {
	vi.useFakeTimers()
	renderAdmin(
		<Toaster limit={1}>
			<Raise message="First" />
			<Raise message="Second" />
		</Toaster>,
	)

	const [first, second] = screen.getAllByRole('button', { name: 'Raise' })
	fireEvent.click(first)
	const running = vi.getTimerCount()

	fireEvent.click(second)

	expect(screen.queryByText('First')).toBeNull()
	expect(vi.getTimerCount()).toBe(running)
})

test('forgets the timer of a toast the reader dismissed', () => {
	vi.useFakeTimers()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const running = vi.getTimerCount()

	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

	expect(vi.getTimerCount()).toBe(running - 1)
})

test('forgets the timer of a dismissed toast as soon as it starts fading out', () => {
	holdFade()
	vi.useFakeTimers()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const running = vi.getTimerCount()

	fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

	expect(screen.getByText('Saved')).not.toBeNull()
	expect(vi.getTimerCount()).toBe(running - 1)
})

test('forgets the timer of a toast whose action ran', () => {
	vi.useFakeTimers()
	renderAdmin(
		<Toaster>
			<Raise message="Saved" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const running = vi.getTimerCount()

	fireEvent.click(screen.getByRole('button', { name: 'Undo' }))

	expect(vi.getTimerCount()).toBe(running - 1)
})

test('forgets every timer when the region goes away', () => {
	vi.useFakeTimers()
	const { unmount } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const running = vi.getTimerCount()

	unmount()

	expect(vi.getTimerCount()).toBe(running - 1)
})

test('shows a message a screen raises as it mounts', () => {
	renderAdmin(
		<Toaster>
			<Keep
				onHandle={(handle) => {
					handle.show('Welcome back')
				}}
			/>
		</Toaster>,
	)

	expect(screen.getByText('Welcome back')).not.toBeNull()
})

test('shows a message under strict mode, which mounts the region twice', () => {
	render(
		<StrictMode>
			<Toaster>
				<Raise message="Saved twice over" />
			</Toaster>
		</StrictMode>,
	)

	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))

	expect(screen.getByRole('button', { name: 'Saved twice over' })).not.toBeNull()
})

/**
 * Raises a toast as it mounts, as a screen announcing its arrival does.
 * @returns Nothing visible.
 */
function Greet() {
	const toaster = useToaster()
	useEffect(() => {
		toaster.show('Welcome back')
	}, [toaster])
	return null
}

test('clears a toast raised as a screen mounts under strict mode once its time is up', () => {
	vi.useFakeTimers()
	render(
		<StrictMode>
			<Toaster dismissAfter={5000}>
				<Greet />
			</Toaster>
		</StrictMode>,
	)
	expect(screen.getAllByText('Welcome back').length).toBeGreaterThan(0)

	act(() => {
		vi.advanceTimersByTime(5000)
	})

	expect(screen.queryByText('Welcome back')).toBeNull()
})

test('raises nothing once the region is gone', () => {
	vi.useFakeTimers()
	const handles: ToasterHandle[] = []
	const { unmount } = renderAdmin(
		<Toaster>
			<Keep
				onHandle={(handle) => {
					handles.push(handle)
				}}
			/>
		</Toaster>,
	)
	unmount()
	const running = vi.getTimerCount()

	handles[0].show('Saved')

	expect(vi.getTimerCount()).toBe(running)
	expect(speak).not.toHaveBeenCalled()
})

test('lets go of the timer of a toast whose time ran out, so the region has none left to clear', () => {
	vi.useFakeTimers()
	const { unmount } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	act(() => {
		vi.advanceTimersByTime(6000)
	})
	expect(screen.queryByText('Saved')).toBeNull()
	const cleared = vi.spyOn(globalThis, 'clearTimeout')

	unmount()

	expect(cleared).not.toHaveBeenCalled()
	cleared.mockRestore()
})

test('holds every message raised, the newest at the bottom', () => {
	renderAdmin(
		<Toaster>
			<Raise message="First" />
			<Raise message="Second" />
		</Toaster>,
	)

	const [first, second] = screen.getAllByRole('button', { name: 'Raise' })
	fireEvent.click(first)
	fireEvent.click(second)

	const shown = screen.getByText('First').parentElement?.children ?? []
	expect([...shown].map((toast) => toast.textContent)).toEqual(['First', 'Second'])
})

test('lets the toast region take focus from script but not from the tab key', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)

	expect(container.querySelector('.godmin-toasts')?.getAttribute('tabindex')).toBe('-1')
})

test('hands focus to the toast region when a focused toast leaves through its action', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const undo = screen.getByRole('button', { name: 'Undo' })
	undo.focus()

	fireEvent.click(undo)

	expect(document.activeElement).toBe(container.querySelector('.godmin-toasts'))
})

test('hands focus to the toast region when a focused toast leaves through its close button', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const close = screen.getByRole('button', { name: 'Dismiss' })
	close.focus()

	fireEvent.click(close)

	expect(document.activeElement).toBe(container.querySelector('.godmin-toasts'))
})

test('hands focus to the toast region when a focused plain toast is clicked away', () => {
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const toast = screen.getByRole('button', { name: 'Saved' })
	toast.focus()

	fireEvent.click(toast)

	expect(document.activeElement).toBe(container.querySelector('.godmin-toasts'))
})

test('hands focus to the toast region when a focused toast runs out of time', () => {
	vi.useFakeTimers()
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	screen.getByRole('button', { name: 'Undo' }).focus()

	act(() => {
		vi.advanceTimersByTime(6000)
	})

	expect(screen.queryByText('Post moved to trash')).toBeNull()
	expect(document.activeElement).toBe(container.querySelector('.godmin-toasts'))
})

test('moves focus out of a toast running out of time before the toast turns inert, as a browser renders', async () => {
	const { container } = renderAdmin(
		<Toaster dismissAfter={1}>
			<Raise message="Post moved to trash" action={{ label: 'Undo', onAct: vi.fn() }} />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	screen.getByRole('button', { name: 'Undo' }).focus()
	const toast = screen.getByText('Post moved to trash').parentElement as HTMLElement
	const region = container.querySelector('.godmin-toasts') as HTMLElement
	const observers: MutationObserver[] = []
	const focusOnceInert = new Promise<Element | null>((resolve) => {
		const turnedInert = new MutationObserver(() => resolve(document.activeElement))
		const removed = new MutationObserver(() => resolve(null))
		turnedInert.observe(toast, { attributeFilter: ['inert'] })
		removed.observe(region, { childList: true })
		observers.push(turnedInert, removed)
	})
	const acting = Reflect.get(globalThis, 'IS_REACT_ACT_ENVIRONMENT')
	Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', false)
	onTestFinished(() => {
		Reflect.set(globalThis, 'IS_REACT_ACT_ENVIRONMENT', acting)
		for (const observer of observers) {
			observer.disconnect()
		}
	})

	expect(await focusOnceInert).toBe(region)
})

test('hands focus to the toast region before a focused toast starts fading out', () => {
	holdFade()
	const { container } = renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	fireEvent.click(screen.getByRole('button', { name: 'Raise' }))
	const toast = screen.getByRole('button', { name: 'Saved' })
	toast.focus()

	fireEvent.click(toast)

	expect(screen.getByText('Saved').hasAttribute('inert')).toBe(true)
	expect(document.activeElement).toBe(container.querySelector('.godmin-toasts'))
})

test('leaves focus where it was when a toast it is not in leaves', () => {
	renderAdmin(
		<Toaster>
			<Raise message="Saved" />
		</Toaster>,
	)
	const raise = screen.getByRole('button', { name: 'Raise' })
	fireEvent.click(raise)
	raise.focus()

	fireEvent.click(screen.getByRole('button', { name: 'Saved' }))

	expect(document.activeElement).toBe(raise)
})

/**
 * Returns the name a toaster gives a title, rendering the toaster with the given name length.
 * @param title - The title to name.
 * @param nameLength - How many characters the toaster keeps, its default when absent.
 * @returns The name the toaster handle answers.
 */
function nameFrom(title: string, nameLength?: number): string {
	let kept: ToasterHandle | undefined
	renderAdmin(
		<Toaster nameLength={nameLength}>
			<Keep onHandle={(handle) => (kept = handle)} />
		</Toaster>,
	)
	return (kept as ToasterHandle).name(title)
}

test('names an item in full when its name fits the toast', () => {
	expect(nameFrom('Hello world')).toBe('Hello world')
	expect(nameFrom('a'.repeat(45))).toBe('a'.repeat(45))
})

test('cuts a name longer than 45 characters to 45 and ends it with an ellipsis', () => {
	expect(nameFrom('a'.repeat(46))).toBe(`${'a'.repeat(45)}…`)
})

test('cuts a name at the length the toaster is given', () => {
	expect(nameFrom('Maria Perez wrote this', 10)).toBe('Maria Pere…')
})

test('counts an emoji as one character, so a cut never splits it', () => {
	const family = '\u{1F469}\u{200D}\u{1F469}\u{200D}\u{1F467}\u{200D}\u{1F466}'

	expect(nameFrom(`${'a'.repeat(44)}${family}tail`)).toBe(`${'a'.repeat(44)}${family}…`)
	expect(nameFrom(family.repeat(45))).toBe(family.repeat(45))
})

test('trims the spaces a cut leaves before the ellipsis', () => {
	expect(nameFrom('Maria   Perez', 8)).toBe('Maria…')
})

test('tells a screen it forgot the region rather than failing silently', () => {
	const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})

	expect(() => renderAdmin(<Raise message="Saved" />)).toThrow(/Toaster/)

	quiet.mockRestore()
})
