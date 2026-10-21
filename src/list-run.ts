// SPDX-License-Identifier: Apache-2.0

import { useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** Settles a run on its list, focusing the list once an item moved. */
export type RunSettled = (moved: boolean) => void

/** What a list does around a run over its items. */
export interface ListRun {
	/** Starts a run on this list and returns what settles it. */
	onStart: () => RunSettled
}

/** The run a list's actions start and the region a finished run focuses. */
export interface ListRunState {
	/** What the list does around a run, the same object for as long as the screen stays. */
	run: ListRun
	/** The list region a finished run focuses, handed to `Page` as `listRef`. */
	region: RefObject<HTMLDivElement | null>
}

/**
 * Holds the region a finished run focuses, and drops older runs and the ticked rows when the list changes.
 * @param scope - Names the list on show.
 * @param onChangeSelection - Replaces the ticked rows, emptied when the list changes.
 * @returns The run and the region.
 */
export function useListRun(scope: string, onChangeSelection: (selection: string[]) => void): ListRunState {
	const region = useRef<HTMLDivElement>(null)
	const latest = useRef(0)
	const committed = useRef(scope)
	useLayoutEffect(() => {
		latest.current += 1
	}, [scope])
	useLayoutEffect(() => {
		if (committed.current !== scope) {
			committed.current = scope
			onChangeSelection([])
		}
	}, [scope, onChangeSelection])
	const [run] = useState<ListRun>(() => ({
		onStart: () => {
			latest.current += 1
			const id = latest.current
			return (moved) => {
				if (latest.current === id && moved) {
					region.current?.focus()
				}
			}
		},
	}))
	return { run, region }
}
