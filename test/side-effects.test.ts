// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

import ts from 'typescript'
import { expect, test } from 'vitest'

import manifest from '../package.json'

/** The source folder the entries are built from. */
const source = resolve(import.meta.dirname, '../src')

/** A module the import check reads, by its file name and its text. */
interface ModuleSource {
	/** The file name, which tells TypeScript whether to read JSX. */
	name: string
	/** The text of the module. */
	text: string
}

/** The statements a module may hold at its top level without running anything when it is imported. */
const QUIET_STATEMENTS = new Set([
	ts.SyntaxKind.ImportDeclaration,
	ts.SyntaxKind.ExportDeclaration,
	ts.SyntaxKind.ExportAssignment,
	ts.SyntaxKind.FunctionDeclaration,
	ts.SyntaxKind.ClassDeclaration,
	ts.SyntaxKind.InterfaceDeclaration,
	ts.SyntaxKind.TypeAliasDeclaration,
	ts.SyntaxKind.EnumDeclaration,
	ts.SyntaxKind.VariableStatement,
	ts.SyntaxKind.ModuleDeclaration,
])

/** The calls and constructors a module may run when it loads, each of which only builds the value it returns. */
const PURE_CALLS = new Set([
	'createContext',
	'createLink',
	'createNavigationState',
	'memo',
	'new Map',
	'new Set',
	'new WeakMap',
])

/** The array methods that only build a value, accepted on a chain that starts at an array literal. */
const ARRAY_READS = new Set(['join', 'map'])

/** The method calls on a named value of the source folder that only read it. */
const KNOWN_READS = new Set(['TYPE_OFFERS.keys'])

/** The array methods that run the function they are handed straight away, so its body runs when the module loads. */
const EAGER_CALLBACKS = new Set(['map'])

/** The operators that assign a value. */
const ASSIGNMENTS = new Set(
	Array.from(
		{ length: ts.SyntaxKind.LastAssignment - ts.SyntaxKind.FirstAssignment + 1 },
		(_, step) => ts.SyntaxKind.FirstAssignment + step,
	),
)

/** The operators that step a value up or down. */
const STEPS = new Set([ts.SyntaxKind.PlusPlusToken, ts.SyntaxKind.MinusMinusToken])

/** Tells whether a node is a function written in place, an arrow or a function expression. */
function isInlineFunction(node: ts.Node): node is ts.ArrowFunction | ts.FunctionExpression {
	return ts.isArrowFunction(node) || ts.isFunctionExpression(node)
}

/** Tells whether a chain of calls and property reads starts at an array literal. */
function startsAtArray(node: ts.Expression): boolean {
	let start = node
	while (ts.isCallExpression(start) || ts.isPropertyAccessExpression(start)) {
		start = start.expression
	}
	return ts.isArrayLiteralExpression(start)
}

/** Tells whether a callee is an array method that only builds a value, on a chain that starts at an array literal. */
function isArrayRead(callee: ts.Expression): callee is ts.PropertyAccessExpression {
	if (!ts.isPropertyAccessExpression(callee)) {
		return false
	}
	if (!ARRAY_READS.has(callee.name.text)) {
		return false
	}
	return startsAtArray(callee.expression)
}

/** Tells whether a node is a call to an array method that runs the function it is handed straight away. */
function isEagerCall(node: ts.Node): node is ts.CallExpression {
	if (!ts.isCallExpression(node)) {
		return false
	}
	const callee = node.expression
	return ts.isPropertyAccessExpression(callee) ? EAGER_CALLBACKS.has(callee.name.text) : false
}

/** Returns the work of a call to a listed name, nothing for a call that only builds a value. */
function listedWork(name: string): string | undefined {
	return PURE_CALLS.has(name) ? undefined : `runs ${name}`
}

/** Returns the work of a function call, a callback handed by name to an eager array call among it. */
function invocationWork(node: ts.CallExpression, file: ts.SourceFile): string | undefined {
	const callee = node.expression.getText(file)
	if (KNOWN_READS.has(callee)) {
		return undefined
	}
	if (!isArrayRead(node.expression)) {
		return listedWork(callee)
	}
	const named = isEagerCall(node) ? node.arguments.find((argument) => !isInlineFunction(argument)) : undefined
	return named === undefined ? undefined : `runs ${named.getText(file)}`
}

/** Returns the call a node runs, nothing for a node that calls nothing or only builds a value. */
function callWork(node: ts.Node, file: ts.SourceFile): string | undefined {
	if (ts.isTaggedTemplateExpression(node)) {
		return `runs ${node.tag.getText(file)}`
	}
	if (ts.isNewExpression(node)) {
		return listedWork(`new ${node.expression.getText(file)}`)
	}
	return ts.isCallExpression(node) ? invocationWork(node, file) : undefined
}

/** Returns the change a node makes, nothing for a node that changes no value. */
function changeWork(node: ts.Node): string | undefined {
	if (ts.isClassStaticBlockDeclaration(node)) {
		return 'runs a class static block'
	}
	if (ts.isBinaryExpression(node)) {
		return ASSIGNMENTS.has(node.operatorToken.kind) ? 'assigns a value' : undefined
	}
	if (ts.isDeleteExpression(node)) {
		return 'changes a value'
	}
	if (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) {
		return STEPS.has(node.operator) ? 'changes a value' : undefined
	}
	return undefined
}

