/**
 * The viewport width from which a screen counts as huge, the WordPress huge breakpoint.
 */
export const HUGE_BREAKPOINT = 1440

/**
 * The width below which the sidebar becomes a drawer and the canvas meets the edges, the WordPress medium breakpoint.
 */
export const EDGE_BREAKPOINT = 782

/**
 * The viewport width below which the canvas gutter narrows to 16px.
 */
export const DENSE_BREAKPOINT = 640

/**
 * The viewport width below which toasts widen to the screen, the WordPress small breakpoint.
 */
export const SHEET_BREAKPOINT = 600

/**
 * The viewport width below which an editor header drops its document title, as the WordPress editor does.
 */
export const TITLE_BREAKPOINT = 404

/**
 * The media query every part of the frame folds at.
 */
export const SMALL_VIEWPORT = `(max-width: ${EDGE_BREAKPOINT - 1}px)`
