---
title: Design System
description: The rules for how an admin built on godmin looks, where its colors come from, and how to read a design token name.
---

The Design System is the set of rules for how an admin built on
godmin looks. It says where each part of the screen sits, how big
things are, how they move and which colors they take. A new product
can follow these pages without reading any godmin code.

These pages hold the values the whole admin shares. A part with a
page of its own, such as [toasts](./toasts.md), keeps its values
there. Every other part keeps its values on the page that shows how
to use it.

godmin builds on the WordPress Design System, WPDS for short. For
layout, sizes and motion it follows WordPress's new admin and the
Site Editor. Colors work another way. They come from three seeds. A
seed is one color you hand the design system, and the design system
works out every shade it needs from it:

- The chrome seed paints the chrome, the part of the
  [frame](./layout.md#the-frame) around your screens. That is the
  sidebar, or the top bar and its drawer on a small screen.
- The canvas seed paints the canvas, the panel that shows the current
  screen.
- The accent is the color of primary buttons, selected rows and
  focus rings.

Each seed has a prop of its own. A product changes colors only
through these three props. It never sets a design token itself.
[The three seeds](./color.md#the-three-seeds) names each prop and its
default.

## Reading a token name

A design token is a named value, such as a color or a size. WPDS
ships each token as a CSS custom property, a variable your CSS reads
with `var()`. The name is made of parts, read from left to right.
Take `--wpds-dimension-gap-md`:

- `--wpds-` marks a token of the design system.
- `dimension` is the kind of value, here a length. The other kinds
  are `color`, `border`, `typography`, `motion` and `cursor`.
- `gap` is what it sets, the space between items.
- `md` is its step on the size scale, medium. Steps such as `sm` and
  `lg` sit below and above it. [Spacing](./layout.md#spacing) gives
  the value of each step.

Color names have more parts. `--wpds-color-foreground-content-neutral`
is the text color of the page. `foreground` means text and icons.
`content` means something you read rather than click. `neutral` means
the color carries no meaning such as success or error. Add `weak` or
`strong` and the color gets fainter or stronger.
`--wpds-color-foreground-content-neutral-weak` is the muted text
color.

godmin's own custom properties start with `--godmin-` instead.
[Custom properties](./custom-properties.md) lists them and says which
ones you may read or change.

## Writing your own styles

Write the token, not the value it holds today. The value can change.
Color tokens follow the seeds, and radius tokens follow
[the corner radius setting](./radius-and-elevation.md#the-corner-radius-setting)
of `AdminRoot`. The same color token holds one value in the sidebar
and another in the canvas, because each region has its own seed.

The design system ships rules for stylelint, a checker for CSS files.
They catch a token name that does not exist, and a token you set
yourself. [Lint your
stylesheets](../build-and-versioning.md#lint-your-stylesheets)
shows how to turn them on.

Most of godmin's rules sit in a cascade layer. A cascade layer is a
named group of CSS rules with its own place in the order that
decides which rule wins. A rule of yours outside any layer wins over
every godmin rule inside one.
[Changing the page appearance](../overview.md#changing-the-page-appearance)
explains this, and names the few godmin rules that sit outside the
layer.

## The pages

- [Color](./color.md): the three seeds, the token that paints each
  part, the contrast minimums, and the raw colors painted on purpose.
- [Layout](./layout.md): the areas of the frame and their sizes, the
  canvas margin and gutters, the breakpoints, the screen widths where
  the layout changes, the spacing tokens, and right-to-left languages.
- [Radius and elevation](./radius-and-elevation.md): how round each
  surface's corners are, and which surfaces cast a shadow to look
  raised.
- [Typography](./typography.md): the font, the text sizes and
  weights, and the heading outline.
- [Motion](./motion.md): the motion tokens, the sidebar slide, and
  what changes for a reader who asks for less motion.
- [Accessibility](./accessibility.md): focus rings, where focus goes,
  landmarks, what a screen reader hears, and text length.
- [Custom properties](./custom-properties.md): every godmin custom
  property, where it is set and what it changes.

Four more pages cover a single part each, how it looks and how it
behaves:

- [Toasts](./toasts.md): where a toast sits, how it looks, how long it
  stays, how a reader clears it, and what a keyboard or a screen reader
  meets.
- [Loading](./loading.md): what a list, a screen and a preview show
  while their data loads, how long each waits and what a screen reader
  hears.
- [Lists](./lists.md): how a list meets the canvas, its columns, a
  wide table, its rows, an empty list and what it does after a write.
- [Record pages](./record-pages.md): how a page that shows one record
  sets its header and its two columns, what scrolls, what its details
  hold, how it saves and what shows while it loads.
