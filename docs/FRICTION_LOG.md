# Friction log

Every moment of confusion or friction hit while using DomainClaim. Each entry is resolved, accepted
or deferred. Observations come from using the app, not from reading the code.

## 2026-09-12, claim entry screen, local dev

First session with a screen to use. The screen normalizes a typed domain and reports what it
changed, or why it refused. Nine entries.

### Pasting an email address claimed the provider's domain

Typed `carlton@protonmail.com`. The screen returned `protonmail.com` as the name to claim, with one
line saying the sign in details before the `@` had been removed.

Resolved in #2. This is the silent rewrite the product is built to argue against, and the most
likely paste of anything found in this session. An `@` now means credentials only when a scheme is
present, or when the local part holds a colon that an unquoted local part cannot contain. Otherwise
the input is refused and the domain part is offered as a control.

### A made-up ending was accepted as a real domain

Typed `192.0.2.carlton`. The screen accepted it and said "Subdomain of `2.carlton`", which is not a
sentence anyone should be shown.

Resolved in #2. The Public Suffix List carries an implicit `*` rule, so an unrecognised last label
parses as a valid suffix with one name under it. The check is now `isIcann || isPrivate`.

### A dev server URL was told to add an ending

Typed `http://localhost:3000/claim`. The refusal quoted the whole URL back and said it had only one
part, which contradicted what was still visible in the field.

Resolved in #2. Two causes. Failures were carrying the raw paste rather than the value the input had
been reduced to, and `localhost` had no message of its own. Special-use names are now refused by
name, and every failure after reduction carries what we read.

### Following the advice produced a second error

Typed `.com`. The refusal said to remove the extra dot. Removing it gives `com`, which is refused
again for a different reason.

Resolved in #2. A leading dot and an interior double dot are the same defect to a parser and
different mistakes to a person, so they are separate codes with different next actions.

### A failure showed the broken fragment on its own

Typed `example.-example.com`. The refusal displayed `-example` alone, leaving the work of finding it
in the original to the reader.

Resolved in #2. Single-label failures carry the whole name and the index of the section at fault,
and the interface shows the name with that section marked.

### Only one problem was reported when there were two

Typed `example..-example.com`. The refusal named the dots and said nothing about the hyphen.

Accepted. The checks are a pipeline where each stage depends on the one before it, so only the four
per-label checks could be collected, and a list that looked complete while being partial would be
worse than one error. Reporting several at once also breaks the rule that every failure names
exactly one next action, and every DNS failure in the product is singular by nature. The mitigation
is the entry above: showing the whole name with the section marked means a second problem is visible
even though only one is named. Reasoning recorded in `docs/RFC.md` and `spec.md`.

### The suggested repair assumes the likelier mistake

Typed `example..com`. The refusal says to remove the extra dot. A user who meant to type
`example.example.com` and dropped a whole section would be told the wrong thing.

Accepted. An extra dot is far more likely than an omitted label, and naming the second possibility
would break the one-action rule to serve a case that barely happens.

### The change list explains what changed and not why

Pasting `https://WWW.Example.com/pricing?ref=hn` lists the scheme, path and case as three separate
changes. The list reads clearly, but none of the entries say why the change was needed.

Deferred. Only the punycode entry carries an explanation, because it is the only one where the
result is unreadable without it. The structure for the rest already exists as the unused `detail`
field. Hover was considered and rejected in the same breath: there is no touch equivalent, and a
tooltip means hand-building a popover with focus management in a project with no component library.
Inline second lines or a per-entry disclosure are the shapes to try.

### Claiming www raised a question the screen did not answer

The result for `www.example.com` said it is claimed separately from `example.com`, which prompted
the question of what happens if two accounts hold one each.

Resolved in #2, in part. Placing a record at `_domainclaim-challenge.www.example.com` requires write
access to the `example.com` zone unless the subdomain is separately delegated, so a second claimant
gains nothing they did not already have. The risk is that the two names read alike to a person,
which is handled by always showing the full name. `www` is now offered as a suggestion pointing at
the name above it, never applied. Claiming both in one action is open.

