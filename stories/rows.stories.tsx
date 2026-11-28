// SPDX-License-Identifier: Apache-2.0

import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, SelectControl, Stack, Text } from '@wordpress/ui'
import { useLayoutEffect, useRef, useState } from 'react'
import { expect, within } from 'storybook/test'

import { Page, SectionTitle } from '../src/page.js'
import { RowControls } from '../src/rows.js'
import { Admin, NO_SHOT, onlyAt } from './frames.js'
import { meets } from './measure.js'

/** One choice a select of a rule offers. */
interface Choice {
	label: string
	value: string
}

/** One rule of the sample set: the field it reads, how it compares, and the value it compares with. */
interface Rule {
	id: number
	field: Choice | null
	operator: Choice | null
	value: Choice | null
}

/** The part of a rule one select sets, the name of the select and the choices it offers. */
interface Part {
	key: 'field' | 'operator' | 'value'
	label: string
	choices: Choice[]
}

/** Where the focus goes after the rules change: the group of a rule by its id, the add button, or nowhere. */
type Target = number | 'add' | undefined

/** The room between the selects of a rule and its trash. */
const GAP = 12

/** The window a story opens at, for its play and its shot. */
const DESKTOP = { viewport: { value: 'desktop', isRotated: false } }

/** The name of the sample set, as each rule and each trash names it. */
const SET = 'set 1'

/** The choices of the sample rules. */
const ROLE: Choice = { label: 'Role', value: 'role' }
const STATUS: Choice = { label: 'Status', value: 'status' }
const IS: Choice = { label: 'is', value: 'is' }
const IS_NOT: Choice = { label: 'is not', value: 'is-not' }
const EDITOR: Choice = { label: 'Editor', value: 'editor' }
const AUTHOR: Choice = { label: 'Author', value: 'author' }
const PUBLISHED: Choice = { label: 'Published', value: 'published' }
const DRAFT: Choice = { label: 'Draft', value: 'draft' }

/** The three selects of a rule, in the order a rule reads. */
const PARTS: Part[] = [
	{ key: 'field', label: 'Field', choices: [ROLE, STATUS] },
	{ key: 'operator', label: 'Operator', choices: [IS, IS_NOT] },
	{ key: 'value', label: 'Value', choices: [EDITOR, AUTHOR, PUBLISHED, DRAFT] },
]

/** The rules of the sample set, whose order means nothing. */
const RULES: Rule[] = [
	{ id: 1, field: ROLE, operator: IS, value: EDITOR },
	{ id: 2, field: STATUS, operator: IS_NOT, value: DRAFT },
	{ id: 3, field: ROLE, operator: IS_NOT, value: AUTHOR },
]

/** Returns the name of the rule at a place of the set, such as rule 2 of set 1. */
function ruleName(at: number): string {
	return `rule ${at + 1} of ${SET}`
}

/** Renders one rule as a line of its three selects and the trash named after it, in the group the focus lands on. */
function RuleRow({
	rule,
	at,
	group,
	onRemove,
}: {
	rule: Rule
	at: number
	group: (element: HTMLDivElement | null) => void
	onRemove: () => void
}) {
	return (
		<div ref={group} role="group" aria-label={`Rule ${at + 1} of ${SET}`} tabIndex={-1} className="godmin-rows__row">
			<div className="godmin-rows__line">
				<div className="godmin-rows__inputs">
					<div className="godmin-form__row">
						{PARTS.map((part) => (
							<SelectControl
								key={part.key}
								label={`${part.label} of ${ruleName(at)}`}
								hideLabelFromVision
								items={part.choices}
								defaultValue={rule[part.key]}
							/>
						))}
					</div>
				</div>
				<RowControls movable={false} labels={{ remove: `Remove ${ruleName(at)}` }} onRemove={onRemove} />
			</div>
		</div>
	)
}

