---
title: Framing an application
description: The Frame component gives your app a sidebar and a content canvas, and folds the sidebar into a drawer on small screens.
---

`Frame` gives your application its layout: a sidebar on the left,
and a content area beside it, called the canvas. WordPress uses the
same two names.

```tsx
<Frame.Root location={pathname}>
	<Frame.Sidebar footer={<AccountPanel />} footerNote="Version 1.4.0">
		<YourMenu />
	</Frame.Sidebar>
	<Frame.Canvas canvas={mode}>
		<YourScreen />
	</Frame.Canvas>
</Frame.Root>
```

A region exists because you render its element. There is no
`showSidebar` flag, so an application without navigation simply does
not render a `Frame.Sidebar`.

Every component's props interface is exported under its own name,
`FrameRootProps`, `FrameSidebarProps` and `FrameCanvasProps`, for when
you wrap one in a component of your own.

## The sidebar

`Frame.Sidebar` holds your menu.
[The sidebar menu](#the-sidebar-menu) below builds one for you.
[The frame](./design-system/layout.md#the-frame) gives the sidebar's
width. Two props fill the bottom of the sidebar:

- `footer` sits under the menu and never moves, such as the account
  panel.
- `footerNote` is one short line of small grey text under the footer,
  such as the version.

On a wide screen the sidebar is one region named "Navigation", as in
the WordPress Site Editor, so a screen reader can jump to it. Pass
`label` to give it another name. On a small screen the drawer is
named "Navigation" whatever `label` says.

## The sidebar menu

With TanStack Router, godmin ships the sidebar menu of the WordPress
Site Editor. `NavigationScreen` comes from `@gopherium/godmin`, and
the other parts come from `@gopherium/godmin/router`. Each part has
the name WordPress's new admin gives it:

| Part | What it is |
| --- | --- |
| `Navigation` | The menu: the root screen, or the sub menu of the page on screen |
| `NavigationScreen` | One screen of the menu, with its title and Back |
| `NavigationList` | The list of rows on a screen |
| `NavigationItem` | A row that goes to a page |
| `DrilldownItem` | A row that opens a sub menu, with a chevron at its end |
| `MenuItem` | A row as data |

Put `Navigation` in the sidebar and give it your rows as data:

```tsx
import { Link, Outlet } from '@tanstack/react-router'
import { Frame } from '@gopherium/godmin'
import { Navigation, useCanvas, useFrameLocation } from '@gopherium/godmin/router'
import type { MenuItem } from '@gopherium/godmin/router'
import { can, useSession } from '@gopherium/react-auth'
import { AccountPanel } from '@gopherium/react-auth/wpds'
import { comment, page, post } from '@wordpress/icons'

const menu: MenuItem[] = [
	{ label: 'Posts', to: '/posts', icon: post },
	{ label: 'Pages', to: '/pages', icon: page },
	{ label: 'Chats', to: '/chats', icon: comment },
]

function Layout() {
	const user = useSession().data
	return (
		<Frame.Root location={useFrameLocation()}>
			<Frame.Sidebar footer={<AccountPanel />}>
				<Navigation
					title="MyApp"
					items={menu}
					home={<Link to="/posts" />}
					can={(capability) => can(user, capability)}
				/>
			</Frame.Sidebar>
			<Frame.Canvas canvas={useCanvas()}>
				<Outlet />
			</Frame.Canvas>
		</Frame.Root>
	)
}
```

- `title` is the title of the root screen, such as your app's name.
- `items` are the rows of the root screen.
- `home` is a link to the page your home address lands on. Back on a
  sub menu goes there.
- `can` tells whether the reader holds a capability. See
  [hiding rows](#hiding-rows-a-reader-cannot-open).

Each row is a link with its icon, a glyph from `@wordpress/icons`,
then its label. A row with no icon keeps a blank in its place when
other rows have one, so the labels line up. The row of the page on
screen is highlighted, and it stays highlighted on every address
under it, so Posts stays highlighted on `/posts/new`.

`Navigation` needs a `Frame.Root` above it, which holds what the
sidebar parts share.

### Sub menus

A route opens a sub menu by naming a screen in `staticData.Sidebar`.
Every page under that route shows the screen in the sidebar:

```tsx
import { createRoute } from '@tanstack/react-router'
import { NavigationScreen } from '@gopherium/godmin'
import { NavigationItem, NavigationList } from '@gopherium/godmin/router'

const chatsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/chats',
	staticData: { Sidebar: ChatsMenu },
})

function ChatsMenu() {
	const chats = useChats()
	return (
		<NavigationScreen title="Chats">
			<NavigationList>
				{chats.map((chat) => (
					<NavigationItem key={chat.id} to="/chats/$chatId" params={{ chatId: chat.id }}>
						{chat.title}
					</NavigationItem>
				))}
			</NavigationList>
		</NavigationScreen>
	)
}
```

Nothing else is needed. The Chats row of `menu` opens that route, so
it draws as a `DrilldownItem`, with a chevron. A click on it slides
the sub menu in and moves the focus to Back. Back goes to `home`,
slides the root screen in and puts the focus back on the Chats row.
In a right-to-left language the chevrons and the slide turn around.
The slide does not play when the system asks for reduced motion.

`NavigationList` draws the rows of `items` first, then the rows you
draw yourself as its children. Draw a row yourself with
`NavigationItem`, or with `DrilldownItem` when it opens a sub menu.
Both take `icon` and the props of a TanStack `Link`, such as `to`,
`params`, `className` and `onClick`. They draw their own list item,
so put them inside a `NavigationList`. The screens page describes
[`NavigationScreen`](./screens.md#navigationscreen).

### Hiding rows a reader cannot open

A route names the capability a reader needs in
`staticData.capability`. A `MenuItem` can name one of its own in
`capability`. A row shows only when `can` allows its own capability
and the capability of every route its address opens. Without `can`,
every row that needs a capability is hidden.

`fallback` is a row to show in its place. It shows when the reader
may open it:

```tsx
const usersRow: MenuItem = {
	label: 'Users',
	to: '/users',
	capability: 'manage_users',
	fallback: { label: 'API tokens', to: '/tokens' },
}
```

Code outside the sidebar can ask the same question with
`useCanAccess`:

```tsx
const canAccess = useCanAccess((capability) => can(user, capability))
const showUsers = canAccess({ to: '/users' })
```

### A count beside a row

`MenuCount` draws the small number WordPress shows beside a menu
label, such as how many updates wait. Pass it as a row's `suffix`:

```tsx
<NavigationList>
	<NavigationItem to="/updates" suffix={<MenuCount count={3} label="3 updates available" />}>
		Updates
	</NavigationItem>
</NavigationList>
```

- It draws nothing when `count` is zero.
- The number follows the reader's number format, so 1234 reads as
  1,234 in English.
- A screen reader reads `label` in place of the number, so pass a
  whole sentence in the reader's language.

A `DrilldownItem` takes a `suffix` too, drawn before its chevron.
When `Navigation` draws your rows from data, give the `MenuItem` a
`count` instead and it draws the `MenuCount` for you:

```ts
const updates: MenuItem = {
	label: 'Updates',
	to: '/updates',
	count: { value: 3, label: '3 updates available' },
}
```

## The canvas on a wide screen

On a wide screen the canvas is a panel with a margin around it, the
way the WordPress Site Editor frames its canvas.
[The canvas](./design-system/layout.md#the-canvas) gives the size of
that margin and when the canvas leaves it out.

## What happens on a small screen

As the screen gets narrower, the frame changes three times, at the
widths [Breakpoints](./design-system/layout.md#breakpoints) lists:

- The sidebar goes away. In its place you get a top bar, like the
  WordPress admin bar on a phone. Its menu button opens the same
  sidebar, menu and footer, in a drawer.
- The canvas stretches to the screen edges, with no margin, no
  rounded corners and no shadow, the way a WordPress admin page meets
  a small screen.
- The canvas also uses tighter padding.

[The frame](./design-system/layout.md#the-frame) gives the sizes of
the top bar and the drawer, and
[the canvas](./design-system/layout.md#the-canvas) gives its padding.

The drawer looks like the phone sidebar of WordPress's new admin and
dims the page under it. It closes when the reader opens another page.
It stays open when a sub menu opens or Back closes one, so the reader
can pick a row in it.

Two `Frame.Sidebar` props exist for the top bar:

- `brand` is a small element such as a home link, shown beside the
  menu button. The top bar only exists on a small screen, so
  `brand` is not rendered at all on a wide one. Do not make it a
  heading. [Heading levels](./screens.md#heading-levels) says
  which part draws each one.
- `menuLabel` is the name of the menu button. It defaults to "Open
  navigation panel", WordPress's words.

The widths are exported, so your own rules can change at the same
points as the frame and as WordPress.
[Breakpoints](./design-system/layout.md#breakpoints) lists each one
and what changes below it. `useMediaQuery` answers any media query
and re-renders your component when the answer changes:

```tsx
const small = useMediaQuery(SMALL_VIEWPORT)
const sheet = useMediaQuery(`(max-width: ${SHEET_BREAKPOINT - 1}px)`)
```

## godmin's own words

The frame and the sidebar draw a few words of their own: "Back",
"Navigation", "Open navigation panel" and "Close navigation panel".
The last one names a close button at the end of the drawer, which
only a screen reader meets. `ListNoResults` draws two more: "No
results found" and the line under it, "Try adjusting your search or
filters to find what you're looking for." godmin translates them in
the WordPress `default` text domain, as the design system does. The
Spanish and French catalogues that `listChromeCatalogFor` returns
hold them, so load it as
[the list chrome](./lists.md#the-list-chrome-in-spanish) shows.

## Coloring the regions

`chromeColor` sets the theme color of the frame, and `canvasColor`
the one of the canvas. Each accepts the same color values as the
design system theme provider. Pass neither and the frame takes
godmin's defaults.
[The three seeds](./design-system/color.md#the-three-seeds) gives
them, and
[which token paints each part](./design-system/color.md#which-token-paints-each-part)
gives the token each region paints with.

The theme provider works out every grey from the background you
give it. With the default chrome color, the sidebar and the top bar
come out `#1d2428`, one step from the WordPress admin bar, `#1d2327`.

With the default canvas color, the canvas comes out white, like a
WordPress page, with the exact WordPress greys, row lines `#f0f0f0`
and muted text `#707070`. A white canvas `background` moves every
grey a step lighter.

Dialogs, drawers, menus, popovers and selects you open inside the
frame do not take these colors. They use the `AdminRoot` color
instead. Tooltips still follow the frame colors. The navigation
drawer is an exception and keeps `chromeColor`.

## Two canvas modes

`Frame.Canvas` takes `canvas`, typed as `CanvasMode`, with two
values:

- `padded`, the default, gives your screen comfortable padding.
- `bleed` removes it, for a screen that manages its own edges, such
  as a full-height table or a two-pane chat view.

## Notices for the whole application

`Frame.Canvas` takes `notices`, for messages that belong to the whole
application rather than to one screen, such as "a new version is
available". They are drawn in a band above your screen:

```tsx
<Frame.Canvas canvas={mode} notices={updateWaits && <UpdateNotice />}>
	<YourScreen />
</Frame.Canvas>
```

- On a `padded` canvas the notices sit 12px apart and line up with
  the page title at every width.
- On a `bleed` canvas they run edge to edge as square strips, the way
  the WordPress editors draw theirs.
- When `notices` renders nothing, there is no band at all.

Draw each notice with the design system's `Notice`. The band only
places them. A screen reader hears a new notice only when you
announce it, as the `Notice` documentation explains.

## Routes and the frame

`Frame.Root` takes `location` as a plain string. When the string
changes, it closes the drawer, unless a sub menu move made the
change. That is enough: click any link, the address changes, the
drawer closes. It works for links a plugin added too, because nothing
has to be registered. This is also why the main entry point imports
no router.

With TanStack Router, `@gopherium/godmin/router` gives you the string
and lets each route declare the canvas it wants:

```tsx
createRoute({ getParentRoute: () => rootRoute, path: 'threads/$id', staticData: { canvas: 'bleed' } })
```

Read the declarations back with two hooks:

```tsx
const mode = useCanvas()            // hand this to Frame.Canvas
const pathname = useFrameLocation() // hand this to Frame.Root
```

When routes nest, the deepest match that declares a canvas wins,
and a route that declares nothing inherits from the routes above
it. So a section can declare `bleed` once and every screen inside
it gets it, and one child can still declare `padded` to opt back
out. Only when no matched route declares anything does `useCanvas`
fall back to `padded`.

`useFrameLocation` answers the path followed by the search, so the
drawer also closes when only the search changes.

`routerDefaults()` returns the options WordPress's new admin gives
the same router. Spread them into `createRouter`:

```tsx
const router = createRouter({ routeTree, ...routerDefaults() })
```

A page then starts to load when the pointer rests on its link or the
keyboard reaches it.
[Moving between pages](./design-system/loading.md#moving-between-pages)
says what the reader sees while it loads.

`@tanstack/react-router` is an optional peer dependency, any 1.x
release from 1.170.44, needed only for this entry point. The main entry point
never imports it, so an application on another router just passes
`location` itself.