## 2026-09-13, magic link sign in, local dev

First session with sign in. Three entries.

### A dead link showed an error while I was already signed in

Opened the same link twice. The second time, the page said the link no longer works, with the
header above it showing the account signed in. Both things were true and the screen was still
wrong: the thing I asked for had happened.

Resolved in #4. A spent token in a browser already holding a session for that address now lands on
the destination instead of the dead link page, and the confirmation page skips its button entirely
when the session already matches. A dead link only reports a dead link when the person is not
already where the link was taking them.

### The dead link page explained a cause that was not mine

The copy said links expire after fifteen minutes and that email providers open links to check them.
Neither had happened. I had asked for a second link, which killed the first, and then opened the
first. The scanner sentence also gave me nothing to do about it, and it describes a problem this
product already solved by redeeming on POST.

Resolved in #4. Supabase returns the same error for expired, used and replaced, so naming one cause
means guessing. The page now states the three rules that make links stop working, including that a
new link replaces the last, and ends with the one action.

### Buttons did not look clickable

No pointer cursor on any button, including "Use a different address" on the check your email
screen.

Resolved in #4. Tailwind 4 gives buttons the default arrow cursor. One base rule in `globals.css`
restores the pointer for every enabled button, and leaves disabled ones alone.

## 2026-09-13, claiming and the record screen, deployed preview

First session with claims. Ran the demo names and then carlton.dev end to end. Five entries.

### I was signed out in the middle of a session

Claimed and released a dozen names, then found myself signed out with no warning. Blamed a second
account I had signed into in another browser, which was a coincidence.

Resolved before merge. The two new route handlers read the session through the client whose cookie
writes are deliberately swallowed, and returned a plain `Response`. The proxy does not run on
`/api`, so those requests are the ones that meet an expired access token. Reading the user refreshes
it, Supabase rotates the refresh token at that moment, and the replacement never reached the
browser. The token still in the browser was already spent, so the next refresh signed me out. Both
routes now use the route client, which collects cookie writes and applies them to the response the
handler builds. That client existed already, with a comment saying exactly this.

### I lost a claim and had to claim it again to find it

Claimed `slow-nameservers.test`, navigated away, and had no route back. There is no list, so the
only ways to reach a claim are the URL and re-entering the name.

Resolved in #8. The list is at `/domains`, reached from the header and from sign in, and it holds
pending claims as well as proved ones. Re-claiming the name still returns the same claim rather
than minting a second one, which was the workaround for the missing screen.

### The TTL we tell people to enter cannot be entered

Squarespace offers TTL as a dropdown, defaulting to 4 hrs. There is no field to type 300 into. Our
record screen presents 300 as a value to copy, which is advice that cannot be followed on the one
panel we have measured.

Resolved in #7. TTL stops being a value to copy and becomes an instruction to leave the default,
which is true everywhere and was already true: the record TTL does not affect the answer that
decides. It keeps a cell, because it is a column in the panel.

### The field names do not match the panel

We label them HOST and VALUE. Squarespace labels them NAME and TEXT. Their columns run TYPE, NAME,
PRIORITY, TTL, TEXT, left to right.

Resolved in #7. Name and Value are the labels most panels use, and the record is presented as a row
in that order so it can be read against the form being filled in.

### Verification is below the fold

On a verified claim the screen still leads with "Add this record" and the eyebrow still says
CLAIMING. The state of the thing is the last item on a page whose subject is state.

Resolved in #7. The status is on the row already, so the top of the page says it before the check
has run, and a claim that already holds its name collapses the record card rather than leading with
an instruction.

## 2026-09-14, the record as a panel row, local dev

Rebuilding the record screen against the measured panel. Three entries.

### A claim said PENDING above its own verified result

Claimed `verified.test`. The pill read PENDING and the record card stayed expanded while a green
Verified box sat underneath saying the name was now held by this account. Reloading fixed it.

