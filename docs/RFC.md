# DomainClaim

Claim a domain, prove you control it, see every step, recover when it fails. Ownership is persistent
state: re-checked on a schedule, revocable, transferable between accounts.

User: one person who controls their own DNS.

## Background

- Verification proves control of the zone. Ownership is a registrar contract. Registrant and
  nameserver operator are often different people.
- carlton.dev example: NS are googledomains, registrar is Squarespace. Resend reports "Google"
  and is correct.
- Token goes in a scoped underscore TXT label. Underscores cannot collide with hostnames.
- Nothing propagates. Authoritative servers are current, caches lag.
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
5. Re-checks while the claim is open. Backoff 5s, 15s, 30s, 60s, then every 60s. Stops at 15
   minutes or token expiry. "Check now" for a user who has just added the record. Both rate limited.
6. Verified. Show `verified_at`, `last_checked_at`, `next_check_at`.
7. Domain list with live status. Scheduled re-checks. Email on status change.
8. Second user proves control, incumbent notified, gate decides. Step 2 is the incumbent's side.

No Verify button. The product runs the check. "Check now" means the user has added the record and
does not want to wait for the next one.

The authoritative answer decides. DoH is a second opinion. While a negative cache entry is alive the
two disagree. The timeline shows both answers and the remaining window as a real number.

### Subdomains

Subdomains are verified separately. `example.com` does not cover `app.example.com`.

### Out of scope

- Orgs where the claimer does not control DNS
- Any method other than TXT
- Sending mail: DKIM, SPF, DMARC
- Teams, roles, billing
- Public API, bulk import
- Internationalized copy

## Technical details

- Magic link from `auth.admin.generateLink`, exchanged by our own callback with `verifyOtp`
- Auth and notification email from carlton.dev through the Resend SDK
- Name: `_domainclaim-challenge.<name>`
- Value: `domainclaim-token=<token> expiry=<ISO date>`
- Token: 160 bits from `crypto.randomBytes(20)`, base32
- Token valid for 7 days. The expiry is in the record value and stated on the record screen
- TTL shown as 300. Any value works
- Walk up from the name to find the zone, since a subdomain can be delegated
- Query authoritative servers in parallel, DoH as a second opinion
- No stored `checking` state. A check is about 250ms. `nameservers_unreachable` costs about 4s, so
  the screen derives `checking` from the in-flight request and shows each server as it lands
- Public suffix and parse failures are validation errors, not states
- Route Handlers, not Server Actions. Node runtime, never Edge
- Rate limits on automatic re-checks, on "Check now", on claims created per account, and on sign in
  email. The sign in check and its record are one SQL statement, which also prunes the window

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
  | { status: 'at_risk'; verifiedAt: Date; failingSince: Date; graceEndsAt: Date; reason: FailureReason }
  | { status: 'revoked'; verifiedAt: Date; revokedAt: Date; reason: FailureReason }
  | { status: 'contested'; verifiedAt: Date; challengerProvedAt: Date; decisionDueAt: Date };
