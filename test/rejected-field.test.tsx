// SPDX-License-Identifier: Apache-2.0

import { act, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { speak } from '@wordpress/a11y'
import { ValidatedInputControl, ValidatedTextareaControl } from '@wordpress/ui'
import { StrictMode, createRef, memo, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import { beforeEach, expect, test, vi } from 'vitest'

import { useRejectedField } from '../src/index'
import type { RejectedField } from '../src/index'
import { getAnnouncement, installTestEnvironment } from '../src/testing.js'

vi.mock('@wordpress/a11y', async (importOriginal) => {
	const actual = await importOriginal<typeof import('@wordpress/a11y')>()
	return { ...actual, speak: vi.fn(actual.speak) }
})

installTestEnvironment()

beforeEach(() => {
	vi.mocked(speak).mockClear()
})

/** The address every bench sends unless a test types another. */
const SENT = 'taken@example.com'

/** The no-break space the announcer adds to a message equal to the one it spoke last. */
const REPEAT_MARK = String.fromCodePoint(0xa0)

/** How a bench answers a send: the server's words about the value sent. */
type Answer = (sent: string) => string

/** What a test hands the email bench. */
interface BenchProps {
	/** The server's words about each send. */
	answer: Answer
	/** Hears what `reject` answered for each send. */
	onRejected?: (shown: boolean) => void
	/** What the bench tells `reject` was sent, the value at send time when absent. */
	sentAs?: string
	/** Whether the form sends without the browser's own check. */
	noValidate?: boolean
}

/**
 * Waits one task, so a send that awaited its answer goes on.
 * @returns A promise settled on the next task.
 */
function nextTask(): Promise<void> {
	return new Promise((done) => setTimeout(done, 0))
}

/**
 * Lets a send, its render, its effects and the speech they queue all run.
 */
async function settle(): Promise<void> {
	await act(nextTask)
	await act(nextTask)
}

/**
 * Renders an email form whose send waits for its answer, then hands the server's words to the hook.
 * @param props - The answer, the listener for what `reject` answered, the value told as sent and the check switch.
 * @returns The form.
 */
function EmailBench({ answer, onRejected = () => undefined, sentAs, noValidate = false }: BenchProps) {
	const form = useRef<HTMLFormElement>(null)
	const [email, setEmail] = useState('')
	const rejected = useRejectedField(form, email)
	const send = async (sent: string) => {
		await Promise.resolve()
		onRejected(rejected.reject(answer(sent), sentAs ?? sent))
	}
	return (
		<form
			ref={form}
			noValidate={noValidate}
			onSubmit={(event) => {
				event.preventDefault()
				void send(email)
			}}
		>
			<ValidatedInputControl
				label="Email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				customValidity={rejected.validity}
			/>
			<button type="submit">Send</button>
		</form>
	)
}

/**
 * Returns the email field of a bench.
 * @returns The field.
 */
function emailField(): HTMLInputElement {
	return screen.getByRole('textbox', { name: 'Email' }) as HTMLInputElement
}

/**
 * Returns the words that describe a field, read from every element its description names.
 * @param field - The field.
 * @returns The words, empty when nothing describes it.
 */
function descriptionOf(field: HTMLElement): string {
	return (field.getAttribute('aria-describedby') ?? '')
		.split(' ')
		.filter((id) => id !== '')
		.map((id) => document.getElementById(id)?.textContent ?? '')
		.join(' ')
}

/**
 * Renders the email bench, types the address and sends it with the Send button, as a pointer press does.
 * @param props - What the bench answers and reports.
 * @returns The user that typed and pressed.
 */
async function rejectedOnSend(props: BenchProps) {
	const user = userEvent.setup()
	render(<EmailBench {...props} />)
	await user.type(emailField(), SENT)
	await user.click(screen.getByRole('button', { name: 'Send' }))
	await settle()
	return user
}

test('puts the words under the field, answers yes and moves the focus there', async () => {
	const words = 'This address belongs to another account.'
	const shown = vi.fn()

	await rejectedOnSend({ answer: () => words, onRejected: shown })

	expect(shown).toHaveBeenCalledWith(true)
	expect(descriptionOf(emailField())).toContain(words)
	expect(document.activeElement).toBe(emailField())
})

test('speaks the words at once as the focus moves to the field', async () => {
	const words = 'Another account already uses this address.'

	await rejectedOnSend({ answer: () => words })

	expect(speak).toHaveBeenCalledWith(words, 'assertive')
	expect(getAnnouncement('assertive')).toBe(words)
})

test('speaks the words when the field already held the focus', async () => {
	const words = 'That address is taken.'
	const user = userEvent.setup()
	render(<EmailBench answer={() => words} />)

	await user.type(emailField(), `${SENT}{Enter}`)
	await settle()

	expect(document.activeElement).toBe(emailField())
	expect(speak).toHaveBeenCalledWith(words, 'assertive')
})

test('takes the words away at the first edit', async () => {
	const words = 'The server rejected this address.'
	await rejectedOnSend({ answer: () => words })
	expect(descriptionOf(emailField())).toContain(words)

	fireEvent.change(emailField(), { target: { value: 'fresh@example.com' } })
	await settle()

	expect(descriptionOf(emailField())).not.toContain(words)
	expect(emailField().validity.valid).toBe(true)
})

test('shows nothing when the rejected value is typed again, so it can be sent again', async () => {
	const words = 'This address cannot be used here.'
	const user = await rejectedOnSend({ answer: () => words })
	expect(descriptionOf(emailField())).toContain(words)

	await user.clear(emailField())
	await user.type(emailField(), SENT)
	await settle()

	expect(emailField().value).toBe(SENT)
	expect(descriptionOf(emailField())).not.toContain(words)
	expect(emailField().validity.valid).toBe(true)
})

/** A user that types and presses as a person does. */
type User = ReturnType<typeof userEvent.setup>

/**
 * Pastes a valid address over the whole value of the email field.
 * @param user - The user that pastes.
 */
async function pasteValid(user: User): Promise<void> {
	emailField().select()
	await user.paste('ok@example.com')
}

/**
 * Types one more key at the end of the email field.
 * @param user - The user that types.
 */
async function typeOneMore(user: User): Promise<void> {
	await user.keyboard('m')
}

test.each([
	{ edit: 'a paste of a valid value', change: pasteValid, words: 'No account may take this address.' },
	{ edit: 'one more key', change: typeOneMore, words: 'No new account may take this address.' },
])('leaves no invalid mark once the words go, after Enter in the field and $edit', async ({ change, words }) => {
	const user = await rejectedOnSend({ answer: () => words })
	await user.type(emailField(), '{Enter}')
	await settle()
	expect(emailField().getAttribute('aria-invalid')).toBe('true')

	await change(user)
	await settle()

	expect(emailField().hasAttribute('aria-invalid')).toBe(false)
	expect(emailField().validity.valid).toBe(true)
	expect(descriptionOf(emailField())).toBe('')
})

test.each([
	{ case: 'there are no words', answer: () => '', sentAs: undefined },
	{ case: 'the field moved on while the send was on its way', answer: () => 'Rejected.', sentAs: 'other@example.com' },
])('answers no and shows nothing when $case', async ({ answer, sentAs }) => {
	const shown = vi.fn()

	await rejectedOnSend({ answer, onRejected: shown, sentAs })

	expect(shown).toHaveBeenCalledWith(false)
	expect(emailField().validity.valid).toBe(true)
	expect(speak).not.toHaveBeenCalled()
})

test('answers no when the form never mounted', () => {
	const { result } = renderHook(() => useRejectedField(createRef<HTMLFormElement>(), SENT))

	let shown = true
	act(() => {
		shown = result.current.reject('An address no form holds.', SENT)
	})

	expect(shown).toBe(false)
	expect(result.current.validity).toBeUndefined()
})

/**
 * Renders a form whose email field and its hook sit in a part a toggle removes, the form staying.
 * @param props - Where the bench hands out the field's reject call.
 * @returns The form.
 */
function ToggledBench({ handOut }: { handOut: (reject: RejectedField['reject']) => void }) {
	const form = useRef<HTMLFormElement>(null)
	const [shown, setShown] = useState(true)
	return (
		<form ref={form}>
			{shown ? <RejectableEmail form={form} handOut={handOut} /> : null}
			<button type="button" onClick={() => setShown(false)}>
				Hide
			</button>
		</form>
	)
}

/**
 * Renders an email field holding the sent address and hands out its reject call.
 * @param props - The form it sits in and where it hands out its reject call.
 * @returns The field.
 */
function RejectableEmail({
	form,
	handOut,
}: {
	form: RefObject<HTMLFormElement | null>
	handOut: (reject: RejectedField['reject']) => void
}) {
	const rejected = useRejectedField(form, SENT)
	handOut(rejected.reject)
	return <ValidatedInputControl label="Email" value={SENT} readOnly customValidity={rejected.validity} />
}

test('answers no once the part holding the hook left, while the form stays', async () => {
	let reject: RejectedField['reject'] = () => false
	render(<ToggledBench handOut={(handed) => (reject = handed)} />)
	let before = false
	act(() => {
		before = reject('An address on a field that stays.', SENT)
	})
	await settle()

	fireEvent.click(screen.getByRole('button', { name: 'Hide' }))
	let shown = true
	act(() => {
		shown = reject('An address on a field that left.', SENT)
	})
	await settle()

	expect(before).toBe(true)
	expect(shown).toBe(false)
	expect(speak).not.toHaveBeenCalledWith('An address on a field that left.', 'assertive')
})

/**
 * Renders a form whose child rejects, in its layout effect, the value its parent set in the same commit.
 * @param props - The listener for what `reject` answered.
 * @returns The form.
 */
function SameCommitBench({ onRejected }: { onRejected: (shown: boolean) => void }) {
	const form = useRef<HTMLFormElement>(null)
	const [email, setEmail] = useState('')
	const rejected = useRejectedField(form, email)
	return (
		<form ref={form}>
			<ValidatedInputControl label="Email" value={email} readOnly customValidity={rejected.validity} />
			<LayoutRejection value={email} reject={rejected.reject} onRejected={onRejected} />
			<button type="button" onClick={() => setEmail(SENT)}>
				Fill
			</button>
		</form>
	)
}

/**
 * Rejects a filled value from its own layout effect.
 * @param props - The value, the reject call and the listener for what it answered.
 * @returns Nothing drawn.
 */
function LayoutRejection({
	value,
	reject,
	onRejected,
}: {
	value: string
	reject: RejectedField['reject']
	onRejected: (shown: boolean) => void
}) {
	useLayoutEffect(() => {
		if (value !== '') {
			onRejected(reject('An address rejected in the same commit.', value))
		}
	}, [value, reject, onRejected])
	return null
}

test('answers yes when it rejects the value set in the same commit', async () => {
	const shown = vi.fn()
	render(<SameCommitBench onRejected={shown} />)

	fireEvent.click(screen.getByRole('button', { name: 'Fill' }))
	await settle()

	expect(shown).toHaveBeenCalledWith(true)
})

/** Which control the two field bench puts first. */
type FirstControl = 'input' | 'textarea'

/**
 * Renders a form of two fields, its hooks declared in the reverse of form order, that rejects both on one send.
 * @param props - The control that comes first and the words each field is rejected with.
 * @returns The form.
 */
function TwoFieldBench({ first, words }: { first: FirstControl; words: [string, string] }) {
	const form = useRef<HTMLFormElement>(null)
	const [name, setName] = useState('Reserved Name')
	const [email, setEmail] = useState(SENT)
	const rejectedEmail = useRejectedField(form, email)
	const rejectedName = useRejectedField(form, name)
	const send = async () => {
		await Promise.resolve()
		rejectedEmail.reject(words[1], email)
		rejectedName.reject(words[0], name)
	}
	const nameProps = { label: 'Name', value: name, customValidity: rejectedName.validity }
	return (
		<form
			ref={form}
			onSubmit={(event) => {
				event.preventDefault()
				void send()
			}}
		>
			{first === 'textarea' ? (
				<ValidatedTextareaControl {...nameProps} onChange={(event) => setName(event.target.value)} />
			) : (
				<ValidatedInputControl {...nameProps} onChange={(event) => setName(event.target.value)} />
			)}
			<ValidatedInputControl
				label="Email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				customValidity={rejectedEmail.validity}
			/>
			<button type="submit">Send</button>
		</form>
	)
}

test.each<{ first: FirstControl }>([{ first: 'input' }, { first: 'textarea' }])(
	'puts both messages under their fields, focuses the first and speaks only its words, with $first first',
	async ({ first }) => {
		const words: [string, string] = [`That name is reserved (${first}).`, `That address is taken (${first}).`]
		const user = userEvent.setup()
		render(<TwoFieldBench first={first} words={words} />)

		await user.click(screen.getByRole('button', { name: 'Send' }))
		await settle()

		const name = screen.getByRole('textbox', { name: 'Name' })
		expect(descriptionOf(name)).toContain(words[0])
		expect(descriptionOf(emailField())).toContain(words[1])
		expect(document.activeElement).toBe(name)
		expect(speak).toHaveBeenCalledTimes(1)
		expect(speak).toHaveBeenCalledWith(words[0], 'assertive')
	},
)

test('clears the invalid mark of the field it rejected when two fields hold the same words', async () => {
	const words = 'This value is already taken.'
	const user = userEvent.setup()
	render(<TwoFieldBench first="input" words={[words, words]} />)
	await user.click(screen.getByRole('button', { name: 'Send' }))
	await settle()
	await user.click(emailField())
	await user.keyboard('{Enter}')
	await settle()
	expect(emailField().getAttribute('aria-invalid')).toBe('true')

	await user.click(emailField())
	await user.keyboard('m')
	await settle()

	const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
	expect(emailField().hasAttribute('aria-invalid')).toBe(false)
	expect(emailField().validity.valid).toBe(true)
	expect(name.validity.customError).toBe(true)
	expect(descriptionOf(name)).toContain(words)
})

/**
 * Renders an email form whose words are about the address joined with the kind of address.
 * @param props - The server's words about every send.
 * @returns The form.
 */
function JoinedBench({ words }: { words: string }) {
	const form = useRef<HTMLFormElement>(null)
	const [email, setEmail] = useState('')
	const rejected = useRejectedField(form, `work:${email}`)
	const send = async (sent: string) => {
		await Promise.resolve()
		rejected.reject(words, `work:${sent}`)
	}
	return (
		<form
			ref={form}
			onSubmit={(event) => {
				event.preventDefault()
				void send(email)
			}}
		>
			<ValidatedInputControl
				label="Email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				customValidity={rejected.validity}
			/>
			<button type="submit">Send</button>
		</form>
	)
}

test('clears the invalid mark when the words are about the value joined with another', async () => {
	const words = 'This work address is already taken.'
	const user = userEvent.setup()
	render(<JoinedBench words={words} />)
	await user.type(emailField(), SENT)
	await user.click(screen.getByRole('button', { name: 'Send' }))
	await settle()
	await user.type(emailField(), '{Enter}')
	await settle()
	expect(emailField().getAttribute('aria-invalid')).toBe('true')

	await user.keyboard('m')
	await settle()

	expect(emailField().hasAttribute('aria-invalid')).toBe(false)
	expect(descriptionOf(emailField())).toBe('')
})

/** The custom validity a field shows of its own, in the words the server also answers. */
const OWN_WORDS = { type: 'invalid' as const, message: 'This label is already in use.' }

/** A name field showing its own words that never renders again. */
const OwnName = memo(function OwnName() {
	return (
		<ValidatedInputControl label="Name" value="Reserved Name" onChange={() => undefined} customValidity={OWN_WORDS} />
	)
})

/**
 * Renders a form whose email words, about the address joined with its kind, match the words another field shows.
 * @returns The form.
 */
function SharedWordsBench() {
	const form = useRef<HTMLFormElement>(null)
	const [email, setEmail] = useState('')
	const rejected = useRejectedField(form, `work:${email}`)
	const send = async (sent: string) => {
		await Promise.resolve()
		rejected.reject(OWN_WORDS.message, `work:${sent}`)
	}
	return (
		<form
			ref={form}
			noValidate
			onSubmit={(event) => {
				event.preventDefault()
				void send(email)
			}}
		>
			<OwnName />
			<ValidatedInputControl
				label="Email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				customValidity={rejected.validity}
			/>
			<button type="submit">Send</button>
		</form>
	)
}

test('never clears another field that shows the same words when it cannot tell which field it rejected', async () => {
	const user = userEvent.setup()
	render(<SharedWordsBench />)
	await user.type(emailField(), SENT)
	await user.click(screen.getByRole('button', { name: 'Send' }))
	await settle()

	await user.click(emailField())
	await user.keyboard('m')
	await settle()

	const name = screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement
	expect(name.validity.customError).toBe(true)
	expect(name.validationMessage).toBe(OWN_WORDS.message)
})

/**
 * Renders a form whose blank required name fails its own check while the server rejects the email.
 * @param props - The words of the name's own check and the server's words about the email.
 * @returns The form.
 */
function EarlierFailureBench({ own, server }: { own: string; server: string }) {
	const form = useRef<HTMLFormElement>(null)
	const [email, setEmail] = useState(SENT)
	const rejected = useRejectedField(form, email)
	const send = async () => {
		await Promise.resolve()
		rejected.reject(server, email)
	}
	return (
		<form
			ref={form}
			noValidate
			onSubmit={(event) => {
				event.preventDefault()
				void send()
			}}
		>
			<ValidatedInputControl
				label="Name"
				required
				value=""
				onChange={() => undefined}
				customValidity={{ type: 'invalid', message: own }}
			/>
			<ValidatedInputControl
				label="Email"
				value={email}
				onChange={(event) => setEmail(event.target.value)}
				customValidity={rejected.validity}
			/>
			<button type="submit">Send</button>
		</form>
	)
}

test("speaks the server's words when an earlier field fails its own check", async () => {
	const own = 'Please enter a name.'
	const server = 'The server holds another account at this address.'
	const user = userEvent.setup()
	render(<EarlierFailureBench own={own} server={server} />)

	await user.click(screen.getByRole('button', { name: 'Send' }))
	await settle()

	expect(document.activeElement).toBe(screen.getByRole('textbox', { name: /^Name/ }))
	expect(descriptionOf(emailField())).toContain(server)
	expect(speak).toHaveBeenCalledWith(server, 'assertive')
})

test('speaks again when a later answer rejects the same value', async () => {
	const words = 'Still taken by another account.'
	const user = await rejectedOnSend({ answer: () => words, noValidate: true })

	await user.click(screen.getByRole('button', { name: 'Send' }))
	await settle()

	expect(speak).toHaveBeenCalledTimes(2)
	expect(getAnnouncement('assertive')).toBe(`${words}${REPEAT_MARK}`)
})

test('hands out the same reject and the same validity across renders', () => {
	const form = { current: document.createElement('form') }
	const { result, rerender } = renderHook(({ held }) => useRejectedField(form, held), {
		initialProps: { held: SENT },
	})
	act(() => {
		result.current.reject('Words that stand across renders.', SENT)
	})
	const { reject, validity } = result.current

	rerender({ held: SENT })

	expect(validity).toEqual({ type: 'invalid', message: 'Words that stand across renders.' })
	expect(result.current.reject).toBe(reject)
	expect(result.current.validity).toBe(validity)
})

/**
 * Renders a form with a blank required field that fails at mount, beside a field holding the hook.
 * @returns The form.
 */
function FailingAtMountBench() {
	const form = useRef<HTMLFormElement>(null)
	const rejected = useRejectedField(form, SENT)
	return (
		<form ref={form}>
			<ValidatedInputControl
				label="Name"
				required
				value=""
				onChange={() => undefined}
				customValidity={{ type: 'invalid', message: 'Please enter a name at mount.' }}
			/>
			<ValidatedInputControl label="Email" value={SENT} readOnly customValidity={rejected.validity} />
		</form>
	)
}

test('stays still on a StrictMode mount, also beside a field that fails', async () => {
	render(
		<StrictMode>
			<FailingAtMountBench />
		</StrictMode>,
	)
	await settle()

	expect(document.activeElement).toBe(document.body)
	expect(descriptionOf(screen.getByRole('textbox', { name: /^Name/ }))).toBe('')
	expect(speak).not.toHaveBeenCalled()
})

/**
 * Renders a form that a send both rejects and removes in one update.
 * @param props - The listener for what `reject` answered.
 * @returns The form while it stays.
 */
function LeavingBench({ onRejected }: { onRejected: (shown: boolean) => void }) {
	const form = useRef<HTMLFormElement>(null)
	const [open, setOpen] = useState(true)
	const rejected = useRejectedField(form, SENT)
	return open ? (
		<form ref={form}>
			<ValidatedInputControl label="Email" value={SENT} readOnly customValidity={rejected.validity} />
			<button
				type="button"
				onClick={() => {
					onRejected(rejected.reject('Words for a form that leaves.', SENT))
					setOpen(false)
				}}
			>
				Leave
			</button>
		</form>
	) : null
}

test('does nothing when the form leaves in the same update as the words', async () => {
	const shown = vi.fn()
	render(<LeavingBench onRejected={shown} />)

	fireEvent.click(screen.getByRole('button', { name: 'Leave' }))
	await settle()

	expect(shown).toHaveBeenCalledWith(true)
	expect(speak).not.toHaveBeenCalled()
})
