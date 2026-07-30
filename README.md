# GodMin

Gopherium's admin kit

GodMin is the host layer for a React admin application built on the WordPress
Design System. Five layers make up such an application, and four already have
owners upstream: `@wordpress/theme` owns tokens, `@wordpress/ui` owns
primitives, `@wordpress/dataviews` owns data screens, and `@wordpress/admin-ui`
owns page chrome. The fifth is the host layer, which WordPress supplies to
itself through PHP and `@wordpress/boot`, and which nothing supplies to an
application that is not WordPress. GodMin is that layer.

Every export earns its place against one of three tests: it closes a documented
upstream gap, it satisfies a documented host requirement, or it owns a contract
that two published packages each expect the application to hand-write. Nothing
here duplicates something upstream ships.

## Status

Version 0.1.0 is the host layer. The application frame is deliberately not here
yet, because `@wordpress/admin-ui` is actively building that layer and a kit
should not race upstream. See the CHANGELOG for what each release adds.

## Install

```sh
pnpm add @gopherium/godmin
```

GodMin declares the design system as peer dependencies, so your application
resolves and pins them. The window this build was tested against is exported as
`SUPPORTED_WPDS` and enforced by the declared peer ranges.

## Design system version policy

Peer ranges are longhand and single window, for example `>=0.19.0 <0.20.0`. The
window MOVES on each design system train bump and never widens, so no release
accepts two breaking generations at once. `@wordpress/ui` is pre 1.0, where a
caret range covers only one minor, and reading a caret as broader than that is
what silently breaks consumers.

## License

Apache-2.0, see LICENSE.

The design system packages this kit expects you to install are
GPL-2.0-or-later. GodMin declares them as peer dependencies, so your
application resolves them and GodMin never redistributes them. Your built
bundle combines both, and is conveyed under the terms of the WordPress
packages. GodMin's own source stays reusable under plain Apache-2.0. NOTICE
carries the same statement for anyone reading only the published tarball.
