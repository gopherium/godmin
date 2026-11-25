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

`godminDedupe` lists godmin itself too, since two workspace packages
of your app can install it twice, and a `useToaster` in one copy then
finds no `Toaster` from the other.

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

godmin marks only its stylesheets as having side effects, so your
bundler leaves out every part you do not import, such as the dialogs
on a screen that opens none.

On a bundler that is not Vite or Rollup, the underlying functions
`duplicateCopies` and `hoistStylesheet` are exported so you can wire
both checks into whatever hooks it offers.

## Lint your stylesheets

`@wordpress/theme-build-tools` ships three stylelint rules. Add it
to your `devDependencies`, next to `stylelint`. Then this turns the
rules on:

```js
export default { extends: ['@gopherium/godmin/stylelint'] }
```

They catch design tokens that do not exist (a typo renders nothing,
with no error), redefined `--wpds-` properties, and hand-typed
fallback values. The rule on tokens that do not exist reads its list
from the `@wordpress/theme` your app installs.

## Design system versions

Each godmin release supports one design system window, written out
in full in its peer ranges as the first version it accepts and the
first one it rejects, such as `>=0.26.0 <0.27.0`. The window moves
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
needed only by `@gopherium/godmin/dates`. Install it next to godmin
when you use that entry. Its window is in the same peer ranges.
godmin never imports `@wordpress/components`.

`@wordpress/theme-build-tools` is an optional peer too, needed only
by `@gopherium/godmin/stylelint`. Its window is in the same peer
ranges.

`@wordpress/dataviews` is an optional peer as well, in the window
`>=22.0.0 <23.0.0`. No godmin entry imports it, but `offeredView`
follows the filter rules of that DataViews release. A list built on
another release gets a peer warning when it installs godmin.

## Upgrading from godmin 0.33.0

godmin 0.34.0 sets the body cells of a table at the top of their row,
as the classic WordPress list table and the DataViews table do, and
draws a narrow table as a list. Change your code in these places:

