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

## The sign in form needs JavaScript

Raised 2026-09-13. The form posts through `fetch`, so with no client JavaScript the button does
nothing. Found when a dev server opened from a phone failed to hydrate, which is a development
problem, and the underlying gap is real.

Cost: a real `action` and `method` on the form, a second response shape on the route, and the sent
state moving into the URL where the address would be visible. Buys: a sign in that works when a
script fails to load. The confirmation page is already a plain form and needs nothing.
