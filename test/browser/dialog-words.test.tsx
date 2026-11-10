// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { InputControl } from '@wordpress/ui'
import { beforeEach, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'

import { ConfirmDialog, FormDialog } from '../../src/index.js'

/** A link with no space in it, longer than any dialog card. */
const LONG_LINK = `https://example.com/${'reports/finance/'.repeat(8)}latest`

/** Returns the number of lines each word inside an element takes, keyed by the word. */
function linesOfEachWord(element: Element): [string, number][] {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
	const lines: [string, number][] = []
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		for (const word of (node.textContent ?? '').matchAll(/\S+/g)) {
			const range = document.createRange()
			range.setStart(node, word.index)
			range.setEnd(node, word.index + word[0].length)
			const tops = new Set([...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => rect.top))
			lines.push([word[0], tops.size])
		}
	}
	return lines
}

/** Returns the words of an element that break over more than one line. */
function brokenWords(element: Element): string[] {
	return linesOfEachWord(element)
		.filter(([, count]) => count > 1)
		.map(([word]) => word)
}

/** Waits two frames, so the dialog holds its final sizes. */
async function settled(): Promise<void> {
	for (let frame = 0; frame < 2; frame += 1) {
		await new Promise((done) => requestAnimationFrame(done))
	}
}

beforeEach(async () => {
	await commands.reduceMotion(true)
	await page.viewport(320, 700)
})

test('keeps every word of the labels of an app grid in a form dialog whole on a narrow phone', async () => {
	render(
		<FormDialog
			title="Edit rule"
			submitLabel="Save"
			cancelLabel="Cancel"
			onSubmit={() => undefined}
			onClose={() => undefined}
		>
			<div data-testid="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
				<span>Condition</span>
				<span>Field</span>
				<span>Value</span>
				<span>Remove</span>
			</div>
		</FormDialog>,
	)
	await screen.findByRole('dialog')
	await settled()

	expect(brokenWords(screen.getByTestId('grid'))).toEqual([])
})

test('breaks a long link at the edge of a confirm card on a narrow phone', async () => {
	render(
		<ConfirmDialog
			title="Open the report?"
			description={`It lives at ${LONG_LINK}.`}
			confirmLabel="Open"
			cancelLabel="Cancel"
			onConfirm={() => undefined}
			onClose={() => undefined}
		/>,
	)
	const dialog = await screen.findByRole('alertdialog')
	await settled()

	const description = screen.getByText(/It lives at/)
	expect(description.scrollWidth).toBeLessThanOrEqual(description.clientWidth)
	expect(description.getBoundingClientRect().right).toBeLessThanOrEqual(dialog.getBoundingClientRect().right)
})

test('breaks a long link at the edge of a form dialog card on a narrow phone', async () => {
	render(
		<FormDialog
			title="Add link"
			submitLabel="Add"
			cancelLabel="Cancel"
			onSubmit={() => undefined}
			onClose={() => undefined}
		>
			<InputControl label="Address" />
			<p>{`The last one was ${LONG_LINK}.`}</p>
		</FormDialog>,
	)
	const dialog = await screen.findByRole('dialog')
	await settled()

	const line = screen.getByText(/The last one was/)
	expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth)
	expect(line.getBoundingClientRect().right).toBeLessThanOrEqual(dialog.getBoundingClientRect().right)
})