Resolved in #7. The status came from the claim row, and the row says pending at the instant the page
shell is sent. The check writes verified a moment later, but a streamed Server Component can only
fill its own Suspense boundary and cannot change markup that already went out. The page now starts
the check once without awaiting it and gives the same promise to the status block and to the result,
each inside its own boundary, so both say the same thing. The status boundary falls back to the row,
which still appears with no waiting.

Residual: the record card is still driven by the row, so on that first render it stays expanded
under a verified pill. That reads as redundant rather than contradictory, and collapsing it mid-read
would move the page under the pointer.

Revisited in #12, now that the check does run on the client and the card could collapse itself when
one comes back verified. It does not. The answer arrives seconds after the page settled, so the
collapse would happen under someone who is reading, and the reason the card stays reachable on a
held claim is that comparing this value against the panel is why they opened it. Closed rather than
deferred again.

### The copy buttons did not say which field they belonged to

With four cells in a row and a button beside each one, separated by a gap, the button nearest a
value could be read as belonging to either neighbour.

Resolved in #7. The control moved inside the field's border, with a divider between the value and
the icon, so a field and its control are one object.

### The value cannot be read against the panel

Cells are one line and the value is 78 bytes, so about the first third is visible and the rest
scrolls. Someone comparing what is on screen against what is already in their DNS panel cannot do
it by eye.

Accepted. The value is there to be copied rather than read, wrapping it costs the row the alignment
that makes it readable as a row, and a value that went in wrong is reported by `value_mismatch`
with both sides shown. Revisit if the timeline gives the screen somewhere better to put it.

## 2026-09-14, the check as five steps, design session

Not from using the product. From working through what the trace already holds and what a person can
do about each part of it. Two entries.

### A cross was shown on a step nobody had acted on

The first check on every new claim looks for a record that has not been added. Drawing that as a
failed step reports the product working exactly as designed as a fault.

Resolved before shipping. Three states per step, sorted by whose move is next. If the person has to
change something it is wrong; if time has to pass it is waiting; a step the check never reached is
neither.

### Making the chain conditional hid a fix

Keeping the page quiet on a first load meant the chain only appeared when there was something to
say. Someone with no nameservers set would see the failure, go and fix it, come back, and find the
failure simply gone. An absence cannot tell them "you fixed it" apart from "we stopped looking".

Resolved before shipping. The element is always present in the same place and its sentence changes,
from a problem into a statement of progress that names the thing they just configured. Saying "that
is now fixed" out loud needs `last_failure`, which is deferred, and this needs no stored state.

## 2026-09-14, using the deployed app

First pass as a person rather than as the developer. Signed in as myself, laptop, against the
production deployment and a real domain on Namecheap. Ten entries.

### Every click looked like nothing had happened

Clicking a header button, or claiming a name, left the previous page on screen for most of a
second with no sign the click had landed. The first instinct was to press again.

Resolved in #9. Every navigation here is a server round trip and both list and record screens are
`force-dynamic`, so the browser sits on the old page until the new one starts streaming. There was
no `loading.tsx` in any segment, so there was nothing for the framework to show in the gap. Each of
the three routes now has one, and the claim button disables itself on submit, which is the one case
a route fallback cannot cover because a form post is a fresh document load.

### The deployed app and my dev server disagreed about DNS for two hours

Claimed `loresprite.com`, which is on Namecheap, added the TXT record, and watched the check report
nothing at the name for two hours. The deployed app had verified the same claim from the same
record, and I did not know that, because I was looking at localhost.

Accepted, as something the product cannot currently tell me. The resolution path is identical in
both places and the answers were not: at 18:59:50 UTC, from my machine, `dig` against
`156.154.132.200` returned the record and our own code got NXDOMAIN from that same address in the
same second. Production verified at 19:16 UTC. The address we query is the right one, and a
trailing dot changes nothing, so this is not our zone walk and not the search list. Something
between my machine and that nameserver answers our queries differently from `dig`, and the
mechanism is recorded as open in `spec.md`.

