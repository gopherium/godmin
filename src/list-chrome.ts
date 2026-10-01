// SPDX-License-Identifier: Apache-2.0

/** A compiled catalogue as the i18n runtime reads it, the metadata entry first. */
export type ListChromeCatalog = Record<string, string[] | Record<string, string>>

/** The text domain the WordPress list chrome reads its strings from. */
export const LIST_CHROME_DOMAIN = 'default'

/** The list chrome catalogue this package ships for each language it has one for. */
const SHIPPED: Record<string, () => Promise<{ default: ListChromeCatalog }>> = {
	'es-ES': () => import('./list-chrome/es-ES.js'),
}

/**
 * Returns the list chrome catalogue this package ships for a language.
 * @param locale - The language the reader settled on.
 * @returns The catalogue, or nothing when the package ships none for it.
 */
export async function listChromeCatalogFor(locale: string): Promise<ListChromeCatalog | undefined> {
	return Object.hasOwn(SHIPPED, locale) ? (await SHIPPED[locale]()).default : undefined
}
