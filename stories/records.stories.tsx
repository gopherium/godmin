// SPDX-License-Identifier: Apache-2.0

import '@wordpress/components/build-style/style.css'
import '@wordpress/dataviews/build-style/style.css'

import type { Meta, StoryObj } from '@storybook/react-vite'
import { DataForm } from '@wordpress/dataviews'
import type { Field, Form } from '@wordpress/dataviews'
import { Button, InputControl } from '@wordpress/ui'
import { expect } from 'storybook/test'

import { LogItem, LogList, LogTime } from '../src/log-list.js'
import { SectionTitle } from '../src/page.js'
import { RecordPage } from './frames.js'
import { boxOf, columnsOf, find, meets } from './measure.js'

/** The facts of the sample invoice. */
interface InvoiceFacts {
	issued: string
	owner: string
}

/** The room between the two columns, side by side and stacked. */
const GAP = 24

/** How far a play scrolls a column. */
const SHIFT = 160

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

/** Checks nothing runs past the split sideways, since it hides what does and shows nothing. */
async function noSpill() {
	const split = find('.godmin-page__split')
	await expect(split.scrollWidth, 'nothing spills sideways').toBeLessThanOrEqual(split.clientWidth)
}

/** Checks the work grows and the details hold a fixed column at the end, on one line. */
async function beside() {
	const { page, main, details } = columnsOf()
	await meets(details.width, 400, 'the details are 400px wide')
	await meets(details.right, page.right, 'the details end at the page end')
	await meets(main.left, page.left, 'the work starts at the page start')
	await meets(details.left - main.right, GAP, 'one gap between them')
	await meets(main.top, details.top, 'both start on one line')
	await noSpill()
}

/** Checks the details sit right under the work and both fill the page. */
async function under() {
	const { page, main, details } = columnsOf()
	await meets(main.width, page.width, 'the work fills the page')
	await meets(details.width, page.width, 'the details fill the page')
	await meets(details.top - main.bottom, GAP, 'no hole between them')
	await noSpill()
}

/** Scrolls the main work and checks the title and the details stay where they were. */
async function scrollsAlone() {
	const work = find('.godmin-page__main')
	const split = find('.godmin-page__split')
	const canvas = find('.godmin-layout__canvas')
	await expect(work.scrollHeight - work.clientHeight, 'the work overflows').toBeGreaterThan(SHIFT)
	const before = { ...columnsOf(), title: boxOf('.godmin-page__header').top }
	work.scrollTop = SHIFT
	const after = columnsOf()
	await meets(after.main.top, before.main.top - SHIFT, 'the work moved')
	await meets(after.details.top, before.details.top, 'the details stayed beside it')
	await meets(boxOf('.godmin-page__header').top, before.title, 'the title stayed')
	await meets(split.scrollHeight, split.clientHeight, 'the split has nothing to scroll')
	await meets(canvas.scrollHeight, canvas.clientHeight, 'the canvas has nothing to scroll')
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

export const LongRecord: Story = {
	name: 'Long record',
	args: { lines: 40 },
	globals: { viewport: { value: 'desktop', isRotated: false } },
	play: scrollsAlone,
}
