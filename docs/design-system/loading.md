---
title: Loading
description: What a list, a screen and a preview show while their data loads, how long each waits, what a screen reader hears, and what changes for a reader who asks for less motion.
---

A screen that waits for its data shows that it is loading, as
WordPress's new admin does. A list leaves this to DataViews. Any
other screen shows a spinner. A skeleton, a grey shape that stands in
for content, shows only in a preview whose shape is known before it
loads. [Loading and feedback](../loading-and-feedback.md) shows how
to set each one up. This page gives every value of what a reader
sees.

## A list

A DataViews list that gets its loading state through `isLoading`
shows it on its own, as every WordPress list does.
[A list that loads](../lists.md#a-list-that-loads) says which flag to
pass.

On the first load:

- For its first 200ms the list shows nothing under its toolbar. A
  load that ends sooner shows no spinner at all.
- Then a spinner shows in the middle of the space between the toolbar
  and the bottom of the canvas. The search box and the filters stay
  on screen. The footer stays away until the first rows arrive.
- This spinner is the one of `@wordpress/components`, which DataViews
  draws: a quarter circle in the accent color that turns over a light
  grey ring.
- The first rows replace the spinner at once.

On a later load, such as another page, a search or a new sort:

- The old rows and the footer stay on screen. Nobody can click them
  or reach them with Tab until the next rows arrive.
- After 400ms the rows and the footer pulse. Their opacity goes from
  1 to `0.5` and back every 1s, on an `ease-in-out` curve. A load
  that ends sooner shows no pulse.
- When the last answer was empty, there are no old rows to keep. The
  empty state stays on screen and pulses the same way after 400ms.
- The next rows replace the old ones at once.

## A screen

`LoadingScreen` stands in for a screen, or for the part of a screen
whose data has not arrived. It holds the `Spinner` of
`@wordpress/ui`, a half circle that turns. It is
`--wpds-dimension-size-2xs` (16px) wide and high and drawn in
`--wpds-color-foreground-content-neutral-weak`, the muted text color.

When it shows and where it sits depend on what is around it:

- Inside a `Page` it shows at once, with no wait and no fade, as a
  WordPress screen shows the spinner under its title. The spinner
  sits at the top of the page content, centred across, with the
  page's own gap between it and the title. The title stays on screen.
- Inside a dialog it shows at once too, and takes only the space it
  gets.
- Inside a sidebar screen it shows at once too, under the screen's
  title, as in the sidebar of the WordPress Site Editor. That holds
  on a phone, where the sidebar opens as a drawer, and on a wide
  window alike.
- Directly in the canvas, with no page around it, nothing of the
  screen is known yet. It shows nothing for its first 200ms, so a
  load that ends sooner shows no spinner. Then it fades in over
  500ms on the CSS `ease` curve, as the canvas loader of the
  WordPress Site Editor does. It fills the canvas, the spinner sits
  in the middle, and it keeps `--wpds-dimension-padding-3xl` (32px)
  free on every side.
- Outside the frame, before the sidebar and the canvas are drawn, it
  waits and fades in the same way. It is at least `100vh` tall, the
  height of the window, as the frame is. So the spinner sits in the
  middle of the window.

## A preview whose shape is known

Some parts know their size before their data arrives, such as an
image whose width and height you already hold. Such a part may show
a skeleton in its place, as WordPress does in its style and font
previews. godmin draws no skeleton of its own. Use the `Skeleton` of
`@wordpress/ui`:

- Give it the size and the corners of the part it stands in for. It
  has no size of its own.
- It is drawn in `--wpds-color-background-surface-neutral-weak` and
  pulses as its package makes it pulse. In forced colors it gets a
  thin border, so its shape stays visible.
- It is hidden from screen readers. Mark the part around it
  `aria-busy="true"` while it loads, or give that part a visually
  hidden status with a label, as `LoadingScreen` does.
- When the image arrives, the skeleton goes at once and the image may
  fade in. This is the one fade WordPress gives loaded content, in
  its font previews: the opacity goes from 0 to 1 over
  `--wpds-motion-duration-lg` (300ms) on `--wpds-motion-easing-subtle`
  (`cubic-bezier(0.15, 0, 0.15, 1)`), only when the reader allows
  motion. While it loads, keep the image in the page at opacity 0,
  laid over the skeleton with `position: absolute`. WordPress does so
  because a lazy image with `display: none` does not load.

In godmin a list or a screen shows a spinner, even when it knows how
many rows are coming, as above. Nothing else fades in when it
arrives.

## Moving between pages

These follow
[`routerDefaults()`](../framing-an-application.md#routes-and-the-frame):

- The page on screen stays until the next one has its code and the
  data its route loader waits for. No loading screen shows in
  between.
- A page starts to load when the pointer rests on its link or the
  keyboard reaches it, so the wait is often over before the click.
- A loader that waits only for the small data the screen needs to
  draw, and starts the rest without waiting, keeps that wait short.
  [A list that loads](../lists.md#a-list-that-loads) shows how.
- A page that fetches its own data after it opens shows a list or a
  screen loading, as above.
- The next page replaces the old one at once, with no fade and no
  slide.

## What a screen reader hears

- `LoadingScreen` puts its `label` in a visually hidden status, and a
  screen reader reads it politely. In the canvas and outside the
  frame the status is there during the wait too. The spinner itself
  is hidden.
- A list says nothing while it loads for the first time, as in
  WordPress. Its spinner is hidden from screen readers.
- During a later load a table or a grid is marked busy. A screen
  reader may say so when the reader moves into it. The other layouts
  are not marked.

## Reduced motion

[Reduced motion](./motion.md#reduced-motion) says what changes for a
reader who asks for less motion. While a list or a screen loads:

- Both spinners keep turning, as WordPress keeps them. A spinner that
  stood still would look like a page that froze.
- A list does not pulse. Its old rows and its footer stay at `0.5`
  opacity until the next rows arrive.
- A loading screen in the canvas or outside the frame keeps its wait,
  since a wait is no motion, and then shows at once with no fade.
  Inside a `Page`, a sidebar screen or a dialog nothing changes, since
  it never moves.
- A skeleton stops its pulse. Its package does that on its own.
- An image takes the place of its skeleton at once, with no fade.
