// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dirname, join, normalize } from 'node:path/posix'

import GithubSlugger from 'github-slugger'
import type { Nodes } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toString } from 'mdast-util-to-string'
import { expect, test } from 'vitest'

/** A Markdown file, read once. */
interface Page {
	/** The file text. */
	text: string
	/** Every node of the text, read as the docs site reads Markdown, its frontmatter left out, in document order. */
	nodes: Nodes[]
}

/** The folder of pages the package ships. */
const root = resolve(import.meta.dirname, '../docs')

/** The README npm shows beside the package. */
const readme = pageAt(resolve(import.meta.dirname, '../README.md'))

/** The package manifest, with the files it publishes and the peer ranges it asks for. */
const manifest = JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8')) as {
	files: string[]
	peerDependencies: Record<string, string>
}

/** The files the package publishes. */
const published = manifest.files

/** The changelog, with what each release changed and what is still unreleased. */
const changelog = readFileSync(resolve(import.meta.dirname, '../CHANGELOG.md'), 'utf8')

/** Finds an action label in an example that ends in an ellipsis, such as `label: 'Delete…'`. */
const LABEL_WITH_ELLIPSIS = /\blabel:\s*(['"`])(?:(?!\1).)*?(?:…|\.{3})\1/g

/** Every page, by its path inside the docs folder. */
const pages = new Map(
	readdirSync(root, { recursive: true, encoding: 'utf8' })
		.filter((name) => name.endsWith('.md'))
		.map((name) => [name, pageAt(resolve(root, name))]),
)

/** What the screens page says of a list built on `RowControls` with no arrows, each by its section and its words. */
const ROWS_WITHOUT_ARROWS: [string, string][] = [
	['RepeatRows', '`RowControls` with `movable={false}` draws the trash alone'],
	['RepeatRows', '`RowControlsWithoutMoveProps`'],
	['RepeatRows', '`onRemove`'],
	['RepeatRows', '`godmin-rows__line`'],
	['RepeatRows', '`godmin-rows__inputs`'],
	['RepeatRows', 'the trash keeps no extra gap'],
	['Stylesheet helpers', '| `godmin-rows__line` |'],
	['Stylesheet helpers', '| `godmin-rows__inputs` |'],
]

/**
 * Returns a node followed by every node under it.
 * @param node - The node to walk.
 * @returns The nodes in document order.
 */
function flatten(node: Nodes): Nodes[] {
	const children: Nodes[] = 'children' in node ? node.children : []
	return [node, ...children.flatMap(flatten)]
}

/**
 * Reads a Markdown file as the docs site reads it.
 * @param path - The file path.
 * @returns The page.
 */
function pageAt(path: string): Page {
	const text = readFileSync(path, 'utf8')
	return { text, nodes: flatten(fromMarkdown(text.replace(/^---\n[\s\S]*?\n---\n/, ''))) }
}

/**
 * Returns the anchors the headings of a page get, made as GitHub and the docs site make them.
 * @param page - The page.
 * @returns The anchors.
 */
function anchorsOf(page: Page): Set<string> {
	const slugger = new GithubSlugger()
	const headings = page.nodes.filter((node) => node.type === 'heading')
	return new Set(headings.map((heading) => slugger.slug(toString(heading))))
}

/**
 * Returns the targets of the links and link definitions in a page.
 * @param page - The page.
 * @returns The targets, such as `./lists.md#avatars`.
 */
function linksOf(page: Page): string[] {
	return page.nodes.flatMap((node) => (node.type === 'link' || node.type === 'definition' ? [node.url] : []))
}

/**
 * Returns the code examples of a page.
 * @param page - The page.
 * @returns The text of each code block.
 */
function codeOf(page: Page): string[] {
	return page.nodes.flatMap((node) => (node.type === 'code' ? [node.value] : []))
}

/**
 * Returns the names a line gives in code spans.
 * @param line - The line, such as a changelog entry.
 * @returns The names without their backticks, such as `AdminRoot`.
 */
function namesOf(line: string): string[] {
	return [...line.matchAll(/`([^`]+)`/g)].map(([, name]) => name)
}

/**
 * Returns a section of a Markdown text by its heading, up to the next heading of the second level.
 * @param text - The Markdown text.
 * @param heading - The heading line, such as `## [Unreleased]`.
 * @returns The section with its heading, empty when the text has no such heading.
 */
function sectionOf(text: string, heading: string): string {
	const start = text.indexOf(`\n${heading}\n`)
	if (start === -1) {
		return ''
	}
	const end = text.indexOf('\n## ', start + 1)
	return text.slice(start, end === -1 ? undefined : end)
}

/**
 * Tells whether a link names a page by its address on the docs site, which breaks on GitHub and in the package.
 * @param link - The link target.
 * @returns Whether it is a site address of a page.
 */
function siteAddress(link: string): boolean {
	return link.startsWith('/') || /^https?:\/\/docs\.gopherium\.org\/admin-ui\//.test(link)
}

/**
 * Tells whether a link target is a page or a heading rather than a web address.
 * @param link - The link target.
 * @returns Whether it has no scheme such as `https:`.
 */
function local(link: string): boolean {
	return !/^[a-z]+:/.test(link)
}

/**
 * Tells whether a link from one page reaches a page and, when it names one, a heading.
 * @param from - The path of the page holding the link, inside the docs folder.
 * @param link - The link target.
 * @returns Whether the target exists.
 */
function reaches(from: string, link: string): boolean {
	const [file, anchor] = link.split('#')
	const page = pages.get(file === '' ? from : normalize(join(dirname(from), file)))
	return page !== undefined && (anchor === undefined || anchorsOf(page).has(anchor))
}

test('the package publishes the docs folder', () => {
	expect(published).toContain('docs')
})

test('the docs folder holds the overview page', () => {
	expect([...pages.keys()]).toContain('overview.md')
})

test.each([...pages])('%s opens with a title and a description', (_path, { text }) => {
	const end = text.indexOf('\n---\n', 4)
	const front = text.slice(4, Math.max(end, 0))

	expect(text.startsWith('---\n')).toBe(true)
	expect(end, 'the frontmatter never closes').toBeGreaterThan(0)
	expect(front).toMatch(/^title: \S/m)
	expect(front).toMatch(/^description: \S/m)
})

test.each([...pages])('%s links to no page by a site address', (_path, page) => {
	expect(linksOf(page).filter(siteAddress)).toEqual([])
})

test.each([...pages])('%s holds no HTML link', (_path, page) => {
	const html = page.nodes.filter((node) => node.type === 'html' && /\b(?:href|srcset|src)\s*=/i.test(node.value))

	expect(html).toEqual([])
})

test.each([...pages])('every link of %s between pages reaches its page and heading', (path, page) => {
	const links = linksOf(page).filter(local)

	expect(links.filter((link) => !reaches(path, link))).toEqual([])
})

test.each([...pages, ['README.md', readme] as const])(
	'%s calls a loading placeholder a skeleton, never a ghost',
	(_path, page) => {
		expect(page.text).not.toMatch(/ghost/i)
	},
)

test.each([...pages])('%s spells capabilities in its examples with underscores, as WordPress does', (_path, page) => {
	const code = page.nodes.flatMap((node) => (node.type === 'code' ? [node.value] : []))
	const misspelled = /\bcapability\s*:\s*(['"`])(?![a-z]+(?:_[a-z]+)*\1).*?\1/g

	expect(code.flatMap((value) => value.match(misspelled) ?? [])).toEqual([])
})

test.each([...pages, ['README.md', readme] as const])(
	'%s writes every action label of its examples with no ellipsis at the end, as DataViews asks',
	(_path, page) => {
		const code = page.nodes.flatMap((node) => (node.type === 'code' ? [node.value] : []))

		expect(code.flatMap((value) => value.match(LABEL_WITH_ELLIPSIS) ?? [])).toEqual([])
	},
)

test('the build page gives every design system window as the peer ranges write it', () => {
	const page = (pages.get('build-and-versioning.md')?.text ?? '').replace(/\s+/g, ' ')
	const windows = (page.match(/`>=[^`]+`/g) ?? []).map((found) => found.slice(1, -1))
	const ranges = new Set(Object.values(manifest.peerDependencies))
	const dataviews = manifest.peerDependencies['@wordpress/dataviews']

	expect(windows.length, 'the build page names no window').toBeGreaterThan(0)
	expect(windows.filter((window) => !ranges.has(window))).toEqual([])
	expect(page).toContain(`\`@wordpress/dataviews\` is an optional peer as well, in the window \`${dataviews}\``)
})

test('the upgrade notes open with the last release and name what each Breaking line of Unreleased names', () => {
	const page = pages.get('build-and-versioning.md')?.text ?? ''
	const heading = `## Upgrading from godmin ${/\n## \[(\d+\.\d+\.\d+)\]/.exec(changelog)?.[1]}`
	const section = sectionOf(page, heading).replace(/\s+/g, ' ')
	const breaking = sectionOf(changelog, '## [Unreleased]')
		.split('\n')
		.filter((line) => line.startsWith('- **Breaking.** '))
	const missing = breaking.flatMap((line) =>
		namesOf(line)
			.filter((name) => !section.includes(`\`${name}\``))
			.map((name) => `\`${name}\` of ${line}`),
	)

	expect(breaking.filter((line) => namesOf(line).length === 0), 'a Breaking line names nothing').toEqual([])
	expect(breaking.length === 0 || page.indexOf('\n## Upgrading from ') === page.indexOf(`\n${heading}\n`), heading).toBe(
		true,
	)
	expect(missing).toEqual([])
})

test.each(ROWS_WITHOUT_ARROWS)(
	'the %s section of the screens page says %s for a list whose order means nothing',
	(heading, words) => {
		const section = sectionOf(pages.get('screens.md')?.text ?? '', `## ${heading}`)

		expect(section.replace(/\s+/g, ' ')).toContain(words)
	},
)

test.each([...pages, ['README.md', readme] as const])(
	'%s says the signal stops the request, never the write a server may still finish',
	(_path, page) => {
		expect(page.text.replace(/\s+/g, ' ')).not.toMatch(/\bwrite (?:itself )?stops\b|\btells a write to stop\b/)
	},
)

test.each([...pages, ['README.md', readme] as const])(
	'%s passes writeTimeout to every AdminRoot its examples render',
	(_path, page) => {
		const roots = codeOf(page).flatMap((value) => value.match(/<AdminRoot\b[^>]*>/g) ?? [])

		expect(roots.filter((root) => !/\bwriteTimeout=\{/.test(root))).toEqual([])
	},
)

test.each([...pages, ['README.md', readme] as const])(
	'%s takes the signal in every dialog handler its examples write as an arrow',
	(_path, page) => {
		const handlers = codeOf(page)
			.flatMap((value) => [...value.matchAll(/\bon(?:Confirm|Submit)=\{\(([^)]*)\) =>/g)])
			.filter(([, parameters]) => parameters !== 'event')

		expect(handlers.filter(([, parameters]) => !/\bsignal$/.test(parameters)).map(([handler]) => handler)).toEqual([])
	},
)

test('every local link of the README reaches a page and heading in the docs', () => {
	const links = linksOf(readme).filter(local)

	expect(links.filter((link) => !link.startsWith('docs/') || !reaches('', link.slice('docs/'.length)))).toEqual([])
})
