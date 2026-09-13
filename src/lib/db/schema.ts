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
