---
title: Record pages
description: How a page that shows one record sets its header, its main work and its details, which part grows, when the details move under the main work, what scrolls, and what shows while the record loads.
---

A record page shows one thing, such as one invoice, on a page of its
own. Its main work takes the room and its details sit in a fixed
column at the end, as on WordPress's newer screens.
[Page](../screens.md#page) shows how to set one up. This page gives
every value of how it looks.

## What goes where

- The main work is what grows and what the reader came to do, such as
  the lines of an invoice, its history or its notes. A long text the
  reader writes, such as a description, goes here too.
- The details are the record's own short fields and facts, such as
  its customer, its dates and its status.
- One header runs across both columns, on one surface. No line, box
  or shadow marks the details. The space between the columns sets
  them apart.

## The page header

- The title row is at least `--wpds-dimension-size-md` (32px) tall,
  even with no actions, so the title sits in the same place on every
  page. A compact button is as tall as the row. A button of the
  default size makes the row taller.
- The title shows the edited value, so it follows the field as the
  reader types. When the field is empty, fall back to a word such as
  "Untitled".
- The subtitle is `body-md` in
  `--wpds-color-foreground-content-neutral-weak`, with
  `--wpds-dimension-padding-xs` (4px) under it.
- Breadcrumbs sit before the title, on its line. Each link is
  `body-lg`. A slash in `--wpds-color-stroke-surface-neutral` follows
  it, `--wpds-dimension-gap-sm` (8px) from the text on each side.
- Beside breadcrumbs the row never wraps. The title stays on one line
  and ends in an ellipsis when it does not fit. The links and the
  actions keep their width.
- Every page opened from a list takes breadcrumbs, a create page too.
- Save comes last in the row. A menu with Delete, named "More
  options", comes before it.

## The two columns

- The main work takes all the room the details leave. It has no cap.
  Beside the details its content is never narrower than
  `--wpds-dimension-surface-width-md` (400px), and its box adds
  `--wpds-dimension-padding-xs` (4px) at each side.
- The details are `--wpds-dimension-surface-width-md` (400px) wide, at
  the end of the page, which is the right in English. Their box adds
  `--wpds-dimension-padding-xs` (4px) at each side, so it measures
  408px.
- The columns sit `--wpds-dimension-gap-xl` (24px) apart, from the
  content of one to the content of the other. The
  `--wpds-dimension-padding-xs` (4px) at each side is part of that gap.
- Each column keeps `--wpds-dimension-padding-xs` (4px) of room at
  each side, inside its box, since a box that scrolls clips what
  draws past its edge and a focus ring would lose its sides. Its
  content still meets the edges of the page title.
- Inside each column the parts sit `--wpds-dimension-gap-lg` (16px)
  apart.
- Both columns break a long word, with `overflow-wrap: anywhere`, so
  it cannot push the page wider.

## When both do not fit

- The columns sit side by side while the page is at least 824px wide,
  which is both columns and their gap. No breakpoint decides this,
  only the page's own width.
- Below that the details move under the main work,
  `--wpds-dimension-gap-xl` (24px) apart, and both fill the page. The
  reading order stays the same.
- The page does not narrow steadily as the window does, since the
  sidebar folds at `SIDEBAR_BREAKPOINT` and the canvas drops its
  margin at `EDGE_BREAKPOINT`. So a window just below
  `SIDEBAR_BREAKPOINT` can show two columns where a wider one shows
  one.
- An `aside` that renders nothing takes no room, and the main work
  fills the page.
- On a narrow page the details come after everything in the main
  work. Show the first rows of a long list with
  [`LoadMore`](../screens.md#loadmore), so a reader can reach them.

## What scrolls

- The page header stays. While the columns sit side by side each one
  scrolls on its own under it, with `overflow: hidden auto`, so the
  details stay beside the row a reader is on.
- A column stops at the room under the header. A short column stops
  at its own end and shows no scrollbar.
- Once the details move under the main work, both scroll together as
  one box, and neither scrolls alone, so a phone reader meets one
  scrollbar and not two stacked ones.
- A line `--wpds-border-width-xs` (1px) wide in
  `--wpds-color-stroke-surface-neutral-weak` runs under the header to
  the canvas edges. Under page tabs their own line takes its place.
- Each column keeps `--wpds-dimension-padding-lg` (16px) above its
  content, inside the part that scrolls, so a row scrolls away at the
  line.
- The columns reach the foot of the canvas, and each keeps
  `--godmin-canvas-gutter-block` under its last line.
- A page with no `aside` scrolls the canvas, as
  [the canvas](./layout.md#the-canvas) says.
- The columns scroll on their own only when the `Page` sits directly
  in the canvas. Inside a wrapper of your own, or outside a frame, the
  record takes its full height and whatever holds it scrolls.
- A keyboard scrolls a column from a control inside it, so keep one
  there, such as a link or a field.

## What the details hold

- A section is a `SectionTitle` and what follows it, with no box
  around it and no line between sections.
- Fields sit one under the other with their label on top, in a
  `godmin-form`, as in WordPress's media editor.
- Facts follow the fields, as rows of a label and a value. A
  `DataForm` with the `panel` layout and `readOnly` fields draws them.
  Load the `@wordpress/dataviews` and `@wordpress/components`
  stylesheets. The label takes 38% of the row, and the value shows in
  the weak text color at the default weight.
- One fact alone, such as the day a record was made, is a muted
  sentence.
- A long list or a table goes in the main work.

## Forms on a page

- A stacked `godmin-form` stops at
  `--wpds-dimension-surface-width-lg` (560px), also in a wider main
  work column, and its fields sit `--wpds-dimension-gap-md` (12px)
  apart.
- In a `godmin-form__row` each field starts from two thirds of
  `--wpds-dimension-surface-width-xs` (240px), which is 160px, and
  the fields share the rest of the line.

## Saving

- On a page with an `aside`, one Save button in the page header
  serves the record's fields in both columns. It is compact and reads
  "Save". A page with no `aside` keeps its Save at the end of the
  form, since its title scrolls away.
- It stays off until something changes and while the record saves,
  and a keyboard can still reach it. Say both, as in
  `disabled={!changed || saving}`, since `loading` alone turns it off
  only when `disabled` is not given. While the record saves it shows
  its loading state and the fields stay in place, turned off.
- A change that saved and a write that failed each show a toast, as
  [what goes in a toast](../loading-and-feedback.md#what-goes-in-a-toast)
  says. Name what failed, then give the server's words, as in
  `Could not save the invoice. The customer is closed.`
- A server message about one field shows under that field.
- A check made before sending shows under its field. Move the focus
  to the first field that failed, so it comes into view inside its
  column.
- A row added to a list, such as a note, keeps its own button and
  saves at once.
- While the record holds unsaved work, warn on `beforeunload`, and
  ask before a link in the app leaves the page, such as a breadcrumb.

## While a record loads

- While nothing of the record is known, the page shows its header and
  one `LoadingScreen`, with no `aside`.
  [A screen](./loading.md#a-screen) gives how it looks. Breadcrumbs
  stay, and the title names the kind of record.
- A part that loads on its own shows its `LoadingScreen` in its
  column, at the top and centred across that column.
- Show one `LoadingScreen` at a time, since each one speaks.
- A record that could not load shows an `ErrorNotice` under the
  title, with no `aside`. Breadcrumbs stay, and the title still names
  the kind of record.

## What a screen reader hears

- `asideLabel` makes the details a named region, as
  [landmarks and names](./accessibility.md#landmarks-and-names)
  lists.
- `PageBreadcrumbs` is a navigation region named by its `label`. The
  slash is hidden.
- The main work comes first in the reading order at every width.
