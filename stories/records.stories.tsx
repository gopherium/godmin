// SPDX-License-Identifier: Apache-2.0

import '@wordpress/components/build-style/style.css'
import '@wordpress/dataviews/build-style/style.css'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataForm } from '@wordpress/dataviews'
import type { Field, Form } from '@wordpress/dataviews'
import { Button, InputControl } from '@wordpress/ui'

import { LogItem, LogList, LogTime } from '../src/log-list.js'
import { SectionTitle } from '../src/page.js'
import { RecordPage } from './frames.js'
import { columnsOf, meets } from './measure.js'

/** The facts of the sample invoice. */
interface InvoiceFacts {
	issued: string
	owner: string
}

/** The room between the two columns, side by side and stacked. */
const GAP = 24

/** The facts the sample invoice shows. */
const FACTS: InvoiceFacts = { issued: '12 March 2026', owner: 'Sales desk' }

/** The read-only facts of the sample invoice. */
const FACT_FIELDS: Field<InvoiceFacts>[] = [
	{ id: 'issued', label: 'Issued', readOnly: true },
	{ id: 'owner', label: 'Owner', readOnly: true },
]

/** The facts as rows of a label and a value, as the media editor lays them out. */
const FACT_FORM: Form = { layout: { type: 'panel' }, fields: ['issued', 'owner'] }

/** Renders the lines of the sample invoice, each with a control a keyboard reaches. */
function Lines({ lines }: { lines: number }) {
	return (
		<>
			<SectionTitle id="invoice-lines">Lines</SectionTitle>
			<LogList aria-labelledby="invoice-lines">
				{Array.from({ length: lines }, (_, index) => (
					<LogItem
						key={index}
						aria-label={`Line ${index + 1}`}
						label={<LogTime dateTime="2026-03-12">Line {index + 1}, 12 March</LogTime>}
						actions={
							<Button variant="minimal" size="compact">
								Edit
							</Button>
						}
						body="Ten units of sample goods at the agreed price."
					/>
				))}
			</LogList>
		</>
	)
}

/** Renders the details of the sample invoice, its fields and then its facts. */
function Details() {
	return (
		<>
			<SectionTitle>Details</SectionTitle>
			<form className="godmin-form">
				<InputControl label="Customer" defaultValue="Sample customer" />
				<InputControl label="Reference" defaultValue="Order 7731" />
			</form>
			<DataForm data={FACTS} fields={FACT_FIELDS} form={FACT_FORM} onChange={() => undefined} />
		</>
	)
}

/** Renders the sample invoice, its lines as long as asked. */
function Invoice({ lines, title }: { lines: number; title?: string }) {
	return (
		<RecordPage title={title} aside={<Details />}>
			<Lines lines={lines} />
		</RecordPage>
	)
}

/** Runs a story and its only shot at one viewport, in place of the default desktop shot. */
function onlyAt(viewport: 'medium' | 'phone') {
	return {
		globals: { viewport: { value: viewport } },
		parameters: { argos: { modes: { desktop: { disabled: true }, [viewport]: { viewport } } } },
	}
}

/** Checks the work grows and the details hold a fixed column at the end, on one line. */
async function beside() {
	const { page, main, details } = columnsOf()
	await meets(details.width, 400, 'the details are 400px wide')
	await meets(details.right, page.right, 'the details end at the page end')
	await meets(main.left, page.left, 'the work starts at the page start')
	await meets(details.left - main.right, GAP, 'one gap between them')
	await meets(main.top, details.top, 'both start on one line')
}

/** Checks the details sit right under the work and both fill the page. */
async function under() {
	const { page, main, details } = columnsOf()
	await meets(main.width, page.width, 'the work fills the page')
	await meets(details.width, page.width, 'the details fill the page')
	await meets(details.top - main.bottom, GAP, 'no hole between them')
}

const meta = {
	title: 'Components/Record pages',
	id: 'components-record-pages',
	component: Invoice,
	args: { lines: 3 },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof Invoice>

export default meta

type Story = StoryObj<typeof meta>

export const Record: Story = {
	globals: { viewport: { value: 'desktop', isRotated: false } },
	play: beside,
}

export const RecordMedium: Story = {
	name: 'Record, medium width',
	...onlyAt('medium'),
	play: under,
}

export const RecordPhone: Story = {
	name: 'Record, phone',
	args: { lines: 2 },
	...onlyAt('phone'),
	play: under,
}
