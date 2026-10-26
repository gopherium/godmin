// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'

import * as stories from '../../stories/toaster.stories.js'

const { Plain } = composeStories(stories)

/** The animations a leaving toast adds, timed from the dismiss instead of the arrival. */
const LEAVING = new Set(['godmin-toast-shrink', 'godmin-fade-out'])

/** The times the early dismiss test reads, every 10ms from 60 to 620. */
const SAMPLE_TIMES = Array.from({ length: 57 }, (_, step) => 60 + step * 10)

/** The second toast of a test, its animations paused and moved by hand. */
interface PausedToast {
	item: HTMLElement
	toast: HTMLElement
	neighbour: HTMLElement
	neighbourTop: number
	animations: CSSAnimation[]
	paused: Set<Animation>
	dismissAt: number
}

/** What one moment of the clock shows. */
interface Reading {
	height: number
	opacity: number
	shift: number
}

/** Clicks the page button with the given name, failing at once when no button has it. */
function press(name: string) {
	screen.getByRole('button', { name }).click()
}

/** Waits for the toast whose message starts with the given words. */
async function findToast(words: string): Promise<HTMLElement> {
	const find = () =>
		[...document.querySelectorAll<HTMLElement>('.godmin-toast')].find((toast) => toast.textContent?.startsWith(words))
	await expect.poll(find).toBeDefined()
	return find() as HTMLElement
}

/** Pauses the running animations of an item and its toast and returns them. */
function pauseAll(item: HTMLElement): CSSAnimation[] {
	const animations = item.getAnimations({ subtree: true }) as CSSAnimation[]
	animations.forEach((animation) => animation.pause())
	return animations
}

/** Shows a settled plain toast, then an action toast paused at the start of its arrival. */
async function showPausedToast(): Promise<PausedToast> {
	render(<Plain />)
	press('Plain')
	const neighbour = await findToast('Settings saved.')
	neighbour.closest('.godmin-toasts__item')?.getAnimations({ subtree: true }).forEach((animation) => animation.finish())
	const neighbourTop = neighbour.getBoundingClientRect().top
	press('Action')
	const toast = await findToast('"Hello"')
	const item = toast.closest<HTMLElement>('.godmin-toasts__item') as HTMLElement
	const animations = pauseAll(item)
	return { item, toast, neighbour, neighbourTop, animations, paused: new Set(animations), dismissAt: Infinity }
}

/** Moves every paused animation to the given time after the arrival. */
function seek(actionToast: PausedToast, time: number) {
	for (const animation of actionToast.animations) {
		animation.currentTime = Math.max(0, time - (LEAVING.has(animation.animationName) ? actionToast.dismissAt : 0))
	}
}

/** Reads the item height, the toast opacity and how far the toast above has moved. */
function read(actionToast: PausedToast): Reading {
	return {
		height: actionToast.item.getBoundingClientRect().height,
		opacity: Number(getComputedStyle(actionToast.toast).opacity),
		shift: actionToast.neighbourTop - actionToast.neighbour.getBoundingClientRect().top,
	}
}

/** Returns the height the item of a toast reaches, the toast and the gap above it. */
function fullHeight(actionToast: PausedToast): number {
	const { toast } = actionToast
	return toast.getBoundingClientRect().height + parseFloat(getComputedStyle(toast).marginBlockStart)
}

/** Returns the name and the end time of each animation. */
function timings(animations: CSSAnimation[]): [string, number][] {
	return animations.map((animation) => [animation.animationName, Number(animation.effect?.getComputedTiming().endTime)])
}

/** Clicks the paused toast at the given time and waits until it is leaving. */
async function dismiss(actionToast: PausedToast, time: number) {
	seek(actionToast, time)
	actionToast.dismissAt = time
	actionToast.toast.click()
	await expect.poll(() => actionToast.item.classList.contains('godmin-toasts__item--leaving')).toBe(true)
}

