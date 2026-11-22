// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { blockOf, ruleOf } from './css-rules.js'
import { DRAWER_BACKDROP, base, drawerModule } from './styles.js'

test('names the sidebar width once, 240px as the new admin draws its menu, and sizes the sidebar with it', () => {
	expect(ruleOf(':root')).toMatch(/--godmin-nav-sidebar-width:\s*240px/)
	expect(ruleOf('.godmin-layout__sidebar')).toMatch(/(?:^|\s)width:\s*var\(--godmin-nav-sidebar-width\)/)
})

test('names the drawer width apart from the sidebar, 300px as the phone drawer keeps', () => {
	expect(ruleOf(':root')).toMatch(/--godmin-nav-drawer-width:\s*300px/)
})

test('sets the canvas against the sidebar, parted by the 12px the screen wrapper keeps at each side', () => {
	expect(ruleOf('.godmin-layout:has(> .godmin-layout__sidebar) .godmin-layout__canvas')).toMatch(
		/margin-inline-start:\s*0;/,
	)
	expect(ruleOf('.godmin-navigation__screen-wrapper')).toMatch(/(?:^|\s)padding:\s*0 12px;/)
})

test('keeps the canvas off the slide layer by stacking the sidebar over it, as the Site Editor does', () => {
	expect(ruleOf('.godmin-layout__sidebar')).toMatch(/(?:^|\s)z-index:\s*1;/)
	expect(ruleOf('.godmin-navigation__screen-wrapper')).toMatch(/will-change:\s*transform, opacity;/)
})

test('draws the sidebar and the drawer with no padding and no scroll of their own, a flex column each', () => {
	for (const region of ['.godmin-layout__sidebar', '.godmin-layout__drawer']) {
		const rule = ruleOf(region)

		expect(rule, region).toMatch(/(?:^|\s)padding:\s*0;/)
		expect(rule, region).toMatch(/display:\s*flex;/)
		expect(rule, region).toMatch(/flex-direction:\s*column;/)
		expect(rule, region).not.toMatch(/overflow/)
	}
})

test('draws the drawer from the top at the drawer width, as the new admin draws its phone sidebar', () => {
	const drawer = ruleOf('.godmin-layout__drawer')

	expect(drawer).toMatch(/(?:^|\s)width:\s*var\(--godmin-nav-drawer-width\);/)
	expect(drawer).toMatch(/max-width:\s*85vw;/)
	expect(drawer).toMatch(/(?:^|\s)top:\s*0;/)
})

test('draws the drawer square with no border and the shadow of the new admin phone sidebar', () => {
	const drawer = ruleOf('.godmin-layout__drawer')

	expect(drawer).toMatch(/(?:^|\s)border:\s*0;/)
	expect(drawer).toMatch(/(?:^|\s)border-radius:\s*0;/)
	expect(drawer).toMatch(/(?:^|\s)box-shadow:\s*2px 0 8px rgba\(0, 0, 0, 0\.2\);/)
})

test('dims the page under the drawer black at 0.5 with the pointer cursor, as the new admin backdrop does', () => {
	const backdrop = ruleOf(DRAWER_BACKDROP)

	expect(backdrop).toMatch(/background-color:\s*#000;/)
	expect(backdrop).toMatch(/--backdrop-opacity:\s*0\.5;/)
	expect(backdrop).toMatch(/cursor:\s*var\(--wpds-cursor-control\);/)
	expect(backdrop).not.toMatch(/(?:^|\s)opacity:/)
})

test('sets the backdrop opacity @wordpress/ui fades its black backdrop to, so the fade in and out stay', () => {
	const backdrop = /\.[\w-]+__backdrop\{([^}]*)\}/.exec(drawerModule)?.[1]

	expect(backdrop, 'the @wordpress/ui drawer draws no backdrop rule').toBeDefined()
	expect(backdrop).toContain('background-color:#000')
	expect(backdrop).toContain('opacity:calc(var(--backdrop-opacity)*(1 - var(--drawer-swipe-progress)))')
})

test('keeps Menu the 52 by 46 box of the top bar, the slot of the WordPress phone admin bar', () => {
	const menu = ruleOf('.godmin-layout__menu')

	expect(menu).toMatch(/(?:^|\s)inline-size:\s*52px;/)
	expect(menu).toMatch(/(?:^|\s)block-size:\s*46px;/)
})

