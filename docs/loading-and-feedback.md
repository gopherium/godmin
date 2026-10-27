---
title: Loading and feedback
description: What a list, a screen and a preview show while their data loads, and toasts for messages.
---

While a screen waits for its data, it shows that it is loading, the
way WordPress does. A list leaves that to DataViews. Any other screen
shows `LoadingScreen`, a spinner. godmin also ships the toast region
for short messages. [Loading](./design-system/loading.md) in the
Design System gives how long each one waits, where it sits and what a
reader sees.

## A list that loads

Pass the loading state of a DataViews list to its `isLoading`.
DataViews then shows the loading itself.
[A list that loads](./lists.md#a-list-that-loads) says which flag to
pass.

A list that is not DataViews, such as a `godmin-table`, shows
`LoadingScreen` in its place until its first rows arrive.

## A screen that loads

`LoadingScreen` stands in for a screen, or for the part of a screen
whose data has not arrived:

```tsx
if (report.isPending) {
	return (
		<Page title="Report">
			<LoadingScreen label="Loading the report." />
		</Page>
	)
}
```

Render it from the pending flag of your request. Where you put it
decides how it shows:

- Inside the `Page`, when you know the title. The title stays while
  the data loads, and the spinner shows at once at the top of the
  page, under the title, as on a WordPress screen.
- Inside a dialog, when nothing of the dialog body is known yet. It
  shows at once there too.
- Alone, when nothing of the screen is known yet, such as while the
  session loads before the frame is drawn. It then waits a moment, so
  a fast load shows nothing, and fades in, in the middle of the space
  it gets. The wait lives in the stylesheet, so your code needs no
  timer.

Inside a `Page` a load that is often fast can show the spinner for a
moment. To keep the old page on screen instead, let the route loader
wait for the small data the screen needs, as
[a list that loads](./lists.md#a-list-that-loads) shows. Data the
page already holds can go to TanStack Query as `initialData`.

`label` is required. Write the sentence you would have shown as text,
like `Loading the report.` A screen reader hears it, as
[what a screen reader hears](./design-system/loading.md#what-a-screen-reader-hears)
says. Pass it through your translations.

Show the content as soon as it arrives. It replaces the spinner at
once.

## A preview whose shape is known

When a part knows its size before its data arrives, such as an image
whose width and height you hold, it may show the `Skeleton` of
`@wordpress/ui` in its place until the image arrives:

```tsx
const [loaded, setLoaded] = useState(false)

return (
	<figure className="cover" aria-busy={!loaded}>
		{loaded ? null : <Skeleton style={{ inlineSize: 320, blockSize: 180 }} />}
		<img
			src={coverUrl}
			alt=""
			width={320}
			height={180}
			className={loaded ? undefined : 'is-loading'}
			onLoad={() => setLoaded(true)}
			onError={() => setLoaded(true)}
		/>
	</figure>
)
```

The image is in the page from the start, so the browser loads it.
Until then your own `is-loading` class lays it over the skeleton,
out of the flow and transparent, as WordPress does:

```css
.cover {
	position: relative;
}

.cover .is-loading {
	position: absolute;
	inset-block-start: 0;
	inset-inline-start: 0;
	opacity: 0;
}
```

The skeleton goes when the image loads, or fails, so it never pulses
for good.

Keep it for such a preview. A list or a screen shows a spinner, as
above. When the image arrives you may fade it in, the one fade
WordPress gives loaded content.
[A preview whose shape is known](./design-system/loading.md#a-preview-whose-shape-is-known)
says how to size the skeleton, how to hide the image and fade it in,
and what a screen reader needs.

## Moving between pages

A router can draw a loading screen while the next page loads.
WordPress's new admin draws none. To do the same, spread
[`routerDefaults()`](./framing-an-application.md#routes-and-the-frame)
into your router, and give it no `defaultPendingComponent` and no
route a `pendingComponent`. The old page then stays until the route
loader is done, so let the loader wait only for the small data the
screen needs, as [a list that loads](./lists.md#a-list-that-loads)
shows.
[Moving between pages](./design-system/loading.md#moving-between-pages)
says what the reader sees then.

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
