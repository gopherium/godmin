// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { openOnTap } from '../src/index'
import type { TapList } from '../src/index'
import { openOnTap as routerOpenOnTap } from '../src/router.js'

/**
 * Builds the part of a list a tap reads, on a phone or a wide viewport, its ticks held by the given handler.
 * @param phone - Whether the viewport takes the phone layout.
 * @param onChangeSelection - The handler holding the ticks.
 * @returns The list.
 */
function listOn(phone: boolean, onChangeSelection: (selection: string[]) => void): TapList {
	return { phone, onChangeSelection }
}

test('a tap in the list a phone shows opens the record it lands on, with no router in reach', () => {
	const ticked: string[][] = []
	const opened: string[] = []

	openOnTap(listOn(true, (selection) => ticked.push(selection)), (id) => opened.push(id))(['7'])

	expect({ ticked, opened }).toEqual({ ticked: [], opened: ['7'] })
})

test('a tap on a phone that lands on no row opens nothing', () => {
	const opened: string[] = []

	openOnTap(listOn(true, () => {}), (id) => opened.push(id))([])

	expect(opened).toEqual([])
})

test('a tick in a wide layout stays a selection and opens nothing', () => {
	const ticked: string[][] = []
	const opened: string[] = []

	openOnTap(listOn(false, (selection) => ticked.push(selection)), (id) => opened.push(id))(['7'])

	expect({ ticked, opened }).toEqual({ ticked: [['7']], opened: [] })
})

test('the router entry hands out the same tap handler as the main entry', () => {
	expect(routerOpenOnTap).toBe(openOnTap)
})
