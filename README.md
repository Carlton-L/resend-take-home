# DomainClaim

Claim a domain, prove you control it, and see what is happening at every step.

Most verification is opaque: paste a record, wait 48 hours, check back. This asks your zone's
authoritative nameservers directly and reports what each one answered. Every failure names a reason
and one next action. Ownership is persistent state, so the claim keeps being checked after it
verifies.

Live at [domainclaim-pi.vercel.app](https://domainclaim-pi.vercel.app). Take-home for Resend.
Decisions are in [docs/RFC.md](docs/RFC.md).

## Try it

Sign in with a link sent to your address. No password.

Claim a real domain, or use a demo name below. Each routes to a scripted resolver, so every outcome
is reachable without owning a broken domain. `.test` is reserved by RFC 6761 and can never be a real
claim.

| Name | What it shows |
| --- | --- |
| `verified.test` | Record found, claim verifies |
| `crowded-name.test` | Found among other services' TXT records |
| `one-dead-nameserver.test` | One server down, check answers at the speed of the rest |
| `record-not-found.test` | Nothing at the name, with the negative cache window |
| `no-txt-at-name.test` | Name exists, no TXT on it |
| `value-mismatch.test` | A TXT record carrying a token this claim did not issue |
| `nameservers-unreachable.test` | No answer inside the deadline |
| `zone-not-found.test` | No level answers with nameservers |
| `slow-nameservers.test` | Alive but past the deadline, which reads the same as down |

## How it works

- Checks go straight to the zone's authoritative nameservers over UDP/53. Those do not cache, so a
  record shows up as soon as it is saved. Public resolvers lag by the zone's negative cache window,
  and the failure says by how much.
- It walks up from the record's name to find the zone. A delegated subdomain has its own
  nameservers, and the parent's would be wrong.
- Every nameserver is asked at once and one answer is enough. A server still running when the answer
  arrives is reported as unfinished.
- One account holds a name at a time, enforced by a partial unique index over the states that hold
  it. Several accounts can hold a pending attempt, and the first to prove control wins. Transfers
  build on that.
- The token is public. It sits in a TXT record anyone can query, so its only job is being
  unguessable. 160 bits from `crypto.randomBytes`.
- No Verify button. A check takes about 250ms, so the product runs it.
- Failures are typed values, rendered as a title, the DNS value at fault, why, and one next action.

## Scope

Built:

- Magic link sign in
- Domain input, normalized, with a typed error for every way a name can be wrong
- Claim issue with a scoped token, and the record to add
- The check, run on arrival, against real DNS
- Six of nine failure reasons, each with one action
- Releasing a claim

Not built yet:

- A list of an account's claims
- The check as a live timeline, with Check now
- Scheduled re-verification, grace window, notification email
- Transfers for a contested name
- The DNS-over-HTTPS second opinion, which separates a CNAME at the name and broken DNSSEC from the
  failures above

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

284 unit tests. The DNS layer sits behind an interface with a scripted fake, so no test touches the
network. The database layer needs a real Postgres and has no automated tests. It is covered by a
manual pass, and in-process Postgres is queued.

## Documents

- [docs/RFC.md](docs/RFC.md). Decisions, reasoning, open questions.
- [docs/FRICTION_LOG.md](docs/FRICTION_LOG.md). Every confusion hit using this against a real
  domain, each resolved, deferred or accepted.
- [docs/POLISH_BACKLOG.md](docs/POLISH_BACKLOG.md). Ideas held back on purpose, with what each costs
  and buys.
