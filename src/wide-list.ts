// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { RefObject } from 'react'

import { ROUNDING_SLACK, useSizeWatch } from './size-watch.js'

/** The box DataViews scrolls its rows in, both ways. */
const SCROLL_BOX = '.dataviews-layout__container'

/**
 * Returns the boxes whose size decides whether a list is wide: the region, its scroll box and what the box holds.
 * @param region - The list region.
 * @returns The region, then the scroll box and its children when the region holds one.
 */
function listBoxes(region: HTMLElement): Element[] {
	const box = region.querySelector(SCROLL_BOX)
	return box === null ? [region] : [region, box, ...box.children]
}

/**
 * Reports whether the DataViews scroll box inside a region holds content wider than itself.
 * @param region - The list region.
 * @returns Whether the content runs past the box by more than the rounding slack.
 */
function overflows(region: HTMLElement): boolean {
	const box = region.querySelector(SCROLL_BOX)
	return box !== null && box.scrollWidth - box.clientWidth > ROUNDING_SLACK
}

/**
 * Watches the DataViews list inside a list region and reports while its content is wider than its space.
 * @param region - The list region.
 * @returns Whether the list is wider than its space, false until it is first measured.
 */
export function useWideList(region: RefObject<HTMLElement | null>): boolean {
	const [wide, setWide] = useState(false)
	useSizeWatch(region, listBoxes, (element) => setWide(overflows(element)), true)
	return wide
}
