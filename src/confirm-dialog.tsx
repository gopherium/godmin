// SPDX-License-Identifier: Apache-2.0

import { Modal } from '@wordpress/components'
import { useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ConfirmBody } from './confirm.js'

/** The props of a confirmation dialog for an action outside a list. */
export interface ConfirmDialogProps {
	/** The question the dialog asks, its name when it has no title. */
	children: ReactNode
	/** The title of a plain confirm, drawn in a header with a close button, none on a confirm that removes something. */
	title?: string
	/** The width of the card from 600px up, small at 400px or medium at 560px, the default. */
	size?: 'small' | 'medium'
	/** The label of the button that carries the action out. */
	confirmLabel: string
	/** The label of the button that closes the dialog. */
	cancelLabel: string
	/** Carries the action out. Return nothing to close at once, or the write's promise to stay busy until it ends. */
	onConfirm: () => void | Promise<unknown>
	/** Takes the dialog away after Cancel, Escape, a click outside it, its close button or a confirm that finished. */
	onClose: () => void
}

/**
 * Renders a confirmation dialog for an action outside a list, as WordPress dialogs ask, Cancel focused.
 * @param props - The question, the title, the size, the labels and the handlers.
 * @returns The dialog.
 */
export function ConfirmDialog({
	children,
	title,
	size = 'medium',
	confirmLabel,
	cancelLabel,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	const [busy, setBusy] = useState(false)
	const open = useRef(true)
	const question = useId()
	const close = () => {
		if (open.current) {
			open.current = false
			onClose()
		}
	}
	const confirm = () => {
		const running = onConfirm()
		if (!(running instanceof Promise)) {
			close()
			return
		}
		setBusy(true)
		void running.finally(() => {
			setBusy(false)
			close()
		})
	}
	return (
		<Modal
			size={size}
			focusOnMount="firstContentElement"
			title={title}
			__experimentalHideHeader={title === undefined}
			aria={{ labelledby: question, describedby: title === undefined ? undefined : question }}
			onRequestClose={close}
		>
			<ConfirmBody confirmLabel={confirmLabel} cancelLabel={cancelLabel} busy={busy} onConfirm={confirm} onCancel={close}>
				<span id={question}>{children}</span>
			</ConfirmBody>
		</Modal>
	)
}
