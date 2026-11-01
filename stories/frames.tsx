// SPDX-License-Identifier: Apache-2.0

import { Button } from '@wordpress/ui'
import type { ReactNode } from 'react'

import { Frame } from '../src/frame.js'
import { NavigationScreen } from '../src/navigation-screen.js'
import { Page } from '../src/page.js'
import { PageBreadcrumb, PageBreadcrumbs } from '../src/page-breadcrumbs.js'

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

/** The title, the details and the main work of a record page. */
interface RecordPageProps {
	title?: string
	aside: ReactNode
	children: ReactNode
}

/** Renders a record page beside the sidebar, nothing changed so Save is off, its details in the aside. */
export function RecordPage({ title = 'Invoice 1042', aside, children }: RecordPageProps) {
	return (
		<Admin>
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