test('draws the top bar 46px tall, as the WordPress admin bar is on a narrow screen', () => {
	const bar = ruleOf('.godmin-layout__topbar')

	expect(bar).toMatch(/block-size:\s*46px/)
	expect(bar, 'the menu control fills the bar height').not.toMatch(/(?:^|\s)padding:/)
})

test('keeps no gap or end room in the top bar, since Menu stands alone in it with no brand', () => {
	const bar = ruleOf('.godmin-layout__topbar')

	expect(bar).not.toMatch(/(?:^|\s)gap:/)
	expect(bar).not.toMatch(/padding-inline/)
})

test('fits Menu to its slot with no padding, no floor and square corners, so the WPDS button fills it', () => {
	const menu = ruleOf('.godmin-layout__menu')

	expect(menu).toMatch(/(?:^|\s)flex:\s*none;/)
	expect(menu).toMatch(/--wp-ui-button-padding-inline:\s*0px;/)
	expect(menu).toMatch(/--wp-ui-button-padding-block:\s*0px;/)
	expect(menu).toMatch(/--wp-ui-button-min-width:\s*unset;/)
	expect(menu).toMatch(/border-radius:\s*0;/)
})

test('leaves the colours of Menu to the WPDS minimal neutral button, with no state rule of its own', () => {
	expect(ruleOf('.godmin-layout__menu')).not.toMatch(/(?:^|\s)(?:color|background|border|cursor|display):/)
	expect(base).not.toMatch(/\.godmin-layout__menu:/)
})

test('rings Menu inside its slot by the width of the ring, on any focus but a press as WPDS rings it', () => {
	const menu = ruleOf('.godmin-layout__menu')

	expect(menu).toMatch(/outline-offset:\s*calc\(-1 \* var\(--wpds-border-width-focus\)\);/)
	expect(menu).not.toMatch(/(?:^|\s)outline:/)
})

test('maps the tooltips of the frame to the chrome surface and text, which the frame theme resolves', () => {
	const frame = ruleOf('.godmin-layout')
	const tip = ruleOf('.godmin-bar__tip')

	expect(frame).toMatch(/--godmin-bar-tip-background:\s*var\(--wpds-color-background-surface-neutral-strong\);/)
	expect(frame).toMatch(/--godmin-bar-tip-foreground:\s*var\(--wpds-color-foreground-content-neutral\);/)
	expect(tip).toMatch(/background-color:\s*var\(--godmin-bar-tip-background\);/)
	expect(tip).toMatch(/(?:^|\s)color:\s*var\(--godmin-bar-tip-foreground\);/)
	expect(tip).not.toMatch(/--wpds-/)
})

test('paints the drawer with the sidebar column fill, the fill of the sticky title row and screen footer', () => {
	const fill = /(?:^|\s)background:\s*var\(--wpds-color-background-surface-neutral-weak\);/

	expect(ruleOf('.godmin-layout')).toMatch(fill)
	expect(ruleOf('.godmin-layout__drawer')).toMatch(fill)
})

test('lets the sidebar content take the room above the footer and scroll in it, hiding a sideways slide', () => {
	const content = ruleOf('.godmin-sidebar__content')

	expect(content).toMatch(/(?:^|\s)flex:\s*1 1 0;/)
	expect(content).toMatch(/min-height:\s*0;/)
	expect(content).toMatch(/overflow-y:\s*auto;/)
	expect(content).toMatch(/overflow-x:\s*hidden;/)
	expect(content).toMatch(/contain:\s*content;/)
})

test('draws the sidebar footer as the Site Editor draws its save hub, a padded column under a weak line', () => {
	const footer = ruleOf('.godmin-sidebar__footer')

	expect(footer).toMatch(/display:\s*flex;/)
	expect(footer).toMatch(/flex-direction:\s*column;/)
	expect(footer).toMatch(/flex-shrink:\s*0;/)
	expect(footer).toMatch(/(?:^|\s)gap:\s*8px;/)
	expect(footer).toMatch(/(?:^|\s)padding:\s*16px;/)
	expect(footer).toMatch(/border-top:\s*1px solid var\(--wpds-color-stroke-surface-neutral\);/)
})

