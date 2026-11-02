---
title: Accessibility
description: The rules godmin keeps for people who use a keyboard or a screen reader, from the focus ring and landmarks to what is spoken and how text may grow.
---

Some people never touch a mouse. They move through a page with the
keyboard, or listen to it with a screen reader. A screen reader is
software that reads the page aloud and lets its user jump between
headings, landmarks and controls. This page lists the rules godmin's
parts keep for those readers. A screen of your own keeps the same
rules when it draws with those parts and the design tokens.

## Contrast

Text has to stand out from what sits behind it. The stylesheet paints
text with design tokens, such as
`--wpds-color-foreground-content-neutral`. The theme works out those
tokens from the seed colors a product passes in. Only two parts keep
fixed colors for their text, the toast and the initials avatar.
[Contrast](./color.md#contrast) explains the contrast ratio, the
minimums godmin's tests hold and the parts they check.
[Avatars](../lists.md#avatars) gives the contrast of the avatar
letters.

## The focus ring

Focus marks the control the keyboard acts on. The reader moves it
with Tab, and Enter presses the control that holds it. godmin draws
its own rings only when the reader uses the keyboard, the state CSS
calls `:focus-visible`. A mouse click draws none of them. A checkbox
or a button from `@wordpress/components` draws WordPress's own focus
style on any focus, a mouse click included.

Except on a toast and a list region, every ring godmin draws is the
same line,
`outline: var(--wpds-border-width-focus) solid var(--wpds-color-stroke-focus)`.

- `--wpds-border-width-focus` (2px) sets the width. On a high density
  screen, one that packs two or more device pixels into each CSS
  pixel, it is 1.5px.
- `--wpds-color-stroke-focus` sets the color. The theme works it out
  from the accent seed.

| Part | Where the ring sits |
| --- | --- |
| A sidebar row, and Back on a sidebar screen | Outside the part, as far out as the ring is wide. A row's ring paints over the row below it |
| The menu button of the top bar | Inside the button |
| The title link of a `godmin-table`, a `godmin-table-scroll` box and a row of `RepeatRows` | 2px outside the part |
| A page tab | Around its label, not around the whole height of the tab |
| A toast | Its own rings, as [keyboard](./toasts.md#keyboard) on the toasts page shows. A plain toast keeps the browser's ring too |
| A list region a run focuses | Inside its edge, twice as wide, the ring WordPress draws on a region it focuses, as [after a write of your own](./lists.md#after-a-write-of-your-own) shows. The browser's ring is off, as in wp-admin |

godmin turns the browser's own ring off in four places only. A page
tab draws its own ring around the label instead. Back draws none on a
mouse focus. The toast region draws none. Tab never stops on it, and
only a toast that leaves or a click on a toast focuses it. A list
region draws the WordPress region ring instead, as wp-admin turns the
browser's ring off on every `div`. Draw a ring of your own with the
same line, on `:focus-visible`, so it matches.

## Where focus goes

In the sidebar menu, a drilldown row is a row that opens a sub menu.
The drawer is the panel that holds the sidebar on a small screen. The
sidebar moves focus in these cases only:

| The reader | Focus goes to |
| --- | --- |
| Opens a sub menu with a drilldown row | Back. On a screen with no Back, the first control the Tab key reaches. On a screen with no control, the screen itself, so focus stays in the sidebar |
| Presses Back | The drilldown row that opened the sub menu, even after the reader opened pages inside it. When that row is gone, or the sub menu opened another way, the first control of the screen Back lands on |
| Opens a page with any other link | Nowhere. The sidebar moves no focus |
| Closes the drawer with Escape or its close button | The menu button |

The title of a sidebar screen never takes focus.

Some parts go away, or turn inert, while they hold focus. godmin then
moves focus to a part that stays, so the keyboard reader keeps their
place:

- A toast that leaves, as [keyboard](./toasts.md#keyboard) on the
  toasts page says.
- A list row that a run moved. The list region takes the focus and
  the screen does not scroll, as
  [running an action over the picked rows](../lists.md#running-an-action-over-the-picked-rows)
  says.
- The table or the footer of a list, with its rows and the busy bulk
  action button, which turn inert as a run reloads the list. The list
  region takes the focus at once, where WordPress drops it to the
  page, and the screen does not scroll either, as
  [after a write of your own](./lists.md#after-a-write-of-your-own)
  says. While the list reloads, the next Tab from the list region
  goes to the first control of the list, such as its search field.
- A row of `RepeatRows` that the reader removed, as
  [RepeatRows](../screens.md#repeatrows) says.

Once a list reloaded after a run, while its region still holds the
focus, the focus goes back to the control the reader pressed, or to
the one that opened the confirm or the row's actions menu. When that
control left with its row, the focus goes to the first control of the
row now in its place, its checkbox in a list with bulk actions. It
stays on the region when no such control is left, or when that control
is a primary action from `actions`. DataViews names that checkbox after
the view's `titleField`, so a screen reader says the title of the row
now in that place, then checkbox and its state, checked or not
checked, and a second Enter does nothing. The next Tab then goes on
from that control, as
[running an action over the picked rows](../lists.md#running-an-action-over-the-picked-rows)
says.

A list with no bulk actions draws no checkbox. Its title takes the
focus when the title opens the item, and a screen reader says the
title of that row. The row's actions menu button takes it when that
comes first, since Enter there only opens a menu. The button of a
primary action, such as a Trash, says the action and not the row,
so a screen reader would say "Trash, button", and a second Enter
would act on a row the reader never picked. So the region keeps the
focus there. The focus does not move, so a screen reader has no new
name to say. A second Enter writes nothing, and the next Tab goes to
the first control of the list, such as its search field.

WordPress leaves the focus on the page, where nothing shows and no
control is named. godmin goes beyond it so a keyboard reader sees
where they are and a screen reader has a control to name, or stays on
the region when that control is a primary action.

Dialogs move focus as they open and close, as
[a confirm outside a list](../lists.md#a-confirm-outside-a-list) and
[a form dialog](../lists.md#a-form-dialog) explain. When the list
drew the row a dialog opened from anew while the dialog was open,
`useFocusBack` puts the focus back on that row, or on the list once
the row left it, as
[putting the focus back on a row](../lists.md#putting-the-focus-back-on-a-row)
explains.

## Landmarks and names

A landmark is a part of the page with a role, such as `main`, and
often a name. A screen reader lists the landmarks, so its user can
jump straight to one.

| Part | Role | Name |
| --- | --- | --- |
| The canvas | `main` | None |
| The sidebar on a wide screen, menu and footer together | `region` | "Navigation", or the `label` of `Frame.Sidebar` |
| The drawer on a small screen | `dialog` | "Navigation", whatever `label` says |
| The tabs of a page | `navigation` | The `label` of [`PageTabs`](../screens.md#pagetabs) |
| The list of a list page | `region` | The `listLabel` of [`Page`](../screens.md#page), when given |
| The details of a record page | `region` | The `asideLabel` of [`Page`](../screens.md#page), when given |
| The breadcrumbs of a page | `navigation` | The `label` of [`PageBreadcrumbs`](../screens.md#pagebreadcrumbs) |

The sidebar menu draws no landmark of its own, and the drawer holds
no region. So a screen reader meets the sidebar under one name only.
[The sidebar](../framing-an-application.md#the-sidebar) shows how to
pass `label`.

Every control godmin draws is named in words. A glyph, a small
picture such as an icon, is never the name:

- Every icon godmin draws itself, such as a row icon, a chevron, the
  Back glyph or the menu glyph, is hidden from screen readers. The
  control around it carries the name.
- The initials avatar is hidden, because the name beside it already
  says who it is.

The current page carries `aria-current="page"`. A sidebar row draws
its highlight from that mark, so what the eye sees and what a screen
reader hears always match. A page tab draws its underline from its
`current` prop, which sets the same mark. A router link can set the
mark on its own too, so [PageTabs](../screens.md#pagetabs) says how
to keep the underline and the mark in step.

Some screen readers stop treating a list with no bullets as a list.
So the sidebar rows, the page tabs and a log list keep
`role="list"`.

## What a screen reader hears

godmin gives a sentence for the ear wherever the eye gets a shape, a
glyph or a bare number. A list that loads is the one exception, as
in WordPress. Visually hidden text is text on the page that
only a screen reader meets. Some things appear without the reader
moving to them, such as a toast or a loading screen. A screen reader
learns of those through a live region, a part of the page it reads
aloud when it changes.

| Part | What a screen reader hears | Set up in |
| --- | --- | --- |
| A toast | Its message, politely. Never its action | [What a screen reader hears](./toasts.md#what-a-screen-reader-hears) |
| A loading screen | The `label` sentence, from a visually hidden status. The spinner is hidden | [What a screen reader hears](./loading.md#what-a-screen-reader-hears) |
| A list that loads | Nothing on its first load, as in WordPress. A table or a grid is marked busy on a later load | [What a screen reader hears](./loading.md#what-a-screen-reader-hears) |
| A list after a run | The control the focus went back to. After the pressed row left, the checkbox of the row now in its place, by that row's title. With no checkbox, that row's title or actions menu button, and nothing new when the region keeps the focus | [Where focus goes](#where-focus-goes) |
| A count beside a row | The `label` sentence, in place of the bare number | [A count beside a row](../framing-an-application.md#a-count-beside-a-row) |
| An `ErrorNotice` | Its message, at once, as an alert | [ErrorNotice](../screens.md#errornotice) |

Polite means the screen reader first finishes what it is saying. An
alert breaks in at once. Keep `ErrorNotice` for a failure that has to
stay on screen until the reader acts, as
[what goes in a toast](../loading-and-feedback.md#what-goes-in-a-toast)
explains. [Announcements](../testing.md#announcements) shows how a
test reads what was spoken.

## Headings

A heading is a title marked up as one, from `h1` down. A screen reader
can list a screen by its headings and jump between them, so every
title godmin draws is a real heading, `h1` to `h4`.
[The heading outline](./typography.md#the-heading-outline) gives the
level each title takes. A title keeps its size when its level
changes.

## Reduced motion

A reader can ask the system for less motion. Every animation in the
godmin stylesheet then gets shorter or stops.
[Reduced motion](./motion.md#reduced-motion) says what each one does.

## Text length and language

godmin draws a few words of its own, such as Back and Navigation, and
translates them.
[godmin's own words](../framing-an-application.md#godmins-own-words)
lists them and the languages they ship in. The props `label`,
`menuLabel` and `backLabel` put your own words in their place. One
default stays in English: the hint a toast with no action gives a
screen reader, until you pass `dismissLabel`, as
[what a screen reader hears](./toasts.md#what-a-screen-reader-hears)
says. Every other word comes from your app, such as the `label` of a
loading screen or a count. Pass each one through your translations.

A translated label may be longer than the English one, so godmin
gives no label a fixed width:

- A sidebar row label takes the room its icon, count and chevron
  leave. A longer label wraps, and the row grows, since the row sets
  only a smallest height.
- A long title on a sidebar screen breaks onto the next line.
- A toast grows with its message, then wraps, as
  [size](./toasts.md#size) on the toasts page shows. Both columns of
  a record page and a log list break a long word the same way.
- The actions of a page header move under the title once they no
  longer fit beside it. Beside breadcrumbs the title ends in an
  ellipsis instead. A form row and the header line of a log list
  wrap the same way.
- The page tabs keep each label on one line. A tab row too long for
  its page scrolls and fades the edge it cuts.

In a right-to-left language the chevrons, the sub menu slide and the
fade of the tab row turn around, as
[right-to-left languages](./layout.md#right-to-left-languages)
explains.
