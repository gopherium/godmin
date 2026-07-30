// SPDX-License-Identifier: Apache-2.0

export { AdminRoot } from './admin-root'
export type { AdminRootProps } from './admin-root'
export { useTokenDocument } from './use-token-document'

/**
 * The design system version window this build was tested against.
 */
export const SUPPORTED_WPDS = {
	'@wordpress/ui': '>=0.19.0 <0.20.0',
	'@wordpress/theme': '>=1.1.0 <2.0.0',
} as const