test('sets the sidebar footer note in small weak text', () => {
	const note = ruleOf('.godmin-sidebar__footer-note')

	expect(note).toMatch(/font-size:\s*var\(--wpds-typography-font-size-sm\);/)
	expect(note).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral-weak\);/)
})

test('sets the footer note on the 16px line WordPress gives 12px text, in the column and the drawer alike', () => {
	expect(ruleOf('.godmin-sidebar__footer-note')).toMatch(/line-height:\s*var\(--wpds-typography-line-height-xs\);/)
})

test('fills the sidebar content with the menu, a flex column', () => {
	const menu = ruleOf('.godmin-navigation')

	expect(menu).toMatch(/display:\s*flex;/)
	expect(menu).toMatch(/flex-direction:\s*column;/)
	expect(menu).toMatch(/(?:^|\s)height:\s*100%;/)
})

test('lays the screen wrapper out as the Site Editor does: a full height column that scrolls', () => {
	const wrapper = ruleOf('.godmin-navigation__screen-wrapper')

	expect(wrapper).toMatch(/display:\s*flex;/)
	expect(wrapper).toMatch(/flex-direction:\s*column;/)
	expect(wrapper).toMatch(/(?:^|\s)height:\s*100%;/)
	expect(wrapper).toMatch(/max-height:\s*100%;/)
	expect(wrapper).toMatch(/overflow-x:\s*auto;/)
})

test('scrolls the menu with the browser scrollbar as boot does: no thin bar, no gutter and no hidden thumb', () => {
	const wrapper = ruleOf('.godmin-navigation__screen-wrapper')

	expect(wrapper).not.toMatch(/scrollbar/)
	expect(base).not.toContain('.godmin-navigation__screen-wrapper::-webkit-scrollbar')
	expect(base).not.toContain('.godmin-navigation__screen-wrapper:is(:hover, :focus, :focus-within)')
	expect(base).not.toContain('.godmin-navigation__screen-wrapper:hover::-webkit-scrollbar-thumb')
})

test('names the slide distance and time once, 50px over 140ms as the Site Editor slides', () => {
	expect(ruleOf(':root')).toMatch(/--godmin-navigation-slide-distance:\s*50px;/)
	expect(ruleOf(':root')).toMatch(/--godmin-navigation-slide-duration:\s*140ms;/)
})

test('times the screen slide as the Site Editor does: ease in and out, once, with no delay or fill', () => {
	const wrapper = ruleOf('.godmin-navigation__screen-wrapper')

	expect(wrapper).toMatch(/animation-duration:\s*var\(--godmin-navigation-slide-duration\);/)
	expect(wrapper).toMatch(/animation-timing-function:\s*ease-in-out;/)
	expect(wrapper).toMatch(/will-change:\s*transform, opacity;/)
	expect(wrapper).not.toMatch(/animation-(?:delay|fill-mode|iteration-count|name):/)
})

test('slides a screen in from the end on a forward move and from the start on a backward one, fading it in', () => {
	const fromEnd = blockOf('@keyframes godmin-slide-from-end')
	const fromStart = blockOf('@keyframes godmin-slide-from-start')

	expect(ruleOf('.godmin-navigation__screen-wrapper--forward')).toMatch(/animation-name:\s*godmin-slide-from-end;/)
	expect(ruleOf('.godmin-navigation__screen-wrapper--backward')).toMatch(/animation-name:\s*godmin-slide-from-start;/)
	expect(ruleOf('0%', fromEnd)).toMatch(/transform:\s*translateX\(var\(--godmin-navigation-slide-distance\)\);/)
	expect(ruleOf('0%', fromStart)).toMatch(
		/transform:\s*translateX\(calc\(-1 \* var\(--godmin-navigation-slide-distance\)\)\);/,
	)
	for (const frames of [fromEnd, fromStart]) {
		expect(ruleOf('0%', frames)).toMatch(/opacity:\s*0;/)
		expect(ruleOf('100%', frames)).toMatch(/transform:\s*none;/)
		expect(ruleOf('100%', frames)).toMatch(/opacity:\s*1;/)
	}
})

test('swaps the two slides in a right to left document, so deeper always comes from the side the text ends on', () => {
	expect(ruleOf('.godmin-navigation__screen-wrapper--forward:dir(rtl)')).toMatch(
		/animation-name:\s*godmin-slide-from-start;/,
	)
	expect(ruleOf('.godmin-navigation__screen-wrapper--backward:dir(rtl)')).toMatch(
		/animation-name:\s*godmin-slide-from-end;/,
	)
})

