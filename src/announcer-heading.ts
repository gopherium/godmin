// SPDX-License-Identifier: Apache-2.0

import { __, subscribe } from '@wordpress/i18n'
import { useEffect } from 'react'

/** The id `@wordpress/a11y` gives the hidden text it puts before the live regions it adds to the page. */
const HEADING_ID = 'a11y-speak-intro-text'

/**
 * Writes the live region heading in the language loaded now, when the page holds one.
 */
function writeHeading() {
	const heading = document.getElementById(HEADING_ID)
	if (heading !== null) {
		heading.textContent = __('Notifications')
	}
}

/**
 * Keeps the live region heading in the loaded language while the caller is mounted.
 */
export function useAnnouncerHeading() {
	useEffect(() => {
		writeHeading()
		return subscribe(() => {
			writeHeading()
		})
	}, [])
}
