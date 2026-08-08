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

That is the whole host setup. See
[the overview](https://docs.gopherium.org/admin-ui/overview/) for what those
two lines do for you.

## What is in it

| Entry point | Contents |
| --- | --- |
| `@gopherium/godmin` | `AdminRoot`, `Frame`, `Page`, `PageTitle`, `NavScreen`, `ErrorNotice`, `LoadMore`, `LoadingScreen`, `LoadingRows`, `Toaster`, `useToaster`, `useMediaQuery`, `useTokenDocument`, the breakpoints, `SUPPORTED_WPDS` |
| `@gopherium/godmin/base.css` | Cascade layer order, design tokens, host rules, frame and screen styles |
| `@gopherium/godmin/router` | `useCanvas`, `useFrameLocation`, the `canvas` route static data |
| `@gopherium/godmin/testing` | `installTestEnvironment`, `renderAdmin`, `setViewport`, `getAnnouncement`, `clearAnnouncements`, `assertElementPatched`, `WPDS_IGNORE_SELECTOR` |
| `@gopherium/godmin/vite` | `godminDedupe`, `godminSingleCopy`, `duplicateCopies` |
| `@gopherium/godmin/stylelint` | The design system stylelint rules |
| `@gopherium/godmin/patches/*` | The React 19 patch file for `@wordpress/element`, copied at install time, temporary |

## Before your first build

Two install-time problems stop the application booting, and neither error
points at its cause. Both are covered in
[build configuration](https://docs.gopherium.org/admin-ui/build-and-versioning/).

- **Duplicate packages.** Two copies of React throw on the first hook, and two
  copies of `@wordpress/theme` render unthemed components silently. Spread
  `godminDedupe` into `resolve.dedupe` and add the `godminSingleCopy()` plugin.
- **React 19.** `@wordpress/element` up to 8.4.0 fails to load on React 19.
  Copy the patch this package ships into your own `patches/` directory, since
  pnpm applies patches before `node_modules` exists.

## Design system versions

Peer ranges are longhand and single window, for example `>=0.19.0 <0.20.0`.
The window moves with each design system release train and never widens, so no
release accepts two breaking generations at once. `SUPPORTED_WPDS` exports the
window this build was tested against.

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
