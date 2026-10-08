// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

import { expect, test } from 'vitest'

import { LIST_CHROME_DOMAIN, listChromeCatalogFor } from '../src/index'
import spanish from '../src/list-chrome/es-ES'

/** One entry of a PO source. */
interface PoEntry {
	context: string
	msgid: string
	plural?: string
	msgstr: string[]
}

/** One message a build asks gettext for. */
interface Message {
	context: string
	msgid: string
	plural?: string
}

/** The part of the i18n runtime the test drives. */
interface I18n {
	__: (text: string) => string
	_x: (text: string, context: string) => string
	_n: (single: string, plural: string, count: number) => string
}

const require = createRequire(import.meta.url)
const dataviewsManifest = require.resolve('@wordpress/dataviews/package.json')
const besideDataViews = createRequire(dataviewsManifest)
const dataviewsBuild = join(dirname(dataviewsManifest), 'build-module')
const componentsBuild = join(dirname(besideDataViews.resolve('@wordpress/components/package.json')), 'build-module')

const QUOTED = String.raw`"(?:[^"\\]|\\.)*"`
const CALL = new RegExp(String.raw`\b(__|_x|_n)\(\s*(${QUOTED})(?:\s*,\s*(${QUOTED}))?`, 'g')
const FIELD = /^(msgctxt|msgid_plural|msgid|msgstr)(?:\[(\d+)\])? (".*")$/
const MARK = /%(?:\d+\$)?[ds]|<\/?[A-Za-z]+(?: \/)?>/g

/** The WordPress Spanish words of each message the DataViews filters ask for, On read as a date, by lookup key. */
const WORDPRESS_FILTER_WORDS: Record<string, string> = {
	'<Name>%1$s between (inc): </Name><Value>%2$s and %3$s</Value>':
		'<Name>%1$s entre (incl.): </Name><Value>%2$s y %3$s</Value>',
	'<Name>%1$s contains: </Name><Value>%2$s</Value>': '<Name>%1$s contiene: </Name><Value>%2$s</Value>',
	"<Name>%1$s doesn't contain: </Name><Value>%2$s</Value>": '<Name>%1$s no contiene: </Name><Value>%2$s</Value>',
	'<Name>%1$s includes all: </Name><Value>%2$s</Value>': '<Name>%1$s incluye todo: </Name><Value>%2$s</Value>',
	'<Name>%1$s includes: </Name><Value>%2$s</Value>': '<Name>%1$s incluye: </Name><Value>%2$s</Value>',
	'<Name>%1$s is after: </Name><Value>%2$s</Value>': '<Name>%1$s es después de: </Name><Value>%2$s</Value>',
	'<Name>%1$s is before: </Name><Value>%2$s</Value>': '<Name>%1$s es antes de: </Name><Value>%2$s</Value>',
	'<Name>%1$s is greater than or equal to: </Name><Value>%2$s</Value>':
		'<Name>%1$s superior o igual a: </Name><Value>%2$s</Value>',
	'<Name>%1$s is greater than: </Name><Value>%2$s</Value>': '<Name>%1$s mayor que: </Name><Value>%2$s</Value>',
	'<Name>%1$s is in the past: </Name><Value>%2$s</Value>': '<Name>%1$s está en el pasado: </Name><Value>%2$s</Value>',
	'<Name>%1$s is less than or equal to: </Name><Value>%2$s</Value>':
		'<Name>%1$s menor o igual a: </Name><Value>%2$s</Value>',
	'<Name>%1$s is less than: </Name><Value>%2$s</Value>': '<Name>%1$s es menor que: </Name><Value>%2$s</Value>',
	'<Name>%1$s is none of: </Name><Value>%2$s</Value>':
		'<Name>%1$s no es ninguno de los siguientes: </Name><Value>%2$s</Value>',
	'<Name>%1$s is not: </Name><Value>%2$s</Value>': '<Name>%1$s no es: </Name><Value>%2$s</Value>',
	'<Name>%1$s is on or after: </Name><Value>%2$s</Value>': '<Name>%1$s es o es después de: </Name><Value>%2$s</Value>',
	'<Name>%1$s is on or before: </Name><Value>%2$s</Value>': '<Name>%1$s es o es antes de: </Name><Value>%2$s</Value>',
	'<Name>%1$s is over: </Name><Value>%2$s</Value>': '<Name>%1$s ha terminado: </Name><Value>%2$s</Value>',
	'<Name>%1$s is: </Name><Value>%2$s</Value>': '<Name>%1$s es: </Name><Value>%2$s</Value>',
	'<Name>%1$s starts with: </Name><Value>%2$s</Value>': '<Name>%1$s empieza por: </Name><Value>%2$s</Value>',
	'Add filter': 'Añadir filtro',
	After: 'Después',
	'After (inc)': 'Después (incl.)',
	Before: 'Antes',
	'Before (inc)': 'Antes (incl.)',
	'Between (inc)': 'Entre (incl.)',
	Conditions: 'Condiciones',
	Contains: 'Contiene',
	"Doesn't contain": 'No contiene',
	'Filter by: %1$s': 'Filtrar por: %1$s',
	'Greater than': 'Mayor que',
	'Greater than or equal': 'Superior a o igual',
	'In the past': 'En el pasado',
	Includes: 'Incluye',
	'Includes all': 'Incluye todos',
	Is: 'Es',
	'Is none of': 'No es ninguno de',
	'Is not': 'No es',
	'Less than': 'Menor que',
	'Less than or equal': 'Inferior a o igual',
	'List of: %1$s': 'Lista de: %1$s',
	'No elements found': 'No se han encontrado elementos',
	'No results found': 'No se encontraron resultados',
	'Not on': 'No el',
	On: 'El',
	Over: 'Hace más de',
	Remove: 'Eliminar',
	Reset: 'Restablecer',
	Search: 'Buscar',
	'Search items': 'Buscar elementos',
	'Starts with': 'Empieza con',
	'Unknown status for %1$s': 'Estado desconocido para %1$s',
	'verb\u0004Filter': 'Filtrar',
}

