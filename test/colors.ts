// SPDX-License-Identifier: Apache-2.0

/**
 * Returns the value one design token takes on the nearest theme around an element.
 * @param element - The element the theme wraps.
 * @param token - The custom property name.
 * @returns The value the nearest theme sets.
 */
export function tokenAround(element: Element, token: string): string {
	return (element.closest(`[style*="${token}:"]`) as HTMLElement).style.getPropertyValue(token)
}

/**
 * Returns the colour a stylesheet value of one design token takes on the nearest theme around an element.
 * @param element - The element the theme wraps.
 * @param value - The value as the stylesheet writes it, such as `var(--wpds-color-background-thumb-brand)`.
 * @returns The colour the nearest theme sets for the token.
 */
export function tokenColor(element: Element, value: string | undefined): string {
	const token = /^var\((--[\w-]+)\)$/.exec(value ?? '')?.[1]
	if (token === undefined) {
		throw new Error(`${value} is not one design token`)
	}
	return tokenAround(element, token)
}

/**
 * Returns the relative luminance of a colour written as #rrggbb or #rgb.
 * @param hex - The colour.
 * @returns The luminance, from 0 for black to 1 for white.
 */
function luminance(hex: string): number {
	const digits = hex.length === 4 ? [...hex.slice(1)].map((digit) => digit + digit).join('') : hex.slice(1)
	const [red, green, blue] = [0, 2, 4].map((at) => {
		const channel = Number.parseInt(digits.slice(at, at + 2), 16) / 255
		return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
	})
	return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/**
 * Returns the WCAG contrast ratio of two colours written as #rrggbb or #rgb, the lighter over the darker.
 * @param one - One colour.
 * @param other - The other colour.
 * @returns The ratio, from 1 to 21.
 */
export function contrastRatio(one: string, other: string): number {
	const [lighter, darker] = [luminance(one), luminance(other)].sort((first, second) => second - first)
	return (lighter + 0.05) / (darker + 0.05)
}
