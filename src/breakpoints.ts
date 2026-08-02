/**
 * The viewport width below which the rail becomes a drawer.
 */
export const RAIL_BREAKPOINT = 1024

/**
 * The viewport width below which the canvas meets the screen edges.
 */
export const DENSE_BREAKPOINT = 640

/**
 * The media query the frame folds its rail at.
 */
export const SMALL_VIEWPORT = `(max-width: ${RAIL_BREAKPOINT - 1}px)`