test('stops the screen slide for a reduced motion preference with the 0s WordPress uses', () => {
	const guard = blockOf('@media (prefers-reduced-motion: reduce)')

	expect(ruleOf('.godmin-navigation__screen-wrapper', guard)).toMatch(/animation-duration:\s*0s;/)
})

test('lets the navigation screen fill the wrapper and its main region push the footer down', () => {
	const block = ruleOf('.godmin-navigation-screen')
	const main = ruleOf('.godmin-navigation-screen__main')

	expect(block).toMatch(/display:\s*flex;/)
	expect(block).toMatch(/flex-direction:\s*column;/)
	expect(block).toMatch(/flex-grow:\s*1;/)
	expect(main).toMatch(/flex-grow:\s*1;/)
	expect(main).toMatch(/margin-bottom:\s*16px;/)
	expect(ruleOf('.godmin-navigation-screen__main--has-footer')).toMatch(/margin-bottom:\s*0;/)
})

test('pins the title row of a sub menu to the top on the sidebar fill, 52px tall as boot draws it', () => {
	const row = ruleOf('.godmin-navigation-screen__title-icon')

	expect(row).toMatch(/position:\s*sticky;/)
	expect(row).toMatch(/(?:^|\s)top:\s*0;/)
	expect(row).toMatch(/z-index:\s*1;/)
	expect(row).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-weak\);/)
	expect(row).toMatch(/(?:^|\s)padding:\s*12px 4px 8px;/)
	expect(row).not.toMatch(/margin/)
	expect(row).toMatch(/display:\s*flex;/)
	expect(row).toMatch(/align-items:\s*center;/)
	expect(row).toMatch(/(?:^|\s)gap:\s*8px;/)
})

test('lays the identity block out as the new admin heads its menu: two lines 4px apart, padded 12px by 16px', () => {
	const block = ruleOf('.godmin-sidebar__identity')

	expect(block).toMatch(/display:\s*flex;/)
	expect(block).toMatch(/(?:^|\s)flex:\s*none;/)
	expect(block).toMatch(/flex-direction:\s*column;/)
	expect(block).toMatch(/(?:^|\s)gap:\s*var\(--wpds-dimension-gap-xs\);/)
	expect(block).toMatch(/(?:^|\s)padding:\s*var\(--wpds-dimension-padding-md\) var\(--wpds-dimension-padding-lg\);/)
})

test('paints the app name bold in the content colour and the host in the weak content colour', () => {
	const name = ruleOf('.godmin-sidebar__name')

	expect(name).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\);/)
	expect(name).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral\);/)
	expect(ruleOf('.godmin-sidebar__address')).toMatch(
		/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral-weak\);/,
	)
})

test('keeps the app name and the host on one line each, cut with an ellipsis', () => {
	const lines = ruleOf('.godmin-sidebar__name,\n\t.godmin-sidebar__address')

	expect(lines).toMatch(/overflow:\s*hidden;/)
	expect(lines).toMatch(/white-space:\s*nowrap;/)
	expect(lines).toMatch(/text-overflow:\s*ellipsis;/)
})

test('keeps no root variant of the title row, since the root screen draws no title row', () => {
	expect(base).not.toContain('title-icon--root')
})

test('starts the root screen rows 20px under the menu head, as padding so a first margin adds to it', () => {
	expect(ruleOf('.godmin-navigation__root')).toMatch(/padding-block-start:\s*20px;/)
	expect(ruleOf('.godmin-navigation__root')).not.toMatch(/margin/)
})

test('sets the title of a sub menu as boot does: 15px on a 32px line at the emphasis weight', () => {
	const title = ruleOf('.godmin-navigation-screen__title')

	expect(title).toMatch(/flex-grow:\s*1;/)
	expect(title).toMatch(/(?:^|\s)margin:\s*0;/)
	expect(title).toMatch(/font-size:\s*var\(--wpds-typography-font-size-lg\);/)
	expect(title).toMatch(/line-height:\s*var\(--wpds-typography-line-height-xl\);/)
	expect(title).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\);/)
	expect(title).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral\);/)
	expect(title).toMatch(/overflow-wrap:\s*break-word;/)
})

