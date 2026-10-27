# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/). While at 0.x,
minor releases may break. Releases are tagged `vX.Y.Z` and publish from CI.

## [Unreleased]

### Added

- The README says how to run the unit tests, the stories in Storybook and the browser tests.
- `docs/design-system/loading.md` gives what a list, a screen and a preview show while they load, how long each waits and what a screen reader hears.
- `docs/lists.md` says which loading state to pass to DataViews as `isLoading`, what a route loader should wait for, and why DataViews keeps one key.

### Changed

- **Breaking.** `LoadingScreen` draws the design system `Spinner` in place of grey bars, as WordPress shows a screen that loads, and still announces its `label`. The classes `godmin-loading-screen__ghost`, `godmin-loading-screen__title` and `godmin-loading-screen__stroke` are gone.
- **Breaking.** Inside a `Page`, a sidebar screen or a dialog, `LoadingScreen` shows at once with no wait and no fade, as a WordPress screen shows the spinner under its title. Inside a `Page` it sits at the top of the content under the title.
- **Breaking.** Anywhere else, `LoadingScreen` stays hidden for 200ms, then fades in over 500ms, as the WordPress Site Editor shows its canvas loader, and shows at once after the wait for a reader who asks for less motion. It fills the space it gets and centres the spinner, and outside the frame it is at least as tall as the window.

### Removed

- **Breaking.** `LoadingRows` and its classes `godmin-loading-rows`, `godmin-loading-rows__ghost` and `godmin-loading-rows__row`. Pass the loading state of a DataViews list to `isLoading`, and show `LoadingScreen` in place of any other list while it loads.
- **Breaking.** The `godmin-arrival` class.

### Fixed

- `docs/design-system/toasts.md` says that in Chrome the browser's own dark ring mostly covers the focus ring of a toast with no action.

## [0.28.0] - 2026-10-25

### Added

- `Toaster` takes `actionDismissAfter`, how long a toast with an action stays, 10000 milliseconds by default, as the next `@wordpress/components` release keeps a snackbar with an action 10 seconds.
- `docs/design-system/toasts.md` gives where a toast sits, how it looks, how long it stays, how a reader clears it and what a keyboard or a screen reader meets.

### Changed

- Toasts centre on the whole window, the sidebar included, as WordPress's new admin centres its snackbars.
- The toast region sits `--wpds-dimension-size-md` above the bottom edge, still 32px, as WordPress writes it.
- The toast action shows the design system focus ring in white in place of a dotted line, as the WordPress snackbar action does.
- Toasts move as the WordPress snackbar does. Each toast's space grows as it arrives and closes after it fades out, so the toasts above slide instead of jumping, and under a reduced motion preference a toast shows and goes at once.
- A toast keeps 4px corners and its action ring 2px corners at every `cornerRadius` preset, as WordPress fixes them on its snackbar.
- **Breaking.** `dismissLabel` defaults to "Dismiss this notice", WordPress's words, in place of "Dismiss", and is only the hint a screen reader hears on a toast with no action.
- **Breaking.** `dismissAfter` times only a toast with no action. A toast with an action stays `actionDismissAfter`.
- **Breaking.** A click anywhere on a toast clears it, with or without an action, and a toast with an action has no close button, so the `.godmin-toast__dismiss` class is gone. Only its action takes keyboard focus.
- **Breaking.** A toast now sits in `.godmin-toasts__item`, not directly in `.godmin-toasts`, so a selector such as `.godmin-toasts > .godmin-toast` no longer matches it.

### Removed

- **Breaking.** `useToaster().name` and the `nameLength` prop of `Toaster`. A toast shows a whole name and wraps it, as WordPress does, so put the name in the message as it is.
- The README browser note, since godmin no longer needs `Intl.Segmenter`.

## [0.27.0] - 2026-10-25

### Added

