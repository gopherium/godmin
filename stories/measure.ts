// SPDX-License-Identifier: Apache-2.0

import { expect } from 'storybook/test'

/** Returns the element a selector finds in the document, failing when none matches. */
export function find(selector: string): HTMLElement {
	const found = document.querySelector<HTMLElement>(selector)
	if (found === null) {
		throw new Error(`nothing matches ${selector}`)
	}
	return found
}

/** Returns the box of the element a selector finds in the document. */
export function boxOf(selector: string): DOMRect {
	return find(selector).getBoundingClientRect()
}

/** Returns the middle of a box across. */
export function middleAcross(box: DOMRect): number {
	return box.left + box.width / 2
}

/** Returns the middle of a box down. */
export function middleDown(box: DOMRect): number {
	return box.top + box.height / 2
}

/** Checks two positions meet within half a pixel. */
export async function meets(actual: number, expected: number, what: string) {
	await expect(Math.abs(actual - expected), what).toBeLessThan(0.5)
}

/** Checks a box sits in the middle of another on both axes. */
export async function centredIn(inner: DOMRect, outer: DOMRect) {
	await meets(middleAcross(inner), middleAcross(outer), 'across')
	await meets(middleDown(inner), middleDown(outer), 'down')
}

/** Returns the box of a column less the room at its sides, and where its first and last parts sit. */
function columnOf(selector: string) {
	const box = boxOf(selector)
	const side = parseFloat(getComputedStyle(find(selector)).paddingInlineStart)
	const parts = find(selector).children
	return {
		left: box.left + side,
		right: box.right - side,
		width: box.width - 2 * side,
		top: parts[0].getBoundingClientRect().top,
		bottom: parts[parts.length - 1].getBoundingClientRect().bottom,
	}
}

/** Returns the content of each column of a record page and the room its header leaves. */
export function columnsOf() {
	const header = boxOf('.godmin-page__header')
	return {
		page: { left: header.left, right: header.right, width: header.width },
		main: columnOf('.godmin-page__main'),
		details: columnOf('.godmin-page__aside'),
	}
}

/** A cell of a DataViews table and its box as it was measured. */
interface Edge {
	cell: HTMLElement
	box: DOMRect
}

/** The cells of one table row that stay or move as the table scrolls sideways, with the title cell of its header. */
interface RowEdges {
	checkbox: Edge
	title: Edge
	titleHeader: Edge
	first: Edge
	actions: Edge
}

/** Returns a cell with its box as it is now. */
function edgeOf(cell: HTMLElement): Edge {
	return { cell, box: cell.getBoundingClientRect() }
}

/** Returns the body row of the DataViews table whose title reads as given, failing when none does. */
function rowOf(title: string): HTMLTableRowElement {
	const rows = [...document.querySelectorAll<HTMLTableRowElement>('.dataviews-view-table tbody tr')]
	const row = rows.find((found) => found.querySelector('.dataviews-title-field')?.textContent === title)
	if (row === undefined) {
		throw new Error(`no row reads ${title}`)
	}
	return row
}

/** Returns the checkbox, title, first data and actions cells of the row with a title, and the title header cell. */
export function edgesOf(title: string): RowEdges {
	const row = rowOf(title)
	const header = find('.dataviews-view-table thead tr') as HTMLTableRowElement
	return {
		checkbox: edgeOf(row.cells[0]),
		title: edgeOf(row.cells[1]),
		titleHeader: edgeOf(header.cells[1]),
		first: edgeOf(row.cells[2]),
		actions: edgeOf(row.cells[row.cells.length - 1]),
	}
}

/** Reports whether the topmost element at a point of the window lies inside a cell. */
export function onTop(cell: Element, x: number, y: number): boolean {
	const hit = document.elementFromPoint(x, y)
	return hit !== null && cell.contains(hit)
}

/** Returns the colour an element paints its own background with. */
export function backgroundOf(element: Element): string {
	return getComputedStyle(element).backgroundColor
}
