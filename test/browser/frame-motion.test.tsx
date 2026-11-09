// SPDX-License-Identifier: Apache-2.0

import { RouterProvider } from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { commands, page, userEvent } from 'vitest/browser'

import { AdminRoot } from '../../src/admin-root.js'
import { sidebarAppRouter } from '../sidebar-app.js'

/** The class of the keyed wrapper a sidebar screen slides in. */
const WRAPPER = 'godmin-navigation__screen-wrapper'

/** One slide a sidebar screen started: its name and the length its style gave it. */
interface Slide {
	name: string
	duration: string
}

/** One change the drawer or its backdrop eases: its part, property, length, curve and swipe strength. */
interface Ease {
	part: string
	property: string
	duration: number
	curve: string
	strength: string
}

/** Stops the listeners a test adds to the document. */
let listening = new AbortController()

afterEach(() => {
	listening.abort()
	listening = new AbortController()
	document.documentElement.removeAttribute('dir')
})

/** Draws the sidebar app on the posts page at a width and waits for its canvas. */
async function renderAppAt(width: number) {
	await page.viewport(width, 800)
	render(
		<AdminRoot>
			<RouterProvider router={sidebarAppRouter('/posts')} />
		</AdminRoot>,
	)
	await screen.findByRole('main')
}

/** Opens the drawer when the frame folds its sidebar into one, and waits for the drawer to settle. */
async function showSidebar() {
	const menu = screen.queryByRole('button', { name: 'Open navigation' })
	if (menu !== null) {
		await userEvent.click(menu)
		await screen.findByRole('dialog')
	}
	await expect.poll(() => document.getAnimations().length).toBe(0)
}

/** Returns the keyed wrapper the sidebar screen slides in. */
function wrapper(): HTMLElement {
	return document.querySelector(`.${WRAPPER}`) as HTMLElement
}

/** Waits for the next rendering update of the page. */
function nextFrame(): Promise<void> {
	return new Promise((done) => requestAnimationFrame(() => done()))
}

/** Records every slide a sidebar screen starts from now on, with the length its style gave it. */
function recordSlides(): Slide[] {
	const slides: Slide[] = []
	const record = (event: AnimationEvent) => {
		const target = event.target as HTMLElement
		if (target.classList.contains(WRAPPER)) {
			slides.push({ name: event.animationName, duration: getComputedStyle(target).animationDuration })
		}
	}
	document.addEventListener('animationstart', record, { capture: true, signal: listening.signal })
	return slides
}

/** Resolves once a sidebar screen ends a slide from now on. */
function slideEnded(): Promise<void> {
	return new Promise((done) => {
		const end = (event: AnimationEvent) => {
			if ((event.target as HTMLElement).classList.contains(WRAPPER)) {
				done()
			}
		}
		document.addEventListener('animationend', end, { capture: true, signal: listening.signal })
	})
}

/** Opens the Chats sub menu with a click on its drilldown row and waits for its title. */
async function drillIntoChats() {
	await userEvent.click(screen.getByRole('link', { name: 'Chats' }))
	await screen.findByRole('heading', { level: 1, name: 'Chats' })
}

test.each([390, 781])('shows a sub menu at once at %ipx wide, with no slide', async (width) => {
	await renderAppAt(width)
	await showSidebar()
	const slides = recordSlides()

	await drillIntoChats()

	await expect.poll(() => slides).toEqual([{ name: 'godmin-slide-from-end', duration: '0s' }])
	expect(wrapper().getAnimations()).toEqual([])
	await expect.poll(() => wrapper().className).toBe(WRAPPER)
})

test.each([782, 1280])('slides a sub menu in over 140ms at %ipx wide', async (width) => {
	await renderAppAt(width)
	await showSidebar()
	const slides = recordSlides()

	await drillIntoChats()

	await expect.poll(() => slides).toEqual([{ name: 'godmin-slide-from-end', duration: '0.14s' }])
	const [slide] = wrapper().getAnimations()
	expect(slide.effect?.getComputedTiming().duration).toBe(140)
	await expect.poll(() => wrapper().className).toBe(WRAPPER)
})

test('starts no slide when the window grows to 782px right after a drill at 781px', async () => {
	await renderAppAt(781)
	await showSidebar()
	const ended = slideEnded()

	await drillIntoChats()
	const drilled = performance.now()
	await ended
	await page.viewport(782, 800)
	await nextFrame()

	expect(performance.now() - drilled, 'the window grew inside the 140ms of a slide').toBeLessThan(140)
	expect(wrapper().getAnimations()).toEqual([])
	expect(wrapper().className).toBe(WRAPPER)
	expect(screen.getByRole('dialog')).not.toBeNull()
})

/** Returns the open drawer. */
function drawer(): HTMLElement {
	return screen.getByRole('dialog')
}

/** Returns the dimmed layer under the open drawer. */
function backdrop(): HTMLElement {
	return screen.getByTestId('drawer-backdrop')
}

/** Names the part of the drawer an element is, or none for any other element. */
function partOf(element: HTMLElement): string | undefined {
	if (element.classList.contains('godmin-layout__drawer')) {
		return 'drawer'
	}
	return element.dataset.testid === 'drawer-backdrop' ? 'backdrop' : undefined
}