/** Pauses the animations a leaving toast runs, the arriving ones it keeps included. */
function pauseLeaving(actionToast: PausedToast) {
	actionToast.animations = pauseAll(actionToast.item)
	actionToast.animations.forEach((animation) => actionToast.paused.add(animation))
}

/** Ends every paused animation that has not dropped out. */
function finishAll(actionToast: PausedToast) {
	for (const animation of actionToast.paused) {
		if (animation.playState !== 'idle') {
			animation.finish()
		}
	}
}

/** Ends every paused animation of a dismissed toast and waits until the toast is gone. */
async function finishLeaving(actionToast: PausedToast) {
	finishAll(actionToast)
	await expect.poll(() => actionToast.toast.isConnected).toBe(false)
}

test('grows the space of an arriving toast over 300ms, fades it in after 50ms and slides the one above', async () => {
	const actionToast = await showPausedToast()
	const full = fullHeight(actionToast)

	expect(timings(actionToast.animations)).toEqual([['godmin-toast-grow', 300], ['godmin-fade-in', 300]])
	const at = (time: number) => {
		seek(actionToast, time)
		const reading = read(actionToast)
		expect(Math.abs(reading.shift - reading.height), `the toast above at ${time}ms`).toBeLessThan(0.5)
		return reading
	}
	expect(at(0)).toEqual({ height: 0, opacity: 0, shift: 0 })
	expect(at(49).opacity).toBe(0)
	expect(at(60).opacity).toBeGreaterThan(0.05)
	expect(at(150).height).toBeGreaterThan(0.5)
	expect(at(150).height).toBeLessThan(full - 2)
	expect(at(300).height).toBeCloseTo(full, 0)
	expect(at(300).opacity).toBe(1)
	finishAll(actionToast)
})

test('closes a toast dismissed while it arrives from the height and the opacity it reached', async () => {
	const actionToast = await showPausedToast()
	const full = fullHeight(actionToast)
	seek(actionToast, 60)
	const reached = read(actionToast)
	await dismiss(actionToast, 60)
	const left = read(actionToast)

	expect(left.height, 'the space jumped when the toast left').toBeLessThanOrEqual(reached.height + 0.5)
	expect(left.opacity, 'the toast snapped opaque when it left').toBeLessThanOrEqual(reached.opacity + 0.01)
	pauseLeaving(actionToast)
	expect(timings(actionToast.animations).map(([name]) => name)).toEqual([
		'godmin-toast-grow',
		'godmin-toast-shrink',
		'godmin-fade-in',
		'godmin-fade-out',
	])
	let peak = 0
	for (const time of SAMPLE_TIMES) {
		seek(actionToast, time)
		const reading = read(actionToast)
		peak = Math.max(peak, reading.height)
		expect(Math.abs(reading.shift - reading.height), `the toast above at ${time}ms`).toBeLessThan(0.5)
		expect(reading.opacity, `the opacity at ${time}ms`).toBeLessThanOrEqual(time < 160 ? 0.25 : 0)
	}
	expect(peak, 'the space of a toast cleared early grew to full height').toBeLessThan(full - 2)
	expect(read(actionToast).height).toBe(0)
	seek(actionToast, 400)
	expect(actionToast.toast.isConnected).toBe(true)
	await finishLeaving(actionToast)
})

test('shows and clears a toast at once under a reduced motion preference', async () => {
	await commands.reduceMotion(true)
	const actionToast = await showPausedToast()
	const full = fullHeight(actionToast)

	expect(timings(actionToast.animations).filter(([, end]) => end > 1)).toEqual([])
	seek(actionToast, 1)
	expect(read(actionToast).height).toBeCloseTo(full, 0)
	expect(read(actionToast).opacity).toBe(1)
	await dismiss(actionToast, 1)
	pauseLeaving(actionToast)
	expect(timings(actionToast.animations).filter(([, end]) => end > 1)).toEqual([])
	seek(actionToast, 2)
	expect(read(actionToast)).toMatchObject({ height: 0, opacity: 0 })
	await finishLeaving(actionToast)
})
