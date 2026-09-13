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
- Negative caching happens in recursive resolvers. Authoritative servers do not cache. Our checks
  query authoritative, so they cache nothing. The DoH second opinion does, for the zone's SOA
  `minttl`.
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

1. Magic link sign in.
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

- Name: `_domainclaim-challenge.<name>`
- Value: `domainclaim-token=<token> expiry=<ISO date>`
- Token: 160 bits from `crypto.randomBytes(20)`, base32
- Walk up from the name to find the zone, since a subdomain can be delegated
- Query authoritative servers in parallel, DoH as a second opinion
- No stored `checking` state. A check is about 250ms. `nameservers_unreachable` costs about 4s, so
  the screen derives `checking` from the in-flight request and shows each server as it lands
- Public suffix and parse failures are validation errors, not states
- Route Handlers, not Server Actions. Node runtime, never Edge
- Rate limits on automatic re-checks, on "Check now", and on claims created per account

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

`claims`, unique on the normalized name, which is where single ownership is enforced. `checks`, one
row per check holding its full trace. `transfers`.

### Test mode

`DOMAINCLAIM_TEST_NAMESPACE=on` routes every `.test` name to the fake resolver, outcome keyed by the
name: `record-not-found.test`, `cname-at-name.test`, `dnssec-broken.test`,
`nameservers-unreachable.test`, one per reason. Off by default, and `.test` stays refused as a
special-use name. On for the preview and the submitted deployment. Documented in the README.

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

## Open

- Notify the parent holder when a child name is claimed?
- Grace window length. Atlassian uses 14 days. Needs to be demoable in minutes too.
- Orgs where the user is not the person who controls the DNS. Out of scope now, revisit later.
- `example.com` and `app.example.com` held by different accounts. The model allows it, and the zone
  access analysis says it is not an escalation. Refuse, warn, or leave it?
- Ask Resend: `grace_period` and `recent_owner_activity` are named in their docs and never defined.
- Claim the apex and `www` in one action? Needs multi-claim, which does not exist.

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
