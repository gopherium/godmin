// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import stylelint from 'stylelint'
import { expect, test } from 'vitest'

import config from '../src/stylelint'

/**
 * Returns the rule warnings stylelint reports for the given stylesheet.
 * @param css - The stylesheet source to lint.
 * @returns The rule names that produced a warning.
 */
async function lint(css: string): Promise<string[]> {
	const result = await stylelint.lint({ code: css, config, configBasedir: resolve('.') })
	return result.results.flatMap((one) => one.warnings.map((warning) => warning.rule))
}

test('turns on every design system rule the theme package ships', () => {
	expect(Object.keys(config.rules)).toEqual([
		'plugin-wpds/no-unknown-ds-tokens',
		'plugin-wpds/no-setting-wpds-custom-properties',
		'plugin-wpds/no-token-fallback-values',
	])
})

test('accepts a stylesheet reading a real design token', async () => {
	expect(await lint('a { color: var(--wpds-color-foreground-content-neutral); }')).toEqual([])
})

test('rejects a design token the theme does not declare', async () => {
	const warnings = await lint('a { color: var(--wpds-color-foreground-nonsense); }')

	expect(warnings).toContain('plugin-wpds/no-unknown-ds-tokens')
})

test('rejects an application redefining a design system custom property', async () => {
	const warnings = await lint(':root { --wpds-color-foreground-content-neutral: red; }')

	expect(warnings).toContain('plugin-wpds/no-setting-wpds-custom-properties')
})

test('rejects a hand written fallback value on a design token', async () => {
	const warnings = await lint('a { color: var(--wpds-color-foreground-content-neutral, #000); }')

	expect(warnings).toContain('plugin-wpds/no-token-fallback-values')
})

test('passes the stylesheet this package ships', async () => {
	const base = readFileSync(resolve('src/base.css'), 'utf8')

	expect(await lint(base)).toEqual([])
})