const [header, ...messages] = parsePo(readFileSync(resolve('src/list-chrome/es-ES.po'), 'utf8'))

/**
 * Returns the key the i18n runtime looks a message up under.
 * @param message - The message, with its context when it has one.
 * @returns The context and message joined, or the message alone.
 */
function keyOf(message: Message): string {
	return message.context === '' ? message.msgid : `${message.context}\u0004${message.msgid}`
}

/**
 * Returns a line that tells two messages apart, plural included.
 * @param message - The message to sign.
 * @returns The lookup key and the plural, joined.
 */
function signatureOf(message: Message): string {
	return `${keyOf(message)}\u0000${message.plural ?? ''}`
}

/**
 * Returns the entries of a PO source, the header entry first.
 * @param source - The PO text.
 * @returns The entries in source order.
 */
function parsePo(source: string): PoEntry[] {
	return source.trim().split(/\n{2,}/).map(parseEntry)
}

/**
 * Returns the entry one blank line separated PO block holds.
 * @param block - The lines of one entry.
 * @returns The entry.
 */
function parseEntry(block: string): PoEntry {
	const entry: PoEntry = { context: '', msgid: '', msgstr: [] }
	let append = (text: string): void => {
		expect.fail(`a continuation line opens ${block}`, text)
	}
	for (const line of block.split('\n')) {
		append = readLine(entry, line, append)
	}
	return entry
}

/**
 * Applies one PO line to an entry.
 * @param entry - The entry being read.
 * @param line - The line to apply.
 * @param append - Where a continuation line adds its text.
 * @returns Where the next continuation line adds its text.
 */
