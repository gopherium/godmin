// SPDX-License-Identifier: Apache-2.0

/** Names the reduced motion switch the browser project adds to the test commands. */
declare module 'vitest/browser' {
	interface BrowserCommands {
		reduceMotion: (on: boolean) => Promise<void>
	}
}

export {}
