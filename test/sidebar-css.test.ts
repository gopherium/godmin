// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { blockOf, ruleOf } from './css-rules.js'
import { DRAWER_BACKDROP, base, drawerModule } from './styles.js'

test('names the sidebar width once, as the Site Editor names it, and sizes the sidebar with it', () => {
	expect(ruleOf(':root')).toMatch(/--godmin-nav-sidebar-width:\s*300px/)
	expect(ruleOf('.godmin-layout__sidebar')).toMatch(/(?:^|\s)width:\s*var\(--godmin-nav-sidebar-width\)/)
})

test('sets the canvas against the sidebar, parted by the screen wrapper and its scrollbar gutter', () => {
	expect(ruleOf('.godmin-layout:has(> .godmin-layout__sidebar) .godmin-layout__canvas')).toMatch(
		/margin-inline-start:\s*0;/,
	)
	expect(ruleOf('.godmin-navigation__screen-wrapper')).toMatch(/(?:^|\s)padding:\s*0 12px;/)
	expect(ruleOf('.godmin-navigation__screen-wrapper')).toMatch(/scrollbar-gutter:\s*stable;/)
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

test('draws the drawer from the top as wide as the column, as the new admin draws its phone sidebar', () => {
	const drawer = ruleOf('.godmin-layout__drawer')

	expect(drawer).toMatch(/(?:^|\s)width:\s*var\(--godmin-nav-sidebar-width\);/)
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

test('keeps the menu button the 52 by 46 box of the top bar, its 24px glyph in the middle', () => {
	const menu = ruleOf('.godmin-layout__menu')

	expect(menu).toMatch(/inline-size:\s*52px;/)
	expect(menu).toMatch(/block-size:\s*46px;/)
	expect(menu).toMatch(/align-items:\s*center;/)
	expect(menu).toMatch(/justify-content:\s*center;/)
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

test('takes the whole WordPress scrollbar look: thin, its thumb hidden at rest on the strong surface line', () => {
	const wrapper = ruleOf('.godmin-navigation__screen-wrapper')
	const shown = 'var(--wpds-color-stroke-surface-neutral-strong) transparent'

	expect(wrapper).toMatch(/scrollbar-width:\s*thin;/)
	expect(wrapper).toMatch(/scrollbar-color:\s*transparent transparent;/)
	expect(ruleOf('.godmin-navigation__screen-wrapper:is(:hover, :focus, :focus-within)')).toContain(
		`scrollbar-color: ${shown};`,
	)
	expect(ruleOf('.godmin-navigation__screen-wrapper', blockOf('@media (hover: none)'))).toContain(
		`scrollbar-color: ${shown};`,
	)
})

test('takes the WebKit half of the WordPress scrollbar look: a 12px bar, its thumb rounded inside a 3px border', () => {
	const bar = ruleOf('.godmin-navigation__screen-wrapper::-webkit-scrollbar')
	const thumb = ruleOf('.godmin-navigation__screen-wrapper::-webkit-scrollbar-thumb')
	const shown = ruleOf(
		[
			'.godmin-navigation__screen-wrapper:hover::-webkit-scrollbar-thumb',
			'\t.godmin-navigation__screen-wrapper:focus::-webkit-scrollbar-thumb',
			'\t.godmin-navigation__screen-wrapper:focus-within::-webkit-scrollbar-thumb',
		].join(',\n'),
	)

	expect(bar).toMatch(/(?:^|\s)width:\s*12px;/)
	expect(bar).toMatch(/(?:^|\s)height:\s*12px;/)
	expect(ruleOf('.godmin-navigation__screen-wrapper::-webkit-scrollbar-track')).toMatch(
		/background-color:\s*transparent;/,
	)
	expect(thumb).toMatch(/background-color:\s*transparent;/)
	expect(thumb).toMatch(/border-radius:\s*8px;/)
	expect(thumb).toMatch(/(?:^|\s)border:\s*3px solid transparent;/)
	expect(thumb).toMatch(/background-clip:\s*padding-box;/)
	expect(shown).toMatch(/background-color:\s*var\(--wpds-color-stroke-surface-neutral-strong\);/)
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

test('pins the title row of a navigation screen to the top on the sidebar fill, 72px tall', () => {
	const row = ruleOf('.godmin-navigation-screen__title-icon')

	expect(row).toMatch(/position:\s*sticky;/)
	expect(row).toMatch(/(?:^|\s)top:\s*0;/)
	expect(row).toMatch(/z-index:\s*1;/)
	expect(row).toMatch(/background:\s*var\(--wpds-color-background-surface-neutral-weak\);/)
	expect(row).toMatch(/padding-top:\s*32px;/)
	expect(row).toMatch(/padding-bottom:\s*8px;/)
	expect(row).toMatch(/margin-bottom:\s*8px;/)
	expect(row).toMatch(/display:\s*flex;/)
	expect(row).toMatch(/align-items:\s*flex-start;/)
	expect(row).toMatch(/(?:^|\s)gap:\s*12px;/)
})

test('starts the title of a screen with no Back 44px in, where the title of a sub screen sits', () => {
	expect(ruleOf('.godmin-navigation-screen__title-icon--root')).toMatch(/padding-inline-start:\s*44px;/)
})

test('sets the navigation screen title as the Site Editor does: 20px on a 32px line at the emphasis weight', () => {
	const title = ruleOf('.godmin-navigation-screen__title')

	expect(title).toMatch(/flex-grow:\s*1;/)
	expect(title).toMatch(/(?:^|\s)margin:\s*0;/)
	expect(title).toMatch(/font-size:\s*var\(--wpds-typography-font-size-xl\);/)
	expect(title).toMatch(/line-height:\s*var\(--wpds-typography-line-height-xl\);/)
	expect(title).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\);/)
	expect(title).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-content-neutral\);/)
	expect(title).toMatch(/overflow-wrap:\s*break-word;/)
})

test('draws Back as a 32px box in the interactive colour, brighter under the pointer or focus', () => {
	const back = ruleOf('.godmin-navigation-screen__back')

	expect(back).toMatch(/display:\s*inline-flex;/)
	expect(back).toMatch(/flex-shrink:\s*0;/)
	expect(back).toMatch(/align-items:\s*center;/)
	expect(back).toMatch(/justify-content:\s*center;/)
	expect(back).toMatch(/inline-size:\s*32px;/)
	expect(back).toMatch(/block-size:\s*32px;/)
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

test('draws a sidebar row as the Site Editor renders it: 12px sides on a 36px control line, 40px tall at least', () => {
	const row = ruleOf('.godmin-navigation-item')

	expect(row).toMatch(/box-sizing:\s*border-box;/)
	expect(row).toMatch(/min-height:\s*40px;/)
	expect(row).toMatch(/(?:^|\s)padding:\s*calc\(\(36px - 13px \* 1\.4 - 2px\) \/ 2\) 12px;/)
	expect(row).toMatch(/(?:^|\s)border:\s*1px solid transparent;/)
	expect(row).toMatch(/border-radius:\s*var\(--wpds-border-radius-sm\);/)
})

test('lays a sidebar row out as a centred row with the small gap between its icon, label and end', () => {
	const row = ruleOf('.godmin-navigation-item')

	expect(row).toMatch(/display:\s*flex;/)
	expect(row).toMatch(/align-items:\s*center;/)
	expect(row).toMatch(/(?:^|\s)gap:\s*var\(--wpds-dimension-gap-sm\);/)
})

test('sets a sidebar row in 13px text of the default weight on a normal line, with no underline', () => {
	const row = ruleOf('.godmin-navigation-item')

	expect(row).toMatch(/font-size:\s*var\(--wpds-typography-font-size-md\);/)
	expect(row).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-default\);/)
	expect(row).toMatch(/line-height:\s*normal;/)
	expect(row).toMatch(/text-decoration:\s*none;/)
	expect(row).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-neutral-weak\);/)
})

test('pads the end of a sidebar row with a suffix 16px, as the Site Editor pads a row with a count', () => {
	expect(ruleOf('.godmin-navigation-item--with-suffix')).toMatch(/padding-inline-end:\s*16px;/)
})

test('brightens a sidebar row under the pointer or focus, with no fill and no transition', () => {
	const lit = ruleOf('.godmin-navigation-item:is(:hover, :focus)')

	expect(lit).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-neutral-weak-active\);/)
	expect(lit).not.toMatch(/background|transition/)
	expect(ruleOf('.godmin-navigation-item')).not.toMatch(/transition/)
})

