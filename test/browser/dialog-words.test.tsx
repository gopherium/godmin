// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { InputControl } from '@wordpress/ui'
import { beforeEach, expect, test } from 'vitest'
import { commands, page } from 'vitest/browser'

import { ConfirmDialog, FormDialog } from '../../src/index.js'

/** A word with no space or punctuation in it, longer than any dialog card. */
const LONG_WORD = 'reportfinancelatest'.repeat(12)

/** Returns the number of lines the long word takes inside an element. */
function linesOfLongWord(element: Element): number {
	return linesOfEachWord(element).find(([word]) => word.includes(LONG_WORD))?.[1] ?? 0
}

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
	const dialog = await screen.findByRole('dialog')
	await settled()

	const grid = screen.getByTestId('grid')
	expect(brokenWords(grid)).toEqual([])
	expect(grid.getBoundingClientRect().right).toBeLessThanOrEqual(dialog.getBoundingClientRect().right)
	for (const label of [...grid.children] as HTMLElement[]) {
		expect(label.scrollWidth, `${label.textContent} runs past its box`).toBeLessThanOrEqual(label.clientWidth)
		expect(label.getBoundingClientRect().right).toBeLessThanOrEqual(grid.getBoundingClientRect().right)
	}
})

test('breaks a word longer than a confirm card at its edge on a narrow phone', async () => {
	render(
		<ConfirmDialog
			title="Open the report?"
			description={`It lives at ${LONG_WORD}.`}
			confirmLabel="Open"
			cancelLabel="Cancel"
			onConfirm={() => undefined}
			onClose={() => undefined}
		/>,
	)
	const dialog = await screen.findByRole('alertdialog')
	await settled()

	const description = screen.getByText(/It lives at/)
	expect(linesOfLongWord(description)).toBeGreaterThan(1)
	expect(description.scrollWidth).toBeLessThanOrEqual(description.clientWidth)
	expect(description.getBoundingClientRect().right).toBeLessThanOrEqual(dialog.getBoundingClientRect().right)
})

test('breaks a word longer than a form dialog card at its edge on a narrow phone', async () => {
	render(
		<FormDialog
			title="Add link"
			submitLabel="Add"
			cancelLabel="Cancel"
			onSubmit={() => undefined}
			onClose={() => undefined}
		>
			<InputControl label="Address" />
			<p>{`The last one was ${LONG_WORD}.`}</p>
		</FormDialog>,
	)
	const dialog = await screen.findByRole('dialog')
	await settled()

	const line = screen.getByText(/The last one was/)
	expect(linesOfLongWord(line)).toBeGreaterThan(1)
	expect(line.scrollWidth).toBeLessThanOrEqual(line.clientWidth)
	expect(line.getBoundingClientRect().right).toBeLessThanOrEqual(dialog.getBoundingClientRect().right)
})
