---
title: Motion
description: The sidebar slide and the fades of a godmin admin, the design tokens that time them, and what changes when a reader asks for less motion.
---

godmin's own motion is short and small. The sidebar slides a new
menu screen in. Toasts fade in and out. Ghosts, the grey shapes shown
while data loads, fade in, and so does the content that replaces
them. godmin's stylesheet animates nothing else. It sets no
transitions, so its own hover and focus looks change at once.

Parts that WordPress packages draw keep the motion those packages
give them. These include the dialogs, the drawer on a small screen
and the bars inside a ghost.

## The tokens

A design token is a value the WordPress Design System names, written
as a CSS custom property. A custom property is a CSS variable. A
duration is how long an animation takes. An easing is the curve its
speed follows from start to end. godmin times its fades with three
design tokens:

| Token | Value | What it times |
| --- | --- | --- |
| `--wpds-motion-duration-md` | 200ms | A toast, a ghost or new content fading in |
| `--wpds-motion-duration-sm` | 100ms | A toast fading out |
| `--wpds-motion-easing-balanced` | `cubic-bezier(0.4, 0, 0.2, 1)` | Every fade |

Two lengths have no token: the sidebar slide and the wait before a
ghost shows. The sections below cover both.

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

A toast fades in when it arrives. When it leaves, it fades out and
stays hidden at the end. A leaving toast stays on the page until its
fade ends. Nobody can press it in that time. If the browser cuts the
fade short, the toast still goes.
[How a toast behaves](../loading-and-feedback.md#how-a-toast-behaves)
says how long a toast stays before it leaves.

## Loading

`LoadingScreen` and `LoadingRows` draw the ghosts, as
[the ghosts](../loading-and-feedback.md#the-ghosts) shows.

A ghost starts transparent. It waits a short delay, then fades in and
stays visible. A load that ends within the delay shows no ghost at
all.
[Why a ghost does not appear immediately](../loading-and-feedback.md#why-a-ghost-does-not-appear-immediately)
gives the delay and the reason for it. The bars inside a ghost are
the `Skeleton` of `@wordpress/ui`, and they pulse the way that
package pulses them.

Content with the `godmin-arrival` class fades in the same way, with
no delay.
[Fading the content in](../loading-and-feedback.md#fading-the-content-in)
shows where to put the class.

## Reduced motion

A reader can ask their system for less motion. The browser then
reports `prefers-reduced-motion: reduce` to CSS, and godmin changes
two things:

- The fades of toasts, ghosts and new content last 1ms. They still
  run and still end. So a leaving toast still goes, and a ghost
  still waits its delay and then stays visible.
- The sidebar slide lasts 0s, as in the WordPress Site Editor, even
  when you set your own slide duration. It does not play, and the new
  screen shows at once in its place.

These rules change only how long each animation lasts. They keep
the delay, the animation itself, and the setting that holds a ghost
visible after its fade. Turning the animation off would leave a
ghost transparent for good.

The bars inside a ghost stop their pulse too. Their WordPress
package does that on its own.
