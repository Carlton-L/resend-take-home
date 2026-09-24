// src/lib/db/client.ts
import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

type Database = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Cached on globalThis because the dev server reloads this module on every change and would
 * otherwise open a new pool each time.
 */
const globalForDb = globalThis as unknown as { domainclaimDb?: Database };

/**
 * Opened on first use rather than at import.
 *
 * Next imports every route module during the build to read its configuration, so a connection made
 * at module scope makes the build itself require the runtime secrets. A missing variable should
 * fail one request with a clear message, not the deploy.
 *
 * DATABASE_URL is Supabase's transaction pooler. A serverless function opens a connection per
 * invocation, and the pooler is what keeps that from exhausting the database. Transaction pooling
 * cannot hold a prepared statement across statements, so `prepare` is off.
 */
export const getDb = (): Database => {
  if (globalForDb.domainclaimDb) {
    return globalForDb.domainclaimDb;
  }

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  const database = drizzle(postgres(url, { prepare: false }), { schema });
  globalForDb.domainclaimDb = database;
  return database;
};
