// SPDX-License-Identifier: Apache-2.0

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { RefObject } from 'react'

/** Settles a run on its list: shows its failure, none when all finished, and focuses the list once an item moved. */
export type RunSettled = (failure: string | undefined, moved: boolean) => void

/** What a list does around a run over its items. */
export interface ListRun {
	/** Clears the failure the last run left above the list and returns what settles this run. */
	onStart: () => RunSettled
}

/** The failure a list shows above its rows, the run its actions start and the region a finished run focuses. */
export interface ListRunState {
	/** The failure of the last run on this list, absent while none failed. */
	failure?: string
	/** What the list does around a run, the same object while the list stays the same. */
	run: ListRun
	/** The list region a finished run focuses, handed to `Page` as `listRef`. */
	region: RefObject<HTMLDivElement | null>
}

/** The list a failure was shown for, and that failure. */
interface Shown {
	/** The list on show when the failure was set. */
	scope: string
	/** The failure of the last run on that list. */
	failure?: string
}

/**
 * Holds the failure shown above one list and the region a finished run focuses, and forgets both when the list changes.
 * @param scope - Names the list on show.
 * @param onChangeSelection - Replaces the ticked rows, emptied when the list changes.
 * @returns The failure on show, the run and the region.
 */
export function useListRun(scope: string, onChangeSelection: (selection: string[]) => void): ListRunState {
	const [shown, setShown] = useState<Shown>({ scope })
	const region = useRef<HTMLDivElement>(null)
	const latest = useRef(0)
	useLayoutEffect(() => {
		latest.current += 1
	}, [scope])
	if (shown.scope !== scope) {
		setShown({ scope })
		onChangeSelection([])
	}
	const run = useMemo<ListRun>(
		() => ({
			onStart: () => {
				latest.current += 1
				const id = latest.current
				setShown({ scope })
				return (failure, moved) => {
					if (latest.current !== id) {
						return
					}
					setShown({ scope, failure })
					if (moved) {
						region.current?.focus()
					}
				}
			},
		}),
		[scope],
	)
	return { failure: shown.failure, run, region }
}