The product finding is the part that survives, and it is the strongest argument in this log for the
one thing the RFC dropped. A check from one vantage point cannot tell "your record is not there"
apart from "our view of DNS is broken", and it states the first with total confidence. I spent two
hours believing a screen that was wrong, holding the evidence that it was wrong, because the screen
has no way to express doubt. The DoH second opinion was the answer to exactly this and it is cut
for time. Recorded in the RFC against the one vantage point decision.

Practical rule from it: the demo and the video are recorded against the deployment. A dev server is
not the product.

### A claim that held its name reported the loss of its record as quietly as possible

While the deployment held `loresprite.com` as verified, the dev server's check could not see the
record, so one screen showed both halves at once: a VERIFIED pill gone amber, the line "The record
stopped answering", and underneath it a single collapsed grey line that had to be clicked to find
out what had happened. This is the `at_risk` shape, which the RFC says the product can model and
never enter. It can be entered, by a check that disagrees with the row.

Resolved in #12, all three together. Three things were wrong:

1. The chain was closed. `needsAttention` sorts on which step stopped the check and never asks
   whether the claim holds the name. A verified claim whose record has gone is the loudest thing
   this product can ever have to say, and it was a grey line with a chevron.
2. The failing step is drawn as waiting. Whose move is next: on a claim that already proved itself,
   a missing record is the person's move, so it is a cross.
3. The message is written for a first-time claimant. "No record there yet" and "Add the record
   below" are the wrong words for a record that was there and is gone.

One and two are one branch in `steps.ts`, which already receives the claim's status. Three turned
out not to need the `at_risk` state at all: `describeFailure` takes a second argument saying whether
this claim already holds the name, and only `record_not_found` reads it. Every other reason means
the same thing on a held claim and there is a test asserting the words do not move.

The state is still not written by anything. A held claim failing a check reads as `at_risk` and is
stored as `verified`, which is the same gap the RFC records, now with the right words on it.

Closed in #13. The check writes the state, and the words did not have to change again, because the
reading side was built against whether the claim holds its name rather than against the enum value.

### The check chain opened and I could not tell that I had opened it

Refreshed a pending claim and saw the five rows with the failure open. Refreshed again and saw one
line. Nothing had changed except that the first one had been clicked.

Resolved in #9. That block is a `details` whose `summary` is a flex row, and Chrome and Safari drop
the disclosure marker on any summary that is not `display: list-item`, so the class that styled it
had nothing to style. There is now a chevron that turns when it opens.

### A claim checked twenty minutes ago still said it had been checked just now

The closed chain line reads "Checked just now" and never stops reading that, however long the page
is left open. Waiting is exactly what someone does on this screen.

Resolved in #9. It said the time instead.

Changed again in #12. The relative time is back and it is true, because the client re-checks and
re-renders it, and it moved out of the chain to sit beside Check now. Saying when the last check
ran is only useful next to the thing that runs another.

### I could not tell which of the two pages I was on

Domains and Claim a domain are identical filled buttons on every screen, including the screen each
one leads to.

Resolved in #9, at the smallest size that answers it: the current page keeps the shape and loses
the fill, and carries `aria-current`. Whether the pair should be tabs, or a sidebar, or something
else entirely is a navigation question and belongs to the polish phase. It is in
`docs/POLISH_BACKLOG.md`.

### The record screen told me about a feature that does not exist

Claiming a name another account holds said the decision "is not built yet, so this claim does not
take the name today", which is a note to myself in a product string.

Resolved in #9. It states the rule that is true now: one account holds a name at a time, so this
claim does not take it. What is not built is not the user's problem.

### The panel called it Host and we call it Name

Namecheap labels the field Host. Our record row labels it Name.

Resolved in #9, in the hint rather than the label. Name is the label most panels use and the RFC
records the measurement behind choosing it. The hint under the cell now says some panels call it
Host, which is the place that is read while the form is being filled in.

