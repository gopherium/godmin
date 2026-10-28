// SPDX-License-Identifier: Apache-2.0

import { screen } from '@testing-library/react'
import { Skeleton, Spinner } from '@wordpress/ui'
import { expect, test } from 'vitest'

import { LoadingScreen } from '../src/loading.js'
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

/** Returns the loading screen a render drew. */
function drawnScreen(): Element {
	const { container } = renderAdmin(<LoadingScreen label="Loading the report." />)
	return container.querySelector('.godmin-loading-screen') as Element
}

test('announces the label to a screen reader', () => {
	renderAdmin(<LoadingScreen label="Loading the report." />)

	expect(screen.getByRole('status').textContent).toBe('Loading the report.')
})

test('hides the announcement with the design system visually hidden', () => {
	renderAdmin(<LoadingScreen label="Loading the report." />)

	expect(screen.getByRole('status').hasAttribute('data-visually-hidden')).toBe(true)
})

test('draws the design system spinner beside the status', () => {
	const spinner = sampledClasses(<Spinner id="sample" />)
	expect(spinner.length).toBeGreaterThan(0)

	const drawn = drawnScreen().querySelector('svg')

	expect(drawn?.getAttribute('role')).toBe('presentation')
	expect(spinner.filter((token) => !drawn?.classList.contains(token))).toEqual([])
})

test('draws nothing but the status and the spinner', () => {
	const spinner = sampledClasses(<Spinner id="sample" />)
	const skeleton = sampledClasses(<Skeleton id="sample" />)
	expect(skeleton.length).toBeGreaterThan(0)

	const drawn = drawnScreen()
	const second = drawn.children[1]
	const skeletons = [...drawn.querySelectorAll('*')].filter((part) =>
		skeleton.some((token) => part.classList.contains(token)),
	)

	expect(drawn.children).toHaveLength(2)
	expect(second.tagName).toBe('svg')
	expect(spinner.filter((token) => !second.classList.contains(token))).toEqual([])
	expect(skeletons).toEqual([])
})
