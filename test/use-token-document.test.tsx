// SPDX-License-Identifier: Apache-2.0

import { registerStyle } from '@wordpress/style-runtime'
import { render } from '@testing-library/react'
import { expect, test } from 'vitest'

import { useTokenDocument } from '../src/index'

/**
 * Returns a detached document standing in for an iframe or popup document.
 * @returns A fresh HTML document with its own head.
 */
function secondaryDocument(): Document {
	return document.implementation.createHTMLDocument('secondary')
}

/**
 * Returns whether the given document carries the style with the given hash.
 * @param target - The document to inspect.
 * @param hash - The style hash to look for.
 * @returns Whether a matching style element is present.
 */
function hasStyle(target: Document, hash: string): boolean {
	return target.head.querySelector(`style[data-wp-hash="${hash}"]`) !== null
}

/**
 * Renders a component registering the given document for the kit's styles.
 * @param target - The document to register.
 * @returns The testing library render result.
 */
function renderFor(target: Document) {
	function Host() {
		useTokenDocument(target)
		return null
	}
	return render(<Host />)
}

test('injects the styles registered before mount into the target document', () => {
	registerStyle('godmin-before', '.before { color: red }')
	const target = secondaryDocument()

	renderFor(target)

	expect(hasStyle(target, 'godmin-before')).toBe(true)
})

test('keeps injecting styles registered while mounted', () => {
	const target = secondaryDocument()
	renderFor(target)

	registerStyle('godmin-during', '.during { color: blue }')

	expect(hasStyle(target, 'godmin-during')).toBe(true)
})

test('stops injecting once unmounted', () => {
	const target = secondaryDocument()
	const view = renderFor(target)

	view.unmount()
	registerStyle('godmin-after', '.after { color: green }')

	expect(hasStyle(target, 'godmin-after')).toBe(false)
})

test('ignores an absent document so a ref can start empty', () => {
	expect(() => renderFor(undefined as unknown as Document)).not.toThrow()
})
