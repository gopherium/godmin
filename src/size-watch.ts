// SPDX-License-Identifier: Apache-2.0

import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'

/** The pixels a box may run past an edge and still rest on it, for sub-pixel rounding. */
export const ROUNDING_SLACK = 1

/**
 * Measures once, then again whenever the element or a box it names resizes, or its children change.
 * @param ref - The element to watch.
 * @param boxesOf - Names the boxes whose size the measure reads, given the element.
 * @param measure - Reads the element, the one given on the latest render.
 * @param subtree - Whether a change deeper than the element's own children wires the boxes again.
 */
export function useSizeWatch(
	ref: RefObject<HTMLElement | null>,
	boxesOf: (element: HTMLElement) => Element[],
	measure: (element: HTMLElement) => void,
	subtree: boolean,
): void {
	const latest = useRef(measure)
	useLayoutEffect(() => {
		latest.current = measure
	})
	useLayoutEffect(() => {
		const element = ref.current as HTMLElement
		const measureNow = () => latest.current(element)
		const resizes = new ResizeObserver(measureNow)
		const watch = () => {
			resizes.disconnect()
			for (const box of boxesOf(element)) {
				resizes.observe(box)
			}
			measureNow()
		}
		const mutations = new MutationObserver(watch)
		mutations.observe(element, { childList: true, subtree })
		watch()
		return () => {
			mutations.disconnect()
			resizes.disconnect()
		}
	}, [ref, boxesOf, subtree])
}
