// src/lib/db/schema.ts
import { sql } from 'drizzle-orm';
import { index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { CLAIM_STATUSES, OWNED_STATUSES } from '@/lib/claims/state';

/**
 * One row per sign in email we agreed to send. The table is a counter rather than a log: the
 * address and the source address are stored as keyed hashes, so it cannot be read back as a list
 * of who tried to sign in, and a mistyped address does not become a record of a stranger.
 *
 * Rows older than the longest window are deleted by the same statement that counts them.
 */
export const signInAttempts = pgTable(
  'sign_in_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emailHash: text('email_hash').notNull(),
    ipHash: text('ip_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('sign_in_attempts_created_at_idx').on(table.createdAt),
    index('sign_in_attempts_email_hash_idx').on(table.emailHash, table.createdAt),
    index('sign_in_attempts_ip_hash_idx').on(table.ipHash, table.createdAt),
  ],
);

/**
 * A Postgres enum rather than text with a check constraint. The set of states is closed and is
 * already written out in the RFC, which removes the only real cost, and Drizzle infers the
 * TypeScript type from the same declaration so the column and the union cannot drift.
 */
export const claimStatus = pgEnum('claim_status', CLAIM_STATUSES);

/**
 * One row per attempt to prove control of one name.
 *
 * `owner_id` is a Supabase `auth.users` id with no foreign key. That table lives in a schema we do
 * not own and do not migrate, so a cross-schema reference would tie our migrations to theirs for a
 * guarantee the application already keeps: every query here is scoped to the signed in user.
 *
 * The token is stored as it is. It goes into a TXT record in a public zone, so there is nothing to
 * protect by hashing it.
 */
export const claims = pgTable(
  'claims',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    /** Normalized: lower case, punycode, no trailing dot. The output of normalizeDomainInput. */
    name: text('name').notNull(),
    registrableDomain: text('registrable_domain').notNull(),
    token: text('token').notNull(),
    status: claimStatus('status').notNull().default('pending'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    /**
     * When the first check that could not find this claim's record ran, on a claim that had
     * already proved itself. Null on every other claim, and cleared when the record comes back.
     *
     * A plain timestamp rather than a stored failure reason. The reason a check failed is
     * recomputed by the next check and rendered from that, so storing it would be a second source
     * of truth for something nothing reads in between.
     */
    failingSince: timestamp('failing_since', { withTimezone: true }),
  },
  (table) => [
    /**
     * One owner per name, any number of pending attempts. Restricted to the states that actually
     * hold a name, so a challenger can carry a pending claim on a name someone else has verified,
     * which is what the transfer path is built on.
     *
     * The predicate is written from OWNED_STATUSES so the index and the union cannot disagree.
     * sql.raw because an index predicate has to be literal SQL rather than bound parameters; the
     * values are our own constants.
     */
    uniqueIndex('claims_owned_name_idx')
      .on(table.name)
      .where(sql.raw(`status in (${OWNED_STATUSES.map((status) => `'${status}'`).join(', ')})`)),
    /**
     * One pending attempt per account per name. Without it, claiming a name twice mints a second
     * token, and the record the user already added is silently the wrong one.
     *
     * Restricted to pending, so it never argues with the index above: a challenger can hold a
     * pending claim on a name another account has verified, which is what step 8 needs.
     */
    uniqueIndex('claims_owner_pending_name_idx')
      .on(table.ownerId, table.name)
      .where(sql.raw("status = 'pending'")),
    index('claims_owner_idx').on(table.ownerId, table.issuedAt),
    index('claims_name_idx').on(table.name),
  ],
);

/**
 * One row per check we agreed to run, which is what the limit on checks is counted from.
 *
 * A table of its own rather than a kind column on `sign_in_attempts`. That table stores keyed
 * hashes so it cannot be read back as a list of who tried to sign in, and a check is a signed in
 * account acting on its own row, so there is nothing to hide from ourselves and hashing would make
 * the per claim count impossible. Sharing one table would also mean two retention windows in one
 * prune and a kind test added to a statement that already works.
 *
 * `claim_id` cascades, because releasing a claim deletes the row and a foreign key with no cascade
 * would refuse that delete for the few minutes an attempt row survives.
 */
export const checkAttempts = pgTable(
  'check_attempts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ownerId: uuid('owner_id').notNull(),
    claimId: uuid('claim_id')
      .notNull()
      .references(() => claims.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('check_attempts_created_at_idx').on(table.createdAt),
    index('check_attempts_owner_idx').on(table.ownerId, table.createdAt),
    index('check_attempts_claim_idx').on(table.claimId, table.createdAt),
  ],
);
