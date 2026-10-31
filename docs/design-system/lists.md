---
title: Lists
description: How a list meets the canvas edges, which columns it shows at each width, how a wide table scrolls, how its rows look, what an empty list shows, and what a list does after a write of your own.
---

A list page holds a DataViews list, as WordPress's new admin holds
its lists. [Lists with DataViews](../lists.md) shows how to set one
up. This page gives every value of how a list looks.

## A list page

- The list reaches the left, right and bottom edges of the canvas.
  DataViews pads its toolbar, its table and its footer by
  `--wpds-dimension-padding-2xl` (24px) on each side, so the rows
  start where the page title starts and the row lines run from edge
  to edge, as in WordPress.
- The title row of a list page pads by `--wpds-dimension-padding-2xl`
  less the canvas gutter. Where the gutter is narrower than the list's
  own padding, the title still lines up with the list.
  [The canvas](./layout.md#the-canvas) gives the gutter.
- A notice or any other part before the list lines up with the title,
  `--wpds-dimension-padding-2xl` in from the canvas edge.
- The list region keeps `--wpds-dimension-gap-lg` (16px) between a
  notice and the list.
- Under page tabs the search box sits 16px under the tab line, the top
  padding of the DataViews toolbar. The list takes back the page gap,
  `--wpds-dimension-gap-lg`, so the two do not add up.
- The footer rests on the bottom edge of the canvas. Only the rows
  scroll. The title, the tabs, the toolbar and the column headers stay.

## Columns

- A list opens on the same columns at every width from
  `EDGE_BREAKPOINT` (782px), as WordPress lists do. godmin hides no
  column because the window is narrow. A reader adds and removes
  columns in View options.
- From `DENSE_BREAKPOINT` (640px) up to `EDGE_BREAKPOINT` itself the
  table keeps them too. There DataViews shows each row's actions in
  its Actions menu only, and its bulk actions as icons.
- Below `DENSE_BREAKPOINT` a list from `useListView` shows its phone
  layout, the DataViews list layout, with the fields `phoneFields`
  names.
- In a table the title column takes the free room. DataViews sets
  every other column as wide as its content, on one line.

## A wide table

When its columns need more room than the list has, a table scrolls
sideways inside the list. The toolbar and the footer stay where they
are. `Page` marks such a list region `godmin-page__list--wide`.

- The actions column stays pinned to the end edge. While a column
  hides under it, a 1px line in
  `--wpds-color-stroke-surface-neutral-weak` marks its other side.
  DataViews draws both.
- Wider than `EDGE_BREAKPOINT`, a table with checkboxes keeps the
  checkbox column and the title column frozen at the start edge, as
  in Jetpack Forms. The checkbox column is
  `--wpds-dimension-padding-2xl` plus `--wpds-dimension-size-sm`
  (24px) wide, 48px, and the title starts there.
- The title column keeps at least 280px and
  `--wpds-dimension-padding-2xl` free at its end, where a line
  `--wpds-border-width-xs` (1px) wide in
  `--wpds-color-stroke-surface-neutral-weak` marks it.
- The frozen cells paint the list background,
  `--wpds-color-background-surface-neutral-strong` unless your app
  sets `--wp-dataviews-color-background`, and on a selected row its
  tint, `--wpds-color-background-interactive-brand-weak-active`. So
  the cells that scroll pass under them.
- The frozen header cells stay over the rest of the header row, and
  the header row stays over the frozen cells of the rows that scroll
  up under it.
- A table that fits freezes nothing and draws no line after its title,
  as a WordPress table that fits. Nor does a table with no checkbox
  column, or one whose title the reader hid in View options.
- In a right-to-left page the frozen columns hold the right edge and
  the actions the left.

## Rows

DataViews draws the rows. On a list page godmin sets the title and
the description under it as the WordPress subscriber list does:

- The title is 13px and bold, on a line
  `--wpds-typography-line-height-sm` (20px) high.
- The description is a muted line in
  `--wpds-typography-font-size-sm` (12px), on
  `--wpds-typography-line-height-xs` (16px),
  `--wpds-dimension-gap-xs` (4px) under the title. A row with both is
  64px tall.
- A title on its own stays in the middle of a line
  `--wpds-dimension-size-md` (32px) high, level with the other cells
  of its row.
- The media of a row sits in the middle of the row.

## An empty list

- `ListEmpty` draws the design system empty state: an icon in a
  circle, the title, the description and the buttons, in a centred
  column at most `--wpds-dimension-surface-width-sm` (320px) wide,
  its parts `--wpds-dimension-gap-xs` (4px) apart. Its title is a
  `heading-lg` heading one level under the page title, as
  [the heading outline](./typography.md#the-heading-outline) shows.
- The icon sits in a circle filled with
  `--wpds-color-background-surface-neutral-weak`, ringed by a 1px
  `--wpds-color-stroke-surface-neutral-weak` line, with
  `--wpds-dimension-gap-xs` more space under it.
- Its buttons sit `--wpds-dimension-gap-md` (12px) under the
  description and `--wpds-dimension-gap-xs` apart, side by side from
  480px wide and one above the other below that. The add button keeps
  its default size.
- In a DataViews list it sits in the middle of the space between the
  toolbar and the bottom of the canvas, as DataViews centres what it
  shows in place of rows. The footer goes away while the list is
  empty. The search box and the filters stay.
- Anywhere else godmin keeps 48px free above and below it, a value of
  its own.
- A title of one short phrase ends with no full stop, such as "No
  reports yet". A description is a sentence and ends with one. A
  title of two sentences keeps its full stops, such as "You're set
  up. No reports yet."
- `ListNoResults` shows the search icon, "No results found" and "Try
  adjusting your search or filters to find what you're looking for."
- A status tab that holds nothing, such as Trash, shows words of its
  own, such as "Trash is empty", and no add button.

## After a write of your own

When a run over the picked rows changes them, as
[running an action over the picked rows](../lists.md#running-an-action-over-the-picked-rows)
shows:

- While the calls run, the bulk action button in the footer is busy.
  A row action with no dialog shows nothing yet, as in the WordPress
  Site Editor.
- As the first call that works ends, the list starts to reload, as
  in the WordPress Site Editor, while the other calls still run and
  the bulk action button stays busy. The old rows stay on screen and
  nobody can click them. If the reload takes longer than a moment,
  the rows pulse as on a later load. [A list](./loading.md#a-list)
  gives how long the list waits and how the pulse looks.
- When the focus sat in the table or the footer, such as on the busy
  button, the list region takes it as the list starts to reload, so a
  keyboard reader stays on the list, and the screen does not scroll.
  Here godmin goes beyond WordPress, which drops the focus to the
  page. A focus in the search field or the filters stays where it is
  while the calls run.
- As the last call ends, the toast shows, the busy button ends and a
  confirm closes. Once a row moved, the list region takes the focus,
  as [where focus goes](./accessibility.md#where-focus-goes) says,
  and here too the screen does not scroll. A reader who ran the action
  from a row near the bottom of the list, or from a confirm, still
  sees the rows they were on. While the list reloads, the next Tab
  from the list region goes to the first control of the list, such as
  its search field.
- When the reader started the run from the keyboard, the list region
  draws the ring WordPress draws on a region it focuses, from the
  moment it takes the focus: a line in `--wpds-color-stroke-focus`
  along the inside of its edge, twice as wide as
  `--wpds-border-width-focus` (2px), so 4px, or 3px on a high density
  screen, and a `--wpds-border-width-xs` (1px) line in
  `--wpds-color-background-surface-neutral-strong` just inside that.
  The ring paints over the table, its frozen cells and its pinned
  actions, and under every toast, menu and dialog. The region turns
  the browser's own ring off, `outline: none`, as wp-admin does on
  every `div`, so only this ring shows. A run started with a mouse
  click draws no ring on the region, since this ring shows only on a
  keyboard focus.
- The list asks for its new rows once the last call ended, as
  WordPress does. When they land, they replace the old ones at once.
- Once the new rows show, while the list region still holds the
  focus, the focus goes back to the control the reader pressed, or to
  the one that opened the confirm or the row's actions menu. When that
  control left with its row, the focus goes to the first control of the
  row now in its place, its checkbox in a list with bulk actions, such
  as the next row's checkbox, or the last row's when fewer came back.
  In a grid it goes to the first control of the card in that place.
  DataViews names the checkbox after its row, so a screen reader says
  the title of that row. In a list with no bulk actions the row draws
  no checkbox. Its title takes the focus when the title opens the
  item, and its actions menu button takes it when that comes first,
  since Enter there only opens a menu. When the first control of the
  row is a primary action from `actions`, such as a primary Trash, the
  region keeps the focus, whether or not the action opens a confirm.
  That button says the action and not the row, so a second Enter there
  would act on a row the reader never picked. From the region a second
  Enter writes nothing, and the next Tab goes to the first control of
  the list, such as its search field. The region also keeps the focus
  when no row came back, or the pressed button sat in a bulk bar that
  went with the ticked rows.
  After a run from the keyboard the ring shows on the control and the
  rows scroll to it when it is out of view. After a mouse click the
  region shows no ring and the rows stay where the reader left them.
  A checkbox, a `Button`, a title or a grid card's media button still
  draws WordPress's own focus style, which it draws on any focus. An
  item of the list layout shows only its row tint and a table media
  button shows nothing, since those two show a focus style only on a
  keyboard focus. Here godmin goes beyond WordPress, which leaves the
  focus on the page, where nothing shows. So the reader keeps their
  place and a keyboard reader sees it.
- When every call failed, the list shows no reload, as WordPress
  reloads only after a write that worked.
- No toast says that a write is still running. WordPress shows none
  for a list.

## Tables that stay custom

A `godmin-table` is drawn like the DataViews table, with two values of
godmin's own:

- Text in `--wpds-typography-font-size-md` (13px) on
  `--wpds-typography-line-height-sm` (20px) lines.
- Every cell pads by `--wpds-dimension-padding-md` (12px).
- A header cell pads by `--wpds-dimension-padding-sm` (8px) above and
  below, in `--wpds-typography-font-size-xs` (11px) capitals at
  `--wpds-typography-font-weight-emphasis`.
- A body cell is at least `--wpds-dimension-size-md` (32px) tall
  inside its padding.
- A line `--wpds-border-width-xs` (1px) wide in
  `--wpds-color-stroke-surface-neutral-weak` runs above each row.
- On a list page the first and last cells pad by
  `--wpds-dimension-padding-2xl` at their outer side, as DataViews
  does.
- godmin's own: a row takes
  `--wpds-color-background-surface-neutral-weak` under the pointer
  and while keyboard focus is inside it. DataViews tints no row.
- godmin's own: below `DENSE_BREAKPOINT` a table inside
  `godmin-table-scroll` scrolls sideways inside it. Its actions column
  stays pinned to the end edge, and an inset shadow
  `--wpds-border-width-xs` wide of `--wpds-color-stroke-surface-neutral`
  marks its other side at rest too. DataViews draws its own line in a
  weaker color, and only while a column hides under the actions, as
  [a wide table](#a-wide-table) shows. The table merges the borders of
  its cells, and a merged border paints badly on a pinned cell.