### Enter checks the name and a second Enter cannot claim it

Pressing Enter in the domain field validates, which was invisible until the previous entry was
fixed. Pressing it again does nothing, because the claim button is in a second form inside the
result card.

Deferred, to `docs/POLISH_BACKLOG.md`. Making the second Enter submit means the input holding what
it has already validated, which is state, and the deliberate act has to keep carrying the name.

### Nothing updates while I wait, and there is no way to ask

A pending claim is a screen someone sits on while they go and edit their zone. It does not poll,
and the only way to ask again is the browser's reload button. The list has the same gap with no
way to refresh a row.

Resolved in #12 for the record screen. The check is an endpoint, the screen asks on its own at
5s, 15s, 30s, 60s and then every minute, and Check now is for the person who has just saved the
record and does not want to wait for the next one. It stops after fifteen minutes and says so.

The list still has no way to refresh a row. It runs no check by design, and a row's state is the
claim's own, so the gap there is that nothing re-checks a verified claim at all, which is the cron
the Vercel plan cannot serve. Not closed, and recorded in the RFC rather than here.

### Focus seemed to leave the field after Enter on an incomplete name

Typed `carlt`, pressed Enter, and found focus on the demo names disclosure with the error above it
and no way to correct the name without reaching for the mouse. Could not reproduce it afterwards,
and a stray Tab would explain it.

Accepted for now, unreproduced. Nothing in the form moves focus and the disclosure is a sibling.
A keyboard-only pass is queued, and if it is real it is a bug rather than a friction.

## 2026-09-14, the check from an endpoint, local dev and a real domain

Testing the check endpoint. One entry.

### I deleted the record and the product kept saying the name was verified

Deleted the `_domainclaim-challenge` TXT record for carlton.dev in the Squarespace panel, went back to
the claim, pressed Check now, and the check found the record and matched the token. The panel row was
gone and the screen said verified.

Accepted, and the product is right. Measured with `dig` against each authoritative server in turn:

```
a1: "domainclaim-token=VD466EZ3NQWKH5PBGMSU2CX7VYUF2B4X expiry=2026-09-20T21:42:50Z"
b1: same
c1: same
d1: same
```

All four Google nameservers were still serving the record after the panel said it had gone. carlton.dev
is registered at Squarespace and served by Google, so deleting a record there is a write to
Squarespace's control plane, which then has to publish the zone. That is a third kind of lag, alongside
caching and alongside our own one vantage point, and it is the only one the person doing the deleting
can see nothing of.

Two things follow. The RFC's Background said nothing propagates and authoritative servers are current,
which is true of a published zone and says nothing about the gap between a panel and the zone it
publishes. It now says both. And the at risk case cannot be demonstrated on this domain on demand, so
it moves to a zone whose panel publishes quickly.

Not changed: the product should not start hedging about this. The check reports what the nameservers
answer, which is what every other consumer of that zone sees too. A screen that said "your panel may
disagree" on every successful check would be noise on the one outcome that is never in doubt.

## 2026-09-15, the check endpoint on the deployment. Two entries.

### The first check after a quiet spell takes several seconds

Opened a claim on `verified.test`, which touches no network at all, and the check took several
seconds to answer. Reloaded straight afterwards and it came back in about a second.

Accepted. Cold start on the serverless function, and none of it is DNS: that name is answered by the
fake resolver in the same process. Nothing about the check can be made faster, since the time is
spent before our code runs.

Two things follow. The screen already covers it, because the record renders from the row and only
the chain waits, which is the reason the record screen was built to render before its first check.
And the deployment gets warmed before the video is recorded, so the first thing on screen is not the
slowest check in the session.

### An at risk name could not say how long it had been at risk

Nothing stored when a held claim first failed, so the domain list could say a name was at risk and
nothing could say since when. On a list that is the first screen a reviewer opens, that is the
difference between a name that broke this morning and one that broke in March.

