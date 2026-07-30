# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
versioning follows [Semantic Versioning](https://semver.org/). While at 0.x,
minor releases may break. Releases are tagged `vX.Y.Z` and publish from CI.

## [0.1.0]

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
