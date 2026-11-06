// SPDX-License-Identifier: Apache-2.0

import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ConfirmDialog } from '../../../src/dialogs.js'

/** How tall the page grows, well past the window, so the page scrolls. */
const TALL = '3000px'

/** Renders a page taller than the window, outside the admin frame, a line in its middle, under a confirm if asked. */
function TallPage({ asking }: { asking: boolean }) {
	return (
		<>
			<div style={{ blockSize: TALL }}>
				<p style={{ inlineSize: '200px', marginInline: 'auto' }}>Reports</p>
			</div>
			{asking ? (
				<ConfirmDialog
					title="Empty the trash?"
					confirmLabel="Empty trash"
					cancelLabel="Cancel"
					onConfirm={() => undefined}
					onClose={() => {}}
				/>
			) : null}
		</>
	)
}

test('moves nothing on a page with a real scrollbar as a confirm opens over it', async () => {
	const { rerender } = render(<TallPage asking={false} />)
	const line = screen.getByText('Reports')
	const before = line.getBoundingClientRect()
	expect(window.innerWidth - document.documentElement.clientWidth, 'the width of the real scrollbar').toBeGreaterThan(0)

	rerender(<TallPage asking />)
	const popup = await screen.findByRole('alertdialog')
	await expect.poll(() => popup.hasAttribute('data-starting-style')).toBe(false)
	await expect.poll(() => popup.getAnimations().length).toBeGreaterThan(0)
	await Promise.all(popup.getAnimations().map(async (motion) => motion.finished))

	const after = line.getBoundingClientRect()
	expect([after.left, after.width], 'the line once the confirm opened').toEqual([before.left, before.width])
})
