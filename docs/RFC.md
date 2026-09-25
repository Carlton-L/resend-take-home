# DomainClaim

Type: new feature. Status: approved, one author. Written 2026-09-12, kept current with the code
through 2026-09-17. Follows the section order of Resend's RFC template; Decisions stands in for
General Questions, since a single author answers a question by deciding it.

Contents: [Purpose](#purpose) · [Background](#background) · [Proposal](#proposal) ·
[Technical Details](#technical-details) · [Implementation Plan](#implementation-plan) ·
[Decisions](#decisions) · [Open Questions](#open-questions) · [States](#states)

## Purpose

Claim a domain, prove you control it, see every step, recover when it fails. Ownership is persistent
state: the product keeps checking after a name verifies, moves it to at risk when its record stops
answering, and clears it when the record returns. A scheduled re-check while nobody is watching, a
grace window with a revocation, and transfers between accounts are designed and not built. The
Open Questions list says which. Transfers have their own feature RFC in
[TRANSFERS.md](TRANSFERS.md), with a prototype under `prototypes/`.

User: one person who controls their own DNS.

This document is long. The Decisions section opens with the ten a reviewer is most likely to ask
about; the rest are there for completeness. The States table at the end is the one-page view of
every failure, its message and its demo name.

## Background

- Verification proves control of the zone. Ownership is a registrar contract. Registrant and
  nameserver operator are often different people.
- carlton.dev example: NS are googledomains, registrar is Squarespace. Resend reports "Google".
  Squarespace took over Google Domains and kept those nameservers, so the zone is edited in
  Squarespace's panel. DomainClaim names `googledomains.com` nameservers Squarespace and links its
  panel. Google Cloud DNS uses the same names and gets the wrong label, accepted for now.
- Token goes in a scoped underscore TXT label. Underscores cannot collide with hostnames.
- Nothing propagates. Authoritative servers are current, caches lag.
- A DNS panel is not the zone. Deleting a record at a registrar whose DNS is served elsewhere is a
  write to that registrar's control plane, which then publishes to the nameservers. Measured
  2026-09-14: a record deleted in the Squarespace panel for carlton.dev was still served by all four
  Google nameservers afterwards. That lag is separate from caching and nothing in DNS reports it.
- Negative caching happens in recursive resolvers. Authoritative servers do not cache. The TXT
  query goes straight to authoritative, so the answer that decides caches nothing. The zone walk
  and the address lookups are recursive, and ask about NS and A rather than the token. The DoH
  second opinion is the one that caches a miss, for the zone's SOA `minttl`.
- DNS panels append the zone to the Host field. Typing a full name gives `_x.example.com.example.com`.
- Verified status decays silently. A DNS migration drops the record and nothing visibly breaks.
- Stale record keeps a stranger verified. A new domain owner can re-add an old token.
- Refuse public suffixes.
- Tokens expire. Stating the validity period is the spec's only MUST.
- Claiming is a separate decision from proving. Risk is denial of service as well as impersonation.
- Designing against opaque and esoteric "may take 48 hours, check back later".

[draft-13](https://www.ietf.org/archive/id/draft-ietf-dnsop-domain-verification-techniques-13.txt) ·
[RFC 2308](https://www.rfc-editor.org/rfc/rfc2308.html) ·
[RFC 8552](https://www.rfc-editor.org/rfc/rfc8552.html) ·
[RFC 1035](https://www.rfc-editor.org/rfc/rfc1035) ·
[jvns](https://jvns.ca/blog/2021/12/06/dns-doesn-t-propagate/) ·
[Resend claim](https://resend.com/docs/dashboard/domains/claim) ·
[Resend KB](https://resend.com/docs/knowledge-base/what-if-my-domain-is-not-verifying) ·
[Atlassian](https://support.atlassian.com/user-management/docs/verify-a-domain-to-manage-accounts/) ·
[ICANN](https://www.icann.org/resources/pages/benefits-2013-09-16-en) ·
[SAC125](https://itp.cdn.icann.org/en/files/security-and-stability-advisory-committee-ssac-reports/sac-125-09-05-2024-en.pdf)

## Proposal

1. Magic link sign in. Supabase generates the link, we send the email through Resend.
2. Enter a domain. Input is normalized. Warn for name already claimed by another account. Step 8 is
   the same feature from the challenger's side.
3. Record screen. Claim status at the top. The record as a row in the panel's column order: Type,
   Name, Value, TTL. Name and Value copyable. Warn about zone auto-append. Show expiry. Name the
   provider from NS.
4. Check runs on arrival, no Verify button. Timeline shows nameservers found, each server queried,
   answer compared. First check always misses, the record is not added yet.
5. Re-checks while the claim is open. Backoff 5s, 15s, 30s, 60s, then every 60s, each gap measured
   from the previous answer. Stops at 15 minutes or token expiry, and says it stopped. "Check now"
   for a user who has just added the record, which also starts the cadence over. Both rate limited.
6. Verified. Show `verified_at`, `last_checked_at`, `next_check_at`.
7. Domain list. Each row carries the claim's own status, read from the row. Scheduled re-checks
   and email on status change, both designed and not built, see Open.
8. Second user proves control, the incumbent is notified, and a decision window resolves the
   contest. Step 2 is the incumbent's side. Designed in [TRANSFERS.md](TRANSFERS.md), not built.

No Verify button. The product runs the check. "Check now" means the user has added the record and
does not want to wait for the next one.

The authoritative answer decides. A DoH second opinion, designed and not built, would show where
public resolvers still disagree and the remaining negative cache window as a real number.

### Subdomains

Subdomains are verified separately. `example.com` does not cover `app.example.com`.

### Out of scope

- Orgs where the claimer does not control DNS
- Any method other than TXT
- Sending mail: DKIM, SPF, DMARC
- Teams, roles, billing
- Public API, bulk import
- Internationalized copy

## Technical Details

- Magic link from `auth.admin.generateLink`, exchanged by our own callback with `verifyOtp`
- Auth and notification email from carlton.dev through the Resend SDK
- Name: `_domainclaim-challenge.<name>`
- Value: `domainclaim-token=<token> expiry=<ISO date>`
- Token: 160 bits from `crypto.randomBytes(20)`, base32
- Token valid for 7 days. The expiry is in the record value and stated on the record screen
- TTL shown as an instruction to leave the panel's default. Any value works
- Walk up from the name to find the zone, since a subdomain can be delegated
- Query authoritative servers in parallel. DoH second opinion designed, not built
- No stored `checking` state. A check is about 250ms. `nameservers_unreachable` costs about 4s, so
  the screen derives `checking` from the in-flight request
- Public suffix and parse failures are validation errors, not states
- Route Handlers, not Server Actions. Node runtime, never Edge
- Checks run from the browser against `POST /api/claims/[id]/check`, which answers with the five
  steps as the screen renders them. The page renders the record from the row and runs no query
- Rate limits on claims created per account, on sign in email, and on checks, counted in Postgres.
  Each decision and its record are one SQL statement, which also prunes the window. Checks are
  counted per claim and per account, 20 and 60 per five minutes, both above the cadence so the
  product does not limit itself
- `maxDuration` 20 on the check route. The worst case is the 2s deadline on every step a trace
  reaches, five for a four label name, plus a second each for the two probes that only run after a
  failure. Below that, a slow zone returns a platform error instead of our message
- Screens read JSON: `GET /api/me`, `GET /api/claims`, `GET /api/claims/[id]`. Create, release
  and sign out answer JSON to a fetch and a 303 to a form post, until the old screens are gone
- Server modules import `server-only`, so importing one from a client file fails the build
- The proxy sends a signed out request for an app page to sign in, and a signed in request for `/`
  to the list. Every route still checks the session itself
- One way in to the resolver: a claim this account owns. The public trace route that the DNS slice
  shipped with is deleted, since it let anyone aim our nameserver queries at any zone, as often as
  they liked, with no account and no ceiling

### State

```ts
type FailureReason =
  | { code: 'record_not_found'; queriedName: string; nameservers: string[]; negativeTtlSeconds: number }
  | { code: 'no_txt_at_name'; queriedName: string; otherTypesPresent: string[] }
  | { code: 'cname_at_name'; queriedName: string; target: string }
  | { code: 'value_mismatch'; expected: string; found: string[] }
  | { code: 'appended_zone_suspected'; foundAt: string }
  | { code: 'token_expired'; expiredAt: Date }
  | { code: 'dnssec_broken'; validating: 'SERVFAIL'; nonValidating: 'NOERROR' }
  | { code: 'nameservers_unreachable'; attempted: string[]; timeoutMs: number }
  | { code: 'zone_not_found'; walked: string[] };

type ClaimState =
  | { status: 'pending'; issuedAt: Date; expiresAt: Date; lastFailure: FailureReason | null }
  | { status: 'verified'; verifiedAt: Date; lastCheckedAt: Date; nextCheckAt: Date }
  | { status: 'at_risk'; verifiedAt: Date; failingSince: Date }
  | { status: 'revoked'; verifiedAt: Date; revokedAt: Date; reason: FailureReason }
  | { status: 'contested'; verifiedAt: Date; challengerProvedAt: Date; decisionDueAt: Date };
```

`at_risk` carries no reason and no `graceEndsAt`. The reason is recomputed by the next check and
rendered from that, so storing it would be a second source of truth for something nothing reads in
between. `graceEndsAt` belongs to the grace window, which needs the cron. `revoked` and `contested`
are designed and have no writer.

### Data

`claims`, with one nullable `failing_since` and a unique index on the normalized name covering
verified, at risk and contested rows.
One owner per name, any number of pending attempts, which is what step 8 needs. A contested row is
still the incumbent's, so leaving it out would free the name for a third account for the length of
the contest.

`claims.last_checked_at` and `claims.dns_host`, both nullable, written by every check that asks
DNS. An expired pending claim asks nothing, so it moves neither.

`check_attempts`, one row per check we agreed to run, which is what the check limit counts. Rows are
pruned by the statement that counts them.

`checks` and `transfers` are designed here and not built. `checks` held the full trace of every
check for a history nothing renders, and the timeline turned out not to need it: the steps are
derived from a check that has just run and sent as the screen reads them. `transfers` belongs to
step 8, designed in [TRANSFERS.md](TRANSFERS.md) and not built.

`sign_in_attempts`, one row per sign in email sent. Address and source address are stored as keyed
hashes, so the table counts without becoming a list of who tried to sign in. `check_attempts` stores
ids plainly instead, because a check is a signed in account acting on its own row and hashing would
make the per claim count impossible.

### Test mode

`DOMAINCLAIM_TEST_NAMESPACE=on` routes every `.test` name to the fake resolver, outcome keyed by the
name: `verified.test`, `crowded-name.test`, `record-not-found.test`, `no-txt-at-name.test`,
`appended-zone.test`, `value-mismatch.test`, `zone-not-found.test`, plus `one-dead-nameserver.test`,
`slow-nameservers.test` and `nameservers-unreachable.test` for the timing cases, and
`other-txt.test` for TXT records that belong to another service. `flaky.test` flips its record on
every check, so verified, at risk and recovered are each one Check now away. `expired.test` is
created a minute past its expiry, the one fixture set at creation rather than in DNS. Held by
another account needs a second account. A script that succeeds returns the value the caller is
looking for, so a demo claim verifies rather than reporting a mismatch against a fixed token. Off by default, and `.test` stays refused as a
special-use name. On for the preview and the submitted deployment. Documented in the README. Each
name lands with the slice that can produce its reason, and the claim screen lists the ones that
exist.

A global switch would be a hole. Anyone who found it could verify any domain. `.test` is never a
real claim, so the fake resolver cannot be reached by a name that could be.

## Implementation Plan

Three phases, in the order Resend's design process names them, each shipped as the smallest slice
that could go to production on its own. One pull request per slice, squash merged, deployed from
`main`, CI on every one.

1. Concept, 12 to 13 September. This document, the state model, the DNS research and its measured
   facts, a hello world on Vercel. Screens sketched as HTML prototypes before any React.
2. Implementation, 13 to 16 September. In shipping order: domain input normalization; the claim
   entry screen; the DNS resolution layer behind an interface with a scripted fake; magic link sign
   in; CI; issuing a claim and the record screen; the record as a panel row and the check as five
   steps; the claim input answering as you type; the domain list; the check as an endpoint with
   Check now and the cadence; at risk written by the check; the unique violation fix; Action needed
   on pending claims; the sign in origin check.
3. Polish, 16 to 17 September. The theme pass, the list menu, copy fixes from clicking through every
   demo name, the README, this document's shape, the video.

Designed and not built, each with its reason in Open Questions: scheduled re-verification, the
grace window and the status email, transfers ([TRANSFERS.md](TRANSFERS.md)), the DNS-over-HTTPS
second opinion.

## Decisions

### The ten a reviewer will ask about

- Checks go straight to the zone's authoritative nameservers. Those do not cache, so the answer
  that decides has no cache window on our side and is found as soon as the provider publishes it,
  rather than after "up to 48 hours". Two lags remain and neither is ours: the provider's own
  panel-to-nameserver delay, and the negative cache a public resolver adds, which the failure
  names.
- The check is five steps sorted by whose move is next, never a spinner. A step that has not passed
  is not a step that has gone wrong.
- Three tones and one meaning each: attention is the person's move, neutral is waiting, good is
  held. `StatusPill` and its `TONES` map are the only place a tone becomes a colour.
- Every failure is a typed value rendered as title, the DNS value at fault, why, and one next
  action, with the action above the reason.
- `at_risk` is written by the product itself when a held name loses its record, and clears on its
  own when the record returns. Ownership is state the product maintains, not a one-time check.
- One account holds a name at a time, enforced by a partial unique index over the holding states.
  Any number of accounts may hold a pending attempt, and the first to prove control wins.
- One vantage point, the weakest part. A failure cannot tell a missing record from a broken view,
  and the screen states the first as fact. A DoH second opinion is the way to express doubt and is
  not built.
- Trust floor never traded: magic link redeemed on POST, rate limits on sends and checks,
  public-suffix and special-use refusal, no probing of non-global nameserver addresses, and a
  same-origin check on every state-changing post.
- Dark only, one `@theme` block, a pale primary so signal green means live, held, current or
  focused and nothing else.
- Scope is held to how the product looks and behaves; the grace window, the schedule, transfers and
  the DoH leg are each deferred with a reason in Open Questions.

### The rest

- TXT only. A second method is scope creep and proves less.
- One vantage point. Let's Encrypt validates from several to resist localized hijack. Vercel is one
  region. Weakness, documented, and measured 2026-09-14: a dev server and the deployment disagreed
  about a real record for two hours, and the screen stated the wrong one as fact. A single vantage
  point cannot tell a missing record from a broken view, and every failure message here is written
  as though it can.
- Supabase for database and auth. Their handbook documents Supabase for auth. Database host is not
  public, so this is defensible rather than a verified match.
- No component library. Tailwind and the native `dialog`.
- The record persists rather than being removed after validation, because re-checks need it.
  draft-13 allows either if the cadence is documented.
- Internationalized names display as the ASCII form. The readable form appears only as an echo
  of the input. Showing the readable form as the name needs a confusability rule, and an
  approximate one asserts a guarantee this code cannot keep. Residual risk: the input echo
  still renders the readable form.
- Input errors show title, subject, description, one action. Same shape as the DNS failures.
- No Check button on the claim screen. The answer is a pure function with no round trip, so the
  product works it out rather than asking to be told when to. Same argument as the record screen's
  check. It waits for a pause and for the value to look like a name, so nobody is corrected mid-word,
  and leaving the field asks immediately. The deliberate act is still the button carrying the name.
- Unrecognised suffixes refused at input. The Public Suffix List has an implicit `*` rule, so
  `192.0.2.carlton` otherwise parses as a subdomain of `2.carlton`. Test is `isIcann ||
  isPrivate`. Cost: the list ships inside `tldts`, so a brand new gTLD is refused until the
  package is updated. Accepted, the refresh path is bumping `tldts`.
- Special-use names refused by name: `localhost`, `test`, `invalid`, `example` (RFC 6761),
  `onion` (RFC 7686), `local` (RFC 6762). None resolve in public DNS, so there is no zone.
- A bare `user@host` is an email address, not URL credentials. Credentials in the wild carry a
  scheme, and a colon the local part cannot contain unquoted. Without this, pasting an email
  silently claimed the provider's domain.
- One input failure at a time. The checks are a pipeline, each stage depending on the last, so
  only the per-label group could be collected. Several at once breaks the one-action rule, and
  DNS failures are singular by nature. Mitigated by showing the whole name with the section at
  fault marked, so a second problem is visible even though only one is named.
- A leading dot and an interior double dot are separate codes. Removing the dot from `.com`
  only produces the next error, so the actions differ.
- `www` is offered as a suggestion, never applied. It is the one subdomain conventionally read
  as an alias for the name above it.
- Claiming a subdomain needs write access to the parent zone, so a second account holding
  `www.example.com` gains nothing it did not already have. The risk is that the two names read
  alike to a person, handled by always showing the full name.
- DNS failures are return values. Every one of them is something the timeline renders with a
  message and a next action, so they are results rather than exceptions. Collecting per-server
  outcomes into an array needs values too. Same convention as the input errors.
- The decisive TXT query forces the authoritative nameserver with `setServers`. That holds only
  where UDP/53 reaches the nameserver, which the deployment's network allows and a laptop's often
  does not: some local networks transparently redirect port 53 to their own resolver, silently
  turning a direct query into a cached one. This is why the product runs server-side and why real
  domains are verified on the deployment, and it explains the two-hour dev-versus-deployment
  disagreement recorded on 2026-09-14.
- Deadline 2s, one try, on every question rather than only the TXT one. A healthy authoritative
  answer measured at 92ms. Every server is asked at once so the others are the retry, and the
  number mostly caps how long one dead nameserver can tax a zone that works. Worst case for a
  trace is the deadline times the number of steps. Reported in the trace.
- The SOA read is skipped when every nameserver is unreachable. It would go to the same servers,
  so a window in the trace would be a number we never read.
- Nameserver addresses that are not globally reachable are refused before the query is sent. The
  zone picks its own nameservers, so without this a stranger's zone can have us probe loopback,
  private and link-local addresses on the network we run on. IANA special-purpose list, IPv4 only.
- The outcome names the nameserver that answered fastest. Others may hold the record too; the
  per-server rows are where that shows.
- Auth email sent by us through the Resend SDK, not by Supabase SMTP. The product needs
  transactional mail for status changes anyway, so the SDK is in the repo either way. One path for
  all mail, and the email is ours to write.
- Every email uses one layout (`lib/email/layout.ts`): the wordmark, one card with a label and a
  badge, fine print under it. The status emails reuse it with the five check steps as nodes. Fluid
  to 520px, with a fixed table for Outlook. The old template was fixed at 480px and didn't fit a
  phone.
- A hidden preheader goes first in the body, so the inbox preview shows the first line.
- The magic link points at our own route. `generateLink` returns a hashed token and `verifyOtp`
  accepts one, so the user never sees a supabase.co URL.
- Sign in links render on GET and are redeemed on POST. Scanners fetch links before the person
  does and would spend a single use link. A scanner does not submit a form.
- Sign in with GitHub, through Supabase OAuth, or an email link. No Google: the people claiming a
  domain here have GitHub, and a second provider is a second app to keep registered.
- A GitHub sign in that doesn't finish goes back to sign in with a note, and keeps `next`.
- The sign in screen plays a demo: a small copy of the app claiming one name, built from the real
  cards with made-up data. It runs in a frame at 780px wide, so the app's own layout rules see a
  desktop at any screen size. It stops while the tab is hidden and holds its last frame with
  reduced motion.
- The confirm page posts its own form with a script as it loads, so the link is one click. Most
  scanners fetch without running scripts and stop at the page. A sandbox that runs scripts, like
  Safe Links detonation, can still spend it; the person then asks for a new link. The token stays
  single use. With scripts off, the button is still there.
- A dead link in a browser already signed in as that address continues to the destination. The
  person asked to be signed in as someone and they are, so an error would be about the token.
- The confirmation page names the account being signed in to, and that address is signed, so a
  link cannot display one address while carrying a token for another.
- Sign in sends are limited per address, per IP and globally, counted in Postgres.
- Every state-changing post refuses a request whose Origin is not the host it arrived on: claim,
  check, release, and sign in. Sign in was the one without it. It sends mail and creates an
  account for the address it is given, so a page on another site could have driven it, bounded
  only by the limits. The cookie is SameSite=Lax already; this is the second mechanism.
- A tripped limit returns the same screen as a successful send and sends nothing, so the endpoint
  cannot be used to find out who has an account.
- Sending identity is carlton.dev, already verified with Resend. No sending subdomain. Reputation
  isolation does not matter at this volume.
- Claims require an account. A browser session owning a claim before sign in was considered and
  rejected: a second kind of owner in every query from then on, an adoption step with real edge
  cases, and a claim that can disappear after the user has already put a record in their zone.
- The result card is where a claim is confirmed. It already reads the normalized name back, so the
  button carries that name and no extra screen is added.
- A name another account has verified can still be claimed. Uniqueness covers verified, at risk and
  contested rows, so one owner and any number of pending attempts.
- The `.test` flag reaches the claim form. A signed-in reviewer can then reach every failure state
  without owning a domain, which is what the anonymous claim was for.
- A check returns as soon as a server has the records, and waits for every server otherwise. A
  server still running is reported as `unfinished`. Waiting for a complete trace would add the
  deadline to every successful check in a zone with one bad delegation.
- A partially broken zone is not reported on a check that succeeded. One live nameserver is a
  working zone, a dead secondary belongs to the DNS host, and the person claiming the name cannot
  act on either. `one-dead-nameserver.test` therefore shows a zone that verifies rather than a
  warning, which is the early return above, demonstrated.
- The trace says what DNS holds at a name. Comparing that against a claim happens above it, which
  keeps the trace usable as a diagnostic on its own.
- The record screen renders before its first check. The record is what the user came for and the
  check is the slow part, so the page sends the record from the row and the browser asks for the
  check. The worst case for a trace is the deadline times the number of steps, so blocking on it is
  not a rounding error.
- The check runs from the browser against an endpoint rather than in the page body. One cause sat
  under three problems: it could not be rate limited, the list's rows carried `prefetch={false}`
  against a hover spending a trace and a write, and the only way to ask again was the browser's
  reload button.
  Cost: a browser with JavaScript off sees the record and no check. Accepted, because the record is
  what the user came for and proving control is a round trip either way. The claim form still posts
  a plain form and still works without it.
- The endpoint answers with the five steps as the screen renders them rather than with the trace.
  Sending the trace would put the copy, the step rules and the provider table into the browser
  bundle to produce the same strings a second time, and every date in it would arrive as a string
  under a type that still said `Date`.
- Each gap in the cadence is measured from the previous answer. A check costs about 250ms on a
  healthy zone and the deadline on every step of a broken one, so gaps timed from the start would
  overlap requests against exactly the zones already struggling.
- Check now restarts the cadence rather than running one check. Someone pressing it has just
  changed their zone, which is the moment the schedule was designed around.
- The cadence stops after 15 minutes and says so. A page left open overnight should not keep a tab
  polling, and an absence of checks that is not stated is the same ambiguity as a chain that
  disappears.
- A check that fails to run is not a check that failed. Limited, unavailable, offline, signed out
  and released each get the four part message minus the DNS value, and four of the five are
  answered by the button that is already there.
- The timeline stores nothing. `last_checked_at` would buy one string the client can produce
  truthfully from its own last answer, and a stored check has no reader until history is rendered.
- `check_attempts` is its own table rather than a kind column on `sign_in_attempts`. That table
  stores hashes so it cannot be read back as a list of who tried to sign in, which is the wrong
  shape for counting checks per claim, and sharing it would put two retention windows in one prune.
- A claim that holds its name and cannot find its record is the person's move, not time's. The
  record step reads as wrong, the chain opens, and the message says the record has gone rather than
  that it has not been added yet.
- `nameservers_unreachable` reads as waiting rather than as a warning now that the page keeps
  asking. A zone that has not answered yet is a notification. No third step state: whose move is
  next already has an answer for it, and a second vocabulary for the same answer is how a person
  learns to stop reading either.
- Only our own records count as finding the record. A zone can answer the record's name with TXT
  records for other services, most often through a wildcard: `*.apple.com` answers every name with
  its SPF record. Those say nothing about this claim, so the record step waits as if nothing were
  there and the token step is never reached. The token step fails only on a DomainClaim record with
  another token.
- A check that finds the record verifies the claim. Finding it and leaving the claim pending would
  be a bug rather than a scope line.
- The check renders as its five steps rather than a result box: find the zone, reach the
  nameservers, find the TXT record, match the token, record the claim. Each carries the answer it
  got, so a person sees how far it went and what stopped it.
- Three states per step, sorted by whose move is next. The person's is wrong, time's is waiting, a
  step never reached is neither. `record_not_found` on a claim nobody has acted on is waiting; a
  cross there reports the product working correctly as a fault.
- Step labels are steps rather than statements. "Record found" can only be true, so it contradicts
  its own glyph.
- The chain is always present, above the record card, at two densities. One line when there is
  nothing to act on, open when there is. It never appears or disappears, because an absence cannot
  tell a person "you fixed it" from "we stopped looking". Saying that out loud needs `last_failure`,
  which is deferred.
- The four part message moves into the step that produced it and the separate failure box is
  deleted. A tooltip has no touch equivalent; a modal hides the record while telling you to use it.
- Control proved against a name another account holds is a status rather than a failure. The person
  did everything right.
- The provider line sits at the foot, beneath both cards, where it is acted on.
- No per-server timings. One count of answered steps in the chain header.
- One check answer feeds the status, the chain and the provider line. The browser holds it and the
  three regions read it, so the trace and the write happen once and the three cannot disagree.
  Without this a claim that verified mid-render showed PENDING above its own verified result.
- The row moving decides the status, not the check. A write that hits the unique index or fails
  leaves the claim where it was.
- A failed check gets a second look. Only on a failure, only for the two reasons a probe can answer,
  one second each, against a server that already answered.
- Nothing at the name: ask for the name with the zone on the end of it twice. Our own token there
  means the panel appended its zone. No DoH leg needed, which is what this document used to say.
- No TXT at the name: ask for a name nobody could have created. If that answers too, the zone
  answers for everything and the record is simply not there.
- `no_txt_at_name` no longer names its cause. Another record type, a CNAME, or a name that exists
  because something sits below it. Separating them needs a CNAME query and a new method on the
  resolver interface, for one message.
- Token valid for 7 days. Long enough for a weekend and for someone else holding the registrar
  login. A pending claim reserves no name, so a long window costs nothing. `token_expired` is
  decided from the row, so it is shown by editing `expires_at` and the real number does not have to
  be short.
- TTL is an instruction rather than a value to copy. Squarespace offers TTL as a dropdown
  defaulting to 4 hrs, measured 2026-09-13, so 300 cannot be typed there. Leaving the default alone
  is true on every panel. The record TTL does not affect the answer that decides either: the TXT
  query goes straight to authoritative and authoritative servers do not cache. The negative window
  comes from SOA `minttl`. TTL only decides how long a corrected value takes to agree in public
  resolvers, so that explanation belongs in the `value_mismatch` message.
- The record is a row in the panel's own column order. Squarespace's Add Record form runs TYPE,
  NAME, PRIORITY, TTL, TEXT. Reading our record against that form should not need translating.
  Priority is dropped, since it reads as a dash for TXT.
- Name and Value are the labels. Squarespace says Name and Text, Cloudflare says Name and Content,
  Namecheap and GoDaddy say Host and Value. Name and Value appear most often and neither is
  anyone's odd one out.
- The full name is a disclosure under the Name cell rather than a second field. It is the
  remediation for a panel that does not append the zone. Closed by default means the value copied
  without reading is the short one, and it keeps its own copy control, because that panel is where
  an underscore label has to be entered by hand.
- Cells are one line and scroll sideways rather than wrapping. A 78 byte value that wraps makes
  every cell in the row a different height and the row stops reading as a row. Cost: the value is
  not visible all at once. Accepted, since it is copied rather than read, and a bad paste is what
  `value_mismatch` reports.
- Copy controls sit inside the field border. Four cells with separate buttons beside them do not
  say which value each button belongs to.
- The claim's state is the top of the record screen, read from the row rather than from the check.
  The row carries the status before any check runs, so the shell says it while the check is still
  streaming. The eyebrow previously read CLAIMING on a name this account already held.
- The record card collapses on a claim that already holds its name. "Add this record" is
  instruction for work already done. It stays one click away, because comparing this value against
  the one in the panel is why someone opens a verified claim.
- The record screen is wider than the rest of the app. Four columns need the width. The check and
  the notices span the same width, so the cards line up, and each paragraph inside them is capped
  at the measure the other screens read at. Two card widths on one screen read as unfinished.
- One measure for every screen, 1040px, shared by the top bar.
- Claims sit in a sidebar of favicons that opens on hover, with Claim a domain at the top. It is
  fixed and drawn over the page, so opening it moves nothing. A badge on the favicon marks a claim
  that needs something. Phones, touch screens and builds with `SIDEBAR` off get a picker on the
  domain name in the breadcrumb instead. `SIDEBAR` is a code constant in `src/lib/ui/config.ts`.
  The project has no feature flags.
- Pages and layouts read no session and load no data, so every page is static and a link to one
  is prefetched. Screens are client components that fetch from `/api` with SWR, and show a
  skeleton of the same height until the data arrives.
- A list row is one line on desktop. Below 900px the date goes. Below 720px the pill moves under
  the name and the host goes.
- The demo names are a table: name with its copy control, outcome in the chain's words, and what
  the script does. Three things are said about every name and a reader compares down a column.
- The theme is a token block in `globals.css` and nothing else names a colour, radius or face. Dark
  only. Three tones: signal green for held, passed and the primary action, cyan for waiting and
  focus, amber for the person's move. There is no red.
- In a four part message the action comes before the description. What to do matters more than why,
  and a copyable value sits between them so it reads as instruction, thing to paste, reason.
- The keep-the-record line on a verified claim is a warning with a bold lead. It is the one thing on
  that screen the person could get wrong.
- The check limit answers with when checks resume: the oldest counted check in the full window,
  plus the window. Check now reads Check limit reached and stays off until then. The time costs a
  second statement, run only after a refusal.
- On a name another account holds, a wrong token found on open doesn't open the check card. That
  account's record is at the name, so a wrong token is expected, and the record card is where the
  screen says the name is held. Check now opens it and stays there, since the value to use is in it.
- A proved claim on a name another account holds keeps checking. Its next step is asking that
  account to release the name; the check after that verifies this claim. Transfers stay a draft
  (TRANSFERS.md).
- An expired claim gets a new record in place. Get a new record claims the name again, which
  reissues the token on the same claim, then checks. Releasing and claiming again was two steps for
  the same result.
- A wrong value and a doubled name mark where they go wrong: the part after what matches is
  highlighted, and values wrap rather than scroll so the two can be read against each other.
- After a check someone watched, its result scrolls into view when it ends below the fold.
- A background check's pulse finishes the run it is on before it goes, so a fast answer doesn't cut
  it off part way to the node.
- The header's second row is as tall as the Open DNS button before the button exists, so the first
  check naming the host doesn't move the page.
- A claim is released from its own screen, with Release claim in the header. It is the only action
  there, so it is a button rather than a menu.
- Refresh on the list reads the list again and runs no check. The list also reads again when the
  window regains focus and after every claim or release. A note on Refresh says a claim is checked
  on its own screen.
- The primary action is signal green, as in the design.
- A tinted check row carries a 3px stripe in its tone and the fix panel prints the state word.
  The two tints are both near black, and for red-green colour vision the red and the amber drift
  together, so the glyph was carrying the state alone. Wrong and attention now share amber.
- The list filters by the word on the pill and sorts three ways, with the choice in the URL. The
  chips carry counts. The pill words are the list's labels from before the rebuild: Pending,
  Verified, Action needed, At risk, Expired. The list can't tell which wrong record a claim has, so
  it doesn't name one. The claim screen does.
- The list sorts needs-attention first by default, stable, so newest still leads in each group.
  A notice above the list counts the claims that need the person. Show filters to them, and presses
  their chip when they share one word.
- Claiming needs JavaScript. The input checks the name as it is typed, and the new row plays in
  the list before the claim opens.
- The claim route has its own error boundary. A throw reading the claim keeps the way back to
  the list and retries the segment; the root boundary speaks for the whole app.
- A pending claim carries an attention `Action needed` state when a check finds a wrong record at
  its name, stored in `action_needed_since` and shown on the list, which runs no check of its own.
  The list already split pending into neutral `Pending` and attention `Expired` because expiry is
  derivable from the row; a wrong record is not, so it is persisted the way `at_risk` is. Set on a
  TXT with the wrong value, a record of another type, or the record one label down; not on nothing
  at the name (the waiting state), an unreachable zone, or a missing delegation. Cleared when a
  check no longer finds the wrong record, and by verifying. The record pill derives the same state
  live from the check, so a pending failure reads by whose move is next on every screen.
- Each demo name says what it is scripted to do. A name whose outcome has to be guessed from its
  spelling is a demo that cannot be checked.
- Releasing a claim deletes the row. A released state would qualify every later query for nothing.
  The confirmation names the record to remove, since a released claim otherwise leaves a live TXT
  record in the zone that nothing will mention again.
- `checks` is not built. The timeline landed without it, since the steps are derived from the check
  that just ran, and a table shaped before its reader exists gets reshaped when the reader arrives.
- One pending claim per account per name, enforced by a second partial unique index. Claiming a
  name this account already has goes to the claim it already has. Without this, claiming twice
  mints a second token and the record the user already added is silently the wrong one.
- An expired pending claim is reissued on the same row rather than refused. The id does not change,
  so a URL the user already has keeps working, and the record screen says the value has changed.
- A claim on a name another account holds is created, not refused, and the record screen says so
  before the user edits their zone. Uniqueness covers the held states, so the refusal belongs at
  the moment control is proved.
- A challenger who proves control keeps a pending claim and is told the name is held. Writing
  `contested` would open a state nothing can resolve until transfers exist.
- Claim ids are checked against the uuid shape before they reach a query, because Postgres refuses
  a malformed one with an error rather than an empty result.
- Sign in lands on the list, always. A rule that routes by how many claims an account has puts a
  person somewhere different on their second visit, and the empty list is the first run screen.
- Sign in is the home page. One screen explains the product and signs you in, so the way in is one
  click from the first page. `/signin` redirects there. A signed in account asking for it is
  redirected to the list.
- The list runs no check. A row's state is the claim's own, read from the database, so opening the
  list costs one query whatever is in it. A check belongs where someone has gone to act on it.
- Each check that asks DNS stores when it finished and who serves the zone (`last_checked_at`,
  `dns_host`). The list still runs no check, but it can say how old a row's state is, and the claim
  header can name the DNS host before a visit's first check comes back.
- The closed check line carries no time at all. When the check ran, and that another is coming,
  are said next to the button that asks now, which is the one place either can be acted on. The
  relative time is honest again because the client re-renders it, and it is coarse, since a second
  by second count is motion on a page where nothing is happening.
- The list's rows prefetch again and the comment goes with the prop. The reason recorded for that
  prop was wrong. Measured on the deployment, 2026-09-15: loading `/domains` with `prefetch={false}`
  removed produces no request to `/claim/<id>` of any kind, and Next does not prefetch in `next dev`
  either, so it was never observable while the prop was being written. A prefetched record screen
  would cost a render and two reads, and nothing prefetches it.
- A pending claim whose token has run out reads as expired on the list. The row is still pending in
  the database, and the list is the one screen that no check will correct.
- A held claim whose check cannot find its record moves to `at_risk` and stamps `failing_since`.
  Three of the five states were reachable only by editing the database by hand.
- Only failures where the nameservers answered write it. `record_not_found`, `no_txt_at_name`,
  `appended_zone_suspected` and `value_mismatch` each mean the zone was read and this claim's record
  was not in it. `nameservers_unreachable` and `zone_not_found` mean a view of DNS that failed, which
  from one vantage point is the weakest signal this product has, and a two second deadline should not
  take a name off an account. The rule is a pure function with a test, since it is the decision this
  state turns on.
- Nothing is stored about why a check failed. `failing_since` is a plain `timestamptz` and needs no
  codec, no versioning and no unknown-variant guard, which is the whole of the analysis that keeps
  `last_failure` unbuilt.
- The write is conditional on the status inside the statement, like every other write here, so a
  reload changes nothing and `failing_since` stays at the first failure rather than being pushed
  forward by every check after it.
- A record that answers again takes the claim back to `verified` and clears `failing_since`.
  `verified_at` does not move. The account has held the name since it first proved it, and a record
  coming back is not a second proof of ownership.
- The check that recovers a claim says so. Going quietly back to Verified leaves the person who has
  just fixed their zone reading a screen that says nothing about what they did, which is the same
  ambiguity as a chain that disappears.
- The list row says how long a name has been failing, and no other row carries a date. The status
  word says what is true and the date says how long it has been true, which is the part a person
  weighs and the number the grace window will count from. The full timestamp with its UTC suffix,
  like every date in the product, since a bare date is read locally and lands a day out either side
  of midnight.
- A claim that holds its name is never answered from its token expiry. Verifying does not clear
  `expires_at`, so every name held for longer than seven days carries an expiry in the past, and
  reading it without the status first stopped the check before it asked DNS anything. That made the
  writer above switch itself off a week after each claim was proved.
- The record card says something different about the token expiry once the claim holds the name.
  That date is sitting in the record value being compared against the panel. Until the fix above
  this was unreachable, because the check stopped on the expiry and the whole screen said the claim
  had expired.
- `@playwright/test` removed. It was declared for one end-to-end run, sign in, claim a demo name,
  read the record, release, that the remaining sessions never reached. A dependency the repo
  carries and never uses is a question a reviewer should not have to ask. The unit layer covers
  normalization, the DNS trace, the comparison, the state machine, the step list and every string;
  the whole flow is exercised by hand through the demo names and shown in the video linked from the
  README. The database layer's gap is named in the README.

## Open Questions

- Notify the parent holder when a child name is claimed?
- Instrumentation. Nothing is measured yet. The right first cut is one structured log line per
  check carrying the reason code, the step reached, elapsed time and the provider, and nothing
  that identifies a person or a name: no domain, no token, no claim or account id. Vercel's logs
  hold it with no vendor. Left for after submission on purpose.
- Grace window length. Atlassian uses 14 days. Needs to be demoable in minutes too.
- Orgs where the user is not the person who controls the DNS. Out of scope now, revisit later.
- `example.com` and `app.example.com` held by different accounts. The model allows it, and the zone
  access analysis says it is not an escalation. Refuse, warn, or leave it?
- Claim the apex and `www` in one action? Needs multi-claim, which does not exist.
- IPv6-only nameservers. Addresses come from A records only, so such a zone reports unreachable.
- Bounce and complaint handling for mail sent to addresses that never asked for it.
- The open questions for transfers, who decides at the end, the window length, two challengers at
  once, and the undefined Resend fields, are in [TRANSFERS.md](TRANSFERS.md).
- The claim limit counts rows rather than attempts, so releasing a claim frees quota. The sign in
  limiter counts attempts in a table of their own and does not have this.
- Nothing re-checks a held name on a schedule. `at_risk` is written by a check someone is watching,
  which is the record screen and nowhere else, so a name losing its record while nobody has it open
  goes unnoticed until somebody opens it. Vercel Hobby allows a cron no more often than once a day,
  and fires it within an hour of the time given, so a daily job is a defensible cadence for a held
  name and useless for showing drift in a demo. It needs a paid plan or a protected manual trigger.
- The grace window and the status change email both sit behind that cron, so neither is built and
  `at_risk` has no exit to `revoked`.
- The clock starts on one failed check. `failing_since` is stamped by the first check that proves
  the record is gone, so a zone edit that briefly serves the name without the record is enough to
  start it. That self-corrects today, since the next check recovers the claim and clears the column.
  The grace window cannot be built on it: a countdown and an email started by one flaky answer are a
  different cost from a pill that changes colour for five seconds. Starting the clock on consecutive
  failures needs stored check history, which is the `checks` table that has no reader yet.

## States

| Reason | Title | Next action | Test |
| --- | --- | --- | --- |
| `record_not_found` | No record found yet | Add the record below. | `record-not-found.test`, `other-txt.test` |
| `record_not_found`, on a claim that holds the name | The record is missing | Add the record below back in {host}. | `flaky.test`, second check |
| `no_txt_at_name` | The name exists but has no TXT record | Keep it, and add the TXT record beside it. | `no-txt-at-name.test` |
| `cname_at_name` | | | |
| `value_mismatch` | The TXT record has a different value | Replace the value in {host} with the one below. | `value-mismatch.test` |
| `appended_zone_suspected` | The domain was added to the name twice | Change the record's name to the short one below. | `appended-zone.test` |
| `token_expired` | This claim has expired | Get a new record to try again. | `expired.test` |
| `dnssec_broken` | | | |
| `nameservers_unreachable` | {host}'s nameservers aren't answering | If it lasts more than a few minutes, check the nameservers set at your registrar. | `nameservers-unreachable.test` |
| `zone_not_found` | No nameservers found for this domain | Set nameservers at your registrar. | `zone-not-found.test` |
| Proved, held by another account | Control verified. Another account holds this name. | Ask the account that holds this name to release it, and leave the record in place. | Two accounts |
| Check limit | Check limit reached | Press Check now after {time}. | 21 checks in 5 minutes |

{host} is the DNS host by name when we recognise it, and "your DNS panel" otherwise. An action is
one sentence; anything else goes in the description.

`cname_at_name` needs a CNAME query, which is a new method on the resolver interface, for one
message. `dnssec_broken` needs the DoH leg, which is not built. Both stay empty.

A claim that holds its name moves to At risk on the four reasons where the nameservers answered:
`record_not_found`, `no_txt_at_name`, `appended_zone_suspected` and `value_mismatch`. The other
three leave it where it is. At risk has no exit to `revoked`, since that transition is the grace
window and the grace window needs the cron above.
