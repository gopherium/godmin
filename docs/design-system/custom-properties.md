---
title: Custom properties
description: godmin's own custom properties in base.css, where each one is set, and which ones an app may read or change.
---

A CSS custom property is a named value, such as
`--godmin-canvas-margin`, that one rule sets and other rules read
with `var()`. Some people call it a CSS variable.

`base.css` sets a few of its own. The public ones are yours to read.
The ones set on `:root`, the top element of the page, are also yours
to change. The internal ones are not yours to read or change.

## Public custom properties

The canvas is the panel that shows the current screen.
[The frame](./layout.md#the-frame) and [the canvas](./layout.md#the-canvas)
give the four sizes below, and
[the sidebar slide](./motion.md#the-sidebar-slide) gives the two slide
values. This table says where each one is set and what it changes.

| Name | Set on | What it changes |
| --- | --- | --- |
| `--godmin-nav-sidebar-width` | `:root` | The width of the sidebar, and of the drawer that takes its place on a small screen |
| `--godmin-canvas-margin` | `:root` | The space around the canvas |
| `--godmin-canvas-gutter` | the canvas | The canvas padding left and right. A `Page` with `list` and no `aside` reaches out by it to the canvas edges |
| `--godmin-canvas-gutter-block` | the canvas | The canvas padding above and below. The band of notices above the screen keeps this space under it. A `Page` with `list` and no `aside` reaches down by it to the canvas bottom |
| `--godmin-navigation-slide-distance` | `:root` | How far a sidebar screen moves as it slides in |
| `--godmin-navigation-slide-duration` | `:root` | How long that slide takes |

## Where each one is set

A value set on `:root` reaches every element on the page.

To change one of the four on `:root`, write a plain rule in your own
stylesheet. For example, a wider sidebar:

```css
:root { --godmin-nav-sidebar-width: 320px }
```

Your rule wins over godmin's, as
[changing the page appearance](../overview.md#changing-the-page-appearance)
explains. The sidebar and the drawer both follow it.

The canvas sets its two gutters on itself. So a gutter set on `:root`
changes nothing inside the canvas. Read them inside the canvas, for
anything that has to line up with the canvas edge.

## Internal custom properties

These serve godmin's own rules. They can change in any release, so
do not read or set them in your app.

- `--godmin-menu-count-size` sizes the count `MenuCount` draws. It is
  set on the count itself.
- `--godmin-page-tabs-start`, `--godmin-page-tabs-end`,
  `--godmin-page-tabs-fade-width`, `--godmin-page-tabs-fade` and
  `--godmin-page-tabs-fade-both` fade an end of a `PageTabs` row where
  more tabs sit out of view. They are set on the row itself.
- `--godmin-list-frozen-start` holds the width of the checkbox column
  of a wide list table, where its frozen title starts. It is set on
  the table.
