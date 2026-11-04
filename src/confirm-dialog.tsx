// SPDX-License-Identifier: Apache-2.0

import { AlertDialog } from '@wordpress/ui'

import {
	POPUP_CLASS,
	answerOf,
	isThenable,
	passRejectionOn,
	refuseRepeatedEnter,
	refuseSecondClick,
	useDialogOpen,
	useFinalFocus,
} from './dialog-open.js'
import type { DialogAnswer } from './dialog-open.js'

/** The props of a dialog that asks one question before an action. */
export interface ConfirmDialogProps {
	/** The question the dialog asks, its name. */
	title: string
	/** What will happen, in plain words. */
	description?: string
	/** Whether the action cannot be undone, which draws its button red. */
	intent?: 'default' | 'irreversible'
	/** The label of the button that carries the action out. */
	confirmLabel: string
	/** The label of the button that closes the dialog. */
	cancelLabel: string
	/** Carries the action out. Return nothing to close at once, the write to stay busy, or an answer to stay open. */
	onConfirm: () => void | DialogAnswer | PromiseLike<unknown>
	/** Takes the dialog away, once its card has left the page. */
	onClose: () => void
}

/**
 * Reads what an action returned, waiting for a write still running and handing a rejection on to the app.
 * @param running - What the action returned.
 * @returns What the dialog reads, as soon as an action that returned no write allows.
 */
function confirmed(running: unknown): DialogAnswer | undefined | Promise<DialogAnswer | undefined> {
	return isThenable(running) ? Promise.resolve(running).then(answerOf, passRejectionOn) : answerOf(running)
}

/**
 * Renders a dialog that asks one question before an action, on the WPDS alert dialog, with Cancel focused.
 * @param props - The question, what will happen, the intent, the labels and the handlers.
 * @returns The dialog.
 */
export function ConfirmDialog({
	title,
	description,
	intent,
	confirmLabel,
	cancelLabel,
	onConfirm,
	onClose,
}: ConfirmDialogProps) {
	const { open, change, exitWatch } = useDialogOpen(onClose)
	const finalFocus = useFinalFocus()
	return (
		<AlertDialog.Root open={open} onOpenChange={change} onConfirm={() => confirmed(onConfirm())}>
			<AlertDialog.Popup
				className={POPUP_CLASS}
				intent={intent}
				title={title}
				description={description}
				confirmButtonText={confirmLabel}
				cancelButtonText={cancelLabel}
				finalFocus={finalFocus}
				onClickCapture={refuseSecondClick}
				onKeyDownCapture={refuseRepeatedEnter}
			>
				{exitWatch}
			</AlertDialog.Popup>
		</AlertDialog.Root>
	)
}
