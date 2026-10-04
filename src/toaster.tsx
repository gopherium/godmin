/* oxlint-disable react/only-export-components -- the region ships beside the
   hook that reaches it. */
import { speak } from '@wordpress/a11y'
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
 * How long a toast nobody touches stays on screen.
 */
const DISMISS_AFTER = 6000

/**
 * The name of the control clearing a toast.
 */
const DISMISS_LABEL = 'Dismiss'

/**
 * The cross the WordPress snackbar draws in its close button.
 */
const DISMISS_GLYPH = '✕'

/**
 * How many toasts stay on screen at once.
 */
const LIMIT = 3

/**
 * How many characters of a name a toast shows before the ellipsis.
 */
const NAME_LENGTH = 45

/**
 * The mark that ends a name a toast cut short.
 */
const ELLIPSIS = '…'

/**
 * Returns a title cut to the given number of characters, its trailing spaces trimmed and an ellipsis added.
 * @param title - The title to name.
 * @param length - How many characters to keep.
 * @returns The title whole when it fits, the cut title otherwise.
 */
function cutName(title: string, length: number): string {
	const characters = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
	const parts = Array.from(characters.segment(title), (part) => part.segment)
	if (parts.length <= length) {
		return title
	}
	return `${parts.slice(0, length).join('').trimEnd()}${ELLIPSIS}`
}

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
	/** The title cut to the toaster's name length, with an ellipsis when cut. */
	name: (title: string) => string
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
 * Returns the fades running on an element, none where the browser cannot report them.
 * @param element - The element to ask.
 * @returns The running animations.
 */
function runningFades(element: Element): Animation[] {
	return typeof element.getAnimations === 'function' ? element.getAnimations() : []
}

/**
 * Returns the ref of a toast element that gives up focus as the toast leaves and drops the toast once faded.
 * @param toast - The toast the element draws.
 * @param region - The toast region taking the focus a leaving toast held.
 * @param onGone - The handler dropping a toast that finished leaving.
 * @returns The ref to attach to the toast element.
 */
function useDeparture<T extends HTMLElement>(
	toast: Toast,
	region: RefObject<HTMLDivElement | null>,
	onGone: (id: number) => void,
): RefObject<T | null> {
	const ref = useRef<T>(null)
	const { id, leaving } = toast
	useLayoutEffect(() => {
		if (!leaving) {
			return
		}
		const element = ref.current as T
		const holder = region.current as HTMLDivElement
		if (element.contains(document.activeElement)) {
			holder.focus()
		}
		const fades = runningFades(element)
		if (fades.length === 0) {
			onGone(id)
			return
		}
		Promise.allSettled(fades.map((fade) => fade.finished)).then(() => onGone(id))
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

interface ToastProps {
	toast: Toast
	dismissAfter: number
	dismissLabel: string
	region: RefObject<HTMLDivElement | null>
	onLeave: (id: number) => void
	onGone: (id: number) => void
}

/**
 * Renders a toast with no action as one button that clears it, described by the dismiss hint.
 * @param props - The toast, how long it stays, the id of the dismiss hint, the region and the handlers clearing it.
 * @returns The toast element.
 */
function PlainToast({
	toast,
	dismissAfter,
	hint,
	region,
	onLeave,
	onGone,
}: Omit<ToastProps, 'dismissLabel'> & { hint: string }) {
	useExpiry(toast, dismissAfter, onLeave)
	const ref = useDeparture<HTMLButtonElement>(toast, region, onGone)
	return (
		<button
			ref={ref}
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
 * Renders a toast with its action and a close button beside it.
 * @param props - The toast, its action, its time, the close button name, the region and the handlers clearing it.
 * @returns The toast element.
 */
function ActionToast({
	toast,
	action,
	dismissAfter,
	dismissLabel,
	region,
	onLeave,
	onGone,
}: ToastProps & { action: ToastAction }) {
	useExpiry(toast, dismissAfter, onLeave)
	const ref = useDeparture<HTMLDivElement>(toast, region, onGone)
	return (
		<div ref={ref} className={toastClass('godmin-toast', toast.leaving)} inert={toast.leaving}>
			<span className="godmin-toast__message">{toast.message}</span>
			<button
				type="button"
				className="godmin-toast__action"
				onClick={() => {
					action.onAct()
					onLeave(toast.id)
				}}
			>
				{action.label}
			</button>
			<button
				type="button"
				className="godmin-toast__dismiss"
				aria-label={dismissLabel}
				onClick={() => onLeave(toast.id)}
			>
				{DISMISS_GLYPH}
			</button>
		</div>
	)
}

export interface ToasterProps {
	/** The tree the toast region wraps. */
	children: ReactNode
	/** How many milliseconds a toast nobody touches stays on screen. */
	dismissAfter?: number
	/** The name of the close button, also the hint screen readers hear that a click clears a plain toast. */
	dismissLabel?: string
	/** How many toasts stay on screen at once, the oldest leaving first. */
	limit?: number
	/** How many characters of a name a toast shows before the ellipsis. */
	nameLength?: number
}

/**
 * Renders the region holding raised messages around the given tree.
 * @param props - The tree the region wraps, the toast time, the close button name, how many stay and the name length.
 * @returns The wrapped tree with its region.
 */
export function Toaster({
	children,
	dismissAfter = DISMISS_AFTER,
	dismissLabel = DISMISS_LABEL,
	limit = LIMIT,
	nameLength = NAME_LENGTH,
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
	const name = useCallback((title: string) => cutName(title, nameLength), [nameLength])
	const handle = useMemo(() => ({ show, name }), [show, name])
	const hint = useId()
	return (
		<ToasterContext.Provider value={handle}>
			{children}
			<div ref={region} className="godmin-toasts" tabIndex={-1}>
				{toasts.map((toast) =>
					toast.action === undefined ? (
						<PlainToast
							key={toast.id}
							toast={toast}
							dismissAfter={dismissAfter}
							hint={hint}
							region={region}
							onLeave={leave}
							onGone={gone}
						/>
					) : (
						<ActionToast
							key={toast.id}
							toast={toast}
							action={toast.action}
							dismissAfter={dismissAfter}
							dismissLabel={dismissLabel}
							region={region}
							onLeave={leave}
							onGone={gone}
						/>
					),
				)}
			</div>
			<span id={hint} hidden>
				{dismissLabel}
			</span>
		</ToasterContext.Provider>
	)
}
