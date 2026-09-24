// src/lib/auth/supabase/admin.ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';

/**
 * Holds the secret key, so it belongs to the Node runtime and must never be imported by anything
 * that reaches a client component. It keeps no session of its own: it exists to mint a link for an
 * address, and the session that follows is the caller's.
 */
export const supabaseAdminClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !secretKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set.');
  }
  return createClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};
