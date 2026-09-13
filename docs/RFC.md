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
3. Record screen. Host, type, value, TTL, each copyable. Warn about zone auto-append. Show expiry.
   Name the provider from NS.
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

`claims`, with a unique index on the normalized name covering verified and at risk rows only. One
owner per name, any number of pending attempts, which is what step 8 needs. `checks`, one row per
check holding its full trace. `transfers`.

`sign_in_attempts`, one row per sign in email sent. Address and source address are stored as keyed
hashes, so the table counts without becoming a list of who tried to sign in.

### Test mode

`DOMAINCLAIM_TEST_NAMESPACE=on` routes every `.test` name to the fake resolver, outcome keyed by the
name: `record-not-found.test`, `cname-at-name.test`, `dnssec-broken.test`,
`nameservers-unreachable.test`, one per reason. Off by default, and `.test` stays refused as a
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
- Submit stays enabled on an empty field. A disabled button gives the user nothing to act on.
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
- A name another account has verified can still be claimed. Uniqueness covers verified and at risk
  rows, so one owner and any number of pending attempts.
- The incumbent is notified when a challenger proves control, never when one is created. Creating a
  claim costs nothing but typing a name.
- The `.test` flag reaches the claim form. A signed-in reviewer can then reach every failure state
  without owning a domain, which is what the anonymous claim was for.
- A check returns as soon as a server has the records, and waits for every server otherwise. A
  server still running is reported as `unfinished`. Waiting for a complete trace would add the
  deadline to every successful check in a zone with one bad delegation.
- The trace says what DNS holds at a name. Comparing that against a claim happens above it, which
  keeps the trace usable as a diagnostic on its own.

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

## States

| Reason | Title | Next action | Test |
| --- | --- | --- | --- |
| `record_not_found` | | | |
| `no_txt_at_name` | | | |
| `cname_at_name` | | | |
| `value_mismatch` | | | |
| `appended_zone_suspected` | | | |
| `token_expired` | | | |
| `dnssec_broken` | | | |
| `nameservers_unreachable` | | | |
| `zone_not_found` | | | |
