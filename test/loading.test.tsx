// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { Skeleton } from '@wordpress/ui'
import { expect, test } from 'vitest'

import { LoadingRows, LoadingScreen } from '../src/loading.js'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Returns the class tokens the design system gives a sampled element.
 * @param element - The element to sample, carrying id="sample".
 * @returns The class tokens.
 */
function sampledClasses(element: React.ReactElement): string[] {
	const { container } = renderAdmin(element)
	return [...(container.querySelector('#sample') as Element).classList]
}

test('announces the label to a screen reader', () => {
	renderAdmin(<LoadingScreen label="Loading the report." />)

	expect(screen.getByRole('status').textContent).toBe('Loading the report.')
})

test('hides the announcement with the design system visually hidden', () => {
	renderAdmin(<LoadingScreen label="Loading the report." />)

	expect(screen.getByRole('status').hasAttribute('data-visually-hidden')).toBe(true)
})

test('builds the ghost from design system skeletons behind an aria veil', () => {
	const skeleton = sampledClasses(<Skeleton id="sample" />)
	expect(skeleton.length).toBeGreaterThan(0)
	const { container } = renderAdmin(<LoadingScreen label="Loading the report." />)

	const ghost = container.querySelector('.godmin-loading-screen__ghost') as Element
	expect(ghost.getAttribute('aria-hidden')).toBe('true')
	expect(ghost.children.length).toBeGreaterThanOrEqual(2)
	for (const child of ghost.children) {
		for (const token of skeleton) {
			expect([...child.classList]).toContain(token)
		}
	}
})

test('shapes the ghost as a title over content strokes', () => {
	const { container } = renderAdmin(<LoadingScreen label="Loading the report." />)

	expect(container.querySelector('.godmin-loading-screen')).not.toBeNull()
	expect(container.querySelectorAll('.godmin-loading-screen__title').length).toBe(1)
	expect(
		container.querySelectorAll('.godmin-loading-screen__stroke').length,
	).toBeGreaterThanOrEqual(2)
})

test('announces the rows label the same hidden way', () => {
	renderAdmin(<LoadingRows label="Loading reports." />)

	const status = screen.getByRole('status')
	expect(status.textContent).toBe('Loading reports.')
	expect(status.hasAttribute('data-visually-hidden')).toBe(true)
})

test('ghosts five rows of design system skeletons by default', () => {
	const skeleton = sampledClasses(<Skeleton id="sample" />)
	expect(skeleton.length).toBeGreaterThan(0)
	const { container } = renderAdmin(<LoadingRows label="Loading reports." />)

	const ghost = container.querySelector('.godmin-loading-rows__ghost') as Element
	expect(ghost.getAttribute('aria-hidden')).toBe('true')
	expect(container.querySelectorAll('.godmin-loading-rows__row').length).toBe(5)
	for (const child of ghost.children) {
		for (const token of skeleton) {
			expect([...child.classList]).toContain(token)
		}
	}
})

test('ghosts as many rows as a screen asks for', () => {
	const { container } = renderAdmin(<LoadingRows label="Loading reports." rows={3} />)

	expect(container.querySelectorAll('.godmin-loading-rows__row').length).toBe(3)
})
