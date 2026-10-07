# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/). While at 0.x,
minor releases may break. Releases are tagged `vX.Y.Z` and publish from CI.

## [Unreleased]

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
