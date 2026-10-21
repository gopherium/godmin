// SPDX-License-Identifier: Apache-2.0

import { Button, Stack } from '@wordpress/ui'
import type { ReactNode } from 'react'

/** What a form does, which sets the space above its buttons as WordPress spaces it. */
export type FormKind = 'edit' | 'copy' | 'create'

/** The classes of a form body of each kind. */
const KIND_CLASSES: Record<FormKind, string> = {
	edit: 'godmin-modal-body',
	copy: 'godmin-modal-body godmin-modal-body--copy',
	create: 'godmin-modal-body godmin-modal-body--create',
}

/** The props of the body of a form modal. */
export interface FormBodyProps {
	/** The fields, and any help sentence before them, in the order the reader meets them. */
	children: ReactNode
	/** The label of the button that sends the form. */
	submitLabel: string
	/** The label of the button that closes the modal. */
	cancelLabel: string
	/** Whether the form may be sent now, false while a needed field is empty, true when left out. */
	canSubmit?: boolean
	/** Whether the write runs, the submit button then busy and a second send ignored. */
	busy?: boolean
	/** What the form does: 20px above the buttons for an edit, the default, 12px for a copy, 16px for a create. */
	kind?: FormKind
	/** Sends the form, from the submit button or Enter in a field. */
	onSubmit: () => void
	/** Closes the modal. */
	onCancel?: () => void
}

/**
 * Renders the body of a form modal: the fields, an accent text Cancel and the submit button.
 * @param props - The fields, the labels, the send gate, the busy flag, the kind and the handlers.
 * @returns The form.
 */
export function FormBody({
	children,
	submitLabel,
	cancelLabel,
	canSubmit = true,
	busy = false,
	kind = 'edit',
	onSubmit,
	onCancel,
}: FormBodyProps) {
	const sendable = canSubmit && !busy
	return (
		<form
			className={KIND_CLASSES[kind]}
			onSubmit={(event) => {
				event.preventDefault()
				if (sendable) {
					onSubmit()
				}
			}}
		>
			{children}
			<Stack direction="row" gap="sm" justify="flex-end">
				<Button variant="minimal" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<Button type="submit" loading={busy} disabled={!sendable}>
					{submitLabel}
				</Button>
			</Stack>
		</form>
	)
}
