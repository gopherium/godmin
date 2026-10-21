// SPDX-License-Identifier: Apache-2.0

import { InputControl } from '@wordpress/ui'
import { useState } from 'react'

import { FormBody } from './form.js'

export interface RenameBodyProps {
	/** The text the field starts with: the name the item carries, or the name a failed write turned away. */
	name: string
	/** The label of the name field. */
	fieldLabel: string
	/** The label of the button that writes the new name. */
	submitLabel: string
	/** The label of the button that closes the modal. */
	cancelLabel: string
	/** Writes the name as typed, the one the item already has included. */
	onSubmit: (name: string) => void
	/** Closes the modal. */
	onCancel?: () => void
}

/**
 * Renders the body of a rename modal: the name field, an accent text Cancel and the submit button, off while blank.
 * @param props - The first name, the labels and the handlers.
 * @returns The rename form.
 */
export function RenameBody({ name, fieldLabel, submitLabel, cancelLabel, onSubmit, onCancel }: RenameBodyProps) {
	const [value, setValue] = useState(name)
	return (
		<FormBody
			submitLabel={submitLabel}
			cancelLabel={cancelLabel}
			canSubmit={value.trim() !== ''}
			onSubmit={() => onSubmit(value)}
			onCancel={onCancel}
		>
			<InputControl label={fieldLabel} value={value} onChange={(event) => setValue(event.target.value)} />
		</FormBody>
	)
}
