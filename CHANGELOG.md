# Changelog

All notable changes to `@gopherium/godmin` are documented in this file. The
format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the
package follows [Semantic Versioning](https://semver.org/). While at 0.x, minor
releases may contain breaking changes.

Releases are tagged `vX.Y.Z` and publish to npm from CI.

## [Unreleased]

### Added

- Repository scaffold: build, test, lint and publish pipeline, and the
  Apache-2.0 license.
- `SUPPORTED_WPDS`, the design system version window this build was tested
  against.
- `AdminRoot`, the host element for a design system application. It isolates its
  own stacking context, enables the design system overlay slot, and applies the
  theme. It contributes no layout, width or landmark of its own.
- `useTokenDocument`, which keeps a secondary document such as an iframe or a
  popup supplied with the design system styles, including styles registered
  after it mounts.
- `@gopherium/godmin/base.css`, the host stylesheet. It declares the cascade
  layer order as `wp-ui, godmin`, loads the design tokens so a consumer needs
  one import rather than two, keeps the overlay positioning requirement
  unlayered, and confines the page appearance defaults to the `godmin` layer
  where an application can override them without a specificity fight.
- `@gopherium/godmin/testing`, with `installTestEnvironment` to stop
  announcements breaking text queries and leaking between tests,
  `getAnnouncement` and `clearAnnouncements` to assert on what was announced,
  `renderAdmin` to render inside the host, and `WPDS_IGNORE_SELECTOR` for
  applications that call `configure` themselves.
- `@gopherium/godmin/vite`, with `godminDedupe` listing the packages that break
  when duplicated, and `godminSingleCopy` failing the build when one of them
  resolves to more than one copy.
- `@gopherium/godmin/stylelint`, turning on the three design system rules
  `@wordpress/theme` ships, which catch unknown tokens, an application
  redefining a `--wpds-` property, and hand written fallback values.
- `assertElementPatched` in the testing entry point, asserting that
  `@wordpress/element` works on React 19. It checks the outcome rather than a
  patch file, so it keeps passing once upstream ships the fix and the patch is
  no longer needed.
- `@gopherium/godmin/patches`, the React 19 patch for `@wordpress/element`
  8.4.0, since pnpm reads `patchedDependencies` only from the workspace root
  and no package can apply a patch on a consumer's behalf. Expected to be
  removed once 8.5.0 carries the fix upstream and becomes the supported floor.
