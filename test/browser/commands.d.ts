// SPDX-License-Identifier: Apache-2.0

/** Names the reduced motion switch, double click, drag and held key the browser project adds to the test commands. */
declare module 'vitest/browser' {
	interface BrowserCommands {
		reduceMotion: (on: boolean) => Promise<void>
		doubleClickAt: (x: number, y: number, gap: number) => Promise<void>
		drag: (x: number, y: number, toX: number, toY: number, steps: number, gap: number) => Promise<void>
		holdKey: (key: string, repeats: number, gap: number) => Promise<void>
	}
}

export {}
