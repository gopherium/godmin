// SPDX-License-Identifier: Apache-2.0

export { AdminRoot } from './admin-root.js'
export type { AdminRootProps } from './admin-root.js'
export { InitialsAvatar } from './avatar.js'
export type { InitialsAvatarProps } from './avatar.js'
export {
	DENSE_BREAKPOINT,
	EDGE_BREAKPOINT,
	HUGE_BREAKPOINT,
	SHEET_BREAKPOINT,
	SIDEBAR_BREAKPOINT,
	SMALL_VIEWPORT,
	TITLE_BREAKPOINT,
} from './breakpoints.js'
export { useBulkRun } from './bulk-run.js'
export type { BulkRun } from './bulk-run.js'
export { bulkNotes, runEach } from './bulk.js'
export type { BulkFailure, BulkNotes, BulkOutcome, BulkWords } from './bulk.js'
export { useCloseWhileOpen } from './close-while-open.js'
export { ConfirmBody } from './confirm.js'
export type { ConfirmBodyProps } from './confirm.js'
export { FileButton } from './file-button.js'
export type { FileButtonProps } from './file-button.js'
export { focusedTrigger, useFocusBack } from './focus-back.js'
export type { Trigger } from './focus-back.js'
export { FormBody } from './form.js'
export type { FormBodyProps, FormKind } from './form.js'
export { Frame } from './frame.js'
export type {
	CanvasMode,
	FrameCanvasProps,
	FrameRootProps,
	FrameSidebarProps,
} from './frame.js'
export { keyFromLabel } from './keys.js'
export type { KeyOptions, KeyStyle } from './keys.js'
export { LIST_CHROME_DOMAIN, listChromeCatalogFor } from './list-chrome.js'
export type { ListChromeCatalog } from './list-chrome.js'
export { ListEmpty } from './list-empty.js'
export type { ListEmptyProps } from './list-empty.js'
export { focusInDialog, useListRun } from './list-run.js'
export type { ListRun, ListRunState, RunSettled } from './list-run.js'
export { LoadingRows, LoadingScreen } from './loading.js'
export { LogItem, LogList, LogTime } from './log-list.js'
export type { LogItemProps, LogListProps, LogTimeProps } from './log-list.js'
export { MenuCount } from './menu-count.js'
export type { MenuCountProps } from './menu-count.js'
export { NavigationScreen } from './navigation-screen.js'
export type { NavigationScreenProps } from './navigation-screen.js'
export { ErrorNotice, LoadMore, Page, PageTitle, SectionTitle } from './page.js'
export type { LoadMoreQuery, PageProps } from './page.js'
export { PageTab, PageTabs } from './page-tabs.js'
export type { PageTabProps, PageTabsProps } from './page-tabs.js'
export { RenameBody } from './rename.js'
export type { RenameBodyProps } from './rename.js'
export { useRowKeys } from './row-keys.js'
export type { RowBounds, RowKeys } from './row-keys.js'
export { RepeatRows, RowControls } from './rows.js'
export type { RepeatRowsProps, RowControlsProps, RowLabels } from './rows.js'
export { RunConfirm } from './run-confirm.js'
export type { RunConfirmProps } from './run-confirm.js'
export { offeredSize, pageWindow, paginationOf, sizedView, useServerPaging } from './server-page.js'
export type { PagedView, PageWindow, PaginationInfo, ServedPage, ServedSize, ServerPaging } from './server-page.js'
export { Toaster, useToaster } from './toaster.js'
export type { ToastAction, ToasterHandle, ToasterProps } from './toaster.js'
export { markLatest, useUnsavedText } from './unsaved-text.js'
export type { UnsavedText } from './unsaved-text.js'
export { useMediaQuery } from './use-media-query.js'
export { useTokenDocument } from './use-token-document.js'
export { offeredView, viewNarrows } from './view-guard.js'
export type { GuardedField, OfferedView, ViewGuard } from './view-guard.js'

/**
 * The design system version window this build was tested against.
 */
export const SUPPORTED_WPDS = {
	'@wordpress/ui': '>=0.24.0 <0.25.0',
	'@wordpress/theme': '>=2.3.0 <3.0.0',
} as const
