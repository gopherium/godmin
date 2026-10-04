// SPDX-License-Identifier: Apache-2.0

import { Button } from '@wordpress/ui'
import { useRef } from 'react'
import type { ChangeEvent, ComponentProps, ReactNode } from 'react'

export interface FileButtonProps {
	/** The file types the dialog offers, as the input `accept` attribute takes them. */
	accept?: string
	/** Whether the reader may choose more than one file. */
	multiple?: boolean
	/** Whether an upload is running, the button then busy. */
	busy?: boolean
	/** The icon drawn before the label. */
	icon?: ComponentProps<typeof Button.Icon>['icon']
	/** The name of the hidden file input. */
	inputLabel?: string
	/** Takes the files the reader chose, never called for a dialog closed with none. */
	onChoose: (files: File[]) => void
	/** The button label. */
	children: ReactNode
}

/**
 * Empties the input, then hands the files it held to the handler, none for a closed dialog.
 * @param event - The change the input reported.
 * @param onChoose - Takes the files the reader chose.
 */
function handOver(event: ChangeEvent<HTMLInputElement>, onChoose: (files: File[]) => void): void {
	const files = Array.from(event.target.files ?? [])
	event.target.value = ''
	if (files.length > 0) {
		onChoose(files)
	}
}

/**
 * Renders a compact solid button that opens the file dialog of a hidden file input.
 * @param props - The file types, the many flag, the busy flag, the icon, the input name, the handler and the label.
 * @returns The button beside its hidden input.
 */
export function FileButton({
	accept,
	multiple = false,
	busy = false,
	icon,
	inputLabel,
	onChoose,
	children,
}: FileButtonProps) {
	const input = useRef<HTMLInputElement>(null)
	return (
		<>
			<Button variant="solid" size="compact" loading={busy} onClick={() => (input.current as HTMLInputElement).click()}>
				{icon === undefined ? null : <Button.Icon icon={icon} />}
				{children}
			</Button>
			<input
				ref={input}
				type="file"
				accept={accept}
				multiple={multiple}
				hidden
				aria-label={inputLabel}
				onChange={(event) => handOver(event, onChoose)}
			/>
		</>
	)
}
