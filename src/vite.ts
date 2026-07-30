// SPDX-License-Identifier: Apache-2.0

/**
 * The packages that must resolve to a single copy in an application bundle.
 */
export const godminDedupe = [
	'react',
	'react-dom',
	'@wordpress/element',
	'@wordpress/theme',
	'@wordpress/ui',
]

/**
 * Returns the package a resolved module id belongs to.
 * @param id - The resolved module id to inspect.
 * @param packages - The package names to look for.
 * @returns The matching package name, or nothing when the id belongs to none.
 */
function packageOf(id: string, packages: string[]): string | undefined {
	return packages.find((name) => id.includes(`/node_modules/${name}/`))
}

/**
 * Returns each watched package that resolved to more than one file tree.
 * @param moduleIds - The resolved module ids in the bundle.
 * @param packages - The package names that must be singletons.
 * @returns A map of package name to the distinct roots it resolved to.
 */
export function duplicateCopies(moduleIds: Iterable<string>, packages: string[]): Map<string, string[]> {
	const roots = new Map<string, Set<string>>()
	for (const id of moduleIds) {
		const name = packageOf(id, packages)
		if (name === undefined) {
			continue
		}
		const root = id.slice(0, id.indexOf(`/node_modules/${name}/`) + `/node_modules/${name}/`.length)
		const seen = roots.get(name) ?? new Set<string>()
		seen.add(root)
		roots.set(name, seen)
	}
	const duplicates = new Map<string, string[]>()
	for (const [name, seen] of roots) {
		if (seen.size > 1) {
			duplicates.set(name, [...seen])
		}
	}
	return duplicates
}

/**
 * The subset of the bundler context this plugin reads.
 */
interface BuildContext {
	getModuleIds: () => Iterable<string>
}

/**
 * Returns a bundler plugin failing the build when a singleton package is duplicated.
 * @returns The plugin to add to the bundler configuration.
 */
export function godminSingleCopy() {
	return {
		name: 'godmin-single-copy',
		/**
		 * Fails the build when a package that must be a singleton resolved twice.
		 */
		buildEnd(this: BuildContext) {
			const duplicates = duplicateCopies(this.getModuleIds(), godminDedupe)
			if (duplicates.size === 0) {
				return
			}
			const report = [...duplicates]
				.map(([name, roots]) => `${name} resolved to ${roots.length} copies:\n  ${roots.join('\n  ')}`)
				.join('\n')
			throw new Error(`godmin: these packages must resolve to one copy.\n${report}`)
		},
	}
}