- `useUnsavedText` keeps what failed row writes left unsaved, by item id, for as long as the screen stays, and `markLatest` lets only the latest write to an item keep its text, so a row form opens again on what the reader typed.
- The docs ship in the package under `docs/`, the pages docs.gopherium.org shows, so an app reads the ones for the version it installs.
- Design System pages under `docs/design-system/` write down the color, layout, radius and elevation, typography, motion and accessibility rules of a godmin admin, checked against the code by tests.
- `--godmin-navigation-slide-distance` and `--godmin-navigation-slide-duration` are public custom properties, so an app may change the sidebar slide.
- `useCloseWhileOpen` returns a dialog's close that acts only while that dialog is on screen, so a row dialog an app writes never shuts a dialog opened on the row since.
- `focusInDialog` reports whether a dialog or an alert dialog holds the focus, for a write an app finishes outside a list run.
- `useFocusBack` puts a lost focus back on the title, media, phone row or actions menu a list dialog opened from, else on the list, in every layout, found through a `data-item-id` mark on the title cell. `focusedTrigger` reads which one, or the bulk bar, opened the dialog.
- `openOnTap` is in the main entry too, so a list drawn without TanStack Router opens the record a phone tap lands on. The router entry still hands it out.
- The list view types, such as `ListView` and `ListDefaults`, are in the main entry too, so a package without TanStack Router can type the list an app hands it.

### Fixed

- `RunConfirm` closes only itself once its run ends, never a dialog opened on the row after the confirm was dismissed while busy.
- `useListRun` focuses the list after a run moved an item only while the focus sits on the page, in the list, in the dialog the run started in, or, once that dialog closed, still where the focus first went outside it while it was open, so a dialog opened during a run and a control the reader moved to after that dialog closed keep the focus.

## [0.26.0] - 2026-10-24

### Added

- `MenuItem` takes an optional `count`, a number and the sentence a screen reader reads in its place, drawn as a `MenuCount` after the label.
- `DrilldownItem` takes a `suffix`, drawn before its chevron, as `NavigationItem` takes one, so a row that opens a sub menu shows its count there.

### Fixed

- `MenuCount` draws its pill in the brand blue of the scheme with a contrasting digit, at least 3:1 against the sidebar, the current row and the phone drawer, and centres it on the line so the label no longer moves.

## [0.25.0] - 2026-10-23

### Added

- `HUGE_BREAKPOINT`, 1440, the WordPress huge breakpoint.
- `routerDefaults()` in `@gopherium/godmin/router` returns the options a router spreads into `createRouter`: preload on intent and no pending screen, as WordPress's new admin sets them.
- The route static data takes `Sidebar`, the sidebar screen every page under the route shows, and `capability`, the capability a reader must hold to open the route.
- `NavigationList`, `NavigationItem` and `DrilldownItem` in `@gopherium/godmin/router` draw the rows of a sidebar menu as the Site Editor draws them: a list of links, each with an icon, a label and a count or a chevron.
- `NavigationItem` and `DrilldownItem` take the props of a TanStack `Link`, such as `className` and `onClick`, and draw the app's class after their own. A `DrilldownItem` takes its `id` from its address.
- `MenuItem` in `@gopherium/godmin/router` is a row of a sidebar menu as data, with an optional capability and a fallback row shown in its place.
- `useCanAccess(can)` in `@gopherium/godmin/router` tells whether a reader may open a row: its own capability and the capability of every route its address opens. A row that names a capability is hidden when no `can` is given.
- `Navigation` in `@gopherium/godmin/router` is the sidebar menu: the root screen from its `title` and `items`, or the `Sidebar` screen of the deepest matched route, which slides in from the end after a `DrilldownItem` and from the start after Back. It moves focus to Back going in and to the row coming out, hands every row its `can`, sends Back on a sub screen to the app's `home` and needs a `Frame.Root` above it.
- `Frame.Sidebar` takes `footer` and `footerNote`, drawn under the menu in the column and in the drawer, the note in 12px text on a 16px line in both.
- The sidebar screen scrolls with WordPress's scrollbar look, its thumb shown on hover, on focus and on touch screens.
- The phone drawer ends in a close button named "Close navigation panel", the name WordPress gives its phone backdrop, hidden from sight and the tab order so only a screen reader meets it.
- godmin translates "Back", "Navigation", "Open navigation panel" and "Close navigation panel" in the `default` text domain, as `@wordpress/ui` translates its own words, with Spanish and French in the catalogues `listChromeCatalogFor` returns.
- Back on a `NavigationScreen` draws the right chevron when the locale reads right to left, as WordPress picks it with `isRTL()`.
- `Page` takes `headingLevel`, 1 by default as in admin-ui's `Page`, and `PageTitle` takes the same `level`. A screen beside the sidebar passes 2, and a `SectionTitle` inside it renders one level deeper at the same size.