test('draws Back as a 24px box in the interactive colour, brighter under the pointer or focus', () => {
	const back = ruleOf('.godmin-navigation-screen__back')

	expect(back).toMatch(/display:\s*inline-flex;/)
	expect(back).toMatch(/flex-shrink:\s*0;/)
	expect(back).toMatch(/align-items:\s*center;/)
	expect(back).toMatch(/justify-content:\s*center;/)
	expect(back).toMatch(/inline-size:\s*24px;/)
	expect(back).toMatch(/block-size:\s*24px;/)
	expect(back).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-neutral\);/)
	expect(ruleOf('.godmin-navigation-screen__back:is(:hover, :focus)')).toMatch(
		/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-neutral-active\);/,
	)
})

test('rings Back with keyboard focus outside it and draws no ring on a mouse focus', () => {
	const focused = ruleOf('.godmin-navigation-screen__back:focus-visible')

	expect(focused).toMatch(/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\);/)
	expect(focused).toMatch(/outline-offset:\s*var\(--wpds-border-width-focus\);/)
	expect(ruleOf('.godmin-navigation-screen__back:focus:not(:focus-visible)')).toMatch(/outline:\s*none;/)
})

test('lines the actions up at the end of the title row, never shrinking', () => {
	const actions = ruleOf('.godmin-navigation-screen__actions')

	expect(actions).toMatch(/display:\s*flex;/)
	expect(actions).toMatch(/flex-shrink:\s*0;/)
})

test('pads the navigation screen content 16px on each side in the content colour', () => {
	const content = ruleOf('.godmin-navigation-screen__content')

	expect(content).toMatch(/(?:^|\s)padding:\s*0 16px;/)
	expect(content).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral\);/)
})

test('sets the description in the content colour with 32px under it', () => {
	const description = ruleOf('.godmin-navigation-screen__description')

	expect(description).toMatch(/(?:^|\s)margin:\s*0 0 32px;/)
	expect(description).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral\);/)
})

test('pins the screen footer to the bottom on the sidebar fill under a weak line', () => {
	const footer = ruleOf('.godmin-navigation-screen__footer')

	expect(footer).toMatch(/position:\s*sticky;/)
	expect(footer).toMatch(/(?:^|\s)bottom:\s*0;/)
	expect(footer).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-weak\);/)
	expect(footer).toMatch(/(?:^|\s)padding:\s*8px 16px;/)
	expect(footer).toMatch(/margin-top:\s*16px;/)
	expect(footer).toMatch(/border-top:\s*1px solid var\(--wpds-color-stroke-surface-neutral\);/)
})

test('styles the navigation screen under the block name WordPress gives the part', () => {
	expect(base, 'no rule is left under the shorter block name').not.toContain('.godmin-nav-screen')
	expect(base, 'the title no longer takes focus').not.toContain('.godmin-navigation-screen__title:focus')
})

test('draws the sidebar list with no bullets, pulled 16px wider on each side as the Site Editor pulls its rows', () => {
	const list = ruleOf('.godmin-navigation-list')

	expect(list).toMatch(/margin-block:\s*0;/)
	expect(list).toMatch(/margin-inline:\s*-16px;/)
	expect(list).toMatch(/(?:^|\s)padding:\s*0;/)
	expect(list).toMatch(/list-style:\s*none;/)
})

test('sets a menu section 16px under the row above, as wide as the rows, its own list not pulled again', () => {
	const section = ruleOf('.godmin-navigation-group')

	expect(section).toMatch(/margin-block-start:\s*16px;/)
	expect(section).toMatch(/margin-inline:\s*-16px;/)
	expect(ruleOf('.godmin-navigation-group > .godmin-navigation-list')).toMatch(/margin-inline:\s*0;/)
})

test('draws a section label as the new admin does: bold, weak content colour, 4px over its rows, text at 16px', () => {
	const label = ruleOf('.godmin-navigation-group__label')

	expect(label).toMatch(/display:\s*block;/)
	expect(label).toMatch(/padding-inline:\s*4px;/)
	expect(label).toMatch(/margin-block-end:\s*4px;/)
	expect(label).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral-weak\);/)
	expect(label).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\);/)
})