```

### Data

`claims`, with a unique index on the normalized name covering verified, at risk and contested rows.
One owner per name, any number of pending attempts, which is what step 8 needs. A contested row is
still the incumbent's, so leaving it out would free the name for a third account for the length of
the contest. `checks`, one row per check holding its full trace. `transfers`.

`sign_in_attempts`, one row per sign in email sent. Address and source address are stored as keyed
hashes, so the table counts without becoming a list of who tried to sign in.

### Test mode

`DOMAINCLAIM_TEST_NAMESPACE=on` routes every `.test` name to the fake resolver, outcome keyed by the
name: `verified.test`, `record-not-found.test`, `no-txt-at-name.test`, `value-mismatch.test`,
`nameservers-unreachable.test`, `zone-not-found.test`, plus `one-dead-nameserver.test` and
`slow-nameservers.test` for the timing cases. A script that succeeds returns the value the caller is
looking for, so a demo claim verifies rather than reporting a mismatch against a fixed token. Off by default, and `.test` stays refused as a
special-use name. On for the preview and the submitted deployment. Documented in the README. Each
name lands with the slice that can produce its reason; the route lists the ones that exist.

A global switch would be a hole. Anyone who found it could verify any domain. `.test` is never a
real claim, so the fake resolver cannot be reached by a name that could be.

## Decisions

- TXT only. A second method is scope creep and proves less.
- One vantage point. Let's Encrypt validates from several to resist localized hijack. Vercel is one
  region. Weakness, documented.
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
  package is updated. Accepted, refresh path in `spec.md`.
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
- The magic link points at our own route. `generateLink` returns a hashed token and `verifyOtp`
  accepts one, so the user never sees a supabase.co URL.
- Sign in links render on GET and are redeemed on POST. Scanners fetch links before the person
  does and would spend a single use link. A scanner does not submit a form.
- A dead link in a browser already signed in as that address continues to the destination. The
  person asked to be signed in as someone and they are, so an error would be about the token.
- The confirmation page names the account being signed in to, and that address is signed, so a
  link cannot display one address while carrying a token for another.
- Sign in sends are limited per address, per IP and globally, counted in Postgres.
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
- The incumbent is notified when a challenger proves control, never when one is created. Creating a
  claim costs nothing but typing a name.
- The `.test` flag reaches the claim form. A signed-in reviewer can then reach every failure state
  without owning a domain, which is what the anonymous claim was for.
- A check returns as soon as a server has the records, and waits for every server otherwise. A
  server still running is reported as `unfinished`. Waiting for a complete trace would add the
  deadline to every successful check in a zone with one bad delegation.
- The trace says what DNS holds at a name. Comparing that against a claim happens above it, which
  keeps the trace usable as a diagnostic on its own.
- The record screen renders before its first check. The record is what the user came for and the
  check is the slow part, so the record card is sent first and the check streams in behind it. The
  worst case for a trace is the deadline times the number of steps, so blocking on it is not a
  rounding error.
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
- One check promise feeds the status, the chain and the provider line. The page starts it without
  awaiting and hands it to three Suspense boundaries, so the trace and the write happen once.
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
  reachable through `.test`, so the real number does not have to be short to be shown.
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
- The record screen is wider than the rest of the app. Four columns need the width. Prose does not,
  so the check and the notices keep the measure the other screens read at.
- Releasing a claim deletes the row. A released state would qualify every later query for nothing.
  The confirmation names the record to remove, since a released claim otherwise leaves a live TXT
  record in the zone that nothing will mention again.
- `checks` lands with the timeline. Nothing on the record screen reads a stored check, and a table
  shaped before its reader exists gets reshaped when the reader arrives.
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

## Open

- Notify the parent holder when a child name is claimed?
- Grace window length. Atlassian uses 14 days. Needs to be demoable in minutes too.
- Orgs where the user is not the person who controls the DNS. Out of scope now, revisit later.
- `example.com` and `app.example.com` held by different accounts. The model allows it, and the zone
  access analysis says it is not an escalation. Refuse, warn, or leave it?
- Ask Resend: `grace_period` and `recent_owner_activity` are named in their docs and never defined.
- Claim the apex and `www` in one action? Needs multi-claim, which does not exist.
- IPv6-only nameservers. Addresses come from A records only, so such a zone reports unreachable.
- Bounce and complaint handling for mail sent to addresses that never asked for it.
- Two challengers proving control of one name at the same time. `contested` carries one
  `challengerProvedAt` and one `decisionDueAt`, so the state models one challenger.
- A proved challenge is not recorded anywhere today. The challenger sees it and the incumbent is
  told nothing, because notification and the decision both belong to step 8.
- Whether the incumbent decides, a timer decides, or proving control simply wins after a notice
  period. Atlassian and Google both keep the incumbent until a person acts.
- Checks are not rate limited yet. The security floor names the limit and the record screen runs a
  check on every load, so a signed in account can point the resolver at a stranger's nameservers as
  fast as it can reload. It lands with the timeline, which moves the check to an endpoint the limit
  can sit on.
- Check on render does not survive the domain list. A link into a claim is prefetched on hover, so
  a list of claims would run a DNS query for every row a cursor passes over.
- The claim limit counts rows rather than attempts, so releasing a claim frees quota. The sign in
  limiter counts attempts in a table of their own and does not have this.

## States

| Reason | Title | Next action | Test |
| --- | --- | --- | --- |
| `record_not_found` | No record there yet | Add the record above, then reload this page. | `record-not-found.test` |
| `no_txt_at_name` | The name exists with no TXT record on it | Open the record in your DNS panel and set its type to TXT. | `no-txt-at-name.test` |
| `cname_at_name` | | | |
| `value_mismatch` | A TXT record is there with a different value | Replace the value with the one above, copied whole. | `value-mismatch.test` |
| `appended_zone_suspected` | | | |
| `token_expired` | This claim has expired | Release this claim and start a new one, which issues a fresh token. | Claim row, no query |
| `dnssec_broken` | | | |
| `nameservers_unreachable` | No answer from the nameservers | Reload this page in a few minutes. | `nameservers-unreachable.test` |
| `zone_not_found` | No nameservers found for this domain | Set nameservers for the domain at your registrar, then reload this page. | `zone-not-found.test` |

The three empty rows all need the DoH leg to be told apart from the rows above them, so they arrive
with it.