### Changed

- `useFrameLocation` returns the pathname followed by the search, so a phone drawer closes when only the search changes.
- The phone drawer stays open when a `DrilldownItem` or Back moves the sidebar, and closes on any other page change.
- The phone drawer takes the fill of the sidebar column, so the sticky title row and footer of a screen match it.
- The phone drawer is drawn as WordPress's new admin draws its phone sidebar: from the top of the screen, as wide as the sidebar column (300px, at most 85% of the screen), square, with no border and with its shadow.
- The phone drawer dims the page under it black at 0.5 with the pointer cursor, as WordPress's new admin dims it under its phone sidebar.
- The phone menu button draws WordPress's `menu` icon in the full chrome text colour, as the new admin's toggle does.
- The sidebar column is one region named "Navigation", its menu and footer inside, as the Site Editor's sidebar is. `Frame.Sidebar` takes `label` to name it, and `Navigation` draws no landmark of its own.
- `ListEmpty` draws its title one level under the title of the `Page` around it, an h3 inside a level 2 `Page`, at the same size.
- List titles are bold, as DataViews and the WordPress lists draw them, in a DataViews table and in a hand table on a list page.
- **Breaking.** `NavigationScreen` draws the Site Editor's screen: its `title`, now any node, in a 20px h1 at the 56px mark, Back as a 32px chevron box going to the app's `home` inside a `Navigation`, and no focus on mount.
- **Breaking.** The sidebar column and the drawer lose their 16px padding. The screen pads its rows instead.
- **Breaking.** The `@tanstack/react-router` peer starts at 1.170.44, whose route matching runs no route `context`.
- **Breaking.** `@wordpress/i18n` is a required peer, since the main entry translates godmin's own words.
- **Breaking.** `Frame.Sidebar` names its menu button "Open navigation panel" by default, WordPress's words, in place of "Open navigation", and names its drawer "Navigation" whatever the button is called.
- **Breaking.** `PageTabs` draws its tabs in a `ul role="list"`, each `PageTab` in its own `li`, and the `.godmin-page-tabs` class and its fade classes move from the `nav` to that list.
- **Breaking.** `Frame.Rail` is `Frame.Sidebar` and `FrameRailProps` is `FrameSidebarProps`, the names WordPress gives the part.
- **Breaking.** The sidebar slot class `.godmin-layout__rail` is `.godmin-layout__sidebar`.
- **Breaking.** The width custom property `--godmin-rail-width` is `--godmin-nav-sidebar-width`, as the Site Editor names it.
- **Breaking.** `RAIL_BREAKPOINT` is `SIDEBAR_BREAKPOINT`, still 1024.
- **Breaking.** `NavScreen` is `NavigationScreen`, `NavScreenProps` is `NavigationScreenProps` and the `.godmin-nav-screen` classes are `.godmin-navigation-screen`.

## [0.24.0] - 2026-10-22

### Added

- `MenuCount`, the count beside a menu label as WordPress draws it, hidden at zero.
- `Frame.Canvas` takes `notices`, drawn in a band above the screen.

## [0.23.1] - 2026-10-21

### Fixed

- `ConfirmDialog`'s `onConfirm`, `FormDialog`'s `onSubmit` and `RunConfirm`'s `run` take the promise of a write that ends with a value, such as the saved item, so a caller can return `save(values).catch(...)` as it is.

## [0.23.0] - 2026-10-21

### Added

- `FormBody` draws the body of a form modal: the fields, Cancel as accent text and the submit button, spaced as WordPress spaces an edit, a copy or a create.
- `FormDialog` in `@gopherium/godmin/dialogs` asks for a form from a button outside a list, as WordPress opens Add Page: a title, the first field focused, 400px or 560px wide, a bottom sheet below 600px.

### Changed

