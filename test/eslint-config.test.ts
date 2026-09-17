import { ESLint } from 'eslint'
import { expect, test } from 'vitest'

const eslint = new ESLint()

/**
 * Returns the rules ESLint reports for a source linted at the given path.
 * @param source - The code to lint.
 * @param filePath - The path the code is linted as.
 * @returns The rule identifier of every reported message.
 */
async function reported(source: string, filePath: string): Promise<(string | null)[]> {
	const [result] = await eslint.lintText(source, { filePath })
	return result.messages.map((message) => message.ruleId)
}

/**
 * Returns a documented source function holding the given body.
 * @param body - The statements before the function returns.
 * @returns The function source.
 */
function documented(body: string): string {
	return [
		'/**',
		' * Probes the lint configuration.',
		' * @param value - The value to probe.',
		' * @returns The value.',
		' */',
		'export function probe(value: number): number {',
		body,
		'\treturn value',
		'}',
		'',
	].join('\n')
}

test.each(['src/probe.ts', 'src/probe.tsx'])('reports a function over the complexity ceiling in %s', async (path) => {
	const branches = Array.from({ length: 11 }, (_, index) => `\tif (value === ${index}) {\n\t\treturn ${index}\n\t}`)

	expect(await reported(documented(branches.join('\n')), path)).toContain('complexity')
})

test.each(['src/probe.ts', 'src/probe.tsx'])('reports a function without a docblock in %s', async (path) => {
	const source = 'export function probe(value: number): number {\n\treturn value\n}\n'

	expect(await reported(source, path)).toContain('jsdoc/require-jsdoc')
})

test.each(['test/probe.test.ts', 'test/probe.test.tsx'])('reports a line over the length limit in %s', async (path) => {
	const source = `export const probe = '${'x'.repeat(120)}'\n`

	expect(await reported(source, path)).toContain('max-len')
})
