// SPDX-License-Identifier: Apache-2.0

import { useBlocker } from '@tanstack/react-router'
import { useRef } from 'react'

import { ConfirmDialog } from './confirm-dialog.js'

/** The props of the dialog that asks before a move leaves a page holding unsaved work. */
export interface UnsavedChangesDialogProps {
	/** Whether the page holds unsaved work, so a move away asks first. */
	when: boolean
	/** The question, such as "Discard changes?". */
	title: string
	/** What the reader loses, such as "Your changes are not saved.". */
	description: string
	/** The label of the red button that drops the work and leaves. */
	discardLabel: string
	/** The label of the button that stays with the work. */
	keepLabel: string
}

/** The places a move goes between, as a blocker reads them. */
interface Move {
	/** Where the reader is. */
	current: { pathname: string }
	/** Where the move goes. */
	next: { pathname: string }
}

/**
 * Reports whether a move leaves the page, and not only changes its search.
 * @param move - Where the reader is and where the move goes.
 * @returns True when the move goes to another path.
 */
function leavesPage({ current, next }: Move): boolean {
	return current.pathname !== next.pathname
}

/**
 * Renders an irreversible confirm while a move away from a page holding unsaved work waits on the reader.
 * @param props - When to ask, and the words of the question and its buttons.
 * @returns The confirm while a move waits, otherwise nothing.
 */
export function UnsavedChangesDialog({ when, title, description, discardLabel, keepLabel }: UnsavedChangesDialogProps) {
	const discarding = useRef(false)
	const leaving = useBlocker({ shouldBlockFn: leavesPage, disabled: !when, withResolver: true })
	if (leaving.status !== 'blocked') {
		return null
	}
	const { proceed, reset } = leaving
	return (
		<ConfirmDialog
			intent="irreversible"
			title={title}
			description={description}
			confirmLabel={discardLabel}
			cancelLabel={keepLabel}
			onConfirm={() => {
				discarding.current = true
			}}
			onClose={() => {
				const settle = discarding.current ? proceed : reset
				discarding.current = false
				settle()
			}}
		/>
	)
}