- **Breaking.** `ConfirmDialog` takes an `onConfirm` that returns nothing, to close at once, or a promise, to stay busy until it ends. Show a failure in a toast.
- **Breaking.** `ConfirmDialog` closes on Escape, a click outside it or its close button while it works.
- **Breaking.** `ConfirmBody` and `RenameBody` no longer take `failure`, and `RenameBody` no longer takes `busy`. Show a failure in a toast.
- **Breaking.** `RenameBody` sends an unchanged name and stops only a blank one.
- **Breaking.** `useListRun` no longer holds a failure, and `RunSettled` takes only whether an item moved.
- **Breaking.** `useBulkRun` shows one toast, the failure words when an item failed.
- `useListRun` hands the same `run` for as long as the screen stays, whichever list it shows.
- `ConfirmBody` and `RenameBody` leave 20px above their buttons, and `ConfirmBody` sets its question on the 1.4 line WordPress gives confirm text.

## [0.22.0] - 2026-10-18

### Added

- `SHEET_BREAKPOINT`, 600, the width below which a modal is a bottom sheet and a toast widens to the screen less a 16px gap on each side, as in WordPress.
- `TITLE_BREAKPOINT`, 404, the width below which an editor header drops its document title, as the WordPress editor does.
- `setViewport` in `@gopherium/godmin/testing` takes `{ width }` and answers `min-width` and `max-width` queries by it, `screen` ones included, so a test can sit between two breakpoints. `{ matches }` works as before, and the new `TestViewport` type names both.
- `ConfirmDialog` takes `size`, `small` for a 400px card or `medium` for the 560px default, as WordPress uses small for the Move to trash button of its editor and medium for the Trash action of its menus.

## [0.21.0] - 2026-10-17

### Added

- `useListRun` holds what a list does around an action on its rows: one failure notice, a run that is no longer the latest ignored, the ticked rows cleared when the list changes, and the list focused once an item moved.
- `useBulkRun` runs one call per picked row, refreshes the list, shows one toast and settles the run.
- `RunConfirm` is the body of a DataViews confirm that runs the action, keeps Cancel inert while it runs and closes once it settles.
- `Page` takes `listLabel` to name its list region and `listRef` to focus it.
- `viewNarrows` tells whether a search or a filter holding a value narrows a list.
- `offeredView` drops a sort or a filter the list fields do not offer, back to the opening order.
- `offeredSize` keeps a page size the list offers and falls back for one it does not, and `sizedView` leaves the size out while the sizes are unknown.
- `FileButton` takes `variant`, `tone` and `size`, still compact and solid by default.
- `ConfirmDialog` in the new `@gopherium/godmin/dialogs` entry asks before an action outside a list as WordPress does: no header on a confirm that removes something, Cancel focused, 560px wide and a bottom sheet below 600px.
- `stubLayout` in `@gopherium/godmin/testing` gives every element a layout box until the test ends.

### Changed

- `ConfirmBody` and `RenameBody` draw Cancel as accent text, as the WordPress Site Editor dialogs do, instead of the neutral tone.
- `@wordpress/components` is an optional peer dependency, needed only by the dialogs entry.
- `@wordpress/dataviews` is an optional peer dependency, `>=20.0.0 <21.0.0`, the release whose filter rules `offeredView` follows.
- The Spanish and French catalogues carry "Loading" and "Scrollable section", which the WordPress button and modal speak inside a dialog.

## [0.20.0] - 2026-10-16

### Changed

- **Breaking.** `startListDates` and `listDate` move to `@gopherium/godmin/dates`, so the main entry no longer loads `@wordpress/date`, moment and its time zone data. Import them from `@gopherium/godmin/dates`.
- `@wordpress/date` and `@wordpress/i18n` become optional peer dependencies, needed only by the dates entry.

## [0.19.0] - 2026-10-15

### Added

- `startListDates` hands `@wordpress/date` the month and weekday names, am and pm, the date and time formats and the first weekday of the loaded catalogue, and a time zone, the browser's own by default.
- `listDate` writes a moment in the abbreviated date and time WordPress lists show, such as "Oct 13, 2026 5:04 pm", or "13 Oct 2026 17:04" in Spanish.
- `listChromeCatalogFor` answers a French catalogue for `fr-FR` with the list date words.

### Changed

- The Spanish list chrome catalogue carries the list date words.
- `@wordpress/date` and `@wordpress/i18n` are peer dependencies, and `godminDedupe` lists `@wordpress/date`.

## [0.18.0] - 2026-10-14

### Added

