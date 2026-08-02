import { Icon, Link, Stack, Text } from '@wordpress/ui'
import { useEffect, useRef } from 'react'
import type { ReactElement, ReactNode } from 'react'

/**
 * The glyph on the affordance returning to the parent layer.
 */
const chevronLeft = (
	<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="currentColor">
		<path d="M14.6 7l-1.2-1L8 12l5.4 6 1.2-1-4.6-5z" />
	</svg>
)

/**
 * Renders a region in its own element, or nothing when a screen gives none.
 * @param props - The region content and the class naming it.
 * @returns The region element, or null.
 */
function Region({ content, className }: { content: ReactNode; className: string }) {
	if (content === undefined) {
		return null
	}
	return <div className={className}>{content}</div>
}

export interface NavScreenProps {
	title: string
	back?: ReactElement<Record<string, unknown>>
	backLabel?: string
	description?: ReactNode
	actions?: ReactNode
	footer?: ReactNode
	children: ReactNode
}

/**
 * Renders a drill-down navigation screen: a way back to the parent layer, the
 * title, optional description and actions, the content, and an optional footer.
 * @param props - The title, the back affordance and label, and the regions.
 * @returns The navigation screen element.
 */
export function NavScreen({
	title,
	back,
	backLabel = 'Back',
	description,
	actions,
	footer,
	children,
}: NavScreenProps) {
	const titleRef = useRef<HTMLHeadingElement>(null)
	useEffect(() => {
		titleRef.current?.focus()
	}, [])
	return (
		<Stack direction="column" gap="md" className="godmin-nav-screen">
			<Stack direction="row" align="flex-start" gap="sm">
				{back !== undefined && (
					<Link render={back} aria-label={backLabel} className="godmin-nav-screen__back">
						<Icon icon={chevronLeft} size={24} aria-hidden />
					</Link>
				)}
				<Text
					ref={titleRef}
					variant="heading-md"
					render={<h2 tabIndex={-1} />}
					className="godmin-nav-screen__title"
				>
					{title}
				</Text>
				<Region content={actions} className="godmin-nav-screen__actions" />
			</Stack>
			<Stack direction="column" gap="sm">
				<Region content={description} className="godmin-nav-screen__description" />
				{children}
			</Stack>
			<Region content={footer} className="godmin-nav-screen__footer" />
		</Stack>
	)
}
