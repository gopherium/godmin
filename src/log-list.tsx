// SPDX-License-Identifier: Apache-2.0

import { Text } from '@wordpress/ui'
import type { ReactNode } from 'react'

/** What a log list needs. */
export interface LogListProps {
	/** The items, each a LogItem the caller keys by its own id, in the order they read. */
	children: ReactNode
	/** The id of the visible heading that names the list. */
	'aria-labelledby'?: string
}

/** What one item of a log list needs. */
export interface LogItemProps {
	/** The start of the header line, such as a LogTime. */
	label?: ReactNode
	/** The controls at the end of the header line. */
	actions?: ReactNode
	/** The item's text, shown with its line breaks kept. */
	body?: string
	/** Any other content, shown under the body. */
	children?: ReactNode
	/** The name the item is announced by. */
	'aria-label'?: string
}

/** What a log time needs. */
export interface LogTimeProps {
	/** The date or time in machine readable form, such as 2026-01-01. */
	dateTime: string
	/** The date or time as the reader sees it. */
	children: ReactNode
}

/**
 * Renders items one under the other in the order given.
 * @param props - The items and the id of the heading that names the list.
 * @returns The log list element.
 */
export function LogList({ children, 'aria-labelledby': labelledBy }: LogListProps) {
	return (
		<ul role="list" className="godmin-log-list" aria-labelledby={labelledBy}>
			{children}
		</ul>
	)
}

/**
 * Renders one log item, its header line over its text and any other content.
 * @param props - The label, the actions, the text, the other content and the item's name.
 * @returns The log item element.
 */
export function LogItem({ label, actions, body, children, 'aria-label': name }: LogItemProps) {
	return (
		<li className="godmin-log-list__item" aria-label={name}>
			<LogHeader label={label} actions={actions} />
			{body !== undefined && (
				<Text render={<p />} className="godmin-log-list__body">
					{body}
				</Text>
			)}
			{children}
		</li>
	)
}

/**
 * Renders the header line of a log item, or nothing without a label or actions.
 * @param props - The label and the actions.
 * @returns The header line element, or null.
 */
function LogHeader({ label, actions }: Pick<LogItemProps, 'label' | 'actions'>) {
	if (label === undefined && actions === undefined) {
		return null
	}
	return (
		<div className="godmin-log-list__header">
			{label !== undefined && <div className="godmin-log-list__label">{label}</div>}
			{actions !== undefined && <div className="godmin-log-list__actions">{actions}</div>}
		</div>
	)
}

/**
 * Renders a date or time as small muted text inside a time element.
 * @param props - The machine readable value and the text the reader sees.
 * @returns The time element.
 */
export function LogTime({ dateTime, children }: LogTimeProps) {
	return (
		<Text variant="body-sm" render={<time dateTime={dateTime} />} className="godmin-log-list__time">
			{children}
		</Text>
	)
}
