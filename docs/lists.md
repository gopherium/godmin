---
title: Lists with DataViews
description: Hosting a WordPress DataViews list in a godmin page, its view in the address, paging it on the server, empty states, runs over the picked rows, confirmations, confirms outside a list, renames, forms in a dialog, the focus back on a row, bulk messages, uploads, its Spanish chrome, its dates, and the table look for lists that stay custom.
---

DataViews is the WordPress list component. It draws the search box,
the filters, the sort menus, the paging and the row actions you know
from the Posts screen. godmin never imports it. Your application
installs `@wordpress/dataviews` and loads its stylesheet, and godmin
makes the list sit well inside a page.

## A list page

Give `Page` the `list` flag when its content is a list:

```tsx
import { Page } from '@gopherium/godmin'
import { DataViews, filterSortAndPaginate } from '@wordpress/dataviews'
import type { View } from '@wordpress/dataviews'
import { useState } from 'react'

export function UsersScreen({ users }: { users: User[] }) {
	const [view, setView] = useState<View>({ type: 'table', titleField: 'name', fields: ['email'] })
	const { data, paginationInfo } = filterSortAndPaginate(users, view, fields)
	return (
		<Page title="Users" list>
			<DataViews
				data={data}
				fields={fields}
				view={view}
				onChangeView={setView}
				paginationInfo={paginationInfo}
				defaultLayouts={{ table: {} }}
			/>
		</Page>
	)
}
```

`fields` describes your columns, as the DataViews documentation
shows. DataViews needs `paginationInfo`, the item and page totals
its paging reads. For a list you hold whole, `filterSortAndPaginate`
searches, sorts and pages it, and answers the page of rows with those
totals. `defaultLayouts` names the layouts a reader may switch to.