Resolved in #13. `failing_since` is stamped by the check that moves the claim and the list row
carries the date after the pill.

## 2026-09-15, at risk gets a writer, local dev and a real domain. Two entries.

### carlton.dev went at risk on its own, the same day the state got a writer

Opened the domain list during testing and found `carlton.dev` reading At risk since 13:11 UTC. Nothing
in the test seeds touched it. The TXT record had been deleted from the Squarespace panel the day
before and never put back, the zone has published since, and a check run while testing something else
asked the nameservers and got nothing.

Not a friction. The state the RFC described as one the product could model and never enter was entered
by a real domain, through the ordinary path, on the first day anything could write it. The entry is
here because it is the best evidence in this file that the model matches the world: a person deletes a
record for an unrelated reason, forgets, and the product is what tells them.

It is also the demo. A `.test` name cannot reach this state, because a demo script is fixed per name
and a name that fails can never verify first.

### The status flashes the row's state before the check corrects it

Reloading a recovered claim shows At risk for an instant, then Verified.

Accepted, and it is the design. The page renders the claim's own row first, which is what it can say
with no waiting, and the check replaces it when it answers. At that first moment the row really does
say at risk. The alternative is a shell that says nothing until the check lands, which is the
behaviour that once put CLAIMING above a name the account already held.

It reads as a flicker only against the fake resolver, which answers in about a millisecond. A real
zone takes long enough that the same sequence reads as an update.

### The challenger screen reported a database problem instead of a taken name

Claiming a name the other account already held, to reproduce the contested case. The check proved
control, five of five, and the last step read "proved, and not written down yet", which is what this
product says when a write fails for a reason it cannot name.

Resolved in the pull request after this one. The write had not failed for an unknown reason, it had
hit the owned-name index, which has its own state and its own words. `isUniqueViolation` read the
SQLSTATE off the error it caught, and Drizzle has wrapped driver errors in its own class since 0.44,
so that test was false for every unique violation and the Control proved screen had never been
reachable.

The part to keep: the state was designed, its copy written, its step answer written and its tests
passing, and none of it had ever been on a screen. Reaching every state by hand is what found it.

## 2026-09-15, the UI pass. Clicking through every demo name.

### The sign in button wrapped

"Send sign in link" broke onto two lines beside the field. The row goes horizontal at `sm` and the
field is `w-full`, so the button was the only thing that could give.

Resolved. `shrink-0 whitespace-nowrap` on the button.

### Four failure messages explained the check instead of the finding

`no_txt_at_name`, `nameservers_unreachable`, `zone_not_found` and `value_mismatch` each opened with
a sentence about what the check did ("Working up from the name, no level answered"), which is how
the code sees it and not how a person reads it. The second half of each, naming what does this, was
the useful half.

Resolved. Each now opens by saying what was found, in plain words, then what does that, and the
action names the wait where waiting is the answer. The action moved above the description in every
four part message, since the thing to do matters more than the reason.

### The demo names did not say what they would do

`one-dead-nameserver.test` and `crowded-name.test` are only legible if you know the script.

Resolved. Each name carries its outcome on a second line, in the words the chain uses. A tooltip
was already rejected in the polish backlog.

### The keep-the-record line read as a footnote

"Leave the record in place" sat under the status in the same grey as everything else, on the one
screen where that is the thing to get wrong.

Resolved. A warning with a bold lead: "Keep the TXT record in place."

### The held expiry line only made sense right after a fix

"This name was proved before then, so it no longer applies" reads well the day of the fix and reads
as a non sequitur a week later.

Resolved. The line says what the date was rather than when it would have run out, and it reads the
same at any distance from the fix.

### The record card and the chain were different widths

The chain and the notices were capped at the reading measure inside the wider record page, so the
two cards on the screen had two right edges. It looked unfinished.

Resolved. Both span the page and the paragraphs inside are capped instead. The RFC records it.

### The first check runs before the record has been seen

Accepted, in the polish backlog with the reasoning.

