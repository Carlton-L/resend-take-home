# DomainClaim

Claim a domain, prove you control it, and see what is happening at every step.

Most verification is opaque: paste a record, wait 48 hours, check back. This asks your zone's
authoritative nameservers directly and reports what each one answered. Every failure names a reason
and one next action. Ownership keeps being checked after it is proved: a name whose record stops
answering moves to At risk on the next check, and back when the record returns. Nothing re-checks on
a schedule, for the reason in the RFC.

Live at [domainclaim-pi.vercel.app](https://domainclaim-pi.vercel.app). Take-home for Resend.
Decisions are in [docs/RFC.md](docs/RFC.md).

![The record screen for loresprite.com in the Action needed state: the check shown as five steps, stopped at Match the token because a TXT record with a different value is present, showing what was found, the value to use, and one next action, with a notice that another account currently holds the name and that adding the record proves control of the DNS without transferring it](docs/images/check-failing.png)

## Try it

Fastest tour: sign in, which lands on an empty list of your claims. Claim `record-not-found.test` to
see the record and the check that has nothing to find yet, then claim `verified.test` to watch a
claim prove itself. `appended-zone.test` is the one to look at for how failures are explained.

Sign in with a link sent to your address. No password.

Claim a real domain, or use a demo name below. Each routes to a scripted resolver, so every outcome
is reachable without owning a broken domain. `.test` is reserved by RFC 6761 and can never be a real
claim.

| Name | What it shows |
| --- | --- |
| `verified.test` | Record found, claim verifies |
| `crowded-name.test` | Found among other services' TXT records |
| `one-dead-nameserver.test` | A zone with a dead secondary, which verifies at the speed of the live ones |
| `record-not-found.test` | Nothing at the name, with the negative cache window |
| `no-txt-at-name.test` | Name exists, no TXT on it, and the zone is not answering for everything |
| `appended-zone.test` | The panel appended the domain, so the record landed one level down |
| `value-mismatch.test` | A TXT record carrying a token this claim did not issue |
| `nameservers-unreachable.test` | No answer inside the deadline |
| `zone-not-found.test` | No level answers with nameservers |
| `slow-nameservers.test` | Alive but past the deadline, which reads the same as down |

`slow-nameservers.test` and `nameservers-unreachable.test` render the same screen today. A slow zone
and a dead one differ in whether they resolve while you watch, which is what the five steps arriving
one at a time would show, and that is not built. Both names are kept, because the difference is real
and the screen is what does not show it yet.

No demo name reaches At risk. A script is fixed per name, so a name that fails can never verify
first, and that state needs a claim that proved itself and then lost its record. It is reachable
only on a real domain.

## How it works

- Checks go straight to the zone's authoritative nameservers over UDP/53. Those do not cache, so a
  record shows up as soon as your DNS provider publishes it to them, with no cache window on our
  side. Two lags remain and neither is ours: your provider's own delay writing the record from its
  panel to its nameservers, which varies by provider, and the negative cache window a public
  resolver adds on top, which the failure names.
- The direct query only holds on a network that lets UDP/53 reach the nameserver. Some local
  networks transparently redirect port 53 to their own resolver, which silently turns a direct
  query into a cached one, so real domains are verified on the deployment rather than a laptop.
- It walks up from the record's name to find the zone. A delegated subdomain has its own
  nameservers, and the parent's would be wrong.
- Every nameserver is asked at once and one answer is enough. A server still running when the answer
  arrives is reported as unfinished.
- One account holds a name at a time, enforced by a partial unique index over the states that hold
  it. Several accounts can hold a pending attempt, and the first to prove control wins. Transfers
  build on that.
- The token is public. It sits in a TXT record anyone can query, so its only job is being
  unguessable. 160 bits from `crypto.randomBytes`.
- No Verify button. A check takes about 250ms, so the product runs it, and keeps running it while
  the claim is open: 5s, 15s, 30s, 60s, then every minute, stopping after fifteen and saying so.
  Check now is for the person who has just saved the record and does not want to wait for the next
  one. Both are rate limited, per claim and per account.
- A check that disagrees with the row moves the row. A name this account holds whose record has gone
  becomes At risk, stamped with when it started failing, and a record that answers again clears it
  and says so. Only the failures where the nameservers answered and the record was not in what came
  back write that state. A timeout says nothing about what is in a zone, and from one vantage point
  it should not be allowed to take a name off an account.
- The check reports itself as five steps, each carrying the answer it got: find the zone, reach the
  nameservers, find the TXT record, match the token, record the claim. A step that has not passed is
  not the same as one that has gone wrong, and they are drawn differently: if the next move belongs
  to the person it is a failure, if it belongs to time it is still waiting.
- A failed check asks two follow-up questions. Nothing at the name means asking for the name with the
  zone on the end of it twice, which catches a panel that appended its zone. No TXT at the name means
  asking for a name nobody could have created, which catches a wildcard zone answering for
  everything, where a record that was never added otherwise looks like one saved under the wrong
  type.
- Failures are typed values, rendered as a title, the DNS value at fault, why, and one next action.
- One vantage point, which is the weakest part of this. The check runs from one region, so a failure
  means either the record is missing or our own view of DNS is wrong, and the screen states the
  first of those as fact. Measured on 2026-09-14: a dev server and the deployment disagreed about a
  real record for two hours, and the wrong one sounded certain. Two paths disagreeing is the only
  thing that can express doubt, which is what the second opinion below is for.
- The list of an account's claims runs no check. A row's state is the claim's own, read from the
  database, so opening the list costs one query however many names are in it. A check belongs on the
  screen someone opened to act on the answer. The list sorts names that need the person to the top,
  says so in a line above itself, and filters by status, so the one at risk name in a long list is
  never below the fold.

## Scope

Built:

- Magic link sign in
- Domain input, normalized, with a typed error for every way a name can be wrong
- Claim issue with a scoped token, and the record to add
- The check, run on arrival and again on a cadence, against real DNS, reported as its five steps
- Check now, at a rate limited endpoint
- At risk when a held name loses its record, and recovery when it comes back
- Seven of nine failure reasons, each with one action and the remediation in the step that produced it
- The list of an account's claims, including the ones not proved yet, with filter, sort, and a
  notice for names that need attention
- Releasing a claim, from the record screen or the list

Not built yet:

- The five steps arriving one at a time, with the waiting ring animating while one is in flight
- Scheduled re-verification. A name that loses its record while nobody has it open goes unnoticed
  until somebody opens it
- The grace window and the notification email, which both sit behind that schedule, so At risk has
  no exit to Revoked
- Transfers for a contested name, when a second account proves control of a name someone else
  holds. `contested` and `revoked` are modelled and nothing writes them. Designed in
  [docs/TRANSFERS.md](docs/TRANSFERS.md)
- A second opinion over DNS-over-HTTPS. It separates a CNAME at the name and broken DNSSEC from the
  failures above, and shows how far behind public resolvers are while they catch up. Its larger job
  is doubt, for the reason in the section above

Out of scope, reasoning in the RFC: verification methods other than TXT, sending mail and its
records, teams and roles, a public API, internationalized copy.

## Running it

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Node 24.x. Needs a Supabase project and a Resend API key. Every variable is documented in
`.env.example`.

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm verify` | Biome, TypeScript, Vitest and the build, in one command |
| `pnpm test` | Vitest unit tests |
| `pnpm typecheck` | TypeScript with no emit |
| `pnpm check` | Biome lint and format check |
| `pnpm format` | Biome check with fixes applied |
| `pnpm db:generate` | Write a migration from the schema |
| `pnpm db:migrate` | Apply pending migrations |

## Tests

CI runs `pnpm verify` on every pull request, with no secrets, because nothing reads an environment
variable at module scope.

425 unit tests, concentrated in the pure layers: input normalization, the DNS trace, the
comparison against a claim, the state each check leaves the claim in, the step list and every
user-facing string. The DNS layer sits behind an
interface with a scripted fake, so no test touches the network.

The coverage is deliberately lopsided and the gap should be named. The database layer needs a real
Postgres and has almost no automated tests, and four of the bugs found in review lived there. It is
covered by a manual pass, and in-process Postgres is queued. The one test it does have is the
function that decides whether an error is Postgres refusing a duplicate, which needs no database
because it runs before anything is written.

## Documents

- [docs/RFC.md](docs/RFC.md). Decisions, reasoning, open questions.
- [docs/TRANSFERS.md](docs/TRANSFERS.md). A feature RFC for moving a held name between accounts,
  with a prototype under `docs/prototypes/`. Designed, not built.
- [docs/FRICTION_LOG.md](docs/FRICTION_LOG.md). Every confusion hit using this against a real
  domain, each resolved, deferred or accepted.
- [docs/POLISH_BACKLOG.md](docs/POLISH_BACKLOG.md). Ideas held back on purpose, with what each costs
  and buys.
