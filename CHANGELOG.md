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
