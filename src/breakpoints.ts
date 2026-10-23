/**
 * The viewport width from which a screen counts as huge, the WordPress huge breakpoint.
 */
export const HUGE_BREAKPOINT = 1440

/**
 * The viewport width below which the sidebar becomes a drawer.
 */
export const SIDEBAR_BREAKPOINT = 1024

/**
 * The viewport width below which the canvas meets the screen edges, the WordPress medium breakpoint.
 */
export const EDGE_BREAKPOINT = 782

/**
 * The viewport width below which the canvas gutter narrows to 16px.
 */
export const DENSE_BREAKPOINT = 640

/**
 * The viewport width below which modals rise as sheets and toasts widen to the screen, the WordPress small breakpoint.
 */
export const SHEET_BREAKPOINT = 600

/**
 * The viewport width below which an editor header drops its document title, as the WordPress editor does.
 */
export const TITLE_BREAKPOINT = 404

/**
 * The media query the frame folds its sidebar at.
 */
export const SMALL_VIEWPORT = `(max-width: ${SIDEBAR_BREAKPOINT - 1}px)`