- `InitialsAvatar` takes `src`, a picture shown in its round box, with the letter back when the address is empty or fails to load.

### Changed

- `InitialsAvatar` picks its colour and letter without the browser's locale, so every visitor sees the same avatar.

## [0.17.0] - 2026-10-11

### Changed

- The design system window moves to the `@wordpress/ui` 0.24 train: `@wordpress/ui` 0.24, `@wordpress/icons` 18, `@wordpress/style-runtime` 0.13, `@wordpress/theme` from 2.3.0 and `@wordpress/a11y` from 4.57.0. The suite runs on `@wordpress/dataviews` 20. Applications on the 0.23 train stay on GodMin 0.16.

## [0.16.2] - 2026-10-11

### Changed

- The `vitest` peer range also accepts vitest 5.

## [0.16.1] - 2026-10-09

### Fixed

- `ConfirmBody` and `RenameBody` draw Cancel in the neutral tone, so its focused fill is the grey of the WordPress alert dialog instead of a blue tint.
- `buttonClasses` in `@gopherium/godmin/testing` takes the button tone.

## [0.16.0] - 2026-10-09

### Added

- `useListView` in `@gopherium/godmin/router` holds a DataViews list view in the address, one layout on each side of 640px, and keeps the columns a reader picks in memory.
- `listSearch` keeps the parts of a list view an address may carry, for a route's `validateSearch`.
- `openOnTap` opens the record a tap lands on in the phone layout of a list.
- `ListEmpty` draws the empty state of a list: an icon, a title and an optional hint.
- `ConfirmBody` draws the body of a confirmation modal: the question, a failure notice, Cancel and the confirm button.
- `RenameBody` draws the body of a rename modal: the name field, a failure notice under it, Cancel and the submit button.
- `bulkNotes` turns a bulk outcome into one toast and one notice in your own words.
- `FileButton` draws a compact upload button over a hidden file input, with an optional icon.
- `useToaster().name` cuts a name longer than `nameLength` and ends it with an ellipsis. `Toaster` takes `nameLength`, 45 by default.
- `InitialsAvatar` takes `size`, its width and height in pixels.
- `godmin-list-overlay` lays an element such as a drop zone over a list region.
- `textClasses`, `badgeClasses` and `buttonClasses` in `@gopherium/godmin/testing` sample the classes of a design system text, badge and button.

### Changed

- `Frame.Root` paints the chrome `#26292b` and the canvas `#fcfcfc` when no colour is given, so an application passing none sees its frame change.
- The canvas no longer takes the chrome colour when only `chromeColor` is given.

### Fixed

- `ConfirmBody` and `RenameBody` grey Cancel out while `busy`, so it stays focusable but closes nothing.
- `PageTabs` fades the edge its row of tabs is cut at and scrolls the current tab into view, as the WordPress tabs do.
- The Spanish list chrome takes the WordPress words for the list filters, such as "Antes" and "es antes de:".
- A DataViews table title link wider than its column ends in an ellipsis instead of running into the next column.
- The Spanish list chrome translates the date filter's calendar and date field, and takes the WordPress words for the rest of the list, such as "Ver opciones" and "No hay resultados".

## [0.15.0] - 2026-10-04

### Added

- `pageWindow` turns a list view into the limit and offset to ask a server for, held under an optional cap.
- `paginationOf` turns a page the server served into the totals a DataViews list pages through.
- `useServerPaging` records the page size the server used for each request and steps the offset by it while the view asks that same size.
- `runEach` runs one call per item at once and answers how many were asked, how many finished and which failed, counting an answer that carries an error as a failure.

### Changed

- The design system window moves to `@wordpress/ui` 0.23, `@wordpress/icons` 17, `@wordpress/theme` 2.2, `@wordpress/style-runtime` 0.12 and `@wordpress/a11y` 4.56.
- The trash of `RowControls` draws with the stroke of `@wordpress/icons` 17.

## [0.14.1] - 2026-10-03

### Fixed

- The DataViews footer of a `godmin-list` rests on the canvas bottom, so no row shows below it.

## [0.14.0] - 2026-10-01

### Added