- A body cell of a `godmin-table` sits at the top of its row, and a
  header cell stays in the middle. Wrap the first line of each body
  cell in a `div` marked `godmin-table__cell`, such as
  `<td><div className="godmin-table__cell">{field.name}</div></td>`.
  The box is as tall as a compact button and centres its line down
  it, so a row of one line whose buttons are compact looks as it did
  in 0.33.0. Draw a default button of a row with `size="compact"`, or
  the text beside it sits 4px higher. A cell you leave without the
  box sits at the top, its text above a button in the next cell.
  [Lists that stay custom](./lists.md#lists-that-stay-custom) says
  what goes in the box.
- In a `godmin-table-scroll` box narrower than 640px, such as on a
  phone or in a column of a record page, a `godmin-table` no longer
  scrolls sideways with its actions pinned. Each row draws as an item
  of the DataViews list: the first cell and the cell marked
  `godmin-table__actions` on the first line, the other cells under
  them. Keep the name of the record in the first cell, and mark the
  cell of the row's buttons `godmin-table__actions`, or its buttons
  sit with the small text under the first line. The box now measures
  its own width, so set it in a block or a parent that stretches it,
  as [rows that open under a row](./screens.md#rows-that-open-under-a-row)
  says.

## Upgrading from godmin 0.32.0

godmin 0.33.0 gives the write a busy dialog waits on a time limit, and
moves to the WordPress packages of 4 November. Change your code in
these places:

- `AdminRoot` takes a required `writeTimeout`, how long in
  milliseconds a busy dialog waits on its write before it gives up.
  Read it from your app's own settings and pass it where you render
  `AdminRoot`, such as
  `<AdminRoot writeTimeout={settings.writeTimeout}>`. godmin sets no
  limit of its own. Pass `Infinity` for no limit. The value may change
  after the first render, such as `Infinity` while your settings still
  load, and each write takes the value in force when it starts. 0, a
  negative number, `NaN` or more than 2147483647 makes `AdminRoot`
  throw as it renders. Once a write runs past it, the dialog stops
  waiting, shows WordPress's words for a write with no answer and
  frees Cancel, the close icon and Escape, as
  [while a write runs](./design-system/dialogs.md#while-a-write-runs)
  says.
- `onConfirm` and `onSubmit` get an `AbortSignal` as their last
  argument, and the `onSubmit` of `RenameDialog` gets it after the
  name. It fires once the limit runs out. Pass it to the write the
  dialog waits on, such as `fetch(url, { signal })`, so the request
  stops too. The server may still finish a write it already received,
  so make a write safe to send twice. A wrapper around your writes
  that turns a failure into `{ error }` shows its own words even when
  the limit ran out. Have it reject once `signal.aborted` is true, so
  the dialog shows WordPress's words for the time-out. A wrapper that
  rejects gets them already.
- The write that `useDialogRun` hands out takes the dialog's signal as
  its fourth argument, as `write(items, call, words, signal)`. A call
  still running when the signal fires counts as failed. The run does
  not hand the signal to `call`, so pass it on to each write yourself.
- `renderAdmin` from `@gopherium/godmin/testing` takes `writeTimeout`
  too, and sets no limit when you leave it out. A test harness of your
  own that renders `AdminRoot` passes one.
- A test that waits on a write that never ends, such as to read a busy
  dialog, now meets the time-out once the limit runs out. The words
  show, and Escape and Cancel close the dialog again. Leave
  `writeTimeout` out of `renderAdmin`, give your own harness a limit
  longer than the test, or read the busy dialog before the limit runs
  out. A test on fake timers that moves its clock past the limit meets
  the time-out too.
- Move the `@wordpress` packages your app installs to the releases of
  4 November: `@wordpress/dataviews` 22, `@wordpress/icons` 20,
  `@wordpress/style-runtime` 0.15, `@wordpress/theme` 4 and
  `@wordpress/ui` 0.26. Move `@wordpress/a11y` to 5.1 or later,
  `@wordpress/date` to 6.1 or later and `@wordpress/i18n` to 7.1 or
  later too, since DataViews 22 and ui 0.26 ask for them.
  [Design system versions](#design-system-versions) gives each window.
  DataViews 22 asks for an action label with no ellipsis, so write
  "Delete" in place of "Delete…".
- DataViews 22 changes what a test of a list meets. The bulk actions
  sit in `.dataviews-bulk-actions__actions`, and at 782px and below
  they all move into an Actions menu. Sort by is no longer a native
  `select`, and ArrowDown opens its list. The count reads "1 item
  selected", in lowercase. A row checkbox is a `span` with the
  checkbox role, so read its `aria-checked`, not `checked`. An idle
  bulk button carries `aria-disabled="false"`, and the spinner draws
  on a 24 `viewBox`. On screen, the footer drops its select all
  checkbox and reads "N items", or "20 of 45 items" when the list has
  more than one page. A grid gains a Select all row above its cards,
  and the checkbox of a row that takes no bulk action no longer looks
  greyed out. godmin keeps each of these as WordPress draws it.
- `@gopherium/godmin/stylelint` loads its rules from
  `@wordpress/theme-build-tools`, a new optional peer. Add it to your
  `devDependencies`, next to `stylelint`, as
  [lint your stylesheets](#lint-your-stylesheets) shows.
- `@wordpress/theme` 4 no longer exports its Vite plugin. An app that
  imports `vite-ds-token-fallbacks` from `@wordpress/theme` imports it
  from `@wordpress/theme-build-tools/vite-plugins/vite-ds-token-fallbacks`
  now, with `@wordpress/theme-build-tools` in its `devDependencies`.
  The old path stops the build.
- `DrilldownItem` no longer takes `activeProps` or `activeOptions`,
  since a drilldown row is never current. Drop them. A row that points
  at the sub menu already shown is a `NavigationItem`, as
  [sub menus](./framing-an-application.md#sub-menus) says.
- Back draws its chevron in place of anything inside the `back` link
  you pass, so drop any icon or words you put there. Name it with
  `backLabel`, or with an `aria-label` on the link, as
  [`NavigationScreen`](./screens.md#navigationscreen) says.

TypeScript points at each `AdminRoot` without `writeTimeout`, each
`write` of `useDialogRun` with three arguments, and each `activeProps`
or `activeOptions` on a `DrilldownItem`. A handler that takes no
signal still type checks, so find each write a dialog waits on
yourself. The rest changes what the reader sees, what a test meets and
what your app installs.

## Upgrading from godmin 0.31.0

godmin 0.32.0 draws `ConfirmDialog` on the alert dialog of the design
system and `FormDialog` on its dialog, a confirm or a form on a list
becomes a dialog your screen renders, and the dialogs move to the main
entry. Change your code in these places:

- `@gopherium/godmin/dialogs` is gone. Import `ConfirmDialog`,
  `FormDialog`, `DialogAnswer` and their props types from
  `@gopherium/godmin`. godmin no longer has `@wordpress/components` as
  a peer. An app that draws DataViews keeps it, since DataViews needs
  it.
- `ConfirmDialog` takes the question as `title` and what will happen
  as `description`, in place of `children`. `size` is gone, since a
  confirm has one width and is a card at every width. Pass
  `intent="irreversible"` for an action that cannot be undone, which
  draws its button red.
- `RunConfirm`, `ConfirmBody`, `RunConfirmProps` and
  `ConfirmBodyProps` are gone. Give the list action a `callback` that
  stores the rows, drop its `RenderModal`, `hideModalHeader` and
  `modalFocusOnMount`, and render a `ConfirmDialog` from your screen
  whose `onConfirm` returns the run, as
  [running an action over the picked rows](./lists.md#running-an-action-over-the-picked-rows)
  shows.
- `FormBody`, `FormKind`, `RenameBody`, `useCloseWhileOpen`,
  `FormBodyProps` and `RenameBodyProps` are gone. Give the row action a
  `callback` that stores the rows, drop its `RenderModal`,
  `modalHeader`, `modalSize` and `modalFocusOnMount`, and render a
  `FormDialog` or a `RenameDialog` from your screen whose `onSubmit`
  returns the write of `useDialogRun`, as
  [renaming an item](./lists.md#renaming-an-item) shows. Stop closing
  the dialog before its write.
- A rename keeps Save on with a blank field, and the browser refuses
  the send. A test that read Save off reads that a press on it sends
  nothing.
- A confirm is now an `alertdialog`. A test that finds it by the role
  `dialog` finds it by `alertdialog`.
- A confirm has no close button now, even with a `title`. A test that
  pressed its close button presses Cancel instead.
- `onClose` runs once the card has left the page, not at the press.
  A test that reads the dialog gone, or `onClose` called, right after
  a press waits for it, such as with `waitFor`.
- Escape and Cancel close nothing while the write runs, and a click on
  the dimmed page never closes a confirm. A test that dismissed a busy
  confirm, or clicked outside one, lets the write end or presses
  Cancel instead. Give a write that can hang a timeout.
- A promise that rejects, or a handler that throws, leaves the confirm
  open, and the error still goes on to your app. To close it, catch
  the failure inside `onConfirm` and show it in a toast, as
  [a failure from a dialog](./lists.md#a-failure-from-a-dialog) shows.
- A handler that returns, or a promise that ends with, an object
  whose `error` holds words, or whose `close` is `false`, now keeps
  the confirm open. Turn such an answer into one that closes when your
  app wants it to close.
- Any object with a `then` method now counts as a promise, so the
  confirm waits for it. Before, it waited only for a real `Promise`
  and closed at once for anything else.
- A stylesheet that styles `.godmin-modal-body`, its `--copy` and
  `--create` forms, or `.godmin-modal-body__question` styles nothing
  now.
- `FormDialog` has no `kind` and no `size`. It has one width, it is a
  card at every width, and its footer sets the space above its
  buttons.
- `FormDialog` closes itself. Return nothing from `onSubmit` to close
  at once, or the write's promise to close when it ends, and stop
  closing it from your handler. Take it away in `onClose`, which runs
  once the card has left the page.
- A form write that fails shows inside the dialog. Answer `{ error }`
  with words from `onSubmit`, in place of a toast, as
  [a failure from a dialog](./lists.md#a-failure-from-a-dialog) shows.
  A promise that rejects, or a handler that throws, leaves the form
  dialog open, and the error still goes on to your app.
- Cancel, the close icon, Escape and a click on the dimmed page close
  nothing while a form writes. A test that dismissed a busy form
  dialog lets the write end instead.
- The close button of a form dialog is now a close icon named "Close"
  beside the title, and Cancel draws an outline.
- The send button of a form dialog sits in the footer, outside the
  form, and names it. user-event in jsdom finds no send button for
  Enter there, so a test that typed Enter in a field presses the send
  button instead, or runs in a browser.

TypeScript points at `children`, `size`, `kind`, `RunConfirm`,
`ConfirmBody`, `FormBody`, `RenameBody`, `useCloseWhileOpen` and each
import from `@gopherium/godmin/dialogs`. The rest changes what the
reader sees and when `onClose` runs.

## Upgrading from godmin 0.27.0

godmin 0.28.0 draws toasts as WordPress's new admin draws its
snackbars. Change your code in these places:

- `useToaster().name` and the `nameLength` prop of `Toaster` are gone.
  Put the name in the message as it is. A long name wraps.
- `dismissAfter` now times only a toast with no action. Pass
  `actionDismissAfter` to time a toast with an action. It stays 10
  seconds when you pass nothing.
- A toast with an action has no close button. A click anywhere on it
  clears it, so a test that pressed the close button clicks the toast
  instead. A stylesheet that styles `.godmin-toast__dismiss` styles
  nothing now.
- `dismissLabel` is now only the hint of a toast with no action, and
  its default is `Dismiss this notice`, WordPress's words. A test that
  reads the old hint, `Dismiss`, reads the new one.
- A toast now sits in a `.godmin-toasts__item` element inside
  `.godmin-toasts`. A selector such as `.godmin-toasts > .godmin-toast`,
  or code that reads the children of the region as toasts, reaches the
  toast through that element.
- A toast now rises into place as it arrives, as
  [Motion](./design-system/toasts.md#motion) shows. A browser test that
  measures where a toast sits waits for that motion to end, or runs
  with a reduced motion preference.

TypeScript points at each call to `name` and at `nameLength`. The rest
changes only what the reader sees.

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
