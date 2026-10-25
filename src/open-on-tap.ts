// SPDX-License-Identifier: Apache-2.0

/** The part of a list view a tap reads, which `useListView` returns among the rest. */
export interface TapList {
	/** Whether the viewport takes the phone layout. */
	phone: boolean
	/** Holds the rows ticked in the wide layout. */
	onChangeSelection: (selection: string[]) => void
}

/**
 * Returns the selection handler a list hands DataViews, opening the record a tap lands on in the phone layout.
 * @param list - The list view the screen holds.
 * @param open - Opens the record with the given id.
 * @returns The handler.
 */
export function openOnTap(list: TapList, open: (id: string) => void): (selection: string[]) => void {
	if (!list.phone) {
		return list.onChangeSelection
	}
	return ([id]) => {
		if (id !== undefined) {
			open(id)
		}
	}
}