### The account menu opened but would not close

The header account menu and the row menu were built on the `popover` attribute, shown with a
`popover-open` Tailwind variant. That variant does not exist, so it compiled to nothing, and the
panel, which also carried a `flex` display, stayed on screen: an author `display` beats the
browser's own rule that hides a closed popover. Clicking away and clicking the button again did
nothing.

Resolved. A hand-built dropdown hook, `useMenu`, since there is no component library. It closes on
a click outside, on Escape and on focus leaving both the trigger and the panel, returns focus to
the trigger, and drives the row menu's arrow keys. Plain listeners, so it behaves the same on
Firefox, Chrome and Safari.

### Every render asked Supabase who was signed in twice

The header names the signed in account and the page under it reads the same session. `signedInEmail`
and `signedInUser` were cached separately, so a page that used both spent two auth round trips per
render, on top of the one the proxy makes before rendering starts. Three network calls for one
answer.

Resolved. `signedInEmail` reads through the cached `signedInUser`, so the header and the page share
one call. Found by reading the code during the theme pass rather than by using the product, which
is the kind of cost a visual pass is the moment to catch.

## 2026-09-16, the status pass. A pending claim that needs a fix looked passive.

### A pending claim with a wrong record read as neutral on the list

Claiming loresprite.com surfaced it. A TXT record was at the name carrying an old token, so the
check on the record screen showed value_mismatch, "needs a change", the person's move. The domain
list showed the same claim as a neutral "Pending", which reads as passively waiting. Two screens,
two tones, for the same claim.

The cause was a real gap, not a rendering slip. The list runs no check, so it can only show what
the row stores: status, expiry, verified date, failing-since. A pending claim covers two different
situations the row could not tell apart, waiting on a record that has not been added yet, and a
wrong record already there that the person must fix. The first is time's move and neutral, the
second is the person's move and should read as attention, but the list had no stored fact to
separate them.

Why it was neutral in the first place: the list is deliberately check-free, one query for any
number of names, and pending was treated as "waiting on the first action", which is right for a
fresh claim. The list already split pending once, into neutral Pending and attention Expired,
because expiry is derivable from the stored expiry date with no check. The needs-a-change cases are
not derivable without a check, so they were left on the record screen.

Resolved. `at_risk` was already the precedent: a check-derived, actionable state persisted
(`failing_since`) so the list can show it without re-checking. Extended that to the pending case
with an `action_needed_since` column, set when a check finds a wrong record at the name (a TXT with
the wrong value, a record of another type, or the record one label down) and cleared the moment a
check no longer does. `record_not_found` is excluded, since nothing at the name is the normal
waiting state, and so are an unreachable zone and a missing delegation, which are waiting or
ambiguous. The list reads an attention "Action needed" chip from the flag, the record pill derives
the same live from the check, and the attention notice and needs-attention-first sort pick it up
with no extra work. A pending failure now reads by whose move is next everywhere: the list, the
record pill and the check steps agree.

## 2026-09-16, recording the At risk transition on the deployment

### Refresh on the list looked like it did nothing

Deleted the carlton.dev record in the Squarespace panel, went to the domain list and pressed
Refresh. The row still said Verified. It only moved to At risk when I opened the claim and its check
ran. The button had done what it does, re-read the rows, and nothing had changed the rows.

The cause is the decision in the RFC: the list runs no check, so a row is only as fresh as the last
check on that claim's own screen. Refresh reflects a release made elsewhere or a claim a record
screen verified since the page loaded. It cannot reflect a DNS change nobody has checked for. The
gap underneath is the scheduled re-check in the Open list, which is what would make the list move
on its own.

Resolved for the control, accepted for the gap. One line under the buttons says what Refresh does
and where a claim is checked, so the expectation is set before the press. The decision stands:
checking every row from the list would spend each claim's rate limit on a page that cannot act on
the answer. The schedule stays in Open, with Vercel Hobby's daily cron as the reason.
