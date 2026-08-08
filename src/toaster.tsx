/* oxlint-disable react/only-export-components -- the region ships beside the
   hook that reaches it. */
import { Notice, Stack } from '@wordpress/ui'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * How long a toast nobody touches stays on screen.
 */
const DISMISS_AFTER = 10000

/**
 * The name of the control clearing a toast.
 */
const DISMISS_LABEL = 'Dismiss'

export interface ToastAction {
	label: string
	onAct: () => void
}

interface Toast {
	id: number
	message: string
	action?: ToastAction
}

export interface ToasterHandle {
	show: (message: string, action?: ToastAction) => void
}

const ToasterContext = createContext<ToasterHandle | null>(null)

/**
 * Returns the handle raising messages in the toast region.
 * @returns The toaster handle.
 */
export function useToaster(): ToasterHandle {
	const handle = useContext(ToasterContext)
	if (handle === null) {
		throw new Error('useToaster needs a Toaster above it')
	}
	return handle
}

/**
 * Renders one raised message with its optional action.
 * @param props - The toast, the handler clearing it, and the dismiss control name.
 * @returns The toast element.
 */
function Toast({
	toast,
	onClear,
	dismissLabel,
}: {
	toast: Toast
	onClear: (id: number) => void
	dismissLabel: string
}) {
	return (
		<Notice.Root intent="neutral" spokenMessage={toast.message}>
			<Notice.Description>{toast.message}</Notice.Description>
			<Notice.Actions>
				{toast.action !== undefined && (
					<Notice.ActionButton
						onClick={() => {
							toast.action?.onAct()
							onClear(toast.id)
						}}
					>
						{toast.action.label}
					</Notice.ActionButton>
				)}
				<Notice.ActionButton onClick={() => onClear(toast.id)}>{dismissLabel}</Notice.ActionButton>
			</Notice.Actions>
		</Notice.Root>
	)
}

export interface ToasterProps {
	children: ReactNode
	dismissAfter?: number
	dismissLabel?: string
}

/**
 * Renders the region holding raised messages around the given tree.
 * @param props - The tree the region wraps, how long a toast stays, and the dismiss control name.
 * @returns The wrapped tree with its region.
 */
export function Toaster({
	children,
	dismissAfter = DISMISS_AFTER,
	dismissLabel = DISMISS_LABEL,
}: ToasterProps) {
	const [toasts, setToasts] = useState<Toast[]>([])
	const nextId = useRef(0)
	const timers = useRef(new Set<ReturnType<typeof setTimeout>>())
	useEffect(() => {
		const held = timers.current
		return () => {
			for (const timer of held) {
				clearTimeout(timer)
			}
			held.clear()
		}
	}, [])
	const clear = useCallback((id: number) => {
		setToasts((held) => held.filter((toast) => toast.id !== id))
	}, [])
	const show = useCallback(
		(message: string, action?: ToastAction) => {
			nextId.current += 1
			const id = nextId.current
			setToasts((held) => [...held, { id, message, action }])
			timers.current.add(setTimeout(() => clear(id), dismissAfter))
		},
		[clear, dismissAfter],
	)
	const handle = useMemo(() => ({ show }), [show])
	return (
		<ToasterContext.Provider value={handle}>
			{children}
			<Stack direction="column" gap="xs" className="godmin-toasts">
				{toasts.map((toast) => (
					<Toast key={toast.id} toast={toast} onClear={clear} dismissLabel={dismissLabel} />
				))}
			</Stack>
		</ToasterContext.Provider>
	)
}
