// SPDX-License-Identifier: Apache-2.0

import { composeStories } from '@storybook/react-vite'
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'
import { commands } from 'vitest/browser'

import * as stories from '../../stories/loading.stories.js'

const { Screen, InADialog, InTheCanvas, OutsideTheFrame } = composeStories(stories)

/** The wait, the length, the fill, the repeats and the curve of one animation. */
interface Timing {
	name: string
	delay: number | undefined
	duration: number | string | CSSNumericValue | undefined
	fill: FillMode | undefined
	iterations: number | undefined
	curve: string | undefined
}

/** Returns the loading screen, wherever the story draws it. */
function loadingScreen(): HTMLElement {
	return document.querySelector('.godmin-loading-screen') as HTMLElement
}

/** Pauses the animations an element runs itself and returns them. */
function pauseAll(element: Element): CSSAnimation[] {
	const animations = element.getAnimations() as CSSAnimation[]
	animations.forEach((animation) => animation.pause())
	return animations
}

/** Moves every paused animation to the given time after it started. */
function seek(animations: CSSAnimation[], time: number) {
	animations.forEach((animation) => (animation.currentTime = time))
}

/** Reads the opacity an element shows now. */
function opacity(element: Element): number {
	return Number(getComputedStyle(element).opacity)
}

/** Reads the angle an element is turned by now, in degrees. */
function angle(element: Element): number {
	const matrix = new DOMMatrix(getComputedStyle(element).transform)
	return (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI
}

/** Reads the curve of an animation. */
function curve(animation: CSSAnimation): string | undefined {
	return animation.effect instanceof KeyframeEffect ? animation.effect.getKeyframes()[0]?.easing : undefined
}

/** Returns the name, the wait, the length, the fill, the repeats and the curve of each animation. */
function timings(animations: CSSAnimation[]): Timing[] {
	return animations.map((animation) => {
		const timing = animation.effect?.getTiming()
		return {
			name: animation.animationName,
			delay: timing?.delay,
			duration: timing?.duration,
			fill: timing?.fill,
			iterations: timing?.iterations,
			curve: curve(animation),
		}
	})
}

/** Reads the opacity of the loading screen at each given time after it started. */
function opacitiesAt(animations: CSSAnimation[], times: number[]): number[] {
	return times.map((time) => {
		seek(animations, time)
		return opacity(loadingScreen())
	})
}

test.each([
	{ place: 'in a page', Story: Screen },
	{ place: 'in a dialog', Story: InADialog },
])('shows the screen spinner at once $place', ({ Story }) => {
	render(<Story />)

	expect(loadingScreen().getAnimations()).toEqual([])
	expect(opacity(loadingScreen())).toBe(1)
})

test.each([
	{ place: 'in the canvas', Story: InTheCanvas },
	{ place: 'outside the frame', Story: OutsideTheFrame },
])('hides the screen spinner for 200ms $place, then fades it in over 500ms on ease', ({ Story }) => {
	render(<Story />)
	const animations = pauseAll(loadingScreen())

	expect(timings(animations)).toEqual([
		{ name: 'godmin-fade-in', delay: 200, duration: 500, fill: 'forwards', iterations: 1, curve: 'ease' },
	])
	const [start, waited, half, end, later] = opacitiesAt(animations, [0, 199, 450, 700, 5000])
	expect([start, waited]).toEqual([0, 0])
	expect(Math.abs(half - 0.802), 'half the fade on ease').toBeLessThan(0.005)
	expect([end, later]).toEqual([1, 1])
})

test('shows the canvas spinner at once when its wait ends, under reduced motion', async () => {
	await commands.reduceMotion(true)
	render(<InTheCanvas />)
	const animations = pauseAll(loadingScreen())

	expect(timings(animations)).toEqual([
		{ name: 'godmin-fade-in', delay: 200, duration: 0, fill: 'forwards', iterations: 1, curve: 'ease' },
	])
	expect(opacitiesAt(animations, [199, 200])).toEqual([0, 1])
})

test.each([
	{ motion: 'by default', reduced: false },
	{ motion: 'under reduced motion', reduced: true },
])('keeps the screen spinner turning once every 1.4s $motion', async ({ reduced }) => {
	await commands.reduceMotion(reduced)
	render(<Screen />)
	const animations = pauseAll(loadingScreen().querySelector('path') as Element)

	expect(timings(animations).map(({ duration, iterations, curve: easing }) => [duration, iterations, easing])).toEqual([
		[1400, Infinity, 'linear'],
	])
	seek(animations, 350)
	expect(Math.abs(angle(loadingScreen().querySelector('path') as Element) - 90), 'a quarter turn').toBeLessThan(1)
})
