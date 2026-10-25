---
title: Overview
description: What godmin is, what it ships, and the two lines of setup that get an admin app running.
---

`@gopherium/godmin` is the base layer for a React admin application
built on the WordPress Design System (WPDS). It takes care of the
groundwork such an application needs before its first screen can
render: loading the design tokens, ordering the CSS, keeping
overlays on top, and preparing your bundler and your test runner.

Why does that layer exist at all? The design system already ships
most of what an admin application is made of:

| Layer | What it is | Package |
| --- | --- | --- |
| Design tokens | Named values for colors, spacing and type | `@wordpress/theme` |
| Primitives | Buttons, menus, dialogs, text | `@wordpress/ui` |
| Data screens | Ready made list and table views | `@wordpress/dataviews` |
| Page chrome | The bars and panels around a page | `@wordpress/admin-ui` |

Inside WordPress, the glue underneath those packages comes from
WordPress itself, through PHP and `@wordpress/boot`. An application
that is not WordPress gets nothing, and ends up hand-writing that
glue. godmin is the glue as a package, and nothing more. It never
duplicates something the packages above already ship.

## The entry points

| Entry point | Contents |
| --- | --- |
| `@gopherium/godmin` | `AdminRoot`, `Frame`, `Page`, `PageTitle`, `PageTabs`, `PageTab`, `SectionTitle`, `InitialsAvatar`, `NavigationScreen`, `MenuCount`, `ErrorNotice`, `LoadMore`, `LogList`, `LogItem`, `LogTime`, `LoadingScreen`, `LoadingRows`, `Toaster`, `useToaster`, `RepeatRows`, `RowControls`, `useRowKeys`, `keyFromLabel`, `listChromeCatalogFor`, `LIST_CHROME_DOMAIN`, `ListEmpty`, `ConfirmBody`, `RenameBody`, `FormBody`, `FileButton`, `useServerPaging`, `pageWindow`, `paginationOf`, `runEach`, `bulkNotes`, `useListRun`, `useBulkRun`, `RunConfirm`, `useCloseWhileOpen`, `focusInDialog`, `useUnsavedText`, `markLatest`, `viewNarrows`, `offeredView`, `offeredSize`, `sizedView`, `useMediaQuery`, `useTokenDocument`, the breakpoints `HUGE_BREAKPOINT`, `SIDEBAR_BREAKPOINT`, `EDGE_BREAKPOINT`, `DENSE_BREAKPOINT`, `SHEET_BREAKPOINT`, `TITLE_BREAKPOINT` and `SMALL_VIEWPORT`, `SUPPORTED_WPDS` |
| `@gopherium/godmin/base.css` | Cascade layer order, design tokens, host rules, frame and screen styles |
| `@gopherium/godmin/dates` | `startListDates`, `listDate`, the only entry that loads `@wordpress/date` |
| `@gopherium/godmin/dialogs` | `ConfirmDialog`, `FormDialog`, the only entry that loads `@wordpress/components`. Load `@wordpress/components/build-style/style.css` once in your app, as DataViews asks |
| `@gopherium/godmin/router` | `Navigation`, `NavigationList`, `NavigationItem`, `DrilldownItem`, `useCanAccess` and the `MenuItem` type with its optional `count`, `useListView`, `listSearch`, `openOnTap`, `useCanvas`, `useFrameLocation`, `routerDefaults`, the `canvas`, `Sidebar` and `capability` route static data |
| `@gopherium/godmin/testing` | `installTestEnvironment`, `renderAdmin`, `setViewport` and its `TestViewport` type, `getAnnouncement`, `clearAnnouncements`, `assertElementPatched`, `WPDS_IGNORE_SELECTOR`, `textClasses`, `badgeClasses`, `buttonClasses`, `stubLayout` |
| `@gopherium/godmin/vite` | `godminDedupe`, `godminSingleCopy`, `godminStylesheetFirst`, `duplicateCopies`, `hoistStylesheet` |
| `@gopherium/godmin/stylelint` | The design system stylelint rules |

