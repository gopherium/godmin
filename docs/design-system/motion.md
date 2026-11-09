---
title: Motion
description: The sidebar slide, the phone drawer, the toast motion and the fade of a loading screen in a godmin admin, the design tokens that time them, and what changes when a reader asks for less motion.
---

godmin's own motion is short and small. The sidebar slides a new
menu screen in, and the drawer on a small screen slides in and out.
Toasts grow in and fade, and the toasts around them slide along. A
loading screen that fills the canvas or stands outside the frame
waits a moment, then fades in. godmin's stylesheet animates nothing
else. Besides the drawer, only the shade and the focus ring of a page
tab fade, over 0.1s. Every other hover and focus look changes at
once.

godmin times the drawer itself, as
[the drawer](./frame.md#the-drawer) on the frame page gives. Other
parts that WordPress packages draw keep the motion those packages
give them, such as the spinners and the pulse of a list that loads.
The dialogs move as [motion](./dialogs.md#motion) on the dialogs page
says.

## The tokens

A design token is a value the WordPress Design System names, written
as a CSS custom property. A custom property is a CSS variable. A
duration is how long an animation takes. An easing is the curve its
speed follows from start to end. godmin times its motion with four
design tokens:

| Token | Value | What it times |
| --- | --- | --- |
| `--wpds-motion-duration-lg` | 300ms | Toast motion, see [Motion](./toasts.md#motion) |
| `--wpds-motion-duration-md` | 200ms | The phone drawer, see [The drawer](./frame.md#the-drawer) |
| `--wpds-motion-duration-sm` | 100ms | Toast motion, see [Motion](./toasts.md#motion) |
| `--wpds-motion-duration-xs` | 50ms | Toast motion, see [Motion](./toasts.md#motion) |

Some values have no token: the sidebar slide, the curve of the
drawer, the wait and the fade of a loading screen, and the rest of
the toast motion. The sections
below cover them.

## The sidebar slide

When a drilldown row or Back in the sidebar changes the menu screen,
the new screen slides in from one side and fades in, as in the
sidebar of the WordPress Site Editor. It plays on a
wide window only, and never after the browser's Back button.
[The sidebar slide](./frame.md#the-sidebar-slide) on the frame page
gives how far it moves, how long it takes, its curve and when it
plays.

You may change the slide through its two custom properties.
[Where each one is set](./custom-properties.md#where-each-one-is-set)
shows how.

## The phone drawer

On a small screen the sidebar sits in a drawer. It slides in from
the start edge and back out, and its backdrop fades with it. A swipe
ends as fast as the finger let go.
[The drawer](./frame.md#the-drawer) on the frame page gives its time
and its curve.

## Toasts

Toasts move as the WordPress snackbar does. An arriving toast grows
its space in the column and fades in. A leaving toast fades out, then
its space closes. So the other toasts slide instead of jumping.
[Motion](./toasts.md#motion) on the toasts page gives every duration
and curve, and says what a leaving toast does.

## Loading

A spinner turns while a list or a screen loads, and the old rows of a
list pulse while the next ones load. Both come from WordPress
packages. A loading screen that fills the canvas or stands outside
the frame waits, then fades in. [Loading](./loading.md) gives how
long each one waits and how it moves.

## Reduced motion

A reader can ask their system for less motion. The browser then
reports `prefers-reduced-motion: reduce` to CSS, and godmin changes
five things:

- A loading screen that fills the canvas or stands outside the frame
  shows at once when its wait ends, with no fade. Its wait stays, so
  a fast load still shows nothing.
- Every toast animation lasts 1ms and starts at once, with no wait.
  It still runs and still ends, so a leaving toast still goes. A toast
  shows in its place at once and goes at once, and the toasts above
  move in one step, as in WordPress.
- The sidebar slide lasts 0s, as in the WordPress Site Editor, even
  when you set your own slide duration. It does not play, and the new
  screen shows at once in its place.
- The phone drawer and its backdrop open and close at once.
- The shade and the focus ring of a page tab show at once.

[Reduced motion](./frame.md#reduced-motion) on the frame page says
what the frame does. Loading keeps its spinners turning, and a list
holds its old rows still. [Reduced motion](./loading.md#reduced-motion) on the loading
page says what loading does.
