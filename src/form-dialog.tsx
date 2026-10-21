// SPDX-License-Identifier: Apache-2.0

import { Modal } from '@wordpress/components'
import { useState } from 'react'
import type { ReactNode } from 'react'

import { FormBody } from './form.js'
import type { FormKind } from './form.js'

/** The props of a form dialog opened from a button outside a list row. */
export interface FormDialogProps {
	/** The fields, and any help sentence before them, in the order the reader meets them. */
	children: ReactNode
	/** The title in the dialog header, beside its close button. */
	title: string
	/** The width from 600px up: small at 400px, the default, or medium at 560px when a control needs the room. */
	size?: 'small' | 'medium'
	/** The label of the button that sends the form. */
	submitLabel: string
	/** The label of the button that closes the dialog. */
	cancelLabel: string
	/** Whether the form may be sent now, false while a needed field is empty, true when left out. */
	canSubmit?: boolean
	/** What the form does: 16px above the buttons for a create, the default, 20px for an edit, 12px for a copy. */
	kind?: FormKind
	/** Sends the form. Return the write's promise to keep the button busy until it ends. */
	onSubmit: () => void | Promise<void>
	/** Takes the dialog away after Cancel, Escape, a click on the dimmed page or the close button. */
	onClose: () => void
}

/**
 * Renders a form dialog opened from a button outside a list row, as WordPress opens Add Page, the first field focused.
 * @param props - The fields, the title, the size, the labels, the send gate, the kind and the handlers.
 * @returns The dialog.
 */
export function FormDialog({
	children,
	title,
	size = 'small',
	submitLabel,
	cancelLabel,
	canSubmit,
	kind = 'create',
	onSubmit,
	onClose,
}: FormDialogProps) {
	const [busy, setBusy] = useState(false)
	const send = () => {
		const sending = onSubmit()
		if (sending instanceof Promise) {
			setBusy(true)
			void sending.finally(() => setBusy(false))
		}
	}
	return (
		<Modal title={title} size={size} focusOnMount="firstContentElement" onRequestClose={onClose}>
			<FormBody
				submitLabel={submitLabel}
				cancelLabel={cancelLabel}
				canSubmit={canSubmit}
				busy={busy}
				kind={kind}
				onSubmit={send}
				onCancel={onClose}
			>
				{children}
			</FormBody>
		</Modal>
	)
}
