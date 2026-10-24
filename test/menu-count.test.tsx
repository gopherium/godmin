// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { Frame } from '../src/frame.js'
import * as entry from '../src/index'
import { MenuCount } from '../src/menu-count.js'
import { badgeClasses, installTestEnvironment, renderAdmin } from '../src/testing.js'
import { contrastRatio, tokenColor } from './colors.js'
import { declaredValue, ruleValue } from './styles.js'

installTestEnvironment()

/**
 * Renders a menu link whose label ends in a count.
 * @param count - The number the count shows.
 * @returns The testing library render result.
 */
function renderMenuLink(count: number) {
	return renderAdmin(
		<a href="/updates">
			Updates <MenuCount count={count} label={`${count} updates available`} />
		</a>,
	)
}

test('shows the count as the text of a design system badge in the high intent', () => {
	const high = badgeClasses('high')
	const { container } = renderMenuLink(3)

	const badge = container.querySelector('.godmin-menu-count__badge') as Element
	expect(badge.textContent).toBe('3')
	expect(high.length).toBeGreaterThan(0)
	for (const token of high) {
		expect([...badge.classList]).toContain(token)
	}
})

test('reads the sentence the app passes once, in place of the bare number', () => {
	renderMenuLink(3)

	expect(screen.getByRole('link', { name: 'Updates 3 updates available' })).not.toBeNull()
})

test('hides the visible number from screen readers', () => {
	const { container } = renderMenuLink(3)

	expect(container.querySelector('.godmin-menu-count__badge')?.getAttribute('aria-hidden')).toBe('true')
})

test('carries the sentence in design system visually hidden text inline with the label', () => {
	renderMenuLink(3)

	const sentence = screen.getByText('3 updates available')
	expect(sentence.hasAttribute('data-visually-hidden')).toBe(true)
	expect(sentence.tagName).toBe('SPAN')
})

test('holds the badge and the sentence in one inline element a menu item can place', () => {
	const { container } = renderMenuLink(3)

	const count = container.querySelector('.godmin-menu-count') as Element
	expect(count.tagName).toBe('SPAN')
	expect(count.children.length).toBe(2)
	expect(count.textContent).toBe('33 updates available')
})

test('renders nothing at a count of zero, as WordPress hides its count-0 bubble', () => {
	const { container } = renderMenuLink(0)

	expect(container.querySelector('.godmin-menu-count')).toBeNull()
	expect(screen.getByRole('link').textContent).toBe('Updates ')
})

test('renders nothing for a count below zero', () => {
	const { container } = renderMenuLink(-2)

	expect(container.querySelector('.godmin-menu-count')).toBeNull()
})

test('renders nothing for a count that is not a number', () => {
	const { container } = renderMenuLink(Number.NaN)

	expect(container.querySelector('.godmin-menu-count')).toBeNull()
})

test('writes a large count in the number format of the reader, as WordPress formats its count', () => {
	const { container } = renderMenuLink(1234)

	expect(container.querySelector('.godmin-menu-count__badge')?.textContent).toBe((1234).toLocaleString())
})

test('offers the menu count from the package entry', () => {
	expect(entry.MenuCount).toBe(MenuCount)
})

/**
 * Returns the badge a menu count draws for three.
 * @returns The badge element.
 */
function countBadge(): Element {
	const { container } = renderMenuLink(3)
	return container.querySelector('.godmin-menu-count__badge') as Element
}

test('sizes the count as the WordPress pill: 18px tall, at least 18px wide and half its height round', () => {
	const badge = countBadge()

	expect(declaredValue(badge, '--godmin-menu-count-size')).toBe('18px')
	expect(declaredValue(badge, 'display')).toBe('inline-block')
	expect(declaredValue(badge, 'box-sizing')).toBe('border-box')
	expect(declaredValue(badge, 'block-size')).toBe('var(--godmin-menu-count-size)')
	expect(declaredValue(badge, 'min-inline-size')).toBe('var(--godmin-menu-count-size)')
	expect(declaredValue(badge, 'border-radius')).toBe('calc(var(--godmin-menu-count-size) / 2)')
})

