---
title: Loading and feedback
description: Ghost placeholders while data loads, a fade for the content that replaces them, and toasts for messages.
---

While a screen waits for its data, show a ghost: grey shapes where
the content is about to appear. When the data arrives, fade the
real content in. godmin ships both halves, plus the toast region
for short messages.

## The ghosts

`LoadingScreen` stands in for a whole screen. `LoadingRows` stands
in for a list inside a screen whose surroundings are already
visible:

```tsx
if (reports.isPending) {
	return <LoadingRows label="Loading reports." rows={8} />
}
return <ReportTable className="godmin-arrival" />
```

`label` is required on both. Write the sentence you would have
shown as text, like `Loading reports.` Sighted users see the
shapes, and screen reader users hear the label, announced from a
visually hidden status region. The shapes themselves are hidden
from assistive technology.

`LoadingRows` takes `rows`, which defaults to 5. `LoadingScreen`
draws a title bar and three text lines, with no count to set.

## Why a ghost does not appear immediately

A ghost stays invisible for its first 150ms. If the data arrives
faster, which it usually does, the user never sees it. Without that
delay every fast load would flash grey for a moment, and the flash
reads as something being wrong.

The delay lives in the stylesheet, so there is nothing to manage in
your code. Render the ghost from the pending flag and you are done.
No timers, no extra state.

If you are coming from 0.4.0: the `useLoadingGate` hook is gone as
of 0.5.0. It held ghosts on screen for a minimum time after the
data arrived, which made fast screens feel slow. Render from the
pending flag and let the stylesheet do the rest.

## Fading the content in

Give the content that replaces a ghost the `godmin-arrival` class
and it fades in instead of snapping in:

```tsx
return <ReportTable className="godmin-arrival" />
```

The fade is a short opacity ramp with no delay, so the content
starts appearing the moment it is ready. Together with the ghost's
own fade, the swap reads as one motion.

## Moving between pages

A router can draw a loading screen while the next page loads.
WordPress's new admin draws none. To do the same, spread
[`routerDefaults()`](./framing-an-application.md#routes-and-the-frame)
into your router, and give it no `defaultPendingComponent` and no
route a `pendingComponent`. Then:

- The page on screen stays until the next one has its code and data.
- A page starts to load when the pointer rests on its link or the
  keyboard reaches it, so the wait is often over before the click.
- A page that fetches its own data after it opens draws its ghost, as
  above.

## Toasts

A toast is a short message that says how something went, then
removes itself. godmin draws it like the WordPress snackbar.
[Toasts](./design-system/toasts.md) in the Design System gives where
it sits, how it looks, how long it stays and how a reader clears it.

`Toaster` renders the region that holds the toasts. Wrap your tree
once:

```tsx
<Toaster>
	<YourApp />
</Toaster>
```

Then raise messages from any component inside it:

```tsx
const toaster = useToaster()

toaster.show('Post moved to trash.', { label: 'Undo', onAct: restore })
```

The second argument is optional and adds one action, given as a
`label` and an `onAct` callback. It shows as a link after the
message. That covers undo, the main reason to offer an action at
all. The handle's type is exported as `ToasterHandle`, for holding
one in a context or a test.

Offer the same action somewhere else on the screen too, such as a
Restore row action in the trash. The toast leaves on its own, and a
keyboard reader may not reach its action in time. WordPress asks the
same of its snackbar.

`@wordpress/a11y` is a peer dependency, so install it next to
godmin. `godminDedupe` lists it, which makes `godminSingleCopy` stop
the build if a second copy slips into your bundle. One copy means
one live region on the page.

`Toaster` takes four props.
[How long a toast stays](./design-system/toasts.md#how-long-a-toast-stays)
gives the defaults of the first three, and
[what a screen reader hears](./design-system/toasts.md#what-a-screen-reader-hears)
gives the default of the last:

- `dismissAfter`, how many milliseconds a toast with no action stays.
- `actionDismissAfter`, how many milliseconds a toast with an action
  stays.
- `limit`, how many toasts stay on screen at once.
- `dismissLabel`, the hint a screen reader reads after the message of
  a toast with no action, to say a click clears it. It is the only
  text godmin puts in a toast, so set it if your application is not
  in English.

### What goes in a toast

Use a toast to confirm a change that worked and could otherwise go
unnoticed: a record saved, a task completed, a file uploaded. Keep
the message short and in the past tense, like `Post moved to trash.`

Name an item in straight double quotes and in full, like
`"Hello" moved to the trash.` WordPress never cuts a name in its
snackbar, and godmin does not either.
[Size](./design-system/toasts.md#size) says how a long one wraps.

Use a toast for a write that failed in a dialog or in a run over list
rows too. WordPress shows those in its snackbar, never inside the
dialog and never above the list, and godmin's dialogs and list runs
do the same. Say what failed, in the words your server sent when it
sent some. [A failure from a dialog](./lists.md#a-failure-from-a-dialog)
shows how to raise one from a dialog.
[Running an action over the picked rows](./lists.md#running-an-action-over-the-picked-rows)
raises it for you after a run over a list.

Keep an [`ErrorNotice`](./screens.md#errornotice) for a failure
that has to stay on the screen until the user acts:

- A screen or a list that failed to load. Show the notice where the
  content would be.
- A form on a page of its own, not in a dialog. Show the notice next
  to the form, so the user sees what failed while they fix it.

Skip the toast in three more cases:

- The next screen already says what happened.
- The user still has to act on the result, like copying a link.
  Keep that on the screen.
- The change happens right under the pointer and repeats fast, like
  moving a row up. A toast for every press piles up.
