# Polish backlog

Ideas raised while implementing, held back on purpose. Each one names what it costs and what it
buys, so a later session can pick by value rather than by order.

## The confirmation page reads as the same page as the form

Raised 2026-09-13, using it. The page the sign in link opens looks close enough to the page the
link was requested from, and arrives fast enough, that nothing appears to have happened. The screens
are correct and the transition is not legible.

Cost: a visual difference that survives both screens being plain. Buys: the one moment in the flow
where a person needs to be sure they are somewhere new.

## Explain why the input changed, not only what changed

Raised 2026-09-12. Someone who pastes a URL and sees the scheme removed learns nothing about DNS. A
line saying a domain is not a URL would teach them something.

Cost: one line of copy per change kind. Buys: the product's own argument, applied to its first
screen.

## Per-entry disclosure on the change list

Raised 2026-09-12. `ChangeDescription` already carries a `detail` field, used only by the punycode
entry, so the structure exists and only the copy and the disclosure are missing.

Hover is out: there is no touch equivalent, and a tooltip means hand-building a popover with focus
management in a project with no component library. Inline second lines or a `details` element per
entry cost nothing and work on a phone.

## The claim screen has no control that works without JavaScript

Raised 2026-09-14, when the Check button was removed in favour of answering as you type. The screen
already needed a script, since the normalization ran in the browser and the button called
`preventDefault`. What changed is the appearance: there used to be a button that did nothing without
a script, and now there is no button at all, so a script that fails to load leaves a field and
silence.

Cost: normalizing on the server for a plain form post, which means a second path through the same
function and the result living in the URL. Buys: a first screen that degrades to something rather
than to nothing. Related to the entry below, and they should be done together or not at all.

## The sign in form needs JavaScript

Raised 2026-09-13. The form posts through `fetch`, so with no client JavaScript the button does
nothing. Found when a dev server opened from a phone failed to hydrate, which is a development
problem, and the underlying gap is real.

Cost: a real `action` and `method` on the form, a second response shape on the route, and the sent
state moving into the URL where the address would be visible. Buys: a sign in that works when a
script fails to load. The confirmation page is already a plain form and needs nothing.

## A page in the app explaining how verification works

Raised 2026-09-13. The product's argument is that nobody explains DNS, and right now the
explanations only appear inside failures. A page that lays out what a TXT record proves, why nothing
propagates, and what the check actually does would be the product making its own case.

Cost: real writing, and it reads as padding if the core flow is not finished first. The README
covers the reviewer's need in the meantime. Buys: the one piece of the product that is about
understanding rather than doing.

## The record screen needs JavaScript for copying and for release

Raised 2026-09-13. Claiming is a plain form post and works without a script. The copy controls and
the release dialog do not: the clipboard call and `showModal` are both client side. The value is
selectable by hand either way, and the release confirmation inside the dialog is a real form post,
so only opening it needs a script.

Cost: a release confirmation that also exists as its own page, reached by a link. Buys: a
destructive action that does not depend on a bundle loading.

## The short host assumes the zone is the registrable domain

Raised 2026-09-13. The host offered first is built by taking the registrable domain off the claimed
name, which is right unless the name sits in a delegated subdomain zone. The check walks up and
learns the real zone a moment later, so the page holds the answer and does not use it.

Cost: passing the zone from the check back into the record card, which means the card can no longer
render before the check. Buys: a correct short host on a delegated subdomain, which is rare.

## A second Enter claims the name

Raised 2026-09-14, using it. Enter in the domain field validates. Enter again does nothing, because
the claim button lives in a second form inside the result card. Someone who has typed a name and
wants it claimed has to reach for the mouse or tab to the button.

Cost: the input has to remember that the value on screen is the one it already validated, which is
state, and the result card has to expose its form so the field can submit it. The button keeps
carrying the name, because the name being read back before anything is taken is the argument this
screen exists to make. A hint saying Enter claims it has to appear beside the button, or nobody
will find it.

Buys: a name typed and claimed without leaving the keyboard, which is how anyone doing this twice
will do it.

## Something better than two buttons for two destinations

Raised 2026-09-14, using it. The header carries Domains and Claim a domain as identical filled
buttons on every screen, including the screen each one goes to. The current page now loses its fill
and carries `aria-current`, which answers "where am I" and nothing else.

The question left open is whether a pair of destinations belongs in the header at all. Tabs read as
two views of one thing, which these are not. A sidebar gives them a column of their own and costs
the app a layout it does not otherwise need. A segmented control says one of these is selected,
which is true. None of that is decidable without drawing it.

Cost: prototypes outside the repo, then one of them built. Buys: navigation that reads as
navigation rather than as two calls to action.

## Hold the first check until the record has been touched

Raised 2026-09-15, using it. On a claim opened straight after creating it, the first check runs
before the person has seen the record, so it can only find nothing. Waiting for a copy or a click
on the record card would give the cadence its best chance of catching the paste.

Accepted as it is rather than deferred. The first check is what puts "no record there yet" on the
screen, and the chain never appears or disappears, so holding it would leave an empty chain until
the first click. A claim opened from the list has no paste to wait for. The cadence already covers
the gap, 5s, 15s, 30s, 60s and then per minute, and Check now restarts it after a paste. If asked
why the first check runs at once: it sets the baseline the later checks are read against.
