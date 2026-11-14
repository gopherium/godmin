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
const PURE_AT_LOAD = new Set([
	'createContext',
	'createLink',
	'createNavigationState',
	'join',
	'keys',
	'map',
	'memo',
	'new Map',
	'new Set',
	'new WeakMap',
])

/** The calls that run the function they are handed straight away, so its body runs when the module loads. */
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

/** Returns the name a call or a constructor is listed under, such as join or new Map. */
function callName(node: ts.CallExpression | ts.NewExpression, file: ts.SourceFile): string {
	const callee = node.expression
	const name = ts.isPropertyAccessExpression(callee) ? callee.name.text : callee.getText(file)
	return ts.isNewExpression(node) ? `new ${name}` : name
}

/** Returns the call a node runs, nothing for a node that calls nothing or only builds a value. */
function callWork(node: ts.Node, file: ts.SourceFile): string | undefined {
	if (ts.isTaggedTemplateExpression(node)) {
		return `runs ${node.tag.getText(file)}`
	}
	if (!ts.isCallExpression(node) && !ts.isNewExpression(node)) {
		return undefined
	}
	const name = callName(node, file)
	return PURE_AT_LOAD.has(name) ? undefined : `runs ${name}`
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

/** Returns the nodes the walk visits under a node, a callback's body in place of the callback for an eager call. */
function visitedChildren(node: ts.Node, file: ts.SourceFile): readonly ts.Node[] {
	if (!ts.isCallExpression(node) || !EAGER_CALLBACKS.has(callName(node, file))) {
		return node.getChildren(file)
	}
	const bodies = node.arguments.map((argument) =>
		ts.isArrowFunction(argument) || ts.isFunctionExpression(argument) ? argument.body : argument,
	)
	return [node.expression, ...bodies]
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
		'probe.ts:14 runs enrol',
		'probe.ts:15 runs named',
		'probe.ts:15 runs field',
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
