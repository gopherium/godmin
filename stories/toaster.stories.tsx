// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, Stack } from '@wordpress/ui'
import { expect, waitFor, within } from 'storybook/test'

import { Frame } from '../src/frame.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { Page } from '../src/page.js'
import { Toaster, useToaster } from '../src/toaster.js'

/** How long every toast of a story stays. */
const TEN_MINUTES = 600_000

/** How long a story waits for its toasts to show. */
const TOAST_WAIT = 3_000

/** A whole name long enough to wrap inside a toast. */
const LONG = `"${'A title that keeps going and going '.repeat(4).trim()}" moved to the trash.`

/** The words of four toasts shown at once, one more than the region keeps. */
const FOUR = ['One', 'Two', 'Three', 'Four']

/** The phone shot, for a story whose toast sits differently on a phone. */
const PHONE = { phone: { viewport: 'phone' } }

/** Renders the buttons that show each kind of toast. */
function ToastButtons() {
	const toaster = useToaster()
	const undo = { label: 'Undo', onAct: () => toaster.show('"Hello" restored.') }
	return (
		<Stack direction="row" gap="sm" wrap="wrap">
			<Button variant="outline" onClick={() => toaster.show('Settings saved.')}>
				Plain
			</Button>
			<Button variant="outline" onClick={() => toaster.show('"Hello" moved to the trash.', undo)}>
				Action
			</Button>
			<Button variant="outline" onClick={() => toaster.show(LONG, undo)}>
				Long
			</Button>
			<Button
				variant="outline"
				onClick={() => {
					toaster.show('First saved.')
					setTimeout(() => toaster.show('Second saved.'), 400)
					setTimeout(() => toaster.show('"Third" moved to the trash.', undo), 800)
				}}
			>
				Three in a row
			</Button>
			<Button variant="outline" onClick={() => FOUR.forEach((word) => toaster.show(`${word} saved.`))}>
				Four
			</Button>
		</Stack>
	)
}

/** Renders an admin page with a sidebar and a canvas holding the toast buttons. */
function ToastPage() {
	return (
		<Frame.Root location="/">
			<Frame.Sidebar>
				<NavigationScreen title="Admin">
					<p>Menu</p>
				</NavigationScreen>
			</Frame.Sidebar>
			<Frame.Canvas>
				<Page title="Toasts">
					<ToastButtons />
				</Page>
			</Frame.Canvas>
		</Frame.Root>
	)
}

/** Clicks the page button with the given name, failing at once when no button has it. */
function press(canvasElement: HTMLElement, name: string) {
	within(canvasElement).getByRole('button', { name }).click()
}

/** Ends every toast animation and waits until no toast is leaving. */
async function settle(canvasElement: HTMLElement) {
	for (const animation of canvasElement.querySelector('.godmin-toasts')?.getAnimations({ subtree: true }) ?? []) {
		animation.finish()
	}
	await waitFor(() => expect(canvasElement.querySelector('.godmin-toasts__item--leaving')).toBeNull())
}

/** Returns the toasts on screen, oldest first. */
function toasts(canvasElement: HTMLElement): HTMLElement[] {
	return [...canvasElement.querySelectorAll<HTMLElement>('.godmin-toast')]
}

/** Waits until the given number of toasts shows, then settles them. */
async function waitForToasts(canvasElement: HTMLElement, count: number) {
	await waitFor(() => expect(toasts(canvasElement)).toHaveLength(count), { timeout: TOAST_WAIT })
	await settle(canvasElement)
}

/** Checks the newest toast sits at the centre of the window, 32px above its bottom edge. */
async function centred(canvasElement: HTMLElement) {
	const box = toasts(canvasElement).at(-1)?.getBoundingClientRect()
	const page = document.documentElement
	await expect(Math.abs((box?.left ?? 0) + (box?.width ?? 0) / 2 - page.clientWidth / 2)).toBeLessThan(0.5)
	await expect(page.clientHeight - (box?.bottom ?? 0)).toBeCloseTo(32, 0)
}

/** Focuses the Undo action of the newest toast. */
async function focusUndo(canvasElement: HTMLElement) {
	const undo = toasts(canvasElement).at(-1)?.querySelector<HTMLButtonElement>('.godmin-toast__action')
	undo?.focus()
	await expect(undo?.matches(':focus-visible')).toBe(true)
}

/** Checks the toast keeps its 4px corners and its focused action its 2px ring corners. */
async function keepsCorners(canvasElement: HTMLElement) {
	const toast = toasts(canvasElement)[0]
	const undo = toast.querySelector('.godmin-toast__action') as HTMLElement
	await expect(getComputedStyle(toast).borderRadius).toBe('4px')
	await expect(getComputedStyle(undo).borderRadius).toBe('2px')
}