/** Records every change the drawer or its backdrop eases from now on. */
function recordEases(): Ease[] {
	const eases: Ease[] = []
	const record = (event: TransitionEvent) => {
		const target = event.target as HTMLElement
		const part = partOf(target)
		const transition = target
			.getAnimations()
			.find((running) => running instanceof CSSTransition && running.transitionProperty === event.propertyName)
		if (part !== undefined && transition instanceof CSSTransition) {
			eases.push({
				part,
				property: event.propertyName,
				duration: Number(transition.effect?.getComputedTiming().duration),
				curve: `${transition.effect?.getTiming().easing}`,
				strength: target.style.getPropertyValue('--drawer-swipe-strength'),
			})
		}
	}
	document.addEventListener('transitionrun', record, { capture: true, signal: listening.signal })
	return eases
}

/** Returns the drawer changes recorded so far, the drawer first and each part by property. */
function sorted(eases: Ease[]): Ease[] {
	return [...eases].sort((one, other) => `${one.part} ${one.property}`.localeCompare(`${other.part} ${other.property}`))
}

/** Opens the drawer with the menu button and waits for it to settle. */
async function openDrawer() {
	await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	await screen.findByRole('dialog')
	await expect.poll(() => document.getAnimations().length).toBe(0)
}

/** Waits for the drawer to leave the page. */
async function drawerClosed() {
	await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
}

/** Samples the left edge of an element at every rendering update until it leaves the page. */
function leftEdges(element: HTMLElement): number[] {
	const edges: number[] = []
	const sample = () => {
		if (element.isConnected) {
			edges.push(element.getBoundingClientRect().left)
			requestAnimationFrame(sample)
		}
	}
	requestAnimationFrame(sample)
	return edges
}

test('opens and closes the drawer over 200ms on ease-out, its backdrop fading over the same time', async () => {
	await renderAppAt(390)
	const eases = recordEases()

	await openDrawer()
	const opening = sorted(eases.splice(0))
	await userEvent.keyboard('{Escape}')
	await drawerClosed()

	const timed = { duration: 200, curve: 'ease-out', strength: '1' }
	expect(opening).toEqual([
		{ part: 'backdrop', property: 'opacity', ...timed },
		{ part: 'drawer', property: 'transform', ...timed },
	])
	expect(sorted(eases)).toEqual(opening)
})

test('opens and closes the drawer at once under reduced motion', async () => {
	await commands.reduceMotion(true)
	await renderAppAt(390)
	const eases = recordEases()

	await userEvent.click(screen.getByRole('button', { name: 'Open navigation' }))
	await screen.findByRole('dialog')
	await nextFrame()
	expect(document.getAnimations()).toEqual([])
	await userEvent.keyboard('{Escape}')
	await drawerClosed()

	expect(eases).toEqual([])
})

test('opens the drawer at the right edge of a right to left page, with its shadow on its inner edge', async () => {
	document.documentElement.dir = 'rtl'
	await renderAppAt(390)

	await openDrawer()

	const box = drawer().getBoundingClientRect()
	expect([box.left, box.right, box.width]).toEqual([90, 390, 300])
	expect(getComputedStyle(drawer()).boxShadow).toBe('rgba(0, 0, 0, 0.2) -2px 0px 8px 0px')
	const edges = leftEdges(drawer())
	await userEvent.keyboard('{Escape}')
	await drawerClosed()
	expect(edges.length, 'the close took more than one frame').toBeGreaterThan(1)
	expect(edges.filter((edge) => edge < 90)).toEqual([])
})

test('lets the drawer and its backdrop follow a finger that drags the drawer, then ends the swipe', async () => {
	await renderAppAt(390)
	await openDrawer()
	const held: string[] = []
	const hold = () => {
		if (drawer().hasAttribute('data-swiping')) {
			held.push(`${getComputedStyle(backdrop()).transitionDuration} ${drawer().style.transition}`)
		}
	}
	document.addEventListener('pointermove', hold, { signal: listening.signal })
	const eases = recordEases()

	await commands.drag(250, 500, 50, 500, 12, 16)
	await drawerClosed()

	expect(held.length, 'the drag moved the drawer').toBeGreaterThan(2)
	expect(new Set(held)).toEqual(new Set(['0s none']))
	const [ending] = eases.filter((ease) => ease.part === 'drawer')
	expect(ending.duration).toBeCloseTo(Number(ending.strength) * 200, 3)
	expect(ending.duration).toBeLessThanOrEqual(200)
})

test('ends a fast swipe of the drawer well under 200ms, in its swipe strength times 200ms', async () => {
	await renderAppAt(390)
	await openDrawer()
	const eases = recordEases()

	await commands.drag(250, 500, 20, 500, 3, 0)
	await drawerClosed()

	const [ending] = eases.filter((ease) => ease.part === 'drawer')
	expect(ending.duration).toBeCloseTo(Number(ending.strength) * 200, 3)
	expect(ending.duration).toBeLessThan(100)
})

test('closes the drawer of a right to left page on a swipe to the right, keeping it at the right edge', async () => {
	document.documentElement.dir = 'rtl'
	await renderAppAt(390)
	await openDrawer()
	const edges = leftEdges(drawer())

	await commands.drag(150, 500, 380, 500, 3, 0)
	await drawerClosed()

	expect(edges.length, 'the swipe took more than one frame').toBeGreaterThan(1)
	expect(edges.filter((edge) => edge < 90)).toEqual([])
})