function readLine(entry: PoEntry, line: string, append: (text: string) => void): (text: string) => void {
	if (line.startsWith('#')) {
		return append
	}
	if (line.startsWith('"')) {
		append(JSON.parse(line) as string)
		return append
	}
	const [, keyword, index, quoted] = FIELD.exec(line) ?? []
	expect(keyword, `an unreadable PO line: ${line}`).toBeDefined()
	const write = writerFor(entry, keyword, Number(index ?? 0))
	write(JSON.parse(quoted) as string)
	return write
}

/**
 * Returns the writer adding text to the part of an entry a keyword names.
 * @param entry - The entry being read.
 * @param keyword - The PO keyword opening the line.
 * @param index - The plural form a msgstr line fills.
 * @returns The writer.
 */
function writerFor(entry: PoEntry, keyword: string, index: number): (text: string) => void {
	switch (keyword) {
		case 'msgctxt':
			return (text) => (entry.context += text)
		case 'msgid':
			return (text) => (entry.msgid += text)
		case 'msgid_plural':
			return (text) => (entry.plural = (entry.plural ?? '') + text)
		default:
			return (text) => (entry.msgstr[index] = (entry.msgstr[index] ?? '') + text)
	}
}

/**
 * Returns the catalogue the i18n runtime reads, compiled from the PO entries.
 * @returns The metadata entry and one entry per message.
 */
function compiled(): Record<string, unknown> {
	const headers = new Map(
		header.msgstr[0]
			.split('\n')
			.filter((line) => line !== '')
			.map((line) => line.split(': ', 2) as [string, string]),
	)
	return Object.fromEntries([
		['', { lang: headers.get('Language'), 'plural-forms': headers.get('Plural-Forms') }],
		...messages.map((entry) => [keyOf(entry), entry.msgstr]),
	])
}

/**
 * Returns the messages the modules of a build ask gettext for.
 * @param root - The build folder.
 * @param within - Whether a module path counts.
 * @returns The messages in module order.
 */
function messagesIn(root: string, within: (path: string) => boolean): Message[] {
	return readdirSync(root, { recursive: true, encoding: 'utf8' })
		.filter((path) => path.endsWith('.mjs') && within(path))
		.flatMap((path) => [...readFileSync(join(root, path), 'utf8').matchAll(CALL)])
		.map(([, call, msgid, second]) => messageOf(call, JSON.parse(msgid) as string, second))
}

/**
 * Returns the message one gettext call asks for.
 * @param call - The gettext function called.
 * @param msgid - The message.
 * @param second - The quoted second argument, if it is a string.
 * @returns The message, with its context or plural.
 */
function messageOf(call: string, msgid: string, second: string | undefined): Message {
	const text = second === undefined ? undefined : (JSON.parse(second) as string)
	if (call === '_x') {
		return { context: text ?? '', msgid }
	}
	return call === '_n' ? { context: '', msgid, plural: text } : { context: '', msgid }
}

/**
 * Reports whether a DataViews module draws list chrome rather than a form.
 * @param path - The module path inside the build.
 * @returns Whether the module belongs to the list chrome.
 */
function drawsListChrome(path: string): boolean {
	return path.startsWith('components/dataviews-') || path.startsWith('utils/') || path === 'constants.mjs'
}

/**
 * Reports whether a components module is one a DataViews list renders a message of.
 * @param path - The module path inside the build.
 * @returns Whether the module is the search box or the modal.
 */
function rendersInList(path: string): boolean {
	return path.startsWith('search-control/') || path.startsWith('modal/')
}

/**
 * Reports whether a DataViews module draws the list filters.
 * @param path - The module path inside the build.
 * @returns Whether the module is the filter operators or a filter component.
 */
function drawsFilters(path: string): boolean {
	return path === 'utils/operators.mjs' || path.startsWith('components/dataviews-filters/')
}

/**
 * Returns the placeholders and tags a message carries, sorted.
 * @param text - The message or one of its translations.
 * @returns The marks.
 */
function marksOf(text: string): string[] {
	return [...text.matchAll(MARK)].map((found) => found[0]).sort()
}

test('names the WordPress default text domain the list chrome reads its strings from', () => {
	expect(LIST_CHROME_DOMAIN).toBe('default')
})

