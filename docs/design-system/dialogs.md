---
title: Dialogs
description: When an action asks first, how a confirm and a form dialog look and move, what happens while a write runs, where a failure shows, and what a keyboard or a screen reader meets.
---

A dialog stops the page to ask one thing. godmin draws two kinds on
the design system's own parts. A confirm asks one question before an
action, on the alert dialog. A form dialog holds a short form, on the
dialog. [Confirming an action](../lists.md#confirming-an-action) and
[a form dialog](../lists.md#a-form-dialog) show how to open them. This
page gives every value of how they look and behave.

## When to ask first

- An action that can be undone asks nothing. It runs at once and its
  toast offers Undo, such as moving an item to the trash.
  [Running an action over the picked rows](../lists.md#running-an-action-over-the-picked-rows)
  shows how a run offers it.
- An action that cannot be undone asks first, in a confirm with
  `intent="irreversible"`, and offers no Undo.
- A plain confirm asks before a large change that can be changed
  back, such as making an item the default.
- A dialog holds one task and one main button. A longer form belongs
  on a page.
- The steps of one task swap inside one dialog. Open a dialog from a
  dialog only when a confirm has to ask about a part of it.

## The words

- Every confirm has a title, the action as a short question, such as
  `Delete "Hello"?`, or `Delete 3 orders?` for several.
- The description says what will happen. When the action cannot be
  undone it ends with "This action cannot be undone."
- The confirm button names the action, such as "Delete permanently".
  The other button reads "Cancel".
- Never write "Are you sure" on an action that cannot be undone.
- An action label carries no ellipsis, as DataViews asks, whether it
  opens a dialog, such as "Delete", or runs at once, such as "Trash".

## Size and place

- A dialog is a card in the middle of the window at every width. It
  never turns into a sheet on a phone.
- It keeps `--wpds-dimension-padding-2xl` (24px) from each window edge
  while it can.
- A confirm is at most `--wpds-dimension-surface-width-lg` (560px)
  wide, and it has no other width.
- A form dialog takes the same width, and it has no other width
  either.
- It is never narrower than `--wpds-dimension-surface-width-sm`
  (320px), so on a 320px window it touches both edges.
- From 480px wide its floor is `--wpds-dimension-surface-width-md`
  (400px).
- It is at most as tall as the window less that same space twice.
  Only the body scrolls. The title and the buttons stay, and a 1px
  line shows beside them while text is hidden.

## Inside the card

- The corners take `--wpds-border-radius-lg` (8px), which follows
  [the corner radius setting](./radius-and-elevation.md#the-corner-radius-setting).
- A `--wpds-border-width-xs` (1px) border sits inside the width, and
  it is transparent over the dimmed page.
- A shadow of four layers sits under the card: `0 5px 15px` at 8%
  black, `0 15px 27px` at 7%, `0 30px 36px` at 4% and `0 50px 43px` at
  2%.
- The page behind is dimmed with `rgba(0, 0, 0, 0.35)`.
- The card keeps `--wpds-dimension-padding-2xl` (24px) inside that
  border at each edge.
- The title is `heading-xl`, at `--wpds-typography-font-size-xl`
  (20px). The body text is at `--wpds-typography-font-size-md` (13px).
- `--wpds-dimension-gap-lg` (16px) sits between the title and the
  body, and between the body and the buttons.
- The fields of a form dialog sit `--wpds-dimension-gap-lg` (16px)
  apart, its help sentence first.
- The buttons sit at the end, Cancel first,
  `--wpds-dimension-gap-sm` (8px) apart.
- In a confirm Cancel has no border and takes the neutral tone. The
  confirm button is solid in your accent color, or red with
  `intent="irreversible"`. No prop changes that red, as
  [the three seeds](./color.md#the-three-seeds) says.
- In a form dialog Cancel has an outline and takes the neutral tone,
  and the send button is solid in your accent color. A close icon
  sits beside the title. A confirm has no close icon.
- A word too long for the card, such as a long link in a server
  message, breaks at the card's edge. Every other word stays whole,
  so the labels of a grid or a row of fields keep their words.
- A button wraps as WordPress's buttons do. On a narrow phone a long
  label takes two lines, and a word wider than its button breaks
  inside it, so keep button labels short.

## Motion

- The dimmed layer appears at once, and fades out over
  `--wpds-motion-duration-md` (200ms) on `--wpds-motion-easing-subtle`.
- The card fades and grows from 0.9 of its size over the same time on
  `--wpds-motion-easing-expressive`.
- The card leaves the same way backwards. `onClose` runs once it has
  left.
- [Reduced motion](./motion.md#reduced-motion) shows it and takes it
  away at once.

## While a write runs

When `onConfirm` or `onSubmit` returns a promise, the dialog stays
open until it ends.

- The main button shows a spinner over its hidden label and keeps its
  width. No dialog shows a word such as "Deleting…" or "Saving…".
- Cancel and the close icon turn grey and stay reachable with Tab.
- Escape and the dimmed page close nothing, wherever the focus sits,
  so a failure always has a place to show. Give a write that can hang
  a timeout.
- The fields stay as you drew them. If one must wait, pass a function
  as the children of `FormDialog`. It gets `busy`, so set the field
  `readOnly` while the write runs. Never set it `disabled`, since a
  field that holds the focus would drop it out of the dialog.
- The main button ignores the second click of a double click, so a
  fast write is not sent twice. On a confirm a held Enter presses it
  once. A press or an Enter after the dialog started to close sends
  nothing.

## When a dialog closes

| What `onConfirm` or `onSubmit` does | The dialog |
| --- | --- |
| Returns nothing | Closes at once, and the write runs behind it |
| Returns a promise | Shows the spinner, then closes when the promise ends |
| Answers `{ error }`, at once or when its promise ends | Stays and says why |
| Answers `{ close: false }`, at once or when its promise ends | Stays and says nothing |
| Throws, or returns a promise that rejects | Stays, and the error goes on to your app |

Any other answer, such as the saved item, closes the dialog. godmin
closes it itself, so call nothing from your handler to close it, and
take it away in `onClose`. Close first for a long write, and show it
busy on the button that opened the dialog.

Of what `error` may hold, only words keep a dialog open. An empty
string or an object there closes it, unless `close` is `false`. Many
GraphQL clients answer a failed write with an object in `error`, and
the dialog then closes with nothing said. Turn that answer into words
first, or write through `useDialogRun`, as
[a failure from a dialog](../lists.md#a-failure-from-a-dialog) shows.

## A failed write

Does the dialog stay open? Then it says why inside. Otherwise a toast
does.

- In a form dialog `{ error }` draws a notice at the end of the form,
  above the buttons, and scrolls the body to it. What the reader typed
  stays. The notice goes on the next send or the first edit.
- In a confirm `{ error }` draws the words under the buttons, at the
  end, in `--wpds-typography-font-size-sm` (12px). They go on the next
  press of the confirm button.
- A form dialog over several items closes, and one toast says how the
  run went, since a run can half work. A form over one item that
  failed stays and says why. `useDialogRun` does both.
- A server message about one field goes under that field, as on a
  [record page](./record-pages.md#saving). Answer `{ close: false }`
  so the dialog stays with nothing more said.
- A confirm that closes, such as a run over the picked rows, says how
  it went in a toast.
- Never raise a toast for a dialog that stays open. It would show
  dimmed under the dialog, as
  [where a toast sits](./toasts.md#where-a-toast-sits) says.

## Leaving with unsaved work

- `UnsavedChangesDialog` from `@gopherium/godmin/router` asks before a
  move in the app leaves a page that holds unsaved work: a link, the
  sidebar, Back and Forward. Its `when` is true while the page holds
  such work.
- It is an irreversible confirm in your words, `title`, `description`,
  `discardLabel` and `keepLabel`, such as "Discard changes?",
  "Discard" and "Keep editing".
- A change of the search alone, such as a sort of a list inside the
  page, does not ask, since the page and its edits stay.
- Closing the tab, reloading, or Back off the app's first page shows
  the browser's own box.
- Keep editing, or Escape, stays on the page with the edits. After
  Back the address moves back too.
- Discard lets the card leave as any confirm does, then the page
  leaves.
- A handler that saves and then leaves in one go passes
  `ignoreBlocker: true` to its `navigate`, since the page counts as
  unsaved until the save has drawn. Delete on a record does the same.

## Keyboard and focus

- A confirm opens with the focus on Cancel. A form dialog opens with
  the focus on its first field, past the close icon. A form dialog
  with no field opens on Cancel.
- Enter in a field sends the form. On a button it presses that button,
  so an Enter right after a confirm opens closes it.
- Enter in a blank field the form marks `required` sends nothing.
- Tab stays inside the dialog.
- Escape closes an idle dialog, wherever the focus sits, a greyed
  button included.
- A click on the dimmed page closes an idle form dialog, never a
  confirm.
- When a dialog goes, the focus goes back to the control that opened
  it. A row menu hands the focus to its Actions button before the
  dialog opens, so a dialog from a row menu returns there. When that
  control left the page, see
  [putting the focus back on a row](../lists.md#putting-the-focus-back-on-a-row).
- When your steps swap inside one form dialog, move the focus
  yourself, such as to the field the next step shows.
- A focus your code or the reader moved out of the dialog stays
  there.
- After Undo in the toast of a run, the focus goes to the list, as it
  does after any run.

## What paints above what

- A toast sits under a dialog, as
  [where a toast sits](./toasts.md#where-a-toast-sits) says.
- A select, a menu or a confirm from the design system opened inside
  a dialog paints above it. Draw a confirm inside the dialog in your
  component tree, so the dimmed layer does not double.
- A `Modal`, `Popover`, `Dropdown` or `Tooltip` from
  `@wordpress/components` opened inside a dialog sits under it, and a
  press on it can close the dialog with the typed work. Keep to design
  system parts.
- A form dialog holds no part from `@wordpress/components` that opens
  over it. A `DataForm` in one uses the regular layout, where a date
  field is an inline calendar. A `color` field opens a `Dropdown`, so
  leave it out.
- A screen that truly needs such a part draws the design system's
  dialog parts itself, with `Popover.Slot` after the footer and
  outside the form, under a `SlotFillProvider`. A press in the card
  then leaves the panel open, and Escape with the focus in a field
  closes the dialog with the panel still showing.

## What a screen reader hears

- A confirm is an `alertdialog` and a form dialog a `dialog`. The
  title names it, and its description describes it.
- A busy button says "Loading" once.
- A failure inside a dialog is spoken at once.
- A toast under a dialog is still spoken, politely. Its action cannot
  be reached until the dialog goes.
- A dialog that stays open while the screen under it changes, such as
  after the browser's Back button, does not stop the title of the new
  screen from being spoken, as
  [what a screen reader hears when the screen changes](./frame.md#what-a-screen-reader-hears-when-the-screen-changes)
  says.
- While a dialog is open, a `role="alert"` of your own with no
  `aria-live` is hidden. Use `speak`.
