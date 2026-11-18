/**
 * Returns a host as WordPress shows a site address, with no leading www.
 * @param host - The host the admin is served at, with its port when it has one.
 * @returns The host to show.
 */
export function siteAddress(host: string): string {
	return host.replace(/^www\./i, '')
}
