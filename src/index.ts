// SPDX-License-Identifier: Apache-2.0

export { AdminRoot } from './admin-root.js'
export type { AdminRootProps } from './admin-root.js'
export { DENSE_BREAKPOINT, RAIL_BREAKPOINT, SMALL_VIEWPORT } from './breakpoints.js'
export { Frame } from './frame.js'
export type {
	CanvasMode,
	FrameCanvasProps,
	FrameRailProps,
	FrameRootProps,
} from './frame.js'
export { LoadingRows, LoadingScreen } from './loading.js'
export { NavScreen } from './nav-screen.js'
export type { NavScreenProps } from './nav-screen.js'
export { ErrorNotice, LoadMore, Page, PageTitle } from './page.js'
export type { LoadMoreQuery, PageProps } from './page.js'
export { Toaster, useToaster } from './toaster.js'
export type { ToastAction, ToasterHandle, ToasterProps } from './toaster.js'
export { useLoadingGate } from './use-loading-gate.js'
export { useMediaQuery } from './use-media-query.js'
export { useTokenDocument } from './use-token-document.js'

/**
 * The design system version window this build was tested against.
 */
export const SUPPORTED_WPDS = {
	'@wordpress/ui': '>=0.19.0 <0.20.0',
	'@wordpress/theme': '>=1.1.0 <2.0.0',
} as const