All the design system packages are peer dependencies. A peer
dependency is a package your application installs and pins itself.
You stay in control of the exact design system versions you run,
and godmin never redistributes them. From 0.13.0 that includes
`@wordpress/icons`, which draws the arrows and the trash of
`RowControls`. From 0.25.0 it also includes `@wordpress/i18n`, which
translates the few words godmin draws itself, such as Back in the
sidebar.

## Setup

Install:

```sh
pnpm add @gopherium/godmin
```

Then import the stylesheet once at your entry point and mount
`AdminRoot` around your tree:

```tsx
import '@gopherium/godmin/base.css'
import { AdminRoot } from '@gopherium/godmin'

createRoot(document.getElementById('app')!).render(
	<AdminRoot>
		<YourApp />
	</AdminRoot>,
)
```

That is the whole setup. Here is what those two lines do for you:

- Load the design tokens. You do not import
  `@wordpress/theme/design-tokens.css` yourself.
- Declare the CSS cascade layers in the order `wp-ui, godmin`. A
  cascade layer decides which stylesheet wins when two rules
  disagree, and this order lets godmin's rules build on the design
  system's.
- Isolate a stacking context. In plain words: popovers and dialogs
  will draw above your page instead of behind it.
- Enable the overlay slot that lets design system overlays stack
  above `@wordpress/components` ones.
- Give the page the design system's own blue as its accent, the
  color of primary buttons, selected rows and focus rings. Pass
  your own `color` to use another one.

`AdminRoot` also accepts the `color`, `cursor` and `cornerRadius`
theme settings, which it hands to the design system theme provider,
and `as` for when the host element should be something other than a
`div`.

## Changing the page appearance

`base.css` sets the page font, color and background from design
tokens. It does so inside the `godmin` CSS layer, and a rule inside
a layer loses to any plain rule outside one. So to change how the
page looks, write an ordinary rule in your own stylesheet and it
wins. No `!important`, no specificity tricks. Colors are the one
exception. Change them through the seed props that
[Color](./design-system/color.md#the-three-seeds) lists, not with a
rule of your own.

Two notes:

- A few rules sit outside the layer on purpose.
  `body { position: relative }` is one: overlays position themselves
  against it, so overriding it breaks their backdrops. The others set
  DataViews inside a page, such as the list toolbar, the footer and
  the avatar box. The DataViews stylesheet sits in no layer, so a
  rule inside one would lose to it. Leave them in place.
- The documented class names on the [screens
  page](./screens.md#stylesheet-helpers) and the public
  [custom properties](./design-system/custom-properties.md#public-custom-properties)
  are the stable names to style with. The stylesheet's other class
  names, such as those of the frame, and its other custom properties
  are not, and can change in any release.

If you declare CSS layers of your own, include godmin's in your
order:

```css
@layer wp-ui, godmin, my-app;
```

## Styling an iframe or a popup

The design system injects its styles into the current document
only, so an iframe or a popup window starts out unstyled.
`useTokenDocument` registers the extra document and keeps it
supplied with styles, which is what an embedded editor canvas
needs:

```tsx
const [canvas, setCanvas] = useState<Document | null>(null)
useTokenDocument(canvas)

return <iframe src="/canvas" onLoad={(event) => setCanvas(event.currentTarget.contentDocument)} />
```

Keep the document in state, not in a ref. React fills a ref after it
renders and does not render again for it. So a ref read during render
hands the hook nothing. The load handler stores the document once the
iframe has one, and again each time the iframe loads a new page. The
hook accepts `null`, so the state can start empty.

## Where it sits

godmin is a TypeScript brick, unlike its Go siblings
[authkit](https://docs.gopherium.org/authentication/overview/) and
[pluginkit](https://docs.gopherium.org/plugins/overview/). It pairs with
[`@gopherium/react-auth`](https://docs.gopherium.org/authentication/react-integration/),
whose login and user screens are built from the same design system.

Read [framing an application](./framing-an-application.md)
next for the layout and the sidebar menu. And read
[build configuration](./build-and-versioning.md) before your
first build, because a duplicate package is much easier to avoid
than to debug.
