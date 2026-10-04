// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { AVATAR_COLORS, InitialsAvatar } from '../src/avatar.js'
import * as entry from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Returns the avatar element drawn for a name.
 * @param name - The name the avatar stands for.
 * @returns The avatar element.
 */
function avatarFor(name: string): HTMLElement {
	const { container } = renderAdmin(<InitialsAvatar name={name} />)
	return container.querySelector('.godmin-avatar') as HTMLElement
}

/**
 * Returns the relative luminance of a colour written as #rrggbb.
 * @param hex - The colour.
 * @returns The luminance, from 0 for black to 1 for white.
 */
function luminance(hex: string): number {
	const [red, green, blue] = [1, 3, 5].map((at) => {
		const channel = Number.parseInt(hex.slice(at, at + 2), 16) / 255
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * Returns a colour written as rgb() in the #rrggbb form.
 * @param rgb - The colour as the browser reports it.
 * @returns The colour as #rrggbb.
 */
function hexOf(rgb: string): string {
	const channels = rgb.match(/\d+/g) ?? []
	return `#${channels.map((channel) => Number(channel).toString(16).padStart(2, '0')).join('')}`
}

/**
 * Returns the circle colours of the palette in order.
 * @returns The colours as #rrggbb.
 */
function backgrounds(): string[] {
	return AVATAR_COLORS.map((color) => color.background)
}

test('draws the first letter of the name in capitals', () => {
	expect(avatarFor('maria perez').textContent).toBe('M')
})

test('takes the first letter after the spaces a name starts with', () => {
	expect(avatarFor('  ana lopez').textContent).toBe('A')
})

test('keeps a first letter written with two code units whole', () => {
	expect(avatarFor('\u{1D49C}lpha').textContent).toBe('\u{1D49C}')
})

test('draws an empty circle for an empty name', () => {
	expect(avatarFor('   ').textContent).toBe('')
})

test('hides itself from assistive technology, since the name sits beside it', () => {
	expect(avatarFor('Maria Perez').getAttribute('aria-hidden')).toBe('true')
})

test('paints a name with a colour from the palette', () => {
	expect(backgrounds()).toContain(hexOf(avatarFor('Maria Perez').style.backgroundColor))
})

test.each([
	['Ana Lopez', '#3b59e4', '#f7ecbd'],
	['Maria Perez', '#c6396e', '#ecfaf4'],
	['another@example.com', '#964c9a', '#deefdd'],
])('draws the letter of %s on %s in %s, the pale colour WordPress pairs with it', (name, background, letter) => {
	const avatar = avatarFor(name)

	expect(hexOf(avatar.style.backgroundColor)).toBe(background)
	expect(hexOf(avatar.style.color)).toBe(letter)
})

test.each([
	['reader@example.com', '#007017'],
	['Luis Garcia', '#996800'],
	['Admin', '#50575e'],
])('keeps the letter of %s white on %s, a colour WordPress shows no sample of', (name, background) => {
	const avatar = avatarFor(name)

	expect(hexOf(avatar.style.backgroundColor)).toBe(background)
	expect(hexOf(avatar.style.color)).toBe('#ffffff')
})

test('paints the same name the same colour every time, whatever its case', () => {
	const first = avatarFor('Maria Perez').style.backgroundColor

	expect(avatarFor('Maria Perez').style.backgroundColor).toBe(first)
	expect(avatarFor('maria perez').style.backgroundColor).toBe(first)
})

test('spreads different names over every colour of the palette', () => {
	const names = Array.from({ length: 60 }, (_, index) => `user${index}@example.com`)
	const used = new Set(names.map((name) => hexOf(avatarFor(name).style.backgroundColor)))

	expect([...used].sort()).toEqual(backgrounds().sort())
})

test('keeps every colour of the palette at 4.5 to 1 or more against its letter', () => {
	for (const { background, letter } of AVATAR_COLORS) {
		const contrast = (luminance(letter) + 0.05) / (luminance(background) + 0.05)

		expect(contrast, `${background} is too light for its ${letter} letter`).toBeGreaterThanOrEqual(4.5)
	}
})

test('opens the palette with the blue, raspberry and purple the WordPress subscriber avatars paint', () => {
	expect(backgrounds().slice(0, 3)).toEqual(['#3b59e4', '#c6396e', '#964c9a'])
})

test('keeps the palette small', () => {
	expect(AVATAR_COLORS.length).toBe(6)
	expect(new Set(backgrounds()).size).toBe(AVATAR_COLORS.length)
})

test('keeps the size of the stylesheet when no size is given', () => {
	const avatar = avatarFor('Maria Perez')

	expect(avatar.style.inlineSize).toBe('')
	expect(avatar.style.blockSize).toBe('')
	expect(avatar.style.fontSize).toBe('')
})

test('draws the circle at the size it is given, as the 16px avatar before an author name', () => {
	const { container } = renderAdmin(<InitialsAvatar name="Maria Perez" size={16} />)
	const avatar = container.querySelector('.godmin-avatar') as HTMLElement

	expect(avatar.style.inlineSize).toBe('16px')
	expect(avatar.style.blockSize).toBe('16px')
})

test('scales the letter with the circle, as the default draws a 12px letter in 32px', () => {
	const { container } = renderAdmin(<InitialsAvatar name="Maria Perez" size={24} />)

	expect((container.querySelector('.godmin-avatar') as HTMLElement).style.fontSize).toBe('9px')
})

test('offers the avatar from the package entry', () => {
	expect(entry.InitialsAvatar).toBe(InitialsAvatar)
})
