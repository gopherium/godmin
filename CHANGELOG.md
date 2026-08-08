# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/). While at 0.x,
minor releases may break. Releases are tagged `vX.Y.Z` and publish from CI.

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
