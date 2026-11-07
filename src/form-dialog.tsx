// SPDX-License-Identifier: Apache-2.0

import { Button, Dialog, Stack } from '@wordpress/ui'
import { useId, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { POPUP_CLASS, useDialogOpen, useFinalFocus } from './dialog-open.js'

/** The props of a form dialog opened from a button outside a list row. */
export interface FormDialogProps {
	/** The fields, in the order the reader meets them. */
	children: ReactNode
	/** The title in the dialog header, beside its close icon, the name of the dialog. */
	title: string
	/** A help sentence before the fields, which describes the dialog. */
	description?: string
	/** The label of the button that sends the form. */
	submitLabel: string
	/** The label of the button that closes the dialog, none on a last step with nothing to cancel. */
	cancelLabel?: string
	/** Whether the form may be sent now, false while a needed field is empty, true when left out. */
	canSubmit?: boolean
	/** Sends the form. Return the write's promise to keep the button busy until it ends. */
	onSubmit: () => void | Promise<unknown>
	/** Takes the dialog away, once its card has left the page. */
	onClose: () => void
}

/**
 * Renders a form dialog opened from a button outside a list row, on the WPDS dialog, the first field focused.
 * @param props - The fields, the title, the help sentence, the labels, the send gate and the handlers.
 * @returns The dialog.
 */
export function FormDialog({
	children,
	title,
	description,
	submitLabel,
	cancelLabel,
	canSubmit = true,
	onSubmit,
	onClose,
}: FormDialogProps) {
	const { open, change, exitWatch } = useDialogOpen(onClose)
	const finalFocus = useFinalFocus()
	const [busy, setBusy] = useState(false)
	const form = useId()
	const sendable = canSubmit && !busy
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!sendable) {
			return
		}
		const sending = onSubmit()
		if (sending instanceof Promise) {
			setBusy(true)
			void sending.finally(() => setBusy(false))
		}
	}
	return (
		<Dialog.Root open={open} onOpenChange={change}>
			<Dialog.Popup className={POPUP_CLASS} finalFocus={finalFocus}>
				<Dialog.Header>
					<Dialog.Title>{title}</Dialog.Title>
					<Dialog.CloseIconButton />
				</Dialog.Header>
				<Dialog.Content>
					<Stack render={<form id={form} onSubmit={submit} />} direction="column" gap="lg">
						{description === undefined ? null : <Dialog.Description>{description}</Dialog.Description>}
						{children}
					</Stack>
				</Dialog.Content>
				<Dialog.Footer>
					{cancelLabel === undefined ? null : (
						<Dialog.Action variant="outline" tone="neutral">
							{cancelLabel}
						</Dialog.Action>
					)}
					<Button type="submit" form={form} loading={busy} disabled={!sendable}>
						{submitLabel}
					</Button>
				</Dialog.Footer>
				{exitWatch}
			</Dialog.Popup>
		</Dialog.Root>
	)
}