test('loads the Spanish list chrome for es-ES', async () => {
	expect(await listChromeCatalogFor('es-ES')).toEqual(spanish)
})

test('ships no list chrome for a language it has none for', async () => {
	expect(await listChromeCatalogFor('fr-FR')).toBeUndefined()
})

test('names Spanish and its two plural forms in the catalogue header', () => {
	expect(spanish['']).toEqual({ lang: 'es-ES', 'plural-forms': 'nplurals=2; plural=(n != 1);' })
})

test('compiles the catalogue from the PO source beside it', () => {
	expect(spanish).toEqual(compiled())
})

test('ships only messages the DataViews build or the components it renders with ask for', () => {
	const asked = new Set(
		[...messagesIn(dataviewsBuild, () => true), ...messagesIn(componentsBuild, rendersInList)].map(signatureOf),
	)

	for (const entry of messages) {
		expect(asked.has(signatureOf(entry)), `${keyOf(entry)} is asked for nowhere in the build`).toBe(true)
	}
})

test('covers every message the DataViews list chrome asks for', () => {
	const shipped = new Set(messages.map(signatureOf))
	const asked = messagesIn(dataviewsBuild, drawsListChrome)

	expect(asked.length, 'the reader found no message in the build').toBeGreaterThan(90)
	for (const message of asked) {
		expect(shipped.has(signatureOf(message)), `${keyOf(message)} ships no translation`).toBe(true)
	}
})

test('reads every kind of gettext call the DataViews list chrome makes', () => {
	for (const path of readdirSync(dataviewsBuild, { recursive: true, encoding: 'utf8' })) {
		if (path.endsWith('.mjs') && drawsListChrome(path)) {
			expect(readFileSync(join(dataviewsBuild, path), 'utf8'), path).not.toMatch(/\b_nx\(/)
		}
	}
})

test('knows the WordPress Spanish words of every message the DataViews filters ask for', () => {
	const asked = new Set(messagesIn(dataviewsBuild, drawsFilters).map(keyOf))

	expect(asked.size, 'the reader found no filter message in the build').toBeGreaterThan(40)
	expect(new Set(Object.keys(WORDPRESS_FILTER_WORDS))).toEqual(asked)
})

test('words every list filter as the WordPress Spanish catalogue does', () => {
	for (const [key, words] of Object.entries(WORDPRESS_FILTER_WORDS)) {
		expect(spanish[key], key).toEqual([words])
	}
})

test('reads the date operator On as a date beside Not on, never as the switch word Conectado', () => {
	expect(spanish.On).toEqual(['El'])
	expect(spanish['Not on']).toEqual(['No el'])
	expect(spanish.On).not.toContain('Conectado')
})

test('translates every form of every message', () => {
	for (const entry of messages) {
		expect(entry.msgstr, entry.msgid).toHaveLength(entry.plural === undefined ? 1 : 2)
		for (const form of entry.msgstr) {
			expect(form, entry.msgid).not.toBe('')
		}
	}
})

test('keeps every placeholder and tag of a message in each of its translations', () => {
	for (const entry of messages) {
		for (const form of entry.msgstr) {
			expect(marksOf(form), entry.msgid).toEqual(marksOf(entry.msgid))
		}
	}
})

test('answers the list chrome in Spanish through the i18n runtime DataViews reads', () => {
	const { createI18n } = besideDataViews('@wordpress/i18n') as {
		createI18n: (data: object, domain: string) => I18n
	}
	const i18n = createI18n(spanish, LIST_CHROME_DOMAIN)

	expect(i18n.__('Search')).toBe('Buscar')
	expect(i18n._x('View options', 'View is used as a noun')).toBe('Opciones de vista')
	expect(i18n._x('Filter', 'verb')).toBe('Filtrar')
	expect(i18n._n('%d Item', '%d Items', 1)).toBe('%d elemento')
	expect(i18n._n('%d Item', '%d Items', 3)).toBe('%d elementos')
})
