// SPDX-License-Identifier: Apache-2.0

import { InputControl } from '@wordpress/ui'
import { useState } from 'react'

import type { DialogAnswer } from './dialog-open.js'
import { FormDialog } from './form-dialog.js'

/** The pattern a name must match: any text that holds more than spaces. */
const NOT_ONLY_SPACES = '.*\\S.*'

/** The props of a dialog that asks for a new name for one item. */
export interface RenameDialogProps {
	/** The title in the dialog header, the name of the dialog. */
	title: string
	/** The text the field starts with, the name the item carries. */
	name: string
	/** The label of the name field. */
	fieldLabel: string
	/** The label of the button that writes the new name. */
	submitLabel: string
	/** The label of the button that closes the dialog. */
	cancelLabel: string
	/** Writes the name as typed. Return nothing to close at once, the write to hold the dialog, or an answer to stay. */
	onSubmit: (name: string) => void | DialogAnswer | PromiseLike<unknown>
	/** Takes the dialog away, once its card has left the page. */
	onClose: () => void
}

/**
 * Renders a dialog that asks for a new name, Save on at all times and the browser refusing a blank name.
 * @param props - The title, the current name, the labels and the handlers.
 * @returns The dialog.
 */
export function RenameDialog({
	title,
	name,
	fieldLabel,
	submitLabel,
	cancelLabel,
	onSubmit,
	onClose,
}: RenameDialogProps) {
	const [value, setValue] = useState(name)
	return (
		<FormDialog
			title={title}
			submitLabel={submitLabel}
			cancelLabel={cancelLabel}
			onSubmit={() => onSubmit(value)}
			onClose={onClose}
		>
			{(busy) => (
				<InputControl
					label={fieldLabel}
					value={value}
					required
					pattern={NOT_ONLY_SPACES}
					readOnly={busy}
					onChange={(event) => setValue(event.target.value)}
				/>
			)}
		</FormDialog>
	)
}
