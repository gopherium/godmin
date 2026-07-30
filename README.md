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
speak('Draft saved')
expect(getAnnouncement()).toBe('Draft saved')
```

`renderAdmin` renders a tree inside `AdminRoot`, so components that read design
tokens behave as they will in the application.

`@testing-library/react` and `vitest` are optional peers, needed only for this
entry point.

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
