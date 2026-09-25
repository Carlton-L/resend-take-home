# DomainClaim

Claim a domain, prove you control it, and see what is happening at every step.

Most verification is opaque: paste a record, wait 48 hours, check back. This asks your zone's
authoritative nameservers directly and reports what each one answered. Every failure names a reason
and one next action. Ownership keeps being checked after it is proved: a name whose record stops
answering moves to At risk on the next check, and back when the record returns. Nothing re-checks on
a schedule, for the reason in the RFC.

Live at [domainclaim-pi.vercel.app](https://domainclaim-pi.vercel.app). Take-home for Resend.
Decisions are in [docs/RFC.md](docs/RFC.md). A five minute walkthrough of the product and the
process is on [Loom](https://www.loom.com/share/bf1c008566fd44dba68fd82532dc9c5d).

![The record screen for loresprite.com in the Action needed state: the check shown as five steps, stopped at Match the token because a TXT record with a different value is present, showing what was found, the value to use, and one next action, with a notice that another account currently holds the name and that adding the record proves control of the DNS without transferring it](docs/images/check-failing.png)

## Five minutes

1. Sign in with a link sent to your address. No password. Sign in lands on an empty list.
2. Claim `record-not-found.test`. The record screen shows the record to add and, above it, the check
   closed on one line: nothing at the name yet, which is waiting and not a fault. Claim
   `verified.test` and watch the five steps pass. Claim `appended-zone.test` and open the failing
   step: the four part message, the value found, and one thing to do.
3. Open the list. The three claims read Pending, Verified and Action needed, needs-attention first,
   with a notice counting them. Press Refresh and read the line under it: the list reflects the last
   check, and a claim is checked on its own screen.
4. Read the ten headline decisions at the top of [Decisions in the RFC](docs/RFC.md#decisions).

Every `.test` name routes to a scripted resolver, so each outcome is reachable without owning a
broken domain. `.test` is reserved by RFC 6761 and can never be a real claim. Claim a real domain
too; the check goes to your zone's authoritative nameservers.

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

`slow-nameservers.test` and `nameservers-unreachable.test` render the same screen today; the five
steps arriving one at a time is what would separate them, and that is not built. No demo name
reaches At risk, since a script is fixed per name; it is reachable only on a real domain.

## What to read next

- [docs/RFC.md](docs/RFC.md): every decision with its reason, the state model, the open questions.
- [docs/FRICTION_LOG.md](docs/FRICTION_LOG.md): fifty entries from using it against a real domain,
  which is where most of the product was designed.
- [docs/TRANSFERS.md](docs/TRANSFERS.md): the feature RFC for moving a name between accounts,
  designed and not built, with a prototype.
- [docs/POLISH_BACKLOG.md](docs/POLISH_BACKLOG.md): ideas held back on purpose, with what each costs
  and buys.
- Five files, if the code is where you want to start. `src/lib/dns/trace.ts` asks DNS and reports
  what each server said. `src/lib/claims/evaluate.ts` compares that with the claim and decides what
  the row should do. `src/lib/claims/steps.ts` turns a check into the five steps.
  `src/lib/claims/store.ts` holds every write, each conditional on the state it read.
  `src/lib/dns/testNames.ts` scripts the demo names.

## Scope

Built:

- Sign in with GitHub in one click from the home page, or by email link
- Domain input, normalized, with a typed error for every way a name can be wrong
- Claim issue with a scoped token, and the record to add
- The check, run on arrival and again on a cadence, against real DNS, reported as its five steps
- Check now, at a rate limited endpoint
- Favicons for claimed names, fetched server side behind SSRF guards
- At risk when a held name loses its record, and recovery when it comes back
- Action needed, on the list and the record screen, for a claim whose next move is the person's
- Seven of nine failure reasons, each with one action and the remediation in the step that produced it
- The list of an account's claims, including the ones not proved yet, with filter, sort, and a
  notice for names that need attention
- Releasing a claim, from its own screen

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

CI runs `pnpm verify` on every pull request and push to main, with no secrets, because nothing reads an environment
variable at module scope.

439 unit tests, concentrated in the pure layers: input normalization, the DNS trace, the
comparison against a claim, the state each check leaves the claim in, the step list and every
user-facing string. The DNS layer sits behind an
interface with a scripted fake, so no test touches the network.

The coverage is deliberately lopsided and the gap should be named. The database layer needs a real
Postgres and has almost no automated tests, and four of the bugs found in review lived there. It is
covered by a manual pass, and in-process Postgres is queued. The one test it does have is the
function that decides whether an error is Postgres refusing a duplicate, which needs no database
because it runs before anything is written.