test('pads the count 5px at the sides and none above or below, as WordPress does', () => {
	const badge = countBadge()

	expect(declaredValue(badge, 'padding-block')).toBe('0')
	expect(declaredValue(badge, 'padding-inline')).toBe('5px')
})

test('sets the number in 11px text centred on a 1.6 line, as WordPress does', () => {
	const badge = countBadge()

	expect(declaredValue(badge, 'font-size')).toBe('var(--wpds-typography-font-size-xs)')
	expect(declaredValue(badge, 'line-height')).toBe('1.6')
	expect(declaredValue(badge, 'text-align')).toBe('center')
})

test('sets the count 2px after its label and centred on the line, with no block margin to move the label', () => {
	const badge = countBadge()

	expect(declaredValue(badge, 'vertical-align')).toBe('middle')
	expect(declaredValue(badge, 'margin-block')).toBeUndefined()
	expect(declaredValue(badge, 'margin')).toBeUndefined()
	expect(declaredValue(badge, 'margin-inline-start')).toBe('2px')
})

test('gives the number the weight of its label, as WordPress sets none on its count', () => {
	expect(declaredValue(countBadge(), 'font-weight')).toBe('inherit')
})

test(
	'fills the count with the brand thumb of the scheme and draws the digit in the neutral strong text over it',
	() => {
		const badge = countBadge()

		expect(declaredValue(badge, 'background-color')).toBe('var(--wpds-color-background-thumb-brand)')
		expect(declaredValue(badge, 'color')).toBe('var(--wpds-color-foreground-interactive-neutral-strong)')
		expect(declaredValue(badge, 'background')).toBeUndefined()
	},
)

/**
 * Renders a count in the sidebar and another in the canvas of a frame on its default colours.
 * @returns The badge drawn in the sidebar and the badge drawn in the canvas.
 */
function framedBadges(): Record<'sidebar' | 'canvas', Element> {
	const { container } = renderAdmin(
		<Frame.Root>
			<Frame.Sidebar>
				<MenuCount count={3} label="3 updates available" />
			</Frame.Sidebar>
			<Frame.Canvas>
				<MenuCount count={4} label="4 items waiting" />
			</Frame.Canvas>
		</Frame.Root>,
	)
	return {
		sidebar: container.querySelector('.godmin-layout__sidebar .godmin-menu-count__badge') as Element,
		canvas: container.querySelector('.godmin-layout__canvas .godmin-menu-count__badge') as Element,
	}
}

/**
 * Returns the fill and the digit colour of a count badge on the theme around it.
 * @param badge - The badge element.
 * @returns The two colours the stylesheet reads from the theme.
 */
function pillColors(badge: Element): { fill: string; digit: string } {
	return {
		fill: tokenColor(badge, declaredValue(badge, 'background-color')),
		digit: tokenColor(badge, declaredValue(badge, 'color')),
	}
}

test.each(['sidebar', 'canvas'] as const)(
	'keeps the digit at 4.5 to 1 or more on the pill in the %s of the default frame',
	(region) => {
		const { fill, digit } = pillColors(framedBadges()[region])

		expect(contrastRatio(digit, fill), `${digit} on ${fill}`).toBeGreaterThanOrEqual(4.5)
	},
)

test.each([
	['sidebar', '.godmin-layout', 'sidebar'],
	['phone drawer', '.godmin-layout__drawer', 'sidebar'],
	['current row', ".godmin-navigation-item[aria-current='page']", 'sidebar'],
	['canvas', '.godmin-layout__canvas', 'canvas'],
] as const)('keeps the pill at 3 to 1 or more on the %s of the default frame', (_, selector, region) => {
	const badge = framedBadges()[region]
	const { fill } = pillColors(badge)
	const surface = tokenColor(badge, ruleValue(selector, 'background'))

	expect(contrastRatio(fill, surface), `${fill} on ${surface}`).toBeGreaterThanOrEqual(3)
})
