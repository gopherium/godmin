// SPDX-License-Identifier: Apache-2.0

import { Button, InputControl, Stack } from '@wordpress/ui'
import { useState } from 'react'

import { ErrorNotice } from './page.js'

export interface RenameBodyProps {
	/** The name the item carries now, the first value of the field. */
	name: string
	/** The label of the name field. */
	fieldLabel: string
	/** The label of the button that writes the new name. */
	submitLabel: string
	/** The label of the button that closes the modal. */
	cancelLabel: string
	/** Whether the write is running, the submit button then busy and Cancel greyed out. */
	busy?: boolean
	/** The failure of the last try, shown under the field. */
	failure?: string
	/** Writes the name as typed. */
	onSubmit: (name: string) => void
	/** Closes the modal. */
	onCancel?: () => void
}

/**
 * Renders the body of a rename modal: the name field, a failure notice, a minimal neutral Cancel and the submit button.
 * @param props - The current name, the labels, the busy flag, the failure and the handlers.
 * @returns The rename form.
 */
export function RenameBody({
	name,
	fieldLabel,
	submitLabel,
	cancelLabel,
	busy = false,
	failure,
	onSubmit,
	onCancel,
}: RenameBodyProps) {
	const [value, setValue] = useState(name)
	const writable = !busy && value.trim() !== '' && value !== name
	return (
		<form
			onSubmit={(event) => {
				event.preventDefault()
				if (writable) {
					onSubmit(value)
				}
			}}
		>
			<Stack direction="column" gap="lg">
				<InputControl label={fieldLabel} value={value} onChange={(event) => setValue(event.target.value)} />
				{failure === undefined ? null : <ErrorNotice>{failure}</ErrorNotice>}
				<Stack direction="row" gap="sm" justify="flex-end">
					<Button variant="minimal" tone="neutral" disabled={busy} onClick={onCancel}>
						{cancelLabel}
					</Button>
					<Button type="submit" loading={busy} disabled={!writable}>
						{submitLabel}
					</Button>
				</Stack>
			</Stack>
		</form>
	)
}
