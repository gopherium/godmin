// SPDX-License-Identifier: Apache-2.0

/** How a key joins its words: camel gives birthDate, kebab gives birth-date. */
export type KeyStyle = 'camel' | 'kebab'

/** What turning a label into a key needs besides the label. */
export interface KeyOptions {
	/** How the key joins its words. */
	style: KeyStyle
	/** The keys already in use, which the new key must not repeat. */
	taken?: Iterable<string>
}

/** The word a key starts with when the label gives none, or starts with a digit. */
const LEAD = 'field'

/**
 * Returns the lowercase words of a label, without accents or punctuation.
 * @param label - The label to split.
 * @returns The words in order.
 */
function wordsOf(label: string): string[] {
	const plain = label.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
	return plain.split(/[^a-z0-9]+/).filter((word) => word !== '')
}

/**
 * Returns the words joined in a key style.
 * @param words - The words to join.
 * @param style - How to join them.
 * @returns The joined key.
 */
function joined(words: string[], style: KeyStyle): string {
	if (style === 'kebab') {
		return words.join('-')
	}
	return words.map((word, at) => (at === 0 ? word : word.charAt(0).toUpperCase() + word.slice(1))).join('')
}

/**
 * Returns a key made from a label in a style, with the first free number added when the key is taken.
 * @param label - The label the operator typed.
 * @param options - The key style and the keys already in use.
 * @returns The key.
 */
export function keyFromLabel(label: string, { style, taken = [] }: KeyOptions): string {
	const words = wordsOf(label)
	if (words.length === 0 || /^\d/.test(words[0] as string)) {
		words.unshift(LEAD)
	}
	const stem = joined(words, style)
	const used = new Set(taken)
	const joiner = style === 'kebab' ? '-' : ''
	let key = stem
	for (let number = 2; used.has(key); number++) {
		key = `${stem}${joiner}${number}`
	}
	return key
}
