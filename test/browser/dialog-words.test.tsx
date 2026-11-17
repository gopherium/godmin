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

/** Returns the box of each line the text inside an element takes. */
function lineBoxesOf(element: Element): DOMRect[] {
	const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
	const boxes: DOMRect[] = []
	for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
		const range = document.createRange()
		range.selectNodeContents(node)
		boxes.push(...[...range.getClientRects()].filter((rect) => rect.width > 0))
	}
	return boxes
}

/** Returns the title that names a dialog. */
function titleOf(dialog: HTMLElement): HTMLElement {
	const title = document.getElementById(dialog.getAttribute('aria-labelledby') ?? '')
	expect(title, 'the dialog names no title').not.toBeNull()
	return title as HTMLElement
}

/** Checks every line of a dialog's title starts and ends inside its card. */
function expectTitleInsideCard(dialog: HTMLElement): void {
	const card = dialog.getBoundingClientRect()
	const lines = lineBoxesOf(titleOf(dialog))
	expect(new Set(lines.map((line) => line.top)).size, 'the long word takes more than one line').toBeGreaterThan(1)
	for (const line of lines) {
		expect(line.left, 'a title line starts before the card').toBeGreaterThanOrEqual(card.left)
		expect(line.right, 'a title line runs past the card').toBeLessThanOrEqual(card.right)
	}
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

test('keeps every word of an app heading in a row of a form dialog whole on a narrow phone', async () => {
	render(
		<FormDialog
			title="Edit alerts"
			submitLabel="Save"
			cancelLabel="Cancel"
			onSubmit={() => undefined}
			onClose={() => undefined}
		>
			<div style={{ display: 'flex', gap: '8px' }}>
				<h2>Notifications</h2>
				<p>Send a message to every reader when someone answers a thread they follow</p>
			</div>
		</FormDialog>,
	)
	await screen.findByRole('dialog')
	await settled()

	expect(brokenWords(screen.getByRole('heading', { name: 'Notifications' }))).toEqual([])
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

test.each([
	[1280, 800],
	[390, 844],
])('breaks a word longer than a confirm card inside its title at %ipx wide', async (width, height) => {
	await page.viewport(width, height)
	render(
		<ConfirmDialog
			title={`Delete "${LONG_WORD}"?`}
			confirmLabel="Delete"
			cancelLabel="Cancel"
			onConfirm={() => undefined}
			onClose={() => undefined}
		/>,
	)
	const dialog = await screen.findByRole('alertdialog')
	await settled()

	expectTitleInsideCard(dialog)
})

test.each([
	[1280, 800],
	[390, 844],
])('keeps the close icon of a form dialog inside its card beside a long title at %ipx wide', async (width, height) => {
	await page.viewport(width, height)
	render(
		<FormDialog
			title={`Rename "${LONG_WORD}"`}
			submitLabel="Save"
			cancelLabel="Cancel"
			onSubmit={() => undefined}
			onClose={() => undefined}
		>
			<InputControl label="Name" />
		</FormDialog>,
	)
	const dialog = await screen.findByRole('dialog')
	await settled()

	const card = dialog.getBoundingClientRect()
	const close = screen.getByRole('button', { name: 'Close' }).getBoundingClientRect()
	expect(close.width, 'the close icon has no size').toBeGreaterThan(0)
	expect(close.left, 'the close icon starts before the card').toBeGreaterThanOrEqual(card.left)
	expect(close.right, 'the close icon runs past the card').toBeLessThanOrEqual(card.right)
	expectTitleInsideCard(dialog)
})
