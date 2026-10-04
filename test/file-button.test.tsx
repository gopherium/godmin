// SPDX-License-Identifier: Apache-2.0

import { fireEvent, render, screen } from '@testing-library/react'
import { people, upload } from '@wordpress/icons'
import { Button, Icon } from '@wordpress/ui'
import type { ComponentProps } from 'react'
import { expect, test, vi } from 'vitest'

import { FileButton } from '../src/index'
import type { FileButtonProps } from '../src/index'
import { installTestEnvironment, renderAdmin } from '../src/testing.js'

installTestEnvironment()

/**
 * Renders an upload button with the given props and a spy taking the chosen files.
 * @param props - The props beside the handler and the label.
 * @returns The button, its hidden input and the spy.
 */
function renderButton(props: Partial<FileButtonProps> = {}) {
	const onChoose = vi.fn()
	const { container } = renderAdmin(
		<FileButton onChoose={onChoose} inputLabel="Media files" {...props}>
			Upload media
		</FileButton>,
	)
	const input = container.querySelector('input[type="file"]') as HTMLInputElement
	return { button: screen.getByRole('button', { name: 'Upload media' }), input, onChoose }
}

/**
 * Returns a file the reader could pick.
 * @param name - The file name.
 * @returns The file.
 */
function fileNamed(name: string): File {
	return new File(['probe'], name, { type: 'image/png' })
}

/**
 * Returns the outlines drawn inside an element.
 * @param element - The element holding the drawing.
 * @returns The path data of every path in it, in source order.
 */
function outlines(element: Element): string[] {
	return [...element.querySelectorAll('path')].map((path) => path.getAttribute('d') ?? '')
}

/**
 * Returns the outlines a design system icon draws.
 * @param icon - The icon to draw.
 * @returns The path data of every path it draws.
 */
function iconOutlines(icon: ComponentProps<typeof Icon>['icon']): string[] {
	const { container, unmount } = render(<Icon icon={icon} />)
	const drawn = outlines(container)
	unmount()
	return drawn
}

test('draws a compact solid button, as a page header button', () => {
	const { button } = renderButton()
	const { container, unmount } = render(
		<Button variant="solid" size="compact">
			probe
		</Button>,
	)
	const sample = (container.firstElementChild as Element).className
	unmount()

	expect(button.className).toBe(sample)
})

test('opens the file dialog of its input when pressed', () => {
	const { button, input } = renderButton()
	const open = vi.spyOn(input, 'click')

	fireEvent.click(button)

	expect(open).toHaveBeenCalledOnce()
})

test('hands every chosen file to the handler', () => {
	const { input, onChoose } = renderButton({ multiple: true })
	const files = [fileNamed('first.png'), fileNamed('second.png')]

	fireEvent.change(input, { target: { files } })

	expect(onChoose).toHaveBeenCalledWith(files)
})

test('hands nothing over when the dialog closed with no file chosen', () => {
	const { input, onChoose } = renderButton()

	fireEvent.change(input, { target: { files: [] } })

	expect(onChoose).not.toHaveBeenCalled()
})

test('hands nothing over when the input reports no file list', () => {
	const { input, onChoose } = renderButton()

	fireEvent.change(input, { target: { files: null } })

	expect(onChoose).not.toHaveBeenCalled()
})

test('empties its input after a choice, so the same file can be chosen again', () => {
	const { input } = renderButton()
	const written: string[] = []
	Object.defineProperty(input, 'value', { configurable: true, get: () => '', set: (value) => written.push(value) })

	fireEvent.change(input, { target: { files: [fileNamed('first.png')] } })

	expect(written).toEqual([''])
})

test('empties its input before it hands the files over, so a failing handler lets the reader choose again', () => {
	const written: string[] = []
	const seen: string[][] = []
	const { input } = renderButton({ onChoose: () => seen.push([...written]) })
	Object.defineProperty(input, 'value', { configurable: true, get: () => '', set: (value) => written.push(value) })

	fireEvent.change(input, { target: { files: [fileNamed('first.png')] } })

	expect(seen).toEqual([['']])
})

test('takes the file types it is given and one file by default', () => {
	const { input } = renderButton({ accept: 'image/*' })

	expect(input.getAttribute('accept')).toBe('image/*')
	expect(input.multiple).toBe(false)
})

test('takes many files when asked', () => {
	expect(renderButton({ multiple: true }).input.multiple).toBe(true)
})

test('keeps its input out of view, named for a test to reach it', () => {
	const { input } = renderButton()

	expect(input.hidden).toBe(true)
	expect(screen.getByLabelText('Media files')).toBe(input)
})

test.each([
	['upload', upload],
	['people', people],
])('draws the %s icon it is given before the label, as the WordPress Upload media button', (_name, icon) => {
	const { button } = renderButton({ icon })
	const drawn = button.firstElementChild as Element

	expect(drawn.tagName.toLowerCase()).toBe('svg')
	expect(outlines(drawn)).toEqual(iconOutlines(icon))
	expect(button.textContent).toBe('Upload media')
})

test('draws no icon when none is given', () => {
	expect(renderButton().button.querySelector('svg')).toBeNull()
})

test('keeps the button from a second press while an upload runs', () => {
	const { button, input } = renderButton({ busy: true })
	const open = vi.spyOn(input, 'click')

	fireEvent.click(button)

	expect(button.getAttribute('aria-disabled')).toBe('true')
	expect(open).not.toHaveBeenCalled()
})