/** Tells whether a node only runs later, as a function body or an instance field. */
function runsLater(node: ts.Node): boolean {
	if (ts.isFunctionLike(node)) {
		return true
	}
	if (!ts.isPropertyDeclaration(node)) {
		return false
	}
	return (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static) === 0
}

/** Returns the nodes the walk visits under a node, an eager callback's parameters and body in place of it. */
function visitedChildren(node: ts.Node, file: ts.SourceFile): readonly ts.Node[] {
	if (!isEagerCall(node)) {
		return node.getChildren(file)
	}
	const parts = node.arguments.flatMap((argument) =>
		isInlineFunction(argument) ? [...argument.parameters, argument.body] : [argument],
	)
	return [node.expression, ...parts]
}

/** Returns the work a node runs when its module loads, the computed name alone for a part that runs later. */
function loadWork(node: ts.Node, file: ts.SourceFile): string[] {
	if (runsLater(node)) {
		const name = (node as { name?: ts.Node }).name
		return name !== undefined && ts.isComputedPropertyName(name) ? loadWork(name.expression, file) : []
	}
	const own = callWork(node, file) ?? changeWork(node)
	const below = visitedChildren(node, file).flatMap((child) => loadWork(child, file))
	return own === undefined ? below : [own, ...below]
}

/** Returns what an import loads for its effect, a stylesheet or a module imported bare. */
function importedEffects(statement: ts.ImportDeclaration): string[] {
	const from = (statement.moduleSpecifier as ts.StringLiteral).text
	if (statement.importClause === undefined) {
		return [`imports ${from} for its effect`]
	}
	return from.endsWith('.css') ? [`imports the stylesheet ${from}`] : []
}

/** Returns the stylesheet a value re-export hands on, nothing for a type re-export or any other module. */
function reExportedEffects(statement: ts.ExportDeclaration): string[] {
	if (statement.isTypeOnly) {
		return []
	}
	const from = (statement.moduleSpecifier as ts.StringLiteral | undefined)?.text ?? ''
	return from.endsWith('.css') ? [`exports the stylesheet ${from}`] : []
}

/** Returns what one top-level statement does when its module loads. */
function statementEffects(statement: ts.Statement, file: ts.SourceFile): string[] {
	if (!QUIET_STATEMENTS.has(statement.kind)) {
		return ['runs code']
	}
	if (ts.isImportDeclaration(statement)) {
		return importedEffects(statement)
	}
	if (ts.isExportDeclaration(statement)) {
		return reExportedEffects(statement)
	}
	return loadWork(statement, file)
}

/** Returns a line for each import, re-export, statement and expression of a module that works when it loads. */
function importEffects(module: ModuleSource): string[] {
	const kind = module.name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
	const file = ts.createSourceFile(module.name, module.text, ts.ScriptTarget.Latest, true, kind)
	return file.statements.flatMap((statement) => {
		const line = file.getLineAndCharacterOfPosition(statement.getStart(file)).line + 1
		return statementEffects(statement, file).map((effect) => `${module.name}:${line} ${effect}`)
	})
}

/** Returns every TypeScript module of the source folder. */
function sourceModules(): ModuleSource[] {
	return readdirSync(source, { recursive: true, encoding: 'utf8' })
		.filter((name) => /\.tsx?$/.test(name))
		.map((name) => ({ name, text: readFileSync(join(source, name), 'utf8') }))
}

test('the import check names every import, re-export and expression that works when the module loads', () => {
	const text = [
		"import './register.js'",
		"import styles from './style.css'",
		"export { default as sheet } from './sheet.css'",
		"export type { Sheet } from './sheet-types.css'",
		"import { title } from './title.js'",
		'document.title = title',
		'export const registered = register()',
		"const ready = (document.title = 'Ready')",
		'export const quiet = createContext(null)',
		'const cache = new WeakMap()',
		'class Store { static ready = boot(); static { start() } count = count() }',
		'export default setup()',
		"export function later() { document.title = 'Later' }",
		'const values = items.map((item) => enrol(item))',
		'class Keys { [named()]() {} [field()] = 1 }',
		"const labels = ['a', 'b'].map((label) => `${label}:`).join(', ')",
		'const listed = [1].map(enlist)',
		'const filled = [undefined].map((item = fill()) => item)',
		'const faked = fake.map()',
	].join('\n')

	expect(importEffects({ name: 'probe.ts', text })).toEqual([
		'probe.ts:1 imports ./register.js for its effect',
		'probe.ts:2 imports the stylesheet ./style.css',
		'probe.ts:3 exports the stylesheet ./sheet.css',
		'probe.ts:6 runs code',
		'probe.ts:7 runs register',
		'probe.ts:8 assigns a value',
		'probe.ts:11 runs boot',
		'probe.ts:11 runs a class static block',
		'probe.ts:11 runs start',
		'probe.ts:12 runs setup',
		'probe.ts:14 runs items.map',
		'probe.ts:14 runs enrol',
		'probe.ts:15 runs named',
		'probe.ts:15 runs field',
		'probe.ts:17 runs enlist',
		'probe.ts:18 runs fill',
		'probe.ts:19 runs fake.map',
	])
})

test('no source module runs code, loads a module for its effect or loads a stylesheet when it is imported', () => {
	const modules = sourceModules()

	expect(modules.length).toBeGreaterThan(40)
	expect(modules.flatMap(importEffects)).toEqual([])
})

test('the package marks only its stylesheets as having side effects, so a bundler drops what an app leaves', () => {
	expect((manifest as { sideEffects?: unknown }).sideEffects).toEqual(['**/*.css'])
})
