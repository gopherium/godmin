import { useRouterState } from '@tanstack/react-router'

import type { CanvasMode } from './frame.js'

declare module '@tanstack/react-router' {
	interface StaticDataRouteOption {
		canvas?: CanvasMode
	}
}

/**
 * Returns the canvas the deepest matching route asks for.
 * @returns The canvas mode, padded when no route asks for one.
 */
export function useCanvas(): CanvasMode {
	return useRouterState({
		select: (state) => {
			const asking = [...state.matches].reverse().find((match) => match.staticData.canvas)
			return asking?.staticData.canvas ?? 'padded'
		},
	})
}

/**
 * Returns the current pathname, for a frame to close its drawer on.
 * @returns The pathname of the active location.
 */
export function useFrameLocation(): string {
	return useRouterState({ select: (state) => state.location.pathname })
}
