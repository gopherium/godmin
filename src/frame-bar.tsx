import { menu } from '@wordpress/icons'
import { Button, Icon, Tooltip } from '@wordpress/ui'
import { useContext } from 'react'

import { FrameContext, useDrawer } from './frame-state.js'

/**
 * Renders Menu, the minimal neutral button that opens the drawer, named and tooltipped by its label.
 * @param props - The name of the button.
 * @returns The button element inside its tooltip.
 */
export function Menu({ label }: { label: string }) {
	const { layout } = useContext(FrameContext)
	const drawer = useDrawer()
	return (
		<Tooltip.Root>
			<Tooltip.Trigger
				ref={drawer.menu}
				render={
					<Button
						variant="minimal"
						tone="neutral"
						className="godmin-layout__menu"
						aria-label={label}
						aria-expanded={drawer.open}
						aria-controls={drawer.open ? drawer.id : undefined}
						onClick={() => drawer.setOpen(true)}
					/>
				}
			>
				<Icon icon={menu} />
			</Tooltip.Trigger>
			<Tooltip.Popup className="godmin-bar__tip" portal={<Tooltip.Portal container={layout} />}>
				{label}
			</Tooltip.Popup>
		</Tooltip.Root>
	)
}
