// SPDX-License-Identifier: Apache-2.0

import { argosVitestPlugin } from '@argos-ci/storybook/vitest-plugin'
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin'
import react from '@vitejs/plugin-react'
import { playwright } from '@vitest/browser-playwright'
import { configDefaults, defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'

/** Turns the reduced motion preference of the test page on or off. */
const reduceMotion: BrowserCommand<[on: boolean]> = async ({ page }, on) => {
	await page.emulateMedia({ reducedMotion: on ? 'reduce' : 'no-preference' })
}

/** Clicks twice at a point of the test page, a set gap apart, as a person double clicks. */
const doubleClickAt: BrowserCommand<[x: number, y: number, gap: number]> = async ({ page, iframe }, x, y, gap) => {
	const frame = await iframe.owner().boundingBox()
	await page.mouse.move((frame?.x ?? 0) + x, (frame?.y ?? 0) + y)
	await page.mouse.down({ clickCount: 1 })
	await page.mouse.up({ clickCount: 1 })
	await new Promise((done) => setTimeout(done, gap))
	await page.mouse.down({ clickCount: 2 })
	await page.mouse.up({ clickCount: 2 })
}

/** A point of the test page, in pixels from its top left corner. */
interface Point {
	/** The distance from the left edge. */
	x: number
	/** The distance from the top edge. */
	y: number
}

/** How a drag moves between its two points. */
interface DragMotion {
	/** The number of even steps from the first point to the second. */
	steps: number
	/** The wait before each step, in milliseconds. */
	gap: number
}

/** Drags the mouse from one point of the test page to another in even steps a set gap apart, as a person swipes. */
const drag: BrowserCommand<[from: Point, to: Point, motion: DragMotion]> = async ({ page, iframe }, from, to, motion) => {
	const frame = await iframe.owner().boundingBox()
	const [left, top] = [frame?.x ?? 0, frame?.y ?? 0]
	await page.mouse.move(left + from.x, top + from.y)
	await page.mouse.down()
	for (let step = 1; step <= motion.steps; step += 1) {
		await new Promise((done) => setTimeout(done, motion.gap))
		const share = step / motion.steps
		await page.mouse.move(left + from.x + (to.x - from.x) * share, top + from.y + (to.y - from.y) * share)
	}
	await page.mouse.up()
}

/** Holds a key down as a person does, the browser reading each press after the first as a repeat. */
const holdKey: BrowserCommand<[key: string, repeats: number, gap: number]> = async ({ page }, key, repeats, gap) => {
	for (let press = 0; press <= repeats; press += 1) {
		await page.keyboard.down(key)
		await new Promise((done) => setTimeout(done, gap))
	}
	await page.keyboard.up(key)
}

/** The style Argos adds to a shot: no motion, spinners at rest, the list pulse dim, no pointer. */
const SHOT_STYLE = [
	'.godmin-toasts__item, .godmin-toast { animation: none; }',
	'.godmin-loading-screen path, .components-spinner path { animation: none; }',
	'.dataviews-wrapper .is-refreshing { animation: none !important; opacity: 0.5 !important; }',
	'[data-wp-compat-overlay-slot] * { transition: none }',
	'[role="alertdialog"] button svg path, [role="dialog"] button svg path { animation: none }',
	'* { pointer-events: none !important; }',
].join(' ')

/** Returns a fresh headless Chromium setup with grayscale text and no font hinting, its default arguments less any left out. */
function chromium(leftOut: string[] = []) {
	return {
		enabled: true,
		headless: true,
		provider: playwright({
			launchOptions: { args: ['--disable-lcd-text', '--font-render-hinting=none'], ignoreDefaultArgs: leftOut },
		}),
		instances: [{ browser: 'chromium' as const }],
	}
}

export default defineConfig({
	plugins: [react()],
	optimizeDeps: { include: ['@wordpress/components', '@wordpress/dataviews'] },
	test: {
		env: { TZ: 'UTC' },
		coverage: {
			include: ['src/**/*.{ts,tsx}'],
			reporter: ['text', 'lcov'],
			thresholds: {
				statements: 100,
				branches: 100,
				functions: 100,
				lines: 100,
			},
		},
		projects: [
			{
				extends: true,
				test: {
					name: 'unit',
					environment: 'jsdom',
					include: ['test/**/*.test.{ts,tsx}'],
					exclude: [...configDefaults.exclude, 'test/browser/**'],
				},
			},
			{
				extends: true,
				test: {
					name: 'browser',
					include: ['test/browser/**/*.test.{ts,tsx}'],
					exclude: [...configDefaults.exclude, 'test/browser/scrollbars/**'],
					setupFiles: ['test/browser/setup.ts'],
					browser: {
						...chromium(),
						viewport: { width: 1280, height: 800 },
						commands: { reduceMotion, doubleClickAt, drag, holdKey },
					},
				},
			},
			{
				extends: true,
				test: {
					name: 'scrollbars',
					include: ['test/browser/scrollbars/**/*.test.{ts,tsx}'],
					setupFiles: ['test/browser/setup.ts'],
					browser: {
						...chromium(['--hide-scrollbars']),
						viewport: { width: 1280, height: 800 },
						commands: { reduceMotion },
					},
				},
			},
			{
				extends: true,
				plugins: [
					storybookTest({ configDir: '.storybook' }),
					argosVitestPlugin({ uploadToArgos: process.env.ARGOS_UPLOAD === 'true', argosCSS: SHOT_STYLE }),
				],
				test: { name: 'storybook', browser: chromium() },
			},
		],
	},
})
