/* oxlint-disable react/only-export-components -- the region ships beside the
   hook that reaches it. */
import { speak } from '@wordpress/a11y'
import { ThemeProvider } from '@wordpress/theme'
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { ReactNode, RefObject } from 'react'

/**
 * How long a toast with no action stays on screen when nobody touches it.
 */
const DISMISS_AFTER = 6000

/**
 * How long a toast with an action stays on screen when nobody touches it, time to read it and then act.
 */
const ACTION_DISMISS_AFTER = 10000

/**
 * The hint telling a screen reader that a click clears a plain toast.
 */
const DISMISS_LABEL = 'Dismiss this notice'

/**
 * How many toasts stay on screen at once.
 */
const LIMIT = 3

export interface ToastAction {
	label: string
	onAct: () => void
}

interface Toast {
	id: number
	message: string
	action?: ToastAction
	leaving: boolean
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
 * Returns the toasts with a new one at the bottom and the oldest past the limit leaving.
 * @param held - The toasts on screen, oldest first.
 * @param arriving - The toast to add.
 * @param limit - How many toasts may stay on screen.
 * @returns The toasts to show.
 */
function admit(held: Toast[], arriving: Toast, limit: number): Toast[] {
	const staying = held.filter((toast) => !toast.leaving)
	const pushed = new Set(staying.slice(0, Math.max(staying.length + 1 - limit, 0)).map((toast) => toast.id))
	return [...held.map((toast) => (pushed.has(toast.id) ? { ...toast, leaving: true } : toast)), arriving]
}

/**
 * Returns the animations running on an element and inside it, none where the browser cannot report them.
 * @param element - The element to ask.
 * @returns The running animations.
 */
function runningMotion(element: Element): Animation[] {
	return typeof element.getAnimations === 'function' ? element.getAnimations({ subtree: true }) : []
}

/**
 * Returns the ref of a toast item that gives up focus as the toast leaves and drops the toast once its motion ends,
 * or at once when the toast was already leaving as it first showed.
 * @param toast - The toast the item holds.
 * @param region - The toast region taking the focus a leaving toast held.
 * @param onGone - The handler dropping a toast that finished leaving.
 * @returns The ref to attach to the item element.
 */
function useDeparture(
	toast: Toast,
	region: RefObject<HTMLDivElement | null>,
	onGone: (id: number) => void,
): RefObject<HTMLDivElement | null> {
	const ref = useRef<HTMLDivElement>(null)
	const { id, leaving } = toast
	const leavingAtMount = useRef(leaving)
	useLayoutEffect(() => {
		if (!leaving) {
			return
		}
		const element = ref.current as HTMLDivElement
		const holder = region.current as HTMLDivElement
		if (element.contains(document.activeElement)) {
			holder.focus()
		}
		const motion = leavingAtMount.current ? [] : runningMotion(element)
		if (motion.length === 0) {
			onGone(id)
			return
		}
		Promise.allSettled(motion.map((animation) => animation.finished)).then(() => onGone(id))
	}, [id, leaving, region, onGone])
	return ref
}

/**
 * Runs the timer that sends a toast nobody touched away, cleared once the toast leaves or goes.
 * @param toast - The toast the timer belongs to.
 * @param dismissAfter - How many milliseconds the toast stays.
 * @param onLeave - The handler sending a toast away.
 */
function useExpiry(toast: Toast, dismissAfter: number, onLeave: (id: number) => void): void {
	const { id, leaving } = toast
	useEffect(() => {
		if (leaving) {
			return
		}
		const timer = setTimeout(() => onLeave(id), dismissAfter)
		return () => clearTimeout(timer)
	}, [id, leaving, dismissAfter, onLeave])
}

/**
 * Returns the classes of a toast, with the leaving look while it fades out.
 * @param base - The classes the toast always carries.
 * @param leaving - Whether the toast is fading out.
 * @returns The class list.
 */
function toastClass(base: string, leaving: boolean): string {
	return leaving ? `${base} godmin-toast--leaving` : base
}

interface ToastItemProps {
	toast: Toast
	region: RefObject<HTMLDivElement | null>
	onGone: (id: number) => void
	children: ReactNode
}

/**
 * Renders the item that holds a toast in the region, its space growing as the toast arrives and closing once it left.
 * @param props - The toast, the region, the handler dropping a toast that finished leaving, and the toast element.
 * @returns The item element.
 */
function ToastItem({ toast, region, onGone, children }: ToastItemProps) {
	const ref = useDeparture(toast, region, onGone)
	const item = toast.leaving ? 'godmin-toasts__item godmin-toasts__item--leaving' : 'godmin-toasts__item'
	return (
		<div ref={ref} className={item}>
			<div className="godmin-toasts__item-inner">{children}</div>
		</div>
	)
}

interface ToastProps {
	toast: Toast
	dismissAfter: number
	onLeave: (id: number) => void
}

/**
 * Renders a toast with no action as one button that clears it, described by the dismiss hint.
 * @param props - The toast, how long it stays, the id of the dismiss hint and the handler clearing it.
 * @returns The toast element.
 */
function PlainToast({ toast, dismissAfter, hint, onLeave }: ToastProps & { hint: string }) {
	useExpiry(toast, dismissAfter, onLeave)
	return (
		<button
			type="button"
			className={toastClass('godmin-toast godmin-toast--plain', toast.leaving)}
			aria-describedby={hint}
			inert={toast.leaving}
			onClick={() => onLeave(toast.id)}
		>
			{toast.message}
		</button>
	)
}

/**
 * Renders a toast with its action, cleared by a click anywhere on it, the action its only control.
 * @param props - The toast, its action, its time and the handler clearing it.
 * @returns The toast element.
 */
function ActionToast({ toast, action, dismissAfter, onLeave }: ToastProps & { action: ToastAction }) {
	useExpiry(toast, dismissAfter, onLeave)
	return (
		<div
			className={toastClass('godmin-toast', toast.leaving)}
			inert={toast.leaving}
			onClick={() => onLeave(toast.id)}
		>
			<span className="godmin-toast__message">{toast.message}</span>
			<button
				type="button"
				className="godmin-toast__action"
				onClick={() => {
					onLeave(toast.id)
					action.onAct()
				}}
			>
				{action.label}
			</button>
		</div>
	)
}

export interface ToasterProps {
	/** The tree the toast region wraps. */
	children: ReactNode
	/** How many milliseconds a toast with no action stays on screen when nobody touches it. */
	dismissAfter?: number
	/** How many milliseconds a toast with an action stays on screen when nobody touches it. */
	actionDismissAfter?: number
	/** The hint screen readers hear after the message of a plain toast, that a click clears it. */
	dismissLabel?: string
	/** How many toasts stay on screen at once, the oldest leaving first. */
	limit?: number
}

/**
 * Renders the region holding raised messages around the given tree, under the snackbar corners at every preset.
 * @param props - The tree the region wraps, the time of each kind of toast, the plain toast hint and how many stay.
 * @returns The wrapped tree with its region.
 */
export function Toaster({
	children,
	dismissAfter = DISMISS_AFTER,
	actionDismissAfter = ACTION_DISMISS_AFTER,
	dismissLabel = DISMISS_LABEL,
	limit = LIMIT,
}: ToasterProps) {
	const [toasts, setToasts] = useState<Toast[]>([])
	const nextId = useRef(0)
	const region = useRef<HTMLDivElement>(null)
	const mounted = useRef(true)
	useLayoutEffect(() => {
		mounted.current = true
		return () => {
			mounted.current = false
		}
	}, [])
	const leave = useCallback((id: number) => {
		setToasts((held) => held.map((toast) => (toast.id === id ? { ...toast, leaving: true } : toast)))
	}, [])
	const gone = useCallback((id: number) => {
		setToasts((held) => held.filter((toast) => toast.id !== id))
	}, [])
	const show = useCallback(
		(message: string, action?: ToastAction) => {
			if (!mounted.current) {
				return
			}
			nextId.current += 1
			const id = nextId.current
			speak(message, 'polite')
			setToasts((held) => admit(held, { id, message, action, leaving: false }, limit))
		},
		[limit],
	)
	const handle = useMemo(() => ({ show }), [show])
	const hint = useId()
	return (
		<ToasterContext.Provider value={handle}>
			{children}
			<ThemeProvider cornerRadius="subtle">
				<div ref={region} className="godmin-toasts" tabIndex={-1}>
					{toasts.map((toast) => (
						<ToastItem key={toast.id} toast={toast} region={region} onGone={gone}>
							{toast.action === undefined ? (
								<PlainToast toast={toast} dismissAfter={dismissAfter} hint={hint} onLeave={leave} />
							) : (
								<ActionToast
									toast={toast}
									action={toast.action}
									dismissAfter={actionDismissAfter}
									onLeave={leave}
								/>
							)}
						</ToastItem>
					))}
				</div>
			</ThemeProvider>
			<span id={hint} hidden>
				{dismissLabel}
			</span>
		</ToasterContext.Provider>
	)
}
