// SPDX-License-Identifier: Apache-2.0

import { Modal } from '@wordpress/components'
import { useId, useState } from 'react'
import type { ReactNode } from 'react'

import { ConfirmBody } from './confirm.js'

/** The props of a confirmation dialog for an action outside a list. */
export interface ConfirmDialogProps {
	/** The question the dialog asks, its name when it has no title. */
	children: ReactNode
	/** The title of a plain confirm, drawn in a header with a close button, none on a confirm that removes something. */
	title?: string
	/** The label of the button that carries the action out. */
	confirmLabel: string
	/** The label of the button that closes the dialog. */
	cancelLabel: string
	/** Carries the action out, resolving with the failure to show, or with nothing once it is done. */
	onConfirm: () => Promise<string | undefined>
	/** Takes the dialog away after Cancel, Escape, a click outside it, its close button or a confirm that finished. */
	onClose: () => void
}

/**
 * Renders a confirmation dialog for an action outside a list, as WordPress dialogs ask, Cancel focused.
 * @param props - The question, the title, the labels and the handlers.
 * @returns The dialog.
 */
export function ConfirmDialog({ children, title, confirmLabel, cancelLabel, onConfirm, onClose }: ConfirmDialogProps) {
	const [busy, setBusy] = useState(false)
	const [failure, setFailure] = useState<string>()
	const question = useId()
	const confirm = async () => {
		setBusy(true)
		setFailure(undefined)
		let failed: string | undefined
		try {
			failed = await onConfirm()
		} finally {
			setBusy(false)
		}
		if (failed === undefined) {
			onClose()
			return
		}
		setFailure(failed)
	}
	return (
		<Modal
			size="medium"
			focusOnMount="firstContentElement"
			title={title}
			__experimentalHideHeader={title === undefined}
			aria={{ labelledby: question, describedby: title === undefined ? undefined : question }}
			isDismissible={!busy}
			shouldCloseOnEsc={!busy}
			shouldCloseOnClickOutside={!busy}
			onRequestClose={onClose}
		>
			<ConfirmBody
				confirmLabel={confirmLabel}
				cancelLabel={cancelLabel}
				busy={busy}
				failure={failure}
				onConfirm={() => void confirm()}
				onCancel={onClose}
			>
				<span id={question}>{children}</span>
			</ConfirmBody>
		</Modal>
	)
}
