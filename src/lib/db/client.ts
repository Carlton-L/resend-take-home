// src/lib/db/client.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@/lib/db/schema';

/**
 * DATABASE_URL is Supabase's transaction pooler. A serverless function opens a connection per
 * invocation, and the pooler is what keeps that from exhausting the database. Transaction pooling
 * cannot hold prepared statements across statements, so `prepare` is off.
 *
 * Cached on globalThis because the dev server reloads this module on every change and would
 * otherwise open a new pool each time.
 */
const globalForDb = globalThis as unknown as {
  domainclaimDb?: ReturnType<typeof drizzle<typeof schema>>;
};

const connect = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }
  return drizzle(postgres(url, { prepare: false }), { schema });
};

export const db = globalForDb.domainclaimDb ?? connect();

if (process.env.NODE_ENV !== 'production') {
  globalForDb.domainclaimDb = db;
}
