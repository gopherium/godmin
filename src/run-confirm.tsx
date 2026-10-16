// SPDX-License-Identifier: Apache-2.0

import { useState } from 'react'
import type { ReactNode } from 'react'

import { ConfirmBody } from './confirm.js'

/** The props of a run confirm, the first two as a DataViews modal hands them. */
export interface RunConfirmProps<Item> {
	/** The items the action runs over. */
	items: Item[]
	/** Closes the modal. */
	closeModal?: () => void
	/** The question the modal asks. */
	children: ReactNode
	/** The label of the button that starts the run. */
	confirmLabel: string
	/** The label of the button that closes the modal. */
	cancelLabel: string
	/** Runs the action over the items, settling once the list shows how it went. */
	run: (items: Item[]) => Promise<void>
}

/**
 * Renders a confirmation that runs the action, keeps Cancel inert while it runs and closes once it settles.
 * @param props - The items, the close handler, the question, the labels and the run.
 * @returns The confirmation body.
 */
export function RunConfirm<Item>({
	items,
	closeModal,
	children,
	confirmLabel,
	cancelLabel,
	run,
}: RunConfirmProps<Item>) {
	const [busy, setBusy] = useState(false)
	return (
		<ConfirmBody
			confirmLabel={confirmLabel}
			cancelLabel={cancelLabel}
			busy={busy}
			onCancel={closeModal}
			onConfirm={() => {
				setBusy(true)
				void run(items).finally(() => {
					setBusy(false)
					closeModal?.()
				})
			}}
		>
			{children}
		</ConfirmBody>
	)
}
