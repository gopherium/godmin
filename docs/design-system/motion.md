---
title: Motion
description: The sidebar slide, the toast motion and the fade of a loading screen in a godmin admin, the design tokens that time them, and what changes when a reader asks for less motion.
---

godmin's own motion is short and small. The sidebar slides a new
menu screen in. Toasts grow in and fade, and the toasts around them
slide along. A loading screen that fills the canvas or stands outside
the frame waits a moment, then fades in. godmin's stylesheet animates
nothing else. It sets no transitions, so its own hover and focus
looks change at once.

Parts that WordPress packages draw keep the motion those packages
give them. These include the dialogs, the drawer on a small screen,
the spinners and the pulse of a list that loads.

## The tokens

A design token is a value the WordPress Design System names, written
as a CSS custom property. A custom property is a CSS variable. A
duration is how long an animation takes. An easing is the curve its
speed follows from start to end. godmin times its motion with three
design tokens:

| Token | Value | What it times |
| --- | --- | --- |
| `--wpds-motion-duration-lg` | 300ms | Toast motion, see [Motion](./toasts.md#motion) |
| `--wpds-motion-duration-sm` | 100ms | Toast motion, see [Motion](./toasts.md#motion) |
| `--wpds-motion-duration-xs` | 50ms | Toast motion, see [Motion](./toasts.md#motion) |

Some values have no token: the sidebar slide, the wait and the fade
of a loading screen, and the rest of the toast motion. The sections
below cover them.

## The sidebar slide

The sidebar menu shows one screen at a time. The root screen holds
the main rows, and each sub menu has a screen of its own. A
drilldown row is a row with a chevron that opens a sub menu. Back is
the link in the title row of a sub menu. When a drilldown row or Back
changes the screen, the new screen slides in:

- It starts `--godmin-navigation-slide-distance` (50px) to one side
  and moves into place. As it moves, it fades from transparent to
  fully visible.
- It takes `--godmin-navigation-slide-duration` (140ms). Its speed
  follows the CSS `ease-in-out` curve, which starts slow and ends
  slow. It plays once, with no delay.
- A sub menu comes in from the side the text ends on. That is the
  right in a left-to-right language and the left in a right-to-left
  one. Back brings the screen in from the other side.
  [Right-to-left languages](./layout.md#right-to-left-languages) says
  where godmin reads the direction from.

These are the numbers the WordPress Site Editor uses for its own
sidebar slide.

The slide plays only after a drilldown row or Back. It does not play
on the first load, after a row that keeps the same screen, after a
link elsewhere on the page, or after the browser's Back button. A
sub menu whose code loads late slides in once that code has arrived.

Only the screen moves. The sidebar footer stays still under it, and
the sidebar hides anything that slides past its sides.
[Where focus goes](./accessibility.md#where-focus-goes) says where
the focus lands after the slide.

You may change the slide through its two custom properties.
[Where each one is set](./custom-properties.md#where-each-one-is-set)
shows how.

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
three things:

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

Loading keeps its spinners turning, and a list holds its old rows
still. [Reduced motion](./loading.md#reduced-motion) on the loading
page says what loading does.
