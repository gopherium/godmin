// SPDX-License-Identifier: Apache-2.0

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom',
		env: { TZ: 'UTC' },
		include: ['test/**/*.test.{ts,tsx}'],
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
	},
})
