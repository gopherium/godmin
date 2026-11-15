// SPDX-License-Identifier: Apache-2.0

/** Names the reduced motion switch, double click, drag, held key and time offline the browser project adds. */
declare module 'vitest/browser' {
	interface BrowserCommands {
		reduceMotion: (on: boolean) => Promise<void>
		doubleClickAt: (x: number, y: number, gap: number) => Promise<void>
		drag: (
			from: { x: number; y: number },
			to: { x: number; y: number },
			motion: { steps: number; gap: number },
		) => Promise<void>
		holdKey: (key: string, repeats: number, gap: number) => Promise<void>
		goOfflineFor: (span: number) => Promise<void>
	}
}

export {}
