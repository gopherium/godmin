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

## What is in it

| Entry point | Contents |
| --- | --- |
| `@gopherium/godmin` | `AdminRoot`, `useTokenDocument`, `SUPPORTED_WPDS` |
| `@gopherium/godmin/base.css` | cascade layer order, design tokens, host rules |
| `@gopherium/godmin/testing` | `installTestEnvironment`, `renderAdmin`, `getAnnouncement`, `clearAnnouncements`, `assertElementPatched`, `WPDS_IGNORE_SELECTOR` |
| `@gopherium/godmin/vite` | `godminDedupe`, `godminSingleCopy` |
| `@gopherium/godmin/stylelint` | the design system stylelint rules |
| `@gopherium/godmin/patches` | the React 19 patch for `@wordpress/element`, temporary |

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

## Setup

Import the stylesheet once, at your application entry point, then mount
`AdminRoot` around your tree.

```tsx
import '@gopherium/godmin/base.css'
import { AdminRoot } from '@gopherium/godmin'

createRoot(document.getElementById('app')!).render(
    <AdminRoot>
        <YourApp />
    </AdminRoot>,
)
```

That is the whole host setup. `base.css` loads the design tokens for you, so
you do not import `@wordpress/theme/design-tokens.css` separately, and it
declares the cascade layer order as `wp-ui, godmin`. `AdminRoot` isolates the
stacking context that portaled popovers need and enables the overlay slot that
lets design system overlays stack above `@wordpress/components` ones.

### Overriding the appearance defaults

`base.css` sets the page font, colour and background from design tokens inside
`@layer godmin`, so any unlayered rule of your own wins without a specificity
fight. One rule it deliberately leaves unlayered is `body { position: relative }`,
because overlays position against the nearest positioned ancestor and an
application that overrode it would get broken backdrops.

If you declare your own layers, name GodMin's in the order you want:

```css
@layer wp-ui, godmin, my-app;
```

### Rendering into an iframe

Design system styles are injected per document, so a secondary document such as
an iframe or a popup needs registering. `useTokenDocument` does that and keeps
it supplied with styles registered later, which is what an embedded editor
canvas needs.

```tsx
useTokenDocument(iframeRef.current?.contentDocument)
```

## Testing

`@gopherium/godmin/testing` solves the problems the design system creates for a
test runner. Call it once from your setup file.

```ts
import { installTestEnvironment } from '@gopherium/godmin/testing'

installTestEnvironment()
```

The design system announces through `@wordpress/a11y`, which appends a live
region and an intro paragraph to the body. Without this, every query for text
that was also announced finds two nodes, and the last announcement of one test
is still in the DOM for the next one. `installTestEnvironment` makes queries
ignore those elements and empties them after each test.

Because the announcement regions are then invisible to queries, read them
directly instead.

```ts
import { getAnnouncement } from '@gopherium/godmin/testing'

speak('Draft saved')
expect(getAnnouncement()).toBe('Draft saved')
```

`renderAdmin` renders a tree inside `AdminRoot`, so components that read design
tokens behave as they will in the application.

`@testing-library/react` and `vitest` are optional peers, needed only for this
entry point.

## Build configuration

Several packages break when a bundle contains two copies of them. React is the
loud case, where hooks throw, but a second `@wordpress/theme` silently gives you
a second context and unthemed components. `@gopherium/godmin/vite` exports the
list and a plugin that fails the build rather than shipping the bug.

```ts
import { godminDedupe, godminSingleCopy } from '@gopherium/godmin/vite'

export default defineConfig({
    resolve: { dedupe: godminDedupe },
    plugins: [godminSingleCopy()],
})
```

The list cannot live in the package alone, because `resolve.dedupe` is read
from your own config, so GodMin ships it as data for you to spread.

## React 19 and @wordpress/element

Up to and including 8.4.0, `@wordpress/element` imports APIs that React 19
removed, so it fails to load. The fix is a patch, and pnpm applies patches at
install time before `node_modules` exists, so no published package can supply
one for you. GodMin ships the patch it was tested against for you to copy.

```sh
cp node_modules/@gopherium/godmin/patches/*.patch patches/
```

```yaml
patchedDependencies:
  '@wordpress/element@8.4.0': patches/@wordpress__element@8.4.0.patch
```

Rather than checking that your patch file matches ours, assert the outcome in
your test suite, which is what actually determines whether your application
runs.

```ts
import { assertElementPatched } from '@gopherium/godmin/testing'

test('element works on React 19', async () => {
    await assertElementPatched()
})
```

**This is temporary.** The fix is merged upstream and lands in a future
`@wordpress/element` release, after which no patch is needed at all. The
assertion is written for that: it checks that the removed APIs are absent and
the live ones work, so it keeps passing once upstream ships and the patch goes
away, whether that arrives as a minor or a major.

GodMin does not constrain your `@wordpress/element` version. It never imports
it at runtime, and the version is chosen by `@wordpress/ui` and
`@wordpress/theme`, which depend on it directly. The shipped patch file is
removed from this package once the fixed release is the one those packages
resolve.

## Linting your stylesheets

`@wordpress/theme` ships three stylelint rules and turning them on requires
knowing they exist and what they are called. `@gopherium/godmin/stylelint` is
that configuration.

```js
export default { extends: ['@gopherium/godmin/stylelint'] }
```

It catches design tokens that do not exist, an application redefining a
`--wpds-` property, and hand written fallback values. The first of those is the
one that bites quietly, since a mistyped token renders nothing at all.
`stylelint` is an optional peer, needed only for this entry point.

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
