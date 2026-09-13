// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

/**
 * drizzle-kit runs outside Next, so nothing has loaded `.env.local` for it. Node reads the file
 * directly. Absent in CI and on Vercel, where the variables are already in the environment, so a
 * missing file is not a failure.
 */
try {
  process.loadEnvFile('.env.local');
} catch {
  // Already in the environment, or there is no file to read.
}

/**
 * Migrations go through the session pooler on 5432, not the transaction pooler the app uses.
 * Transaction pooling cannot hold a prepared statement across statements, and the direct
 * connection is IPv6 only on the free tier.
 */
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DIRECT_DATABASE_URL ?? '',
  },
});