/** Returns the refs of the rule groups and the add button, and what sets where the focus goes after the next change. */
function useFocusAfter() {
	const groups = useRef(new Map<number, HTMLDivElement>())
	const adder = useRef<HTMLButtonElement>(null)
	const next = useRef<Target>(undefined)
	useLayoutEffect(() => {
		const target = next.current
		next.current = undefined
		if (target !== undefined) {
			(target === 'add' ? adder.current : groups.current.get(target))?.focus()
		}
	})
	const after = (target: Target) => {
		next.current = target
	}
	return { groups, adder, after }
}

/** Renders the sample set of rules with its add button under it, the focus moved in godmin's order on a change. */
function RuleSet({ first }: { first: Rule[] }) {
	const [rules, setRules] = useState(first)
	const { groups, adder, after } = useFocusAfter()
	const remove = (at: number) => {
		const left = rules.filter((_, index) => index !== at)
		after((left[at] ?? left[at - 1])?.id ?? 'add')
		setRules(left)
	}
	const add = () => {
		const rule = { id: Math.max(0, ...rules.map(({ id }) => id)) + 1, field: null, operator: null, value: null }
		after(rule.id)
		setRules([...rules, rule])
	}
	const group = (id: number) => (element: HTMLDivElement | null) => {
		if (element === null) {
			groups.current.delete(id)
		} else {
			groups.current.set(id, element)
		}
	}
	return (
		<Stack direction="column" gap="md" className="godmin-rows" role="group" aria-labelledby="rule-set-1">
			<SectionTitle id="rule-set-1">Set 1</SectionTitle>
			{rules.length === 0 ? <Text>No rules yet.</Text> : null}
			{rules.map((rule, at) => (
				<RuleRow key={rule.id} rule={rule} at={at} group={group(rule.id)} onRemove={() => remove(at)} />
			))}
			<div>
				<Button ref={adder} variant="outline" onClick={add}>
					Add rule
				</Button>
			</div>
		</Stack>
	)
}

/** Renders the rules of a field on a page of the admin frame, the first rules of the sample as many as asked. */
function FieldRules({ count }: { count: number }) {
	return (
		<Admin>
			<Page title="Field rules">
				<RuleSet first={RULES.slice(0, count)} />
			</Page>
		</Admin>
	)
}

/** Returns the group of each rule on the page, in order. */
function rulesOf(canvasElement: HTMLElement): HTMLElement[] {
	return [...canvasElement.querySelectorAll<HTMLElement>('.godmin-rows__row')]
}

/** Returns the boxes of a rule's line, its inputs, each of its selects and its trash, failing when it has no trash. */
function boxesOf(row: HTMLElement) {
	const trash = row.querySelector('.godmin-rows__remove')
	if (trash === null) {
		throw new Error(`${row.getAttribute('aria-label')} has no trash`)
	}
	return {
		line: (row.querySelector('.godmin-rows__line') as HTMLElement).getBoundingClientRect(),
		inputs: (row.querySelector('.godmin-rows__inputs') as HTMLElement).getBoundingClientRect(),
		selects: [...row.querySelectorAll('.godmin-form__row > *')].map((select) => select.getBoundingClientRect()),
		trash: trash.getBoundingClientRect(),
	}
}

/** Checks each rule draws one button in its controls, the trash named after it with no start gap, and no arrow. */
async function trashAlone(canvasElement: HTMLElement) {
	const rows = rulesOf(canvasElement)
	await expect(rows.length, 'the rules shown').toBeGreaterThan(0)
	for (const [at, row] of rows.entries()) {
		const buttons = row.querySelectorAll('.godmin-rows__controls button')
		await expect(buttons, `the buttons of ${ruleName(at)}`).toHaveLength(1)
		await expect(buttons[0]).toHaveAccessibleName(`Remove ${ruleName(at)}`)
		await expect(within(row).queryAllByRole('button', { name: /Move/ }), `the arrows of ${ruleName(at)}`).toEqual([])
		await expect(getComputedStyle(buttons[0]).marginInlineStart, 'the start gap of the trash').toBe('0px')
	}
}