- `Toaster` takes `limit`, how many toasts stay on screen at once. Defaults to 3, and the oldest leaves first.
- `Page` takes `list`, which takes the content out to the canvas edges so a DataViews list lines up with the title.
- `godmin-table__title` marks the title cell of a table, drawn bold with a link that has no underline.
- `listChromeCatalogFor` and `LIST_CHROME_DOMAIN` load Spanish strings for the WordPress list chrome.
- The canvas names its side padding `--godmin-canvas-gutter`: 24px, 16px below 640px and none on a full bleed canvas.
- The canvas names its top and bottom padding `--godmin-canvas-gutter-block`: 16px, none on a full bleed canvas.
- The rail names its width `--godmin-rail-width`, 300px.
- The canvas names its margin `--godmin-canvas-margin`, 16px.
- `Page` takes `tabs`, set under the title block above a divider that runs to the canvas edges.
- `PageTabs` and `PageTab` draw page tabs as links, the current one underlined and marked as the current page.
- `InitialsAvatar` draws a round avatar with the first letter of a name, in the pale letter WordPress draws on its blue, raspberry and purple, or white on three more colours.
- `EDGE_BREAKPOINT`, 782px, where the canvas meets the screen edges.
- `godmin-list` lines a DataViews list nested in a page section up with the page text.
- DataViews title and media links draw without an underline, as WordPress does.

### Changed

- A toast looks like the WordPress snackbar: a 42px dark box at the bottom center of the canvas, or of the window when no rail is on screen.
- A toast is as wide as its message up to 560px, and spans the window below 600px.
- A toast stays 6 seconds instead of 10.
- A plain toast clears on a click anywhere on it. A toast with an action shows a close button instead.
- `dismissLabel` names that close button, and a plain toast gives it to screen readers as its hint, with no tooltip.
- The toast close button is the snackbar cross, and the action and the cross sit on the first line of a wrapped message.
- The toast action and a focused toast look like the snackbar ones: underline, hover, focus rings and the arrow pointer.
- Toasts fade in and out, with no fade under a reduced motion preference.
- `Toaster` announces each toast once with `speak` from `@wordpress/a11y`, now a peer dependency.
- `godminDedupe` now lists `@wordpress/a11y`.
- The canvas paints the strong surface, white like a WordPress page, and a DataViews list on it paints the same.
- A `godmin-table` matches the DataViews table: small capital headers, medium cell padding, taller rows and a weak line between rows.
- The actions of a `Page` move under the title when they no longer fit beside it, instead of breaking their labels.
- `PageTitle` defaults to the large heading, 15px.
- The subtitle of a `Page` sits under the title and the actions, at 13px.
- The canvas pads its screen 16px above and below instead of 24px.
- The canvas meets the screen edges below 782px instead of 640px.
- The top bar is 46px tall, and its menu button looks like the WordPress admin bar menu toggle, bars at 60% of the chrome text colour.
- Beside the rail the canvas has no start margin, so the rail padding alone parts them, 16px like its other edges.
- A list page fills the canvas: the DataViews footer rests on the canvas bottom and a long list scrolls inside.
- A DataViews row with a description is 64px tall, with a regular title and a 12px description.
- The outer cells of a `godmin-table` on a list page pad 24px, as DataViews does.
- A `godmin-table` sets its text at 13px on 20px lines, and its title cell is regular on a list page.
- A notice in a list region lines up with the title, 16px above the list.
- A notice or a `godmin-table` under page tabs sits 16px below the tabs.
- On a list page the media of a row sits in the middle of the row.
- An initials avatar in DataViews has no dark ring.

### Fixed

- Focus moves to the toast region, not the page body, when a focused toast leaves.
- `Toaster` forgets the timer of a toast once the toast is gone.
- A toast raised after its `Toaster` is gone does nothing, so it leaves no timer behind.
- A toast a screen raises as it mounts under strict mode leaves once its time is up.
- Only the tab `current` marks is underlined, even where a router link marks another tab active.

## [0.13.0] - 2026-09-30

### Added

- A `godmin-table` row tints its cells under the pointer and while keyboard focus is inside it.
- `RowControls` in a `godmin-table__actions` cell sit at the end edge of the cell.
- Below 640px the actions column of a `godmin-table-scroll` table stays pinned to the end edge.

### Changed

- `RowControls` draws its arrows and trash from `@wordpress/icons`, a new peer dependency.
- `RowControls` sets the remove button a medium gap apart from the arrows.

