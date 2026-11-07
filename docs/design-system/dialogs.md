---
title: Dialogs
description: When an action asks first, how a confirm looks and moves, what happens while its write runs, where a failure shows, and what a keyboard or a screen reader meets.
---

A dialog stops the page to ask one thing. A confirm is the dialog
that asks one question before an action. godmin draws it on the
design system's own alert dialog.
[Confirming an action](../lists.md#confirming-an-action) shows how to
open one. This page gives every value of how it looks and behaves.

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
- A menu label ends with an ellipsis when it opens a dialog, such as
  "Delete…", and has none when it runs at once, such as "Trash".

## Size and place

- A confirm is a card in the middle of the window at every width. It
  never turns into a sheet on a phone.
- It keeps `--wpds-dimension-padding-2xl` (24px) from each window edge
  while it can.
- A confirm is at most `--wpds-dimension-surface-width-lg` (560px)
  wide, and it has no other width.
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
- The buttons sit at the end, Cancel first,
  `--wpds-dimension-gap-sm` (8px) apart.
- In a confirm Cancel has no border and takes the neutral tone. The
  confirm button is solid in your accent color, or red with
  `intent="irreversible"`. No prop changes that red, as
  [the three seeds](./color.md#the-three-seeds) says.
- A word too long for the card, such as a long link in a server
  message, breaks at the card's edge.

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

When `onConfirm` returns a promise, the confirm stays open until it
ends.

- The confirm button shows a spinner over its hidden label and keeps
  its width. A confirm shows no word such as "Deleting…".
- Cancel turns grey and stays reachable with Tab.
- Escape closes nothing, wherever the focus sits, so a failure always
  has a place to show. Give a write that can hang a timeout.
- The confirm button ignores the second click of a double click, and
  a held Enter presses it once, so a fast write is not sent twice. A
  press after the confirm closed sends nothing.

## When a dialog closes

| What `onConfirm` does | The confirm |
| --- | --- |
| Returns nothing | Closes at once, and the write runs behind it |
| Returns a promise | Shows the spinner, then closes when the promise ends |
| Answers `{ error }`, at once or when its promise ends | Stays and says why |
| Answers `{ close: false }`, at once or when its promise ends | Stays and says nothing |
| Throws, or returns a promise that rejects | Stays, and the error goes on to your app |

Any other answer, such as the saved item, closes the confirm. Close
first for a long write, and show it busy on the button that opened
the dialog.

Of what `error` may hold, only words keep a confirm open. An empty
string or an object there closes it, unless `close` is `false`. Many
GraphQL clients answer a failed write with an object in `error`, and
the confirm then closes with nothing said. Turn that answer into
words first.

## A failed write

Does the confirm stay open? Then it says why inside. Otherwise a toast
does.

- In a confirm `{ error }` draws the words under the buttons, at the
  end, in `--wpds-typography-font-size-sm` (12px). They go on the next
  press of the confirm button.
- A confirm that closes, such as a run over the picked rows, says how
  it went in a toast.
- Never raise a toast for a confirm that stays open. It would show
  dimmed under the confirm, as
  [where a toast sits](./toasts.md#where-a-toast-sits) says.

## Keyboard and focus

- A confirm opens with the focus on Cancel.
- Enter presses the button that holds the focus, so an Enter right
  after the confirm opens closes it.
- Tab stays inside the confirm.
- Escape closes an idle confirm, wherever the focus sits.
- A click on the dimmed page never closes a confirm.
- When a confirm goes, the focus goes back to the control that opened
  it. A row menu hands the focus to its Actions button before the
  confirm opens, so a confirm from a row menu returns there. When that
  control left the page, see
  [putting the focus back on a row](../lists.md#putting-the-focus-back-on-a-row).
- A focus your code or the reader moved out of the confirm stays
  there.
- After Undo in the toast of a run, the focus goes to the list, as it
  does after any run.

## What paints above what

- A toast sits under a confirm, as
  [where a toast sits](./toasts.md#where-a-toast-sits) says.

## What a screen reader hears

- A confirm is an `alertdialog`. The title names it, and its
  description describes it.
- A busy button says "Loading" once.
- A failure inside a confirm is spoken at once.
- A toast under a confirm is still spoken, politely. Its action cannot
  be reached until the confirm goes.
- While a confirm is open, a `role="alert"` of your own with no
  `aria-live` is hidden. Use `speak`.
