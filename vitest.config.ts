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

/** The style Argos adds while it takes a shot, with no toast animation and no element taking the pointer. */
const SHOT_STYLE = '.godmin-toasts__item, .godmin-toast { animation: none; } * { pointer-events: none !important; }'

/** Returns a fresh headless Chromium setup with grayscale text and no font hinting. */
function chromium() {
	return {
		enabled: true,
		headless: true,
		provider: playwright({ launchOptions: { args: ['--disable-lcd-text', '--font-render-hinting=none'] } }),
		instances: [{ browser: 'chromium' as const }],
	}
}

export default defineConfig({
	plugins: [react()],
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
					setupFiles: ['test/browser/setup.ts'],
					browser: { ...chromium(), viewport: { width: 1280, height: 800 }, commands: { reduceMotion } },
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