`list` takes the content out to the canvas edges, so the list's own
padding lines up with the title and its row lines run from edge to
edge, as they do in WordPress.
[A list page](./design-system/lists.md#a-list-page) gives the values.

A page with an `aside` keeps its list inside the main column, because
the aside needs its own room.

The canvas names its side padding `--godmin-canvas-gutter` and its
top and bottom padding `--godmin-canvas-gutter-block`. Read them for
anything else that has to line up with the canvas edge.
[The canvas](./design-system/layout.md#the-canvas) gives their
values.

## The view in the address

`useListView` keeps the search, the filters, the sort and the page of
a list in the address. A reader who reloads or shares the page gets
the same rows. It comes from `@gopherium/godmin/router` and needs
TanStack Router:

```tsx
import { listSearch, useListView } from '@gopherium/godmin/router'

const usersRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/users',
	validateSearch: listSearch,
	component: UsersScreen,
})

function UsersScreen() {
	const list = useListView<View>({
		fields: ['email', 'role'],
		titleField: 'name',
		sort: { field: 'name', direction: 'asc' },
		perPage: 20,
	})
	const { data, paginationInfo } = filterSortAndPaginate(users, list.view, fields)
	return (
		<Page title="Users" list>
			<DataViews
				data={data}
				fields={fields}
				paginationInfo={paginationInfo}
				view={list.view}
				onChangeView={list.onChangeView}
				defaultLayouts={list.defaultLayouts}
				selection={list.selection}
				onChangeSelection={list.onChangeSelection}
			/>
		</Page>
	)
}
```

`View` is the DataViews view type, so `list.view` and the controls
fit DataViews as they are. godmin itself never imports DataViews.

The object you pass is what the list opens on. The address holds
only what the reader changed, in the keys `search`, `page`,
`perPage`, `sort`, `order` and `filters`, so a fresh list has a bare
address. Other keys, such as a tab, stay as they are. A change
replaces the address instead of adding a history entry, so Back
leaves the list.

`listSearch` keeps those keys and drops anything malformed. When the
route holds a key of its own, add it:
`validateSearch: (raw) => ({ ...listSearch(raw), status: raw.status })`.

A list shows one layout at a time and no Layout menu: the table on a
wide screen and the list on a phone, as
[columns](./design-system/lists.md#columns) gives.
`layouts: { wide: 'grid', phone: 'list' }`
names others, and `layoutSettings` says what a layout opens on, such
as `{ grid: { layout: { previewSize: 230 } } }`. `phoneFields` names
the fields the phone list shows. The columns a reader picks stay in
memory while the list is open, one set for each layout. When the screen
moves to another list address, for example from one content type to
the next, the list forgets the picked columns and the ticked rows.

A tap on a phone list selects nothing. `openOnTap(list, open)` gives
you a handler that opens the record instead. Pass it as
`onChangeSelection`. `list.phone` tells you which side of
`DENSE_BREAKPOINT` the screen is on. `openOnTap` comes from
`@gopherium/godmin/router`, like `useListView`, and from the main
entry too, so a package that draws a list without TanStack Router can
call it with the `list` an app hands it. It reads only `phone` and
`onChangeSelection`. The list view
types, such as `ListView` and `ListDefaults`, come from the main entry
too, so such a package can type that `list` and its defaults without
the router. This needs godmin 0.27.0 or later.

Leave `perPage` out while you do not know it yet, for example while
your settings load. The list then shows every row.

## Keeping the view to what the list offers

An address can hold a sort or a filter the list never offers, from
an old link or one typed by hand. DataViews would show it, and your
server would get a request it cannot answer. `offeredView` keeps only
what the fields offer:

```tsx
import { offeredView } from '@gopherium/godmin'

const view = offeredView(list.view, fields, {
	opening: { field: 'date', direction: 'desc' },
	checks: { author: namesAccounts },
})
```

Hand `view` to DataViews and to your request in place of `list.view`.

A sort stays when a field with that id sorts. Any other sort, or
none, falls back to `opening`, the order the list opens in. As in
DataViews, a field sorts unless it says `enableSorting: false`, and a
field of type `media` or `password` sorts only when it says
`enableSorting: true`.

A filter stays when DataViews offers it. `offeredView` reads the
field as DataViews 20 does:

- The field does not say `filterBy: false`.
- The operator is one the field names in `filterBy.operators` and its
  type takes, or one of its type's defaults when it names none. A
  `text` field with no `filterBy` offers `isAny` and `isNone`, and a
  field with no type offers `is` and `isNot`.
- The field can draw the filter: it has `elements` or `getElements`,
  its type draws a control, or its own `Edit` gives one. A field of
  type `media` or `password` offers no filter, and neither does a
  field with no type, no elements and no `Edit`.

A filter still waiting for its value stays too. Otherwise its value
has to fit the field:

- For a field with `elements` or `getElements`, the value has the
  shape DataViews writes. When any operator of the field picks one
  value, such as `is`, every filter on it holds one value, `isAny`
  included. Otherwise it holds a list. A value of the other shape
  goes away.
- For a field with `elements` and no `getElements`, each value must
  be one of them. An empty `elements` list counts as none.
- For any other field, `checks` can name a function that takes or
  refuses the value, such as one that wants account ids. A field with
  `getElements` is one of them, since DataViews shows the values it
  loads in place of `elements`.
- Such a field with no check takes any value. Name a check for any
  value your server has to read, such as a date.

Everything else in the view, such as the search, the page and the
columns, comes back as it was. `filters` always comes back as a list,
empty when nothing stayed.

## The list fills the page

A list page fills the canvas from the title down to the bottom edge.
The DataViews footer, with the item count and the select all box,
rests on the bottom edge of the canvas, the way the list already
reaches the side edges. With a few rows, the rows sit at the top,
the empty space sits under them, and no line closes the last row.
The next line is the footer's own, at the bottom.

When the list is longer than the screen, only the rows scroll. The
title, the tabs, the search box and the column headers stay where
they are, and the footer stays on the bottom edge. A toast floats
over the footer, as
[where a toast sits](./design-system/toasts.md#where-a-toast-sits) shows.

A list that is not DataViews, such as a `godmin-table`, grows the
page instead, and the canvas scrolls as it does for any other page.

## Columns

Name the columns a list opens on in the view's `fields`, one set for
every width. Never hide a column because the window is narrow, as no
WordPress list does. A reader adds and removes columns in View
options.

When the columns need more room than the list has, the table scrolls
sideways inside the list. A table with checkboxes keeps its checkbox
and title columns frozen at the start edge while the other columns
scroll under them, as
[a wide table](./design-system/lists.md#a-wide-table) shows. You add
nothing for it.

Draw a muted cell with a weak text color, such as
`--wpds-color-foreground-content-neutral-weak`, never with `opacity`.
A cell with less than full opacity paints over the frozen columns as
it scrolls under them.

Give every bulk action an `icon`. At `EDGE_BREAKPOINT` and below,
DataViews shows bulk actions as icon buttons and leaves out an action
with no icon.

## Tabs above a list

Give the page `tabs` to show [page tabs](./screens.md#pagetabs)
between the title and the list. On a list page the tab labels line up
with the title, the light line under them runs from edge to edge, and
the search box sits under that line as on a WordPress list. A notice
or a `godmin-table` right under the tabs keeps the same space from
that line. [A list page](./design-system/lists.md#a-list-page) gives
the values.

## Notices above a list

Anything you put in a list page before the list itself, such as an
`ErrorNotice` for a list that failed to load, lines up with the title
rather than the canvas edge, and keeps the page gap between itself
and the list, as [a list page](./design-system/lists.md#a-list-page)
gives:

```tsx
<Page title="Users" list>
	{loadFailure === undefined ? null : <ErrorNotice>{loadFailure}</ErrorNotice>}
	<DataViews {...props} />
</Page>
```

A write that fails from a row action goes in a toast instead, as
[what goes in a toast](./loading-and-feedback.md#what-goes-in-a-toast)
explains.

## A drop zone over a list

Give an element the `godmin-list-overlay` class and put it after the
list. It then covers the whole list region, toolbar and footer
included, without the margin a notice takes. A WordPress `DropZone`
is the usual one:

```tsx
<Page title="Media" list>
	<DataViews {...props} />
	<DropZone className="godmin-list-overlay" label="Drop files to upload" onFilesDrop={upload} />
</Page>
```

The list stays the first child of its region, so its footer stays on
the canvas bottom. The class works the same in the main column of a
page with an `aside`, and inside a `godmin-list`.

## Empty lists

`ListEmpty` is what a list shows when it has no rows. Pass it to
DataViews as `empty`:

```tsx
import { ListEmpty } from '@gopherium/godmin'
import { people } from '@wordpress/icons'
import { Button } from '@wordpress/ui'

<DataViews
	{...props}
	empty={
		<ListEmpty
			icon={people}
			title="No users yet"
			description="Users you add show up here."
			actions={<Button onClick={addUser}>Add User</Button>}
		/>
	}
/>
```

It draws the design system empty state, centred: the icon, the title
as a heading, the description under it and the buttons under that.
`description` and `actions` are optional. Put the add button of the
list header in `actions`, with the same words, at its default size
rather than compact. The title is one short phrase with no full stop,
and the description a sentence that ends with one, as
[an empty list](./design-system/lists.md#an-empty-list) gives.

When a search or a filter finds nothing, show `ListNoResults` in its
place. It says "No results found" and "Try adjusting your search or
filters to find what you're looking for." under the search icon, in
[godmin's own words](./framing-an-application.md#godmins-own-words),
and holds no button, since the DataViews filters already offer Reset.
`viewNarrows(view)` tells you whether a search, or a filter holding a
value, narrows the list. Use it to pick between the two:

```tsx
import { ListEmpty, ListNoResults, viewNarrows } from '@gopherium/godmin'

const empty = viewNarrows(view) ? (
	<ListNoResults />
) : (
	<ListEmpty
		icon={people}
		title="No users yet"
		description="Users you add show up here."
		actions={<Button onClick={addUser}>Add User</Button>}
	/>
)
```

A filter with an empty pick, or one still waiting for its value,
narrows nothing. A status tab narrows nothing either. A tab that holds
nothing, such as Trash, shows words of its own and no add button:

```tsx
import { trash } from '@wordpress/icons'

<ListEmpty icon={trash} title="Trash is empty" />
```

## A list that loads

Pass the loading state of the list to DataViews as `isLoading`.
DataViews then shows what every WordPress list shows: nothing at
first, a spinner while the first rows load, and the old rows, dimmed,
while the next ones load. [A list](./design-system/loading.md#a-list)
gives how long each step waits.

Pass true while the list waits for rows it does not hold yet: from
the first render until the first answer, even while the request still
waits for something else, while a new page, search or sort waits
for its answer, and while the list reloads after a write of your
own. With TanStack Query:

```tsx
const { run, region, refreshing } = useListRun('orders', list.onChangeSelection)

<DataViews
	{...props}
	data={orders.data?.items ?? []}
	isLoading={orders.isPending || orders.isPlaceholderData || refreshing}
/>
```

`refreshing` comes from `useListRun`, as
[running an action over the picked rows](#running-an-action-over-the-picked-rows)
shows. It is true while a run reloads its list after its own write,
which the query's own flags leave false.

Do not pass `isFetching`. TanStack Query sets it on the very first
render of a list whose stored rows are stale, and DataViews then hides
those rows behind its spinner until the fetch ends.

With urql, pass
`result.fetching || (result.data === undefined && result.error === undefined) || refreshing`.
A rerun of the list's query that something else starts marks the
result `stale` and leaves `fetching` false. So after a write of your
own, reload the list with an awaited network-only query inside
`run.onRefresh()`:

```tsx
const ended = run.onRefresh()
try {
	await client.query(ContactsQuery, variables, { requestPolicy: 'network-only' }).toPromise()
} finally {
	ended()
}
```

Never pass `stale` as the flag. A `cache-and-network` query sets it
on every reopen that finds rows in the cache.

A write of your own outside a run, such as a rename, looks the same
as a run over one row: show its toast as the call ends, then call
`run.onRefresh()` around its awaited reload.

When the page already holds the first rows, such as data the server
put in the page, give them to TanStack Query as `initialData`. The
list then shows them at once, with no spinner, as WordPress does with
the data it preloads.

The flag has to be true on the very first render. DataViews decides
on that render whether the list has loaded. A list that starts with
`false` never shows the spinner. It shows its empty state, which dims
after a moment until the rows arrive.

Keep DataViews on screen while it loads, and never swap it for
`LoadingScreen`. DataViews keeps the search box and the filters in
place, and keeps the old rows during a later load.

Never give DataViews a `key` that changes with the view, such as the
layout, a status or a category. A new key mounts a new DataViews.
When the new view then loads, it starts over as on a first load: the
rows go, nothing shows for a moment, then the spinner, where a later
load would keep the rows on screen.

In a route, let the loader wait only for the small data the screen
needs before it can draw, and start the rows without waiting. The old
page then stays only that long, and the list shows its own loading.
With TanStack Query, `ensureQueryData` waits and `prefetchQuery`
with no `await` starts:

```tsx
loader: () => {
	void queryClient.prefetchQuery(ordersQuery)
	return queryClient.ensureQueryData(orderStatusesQuery)
},
```

## Paging on the server

`filterSortAndPaginate` needs every row in the browser. A long list
asks the server for one page at a time instead. The server needs two
numbers: the limit, how many rows to send, and the offset, how many
rows to skip first. `useServerPaging` works both out from the view:

```tsx
import { Page, paginationOf, useServerPaging } from '@gopherium/godmin'

export function OrdersScreen() {
	const [view, setView] = useState<View>({ type: 'table', page: 1, perPage: 20, fields: ['total'] })
	const paging = useServerPaging(view, 100)
	const { page, asked, loading } = useOrderPage(paging.window)
	paging.record(page, asked)
	return (
		<Page title="Orders" list>
			<DataViews
				data={page?.items ?? []}
				paginationInfo={paginationOf(page)}
				fields={fields}
				view={view}
				onChangeView={setView}
				defaultLayouts={{ table: {} }}
				isLoading={loading}
			/>
		</Page>
	)
}
```

`useOrderPage` stands for your own request. On page 3 with 20 rows a
page, `paging.window` is `{ limit: 20, offset: 40 }`. The second
argument is the largest page your server sends. A bigger page size
is held under it. Leave it out when your server has no such limit.

The server answers with the rows, `total`, how many rows match in
all, and `limit`, the page size it used. Hand that page to
`paging.record` and to `paginationOf`, or `undefined` while it has
not arrived. `paginationOf` turns it into the totals DataViews shows.

`useOrderPage` also gives back `asked`, the limit of the request that
got this page. With urql, that is `result.operation?.variables.limit`.
Call `paging.record(page, asked)` in the same component, right after
your request, as the example does. It also gives back `loading`, true
until its first answer and while a new page waits for its answer, as
[a list that loads](#a-list-that-loads) asks.

`paging.record` remembers the page size the server used for that
request. When the server used another size than you asked for, the
next pages step by the size it used, and no row goes missing or shows
twice. An answer to an older request, with another page size, never
changes the step. A view with no `perPage` asks with a `null` limit.
The server then picks the size, and the pages step by it once the
first one arrives.

`pageWindow(view, last, cap)` is the plain function behind the hook,
for code outside a component. `last` is the size the server last sent
together with the size it was asked for, or `undefined` before the
first page.

### Page sizes from your settings

When your settings name the page sizes a reader may pick, an address
can still hold a size they do not offer. `offeredSize` keeps a size
the settings offer and falls back to the opening size for any other.
`sizedView` leaves the size out of the request while the settings are
on their way, so the server serves its own size:

```tsx
import { offeredSize, sizedView, useServerPaging } from '@gopherium/godmin'

const sizes = settings.data?.pageSizes
const view = { ...list.view, perPage: offeredSize(list.view.perPage, sizes, settings.data?.pageSize) }
const paging = useServerPaging(sizedView(view, sizes), 100)
const { page, asked } = useOrderPage(paging.window, { pause: settings.isPending })
```

While the sizes are unknown, `offeredSize` keeps the size the view
asks for. Hold the request back while the settings load, with your
query library's own flag, such as `pause` in urql or `enabled` in
TanStack Query. If the settings fail to load, the sizes stay unknown,
so the request goes without a size and the server serves its own.
godmin never picks a query library for you.

## Bulk actions

A bulk action runs on every row the reader picked. `runEach` makes one
call per row, all at once, and counts how they went:

```tsx
import { runEach, useToaster } from '@gopherium/godmin'
import type { Action } from '@wordpress/dataviews'

export function useArchiveAction(): Action<Order> {
	const toaster = useToaster()
	return {
		id: 'archive',
		label: 'Archive',
		supportsBulk: true,
		callback: async (orders) => {
			const { asked, done, failures } = await runEach(orders, (order) => archiveOrder(order.id))
			if (failures.length > 0) {
				toaster.show(`Could not archive ${failures.length} of ${asked}.`)
			} else {
				toaster.show(`Archived ${done} of ${asked}.`)
			}
		},
	}
}
```

The action lives in a hook, because `useToaster` only works inside a
component.

`asked` is how many rows `runEach` got and `done` is how many calls
worked. `failures` holds each row that failed with its error, in the
order of the rows. A call fails when its promise rejects, when it
throws, or when it answers an object whose `error` holds an error. An
`error` of `null` or `undefined` counts as done. Many GraphQL clients
report an error that way, so a call can hand back the client's result
as it is. `runEach` itself never fails, so one bad row
never hides the others.

Show one toast. When a row failed, it says what failed, because that
is what the reader has to act on. Otherwise it says what worked. The
WordPress Trash action does the same, and
[what goes in a toast](./loading-and-feedback.md#what-goes-in-a-toast)
explains why a failure goes there.

## Bulk messages

`bulkNotes` turns the outcome into those messages, in your own words:

```tsx
const notes = bulkNotes(orders, outcome, {
	done: (count, only) => (only === undefined ? `${count} orders archived.` : `"${only.title}" archived.`),
	failed: (failures, asked) => `${failures.length} of ${asked} orders could not be archived.`,
})
const message = notes.notice ?? notes.toast
if (message !== undefined) {
	toaster.show(message)
}
```

Pass the rows you gave `runEach` and its outcome. `done` runs when at
least one row worked, with how many did, and fills `toast`. `only` is
the row itself when the reader picked exactly one, so the message can
name it. `failed` runs when at least one row failed, with every
failure and its error, so it can count them or join their reasons,
and fills `notice`. A message nothing calls for is `undefined`.

Toast `notice` in place of `toast` when both are there, as the
example does, so the reader sees one toast.

## Running an action over the picked rows

Every list action that changes rows does the same things around the
calls: the list marked reloading as the first call that works ends,
with the focus moved to the list from a part that turns inert, one
toast as the last call ends, the focus moved back to the list once a
row moved, while the reader is still with the run, then the list
reloaded, and the focus put back on the control the reader pressed,
or on the first control of the row that took its place, unless that
control is a primary action. `useListRun` and `useBulkRun` hold those
things for you:

```tsx
import { Page, RunConfirm, useBulkRun, useListRun } from '@gopherium/godmin'

function OrdersScreen() {
	const client = useQueryClient()
	const list = useListView<View>(defaults)
	const { run, region } = useListRun('orders', list.onChangeSelection)
	const refresh = useCallback(() => client.invalidateQueries({ queryKey: ['orders'] }), [client])
	const bulk = useBulkRun<Order>(run, refresh)
	const actions = useMemo<Action<Order>[]>(
		() => [
			{
				id: 'delete',
				label: 'Delete…',
				supportsBulk: true,
				hideModalHeader: true,
				modalFocusOnMount: 'firstContentElement',
				RenderModal: (props) => (
					<RunConfirm {...props} confirmLabel="Delete" cancelLabel="Cancel" run={(orders) => bulk(orders, (order) => deleteOrder(order.id), words)}>
						Delete these orders for good?
					</RunConfirm>
				),
			},
		],
		[bulk],
	)
	return (
		<Page title="Orders" list listLabel="Orders" listRef={region}>
			<DataViews {...props} actions={actions} />
		</Page>
	)
}
```

Build the actions once with `useMemo`, as the example does. A run
renders the screen again, and DataViews draws the confirm of a bulk
action from the actions you pass. A new `RenderModal` would start the
confirm over in the middle of the run: Cancel would work again, and
the confirm button could start a second run. When your words or your
calls change with the screen, list them in the dependencies too.

`useListRun` keeps track of the runs on the list. Once a run moved a
row, the list region takes the focus, so a keyboard reader is not
left on a button that went away with its row while the list reloads.
The screen does not scroll as the region takes the focus, so a reader
who ran an action near the bottom of a long list, from a row or from
a confirm, still sees the rows they were on. While the list reloads,
the next Tab from the region goes to the first control of the list,
such as its search field. After a run started from the keyboard, the
region then draws the ring WordPress draws on a region it focuses, as
[after a write of your own](./design-system/lists.md#after-a-write-of-your-own)
shows. When two runs overlap, only the latest one moves the focus.
The list holds no failure. A run shows how it went in its toast.

`useListRun` also hands out `refreshing`, true from the moment the
first call of a run works until the list's reload after the run
ends. Pass it to DataViews beside the list's own loading state, as
[a list that loads](#a-list-that-loads) shows, so the list shows that
reload as WordPress does
[after a write of your own](./design-system/lists.md#after-a-write-of-your-own).

DataViews then makes the table and the footer inert. A focus in
either, such as on a row or the busy bulk button, would fall to the
page, as it does in WordPress, where no control holds it and no ring
shows. So once DataViews drew the list inert, the list region takes
that focus in the same render, before the browser drops it, and here
too the screen does not scroll. A focus anywhere else, such as in the
search field or outside the list, stays where it is while the calls
run.
Pass `refreshing` to DataViews in the render that reads it, never
through an effect, so the region can take the focus in time.

Once the list reloaded, while the region still holds the focus,
`useListRun` puts the focus back where the reader was:

- on the control they pressed, when it is still there and takes the
  focus, such as the bulk action button while a row stays ticked, or
  a row's button while its row stays,
- else on the first control of the row that now sits where the row of
  that control was, its checkbox in a list with bulk actions, such as
  the next row's checkbox when the row the reader restored left the
  list, or the last row's when fewer rows came back. In a grid, or in
  the list layout on a phone, it is the first control of the card or
  item in that place,
- else on the region still, such as when no row came back, when the
  pressed button sat in the bulk bar and the bar went with the ticked
  rows, or when the first control of the row is a primary action from
  `actions`.

DataViews names a row's checkbox after the field the view names as its
`titleField`, and with no `titleField` every checkbox says "(no title)".
So after a row left, a screen reader says the title of the row now in
its place, then checkbox and its state, checked or not checked, and a
second Enter does nothing, since Enter does not tick a checkbox.

In a list with no bulk actions the row draws no checkbox, so the first
control in the row decides. A title that opens the item takes the
focus, and a second Enter opens that item. The row's actions menu
button takes the focus when it comes first, since Enter there only
opens a menu. A primary action from `actions`, such as a Trash with
`isPrimary`, does not take it, whether or not the action opens a
confirm. Its button says the action and not the row, so a second
Enter there would act on a row the reader never picked. So the region
keeps the focus, a second Enter writes nothing, and the next Tab goes
to the first control of the list, such as its search field. A button
that a field's `render` draws takes the focus as any first control
does, so keep a write in `actions`.

For a run from a confirm, the control they pressed is the one that
opened the confirm, such as the bulk action button or the row's
actions menu. For an action in a row's actions menu, it is the menu
button, which the menu gives the focus back to as it closes. After a
run started from the keyboard, while the region shows its ring, the
rows scroll to that control when it is out of view. After a mouse
click the region shows no ring and the rows stay where the reader left
them. A checkbox, a `Button`, a title or a grid card's media button
still draws WordPress's own focus style, which it draws on any focus,
a mouse click included. An item of the list layout shows only its row
tint and a table media button shows nothing, since those two show a
focus style only on a keyboard focus. Once a control takes the focus,
a screen reader has a name to say, and the next Tab goes on from it.
A reload that fails leaves the old rows, so
the focus goes back to the control they pressed. A focus the reader
moved while the list reloaded stays where they put it, and a change
of the list on show forgets where they were. A reload that also moves
the view to another page, such as one page back once the last row of
the last page left, keeps the same rule when it ends after the rows
of that page show, so the row in that place on the page now on show
takes the focus as above. When your app moves the page only once the
reload ended with no rows, the focus stays on the region. A run that
started with the focus on the page, such as a click that left no
focus on the button, has nothing to put back, so the focus stays on
the region.

WordPress drops the focus to the page there. No control holds it and
nothing shows. godmin goes further and keeps the focus on a control,
or on the region when no control is safe to land on, so the reader
keeps their place and a keyboard reader sees where they are.
End the reload only once the list holds its new rows, as an awaited
reload does, so the focus goes back among the new rows.

A run can end while the reader works somewhere else, such as in a
dialog they opened on another row. So the list takes the focus only
while the reader is still with the run:

- the focus fell to the page,
- the focus sits inside the list,
- the focus sits in the dialog the run started in,
- or that dialog closed before the run ended, the focus still sits
  where it first went outside that dialog while the dialog was open,
  and no dialog holds the focus. A confirm that closes at once gives
  the focus back to the button that opened it, and the list then
  takes the focus from that button.

A dialog opened since keeps the focus, so typing still lands in it
and Escape still closes it. A reader who moved on to another control
outside the list keeps their place: during a run started outside
every dialog, while the dialog the run started in is still open, and
after that dialog gave the focus back or closed with nowhere to give
it. One move is the exception. A dialog that lets the focus out,
unlike a WordPress modal, can be left for another control while it
is still open. That control then counts as where the dialog gave the
focus back, since the focus moves the same way in both cases. So when
the dialog closes and the run ends with the focus still there, the
list takes the focus from it. Every list run does this, with nothing
to add to your screen. This needs godmin 0.27.0 or later. Before it,
the list took the focus wherever the focus sat.

`focusInDialog()` tells whether a dialog holds the focus, for a write
you finish yourself outside a run. It also needs godmin 0.27.0 or
later.

`useListRun` hands the same `run` for as long as the screen stays,
whichever list it shows. So when the reader moves to another tab, the
handler `useBulkRun` builds from it stays the same too, as long as
your `refresh` does.

Its first argument names the list on show. Put the list and its tab
in it, such as `'orders trash'`. When that name changes, the list
clears the ticked rows and ignores any run started on the list
before, with one exception. When the first call of such a run that
works ends only after the change, the run marks the new list
reloading until its `refresh` ends, as WordPress reloads every list
of the same kind of rows after a write. The second argument replaces
the ticked rows. Pass the setter that holds them, such as
`list.onChangeSelection`, or a setter from a parent component. The
rows clear in the same frame the new list appears.

`useBulkRun` makes one call per row with `runEach`. As the first call
that works ends, it marks the list reloading, while the other calls
still run. As the last call ends it shows one toast in your
[bulk words](#bulk-messages), settles the run and resolves, then calls
`refresh`, and the list stays marked until `refresh` ends. So your app
never reloads while its own calls still run. When every row failed,
it still calls `refresh` but marks no reload, since nothing changed.
The toast holds your `failed` words when any row failed, and your
`done` words when every row worked. Wrap `refresh` in `useCallback`,
or the handler changes on every render. `refresh` gets the rows the
run acted on, so it can also forget each row's own cached copy. A
`refresh` that rejects ends the reload, and the list's own loading
state shows the failure, as on any later load. The run resolved
before it, so it does not reject. A test that awaits the run and then
reads the reloaded rows waits for the rows instead.

`RunConfirm` is the body of the confirm modal. It runs the action
when the reader confirms, shows the confirm button busy and keeps
Cancel inert while the run goes, and closes once the run settles. So
it stays open while a call still runs, even once the list started to
reload, and closes as the toast shows. A failure shows in the run's
toast, never inside the modal. It also closes when the run rejects,
and the error still reaches your app. It closes only itself.
DataViews keeps one dialog for a row's actions menu and another for
its primary action buttons. A reader can dismiss a busy confirm by
clicking the dimmed page and open another dialog in its place, from
the same menu or the same buttons. When the run then ends, that other
dialog stays open, with what the reader typed in it.

`listLabel` and `listRef` make the list a region with a name, which
a screen reader announces, and give the focus its target. The region
stays out of the Tab order. Pass both. A list with a ref and no label
still takes the focus, but a screen reader has no name to announce.

A button outside the list, such as one in the page header, can share
the same run. Call `run.onStart()` as its write starts. It answers a
function, typed `RunSettled`. Call that function once the write ends,
with whether a row moved, and show how it went in a toast. Then call
`run.onRefresh()` and reload the list. It answers a function that ends
the reload. Call it once the reload ends, whether it worked or not,
as [a list that loads](#a-list-that-loads) shows. The list region
then takes a focus from a control in the parts DataViews makes inert,
as in a run, and gives it back the same way once the list reloaded.
A `ListRun` you build yourself needs an `onRefresh` too.

Such a run starts outside every dialog. So when it ends, the list
takes the focus only if the focus fell to the page or sits inside the
list. While the focus is still on your button, or on another control
the reader moved to, it stays there. When your button opens a
`ConfirmDialog` first, as Empty Trash does, call `run.onStart()`
inside `onConfirm`, as [a confirm outside a list](#a-confirm-outside-a-list)
explains. The list then takes the focus once the run moved a row,
even after the dialog closed, while the focus is still on the button
the dialog gave it back to. A reader who moved to another control by
then keeps their place. This needs godmin 0.27.0 or later.

## Confirming an action

An action that cannot be undone asks first. DataViews opens a modal
for an action that has a `RenderModal`, and `RunConfirm` is the body
of that modal for a
[run over the picked rows](#running-an-action-over-the-picked-rows):

```tsx
const trash = useMemo<Action<Post>>(
	() => ({
		id: 'move-to-trash',
		label: 'Move to trash',
		supportsBulk: true,
		hideModalHeader: true,
		modalFocusOnMount: 'firstContentElement',
		RenderModal: (props) => (
			<RunConfirm {...props} confirmLabel="Move to trash" cancelLabel="Cancel" run={(posts) => bulk(posts, (post) => trashPost(post.id), words)}>
				Move the picked posts to the trash?
			</RunConfirm>
		),
	}),
	[bulk],
)
```

A confirm that removes something, such as Move to trash or Delete
permanently, has no header, as in WordPress. Give the action
`hideModalHeader: true`, and the question is the only text. A plain
confirm, such as making an item the default, keeps its title through
`modalHeader`. Leave `modalSize` out, so the modal takes the DataViews
width, 560px, as WordPress list confirms do.
`modalFocusOnMount: 'firstContentElement'` puts the focus on Cancel.
Cancel is borderless text in your accent colour, left of the confirm
button.

For a run you write yourself, `ConfirmBody` is the same body without
the run:

```tsx
import { ConfirmBody, runEach, useCloseWhileOpen, useToaster } from '@gopherium/godmin'

function TrashModal({ items, closeModal }: RenderModalProps<Post>) {
	const toaster = useToaster()
	const close = useCloseWhileOpen(closeModal)
	const [busy, setBusy] = useState(false)
	const confirm = async () => {
		setBusy(true)
		const outcome = await runEach(items, (post) => trashPost(post.id))
		const moved = outcome.failures.length === 0
		toaster.show(moved ? 'Post moved to the trash.' : 'The post could not be moved to the trash.')
		close()
	}
	return (
		<ConfirmBody
			confirmLabel="Move to trash"
			cancelLabel="Cancel"
			busy={busy}
			onConfirm={() => void confirm()}
			onCancel={closeModal}
		>
			Move the post to the trash?
		</ConfirmBody>
	)
}
```

It draws the question, then Cancel as accent text and the solid
confirm button at the end, 20px under the question. While `busy`,
the confirm button shows a spinner and ignores a second press, and
Cancel closes nothing.

The body never shows a failure. Close the modal once the write ends,
whether it worked or not, and say how it went in a toast, as the
WordPress list confirms do.

Close it through `useCloseWhileOpen(closeModal)`, as the example
does. DataViews keeps one dialog for a row's actions menu and another
for its primary action buttons. Every dialog that opens in one of
them gets the same `closeModal`, so a write that ends after the reader
dismissed your modal and opened another one in its place would shut
the new one. The close `useCloseWhileOpen` returns does nothing once
your modal left the screen. `RunConfirm` closes this way already.
This needs godmin 0.27.0 or later.

## A confirm outside a list

Some confirms open from a button outside any list, such as Move to
trash in an editor or Empty Trash above a list. `ConfirmDialog` asks
those, as WordPress dialogs do. A confirm above a list can also start
a [list run](#running-an-action-over-the-picked-rows), as Empty Trash
does. This section says where the focus goes once that run ends.
Here the dialog asks before Move to trash in an editor:

```tsx
import { useToaster } from '@gopherium/godmin'
import { ConfirmDialog } from '@gopherium/godmin/dialogs'
import { Button } from '@wordpress/ui'

function TrashButton({ post }: { post: Post }) {
	const toaster = useToaster()
	const [asking, setAsking] = useState(false)
	const [trashing, setTrashing] = useState(false)
	const trash = () => {
		setTrashing(true)
		trashPost(post.id)
			.then(() => toaster.show('Post moved to the trash.'))
			.catch((failure) => toaster.show(failure.message))
			.finally(() => setTrashing(false))
	}
	return (
		<>
			<Button variant="outline" loading={trashing} onClick={() => setAsking(true)}>Move to trash</Button>
			{asking ? (
				<ConfirmDialog size="small" confirmLabel="Move to trash" cancelLabel="Cancel" onConfirm={trash} onClose={() => setAsking(false)}>
					Move "Hello" to the trash?
				</ConfirmDialog>
			) : null}
		</>
	)
}
```

It draws the WordPress modal: a card from 600px up, and a sheet
along the bottom of the screen below 600px, the width
`SHEET_BREAKPOINT` names. `size` picks the card width. `small` draws
it 400px wide, as WordPress does for the Move to trash button in its
editor sidebar, so the example asks for it. `medium`, the default,
is the 560px card WordPress opens for the Trash action of a list or
of an actions menu. Both sizes are the same sheet on a phone.

Leave `title` out for a confirm that removes something, so the
question is the only text. Give a plain confirm a `title`, and it
gets a header with a close button. Cancel has the focus when the
dialog opens.

What `onConfirm` returns decides when the dialog goes:

- Return nothing, and the dialog closes at once while your write
  runs. WordPress does this for a confirm that opens from a button or
  a screen menu, such as Move to trash in its editor or Empty Trash
  above a list. Show the write as busy on the button that opened the
  dialog, as the example does with `loading`. Make `onConfirm` a
  plain function, as `trash` is. An `async` function always returns
  a promise, so the dialog would stay open until the write ends. When
  the write is a list run, call `run.onStart()` inside `onConfirm`,
  while the dialog still holds the focus. The dialog gives the focus
  back to its button as it closes, and the list takes the focus once
  the run moved a row, while the focus is still on that button. A
  reader who moved to another control or opened another dialog by
  then keeps their place.
- Return the write's promise, and the dialog stays open while it
  runs. The confirm button shows a spinner and Cancel greys out. When
  the promise ends, worked or failed, the dialog closes. WordPress
  does this for a confirm that opens from a row's own menu, so use it
  for the rows of a list you draw yourself, outside DataViews:

```tsx
<ConfirmDialog
	confirmLabel="Delete"
	cancelLabel="Cancel"
	onConfirm={() => deleteGroup(group.id).catch((failure) => toaster.show(failure.message))}
	onClose={() => setAsking(false)}
>
	Delete "{group.name}"?
</ConfirmDialog>
```

Either way, show a failure in a toast. The dialog never shows one
inside. Put the `.catch` inside `onConfirm` and return what it
answers, as [a failure from a dialog](#a-failure-from-a-dialog)
explains.

The dialog calls `onClose` after Cancel, Escape, a click outside it,
the close button of a titled confirm, or a confirm that finished.
Escape, a click outside it and its close button work at any time,
even while the write runs. The write then goes on, and `onClose`
still runs only once. When the dialog goes away, the focus goes back
to the button that opened it, unless your action already moved it.

A list run started in `onConfirm` moves the focus to the list once it
moved a row, whether the dialog stayed open until then or closed
before. A dialog that stayed open lets the list keep the focus as it
closes. A dialog that closed before has given the focus back to its
button, and the list then takes the focus from that button, while
the focus is still there. Either way, a reader who moved to another
control or opened another dialog since keeps their place. This needs
godmin 0.27.0 or later.

Render the dialog only while you ask, as the example does. Each new
ask then starts fresh.

`ConfirmDialog` comes from its own entry, `@gopherium/godmin/dialogs`,
because it needs `@wordpress/components`, a large package the main
entry never loads. Install `@wordpress/components` and load its
stylesheet once, `@wordpress/components/build-style/style.css`, as
DataViews already asks.

## Renaming an item

A rename asks for one new name. `RenameBody` is the body of that
modal: a field that starts with the current name, an accent text
Cancel and the submit button:

```tsx
import { RenameBody, markLatest, useToaster, useUnsavedText } from '@gopherium/godmin'
import type { Action } from '@wordpress/dataviews'

function useRenameAction(): Action<Post> {
	const toaster = useToaster()
	const renames = useUnsavedText()
	return useMemo<Action<Post>>(
		() => ({
			id: 'rename',
			label: 'Rename',
			modalHeader: 'Rename',
			modalFocusOnMount: 'firstContentElement',
			RenderModal: ({ items: [post], closeModal }) => (
				<RenameBody
					name={renames.get(post.id) ?? post.title}
					fieldLabel="Name"
					submitLabel="Save"
					cancelLabel="Cancel"
					onSubmit={(title) => {
						closeModal?.()
						renames.delete(post.id)
						const stillLatest = markLatest(renames, post.id)
						renamePost(post.id, title)
							.then(() => toaster.show('Name updated.'))
							.catch((failure) => {
								if (stillLatest()) {
									renames.set(post.id, title)
								}
								toaster.show(failure.message)
							})
					}}
					onCancel={closeModal}
				/>
			),
		}),
		[toaster, renames],
	)
}
```

Leave `modalSize` out, so the rename takes the DataViews width, 560px,
as the WordPress rename does. WordPress titles it Rename and labels
its button Save, and the example does the same.

The submit button is off only while the field is blank. A name left
as it was can still be sent, as in the WordPress rename. Enter in the
field does what the submit button does. `onSubmit` gets the name
exactly as typed, and your code does the write and the toast.

A rename closes the moment the reader presses Save, before its write,
as WordPress closes its rename. So the body is never busy and never
shows a failure. When the write fails, say so in a toast and keep
what the reader typed. `name` is the text the field starts with, so
hand that text back on the next open. The reader then finds the name
they typed and can try once more.

`useUnsavedText` holds that text, by item id, for as long as the
screen stays. Keep it in the hook that builds the action, never in the
modal, which goes the moment the reader saves. Clear the item's text
before each write, so a save that works leaves nothing behind.
`markLatest` marks the write as the latest one sent to the item and
returns a check. Keep the failed text only while the check holds, so
an earlier save that fails late never overwrites what a later save
sent, and a later save that works is never undone. The store holds
any value, so a form with several fields keeps them all, as
`useUnsavedText<Fields>()`. This needs godmin 0.24.1, or 0.27.0 or
later. 0.25.0 and 0.26.0 do not have it.

Every word comes from you: the field label, both button labels and
the toasts. Pass them through your translations.

`modalFocusOnMount: 'firstContentElement'` puts the cursor in the
field when the modal opens, as the WordPress rename does. Without it,
the modal window itself takes the focus, and the reader has to press
Tab to reach the field.

## A form in a row action

Some row actions ask for more than a yes or a name, such as a copy
with a title of its own or a new role for a user. `FormBody` is the
body of that modal: the fields you give it, an accent text Cancel and
the submit button. It is a real form, so Enter in a field sends it:

```tsx
import { FormBody, useCloseWhileOpen, useToaster } from '@gopherium/godmin'
import type { Action, RenderModalProps } from '@wordpress/dataviews'
import { InputControl } from '@wordpress/ui'

function DuplicateModal({ items: [post], closeModal }: RenderModalProps<Post>) {
	const toaster = useToaster()
	const close = useCloseWhileOpen(closeModal)
	const [title, setTitle] = useState(`${post.title} (Copy)`)
	const [busy, setBusy] = useState(false)
	const duplicate = () => {
		setBusy(true)
		duplicatePost(post.id, title)
			.then(() => toaster.show(`"${title}" created.`))
			.catch((failure) => toaster.show(failure.message))
			.finally(close)
	}
	return (
		<FormBody
			kind="copy"
			submitLabel="Duplicate"
			cancelLabel="Cancel"
			canSubmit={title.trim() !== ''}
			busy={busy}
			onSubmit={duplicate}
			onCancel={closeModal}
		>
			<InputControl label="Title" value={title} onChange={(event) => setTitle(event.target.value)} />
		</FormBody>
	)
}

const duplicateAction: Action<Post> = {
	id: 'duplicate',
	label: 'Duplicate',
	modalHeader: 'Duplicate',
	modalFocusOnMount: 'firstContentElement',
	RenderModal: DuplicateModal,
}
```

`submitLabel` and `cancelLabel` name the two buttons. `onSubmit` runs
from the submit button or from Enter, and `onCancel` from Cancel.
`canSubmit` turns the submit button off, for example while a needed
field is empty. The button stays reachable with Tab, so a keyboard
reader still finds it. While `busy`, the submit button shows a
spinner and a second send does nothing. Cancel stays live the whole
time, as in WordPress forms.

`kind` says what the form does, and sets the space above the buttons
as WordPress spaces it:

| `kind` | For | Space above the buttons |
| --- | --- | --- |
| `edit`, the default | A change to one item, such as a new role | 20px |
| `copy` | A copy of an item, such as Duplicate | 12px |
| `create` | Something new | 16px |

When the modal closes depends on the action, as in WordPress:

- A change to one item closes the moment the reader sends it, before
  its write, like the [rename](#renaming-an-item). Call `closeModal`
  first, then write.
- A copy, something new, or a change to several items stays open with
  its button busy, then closes when the write ends, worked or failed.
  Set `busy` while it runs, and close it through
  `useCloseWhileOpen(closeModal)`, as the example does.
  [Confirming an action](#confirming-an-action) says why. This needs
  godmin 0.27.0 or later.

Either way, a failure goes in a toast. `FormBody` never shows one. To
give the reader back what they typed after a failure, keep it in a
`useUnsavedText` store outside the modal and pass it in as the first
value of the fields, as the rename does.

Leave `modalSize` out, so the form takes the DataViews width, 560px,
as WordPress row forms do. `modalFocusOnMount: 'firstContentElement'`
puts the cursor in the first field.

## A form dialog

Some forms open from a button outside any list, such as Add Project
in a page header. `FormDialog` asks those, as WordPress opens its Add
Page dialog: a card with a title and a close button, the cursor in
the first field, and the same form as `FormBody` inside:

```tsx
import { useToaster } from '@gopherium/godmin'
import { FormDialog } from '@gopherium/godmin/dialogs'
import { Button, InputControl } from '@wordpress/ui'

function AddProjectDialog({ onClose }: { onClose: () => void }) {
	const toaster = useToaster()
	const [name, setName] = useState('')
	const add = async () => {
		await addProject(name)
		toaster.show(`"${name}" added.`)
		onClose()
	}
	return (
		<FormDialog
			title="Add Project"
			submitLabel="Add"
			cancelLabel="Cancel"
			canSubmit={name.trim() !== ''}
			onSubmit={() => add().catch((failure) => toaster.show(failure.message))}
			onClose={onClose}
		>
			<InputControl label="Name" value={name} onChange={(event) => setName(event.target.value)} />
		</FormDialog>
	)
}

export function AddProjectButton() {
	const [asking, setAsking] = useState(false)
	return (
		<>
			<Button size="compact" onClick={() => setAsking(true)}>
				Add Project
			</Button>
			{asking ? <AddProjectDialog onClose={() => setAsking(false)} /> : null}
		</>
	)
}
```

Render the dialog only while you ask, as the example does. Keep the
state of the fields in the dialog's own component, as
`AddProjectDialog` does, so each new ask starts with empty fields.

`size` picks the card width from 600px up. `small`, the default,
draws it 400px wide, as WordPress draws Add Page. `medium` draws it
560px wide, for a form whose controls need the room. Below 600px both
are the same sheet along the bottom of the screen. `title` is the
heading beside the close button. `submitLabel`, `cancelLabel` and
`canSubmit` work as in `FormBody`. So does `kind`, but a dialog is a
`create` by default, 16px above its buttons.

`onSubmit` runs from the submit button or from Enter. Return the
write's promise, and the submit button shows a spinner until the
write ends. A second send meanwhile does nothing. The dialog never
closes itself after a send:

- When the write worked, close it yourself, as `add` does with
  `onClose`.
- When the write failed, leave it open, as WordPress leaves Add Page.
  The reader keeps what they typed and can try again. Show the
  failure in a toast, with the `.catch` inside `onSubmit`, as
  [a failure from a dialog](#a-failure-from-a-dialog) explains.

A form that opens from a row's own menu, in a list you draw yourself,
and changes that one item closes before its write, like the
[rename](#renaming-an-item). Give it `size="medium"`, the width
WordPress gives its row forms, and `kind="edit"`. In `onSubmit`, take
the dialog away first, then start the write, and return nothing.

Cancel, Escape, a click outside the dialog and its close button all
call `onClose`, even while the write runs. When the dialog goes away,
the focus goes back to the button that opened it.

`FormDialog` comes from `@gopherium/godmin/dialogs`, like
`ConfirmDialog`, so it needs `@wordpress/components` and its
stylesheet the same way.

## Putting the focus back on a row

A dialog your screen holds open on one row, such as Change role on a
user, goes away once the reader is done. WordPress then gives the
focus back to what opened it. When the list drew that row again in
the meantime, for example because the write moved it to another
place, the button that opened the dialog is gone and the focus falls
to the page. `useFocusBack` finds the row again and puts the focus
back:

```tsx
import { focusedTrigger, useFocusBack, useListRun } from '@gopherium/godmin'
import type { Trigger } from '@gopherium/godmin'

const { run, region } = useListRun('users', list.onChangeSelection)
const focusBack = useFocusBack(users.isFetching, region)
const [opened, setOpened] = useState<{ user: User, trigger: Trigger }>()

const close = (shown: { user: User, trigger: Trigger }) => {
	setOpened(undefined)
	focusBack(shown.user.id, shown.trigger)
}
```

Mark the title cell of each row with the id DataViews keys the row
by, as `data-item-id`. That mark is how the hook finds the row in any
layout:

```tsx
render: ({ item }) => <span data-item-id={item.id}>{item.name}</span>
```

Then note the trigger each dialog opened from. `focusedTrigger()`
reads it from the focus the click, tap or key left:

```tsx
onClickItem={(user) => setOpened({ user, trigger: focusedTrigger() })}
callback: ([user]) => setOpened({ user, trigger: focusedTrigger() })
```

The hook knows four triggers on a row: the title and the media a
click opens from, the phone row a tap opens from and the actions
menu. It finds the grid card, the phone list row or the table row
that holds the item now and focuses the same trigger there. When that
layout has no such trigger, such as a title in the phone list, it
focuses the row's actions menu. When the item left the list, or its
row has no actions menu, the list region takes the focus.

An action chosen in the bulk bar reads `bulk` from `focusedTrigger()`.
The bar goes away once the selection clears, so the list region
takes the focus.

The hook only moves a focus the page lost. When WordPress already put
the focus back, or the reader moved it, it stays where it is. While
the first argument is `true`, for example while the list reads its
rows again, the hook waits, since a busy list is out of reach of the
focus. Pass the same `region` you hand `Page` as `listRef`. The hook
looks for the region when the focus is asked back. When the list is
busy then, it looks once the wait ends. A screen that draws no region
at that point gets no focus moved, even when it draws one later.

A list can draw the row again just after the focus went back to it.
The grid does this as it measures how many cards fit side by side,
since a card that moves to another row of cards is drawn anew. The
focus then falls to the page. The hook watches the list for this and
puts the focus on the same trigger of that row again, each time the
list draws it anew. When the item leaves the list instead, the list
region takes the focus and the hook stops watching. It also stops
once the reader moves the focus or presses somewhere else, the focus
is asked back again or the screen goes away, so a control the reader
moved to keeps the focus. This needs godmin 0.27.0 or later.

## A failure from a dialog

A write that fails never shows inside a dialog. It shows in a toast,
as WordPress shows it in its snackbar. When `onSubmit` or `onConfirm`
returns a promise, show the toast from inside that same function, and
return the promise that `.catch` answers:

```tsx
onSubmit={() => save(values).catch((failure) => toaster.show(failure.message))}
```

`.catch` answers a new promise. That one ends with no error once the
toast shows. The dialog stops its spinner, a `ConfirmDialog` closes,
and no error goes on to your app. An `async` function that catches
its own error inside works the same way, as long as you return what
it answers.

The line works whatever `save` ends with, the saved item or nothing,
since the dialog only waits for the promise to end. This needs godmin
0.23.1 or later.

`.catch` sees a failure only when the write's promise
rejects. Many GraphQL clients answer an object with `error` instead,
as [bulk actions](#bulk-actions) says. With such a client, throw that
`error` inside your write. Otherwise the dialog takes the write as
one that worked.

Do not add the `.catch` as a separate step and then return the first
promise:

```tsx
onSubmit={() => {
	const saving = save(values)
	saving.catch((failure) => toaster.show(failure.message))
	return saving
}}
```

The toast shows, but `saving` itself still fails. The dialog waits on
`saving`, so it gets the error too and hands it on to your app as an
error nobody caught. The same failure reaches your app a second
time, after you already showed it.

That handing on is on purpose. A failure you did not catch is one you
did not expect, and it should not go quiet. It reaches your app,
where the browser console and your error reporting see it.

## An upload button

`FileButton` is a compact button that opens the file dialog:

```tsx
import { FileButton } from '@gopherium/godmin'
import { upload } from '@wordpress/icons'

<FileButton accept="image/*" multiple icon={upload} busy={uploading} onChoose={uploadAll}>
	Upload media
</FileButton>
```

It keeps a hidden file input beside it. `onChoose` gets the chosen
files, and is not called when the reader closes the dialog with none.
The input is emptied after each choice, so the same file can be
chosen again. `icon` is drawn before the label. `inputLabel` names
the hidden input, so a test can find it with `getByLabelText`. While
`busy`, the button shows a spinner and ignores a press.

It is compact and solid unless you say otherwise, as a page header
button is. `variant`, `tone` and `size` take the design system
button's values. In a dialog header, draw it as WordPress draws the
upload button of its media dialog, a default size button with no
fill:

```tsx
<FileButton variant="minimal" tone="neutral" size="default" onChoose={uploadAll}>
	Upload files
</FileButton>
```

## Buttons in the list header

A list page puts its actions beside the title, in `actions`. As in
WordPress lists, the main action is one solid compact button, and
every other one is an outline compact button:

```tsx
<Page
	title="Media"
	list
	actions={
		<>
			<Button variant="outline" size="compact" onClick={exportAll}>
				Export
			</Button>
			<FileButton accept="image/*" multiple onChoose={uploadAll}>
				Upload media
			</FileButton>
		</>
	}
>
	<DataViews {...props} />
</Page>
```

## The canvas colour

The frame seeds the canvas with the design system default background,
which [the three seeds](./design-system/color.md#the-three-seeds)
gives. The canvas then paints white, the row lines are `#f0f0f0` and
the muted text `#707070`, as in WordPress. The canvas also sets
`--wp-dataviews-color-background`, so the list, its sticky header and
its footer stay the same white as the page around them. You do
nothing.

## The accent colour

DataViews and `@wordpress/components` draw their accents, such as a
selected row or a focus ring, from `--wp-admin-theme-color`.
`AdminRoot` sets that variable from the `primary` colour you pass it.
It sets it on the document root, so menus and modals that render
outside your tree follow it too.

```tsx
<AdminRoot color={{ primary: '#c9356e' }}>
	<App />
</AdminRoot>
```

## The title field

Name the field that links to the record as the view's `titleField`:

```ts
const view = { type: 'table', titleField: 'name', fields: ['email', 'status'] }
```

DataViews then draws that field with a link that has no underline,
like the Posts list. A link in any other field keeps the browser's
underline.

Name a second field as `descriptionField` to show it under the title,
such as an email address under a name:

```ts
const view = { type: 'table', titleField: 'name', descriptionField: 'email', fields: ['status'] }
```

In a list page godmin sets the pair the way the WordPress subscriber
list does, as [rows](./design-system/lists.md#rows) gives.

## Avatars

`InitialsAvatar` draws a round avatar with the first letter of a
name, on a colour the name picks. Use it as the render of the view's
`mediaField`:

```tsx
import { InitialsAvatar } from '@gopherium/godmin'

const avatar = {
	id: 'avatar',
	label: 'Avatar',
	render: ({ item }) => <InitialsAvatar name={item.name} />,
	enableSorting: false,
}
const fields = [nameField, emailField, avatar]
const view = { type: 'table', titleField: 'name', mediaField: 'avatar', fields: ['status'] }
```

It is 32px wide with a 12px semibold letter, and the name starts 8px
after it, as in the WordPress subscriber list. The capital of the
letter sits in the middle of the circle, as the WordPress avatar
draws it. godmin trims the letter's line to the capital and the
baseline with the CSS `text-box` property, so the letter stays
centred whatever font the page uses. A browser without `text-box`
draws it about a pixel low.

Pass `size` to draw it at another width in pixels, such as
`size={16}` for the small avatar WordPress puts before an author
name. The letter keeps its share of the circle, 12px in 32px, so it
is 6px at 16px.

Pass `src` to show a picture in the same round box, such as the
address gouncer's [`avatar` package](https://docs.gopherium.org/authentication/avatars/) builds
from the site's avatar setting. When the address is empty or the
picture fails to load, the letter comes back.

DataViews draws media in a square box with 4px corners and a thin
dark ring. godmin rounds that box and drops the ring when it holds an
avatar, in the table and in the list layout, because the WordPress
avatar has no dark edge. In the list layout the avatar fills the
larger box and its letter grows with it.

On a list page the media of a row sits in the middle of the row. Next
to a title with a description under it, the avatar is level with the
pair, as in the WordPress subscriber list, instead of with the title
alone.

The same name always gets the same colour, whatever its case and the
browser's language. The six
colours start with the blue, raspberry and purple of the WordPress
subscriber avatars, each with the pale letter WordPress draws on it,
then a green, an amber and a grey with a white letter. All six reach
4.5 to 1 against their letter, the contrast a screen needs for small
text. The avatar is hidden from screen readers, because the
name next to it already says who it is. Without `src` it never loads
a picture, so no address leaves your application.

## Lists that stay custom

Some lists cannot be DataViews, such as a list the user orders by
hand with arrows. Keep those a `godmin-table`. It looks like the
DataViews table, with small capital headers, rows as tall as the
DataViews rows and a light line between rows. Rows also tint under
the pointer and while keyboard focus is inside them, which DataViews
does not do.
[Tables that stay custom](./design-system/lists.md#tables-that-stay-custom)
gives every value.

Mark the cell that names the record `godmin-table__title`. It draws
the name bold, as DataViews draws its titles. A link inside it has no
underline and turns the accent colour under the pointer, like a
DataViews title field:

```tsx
<td className="godmin-table__title">
	<Link to="/fields/$id" params={{ id: field.id }}>{field.label}</Link>
</td>
```

Inside a `list` page the table reaches the canvas edges too, and its
first and last cells pad as DataViews pads its own. A custom list
and a DataViews list then line up with each other and with the title.

While its first rows load, show `LoadingScreen` in place of the
table, as
[a list that loads](./loading-and-feedback.md#a-list-that-loads) says.

## The list chrome in Spanish

DataViews speaks English until you load its translations. Its words,
such as Search, View options, Items per page and Next page, live in
the WordPress `default` text domain. godmin ships a Spanish catalogue
for them. Add it to the domains you load at startup:

```ts
import { LIST_CHROME_DOMAIN, listChromeCatalogFor } from '@gopherium/godmin'
import { startLocale } from '@gopherium/gottext'

await startLocale(resolveLocale, [
	{ domain: 'myapp', load: myappCatalog },
	{ domain: LIST_CHROME_DOMAIN, load: listChromeCatalogFor },
])
```

`listChromeCatalogFor` answers the catalogue for `es-ES`, and one
for `fr-FR` with the loading words, the [list date](#dates-in-a-list)
words and
[godmin's own words](./framing-an-application.md#godmins-own-words),
the words of `ListNoResults` among them.
For any other language it answers `undefined`. French readers and
those others keep the English chrome. Each catalogue is its own small
module, so a bundler loads it only for a reader who needs it.

The Spanish one covers every word DataViews shows around a list: the
search box, the view options, the filters, the column menus, the
paging and the bulk bar. It also covers the two words
`@wordpress/components` shows inside a list, the search reset button
and the modal close button. It does not cover DataForm.

The translations are machine made. They stay marked fuzzy in the
sources, `src/list-chrome/es-ES.po` and `src/list-chrome/fr-FR.po`
in the godmin repository, until a translator checks them. A test
holds every word of the Spanish one against the DataViews build, so a
DataViews release that adds or renames one fails the godmin tests
instead of showing English.

Keep one copy of `@wordpress/i18n` on the page. `godminDedupe` lists
it for Vite. With two copies, the catalogue would land in one while
DataViews reads the other.

## Dates in a list

WordPress lists write a date and time in a short form, such as
Oct 13, 2026 5:04 pm. `listDate` writes that form, in a column's
`render`:

```tsx
import { listDate } from '@gopherium/godmin/dates'

const created = {
	id: 'created',
	label: 'Created',
	render: ({ item }) => listDate(item.createdAt),
}
```

It takes a `Date` or the text a server stored. Empty text writes the
current moment, so a cell with no date should not call it.

The dates live in their own entry, `@gopherium/godmin/dates`, because
they bring `@wordpress/date`, moment and its time zone data, close to
800 KB. Install `@wordpress/date` and `@wordpress/i18n` to use it. The
main entry never loads them. If your first paint has a size limit,
import the dates entry only from code that loads on demand with your
lists, never from the code that runs before first paint.

Set the list dates up once the catalogues load, before the first list
renders. `startLocale` answers the language it settled on:

```ts
import { startListDates } from '@gopherium/godmin/dates'

const locale = await startLocale(resolveLocale, [
	{ domain: 'myapp', load: myappCatalog },
	{ domain: LIST_CHROME_DOMAIN, load: listChromeCatalogFor },
])
startListDates(locale)
```

Until then `listDate` writes English on the UTC clock.

`startListDates` takes the month and weekday names, am and pm, the
two date-and-time formats and the first weekday from the loaded
catalogue, as WordPress does. The same moment then reads:

| Reader | Writes |
| --- | --- |
| English | Oct 13, 2026 5:04 pm |
| Spanish, `es-ES` | 13 Oct 2026 17:04 |
| French, `fr-FR` | 13 octobre 2026 17h04 |

Any other language writes English. The messages are the WordPress
core ones, such as `F j, Y g:i a` and `M j, Y g:i a` for the two
formats, so your own catalogue for the `default` domain can answer
them too.

Dates show on the reader's clock, the browser's time zone. Pass a
time zone to show another one, such as
`startListDates(locale, 'Europe/Madrid')`. Text with no offset, such
as `2026-10-13T17:04`, is read as a time on that clock.

The same call sets the calendar language and the clock that the
DataViews date fields and filters read. It does not reach their
format or their first weekday. DataViews copies those into each field
type when it first loads, before the call. So give a `date` or
`datetime` field its own `format`, built after the call, in the code
that builds the fields at render:

```tsx
import { listDate } from '@gopherium/godmin/dates'
import { getSettings } from '@wordpress/date'

function listFields() {
	return [
		{
			id: 'created',
			label: 'Created',
			type: 'datetime',
			render: ({ item }) => listDate(item.createdAt),
			format: {
				datetime: getSettings().formats.datetime,
				weekStartsOn: getSettings().l10n.startOfWeek,
			},
		},
	]
}
```

Call `listFields()` in the component that draws the list, never at
the top of a module, which can run before the call.

A `date` field reads `formats.date` instead, which the call leaves at
the English `F j, Y`. Give it a `date` format of your own.

Call `startListDates` again when the reader changes language, once
the new catalogues load. Then build the fields again, so their
`format` follows.

godmin keeps each set of words under a private language name, such
as `es-ES-x-g0`. So `getSettings().l10n.locale` from `@wordpress/date`
no longer holds the bare language. Read it from what `startLocale`
answered instead.
