// SPDX-License-Identifier: Apache-2.0

import { Button, Stack, Text } from '@wordpress/ui'
import type { ReactNode } from 'react'

import { ErrorNotice } from './page.js'

export interface ConfirmBodyProps {
	/** The question the modal asks. */
	children: ReactNode
	/** The label of the button that carries the action out. */
	confirmLabel: string
	/** The label of the button that closes the modal. */
	cancelLabel: string
	/** Whether the action is running, the confirm button then busy. */
	busy?: boolean
	/** The failure of the last try, shown inside the modal. */
	failure?: string
	/** Carries the action out. */
	onConfirm: () => void
	/** Closes the modal. */
	onCancel?: () => void
}

/**
 * Renders the body of a confirmation modal: the question, a failure notice, a minimal Cancel and the confirm button.
 * @param props - The question, the labels, the busy flag, the failure and the handlers.
 * @returns The confirmation body.
 */
export function ConfirmBody({
	children,
	confirmLabel,
	cancelLabel,
	busy = false,
	failure,
	onConfirm,
	onCancel,
}: ConfirmBodyProps) {
	return (
		<Stack direction="column" gap="lg">
			<Text>{children}</Text>
			{failure === undefined ? null : <ErrorNotice>{failure}</ErrorNotice>}
			<Stack direction="row" gap="sm" justify="flex-end">
				<Button variant="minimal" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<Button loading={busy} onClick={onConfirm}>
					{confirmLabel}
				</Button>
			</Stack>
		</Stack>
	)
}
