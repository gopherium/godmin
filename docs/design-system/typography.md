---
title: Typography
description: The font, the type scale godmin sets its titles and body text in, and the heading outline of a screen.
---

godmin sets its text with the design system's typography tokens. A
token is a named value that the design system ships as a CSS custom
property, such as `--wpds-typography-font-size-md`. CSS reads it with
`var()`. This page names each token and gives its value in brackets.
[Which token paints each part](./color.md#which-token-paints-each-part)
gives the color of each text.

## The font

The `body` rule in `base.css` sets the whole page in
`--wpds-typography-font-family-body`. The design system draws its
headings in `--wpds-typography-font-family-heading`. Both tokens hold
the same system font stack. That is a list of fonts the browser tries
in order, starting with the font the device uses for its own menus
and windows. Every rule in `base.css` that names a font names the
body font.

## The type scale

Each text has a size, a line height and a weight. The line height is
the height of one line of text. godmin's titles and body text follow
five styles.

| Style | Size | Line height | Weight |
| --- | --- | --- | --- |
| Sidebar screen title | `--wpds-typography-font-size-xl` (20px) | `--wpds-typography-line-height-xl` (32px) | Emphasis |
| `heading-lg`, for a page, section or empty list title | `--wpds-typography-font-size-lg` (15px) | `--wpds-typography-line-height-sm` (20px) | Emphasis |
| `heading-md`, for a section title inside a section | `--wpds-typography-font-size-md` (13px) | `--wpds-typography-line-height-sm` (20px) | Emphasis |
| `body-md`, for body text | `--wpds-typography-font-size-md` (13px) | `--wpds-typography-line-height-sm` (20px) | Default |
| `body-sm`, for small text such as the time of a log item | `--wpds-typography-font-size-sm` (12px) | `--wpds-typography-line-height-xs` (16px) | Default |

`heading-lg`, `heading-md`, `body-md` and `body-sm` are variants of
`Text`, the design system's text component. A variant sets the size,
the line height and the weight together. `Text` takes `body-md` when
it is given none. `base.css` sets the sidebar screen title itself.

The design system has two weights.
`--wpds-typography-font-weight-default` (400) is for body text.
`--wpds-typography-font-weight-emphasis` (600) is for titles and for
what stands out, such as the sidebar row of the page on screen. The
table calls them default and emphasis.

The smallest size, `--wpds-typography-font-size-xs` (11px), is for
small labels such as the count beside a sidebar row.

Some parts give the size of their text on their own page:
[the page subtitle](../screens.md#page),
[the page tabs](../screens.md#pagetabs),
[the title and description of a list row](../lists.md#the-title-field),
[a table that stays custom](../lists.md#lists-that-stay-custom),
[a toast](../loading-and-feedback.md#toasts) and
[the letter of an avatar](../lists.md#avatars).

## The heading outline

The heading outline is the list of headings a screen reader offers to
jump between, from `h1` down. A `NavigationScreen` draws its title as
the `h1`, as in the WordPress Site Editor. So the sidebar menu decides
which title is the `h1`. Below, with a sidebar means the sidebar shows
a `NavigationScreen`.

| Title | Without a sidebar | With a sidebar |
| --- | --- | --- |
| Sidebar screen title | None | `h1` |
| Page title | `h1` | `h2` |
| Section title | `h2` | `h3` |
| Section title inside a section | `h3` | `h4` |
| Empty list title | `h2` | `h3` |

With a sidebar, pass `headingLevel={2}` to each `Page`. Every title
inside it then moves one level down. Only the element changes. Each
title keeps its size, so a section looks the same on both kinds of
screen. [Heading levels](../screens.md#heading-levels) shows the code.

On a small screen the sidebar sits in the drawer, and its title is
the `h1` while the drawer is open. The brand in the top bar is not a
heading. So while the drawer is shut, the screen has no `h1`.
WordPress's new admin works the same way.
