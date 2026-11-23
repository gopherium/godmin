---
title: Screens and the page kit
description: Components for the layout every admin screen repeats, a title, some actions, and the content below.
---

Almost every admin screen has the same top: a title on the left,
maybe a button or two on the right, and the content below. The page
kit is that layout as components, so you stop re-typing it.

Each component's props interface is exported under its own name,
such as `PageProps` and `NavigationScreenProps`, for when you wrap
one in a component of your own.

## Page

```tsx
<Page title="Reports" actions={<Button>New report</Button>}>
	<ReportTable />
</Page>
```

`title` is required and becomes the page's heading, at the size of a
WordPress page title. It is an `h1` unless you pass
`headingLevel`, as [heading levels](#heading-levels) explains. It is
also what a screen reader hears when the screen opens, as
[what a screen reader hears when the screen changes](./design-system/frame.md#what-a-screen-reader-hears-when-the-screen-changes)
says.
`actions` renders top right,
and `className` and `children` do what they always do. When the
actions no longer fit beside the title, on a phone for example, they
move to a line of their own under it. Beside breadcrumbs the title
gives way first, and the actions move only once it reaches its
smallest width.

`subtitle` renders as one grey line under the title and the actions,
the way WordPress sets the sentence under a page title. The title row
keeps its height even with no actions, so the title and the subtitle
sit in the same place on every page. Give the page compact buttons,
`size="compact"`, to match the buttons of a WordPress page header. A
button of the default size makes the row taller.
[The page header](./design-system/record-pages.md#the-page-header)
gives the values.

`tabs` renders a row of tabs under the title block. See
[PageTabs](#pagetabs) below.

`breadcrumbs` renders links back to what a record belongs to, before
the title. See [PageBreadcrumbs](#pagebreadcrumbs) below.

`aside` adds the details of a record in a fixed column at the end of
the page. `asideLabel` names that column for a screen reader:

```tsx
<Page title="Invoice 1042" aside={<InvoiceDetails />} asideLabel="Invoice details">
	<InvoiceLines />
</Page>
```

Put what grows, such as the invoice lines or a history, in the
content, and the record's own short fields and facts in the aside.
When the page is too narrow for both, the aside moves under the
content. An aside that renders nothing takes no room. A page with an
aside keeps its title in view while the content scrolls under it.
[Record pages](./design-system/record-pages.md) gives every value, and
what goes where.

`list` marks a page whose content is a list, such as a DataViews
table. The content then reaches out to the canvas edges, so the
list's row lines run from edge to edge and its own padding lines up
with the title. A page with an `aside` keeps its list inside the main
column. [Lists with DataViews](./lists.md) shows it in full.

```tsx
<Page title="Users" list>
	<UserList />
</Page>
```

`listLabel` names the list region, so a screen reader announces it.
`listRef` hands your code the list, so it can move the focus there.
With either one, the list can take the focus but stays out of the
Tab order.
[Running an action over the picked rows](./lists.md#running-an-action-over-the-picked-rows)
uses both to move the focus back to the list once a row moved,
while the reader is still with the run.
[Putting the focus back on a row](./lists.md#putting-the-focus-back-on-a-row)
hands the same ref to `useFocusBack`, which puts the focus back on
the row a dialog opened from.

A screen that fills the canvas edge to edge builds its own layout
and uses `PageTitle` directly, so the page still gets its heading.
Give it plain text, since that text is also what a screen reader
hears when the screen opens:

```tsx
<PageTitle>Conversations</PageTitle>
```

It draws the large heading by default. Pass `variant` to change
the text size, and `level` to change the heading level.

## PageTabs

`PageTabs` and `PageTab` split a page into sections that each have
their own address, like the Subscribers and Settings tabs of a
WordPress page:

```tsx
<Page
	title="Users"
	list
	tabs={
		<PageTabs label="User sections">
			<PageTab render={<Link to="/users" activeOptions={{ exact: true }} />} current>
				Users
			</PageTab>
			<PageTab render={<Link to="/users/tokens" activeOptions={{ exact: true }} />}>
				API tokens
			</PageTab>
		</PageTabs>
	}
>
	<UserList />
</Page>
```

Each tab is a link. Pass your router's link element as `render`, or
a plain address as `href`. godmin does not know your router, so it
renders whatever link you give it and adds its own class. `current`
marks the tab of the page on screen, and a screen reader hears it as
the current page.

`current` alone decides which tab is underlined. A router link can
still mark itself as the current page for screen readers. TanStack
Router counts a link to `/users` as active on `/users/tokens` too,
so without `activeOptions={{ exact: true }}` a screen reader would
hear both tabs as the current page. Pass it on every tab link, as the
example does.

`label` names the tab row for assistive technology. The row is a
navigation region, and a screen reader lists it beside the sidebar,
so the name tells them apart.

The tabs look like the WordPress tabs: 13px labels 16px apart, the
current one underlined by a 2px dark line as wide as its label, and a
1px light line under the row that runs to the canvas edges. A tab
under the pointer or the keyboard gets a soft shade that reaches 4px
past its label. The current tab keeps its plain look under the pointer.

They are links and not the design system `Tabs` component on
purpose. `Tabs` switches panels inside one page and moves between
tabs with the arrow keys. A tab here opens another page, so it is a
link, reached with Tab and marked with `aria-current`, which is how
assistive technology expects page navigation to work. godmin copies
the look of the WordPress tabs and keeps the behavior of links.

## PageBreadcrumbs

`PageBreadcrumbs` and `PageBreadcrumb` lead the title of a record with
links back to what it belongs to, like `Contacts / Maria Perez`, the
way a WordPress record page names its list:

```tsx
<Page
	title="Maria Perez"
	breadcrumbs={
		<PageBreadcrumbs label="Breadcrumbs">
			<PageBreadcrumb render={<Link to="/contacts" activeOptions={{ exact: true }} />}>Contacts</PageBreadcrumb>
		</PageBreadcrumbs>
	}
	aside={<ContactDetails />}
>
	<ContactTasks />
</Page>
```

Each breadcrumb is a link. Pass your router's link element as
`render`, or a plain address as `href`, as with `PageTab`. Leave the
page on screen out of the list, since its title already names it.

No breadcrumb is the current page, yet a router link can mark itself
as one for screen readers. TanStack Router counts a link to
`/contacts` as active on `/contacts/42` too, so without
`activeOptions={{ exact: true }}` a screen reader would hear the
breadcrumb as the page on screen. Pass it on every breadcrumb link, as
the example does.

`label` names the links for assistive technology. They are a
navigation region, and a screen reader lists it beside the sidebar and
any tabs, so the name tells them apart. Translate it.

Every page opened from a list takes breadcrumbs, a create page too,
as in `Contacts / New contact`. Beside breadcrumbs the title stays on
one line, so a long one ends in an ellipsis.
[The page header](./design-system/record-pages.md#the-page-header)
gives the values.

## SectionTitle

`SectionTitle` heads a section inside a page, one size step above
the field labels, so a section never reads like another label:

```tsx
<SectionTitle>Identities</SectionTitle>
```

It renders an `h2`. Pass `level={3}` for a section inside a section,
which renders an `h3` a size smaller. `id` and `tabIndex` pass through
to the heading, so a screen can name a list after it or move focus to
it.

## Heading levels

With [the sidebar menu](./framing-an-application.md#the-sidebar-menu),
the title of a sub menu is the `h1`, and the root screen of the menu
draws no heading. Pass `headingLevel={2}` to every `Page` beside it:

```tsx
<Page title="Posts" headingLevel={2} list>
	<PostList />
</Page>
```

Every title inside that `Page`, such as a `SectionTitle`, then moves
down one level. Pass `level={2}` to a `PageTitle` you draw yourself
beside the sidebar.
[The heading outline](./design-system/typography.md#the-heading-outline)
gives the level each title takes, with and without the sidebar.

## NavigationScreen

`NavigationScreen` draws one sub menu of
[the sidebar menu](./framing-an-application.md#the-sidebar-menu),
the way WordPress's new admin draws it: a title row with Back, then
the content.

```tsx
<NavigationScreen title="Chats" description="Conversations waiting for a reply.">
	<ChatList />
</NavigationScreen>
```

- `title` is the `h1` of the sub menu, in 15px text on a 32px line.
- Back is a chevron link at the start of the title row. Inside
  `Navigation` it goes to the app's `home`. Pass `back`, a link
  element from your router, to send it somewhere else. The root
  screen has no Back.
- Back draws the link you pass with the chevron in place of anything
  the link holds. Its own class comes first and the link's class
  after it. The link's `onClick` runs first, and Back records its
  move only when that click did not call `preventDefault()`. The
  link's `style` and data attributes stay.
- `backLabel` names Back for assistive technology. It defaults to
  "Back", translated by godmin. An `aria-label` on the link you pass
  wins over it.
- Back is your router's own link, so it carries the mark of the
  current page, which a screen reader hears, while a slow `home`
  loads. Let the loader of `home` answer fast, as
  [the sidebar marks](./design-system/frame.md#the-sidebar-marks)
  says.
- `description` renders above the content, and `actions` at the end
  of the title row.
- `footer` stays at the bottom of the screen while the rest scrolls.

A region you leave out renders nothing, not even empty spacing. The
title row stays at the top while the screen scrolls.

The title takes no focus when the screen opens. `Navigation` moves
the focus itself: to Back when a sub menu opens, and to the row the
reader came from after Back.

## ErrorNotice

```tsx
<ErrorNotice>Reports could not be loaded.</ErrorNotice>
```

It renders the design system's error notice and announces the
message to screen readers. Use it wherever you would otherwise
render a bare error string, such as a screen that failed to load. A
write that fails goes in a toast instead, as
[what goes in a toast](./loading-and-feedback.md#what-goes-in-a-toast)
explains. A dialog that stays open draws its own notice, as
[a failed write](./design-system/dialogs.md#a-failed-write) says.

## LoadMore

`LoadMore` renders a load more button for a paginated list, and
nothing at all once every page is loaded:

```tsx
<LoadMore query={reports}>Load more reports</LoadMore>
```

`query` needs three members, `hasNextPage`, `isFetchingNextPage`
and `fetchNextPage`, a shape exported as `LoadMoreQuery`. That is
what a TanStack Query infinite query looks like, but nothing here
imports TanStack Query, so any object with those three works. The
button disables itself while a page is loading.

## LogList

`LogList` shows items one under the other, such as the dated notes
kept on a record. Each `LogItem` has a header line, with a label at
the start and room for actions at the end, then its text, then
anything else you add:

```tsx
<h3 id="notes-heading">Notes</h3>
<LogList aria-labelledby="notes-heading">
	{notes.map((note) => (
		<LogItem
			key={note.id}
			aria-label={`Note from ${note.shownAt}`}
			label={<LogTime dateTime={note.at}>{note.shownAt}</LogTime>}
			actions={
				<Button
					variant="minimal"
					size="compact"
					aria-label={`Edit the note from ${note.shownAt}`}
					onClick={() => edit(note.id)}
				>
					Edit
				</Button>
			}
			body={note.text}
		/>
	))}
</LogList>
```

`aria-labelledby` takes the id of the heading above the list, and
a screen reader names the list after that heading.

`LogTime` shows a date or time as small muted text inside a `time`
element. Give it the value in machine-readable form as `dateTime`,
and the words your reader sees as children. godmin formats nothing.

The list keeps your order and never sorts, so pass the newest item
first when the log reads that way. `body` is plain text and keeps its
line breaks. Put anything richer, such as small "Label: value" lines,
in the children under it.

In a narrow column the actions move under the label and stay at the
end of the line. No breakpoint decides this, so the list looks right
in an aside and in the main column alike.

A list with no items takes no room, so show your own empty sentence
beside it. An item with no label and no actions has no header line,
so you can swap a form in as its only child while someone edits it.

An item's `aria-label` names the item, not the buttons inside it. A
screen reader that lists the buttons on the page still shows every
one of them as just Edit. So give each action its own name that says
which item it acts on, as the example does.

The list holds no state. Which item is being edited or waiting for a
confirmation is yours to track, and so is focus.

## RepeatRows

`RepeatRows` edits a list of rows, such as visits with a date and a
note each. Every row sets its inputs on one line with a move up
arrow, a move down arrow and a trash icon at the end, and an add
button sits under the list. In a narrow list the arrows and the
trash drop under the inputs, still at the end. Wrap a row's inputs
in a `godmin-form__row` to set them side by side as well.

```tsx
<RepeatRows
	rows={visits}
	onChange={setVisits}
	blank={() => ({ date: '', note: '' })}
	renderRow={(visit, update) => <VisitFields visit={visit} onChange={update} />}
	rowLabel={(at) => `Visit ${at + 1}`}
	labels={{ add: 'Add visit', empty: 'No visits yet.', moveUp: 'Move up', moveDown: 'Move down', remove: 'Remove' }}
	max={10}
/>
```

The list stays yours. The editor shows `rows` and hands every change
to `onChange` as a new array. `min` and `max` only limit remove and
add. They never trim or pad the rows you pass in.

Set the new array right away, not inside `startTransition`. A click
that lands before your render builds on the rows still shown, so the
change before it would be lost.

Keep each row object `onChange` gives you. The editor tells rows apart
by identity, so a row rebuilt as a new object counts as a new row and
its inputs start over.

When a keyboard user removes a row, focus moves to the row that took
its place, or to the row before it when the last row goes. When the
only row goes, focus moves to the add button. When the add button
makes a row, focus moves into it.

`RowControls` is the move and remove buttons alone, and `useRowKeys`
is the hook underneath, for a list that needs its own add step. The
trash sits a little apart from the arrows, so a press that lands
slightly off does not remove a row.

`RowControls` with `movable={false}` draws the trash alone, for a
list whose order means nothing, such as the rules of a condition. It
then needs only the `remove` word in `labels` and `onRemove`, and its
props are `RowControlsWithoutMoveProps`. Name each trash after its
row, such as Remove rule 2. Wrap the row in `godmin-rows__line` and
its inputs in `godmin-rows__inputs`, so the trash drops under the
inputs on a narrow row, and move the focus after a remove as
`RepeatRows` does. When the arrows are off, the trash keeps no extra
gap.

## keyFromLabel

`keyFromLabel` turns a label someone typed into a key for code.
`keyFromLabel('Birth date', { style: 'camel' })` answers `birthDate`,
and `kebab` style answers `birth-date`. Accents are dropped, and
letters such as ß and ø are spelled in plain a to z. When the key is
already in `taken`, the first free number is added, so `birthDate`
becomes `birthDate2`.

## A server message under a field

Some values only the server can reject, such as an email address
another account already uses. Its words then go under the field they
are about, the way a check made before sending would.
`useRejectedField` holds those words for one field.

Here `invite` answers the server's words about the email, or nothing
when it worked.

```tsx
const [email, setEmail] = useState('')
const rejectedEmail = useRejectedField(email)
const toaster = useToaster()
const send = async () => {
	const sent = email
	const words = await invite(sent.trim())
	if (words === undefined || rejectedEmail.reject(words, sent)) {
		return
	}
	toaster.show(`Could not send the invitation. ${words}`)
}

return (
	<form
		className="godmin-form"
		onSubmit={(event) => {
			event.preventDefault()
			void send()
		}}
	>
		<ValidatedInputControl
			ref={rejectedEmail.ref}
			label="Email"
			type="email"
			value={email}
			onChange={(event) => setEmail(event.target.value)}
			customValidity={rejectedEmail.validity}
		/>
		<Button type="submit">Send</Button>
	</form>
)
```

- Pass what the words are about. In most forms that is the value of
  the field, as the field holds it. Trim only what goes to the
  server. When the answer also depends on another field, join both
  into one string, such as `${kind}:${value}`, and send the same
  string to `reject`.
- Hand `ref` to the field's `ref` and `validity` to its
  `customValidity`. Both fit the WPDS validated fields. The hook finds
  the form through the field.
- `reject(message, sent)` puts the words under the field and answers
  `true`. It answers `false` when there are no words, when the field
  changed while the send was on its way, or when the field is not on
  the page inside a form. Say it another way then, in a toast on a
  page.
- The focus moves to the first field that fails, and a screen reader
  hears the server's words at once.
- The words go at the first edit. Typing the rejected value again does
  not bring them back, so the reader may send it again.
- While the words stand, the browser holds the form back from
  sending. A form with `noValidate` sends anyway, and the words are
  spoken again when the server rejects the value again.
- Give each field its own hook. When one answer rejects several, the
  focus goes to the first, and only one set of words is spoken.
- Call `reject` once the answer came, never while rendering, and never
  in an answer that also leaves the screen.
- In a `FormDialog`, answer `{ close: false }` when `reject` answers
  `true`, so the dialog stays open on the words, and
  `{ error: words }` when it answers `false`.

[Announcements](./testing.md#announcements) shows how a test reads
what was spoken.

## Stylesheet helpers

`base.css` ships a few classes for layout jobs every admin screen
runs into:

| Name | For |
| --- | --- |
| `godmin-form` | A single column form |
| `godmin-form--inline` | A form that is one row, filling its column |
| `godmin-form__row` | Short fields side by side inside a form |
| `godmin-form__grow` | The field of a row that takes most of the free room |
| `godmin-empty` | A centered empty state with breathing room |
| `godmin-table` | A full width table with collapsed borders, drawn like the DataViews table |
| `godmin-table__actions` | The narrow trailing cell holding row actions |
| `godmin-table__title` | The cell naming the record, bold, its link with no underline |
| `godmin-table__toggle` | The label button that opens a row under its row, drawn as the title link |
| `godmin-table__toggle-icon` | The chevron inside that label, turned while the row is open |
| `godmin-table__detail` | The row that opens under a row |
| `godmin-table__detail-body` | The open part inside that row's one cell, drawn as the WPDS card |
| `godmin-table__detail-motion` | The box around the open part, with a plain `div` inside it, that grows and shrinks it as the row opens and closes |
| `godmin-table-scroll` | The box a wide table scrolls inside |
| `godmin-list` | The box around a DataViews list inside a page section, lining its search and cells up with the text around it |
| `godmin-list-overlay` | An element laid over a list region, such as a drop zone, set after the list |
| `godmin-rows__line` | A repeated row's inputs and its `RowControls` on one line, the controls at the end, dropping under the inputs on a narrow row |
| `godmin-rows__inputs` | The inputs of that line, taking the room the controls leave |

`base.css` also sets a few custom properties, named values such as
the canvas gutter and the sidebar width.
[Custom properties](./design-system/custom-properties.md) lists them
and says which ones your app may read or change.

A form row puts short fields and a button on one line:

```tsx
<form className="godmin-form godmin-form--inline">
	<div className="godmin-form__row">
		<InputControl className="godmin-form__grow" label="Title" />
		<InputControl label="Due date" type="date" />
		<Button type="submit">Add</Button>
	</div>
</form>
```

Each field takes a share of the line. The button keeps its own width.
When the line is too narrow, the fields wrap onto the next line, and
a button left alone sits at the end of its line. A form that is only
one row takes `godmin-form--inline`, so it fills its column instead
of stopping at its width. In a stacked form, a button keeps its own
width instead of stretching across the form.
[Forms on a page](./design-system/record-pages.md#forms-on-a-page)
gives the values.

`godmin-table` and `godmin-table-scroll` are a pair, and they solve
a phone problem: a table wider than the screen drags the whole page
sideways. Wrapped like this, the table scrolls inside its own box
instead:

```tsx
<div className="godmin-table-scroll" role="region" aria-label="Reports" tabIndex={0}>
	<table className="godmin-table">…</table>
</div>
```

The scroll rule only activates on a phone, as
[tables that stay custom](./design-system/lists.md#tables-that-stay-custom)
gives, and in a column of a record page at every width. On a phone
the actions column, the cell marked
`godmin-table__actions`, stays pinned to the right edge, so a row's
buttons are in view before any scroll. On a
desktop the wrapper only draws a focus ring when a keyboard user
reaches it, so you can mark up every table this way.

Every `godmin-table` row takes a light tint under the pointer and
while keyboard focus is inside it, so a reader can tell which row a
button belongs to. `RowControls` in the actions cell sit at its right
edge, so they stay put when the column widens.

Two details in that snippet matter:

- `tabIndex={0}` makes the box focusable, so a keyboard user can
  scroll to the columns that are out of view. Without it they
  cannot reach them at all.
- The rule gives the box `position: relative`. Without that,
  absolutely positioned content inside the table escapes the box
  and widens the page, which is the exact bug the wrapper prevents.

### Rows that open under a row

A row of a `godmin-table` can open its details in a second row under
it, such as the settings of one field in a list of fields. godmin
ships no component for it. Build each row on the WPDS `Collapsible`,
as below, and godmin's classes draw it.
[Tables that stay custom](./design-system/lists.md#tables-that-stay-custom)
gives every value.

```tsx
import { RowControls } from '@gopherium/godmin'
import { chevronDown } from '@wordpress/icons'
import { Badge, Button, Collapsible, Icon, InputControl, Stack, VisuallyHidden } from '@wordpress/ui'
import { useRef, useState } from 'react'

interface Field {
	key: string
	label: string
	kind: string
	name: string
	help: string
}

interface FieldRowsProps {
	field: Field
	at: number
	count: number
	open: boolean
	onOpen: (key: string, open: boolean) => void
	onMove: (at: number, offset: number) => void
	onRemove: (at: number) => void
}

function focusToggleFrom(part: HTMLDivElement | null, toggle: HTMLButtonElement | null) {
	if (part?.contains(document.activeElement)) {
		toggle?.focus()
	}
}

function FieldRows({ field, at, count, open, onOpen, onMove, onRemove }: FieldRowsProps) {
	const toggle = useRef<HTMLButtonElement>(null)
	const part = useRef<HTMLDivElement>(null)
	const change = (next: boolean) => {
		if (!next) {
			focusToggleFrom(part.current, toggle.current)
		}
		onOpen(field.key, next)
	}
	const labels = {
		moveUp: `Move ${field.label} up`,
		moveDown: `Move ${field.label} down`,
		remove: `Remove ${field.label}`,
	}
	return (
		<Collapsible.Root render={<tbody />} open={open} onOpenChange={change}>
			<tr>
				<td className="godmin-table__title">
					<Collapsible.Trigger ref={toggle} className="godmin-table__toggle">
						<Icon icon={chevronDown} className="godmin-table__toggle-icon" />
						{field.label}
					</Collapsible.Trigger>
				</td>
				<td>
					<Badge intent="stable">{field.kind}</Badge>
				</td>
				<td>
					<code>{field.name}</code>
				</td>
				<td className="godmin-table__actions">
					<RowControls
						at={at}
						count={count}
						labels={labels}
						onMove={(offset) => onMove(at, offset)}
						onRemove={() => onRemove(at)}
					/>
				</td>
			</tr>
			<Collapsible.Panel render={<tr />} className="godmin-table__detail" hiddenUntilFound>
				<td colSpan={4}>
					<div className="godmin-table__detail-motion">
						<div>
							<div ref={part} className="godmin-table__detail-body">
								<Stack direction="column" gap="md">
									<form className="godmin-form" onSubmit={(event) => event.preventDefault()}>
										<InputControl label="Help text" defaultValue={field.help} />
									</form>
									<div>
										<Button variant="outline" size="compact" onClick={() => change(false)}>
											Close field
										</Button>
									</div>
								</Stack>
							</div>
						</div>
					</div>
				</td>
			</Collapsible.Panel>
		</Collapsible.Root>
	)
}
```

How the parts fit:

- Each field is a `tbody` of its own, `Collapsible.Root` drawn as one
  through `render`. A table may hold many. Its first row is the
  field's own row.
- The label is `Collapsible.Trigger`, a button that tells a screen
  reader whether its row is open, with `aria-expanded`.
  `godmin-table__toggle` draws it as the title link. Keep that state
  on the button, since WAI-ARIA does not allow `aria-expanded` on a
  table row.
- The chevron, `godmin-table__toggle-icon`, is hidden from screen
  readers, so the label alone names the button. Add no verb such as
  Open to it.
- The row that opens is `Collapsible.Panel` drawn as a `tr` with
  `godmin-table__detail`. Its one cell spans every column. CSS cannot
  span columns, so give `colSpan` the count of your own columns.
- The open part is the `godmin-table__detail-body` card. The two `div`
  around it, `godmin-table__detail-motion` and the plain one inside
  it, grow and shrink the part as the row opens and closes, as
  [rows that open](./design-system/motion.md#rows-that-open) gives.
- `hiddenUntilFound` keeps a closed part in the page, hidden. So what
  the reader typed survives a close, and a link to a place inside a
  closed row opens it. Without the prop a closed part leaves the page,
  so keep every draft in your own state then.
- The `ref` goes on the `godmin-table__detail-body` div, which holds
  every control of the open part. When the part closes while the focus
  sits inside it, such as from Close field, `focusToggleFrom` puts the
  focus on the toggle first, as
  [where focus goes](./design-system/accessibility.md#where-focus-goes)
  says.
- A form with one field sends itself when the reader presses Enter in
  it, so its `onSubmit` keeps the page where it is.

The table keeps the open rows in page state, as a set of keys, so any
number of them stay open:

```tsx
interface FieldTableProps extends Pick<FieldRowsProps, 'onMove' | 'onRemove'> {
	fields: Field[]
}

function FieldTable({ fields, onMove, onRemove }: FieldTableProps) {
	const [opened, setOpened] = useState<ReadonlySet<string>>(() => new Set())
	const onOpen = (key: string, open: boolean) =>
		setOpened((before) => {
			const after = new Set(before)
			if (open) {
				after.add(key)
			} else {
				after.delete(key)
			}
			return after
		})
	return (
		<div className="godmin-table-scroll" role="region" aria-label="Fields" tabIndex={0}>
			<table className="godmin-table">
				<thead>
					<tr>
						<th scope="col">Label</th>
						<th scope="col">Kind</th>
						<th scope="col">API name</th>
						<th scope="col" className="godmin-table__actions">
							<VisuallyHidden>Actions</VisuallyHidden>
						</th>
					</tr>
				</thead>
				{fields.map((field, at) => (
					<FieldRows
						key={field.key}
						field={field}
						at={at}
						count={fields.length}
						open={opened.has(field.key)}
						onOpen={onOpen}
						onMove={onMove}
						onRemove={onRemove}
					/>
				))}
			</table>
		</div>
	)
}
```

Where the region sits, and what it holds:

- A table nested in an open part goes in its own `godmin-table-scroll`
  region with its own name, such as "Sub fields of Team", so a
  keyboard reader can scroll it. Each level steps in by the frame of
  the card around it and needs no class of its own.
- Put a table whose rows open in its `godmin-table-scroll` region.
  Without one the open part measures against a wider box, such as the
  window, and runs past the page on a phone.
- A region whose rows open measures its open parts against its own
  width. Set it in a block or a parent that stretches it, such as a
  page section, a record page column or a WPDS column `Stack`. In a
  parent that sizes it to its content, such as an inline block, a
  `max-content` box, a WPDS row `Stack` or a WPDS `Dialog` of size
  `auto`, the region shrinks to almost nothing.
- godmin hides a closed row with a plain rule in its layer, as
  WordPress does. A rule of your own that sets how the rows of a
  `godmin-table` display wins over it when it sits outside a layer, or
  in a layer after `godmin`, such as `my-app` in the order
  `@layer wp-ui, godmin, my-app`. A closed row then shows again. Put
  such a rule in a layer before godmin's, as in the order
  `@layer wp-ui, my-rows, godmin, my-app`, or keep it off a closed
  row with `tr:not([hidden])`.