### Fixed

- A focused `godmin-table-scroll` shows the design system focus ring at every width.
- Text inside a `godmin-table__actions` cell stays on one line.
- The remove tooltip of `RowControls` lines up with the end of its button.

## [0.12.0] - 2026-09-29

### Added

- `SectionTitle` shows a section heading one size step above the field labels.
- `godmin-form__row` sets the short fields of a form side by side.
- `godmin-form--inline` lets a form that is one row fill its column.
- `godmin-form__grow` gives one field of a row three shares of the free room.

### Changed

- `Page` keeps its content column at 560px and gives the aside the rest of the width.
- `godmin-form` caps at 560px instead of 320px.
- A button in a `godmin-form` keeps its own width instead of stretching.
- `RepeatRows` sets a row's inputs and its controls on one line, and removes a row with a trash icon.

## [0.11.0] - 2026-09-26

### Added

- `LogList` and `LogItem` show a log, each item a header line with a label and
  actions over a body that keeps its line breaks.
- `LogTime` shows a small muted date or time inside a `time` element.

## [0.10.0] - 2026-09-26

### Added

- `Page` takes an optional `aside`, a column beside the content at the small
  surface width. It moves below the content on a narrow page, with no
  breakpoint, and an aside that renders nothing takes no room. The content
  keeps a readable width, so the aside stays beside it on a wide page.

## [0.9.0] - 2026-09-24

### Added

- `useRowKeys` gives each row of a list a key that stays with it through moves
  and removals.
- `RepeatRows` edits a list of rows with add, move up, move down and remove,
  optional `min` and `max`, and every label as a prop.
- `RowControls` shows the move up, move down and remove buttons of one row, for
  lists that need their own add step.
- `keyFromLabel` turns a label into a camel or kebab key and adds the first
  free number when the key is taken.

## [0.8.1] - 2026-09-18

### Fixed

- `AdminRoot` seeds the design system's own primary color when an application
  passes no `color`, so a stylesheet setting `--wp-admin-theme-color` cannot
  take the accent over.

## [0.8.0] - 2026-09-16

### Changed

- The design system window moves to `@wordpress/ui` 0.22, `@wordpress/theme`
  2.1 and `@wordpress/style-runtime` 0.11.
- Dialogs, menus, popovers and selects opened inside `Frame` take the
  `AdminRoot` color. The navigation drawer keeps `chromeColor`.
- `Frame.Canvas` content with a z-index paints under the toasts.
- `godminDedupe` now lists `@wordpress/i18n`.

### Removed

- `./patches` and the React 19 patch for `@wordpress/element`. Delete your copy
  and its `patchedDependencies` entry.

## [0.7.0] - 2026-08-08

### Added

- `godminStylesheetFirst`, a bundler plugin moving the stylesheet above the
  module script so a render-blocking sheet stops queueing behind JavaScript.
  `hoistStylesheet` is the transform, for a bundler the plugin shape does not
  fit.

### Changed

- `godminDedupe` now lists `@gopherium/react-auth`. Its configured
  transport is module state, so a second copy silently keeps its own.

## [0.6.0] - 2026-08-08

### Added

- `Toaster` takes `dismissLabel`, naming the control that clears a toast.
  Defaults to `Dismiss`.

### Fixed

- The ghosts and `godmin-arrival` no longer fade under
  `prefers-reduced-motion`. The delay still holds, so a fast load shows
  nothing.
- The package no longer ships the compiled `useLoadingGate`, removed in
  0.5.0. `build` now clears `dist` first.

## [0.5.0] - 2026-08-08

### Added

- `godmin-arrival` fades content in on mount. Give it to the element that
  replaces a loading ghost and the swap reads as one motion.

### Changed

- The ghosts fade in on their own again, after a 150ms delay, so a fast
  load shows none. Render them straight from the pending flag.

### Removed

- `useLoadingGate`. Holding a ghost on screen after its data arrived made
  fast applications feel slow, and the fade out through `godmin-arrival`
  removes the snap the hold existed to hide.

## [0.4.0] - 2026-08-07

### Added