/** Checks each rule sets its three selects and its trash on one line, the trash at the line end one gap after them. */
async function onOneLine(canvasElement: HTMLElement) {
	for (const row of rulesOf(canvasElement)) {
		const { line, inputs, selects, trash } = boxesOf(row)
		await expect(selects.map(({ top }) => top), 'the selects share a line').toEqual(selects.map(() => selects[0].top))
		await meets(trash.bottom, inputs.bottom, 'the trash sits on the line of the selects')
		await meets(trash.left - inputs.right, GAP, 'one gap between the selects and the trash')
		await meets(trash.right, line.right, 'the trash ends the line')
	}
}

/** Checks each rule drops its trash under its selects, at the inline end of the line. */
async function underTheSelects(canvasElement: HTMLElement) {
	for (const row of rulesOf(canvasElement)) {
		const { line, inputs, trash } = boxesOf(row)
		await expect(trash.top, 'the trash sits under the selects').toBeGreaterThanOrEqual(inputs.bottom)
		await meets(trash.right, line.right, 'the trash ends the line')
	}
}

const meta = {
	title: 'Components/Rows',
	id: 'components-rows',
	component: FieldRules,
	args: { count: RULES.length },
	parameters: { layout: 'fullscreen', argos: { fitToContent: false } },
} satisfies Meta<typeof FieldRules>

export default meta

type Story = StoryObj<typeof meta>

export const RulesOnOneLine: Story = {
	name: 'Rules on one line',
	globals: DESKTOP,
	play: async ({ canvasElement }) => {
		await trashAlone(canvasElement)
		await onOneLine(canvasElement)
	},
}

export const RulesOnAPhone: Story = {
	name: 'Rules on a phone',
	...onlyAt('phone'),
	play: async ({ canvasElement }) => {
		await trashAlone(canvasElement)
		await underTheSelects(canvasElement)
	},
}

export const RemovingARule: Story = {
	name: 'Removing a rule',
	globals: DESKTOP,
	parameters: { argos: { modes: NO_SHOT } },
	play: async ({ canvasElement, userEvent }) => {
		const canvas = within(canvasElement)
		const [first, removed, third] = rulesOf(canvasElement)
		canvas.getByRole('button', { name: `Remove ${ruleName(1)}` }).focus()
		await userEvent.keyboard('{Enter}')
		await expect(removed.isConnected, 'the rule removed').toBe(false)
		await expect(third, 'the rule that took its place').toHaveFocus()
		await expect(third).toHaveAccessibleName(`Rule 2 of ${SET}`)
		canvas.getByRole('button', { name: `Remove ${ruleName(1)}` }).focus()
		await userEvent.keyboard('{Enter}')
		await expect(third.isConnected, 'the last rule removed').toBe(false)
		await expect(first, 'the rule before it').toHaveFocus()
	},
}

export const RemovingTheOnlyRule: Story = {
	name: 'Removing the only rule',
	globals: DESKTOP,
	args: { count: 1 },
	parameters: { argos: { modes: NO_SHOT } },
	play: async ({ canvasElement, userEvent }) => {
		const canvas = within(canvasElement)
		canvas.getByRole('button', { name: `Remove ${ruleName(0)}` }).focus()
		await userEvent.keyboard('{Enter}')
		await expect(rulesOf(canvasElement), 'the rules left').toEqual([])
		await expect(canvas.getByRole('button', { name: 'Add rule' }), 'the add button').toHaveFocus()
		await expect(canvas.getByText('No rules yet.')).toBeVisible()
		await userEvent.keyboard('{Enter}')
		await expect(canvas.getByRole('group', { name: `Rule 1 of ${SET}` }), 'the rule the add made').toHaveFocus()
	},
}
