// SPDX-License-Identifier: Apache-2.0

import { render } from '@testing-library/react'
import { useContext } from 'react'
import { expect, test } from 'vitest'

import preview from '../.storybook/preview.js'
import { WriteTimeoutContext } from '../src/dialog-open.js'

/** A write time limit in milliseconds a story sets for the dialog it shows. */
const SHORT_LIMIT = 2_000

/** One minute in milliseconds, less than a story that sets no limit waits on a write. */
const ONE_MINUTE = 60_000

/**
 * Draws a story through the preview's decorator and reads the write time limit it hands the story.
 * @param parameters - The story's parameters.
 * @returns The limit the story reads.
 */
function limitOf(parameters: Record<string, unknown>): number | undefined {
	const [decorate] = [preview.decorators ?? []].flat()
	const seen: (number | undefined)[] = []
	/** Notes the limit the story reads. */
	function Probe() {
		seen.push(useContext(WriteTimeoutContext))
		return null
	}
	const context = { globals: {}, parameters } as unknown as Parameters<typeof decorate>[1]
	render(<>{decorate(() => <Probe />, context)}</>)
	return seen.at(-1)
}

test('gives a story the write time limit it sets', () => {
	expect(limitOf({ writeTimeout: SHORT_LIMIT })).toBe(SHORT_LIMIT)
})

test('gives a story that sets no limit a patient one, so no write it shows times out while it is looked at', () => {
	expect(limitOf({})).toBeGreaterThan(ONE_MINUTE)
})
