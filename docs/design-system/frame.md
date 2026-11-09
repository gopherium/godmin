---
title: Frame
description: How the frame changes as the reader moves between screens, with the sidebar slide, the drawer, what a screen reader hears, the frame on a phone, and why there is no full canvas.
---

The frame is the outer layout of a godmin admin, a sidebar and a
canvas. [Layout](./layout.md#the-frame) gives its areas and their
sizes, and [Framing an application](../framing-an-application.md)
shows how to set it up. This page gives every value of how the frame
changes as the reader moves between screens, and where godmin differs
from WordPress on purpose.

## The sidebar slide

The sidebar menu shows one screen at a time. The root screen holds
the main rows, and each sub menu has a screen of its own. A
drilldown row is a row with a chevron that opens a sub menu. Back is
the link in the title row of a sub menu. When a drilldown row or Back
changes the screen, the new screen slides in:

- It starts `--godmin-navigation-slide-distance` (50px) to one side
  and moves into place. As it moves, it fades from transparent to
  fully visible.
- It takes `--godmin-navigation-slide-duration` (140ms). Its speed
  follows the CSS `ease-in-out` curve, which starts slow and ends
  slow. It plays once, with no delay.
- A sub menu comes in from the side the text ends on. That is the
  right in a left-to-right language and the left in a right-to-left
  one. Back brings the screen in from the other side.
  [Right-to-left languages](./layout.md#right-to-left-languages) says
  where godmin reads the direction from.
- It plays on a window `EDGE_BREAKPOINT` (782px) wide or wider. On a
  narrower window a sub menu shows at once, as the WordPress Site
  Editor holds its sidebar still on a phone.

The distance, the time and the curve are the ones the WordPress Site
Editor uses for its own sidebar slide. The Site Editor also holds
still at exactly 782px, since its script tests `max-width: 782px`.
godmin follows WordPress's stylesheets, which count 782px as wide.

The slide plays only after a drilldown row or Back. It does not play
on the first load, after a row that keeps the same screen, after a
link elsewhere on the page, or after the browser's Back and Forward
buttons. A sub menu whose code loads late slides in once that code
has arrived.

A drilldown row whose address sends the reader on to another one,
such as `/settings` sending on to `/settings/general`, plays no
slide. Back takes no focus then, and on a small screen the drawer
closes, since the frame looks for the exact address the row opened.
Point such a row at the address its sub menu lands on.

Only the screen moves. The sidebar footer stays still under it, and
the sidebar hides anything that slides past its sides.
[Where focus goes](./accessibility.md#where-focus-goes) says where
the focus lands after the slide. You may change the slide through
its two custom properties.
[Where each one is set](./custom-properties.md#where-each-one-is-set)
shows how.

## The drawer

Below `SIDEBAR_BREAKPOINT` (1024px) the sidebar folds into a drawer,
a panel that the menu button of the top bar opens.
[The frame](./layout.md#the-frame) gives its size.

- It slides in from the start edge over `--wpds-motion-duration-md`
  (200ms). Its speed follows the CSS `ease-out` curve, which starts
  fast and ends slow. It leaves the same way.
- The dark backdrop under it fades in and out over the same time, on
  the same curve.
- The reader can swipe the drawer back to its edge. While the finger
  drags, the drawer and the backdrop follow it at once, since the
  backdrop's fade takes `0ms` then.
- When the finger lets go, the drawer ends its move as fast as the
  finger went. It takes `--wpds-motion-duration-md` times the swipe
  strength, a number from 0.1 for a fast flick to 1 for a slow drag.
  So a flick ends in about 20ms, and a slow drag in 200ms at most.
- In a right-to-left language the drawer opens at the right edge,
  under the menu button, and leaves to the right. Its shadow turns to
  fall on its inner edge, as [elevation](./radius-and-elevation.md#elevation)
  gives. The drawer reads the direction from the `dir="rtl"` your app
  sets on the page, as the stylesheet does.
- Escape and the close button close it while the focus is inside it,
  and the focus goes back to the menu button. A tap on the backdrop
  closes it too.
- It closes when the reader opens another page. It stays open when a
  drilldown row or Back changes the sidebar screen, so the reader can
  pick a row in it.
- Inside the drawer a sub menu slides in on a window from
  `EDGE_BREAKPOINT` up, and shows at once on a narrower one, as
  [the sidebar slide](#the-sidebar-slide) says.

These are the times and the curve of the phone sidebar in WordPress's
new admin. That sidebar has no swipe. The swipe comes from the
`@wordpress/ui` drawer godmin draws.

## Reduced motion

A reader can ask their system for less motion, as
[reduced motion](./motion.md#reduced-motion) explains. The frame then
changes two things:

- The sidebar slide lasts 0s, as in the WordPress Site Editor, even
  when you set your own slide duration. The new screen shows at once
  in its place.
- The drawer and its backdrop open and close at once.

## What a screen reader hears when the screen changes

A single page app swaps the screen without loading a new page, so a
screen reader hears nothing unless the app speaks. The frame speaks
the title of each new screen, as WordPress's new admin does, once your
app passes `shownPath` to `Frame.Root`.
[Routes and the frame](../framing-an-application.md#routes-and-the-frame)
shows how.

- When the path changes, a screen reader hears the new screen's
  title. That is the `title` of its `Page`, or the text of a
  `PageTitle` drawn outside any `Page`. When one `Page` holds
  another, the inner one wins. The path is the part of the address
  before any `?` or `#`, such as `/contacts`.
- It is spoken assertively, so it breaks in at once. It comes two
  animation frames after the new screen shows. An animation frame is
  one turn of the browser's drawing. The wait lets a toast from the
  same click show first.
- Nothing is spoken on the first load. The first load lasts until the
  first screen shows a title. So a landing screen that shows a
  `LoadingScreen` and then sends the reader on stays silent, and so
  does a route that checks access and sends the reader home.
- A move the reader makes before the first screen shows a title is
  silent too. The next move speaks.
- Nothing is spoken when only the search or the hash changes, such as
  a search, a filter, a sort or another page of a list. A move that
  ends on the same path is silent too.
- A page tab whose address changes the path, such as `/users/tokens`,
  counts as a new screen.
- A record page that loads after it opens holds its title while its
  `Page` holds nothing but one `LoadingScreen`, as its own child, and
  has no `aside`. A screen reader then hears the record's name once
  the `LoadingScreen` leaves. When that takes longer than 1 second, it
  hears the title the page shows by then, such as the kind of record,
  and the name that comes later is not spoken.
  [While a record loads](./record-pages.md#while-a-record-loads) shows
  that layout.
- A `LoadingScreen` inside a wrapper of your own, or beside other
  content, holds nothing, so that page's title is spoken at once.
- A screen with no `Page` says nothing until its `Page` shows. A bare
  `LoadingScreen` has no title to give.
- The not found screen that `routerDefaults()` gives says "Route not
  found".
- Two screens that show less than two animation frames apart, such as
  after two fast presses of the browser's Back button, say only the
  second. Two screens further apart are each spoken, in order.
- The same title on two paths is spoken twice, since the path
  changed.
- No focus moves. The focus stays where it was, as in WordPress, and
  the title tells the reader where they are.

## The tab title

With `appName` on `Frame.Root`, the frame sets the browser tab title
to the screen title, then `‹`, then the app name, such as "Contacts ‹
MyApp". It is the shape the WordPress admin gives its tab title,
without the word WordPress at the end.

- It is set on the first load too, unlike the spoken title.
- It follows the title a screen reader hears. While a screen shows no
  title yet, or its title waits for its record, the tab keeps the
  last one. After 1 second the tab takes the title the page shows
  then, such as the kind of record.
- godmin translates the pattern `%1$s ‹ %2$s`, so a right-to-left
  translation can turn it around.
- Without `appName` godmin leaves the tab title alone.

## The sidebar marks

A sidebar row draws its highlight from `aria-current="page"`, the mark
of the current page, as
[landmarks and names](./accessibility.md#landmarks-and-names) says.

- A plain row carries the mark on its own address and on every
  address under it.
- A drilldown row never carries the mark, not even on its own
  address, as in WordPress. Draw a row that points at the sub menu
  already shown as a plain row, a `NavigationItem`.
- While a slow sub menu loads, the old page and the root list stay on
  screen, and no row is current until the sub menu shows. WordPress's
  new admin marks its rows the same way. The Site Editor keeps the old
  row current instead.
- Back is your router's own link. While a slow `home` loads, Back
  carries the mark until the root screen shows. godmin paints nothing
  for it, but a screen reader hears Back as the current page. So let
  the route loader of `home` answer fast.
- Back draws its focus ring for the keyboard only, as
  [the focus ring](./accessibility.md#the-focus-ring) says. A mouse
  click draws none.

## The frame on a phone

- The frame is `100dvh` tall, the height the browser leaves for the
  page right now. On a phone that is the screen less the browser's
  own bars, so the canvas ends where the screen ends, and the list
  footer stays in view.
- The page itself never scrolls. The canvas and the menus scroll
  inside the frame, so the browser bar stays where it is, and every
  part that sticks to the canvas edge stays put.
- Put nothing in the page above or below `Frame.Root`, or the page
  scrolls by that much.
- WordPress's frames take `100vh`, the height with the browser bar
  hidden, so on a phone their bottom sits under the bar. Its newer
  dialogs and drawers take `100dvh`, as the frame does here.
- godmin writes no fallback for a browser without `dvh`, as
  `@wordpress/ui` writes none. Every browser WordPress supports today
  has it.

## No full canvas

godmin has no full canvas. In WordPress a full canvas is the mode
where an editor takes the whole window. The sidebar goes, and the
canvas loses its margin, its corners and its shadow. godmin offers
the `padded` and `bleed` canvas modes only, as
[two canvas modes](../framing-an-application.md#two-canvas-modes)
says. A screen that needs more room takes `bleed`.

A frame drawn without `Frame.Sidebar` is not a full canvas either.
Its canvas keeps its margin on every side, as
[the canvas](./layout.md#the-canvas) says.

## Where godmin differs from WordPress

godmin follows WordPress's new admin and the Site Editor, and parts
from them on purpose in these places:

- Browser Back and Forward play no slide. WordPress slides such a
  move the way the last click went, so half of them slide the wrong
  way, and the Site Editor also pulls the focus into the sidebar.
  godmin slides only after a drilldown row or Back, where it knows
  the way.
- Escape closes the drawer from inside it. In WordPress's new admin
  Escape closes the drawer only from its backdrop, which the keyboard
  never reaches, so a keyboard reader cannot close it.
- In a right-to-left language the drawer slides in and out at its own
  side, the right. WordPress's new admin rests its drawer at the
  right, but slides it in from the left, across the page, and keeps
  its shadow on the left.
- Nothing is spoken on the first load. The Site Editor and
  WordPress's new admin both mean to stay silent there, and speak
  anyway.
- Nothing is spoken when only the search or the hash changes.
  WordPress's new admin speaks on every change of the address.
- Only the new screen's title is spoken. WordPress's new admin speaks
  the old screen's title first, as a move starts, then the new one.
- The title waits two animation frames, so a toast from the same
  click shows first. In WordPress's new admin the title replaces the
  toast before the browser draws it.
- A screen reader hears the screen's heading alone. The Site Editor
  speaks a trail, such as "Index ‹ Template". WordPress's new admin
  speaks the title alone, and a godmin record page already names its
  kind in its breadcrumbs.
- The not found screen says "Route not found". WordPress's new admin
  draws the same screen but speaks nothing there, or the last
  screen's title, since it speaks only a title its route loader gives.
  The Site Editor speaks an error at an address it does not know, and
  godmin is closer to that.
- A record holds its title for 1 second at most. The Site Editor and
  WordPress's new admin wait as long as the record takes, so a request
  that hangs leaves the reader in silence, or with the last screen's
  name.
- While a slow `home` loads, Back carries the mark of the current
  page. WordPress's Back is never marked, since it is not a link.
  godmin's Back is your router's own link.
