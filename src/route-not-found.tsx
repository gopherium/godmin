// SPDX-License-Identifier: Apache-2.0

import { __ } from '@wordpress/i18n'
import { Text } from '@wordpress/ui'

import { Page } from './page.js'

/**
 * Renders the screen of an address no route serves, in the words of WordPress's new admin.
 * @returns The page element, titled Route not found.
 */
export function RouteNotFound() {
	return (
		<Page title={__('Route not found')} headingLevel={2}>
			<Text variant="body-md" render={<p />}>
				{__("The page you're looking for does not exist")}
			</Text>
		</Page>
	)
}
