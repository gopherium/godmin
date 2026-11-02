// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { expect } from 'storybook/test'

import { Page } from '../src/page.js'
import { PageTab, PageTabs } from '../src/page-tabs.js'
import { Admin } from './frames.js'
import { boxOf } from './measure.js'

/** Renders a page with its tabs, the first one current. */
function TabbedPage() {
	return (
		<Admin>
			<Page
				title="Users"
				tabs={
					<PageTabs label="User sections">
						<PageTab href="#users" current>
							Users
						</PageTab>
						<PageTab href="#tokens">Tokens</PageTab>
						<PageTab href="#roles">Roles</PageTab>
					</PageTabs>
				}
			>
				<p>The people who can sign in to this site.</p>
			</Page>
		</Admin>
	)
}

const meta = {
	title: 'Components/Page tabs',
	id: 'components-page-tabs',
	component: TabbedPage,
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof TabbedPage>

export default meta

type Story = StoryObj<typeof meta>

export const Tabs: Story = {
	globals: { viewport: { value: 'desktop', isRotated: false } },
	play: async () => {
		await expect(boxOf('.godmin-page-tabs__line').width).toBe(boxOf('.godmin-page-tabs__tab--current').width)
	},
}
