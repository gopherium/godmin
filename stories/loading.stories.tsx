// SPDX-License-Identifier: Apache-2.0

import '@wordpress/components/build-style/style.css'
import '@wordpress/dataviews/build-style/style.css'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataViews } from '@wordpress/dataviews'
import type { Field, View } from '@wordpress/dataviews'
import { useState } from 'react'
import { expect, waitFor } from 'storybook/test'

import { FormDialog } from '../src/index.js'
import { LoadingScreen } from '../src/loading.js'
import { Page } from '../src/page.js'
import { Admin, ListPage, NO_SHOT } from './frames.js'
import { OVERLAY_CARD, boxOf, centredIn, find, finishMotion, meets, middleAcross } from './measure.js'

/** A row of the sample list. */
interface Report {
	id: string
	title: string
}

/** How long a story waits for its loading state to show. */
const WAIT = 3_000

/** The ten rows of the first page of the sample list. */
const ROWS: Report[] = Array.from({ length: 10 }, (_, index) => ({ id: `${index + 1}`, title: `Report ${index + 1}` }))

/** The one field of the sample list, its title. */
const FIELDS: Field<Report>[] = [{ id: 'title', label: 'Title', getValue: ({ item }) => item.title }]

/** The view the sample list opens on: a table of ten rows on its first page. */
const VIEW: View = { type: 'table', titleField: 'title', page: 1, perPage: 10 }

/** Renders a list on its first load, which never ends. */
function FirstLoad() {
	return (
		<DataViews
			data={[]}
			fields={FIELDS}
			view={VIEW}
			onChangeView={() => {}}
			defaultLayouts={{ table: {} }}
			paginationInfo={{ totalItems: 0, totalPages: 0 }}
			isLoading
		/>
	)
}

/** Renders a list of three pages whose next page, once asked for, never arrives. */
function PagedList() {
	const [view, setView] = useState(VIEW)
	const [loading, setLoading] = useState(false)
	return (
		<DataViews
			data={loading ? [] : ROWS}
			fields={FIELDS}
			view={view}
			onChangeView={(next) => {
				setView(next)
				setLoading(true)
			}}
			defaultLayouts={{ table: {} }}
			paginationInfo={{ totalItems: 30, totalPages: 3 }}
			isLoading={loading}
		/>
	)
}

/** Renders a page that knows its title, holding a loading screen. */
function ScreenPage({ label }: { label: string }) {
	return (
		<Admin>
			<Page title="Report">
				<LoadingScreen label={label} />
			</Page>
		</Admin>
	)
}

/** Renders an empty list page under a form dialog holding a loading screen. */
function DialogScreen({ label }: { label: string }) {
	return (
		<>
			<ListPage>{null}</ListPage>
			<FormDialog
				title="Report"
				submitLabel="Save"
				cancelLabel="Cancel"
				canSubmit={false}
				onSubmit={() => undefined}
				onClose={() => {}}
			>
				<LoadingScreen label={label} />
			</FormDialog>
		</>
	)
}

/** Renders a loading screen directly in the canvas, with no page around it. */
function CanvasScreen({ label }: { label: string }) {
	return (
		<Admin>
			<LoadingScreen label={label} />
		</Admin>
	)
}

/** Checks the loading screen tells a screen reader the label of the stories. */
async function announces() {
	await expect(find('.godmin-loading-screen [role="status"]')).toHaveTextContent('Loading the report.')
}

const meta = {
	title: 'Components/Feedback/Loading',
	id: 'components-loading',
	component: LoadingScreen,
	args: { label: 'Loading the report.' },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof LoadingScreen>

export default meta

type Story = StoryObj<typeof meta>

export const ListFirstLoad: Story = {
	name: 'List, first load',
	render: () => (
		<ListPage>
			<FirstLoad />
		</ListPage>
	),
	play: async () => {
		await waitFor(() => find('.dataviews-loading'), { timeout: WAIT })
		const loading = boxOf('.dataviews-loading')
		await meets(loading.top, boxOf('.dataviews__view-actions').bottom, 'under the toolbar')
		await meets(loading.bottom, boxOf('.godmin-layout__canvas').bottom, 'down to the canvas bottom')
		await centredIn(boxOf('.dataviews-loading > p'), loading)
		await expect(document.body).not.toHaveTextContent('No results')
	},
}

export const ListLaterLoad: Story = {
	name: 'List, later load',
	render: () => (
		<ListPage>
			<PagedList />
		</ListPage>
	),
	play: async ({ userEvent }) => {
		await userEvent.click(find('.dataviews-pagination button[aria-label="Next page"]'))
		await waitFor(() => find('.dataviews-footer__content.is-refreshing'), { timeout: WAIT })
		await expect(find('.dataviews-view-table')).toHaveClass('is-refreshing')
		await expect(find('.dataviews-view-table')).toHaveTextContent('Report 1')
		await expect(find('.dataviews-view-table')).toHaveAttribute('aria-busy', 'true')
	},
}

export const Screen: Story = {
	render: (args) => <ScreenPage label={args.label} />,
	play: async () => {
		await announces()
		const spinner = boxOf('.godmin-loading-screen svg')
		const gap = parseFloat(getComputedStyle(find('.godmin-page')).rowGap)
		await meets(spinner.top, boxOf('.godmin-page__header').bottom + gap, 'one page gap under the header')
		await meets(middleAcross(spinner), middleAcross(boxOf('.godmin-page')), 'across the page')
	},
}

export const InADialog: Story = {
	name: 'In a dialog',
	render: (args) => <DialogScreen label={args.label} />,
	play: async () => {
		await announces()
		await finishMotion()
		const cancel = [...find(OVERLAY_CARD).querySelectorAll('button')].find((button) => button.textContent === 'Cancel')
		await waitFor(() => expect(cancel).toHaveFocus())
		const spinner = boxOf('.godmin-loading-screen svg')
		const style = getComputedStyle(find('.godmin-loading-screen'))
		const height = parseFloat(style.paddingBlockStart) + spinner.height + parseFloat(style.paddingBlockEnd)
		await meets(boxOf('.godmin-loading-screen').height, height, 'as tall as its paddings and the spinner')
		await meets(middleAcross(spinner), middleAcross(boxOf('[data-wp-ui-overlay-scroll-container]')), 'across the dialog')
	},
}

export const InTheCanvas: Story = {
	name: 'In the canvas',
	parameters: { argos: { modes: NO_SHOT } },
	render: (args) => <CanvasScreen label={args.label} />,
	play: async () => {
		await centredIn(boxOf('.godmin-loading-screen svg'), boxOf('.godmin-layout__canvas'))
	},
}

export const OutsideTheFrame: Story = {
	name: 'Outside the frame',
	parameters: { argos: { modes: NO_SHOT } },
	play: async () => {
		const page = document.documentElement
		await centredIn(boxOf('.godmin-loading-screen svg'), new DOMRect(0, 0, page.clientWidth, page.clientHeight))
	},
}
