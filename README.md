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
| `@gopherium/godmin` | `AdminRoot`, `Frame`, `Page`, `PageTitle`, `NavScreen`, `ErrorNotice`, `LoadMore`, `LoadingScreen`, `LoadingRows`, `Toaster`, `useToaster`, `useMediaQuery`, `useTokenDocument`, the breakpoints, `SUPPORTED_WPDS` |
| `@gopherium/godmin/base.css` | cascade layer order, design tokens, host rules, frame and screen styles |
| `@gopherium/godmin/router` | `useCanvas`, `useFrameLocation`, the `canvas` route static data |
| `@gopherium/godmin/testing` | `installTestEnvironment`, `renderAdmin`, `setViewport`, `getAnnouncement`, `clearAnnouncements`, `assertElementPatched`, `WPDS_IGNORE_SELECTOR` |
| `@gopherium/godmin/vite` | `godminDedupe`, `godminSingleCopy` |
| `@gopherium/godmin/stylelint` | the design system stylelint rules |
| `@gopherium/godmin/patches` | the React 19 patch for `@wordpress/element`, temporary |

## Status

Version 0.1.x was the host layer alone. The frame was held back while
`@wordpress/admin-ui` built its own page chrome, and shipped in 0.2.0 once two
applications had run the same shell long enough to settle its shape. Waiting
was worth it: the width, the empty state placement, the narrow viewport shell
and the table region all changed during that time, and each would have been a
breaking release had the frame gone out first.

`@wordpress/admin-ui` remains the thing to watch. GodMin does not wrap it,
because a kit that wraps an API still moving adds a release hop to every
upstream fix. See the CHANGELOG for what each release adds.

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

## Framing the application

`Frame` builds the shell out of the regions you render. A region exists because
its element is there, not because a flag says so, so an application with no
rail simply does not render one.

```tsx
<Frame.Root location={pathname}>
    <Frame.Rail brand={<HomeLink />}>
        <YourNavigation />
    </Frame.Rail>
    <Frame.Canvas canvas={mode}>
        <YourScreen />
    </Frame.Canvas>
</Frame.Root>
```

Below 1024px the rail leaves and the same children appear in a drawer behind a
menu button, so you write your navigation once. Below 640px the canvas meets
the screen edges and pads tighter.

The core imports no router. `Frame.Root` takes `location` as a plain string and
closes the drawer whenever it changes, which means any link closes it, including
links a plugin added. `chromeColor` and `canvasColor` theme the two regions.

`brand` is rendered as given and should not be a heading. Each screen owns the
one first level heading on the page, and `Page` renders it.

### Screens

`Page` puts the title top left, an optional subtitle under it and optional
actions top right.

```tsx
<Page title="Reports" actions={<Button>New report</Button>}>
    <ReportTable />
</Page>
```

A screen that fills the canvas edge to edge builds its own chrome and uses
`PageTitle` directly, so it still carries exactly one first level heading.
`NavScreen` renders a drill-down layer, taking the way back as an element you
supply so the kit stays router free.

```tsx
<NavScreen title="Conversations" back={<Link to="/" />}>
    <ConversationList />
</NavScreen>
```

### While data loads

`LoadingScreen` stands in for a screen whose data has not arrived, and
`LoadingRows` stands in for a list body under chrome that is already there.
Both render a ghost built from the design system skeleton and announce their
label through a visually hidden status region, so give `label` the same
sentence you would have rendered as text.

```tsx
if (report.data === undefined) {
    return <LoadingScreen label="Loading the report." />
}

{reports.isPending ? <LoadingRows label="Loading reports." rows={8} /> : <ReportTable />}
```

A ghost appears only after a short delay, so a load that resolves quickly
shows nothing at all rather than a flash.

`base.css` also ships `godmin-empty`, `godmin-form`, `godmin-table` and
`godmin-table-scroll`. The last two go together: a table wider than a phone
scrolls inside its own region rather than dragging the page sideways.

```tsx
<div className="godmin-table-scroll" role="region" aria-label="Reports" tabIndex={0}>
    <table className="godmin-table">…</table>
</div>
```

The region is focusable so a keyboard can reach the columns that scrolled out
of view, and it establishes a containing block, without which absolutely
positioned content inside it escapes the clip and widens the document.

### Reading the canvas from routes

With TanStack Router, `@gopherium/godmin/router` lets a route declare how it
fills the canvas, and the deepest route that declares one wins, so a child can
opt back to a padded canvas its section left behind.

```tsx
createRoute({ path: 'threads/$id', staticData: { canvas: 'bleed' } })

const mode = useCanvas()
const pathname = useFrameLocation()
```

### Raising messages

`Toaster` holds messages a screen raises, each with an optional action.

```tsx
<Toaster>
    <YourApp />
</Toaster>

const toaster = useToaster()
toaster.show('Post moved to trash', { label: 'Undo', onAct: restore })
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

A test runner evaluates no media queries, so `setViewport` says what they
should report and tells any listener the viewport changed. That is how a test
renders the narrow shell.

```ts
import { setViewport } from '@gopherium/godmin/testing'

setViewport({ matches: true })
```

It resets before the next test, along with the rendered tree, which a runner
without globals never clears by itself.

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

Dedupe settles which copy your bundler picks, but it cannot stop a second one
being installed. `@wordpress/element` up to 8.4.0 declares React 18 as a
dependency rather than a peer, so a fresh install materialises React 18 beside
your React 19 and the first hook throws `Cannot read properties of null`. Pin
the version yourself.

```json
{
    "pnpm": {
        "overrides": { "react": "^19.2.0", "react-dom": "^19.2.0" }
    }
}
```

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