/** Checks the action of the first toast starts on the first line of its message. */
async function actionOnFirstLine(canvasElement: HTMLElement) {
	const message = toasts(canvasElement)[0].querySelector('.godmin-toast__message') as HTMLElement
	const undo = toasts(canvasElement)[0].querySelector('.godmin-toast__action') as HTMLElement
	const gap = Math.abs(undo.getBoundingClientRect().top - message.getBoundingClientRect().top)
	await expect(gap).toBeLessThan(parseFloat(getComputedStyle(message).lineHeight))
}

/** Returns the corner radius of the canvas, which follows the preset the toolbar picked. */
function canvasCorners(canvasElement: HTMLElement): string {
	return getComputedStyle(canvasElement.querySelector('.godmin-layout__canvas') as HTMLElement).borderRadius
}

const meta = {
	title: 'Components/Feedback/Toaster',
	id: 'components-toaster',
	component: Toaster,
	args: { dismissAfter: TEN_MINUTES, actionDismissAfter: TEN_MINUTES, children: <ToastPage /> },
	argTypes: { children: { control: false } },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof Toaster>

export default meta

type Story = StoryObj<typeof meta>

export const Plain: Story = {
	parameters: { argos: { modes: PHONE } },
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Plain')
		await waitForToasts(canvasElement, 1)
		await centred(canvasElement)
	},
}

export const WithAction: Story = {
	name: 'With an action',
	parameters: { argos: { modes: { ...PHONE, rtl: { viewport: 'desktop', direction: 'rtl' } } } },
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Action')
		await waitForToasts(canvasElement, 1)
		await centred(canvasElement)
	},
}

export const LongName: Story = {
	name: 'Long name',
	parameters: { argos: { modes: { ...PHONE, narrow: { viewport: 'narrow' } } } },
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Long')
		await waitForToasts(canvasElement, 1)
		await expect(toasts(canvasElement)[0].getBoundingClientRect().width).toBeLessThanOrEqual(560)
		await actionOnFirstLine(canvasElement)
	},
}

export const ThreeInARow: Story = {
	name: 'Three in a row',
	parameters: { argos: { modes: PHONE } },
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Three in a row')
		await waitForToasts(canvasElement, 3)
		await expect(toasts(canvasElement).map((toast) => toast.textContent)).toEqual([
			'First saved.',
			'Second saved.',
			'"Third" moved to the trash.Undo',
		])
	},
}

export const FourAtOnce: Story = {
	name: 'Four at once',
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Four')
		await waitForToasts(canvasElement, 3)
		await expect(canvasElement.querySelector('.godmin-toasts')).not.toHaveTextContent('One saved.')
	},
}

export const FocusOnTheAction: Story = {
	name: 'Focus on the action',
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Action')
		await waitForToasts(canvasElement, 1)
		await focusUndo(canvasElement)
	},
}

export const PronouncedCorners: Story = {
	name: 'Pronounced corners',
	globals: { cornerRadius: 'pronounced' },
	play: async (context) => {
		await FocusOnTheAction.play?.(context)
		await keepsCorners(context.canvasElement)
		await expect(canvasCorners(context.canvasElement)).toBe('26px')
	},
}

export const NoCorners: Story = {
	name: 'No corners',
	globals: { cornerRadius: 'none' },
	play: async (context) => {
		await FocusOnTheAction.play?.(context)
		await keepsCorners(context.canvasElement)
		await expect(canvasCorners(context.canvasElement)).toBe('0px')
	},
}

export const FocusOnAPlainToast: Story = {
	name: 'Focus on a plain toast',
	play: async ({ canvasElement }) => {
		press(canvasElement, 'Plain')
		await waitForToasts(canvasElement, 1)
		toasts(canvasElement)[0].focus()
		await expect(toasts(canvasElement)[0].matches(':focus-visible')).toBe(true)
	},
}

export const ClickedAway: Story = {
	name: 'Clicked away',
	play: async ({ canvasElement, userEvent }) => {
		press(canvasElement, 'Action')
		await waitForToasts(canvasElement, 1)
		await userEvent.click(canvasElement.querySelector('.godmin-toast__message') as HTMLElement)
		await waitFor(() => expect(toasts(canvasElement)).toHaveLength(0))
		await expect(document.activeElement).toBe(canvasElement.querySelector('.godmin-toasts'))
	},
}
