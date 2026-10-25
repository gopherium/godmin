// SPDX-License-Identifier: Apache-2.0

import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { dirname, join, normalize } from 'node:path/posix'

import GithubSlugger from 'github-slugger'
import type { Nodes } from 'mdast'
import { fromMarkdown } from 'mdast-util-from-markdown'
import { toString } from 'mdast-util-to-string'
import { expect, test } from 'vitest'

/** The folder of pages the package ships. */
const root = resolve(import.meta.dirname, '../docs')

/** The README npm shows beside the package. */
const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8')

/** The files the package publishes. */
const published = (
	JSON.parse(readFileSync(resolve(import.meta.dirname, '../package.json'), 'utf8')) as { files: string[] }
).files

/** Every page, by its path inside the docs folder. */
const pages = new Map(
	readdirSync(root, { recursive: true, encoding: 'utf8' })
		.filter((name) => name.endsWith('.md'))
		.map((name) => [name, readFileSync(resolve(root, name), 'utf8')]),
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
 * Returns every node of a page, read as the docs site reads Markdown, its frontmatter left out.
 * @param page - The page text.
 * @returns The nodes in document order.
 */
function nodesOf(page: string): Nodes[] {
	return flatten(fromMarkdown(page.replace(/^---\n[\s\S]*?\n---\n/, '')))
}

/**
 * Returns the anchors the headings of a page get, made as GitHub and the docs site make them.
 * @param page - The page text.
 * @returns The anchors.
 */
function anchorsOf(page: string): Set<string> {
	const slugger = new GithubSlugger()
	const headings = nodesOf(page).filter((node) => node.type === 'heading')
	return new Set(headings.map((heading) => slugger.slug(toString(heading))))
}

/**
 * Returns the targets of the links and link definitions in a page.
 * @param page - The page text.
 * @returns The targets, such as `./lists.md#avatars`.
 */
function linksOf(page: string): string[] {
	return nodesOf(page).flatMap((node) => (node.type === 'link' || node.type === 'definition' ? [node.url] : []))
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

test.each([...pages.keys()])('%s opens with a title and a description', (path) => {
	const page = pages.get(path) ?? ''
	const end = page.indexOf('\n---\n', 4)
	const front = page.slice(4, Math.max(end, 0))

	expect(page.startsWith('---\n')).toBe(true)
	expect(end, 'the frontmatter never closes').toBeGreaterThan(0)
	expect(front).toMatch(/^title: \S/m)
	expect(front).toMatch(/^description: \S/m)
})

test.each([...pages.keys()])('%s links to no page by a site address', (path) => {
	expect(linksOf(pages.get(path) ?? '').filter(siteAddress)).toEqual([])
})

test.each([...pages.keys()])('%s holds no HTML link', (path) => {
	const html = nodesOf(pages.get(path) ?? '').filter((node) => node.type === 'html' && /href=|src=/.test(node.value))

	expect(html).toEqual([])
})

test.each([...pages.keys()])('every link of %s between pages reaches its page and heading', (path) => {
	const links = linksOf(pages.get(path) ?? '').filter(local)

	expect(links.filter((link) => !reaches(path, link))).toEqual([])
})

test('every local link of the README reaches a page and heading in the docs', () => {
	const links = linksOf(readme).filter(local)

	expect(links.filter((link) => !link.startsWith('docs/') || !reaches('', link.slice('docs/'.length)))).toEqual([])
})
