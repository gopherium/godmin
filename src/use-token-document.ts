// SPDX-License-Identifier: Apache-2.0

import { registerDocument } from '@wordpress/style-runtime'
import { useEffect } from 'react'

/**
 * Keeps the given document supplied with the design system styles.
 * @param target - The document to register, or nothing while it is unavailable.
 */
export function useTokenDocument(target: Document | null | undefined): void {
	useEffect(() => {
		if (!target) {
			return
		}
		return registerDocument(target)
	}, [target])
}
