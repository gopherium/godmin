// SPDX-License-Identifier: Apache-2.0

import { Button } from '@wordpress/ui'
import type { ReactNode } from 'react'

import { Frame } from '../src/frame.js'
import type { CanvasMode } from '../src/frame.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { Page } from '../src/page.js'
import { PageBreadcrumb, PageBreadcrumbs } from '../src/page-breadcrumbs.js'

/** Renders an admin frame with a sidebar and a canvas holding what it is given. */
export function Admin({ canvas, children }: { canvas?: CanvasMode; children: ReactNode }) {
	return (
		<Frame.Root location="/">
			<Frame.Sidebar>
				<NavigationScreen title="Admin">
					<p>Menu</p>
				</NavigationScreen>
			</Frame.Sidebar>
			<Frame.Canvas canvas={canvas}>{children}</Frame.Canvas>
		</Frame.Root>
	)
}

/** Renders a list page holding what it is given, beside an aside when it has one. */
export function ListPage({ aside, children }: { aside?: ReactNode; children: ReactNode }) {
	return (
		<Admin>
			<Page title="Reports" list aside={aside}>
				{children}
			</Page>
		</Admin>
	)
}

/** The title, the canvas, the details and the main work of a record page. */
interface RecordPageProps {
	title?: string
	canvas?: CanvasMode
	aside: ReactNode
	children: ReactNode
}

/** Renders a record page beside the sidebar, nothing changed so Save is off, its details in the aside. */
export function RecordPage({ title = 'Invoice 1042', canvas, aside, children }: RecordPageProps) {
	return (
		<Admin canvas={canvas}>
			<Page
				title={title}
				headingLevel={2}
				aside={aside}
				asideLabel="Invoice details"
				breadcrumbs={
					<PageBreadcrumbs label="Breadcrumbs">
						<PageBreadcrumb href="#invoices">Invoices</PageBreadcrumb>
					</PageBreadcrumbs>
				}
				actions={
					<Button size="compact" disabled>
						Save
					</Button>
				}
			>
				{children}
			</Page>
		</Admin>
	)
}
