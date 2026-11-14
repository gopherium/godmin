// SPDX-License-Identifier: Apache-2.0

import { ThemeProvider } from '@wordpress/theme'
import { useEnableWpCompatOverlaySlot } from '@wordpress/ui'
import type { ComponentProps, ElementType, ReactNode } from 'react'

import { WriteTimeoutContext, checkedWriteTimeout } from './dialog-open.js'

type ThemeSettings = Pick<
	ComponentProps<typeof ThemeProvider>,
	'color' | 'cursor' | 'cornerRadius'
>

export interface AdminRootProps extends ThemeSettings {
	children: ReactNode
	as?: ElementType
	/** How long in milliseconds a busy dialog waits on its write, from the app's own settings, Infinity for no limit. */
	writeTimeout: number
}

/** The design system's own primary color, seeded when an application names none. */
const DEFAULT_COLOR = { primary: '#3858e9' }

/**
 * Hosts a design system application in its own stacking context.
 * @param props - The theme settings, the write time limit, the root element type and the children.
 * @returns The host element wrapping the themed children.
 */
export function AdminRoot({
	children,
	as: Root = 'div',
	color = DEFAULT_COLOR,
	writeTimeout,
	...theme
}: AdminRootProps) {
	useEnableWpCompatOverlaySlot()
	return (
		<Root style={{ isolation: 'isolate' }}>
			<ThemeProvider color={color} {...theme} isRoot>
				<WriteTimeoutContext.Provider value={checkedWriteTimeout(writeTimeout)}>{children}</WriteTimeoutContext.Provider>
			</ThemeProvider>
		</Root>
	)
}
