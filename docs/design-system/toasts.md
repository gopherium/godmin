---
title: Toasts
description: Where a toast sits, how it looks, how long it stays, how a reader clears it, and what a keyboard or a screen reader meets.
---

A toast is a short message near the bottom of the window. It says how
something went, then goes away on its own. godmin draws it as
WordPress's new admin draws its snackbar.
[Toasts](../loading-and-feedback.md#toasts) shows how to raise one and
what to write in it. This page gives every value of how a toast looks
and behaves.

## Where a toast sits

Toasts stack in one column fixed to the window. The column spans the
whole width of the window, the sidebar included, and centers each
toast in it. So a toast sits at the center of the window, as in
WordPress's new admin. The sidebar and the drawer never move it.

- The column sits `--wpds-dimension-size-md` (32px) above the bottom
  edge of the window.
- It keeps 16px free on each side, so a toast never touches the edge.
- Two toasts sit `--wpds-dimension-gap-sm` (8px) apart, the newest at
  the bottom. The gap sits above each toast, inside the space that
  grows and closes with the toast, as in the snackbar. So an arriving
  toast starts one gap below the bottom of the column, then rises by
  the gap and its own height.
- A click on the column between toasts reaches the page under it.

A toast paints above the canvas and the sidebar. On a list page it
floats over the list footer, as it does in WordPress. Two things paint
above a toast:

- The drawer on a small screen.
- An open dialog. On a wide screen a toast shows dimmed under the dark
  layer around the dialog. On a phone it sits behind the sheet. Screen
  readers still hear it, because every message is also spoken. Most
  dialogs close as their write starts or ends, so their toast shows in
  full. A [form dialog](../lists.md#a-form-dialog) stays open after a
  failure, so its toast shows under it, as in WordPress.

## Size

- A toast is as wide as its message, up to
  `--wpds-dimension-surface-width-lg` (560px), its padding included.
- Below `SHEET_BREAKPOINT` (600px) it spans the column, so it keeps
  16px from each side of the window. It still stops at 560px.
- It keeps `--wpds-dimension-padding-md` (12px) above and below its
  text and `--wpds-dimension-padding-xl` (20px) on each side. A toast
  of one line is 42px tall, with or without an action.
- A long message wraps, even inside a long word. godmin never cuts a
  message or a name in it.

## Colors, corners and shadow

These are the colors of the WordPress snackbar. They stay the same
whatever seeds you pick.

- The box is `rgb(0 0 0 / 0.85)`, a black that lets the page show
  through. The page behind it is blurred 16px and saturated to 180%.
- The text and the action are `#fff`, and so is the ring around a
  focused action.
- A focused toast with no action has a `#fff` line
  `--wpds-border-width-xs` (1px) wide inside its edge. Outside it sits
  the usual focus ring, `--wpds-border-width-focus` (2px) of
  `--wpds-color-stroke-focus`.
- The corners take `--wpds-border-radius-md` under the `subtle`
  preset, so they are 4px. The toast region keeps `subtle` whatever
  [corner radius setting](./radius-and-elevation.md#the-corner-radius-setting)
  your app picks, as WordPress keeps the corners of its snackbar.
- The shadow is the WordPress small elevation, in four layers:
  `0 1px 2px rgb(0 0 0 / 0.05)`, `0 2px 3px rgb(0 0 0 / 0.04)`,
  `0 6px 6px rgb(0 0 0 / 0.03)` and `0 8px 8px rgb(0 0 0 / 0.02)`.

## Text

- The message takes `--wpds-typography-font-family-body` at
  `--wpds-typography-font-size-md` (13px), on a line 1.4 times its
  size.
- The action is a link in the same text, underlined 0.2em below the
  letters at the thickness the font sets. It loses its underline under
  the pointer.
- The action sits on the first line of the message, at least
  `--wpds-dimension-gap-2xl` (32px) after it. On a phone, where the
  toast spans the column, the spare room goes between the message and
  the action, as in the snackbar.

## How long a toast stays

- A toast with no action stays 6 seconds. `dismissAfter` changes it.
- A toast with an action stays 10 seconds, time to read the message
  and then act. `actionDismissAfter` changes it.
- WordPress's own snackbar in `@wordpress/components` 42.0.0 still
  stays 6 seconds, with or without an action. Its next release keeps
  one with an action 10 seconds, as godmin does.
- Each toast keeps its own timer. So a toast a screen raises as it
  mounts leaves on time even under React strict mode, which mounts the
  screen twice in development.
- At most three toasts show at once. When a fourth arrives, the oldest
  leaves. `limit` changes the three. A toast pushed out in the same
  moment it is raised never shows, as WordPress shows only its newest
  three.
- Every toast leaves on its own. WordPress also has a snackbar that
  waits for the reader, with no timer and a close button. godmin
  raises none.

## Motion

A toast moves as the WordPress snackbar does. Each toast takes a space
of its own in the column. The space grows as the toast arrives and
closes after it leaves, so the toasts above slide instead of jumping.

- An arriving toast grows its space from no height over
  `--wpds-motion-duration-lg` (300ms) on `cubic-bezier(0, 0, 0.2, 1)`.
  The toast rises into place as its space grows, and the toasts above
  slide up. When a toast leaves, its space closes over 450ms on
  `cubic-bezier(0.4, 0, 0.1, 1)`, so the toasts above slide down. The
  closing waits `--wpds-motion-duration-sm` (100ms) for the toast to
  fade out first. A space that is still growing closes from the height
  it has reached.
- The toast fades in over 250ms on `cubic-bezier(0, 0, 0.2, 1)`, after
  a wait of `--wpds-motion-duration-xs` (50ms). So the fade ends with
  the growth. A leaving toast fades out over
  `--wpds-motion-duration-sm` on the same curve and stays hidden at the
  end. A toast that is still fading in fades out from where it got to.
- A leaving toast stays on the page until its space has closed, and
  nobody can press it in that time. If the browser cuts the motion
  short, the toast still goes.
- [Reduced motion](./motion.md#reduced-motion) says what changes for a
  reader who asks for less motion. Then a toast shows and goes at
  once, and nothing grows, slides or fades, as in WordPress.

## Clearing a toast

- A click anywhere on a toast clears it, with or without an action.
  The pointer turns to `--wpds-cursor-control` over every toast.
- A click on the action runs it and clears the toast.
- A click on a toast moves focus to the toast region, as WordPress
  moves it to its snackbar list. The region draws no ring.
- A toast has no close button. WordPress draws its cross only on a
  snackbar with no timer, and godmin raises none.

## Keyboard

- A toast with no action is one button. Tab reaches it, and Enter or
  Space clears it. Its focus ring is a white line
  `--wpds-border-width-xs` wide inside the toast and a ring of
  `--wpds-color-stroke-focus` `--wpds-border-width-focus` wide around
  it, both drawn as a shadow. The browser's own ring shows too. In
  Chrome it is a dark ring that mostly covers the white line and the
  focus ring, as it does on the WordPress snackbar.
- In a toast with an action, only the action takes focus. The rest of
  the toast is no tab stop and no button. A keyboard reader runs the
  action, or lets the toast leave on its own when its time is up. So
  offer the same action somewhere else on the screen too, as
  [Toasts](../loading-and-feedback.md#toasts) says.
- The focus ring of the action is the design system ring in white: a
  solid `#fff` outline `--wpds-border-width-focus` wide, set
  `--wpds-border-width-focus` away from the text, with
  `--wpds-border-radius-sm` corners. They are 2px, because the toast
  region keeps the `subtle` preset, as on the snackbar. The underline
  goes while the ring shows.
- When a toast that holds focus leaves, focus moves to the toast
  region instead of falling back to the top of the page. The region
  draws no ring, and Tab never stops on it. The region comes after the
  rest of the page, so the next Tab reaches any other toast still on
  screen and then leaves the page for the browser's own controls.
  Shift+Tab goes back to the last control before the region.

WordPress makes its whole snackbar a button the keyboard reaches, with
the action button inside it. godmin never puts a button inside another
button. So it keeps the click on the whole toast, and leaves the
keyboard with the action.

## What a screen reader hears

- Each message once, politely, through `speak` from `@wordpress/a11y`.
  Polite means the screen reader first finishes what it is saying.
  The region itself is not a live region, so nothing is read twice.
- Never the action. A reader who moves into the toast finds the action
  by its label.
- A toast with no action is a button named by its message. After the
  name the screen reader reads the hint `dismissLabel`, which says
  "Dismiss this notice" unless your app passes its own words. No
  tooltip shows when the pointer rests on it.

WordPress names its whole snackbar "Dismiss this notice", so a screen
reader hears those words in place of the message. godmin keeps the
message as the name of a plain toast and reads the words after it.
