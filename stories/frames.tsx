// SPDX-License-Identifier: Apache-2.0

import type { ReactNode } from 'react'

import { Frame } from '../src/frame.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { Page } from '../src/page.js'

/** Renders an admin frame with a sidebar and a canvas holding what it is given. */
export function Admin({ children }: { children: ReactNode }) {
	return (
		<Frame.Root location="/">
			<Frame.Sidebar>
				<NavigationScreen title="Admin">
					<p>Menu</p>
				</NavigationScreen>
			</Frame.Sidebar>
			<Frame.Canvas>{children}</Frame.Canvas>
		</Frame.Root>
	)
}

/** Renders a list page holding what it is given. */
export function ListPage({ children }: { children: ReactNode }) {
	return (
		<Admin>
			<Page title="Reports" list>
				{children}
			</Page>
		</Admin>
	)
}
