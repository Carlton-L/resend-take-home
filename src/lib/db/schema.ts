// src/lib/db/schema.ts
import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

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
