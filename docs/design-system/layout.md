---
title: Layout
description: The areas of the frame and their sizes, the widths where they change, the spacing tokens, and how the layout reads in right-to-left languages.
---

The frame is the outer layout of a godmin admin. `Frame` draws it, as
[Framing an application](../framing-an-application.md) shows. This
page gives the sizes of its areas, the widths where they change, the
spacing they take from the design system, and how they turn around in
a right-to-left language.

## The frame

The frame is as tall as the window. On a wide screen it sets two
areas side by side, with the names the WordPress Site Editor gives
them:

- The sidebar holds the menu. It is `--godmin-nav-sidebar-width`
  (300px) wide and never shrinks. Its menu scrolls on its own, above a
  footer that stays put.
- The canvas shows the screen and takes the rest of the width.
  [The canvas](#the-canvas) gives its sizes.

Render `Frame.Sidebar` and then `Frame.Canvas` straight inside
`Frame.Root`, with no element of your own around them. The frame lays
its areas out in a row from the start edge, which is the left in
English, so the sidebar sits at the start.

Below `SIDEBAR_BREAKPOINT` (1024px) the frame turns into a column. A
top bar takes the place of the sidebar, above the canvas:

- The top bar is 46px tall. Its menu button sits at its start, in a box
  52px wide and 46px tall. The `brand` you give `Frame.Sidebar` comes
  8px after the button. The bar keeps 16px free at its end.
- The menu button opens the drawer, a panel that slides in over the
  page. It holds the same menu and footer as the sidebar. It runs the
  full height of the window, as wide as the sidebar but never more
  than 85% of the window width. A dark backdrop dims the page under
  it. [Raw colors on purpose](./color.md#raw-colors-on-purpose) gives
  its color.

## The canvas

The canvas is a panel. Its margin is the space around it. Its gutter
is the padding between its edge and the screen inside it.

- The margin is `--godmin-canvas-margin` (16px). Beside the sidebar
  the canvas has no margin on that side, because the sidebar menu
  keeps its own space at that edge. With no sidebar on screen, as
  under the top bar, the margin runs on all four sides.
- The gutter at each side is `--godmin-canvas-gutter`, 24px, or 16px
  below `DENSE_BREAKPOINT` (640px).
- The gutter above and below is `--godmin-canvas-gutter-block`, set to
  `--wpds-dimension-padding-lg` (16px).
- Below `EDGE_BREAKPOINT` (782px) the canvas meets the screen edges.
  It drops its margin, its rounded corners and its shadow.
  [Corners from the tokens](./radius-and-elevation.md#corners-from-the-tokens)
  and [Elevation](./radius-and-elevation.md#elevation) give the
  corners and the shadow.

The canvas scrolls its screen inside itself. A list page and a record
page keep their title and scroll a part of their own, as
[what scrolls](./record-pages.md#what-scrolls) gives for a record. A
bleed canvas, which `canvas="bleed"` asks for, has no gutter at any width and hides what
overflows it, so the screen scrolls its own parts. The default,
`padded`, keeps the gutters.
[Two canvas modes](../framing-an-application.md#two-canvas-modes)
says when to pick each one.

The canvas sets both gutters on itself, so read them from inside it. A
part that must reach the canvas edge pulls itself out by the gutter,
as a list page does, with
`margin-inline: calc(-1 * var(--godmin-canvas-gutter, 0px))`.

## Breakpoints

A breakpoint is a window width where the layout changes. godmin
exports each one, so your own rules can change at the same widths as
the frame and as WordPress. Each value is the first width that counts
as wide. A rule for the screens below it asks for one pixel less, as
`SMALL_VIEWPORT` does.

| Export | Value | What changes below it |
| --- | --- | --- |
| `HUGE_BREAKPOINT` | `1440` | Nothing in the frame. It is the WordPress huge breakpoint, for rules of your own |
| `SIDEBAR_BREAKPOINT` | `1024` | The sidebar becomes the top bar and the drawer |
| `EDGE_BREAKPOINT` | `782` | The canvas meets the screen edges. It is the WordPress medium breakpoint. A wide list table freezes its checkbox and title only above this width, as [a wide table](./lists.md#a-wide-table) shows |
| `DENSE_BREAKPOINT` | `640` | The canvas side gutter narrows to 16px. A list from `useListView` takes its phone layout, as [the view in the address](../lists.md#the-view-in-the-address) shows. A table inside `godmin-table-scroll` scrolls sideways, as [stylesheet helpers](../screens.md#stylesheet-helpers) shows |
| `SHEET_BREAKPOINT` | `600` | Dialogs rise as sheets along the bottom of the screen and toasts widen to the screen, as [a form dialog](../lists.md#a-form-dialog) and [toasts](./toasts.md#size) show. It is the WordPress small breakpoint |
| `TITLE_BREAKPOINT` | `404` | Nothing in the frame. The WordPress editor drops the document title from its header here, for an editor header of your own |
| `SMALL_VIEWPORT` | `(max-width: 1023px)` | The media query the frame folds its sidebar at |

[What happens on a small screen](../framing-an-application.md#what-happens-on-a-small-screen)
shows `useMediaQuery`, which checks a media query from your own
components.

## Spacing

Most of godmin's spacing comes from the design system's dimension
tokens, its named sizes. A gap token is the space between two parts.
A padding token is the space between the edge of a box and what it
holds. godmin picks a token by the kind of space, not by its size, so
a margin between two parts takes a gap token too. The two scales
match up to `lg` and part ways from `xl` up:

| Step | Gap token | Padding token |
| --- | --- | --- |
| `xs` | `--wpds-dimension-gap-xs` (4px) | `--wpds-dimension-padding-xs` (4px) |
| `sm` | `--wpds-dimension-gap-sm` (8px) | `--wpds-dimension-padding-sm` (8px) |
| `md` | `--wpds-dimension-gap-md` (12px) | `--wpds-dimension-padding-md` (12px) |
| `lg` | `--wpds-dimension-gap-lg` (16px) | `--wpds-dimension-padding-lg` (16px) |
| `xl` | `--wpds-dimension-gap-xl` (24px) | `--wpds-dimension-padding-xl` (20px) |
| `2xl` | `--wpds-dimension-gap-2xl` (32px) | `--wpds-dimension-padding-2xl` (24px) |
| `3xl` | `--wpds-dimension-gap-3xl` (40px) | `--wpds-dimension-padding-3xl` (32px) |

A sidebar row keeps `--wpds-dimension-gap-sm` (8px) between its icon
and its label. When no token of the right kind holds a size, godmin
adds or subtracts two of them, such as
`calc(var(--wpds-dimension-gap-lg) + var(--wpds-dimension-gap-xs))`
for a 20px gap.

The frame's own sizes are plain pixels, not tokens. They are the
sidebar width, the canvas margin, the side gutter and the top bar.
The sidebar menu sets most of its spacing in plain pixels too. The
first three sizes have custom properties of their own, which
[public custom properties](./custom-properties.md#public-custom-properties)
lists.

## Right-to-left languages

In a right-to-left language, such as Arabic or Hebrew, text starts at
the right. The sidebar then sits at the right edge, and the canvas
drops its margin on that side. In the top bar, the menu button sits
at the right end.

Where a margin, a padding or a position differs between the two sides,
godmin's stylesheet sets it with a logical property. A logical
property names a side by the reading direction, start or end, in place
of left or right. `margin-inline-start` is the left margin in English
and the right margin in Arabic. Such a rule turns around with the text
and needs nothing more.

CSS has no logical form of a sideways slide, a gradient direction or a
sideways shadow. Where godmin draws one that must turn around, a
second rule under `:dir(rtl)`, the CSS selector for right-to-left
text, turns it. That covers
[the sidebar slide](./motion.md#the-sidebar-slide), the fade on the
page tabs where a tab is cut off, and the edge line of a pinned
actions column in a `godmin-table`.

Chevrons turn around too. A row that opens a sub menu ends in a
chevron that points to the end, right in English and left in a
right-to-left language. Back points the other way. godmin picks each
chevron with `isRTL()` from `@wordpress/i18n`, as WordPress does.

The stylesheet and the chevrons read the direction from two places.
The stylesheet follows the `dir="rtl"` your app sets on the page, such
as on the `html` element. The chevrons follow the translation your app
loads. Set both.
