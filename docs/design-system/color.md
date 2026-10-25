---
title: Color
description: The three seed colors behind every godmin screen, the design token that paints each part, and the contrast the tests hold.
---

godmin does not pick a color for each part of the screen. It picks three seed colors and hands them to the theme provider. The theme provider is the `ThemeProvider` component of `@wordpress/theme`. A seed is a color you choose. The theme provider works out the other colors from the seeds, such as the grey of a line or of muted text. Each part of the screen then paints with a design token. A design token is a named value, such as `--wpds-color-background-surface-neutral-weak`, that the theme provider fills in. A few parts use a [raw color on purpose](#raw-colors-on-purpose).

## The three seeds

| Seed | Prop | Default |
| --- | --- | --- |
| Chrome | `chromeColor` on `Frame.Root` | `{ background: '#26292b' }` |
| Canvas | `canvasColor` on `Frame.Root` | `{ background: '#fcfcfc' }` |
| Accent | `color` on `AdminRoot` | `{ primary: '#3858e9' }` |

- The chrome is the part of the frame around the canvas: the sidebar, or on a small screen the top bar and the drawer its menu button opens. Its dark seed is godmin's own.
- The canvas is the panel that shows the current screen. Its seed is the design system's default background.
- The accent is the design system's own blue. It paints the brand tokens, such as `--wpds-color-foreground-interactive-brand`. It also paints the focus ring, `--wpds-color-stroke-focus`. The focus ring is the outline that shows which control has keyboard focus.

Each prop takes the color object of the theme provider, with a `background`, a `primary` or both. A seed must be fully opaque, such as a hex value. The theme provider throws an error on a see-through one.

A theme that names only one seed takes the other from the theme around it. With no theme around it, it takes the design system's default. So the chrome and the canvas keep the accent of `AdminRoot`. A `chromeColor` alone leaves the canvas on its default seed.

The status colors, such as the red of an error, come from the design system's own seeds. No prop changes them.

A product changes colors through these three props only. [Coloring the regions](../framing-an-application.md#coloring-the-regions) gives the greys the default seeds draw. It also says which theme dialogs and menus take.

## Which token paints each part

The [frame](./layout.md#the-frame) sets two themes. A theme is the set of token values that its seeds give. The chrome theme covers the whole frame. The canvas theme covers the canvas inside it. So one token can be dark in the sidebar and light on the canvas. The drawer opens inside the frame, so it keeps the chrome theme. The page body under the frame reads the theme of `AdminRoot`.

| Part | Token |
| --- | --- |
| Page body | `--wpds-color-background-surface-neutral` |
| Sidebar, top bar and drawer | `--wpds-color-background-surface-neutral-weak` |
| Canvas | `--wpds-color-background-surface-neutral-strong` |
| Text | `--wpds-color-foreground-content-neutral` |
| Muted text, such as the `footerNote` line of the sidebar | `--wpds-color-foreground-content-neutral-weak` |
| Line between parts, such as above the sidebar footer | `--wpds-color-stroke-surface-neutral` |
| Lighter line, such as under the page tabs or between the rows of a `godmin-table` | `--wpds-color-stroke-surface-neutral-weak` |
| Sidebar row | `--wpds-color-foreground-interactive-neutral-weak`, and `--wpds-color-foreground-interactive-neutral-weak-active` under the pointer or with focus |
| Current sidebar row | `--wpds-color-foreground-interactive-neutral-weak-active` on `--wpds-color-background-interactive-neutral-weak-active` |
| Menu button of the top bar | `--wpds-color-foreground-content-neutral`, and `--wpds-color-foreground-interactive-brand` on `--wpds-color-background-interactive-neutral-weak-active` under the pointer or with keyboard focus |
| Focus ring | `--wpds-color-stroke-focus` |
| Count pill | a `--wpds-color-foreground-interactive-neutral-strong` digit on `--wpds-color-background-thumb-brand` |

The count pill is the small number beside a sidebar row, as [a count beside a row](../framing-an-application.md#a-count-beside-a-row) shows. Page tabs and the `godmin-table` paint with design tokens too. [PageTabs](../screens.md#pagetabs) and [Stylesheet helpers](../screens.md#stylesheet-helpers) describe how they look.

The canvas also hands its surface to DataViews, the WordPress list component. `AdminRoot` hands the accent to DataViews and `@wordpress/components`. [The canvas colour](../lists.md#the-canvas-colour) and [the accent colour](../lists.md#the-accent-colour) explain both.

## Contrast

A contrast ratio says how far apart two colors are in lightness. The lowest is 1 to 1, a color on itself. The highest is 21 to 1, black on white. godmin's tests measure it the way WCAG does. WCAG is the Web Content Accessibility Guidelines, the common standard for accessible web pages. The tests hold two minimums:

- Text reaches 4.5 to 1 against what is behind it. The tests check the digit of the count pill in the sidebar and on the canvas, on the default seeds.
- A shape a reader must see reaches 3 to 1 against the surface around it. The tests check the count pill on the sidebar, the drawer, the current sidebar row and the canvas, on the default seeds.

The theme provider also checks contrast when it works out colors from a seed. It may make a seed lighter or darker to reach its targets.

## Raw colors on purpose

A raw color is a value written out, such as `#fff`, in place of a token. It stays the same whatever the seeds. `base.css` writes a few on purpose:

- The toast box is `rgb(0 0 0 / 0.85)`, a black that lets a blur of the page show through. Its text and its focus lines are `#fff`. These are the colors of the WordPress snackbar. [Toasts](../loading-and-feedback.md#toasts) describes the rest of the toast.
- The backdrop is the dark layer behind the open drawer. It is `#000` at 0.5 opacity, as in the new WordPress admin. godmin sets the opacity through `--backdrop-opacity`. The `@wordpress/ui` drawer fades its black backdrop to that value, so the fade in and out still run.
- Shadows are black at a low opacity. [Elevation](./radius-and-elevation.md#elevation) lists them.
- The `#000` in `--godmin-page-tabs-fade` and `--godmin-page-tabs-fade-both` is a mask. The mask fades the ends of a long row of tabs. It paints nothing.

The initials avatar paints from a palette of its own, a circle color and a letter color for each entry. [Avatars](../lists.md#avatars) gives the palette and its contrast.

## No dark mode, no overrides

- godmin has no dark mode. The theme provider has no light or dark switch. The seeds decide the look. A dark chrome seed gives a dark chrome. A light canvas seed gives a light canvas.
- Never set a design token in your own stylesheet. The theme provider owns those values. Pass another seed instead. A stylelint rule catches a stylesheet that sets one, as [Lint your stylesheets](../build-and-versioning.md#lint-your-stylesheets) shows.
