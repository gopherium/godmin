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
 * Carries an action out and reads what it answers, handing what it throws or rejects with on to the app.
 * @param action - The action.
 * @returns What the dialog reads, at once unless the action returned a write still running.
 */
function confirmed(
	action: ConfirmDialogProps['onConfirm'],
): DialogAnswer | undefined | Promise<DialogAnswer | undefined> {
	try {
		const running = action()
		return isThenable(running) ? Promise.resolve(running).then(answerOf, passRejectionOn) : answerOf(running)
	} catch (error) {
		return passRejectionOn(error)
	}
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
		<AlertDialog.Root open={open} onOpenChange={change} onConfirm={() => confirmed(onConfirm)}>
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
