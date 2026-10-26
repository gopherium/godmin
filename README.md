# GodMin

Gopherium's admin kit

GodMin is the base layer for a React admin application built on the WordPress
Design System. It handles the groundwork such an application needs before its
first screen renders: loading the design tokens, ordering the CSS, keeping
overlays on top, and preparing your bundler and your test runner.

The design system already ships the tokens, the primitives, the data screens
and the page chrome. Inside WordPress, the glue underneath them comes from
WordPress itself. An application that is not WordPress gets nothing, and ends
up hand-writing that glue. GodMin is the glue as a package, and nothing more.

**[Documentation](https://docs.gopherium.org/admin-ui/overview/)**

The same pages ship in this package under [`docs/`](docs/overview.md), so
you can read the ones that match the version you install.

## Install

```sh
pnpm add @gopherium/godmin
```

The design system packages are peer dependencies, so your application resolves
and pins them. GodMin never redistributes them.

## Setup

Import the stylesheet once at your entry point, then mount `AdminRoot` around
your tree.

```tsx
import '@gopherium/godmin/base.css'
import { AdminRoot } from '@gopherium/godmin'

createRoot(document.getElementById('app')!).render(
    <AdminRoot>
        <YourApp />
    </AdminRoot>,
)
```

That is the whole host setup. See [the overview](docs/overview.md) for what
those two lines do for you.

## What is in it

| Entry point | Contents |
| --- | --- |
| `@gopherium/godmin` | `AdminRoot`, `Frame`, `Page`, `PageTitle`, `PageTabs`, `PageTab`, `SectionTitle`, `InitialsAvatar`, `NavigationScreen`, `MenuCount`, `ErrorNotice`, `LoadMore`, `LogList`, `LogItem`, `LogTime`, `LoadingScreen`, `LoadingRows`, `Toaster`, `useToaster`, `RepeatRows`, `RowControls`, `useRowKeys`, `keyFromLabel`, `listChromeCatalogFor`, `LIST_CHROME_DOMAIN`, `ListEmpty`, `ConfirmBody`, `RenameBody`, `FormBody`, `FileButton`, `useServerPaging`, `pageWindow`, `paginationOf`, `runEach`, `bulkNotes`, `useListRun`, `useBulkRun`, `RunConfirm`, `useCloseWhileOpen`, `focusInDialog`, `useFocusBack`, `focusedTrigger`, `openOnTap`, `useUnsavedText`, `markLatest`, `viewNarrows`, `offeredView`, `offeredSize`, `sizedView`, `useMediaQuery`, `useTokenDocument`, the breakpoints `HUGE_BREAKPOINT`, `SIDEBAR_BREAKPOINT`, `EDGE_BREAKPOINT`, `DENSE_BREAKPOINT`, `SHEET_BREAKPOINT`, `TITLE_BREAKPOINT` and `SMALL_VIEWPORT`, `SUPPORTED_WPDS` |
| `@gopherium/godmin/base.css` | Cascade layer order, design tokens, host rules, frame and screen styles |
| `@gopherium/godmin/dates` | `startListDates`, `listDate`, the only entry that loads `@wordpress/date` |
| `@gopherium/godmin/dialogs` | `ConfirmDialog`, `FormDialog`, the only entry that loads `@wordpress/components`. Load `@wordpress/components/build-style/style.css` once in your app, as DataViews asks |
| `@gopherium/godmin/router` | `Navigation`, `NavigationList`, `NavigationItem`, `DrilldownItem`, `useCanAccess` and the `MenuItem` type with its optional `count`, `useListView`, `listSearch`, `openOnTap`, `useCanvas`, `useFrameLocation`, `routerDefaults`, the `canvas`, `Sidebar` and `capability` route static data |
| `@gopherium/godmin/testing` | `installTestEnvironment`, `renderAdmin`, `setViewport` and its `TestViewport` type, `getAnnouncement`, `clearAnnouncements`, `assertElementPatched`, `WPDS_IGNORE_SELECTOR`, `textClasses`, `badgeClasses`, `buttonClasses`, `stubLayout` |
| `@gopherium/godmin/vite` | `godminDedupe`, `godminSingleCopy`, `godminStylesheetFirst`, `duplicateCopies`, `hoistStylesheet` |
| `@gopherium/godmin/stylelint` | The design system stylelint rules |

## Translations

GodMin speaks a few words of its own: Back on a sidebar screen, the name of
the sidebar column and its phone drawer, and the phone menu button and the
drawer's close button, which only a screen reader meets. It
translates them in the WordPress `default` text domain, as `@wordpress/ui`
translates its own, so `@wordpress/i18n` is a required peer. Every app
already has it, since
`@wordpress/ui` depends on it.

`listChromeCatalogFor` returns the catalogue GodMin ships for a language,
Spanish and French today. Both hold these words and the list dates, and the
Spanish one also holds the list chrome. Load it into `LIST_CHROME_DOMAIN`, the
`default` domain:

```ts
import { setLocaleData } from '@wordpress/i18n'
import { LIST_CHROME_DOMAIN, listChromeCatalogFor } from '@gopherium/godmin'

const catalogue = await listChromeCatalogFor('es-ES')
if (catalogue !== undefined) {
    setLocaleData(catalogue, LIST_CHROME_DOMAIN)
}
```

## Before your first build

Duplicate packages break the application, and nothing points at the cause.
Two copies of React throw on the first hook. Two copies of `@wordpress/theme`
render unthemed components with no error. Spread `godminDedupe` into
`resolve.dedupe` and add the `godminSingleCopy()` plugin.
[Build configuration](docs/build-and-versioning.md) covers both, and lists the
design system versions each release supports.

## Development

`pnpm run cover` runs the unit tests in jsdom with the coverage gate.
The stories in `stories/` show the components in Storybook, opened
with `pnpm run storybook:dev`. `pnpm run storybook:test` runs every
story in headless Chromium with its accessibility check, and
`pnpm run test:browser` runs the browser tests in `test/browser/`.
Both need Chromium once:
`pnpm exec playwright install --only-shell chromium`.

## Status

Still 0.x, so minor releases may break. See the CHANGELOG for what each release
adds. `@wordpress/admin-ui` remains the thing to watch: GodMin does not wrap
it, because a kit that wraps an API still moving adds a release hop to every
upstream fix.

## License

Apache-2.0, see LICENSE.

The design system packages this kit expects you to install are
GPL-2.0-or-later. GodMin declares them as peer dependencies, so your
application resolves them and GodMin never redistributes them. Your built
bundle combines both, and is conveyed under the terms of the WordPress
packages. GodMin's own source stays reusable under plain Apache-2.0. NOTICE
carries the same statement for anyone reading only the published tarball.
