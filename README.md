# DomainClaim

Claim a domain, prove you control it, and see exactly what is happening at each step, including when
verification fails and what to do about it.

Live at [domainclaim-pi.vercel.app](https://domainclaim-pi.vercel.app).

Built as a take-home for Resend. The design notes and decisions live in [docs/RFC.md](docs/RFC.md).

## Running it

```bash
pnpm install
pnpm dev
```

Node 24.x. Copy `.env.example` to `.env.local` and fill it in before the app will do anything useful.

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Production build |
| `pnpm test` | Vitest unit tests |
| `pnpm typecheck` | TypeScript with no emit |
| `pnpm check` | Biome lint and format check |
| `pnpm format` | Biome check with fixes applied |
| `pnpm db:generate` | Write a migration from the schema |
| `pnpm db:migrate` | Apply pending migrations |
