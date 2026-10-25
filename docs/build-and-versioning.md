---
title: Build configuration and versioning
description: The Vite config godmin needs and the design system versions it supports.
---

Most of what godmin needs from your build is this config:

```ts
import { godminDedupe, godminSingleCopy, godminStylesheetFirst } from '@gopherium/godmin/vite'

export default defineConfig({
	resolve: { dedupe: godminDedupe },
	plugins: [godminSingleCopy(), godminStylesheetFirst()],
})
```

This page explains what each part does, then covers stylesheet
linting and versioning.

## One copy of each shared package

Your bundle must contain exactly one copy of React and of each
package `godminDedupe` lists. Two copies of React crash on the first
hook. Two copies of these fail with no error:

- `@wordpress/theme` renders components unthemed.
- `@wordpress/i18n` renders English. [One copy of the
  runtime](https://docs.gopherium.org/translations/health/#one-copy-of-the-runtime) explains why.
- `@wordpress/date` leaves the DataViews date filters in English, on
  the wrong clock. The [list dates](./lists.md#dates-in-a-list)
  set up one copy, and the filters read the other.
- `@gopherium/react-auth` keeps a
  [configured transport](https://docs.gopherium.org/authentication/react-integration/#one-setting-for-the-whole-module)
  that half the app cannot see.

The config handles this twice:

- `godminDedupe` makes Vite resolve each listed package once.
- `godminSingleCopy()` fails the build, naming the package and both
  paths, if a duplicate got through anyway.

## Paint sooner

Nothing renders until your stylesheet arrives, and bundlers request
it after the JavaScript. `godminStylesheetFirst()` moves it first.

How much that helps depends on how much JavaScript competes with it.
In one app with eight preloads it cut the blank page from 1.9s to
1.3s. In another with two preloads it changed nothing, because
nothing was queueing. It costs nothing at runtime, so leave it on
and let it matter as your bundle grows.

On a bundler that is not Vite or Rollup, the underlying functions
`duplicateCopies` and `hoistStylesheet` are exported so you can wire
both checks into whatever hooks it offers.

## Lint your stylesheets

`@wordpress/theme` ships three stylelint rules. This turns them on:

```js
export default { extends: ['@gopherium/godmin/stylelint'] }
```

They catch design tokens that do not exist (a typo renders nothing,
with no error), redefined `--wpds-` properties, and hand-typed
fallback values.

## Design system versions

Each godmin release supports one design system window, written out
in full in its peer ranges as the first version it accepts and the
first one it refuses, such as `>=0.24.0 <0.25.0`. The window moves
forward with the design system and never widens, so no release
accepts two incompatible generations at once.

The window is exported for your tests:

```ts
import { SUPPORTED_WPDS } from '@gopherium/godmin'
```

`SUPPORTED_WPDS` names the `@wordpress/ui` and `@wordpress/theme`
windows only. The other design system peers, `@wordpress/icons`,
`@wordpress/a11y` and `@wordpress/style-runtime`, have their windows
in the peer ranges of godmin's `package.json`.

`@wordpress/i18n` is a required peer, because the main entry
translates godmin's own words. `@wordpress/date` is an optional peer,
needed only by `@gopherium/godmin/dates`. `@wordpress/components` is
an optional peer too, needed only by `@gopherium/godmin/dialogs`, in
the window `>=42.0.0 <43.0.0`. Install each one next to godmin when
you use its entry. Load the components stylesheet once in your
application, `@wordpress/components/build-style/style.css`, as
DataViews already asks. godmin never imports it. Their windows are in
the same peer ranges.

`@wordpress/dataviews` is an optional peer as well, in the window
`>=20.0.0 <21.0.0`. No godmin entry imports it, but `offeredView`
follows the filter rules of that DataViews release. A list built on
another release gets a peer warning when it installs godmin.

## Upgrading from godmin 0.24.0

godmin 0.25.0 gives the sidebar parts the names WordPress gives them.
TypeScript points at each old name, and
[the changelog](https://github.com/gopherium/godmin/blob/main/CHANGELOG.md)
lists every new one. Change your code in these places too:

- Install `@wordpress/i18n` next to godmin, and take
  `@tanstack/react-router` 1.170.44 or a newer 1.x release.
- `NavigationScreen` draws its title as an `h1` and no longer moves
  the focus to it. Pass `headingLevel={2}` to every `Page` beside it,
  as [heading levels](./screens.md#heading-levels) explains.
- The sidebar and the drawer have no padding of their own. A sidebar
  screen pads its rows.
- A stylesheet that reads the sidebar width reads
  `--godmin-nav-sidebar-width`.
- A stylesheet that styles the sidebar slot or a sidebar screen reads
  `.godmin-layout__sidebar` and the `.godmin-navigation-screen`
  classes.
- The phone menu button is named "Open navigation panel" by default.
  A test that finds it by its old name, "Open navigation", finds it by
  the new one.
- `PageTabs` draws its tabs as a `ul` list, one `li` per tab, and its
  `.godmin-page-tabs` class sits on that list. A stylesheet that
  styles the tabs by the `nav` reads the list.
- `useUnsavedText` and `markLatest` came in 0.24.1 and come back in
  0.27.0. 0.25.0 and 0.26.0 do not have them, so an app that uses them
  on 0.24.1 moves straight to 0.27.0 or later.

## Upgrading from godmin 0.22.0

godmin 0.23.0 shows every failed write in a toast, never inside a
dialog or above the list, as WordPress does. Take 0.23.1 or later,
which lets a dialog take a write's promise whether the write
succeeds or fails. Change your code in these places:

- `ConfirmDialog`'s `onConfirm` no longer answers a failure to show.
  To close the dialog at once, make it a plain function that returns
  nothing, and drop the `async` your old handler needed. An `async`
  function always returns a promise. Return the write's promise to
  keep the dialog busy until the write ends. Escape, a click outside
  it and its close button now close it even while it works.
- `ConfirmBody` and `RenameBody` no longer take `failure`, and
  `RenameBody` no longer takes `busy`. Close a rename when the reader
  presses Save, then write. `RenameBody` also sends a name left as it
  was, and stops only a blank one.
- `useListRun` no longer answers `failure`, so drop the notice you
  showed above the list. The function that `run.onStart()` answers
  now takes only whether a row moved.
- `useBulkRun` toasts your `failed` words when a row failed, in place
  of the `done` words.

TypeScript points at each prop and field that went away, at an
`onConfirm` that answers a failure and at a run settled with a
failure. The rest changes only what the reader sees. In each case,
show the failure in a toast, as
[a failure from a dialog](./lists.md#a-failure-from-a-dialog)
shows.

## Upgrading from godmin 0.19.0

`startListDates` and `listDate` left the main entry. Import them from
`@gopherium/godmin/dates`:

```ts
import { listDate, startListDates } from '@gopherium/godmin/dates'
```

Keep `@wordpress/date` and `@wordpress/i18n` installed next to godmin
while you use them.

## Upgrading from godmin 0.7.0

godmin 0.7.0 and older asked you to copy a patch for
`@wordpress/element`. Newer releases support design system versions
that bring `@wordpress/element` 8.7.0 or newer, which needs no patch.

Delete the patch file, its `patchedDependencies` entry and any build
step that copies it. If your `package.json` lists
`@wordpress/element`, move it to 8.7.0 too. A leftover entry makes
`pnpm install` stop with `ERR_PNPM_UNUSED_PATCH`.

## License

godmin is Apache-2.0. The design system packages are
GPL-2.0-or-later and are peer dependencies: your application
installs them, godmin never redistributes them. Your built bundle
combines both and is conveyed under the WordPress packages' terms.
