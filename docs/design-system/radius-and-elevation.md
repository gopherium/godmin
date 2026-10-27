---
title: Radius and elevation
description: Which corner radius each surface of a godmin admin takes, what the cornerRadius setting changes, and the shadows godmin draws.
---

Radius is how round a corner is. Elevation is how high a surface
seems to sit above the page. A shadow is what shows it. WordPress
uses both words, and so does this page.

godmin takes most of its corners from the design tokens, the named
values `@wordpress/theme` ships. The tokens hold no shadows, so godmin
writes each shadow out in full.

## Corners from the tokens

The tokens have five radius steps. Each step is meant for one kind of
surface, and godmin rounds its surfaces to match. The pixel values are
those of the default preset, `subtle`.
[The corner radius setting](#the-corner-radius-setting) explains
presets.

| Token | Meant for | What godmin rounds with it |
| --- | --- | --- |
| `--wpds-border-radius-xl` (12px) | Page and app shell surfaces | The canvas, the panel that shows the active screen |
| `--wpds-border-radius-lg` (8px) | Cards, dialogs, notices and other larger containers | A `LogList`, the box of items shown one under the other |
| `--wpds-border-radius-md` (4px) | Menus, popovers and other small overlays | A toast, which keeps its corners at every preset, as [toasts](./toasts.md#colors-corners-and-shadow) shows |
| `--wpds-border-radius-sm` (2px) | Buttons, inputs and compact controls | A sidebar row, the Back button of a sidebar screen, the focus ring of a page tab, and the focus ring of a toast action, which keeps its corners at every preset |
| `--wpds-border-radius-xs` (1px) | Elements nested inside controls | Nothing of godmin's own |

A surface inside another takes a smaller step than the one around
it, as WordPress asks. A log list on the canvas takes `lg` inside the
`xl` of the canvas.

Below `EDGE_BREAKPOINT` the canvas meets the screen edges and its
corners are square. [Breakpoints](./layout.md#breakpoints) gives that
width. A bleed canvas, the mode with no padding, keeps the same
corners as a padded one. [The canvas](./layout.md#the-canvas) explains
both modes.

## Corners that never change

These shapes are fixed in the stylesheet. They stay the same at every
preset.

| Surface | Corner |
| --- | --- |
| An `InitialsAvatar`, and the picture inside it | A circle, `50%` |
| The DataViews media box around an avatar | A circle, `50%` |
| A `MenuCount` | Half its height. That makes the count a pill, a box with fully round ends |
| The navigation drawer | Square, `0` |
| The thumb of the sidebar scrollbar, the part you drag | 8px |

The drawer is the panel that holds the sidebar on a small screen.
DataViews is the WordPress list component.

## The corner radius setting

`AdminRoot` takes a `cornerRadius` prop and hands it to the design
system theme provider. Its value is a preset, a named amount of
roundness. One preset sets all five radius steps:

| Preset | `--wpds-border-radius-xs` | `--wpds-border-radius-sm` | `--wpds-border-radius-md` | `--wpds-border-radius-lg` | `--wpds-border-radius-xl` |
| --- | --- | --- | --- | --- | --- |
| `none` | 0px | 0px | 0px | 0px | 0px |
| `subtle` | 1px | 2px | 4px | 8px | 12px |
| `moderate` | 6px | 8px | 12px | 16px | 20px |
| `pronounced` | 18px | 20px | 22px | 24px | 26px |

Without the prop the preset is `subtle`.

```tsx
<AdminRoot cornerRadius="moderate">
	<YourApp />
</AdminRoot>
```

`AdminRoot` renders the root theme provider, the one that also themes
the whole document. So the preset also reaches the dialogs, menus and
popovers that the design system draws outside the `AdminRoot`
element. The theme providers of `Frame.Root` and `Frame.Canvas` set
only colors, so the sidebar and the canvas take the preset from
`AdminRoot`.

The band of notices at the top of a bleed canvas always takes `none`.
Its notices run edge to edge as square strips. On a padded canvas the
notices take the same preset as the canvas around them.
[Notices for the whole
application](../framing-an-application.md#notices-for-the-whole-application)
shows how to pass them.

The toast region keeps the corners of the WordPress snackbar at every
preset `AdminRoot` sets.
[Colors, corners and shadow](./toasts.md#colors-corners-and-shadow)
gives them.

`renderAdmin` from `@gopherium/godmin/testing` takes the same
`cornerRadius`, so a test can draw a screen under any preset.

## Elevation

WordPress names four levels of elevation: extra small, small, medium
and large. The higher the level, the more a surface asks for
attention. A dialog sits at the top. godmin draws three shadows that
show depth:

| Surface | Shadow |
| --- | --- |
| The canvas | `0 1px 2px rgb(0 0 0 / 0.08)`. None below `EDGE_BREAKPOINT` |
| A toast | The WordPress small elevation, the one the snackbar uses. [Colors, corners and shadow](./toasts.md#colors-corners-and-shadow) writes out its four layers |
| The navigation drawer | `2px 0 8px rgba(0, 0, 0, 0.2)`, the shadow of the phone sidebar in WordPress's new admin |

A bleed canvas keeps the canvas shadow. The sidebar has no shadow.
Dialogs, menus and popovers keep the shadow their design system
package draws, because godmin sets none for them.

Two more shadows draw a line, not depth:

- Below `DENSE_BREAKPOINT` the actions column of a `godmin-table`
  inside a `godmin-table-scroll` box stays pinned while the other
  cells scroll. Its edge is an inset shadow, one drawn inside the
  box: `--wpds-border-width-xs` (1px) of
  `--wpds-color-stroke-surface-neutral`. It sits on the side that
  faces the other cells, in a right-to-left page too. The table
  merges the borders of its cells, and a merged border paints badly
  on a pinned cell. [Stylesheet helpers](../screens.md#stylesheet-helpers)
  shows the table markup.
- A focused toast with no action draws its focus ring as a shadow, as
  [keyboard](./toasts.md#keyboard) on the toasts page shows.
  [The focus ring](./accessibility.md#the-focus-ring) covers the
  other focus rings.

godmin also takes one shadow away. It drops the dark ring DataViews
draws around its media box when the box holds an avatar.
[Avatars](../lists.md#avatars) explains why godmin rounds that box and
drops its ring.
