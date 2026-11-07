// SPDX-License-Identifier: Apache-2.0

import { speak } from '@wordpress/a11y'
import { Button, Dialog, Notice, Stack } from '@wordpress/ui'
import { useId, useLayoutEffect, useRef, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'

import { POPUP_CLASS, answered, isThenable, refuseSecondClick, useDialogOpen, useFinalFocus } from './dialog-open.js'
import type { DialogAnswer } from './dialog-open.js'

/** The props of a form dialog opened from a button outside a list row. */
export interface FormDialogProps {
	/** The fields in the order the reader meets them, or a function of whether the write runs that draws them. */
	children: ReactNode | ((busy: boolean) => ReactNode)
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
	/** Sends the form. Return nothing to close at once, the write to hold the dialog until it ends, or an answer. */
	onSubmit: () => void | DialogAnswer | PromiseLike<unknown>
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
	const [failure, setFailure] = useState<string>()
	const [failures, setFailures] = useState(0)
	const content = useRef<HTMLDivElement>(null)
	const form = useId()
	const sendable = canSubmit && !busy && open
	useLayoutEffect(() => {
		const body = content.current
		if (failures > 0 && body !== null) {
			body.scrollTop = body.scrollHeight
		}
	}, [failures])
	const guarded = (next: boolean) => {
		if (next || !busy) {
			change(next)
		}
	}
	const clear = () => setFailure(undefined)
	const settle = (answer: DialogAnswer | undefined) => {
		if (answer === undefined) {
			change(false)
		} else if ('error' in answer) {
			setFailure(answer.error)
			setFailures((count) => count + 1)
			speak(answer.error, 'assertive')
		}
	}
	const submit = (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault()
		if (!sendable) {
			return
		}
		clear()
		const answer = answered(onSubmit)
		if (!isThenable(answer)) {
			settle(answer)
			return
		}
		setBusy(true)
		void answer.then((reply) => {
			setBusy(false)
			settle(reply)
		})
	}
	return (
		<Dialog.Root open={open} onOpenChange={guarded}>
			<Dialog.Popup className={POPUP_CLASS} finalFocus={finalFocus}>
				<Dialog.Header>
					<Dialog.Title>{title}</Dialog.Title>
					<Dialog.CloseIconButton disabled={busy} />
				</Dialog.Header>
				<Dialog.Content ref={content}>
					<Stack render={<form id={form} onSubmit={submit} onChange={clear} />} direction="column" gap="lg">
						{description === undefined ? null : <Dialog.Description>{description}</Dialog.Description>}
						{typeof children === 'function' ? children(busy) : children}
						{failure === undefined ? null : (
							<Notice.Root intent="error">
								<Notice.Description>{failure}</Notice.Description>
							</Notice.Root>
						)}
					</Stack>
				</Dialog.Content>
				<Dialog.Footer>
					{cancelLabel === undefined ? null : (
						<Dialog.Action variant="outline" tone="neutral" disabled={busy}>
							{cancelLabel}
						</Dialog.Action>
					)}
					<Button
						type="submit"
						form={form}
						loading={busy}
						disabled={!sendable}
						onClick={refuseSecondClick}
					>
						{submitLabel}
					</Button>
				</Dialog.Footer>
				{exitWatch}
			</Dialog.Popup>
		</Dialog.Root>
	)
}
