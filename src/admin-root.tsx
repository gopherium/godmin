// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider } from '@wordpress/theme'
import { useEnableWpCompatOverlaySlot } from '@wordpress/ui'
import type { ComponentProps, ElementType, ReactNode } from 'react'

type ThemeSettings = Pick<
	ComponentProps<typeof ThemeProvider>,
	'color' | 'cursor' | 'cornerRadius'
>

export interface AdminRootProps extends ThemeSettings {
	children: ReactNode
	as?: ElementType
}

/**
 * Hosts a design system application in its own stacking context.
 * @param props - The theme settings, root element type and children.
 * @returns The host element wrapping the themed children.
 */
export function AdminRoot({ children, as: Root = 'div', ...theme }: AdminRootProps) {
	useEnableWpCompatOverlaySlot()
	return (
		<Root style={{ isolation: 'isolate' }}>
			<ThemeProvider {...theme} isRoot>
				{children}
			</ThemeProvider>
		</Root>
	)
}
