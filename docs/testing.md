---
title: Testing
description: The test setup a design system app needs, and how to assert what it announces.
---

The design system expects a real browser, and the simulated one
most test runners use, jsdom, is missing pieces it calls. Without
help, otherwise fine component tests throw in confusing places.
`@gopherium/godmin/testing` fills the gaps. Call it once from your
test setup file:

```ts
import { installTestEnvironment } from '@gopherium/godmin/testing'

installTestEnvironment()
```

`@testing-library/react` and `vitest` are optional peer
dependencies, needed only for this entry point.

## What it installs

Three browser APIs jsdom leaves out, each of which throws when a
component calls it:

- `window.matchMedia`, used by any component that reads a media
  query.
- `CSS.supports`, called while a dialog locks body scroll. Without
  it, opening a menu that leads to a dialog throws.
- `ResizeObserver`, the element resize API.

It also clears the rendered tree after each test. A runner
configured without globals never registers that cleanup itself, so
trees would pile up and a test could find an element some earlier
test rendered.

## Announcements

The design system talks to screen readers through `@wordpress/a11y`,
which adds two live regions and an intro paragraph to the page
body. In a test this breaks two things. A query for text that was
also announced finds two elements instead of one. And the last
announcement of one test is still in the DOM during the next.

`installTestEnvironment` fixes both. Queries skip the announcement
elements, and they are emptied after each test.
`WPDS_IGNORE_SELECTOR` is the selector used for the skipping,
exported in case you configure queries of your own.

Since queries can no longer see announcements, read them directly
when a test needs one:

```ts
import { getAnnouncement } from '@gopherium/godmin/testing'

speak('Draft saved')
expect(getAnnouncement()).toBe('Draft saved')
```

`getAnnouncement()` reads polite announcements, and takes
`'assertive'` for urgent ones. `clearAnnouncements()` empties both,
for a test that must assert nothing was announced.

## Rendering inside the host

`renderAdmin` renders a tree wrapped in `AdminRoot`, so components
that read design tokens behave like they do in the application. It
accepts the usual testing library options plus the host theme
settings, and returns the normal render result. It supplies the
wrapper itself, so do not pass a `wrapper` of your own.

## Simulating a small screen

jsdom evaluates no media queries, so a component asking "is this a
small screen?" always hears no. `setViewport` changes the answer:

```ts
import { setViewport } from '@gopherium/godmin/testing'

setViewport({ matches: true })
```

Every media query now matches, listeners are told, and components
re-render. That is how a test renders
[the narrow shell](./framing-an-application.md). The setting
resets itself before the next test.

## Simulating a width

`{ matches: true }` gives every query the same answer, so a test
cannot sit between two breakpoints with it. Give `setViewport` a
width instead, and each width query is answered by that number:

```ts
import { SHEET_BREAKPOINT, TITLE_BREAKPOINT } from '@gopherium/godmin'
import { setViewport } from '@gopherium/godmin/testing'

setViewport({ width: 500 })

window.matchMedia(`(max-width: ${SHEET_BREAKPOINT - 1}px)`).matches // true
window.matchMedia(`(max-width: ${TITLE_BREAKPOINT - 1}px)`).matches // false
```

At 500 the test sits between 404 and 599, and at 700 it sits
between 600 and 781. Listeners are told and components re-render,
as with `{ matches: true }`.

The width answers `min-width` and `max-width` in pixels, the bound
itself included, as a browser does. A query may join them with
`and`, and a list of queries parted by commas matches when any of
them does. The test stands in for a screen, so the media types
`screen` and `all` hold, with or without `only`. That way the
queries the WordPress packages ask, such as
`screen and (max-width: 782px)`, get the answer a browser gives.
Anything else, such as `print`, `not`, a width in `em` or
`prefers-reduced-motion`, reports no match while a width is set. The
width resets before the next test, like the yes or no.

At exactly 782 the WordPress packages call the screen narrow, since
they ask `(max-width: 782px)`, while godmin's breakpoints call it
wide. A browser shows the same split, so a test at 782 sees it too.

A helper of your own can name what it hands on with the
`TestViewport` type:

```ts
import { setViewport } from '@gopherium/godmin/testing'
import type { TestViewport } from '@gopherium/godmin/testing'

const PHONE: TestViewport = { width: 390 }

setViewport(PHONE)
```

## Giving elements a layout box

jsdom lays nothing out, so no element has a size or a place on the
screen. The WordPress modal looks for the first element it can focus
among those on screen, finds none, and leaves the focus where it was.
A test that checks the dialog focused Cancel, or that a form dialog
put the cursor in its first field, then fails, though a browser
moves the focus there. `stubLayout` gives every element one small
box, as a browser does for an element on screen:

```ts
import { stubLayout } from '@gopherium/godmin/testing'

test('focuses Cancel when the dialog opens', async () => {
	stubLayout()
	await user.click(screen.getByRole('button', { name: 'Move to trash' }))
	await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' })))
})
```

The box lasts until the test ends. `installTestEnvironment` takes it
away after each test, so the next one starts with no layout again.
Call it only in the tests that check where the focus goes.

## Checking a design system look

The design system class names change between releases, so a test
should not type them. `textClasses`, `badgeClasses` and
`buttonClasses` draw a text, a badge or a button and answer the
classes it got. Compare your element with them:

```ts
import { badgeClasses, buttonClasses } from '@gopherium/godmin/testing'

expect([...badge.classList]).toEqual(badgeClasses('none'))
expect([...button.classList]).toEqual(buttonClasses('solid', 'compact'))
```

They take the variant, the intent, and for a button the size and the
tone.

## Checking the element package on React 19

`@wordpress/element` 8.4.0 and older do not load on React 19. The
design system versions godmin supports install a newer one. This
test fails if an old copy comes back:

```ts
import { assertElementPatched } from '@gopherium/godmin/testing'

test('element works on React 19', async () => {
	await assertElementPatched()
})
```

The assertion checks that the APIs React 19 removed are gone and
that `createRoot` and `createPortal` are still there. By default it
imports `@wordpress/element` itself. Pass a loader to point it at a
specific copy. The name comes from when a patch was needed.