- `useLoadingGate` decides when a loading ghost shows: nothing before
  200ms, and once shown it stays for 500ms. Gate the pending flag with it
  before rendering `LoadingScreen` or `LoadingRows`.

### Changed

- The ghosts no longer delay their own appearance through the stylesheet.
  A consumer rendering one without the gate shows it immediately, so wrap
  the pending flag in `useLoadingGate` when adopting this release.

## [0.3.0] - 2026-08-07

### Added

- `LoadingScreen` and `LoadingRows` stand in for a screen or a list while its
  data loads. Loading status was a contract applications hand-wrote as bare
  text, unstyled and sometimes unannounced. Each ghost is built from the
  design system skeleton, announces its label through a visually hidden
  status region, and appears only after a 200ms delay so a fast load never
  shows one.

## [0.2.2] - 2026-08-05

### Fixed

- The toast region is out of flow, so it sized itself to fit a notice that
  offers no width of its own and collapsed to a few pixels, breaking the
  message and its buttons mid word. It now has a width beside its max-width.

## [0.2.1] - 2026-08-02

### Fixed

- `Frame.Root` themes its chrome through a provider, which only sets custom
  properties, so the layout declaring no background of its own left
  `chromeColor` inert and the chrome rendered unthemed. It now paints the
  surface and foreground it is given.

## [0.2.0] - 2026-08-02

### Added

- `Frame` frames an admin application from the regions you render:
  `Frame.Root`, `Frame.Rail` and `Frame.Canvas`. Below 1024px the rail becomes
  a top bar and a drawer, and below 640px the canvas meets the screen edges.
  The core imports no router, so `Frame.Root` takes the location as a string
  and closes the drawer whenever it changes.
- `Page`, `PageTitle`, `ErrorNotice` and `LoadMore` give every screen the same
  shape, and `NavScreen` gives a drill-down its way back to the parent layer.
- `Toaster` and `useToaster` hold messages a screen raises, each with an
  optional action.
- `@gopherium/godmin/router` reads the canvas a route asks for through
  `useCanvas`, and the current pathname through `useFrameLocation`.
  `@tanstack/react-router` is an optional peer, needed only for this entry
  point.
- `setViewport` in the testing entry point controls what media queries report,
  so a test can render either shell.
- `useMediaQuery`, `RAIL_BREAKPOINT`, `DENSE_BREAKPOINT` and `SMALL_VIEWPORT`
  are exported for an application placing its own rules at the same widths.

### Fixed

- The testing entry point now clears the rendered tree after each test. A
  runner without globals never registers that itself, so trees accumulated and
  a query could find an element another test had rendered.

## [0.1.3] - 2026-07-31

### Fixed

- `CSS.supports` is now supplied on the environment's `CSS` object, which jsdom
  leaves without one. The library behind design system dialogs calls it while
  locking body scroll, so opening a menu that leads to a dialog threw.

## [0.1.2] - 2026-07-31

### Fixed

- The `window.matchMedia` stub now carries the deprecated `addListener` and
  `removeListener`, which the animation library behind design system popovers
  still calls. Without them opening a dropdown in a test throws.

## [0.1.1] - 2026-07-30

### Fixed

- `installTestEnvironment` now supplies `window.matchMedia`, which jsdom lacks
  and `@wordpress/ui` calls. Without it any test rendering a design system
  component that reads a media query throws.

## [0.1.0] - 2026-07-30

First release. The host layer only, since `@wordpress/admin-ui` is building the
application frame upstream.

### Added

- `AdminRoot`, the host element. Isolates the stacking context, enables the
  design system overlay slot, applies the theme.
- `useTokenDocument`, keeping an iframe or popup supplied with design system
  styles.
- `SUPPORTED_WPDS`, the design system window this build was tested against.
- `./base.css`, the host stylesheet. Cascade layer order, design tokens, and
  the page rules the design system asks for.
- `./testing` with `installTestEnvironment`, `renderAdmin`, `getAnnouncement`,
  `clearAnnouncements`, `assertElementPatched` and `WPDS_IGNORE_SELECTOR`.
- `./vite` with `godminDedupe` and `godminSingleCopy`.
- `./stylelint`, turning on the design system rules `@wordpress/theme` ships.
- `./patches`, the React 19 patch for `@wordpress/element` 8.4.0. Removed once
  the upstream fix ships.
