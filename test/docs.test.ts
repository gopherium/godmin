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

/** The files the package publishes. */
const published = (
	JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8')) as { files: string[] }
).files

/** Every page, by its path inside the docs folder. */
const pages = new Map(
	readdirSync(root, { recursive: true, encoding: 'utf8' })
		.filter((name) => name.endsWith('.md'))
		.map((name) => [name, pageAt(resolve(root, name))]),
)

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

	expect(code.flatMap((value) => value.match(/\bcapability: '(?![a-z]+(?:_[a-z]+)*')[^']*'/g) ?? [])).toEqual([])
})

test('every local link of the README reaches a page and heading in the docs', () => {
	const links = linksOf(readme).filter(local)

	expect(links.filter((link) => !link.startsWith('docs/') || !reaches('', link.slice('docs/'.length)))).toEqual([])
})
