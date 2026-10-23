import { __, isRTL } from '@wordpress/i18n'
import { Icon, chevronLeft, chevronRight } from '@wordpress/icons'
import { Link } from '@wordpress/ui'
import { useContext } from 'react'
import type { MouseEvent, ReactElement, ReactNode } from 'react'

import { NavigationStateContext, ScreenContext, isPlainClick, recordBack } from './navigation-state.js'

/** The class of the title row, the Site Editor's name for it. */
const TITLE_ROW = 'godmin-navigation-screen__title-icon'

/** The class of the region holding the title row and the content. */
const MAIN = 'godmin-navigation-screen__main'

/** What a screen region renders. */
interface RegionProps {
	/** The content of the region. */
	content: ReactNode
	/** The class naming the region. */
	className: string
	/** The element the region is drawn in, a div when absent. */
	as?: 'div' | 'footer'
}

/**
 * Renders a region in its own element, or nothing when a screen gives none.
 * @param props - The region content, the class naming it and its element.
 * @returns The region element, or null.
 */
function Region({ content, className, as: Tag = 'div' }: RegionProps) {
	if (content === undefined) {
		return null
	}
	return <Tag className={className}>{content}</Tag>
}

/**
 * Renders Back through the app's link, recording a backward move to where that link goes inside a Navigation.
 * @param props - The link Back renders through and its name.
 * @returns The Back link element.
 */
function BackLink({ target, label }: { target: ReactElement<Record<string, unknown>>; label: string }) {
	const state = useContext(NavigationStateContext)
	const { targetOf } = useContext(ScreenContext)
	const onClick = (event: MouseEvent) => {
		if (state !== undefined && isPlainClick(event)) {
			recordBack(state, targetOf?.(target))
		}
	}
	return (
		<Link
			render={target}
			variant="unstyled"
			aria-label={label}
			onClick={onClick}
			className="godmin-navigation-screen__back"
		>
			<Icon icon={isRTL() ? chevronRight : chevronLeft} size={24} />
		</Link>
	)
}

export interface NavigationScreenProps {
	/** The title, an h1. A node, so the root screen can hold the brand. */
	title: ReactNode
	/**
	 * The app's router link Back renders through. Inside a Navigation a sub screen
	 * without one goes home, and the root draws no Back.
	 */
	back?: ReactElement<Record<string, unknown>>
	/** The name of Back, godmin's translated "Back" when absent. */
	backLabel?: string
	description?: ReactNode
	actions?: ReactNode
	/** The sticky footer of this one screen. */
	footer?: ReactNode
	children: ReactNode
}

/**
 * Renders a sidebar screen as the Site Editor draws it: a title row with Back, the title and the actions,
 * then the description and the content, then an optional footer.
 * @param props - The title, Back's link and label, and the regions.
 * @returns The navigation screen element.
 */
export function NavigationScreen({
	title,
	back,
	backLabel = __('Back'),
	description,
	actions,
	footer,
	children,
}: NavigationScreenProps) {
	const { isRoot, home } = useContext(ScreenContext)
	const target = isRoot === true ? undefined : (back ?? home)
	return (
		<div className="godmin-navigation-screen">
			<div className={footer === undefined ? MAIN : `${MAIN} ${MAIN}--has-footer`}>
				<div className={target === undefined ? `${TITLE_ROW} ${TITLE_ROW}--root` : TITLE_ROW}>
					{target === undefined ? null : <BackLink target={target} label={backLabel} />}
					<h1 className="godmin-navigation-screen__title">{title}</h1>
					<Region content={actions} className="godmin-navigation-screen__actions" />
				</div>
				<div className="godmin-navigation-screen__content">
					<Region content={description} className="godmin-navigation-screen__description" />
					{children}
				</div>
			</div>
			<Region content={footer} className="godmin-navigation-screen__footer" as="footer" />
		</div>
	)
}