test('fills the current sidebar row, brightens it and sets it at the emphasis weight', () => {
	const current = ruleOf(".godmin-navigation-item[aria-current='page']")

	expect(current).toMatch(/background:\s*var\(--wpds-color-background-interactive-neutral-weak-active\);/)
	expect(current).toMatch(/(?:^|\s)color:\s*var\(--wpds-color-foreground-interactive-neutral-weak-active\);/)
	expect(current).toMatch(/font-weight:\s*var\(--wpds-typography-font-weight-emphasis\);/)
})

test('rings a sidebar row with keyboard focus 2px outside it and paints the ring over the next row', () => {
	const focused = ruleOf('.godmin-navigation-item:focus-visible')

	expect(focused).toMatch(/outline:\s*var\(--wpds-border-width-focus\) solid var\(--wpds-color-stroke-focus\);/)
	expect(focused).toMatch(/outline-offset:\s*var\(--wpds-border-width-focus\);/)
	expect(focused).toMatch(/transform:\s*translateZ\(0\);/)
})

test('draws the row icon, its placeholder and the chevron 24px square, never shrinking, in the row colour', () => {
	const glyphs = ruleOf('.godmin-navigation-item__icon,\n\t.godmin-navigation-item__drilldown-indicator')

	expect(glyphs).toMatch(/flex:\s*none;/)
	expect(glyphs).toMatch(/inline-size:\s*24px;/)
	expect(glyphs).toMatch(/block-size:\s*24px;/)
	expect(glyphs).not.toMatch(/color|opacity|fill/)
})

test('lets the row label take the free room and shrink, and keeps the suffix at its own width', () => {
	const label = ruleOf('.godmin-navigation-item__label')

	expect(label).toMatch(/(?:^|\s)flex:\s*1;/)
	expect(label).toMatch(/min-width:\s*0;/)
	expect(ruleOf('.godmin-navigation-item__suffix')).toMatch(/flex:\s*none;/)
})