test('draws a sidebar row as boot does: 32px tall at least, 4px at each side, no border, 4px over the next row', () => {
	const row = ruleOf('.godmin-navigation-item')

	expect(row).toMatch(/box-sizing:\s*border-box;/)
	expect(row).toMatch(/min-height:\s*32px;/)
	expect(row).toMatch(/(?:^|\s)padding:\s*0 4px;/)
	expect(row).toMatch(/(?:^|\s)border:\s*0;/)
	expect(row).toMatch(/margin-block-end:\s*4px;/)
	expect(row).toMatch(/border-radius:\s*var\(--wpds-border-radius-sm\);/)
})

test('lays a sidebar row out as a centred row with the small gap between its icon, label and end', () => {
	const row = ruleOf('.godmin-navigation-item')

	expect(row).toMatch(/display:\s*flex;/)
	expect(row).toMatch(/align-items:\s*center;/)
	expect(row).toMatch(/(?:^|\s)gap:\s*var\(--wpds-dimension-gap-sm\);/)
})

test('sets a sidebar row in 13px text of the default weight on a 20px line, in the interactive neutral colour', () => {
	const row = ruleOf('.godmin-navigation-item')

	expect(row).toMatch(/font-size:\s*var\(--wpds-typography-font-size-md\);/)
	expect(row).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-default\);/)
	expect(row).toMatch(/line-height:\s*var\(--wpds-typography-line-height-sm\);/)
	expect(row).toMatch(/text-decoration:\s*none;/)
	expect(row).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-neutral\);/)
})

test('keeps the end of a row with a count 4px in like every row, as boot pads its rows', () => {
	expect(base).not.toContain('--with-suffix')
})

test('turns a sidebar row the brand active colour under the pointer or focus, with no fill and no transition', () => {
	const lit = ruleOf('.godmin-navigation-item:is(:hover, :focus)')

	expect(lit).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-brand-active\);/)
	expect(lit).not.toMatch(/background|transition/)
	expect(ruleOf('.godmin-navigation-item')).not.toMatch(/transition/)
})

test('marks the current sidebar row bold in the brand active colour with no fill, as boot does', () => {
	const current = ruleOf(".godmin-navigation-item[aria-current='page']")

	expect(current).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-brand-active\);/)
	expect(current).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\);/)
	expect(current).not.toMatch(/background/)
})

test('rings a sidebar row with keyboard focus 2px outside it, in the 4px gap to the next row', () => {
	const focused = ruleOf('.godmin-navigation-item:focus-visible')

	expect(focused).toMatch(/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\);/)
	expect(focused).toMatch(/outline-offset:\s*var\(--wpds-border-width-focus\);/)
	expect(focused).toMatch(/transform:\s*translateZ\(0\);/)
})

test('draws the row icon and its placeholder 24px square, never shrinking, in the row colour', () => {
	const icon = ruleOf('.godmin-navigation-item__icon')

	expect(icon).toMatch(/flex:\s*none;/)
	expect(icon).toMatch(/inline-size:\s*24px;/)
	expect(icon).toMatch(/block-size:\s*24px;/)
	expect(icon).not.toMatch(/color|opacity|fill|padding/)
})

test('pads the 24px chevron 4px into a 32px box, 8px from the row end, as boot pads its last glyph', () => {
	const chevron = ruleOf('.godmin-navigation-item__drilldown-indicator')

	expect(chevron).toMatch(/flex:\s*none;/)
	expect(chevron).toMatch(/box-sizing:\s*content-box;/)
	expect(chevron).toMatch(/inline-size:\s*24px;/)
	expect(chevron).toMatch(/block-size:\s*24px;/)
	expect(chevron).toMatch(/(?:^|\s)padding:\s*4px;/)
	expect(chevron).not.toMatch(/color|opacity|fill/)
	expect(base).not.toContain('.godmin-navigation-item__icon,\n\t.godmin-navigation-item__drilldown-indicator')
})

test('lets the row label take the free room and shrink, and keeps the suffix at its own width', () => {
	const label = ruleOf('.godmin-navigation-item__label')

	expect(label).toMatch(/(?:^|\s)flex:\s*1;/)
	expect(label).toMatch(/min-width:\s*0;/)
	expect(ruleOf('.godmin-navigation-item__suffix')).toMatch(/flex:\s*none;/)
})
