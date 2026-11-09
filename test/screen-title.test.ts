// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { TITLE_WAIT, createScreenTitles } from '../src/screen-title.js'

test('holds no title before a screen reports one', () => {
	expect(createScreenTitles().deepest()).toBeUndefined()
})

test('hands back the title a screen reports, with its depth and whether it waits', () => {
	const titles = createScreenTitles()

	titles.report({ title: 'Contacts', depth: 1, waiting: false })

	expect(titles.deepest()).toEqual({ title: 'Contacts', depth: 1, waiting: false })
})

test('lets the deepest title win over a shallower one reported after it', () => {
	const titles = createScreenTitles()

	titles.report({ title: 'General', depth: 2, waiting: false })
	titles.report({ title: 'Settings', depth: 1, waiting: false })

	expect(titles.deepest()?.title).toBe('General')
})

test('lets the newest of two titles as deep win', () => {
	const titles = createScreenTitles()

	titles.report({ title: 'Contacts', depth: 1, waiting: false })
	titles.report({ title: 'Settings', depth: 1, waiting: false })

	expect(titles.deepest()?.title).toBe('Settings')
})

test('drops a withdrawn title, leaving the one under it, and drops it once only', () => {
	const titles = createScreenTitles()
	titles.report({ title: 'Contacts', depth: 1, waiting: false })
	const withdraw = titles.report({ title: 'General', depth: 2, waiting: false })

	withdraw()
	withdraw()

	expect(titles.deepest()?.title).toBe('Contacts')
})

test('hands back the same report while nothing changes, as a store a component reads must', () => {
	const titles = createScreenTitles()
	titles.report({ title: 'Contacts', depth: 1, waiting: false })

	expect(titles.deepest()).toBe(titles.deepest())
})

test('tells each listener of every report and withdrawal, until it stops listening', () => {
	const titles = createScreenTitles()
	const heard: Array<string | undefined> = []
	const stop = titles.subscribe(() => heard.push(titles.deepest()?.title))

	const withdraw = titles.report({ title: 'Contacts', depth: 1, waiting: false })
	withdraw()
	stop()
	titles.report({ title: 'Settings', depth: 1, waiting: false })

	expect(heard).toEqual(['Contacts', undefined])
})

test('holds a waiting title for 1 second at most', () => {
	expect(TITLE_WAIT).toBe(1000)
})
