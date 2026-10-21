// SPDX-License-Identifier: Apache-2.0

import { Button, Stack, Text } from '@wordpress/ui'
import type { ReactNode } from 'react'

export interface ConfirmBodyProps {
	/** The question the modal asks. */
	children: ReactNode
	/** The label of the button that carries the action out. */
	confirmLabel: string
	/** The label of the button that closes the modal. */
	cancelLabel: string
	/** Whether the action is running, the confirm button then busy and Cancel greyed out. */
	busy?: boolean
	/** Carries the action out. */
	onConfirm: () => void
	/** Closes the modal. */
	onCancel?: () => void
}

/**
 * Renders a confirmation modal body: the question, an accent text Cancel and the confirm button, 20px apart.
 * @param props - The question, the labels, the busy flag and the handlers.
 * @returns The confirmation body.
 */
export function ConfirmBody({
	children,
	confirmLabel,
	cancelLabel,
	busy = false,
	onConfirm,
	onCancel,
}: ConfirmBodyProps) {
	return (
		<div className="godmin-modal-body">
			<Text className="godmin-modal-body__question">{children}</Text>
			<Stack direction="row" gap="sm" justify="flex-end">
				<Button variant="minimal" disabled={busy} onClick={onCancel}>
					{cancelLabel}
				</Button>
				<Button loading={busy} onClick={onConfirm}>
					{confirmLabel}
				</Button>
			</Stack>
		</div>
	)
}
