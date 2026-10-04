/* oxlint-disable react/only-export-components -- the palette ships beside the avatar that paints with it. */
import type { CSSProperties } from 'react'

/** A circle colour of the initials avatar and the colour its letter takes on it. */
export interface AvatarColor {
	/** The circle colour as #rrggbb. */
	background: string
	/** The letter colour as #rrggbb. */
	letter: string
}

/**
 * The colours an initials avatar paints with, the WordPress blue, raspberry and purple first with their pale letters.
 */
export const AVATAR_COLORS: readonly AvatarColor[] = [
	{ background: '#3b59e4', letter: '#f7ecbd' },
	{ background: '#c6396e', letter: '#ecfaf4' },
	{ background: '#964c9a', letter: '#deefdd' },
	{ background: '#007017', letter: '#ffffff' },
	{ background: '#996800', letter: '#ffffff' },
	{ background: '#50575e', letter: '#ffffff' },
]

/**
 * Returns the palette colours a name always gets, whatever its case.
 * @param name - The name the avatar stands for.
 * @returns The circle and letter colours.
 */
function colorFor(name: string): AvatarColor {
	let hash = 0
	for (const letter of name.trim().toLocaleLowerCase()) {
		hash = (hash * 31 + (letter.codePointAt(0) as number)) % 2147483647
	}
	return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

/**
 * Returns the first letter of a name in capitals, or nothing for an empty name.
 * @param name - The name the avatar stands for.
 * @returns The letter to draw.
 */
function initialOf(name: string): string {
	const [first = ''] = Array.from(name.trim())
	return first.toLocaleUpperCase()
}

/**
 * The share of the circle a letter takes, 12px in the 32px stylesheet circle.
 */
const LETTER_SHARE = 12 / 32

/**
 * Returns the inline size of an avatar drawn at the given size, none for the stylesheet size.
 * @param size - The width and height in pixels, absent for the stylesheet size.
 * @returns The circle and letter sizes, or nothing.
 */
function sizedBy(size: number | undefined): CSSProperties {
	if (size === undefined) {
		return {}
	}
	return { inlineSize: size, blockSize: size, fontSize: size * LETTER_SHARE }
}

export interface InitialsAvatarProps {
	/** The name the avatar stands for, whose first letter it draws. */
	name: string
	/** The avatar's width and height in pixels, the stylesheet size when absent. */
	size?: number
}

/**
 * Renders a round avatar with the first letter of a name, in the letter colour of the circle colour the name picks.
 * @param props - The name the avatar stands for and its size.
 * @returns The avatar element.
 */
export function InitialsAvatar({ name, size }: InitialsAvatarProps) {
	const { background, letter } = colorFor(name)
	return (
		<span
			className="godmin-avatar"
			aria-hidden="true"
			style={{ backgroundColor: background, color: letter, ...sizedBy(size) }}
		>
			{initialOf(name)}
		</span>
	)
}
