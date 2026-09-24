// src/lib/claims/rateLimit.ts
import 'server-only';
import { sql } from 'drizzle-orm';
import { CHECK_ATTEMPT_RETENTION_SECONDS, CHECK_LIMITS } from '@/lib/claims/config';
import { getDb } from '@/lib/db/client';

/**
 * Returned rather than thrown, the same as the DNS failures and the sign in limiter. `unavailable`
 * is separate from `limited` because a refusal and a database we could not reach owe the person
 * different answers.
 */
export type CheckDecision =
  | { outcome: 'allowed' }
  | { outcome: 'limited' }
  | { outcome: 'unavailable' };

/**
 * Decides whether this check runs and records it, in one statement.
 *
 * Same shape as `recordSendAttempt`. One statement rather than a read and then a write, because
 * two requests would otherwise both read a count under the limit and both insert. Counting rows
 * inside a window gives a sliding window, which costs rows, so the same statement deletes anything
 * older than the longest one first.
 *
 * Two counts. Per claim caps how fast one screen can ask, which is what a reload loop does. Per
 * account caps the total across claims, which is the one a script would use.
 */
export const recordCheckAttempt = async (
  ownerId: string,
  claimId: string,
): Promise<CheckDecision> => {
  try {
    const rows = await getDb().execute(sql`
      with pruned as (
        delete from check_attempts
        where created_at < now() - make_interval(secs => ${CHECK_ATTEMPT_RETENTION_SECONDS})
      ),
      counted as (
        select
          count(*) filter (
            where claim_id = ${claimId}::uuid
              and created_at > now() - make_interval(secs => ${CHECK_LIMITS.perClaim.windowSeconds})
          ) as per_claim,
          count(*) filter (
            where owner_id = ${ownerId}::uuid
              and created_at > now() - make_interval(secs => ${CHECK_LIMITS.perAccount.windowSeconds})
          ) as per_account
        from check_attempts
      )
      insert into check_attempts (owner_id, claim_id)
      select ${ownerId}::uuid, ${claimId}::uuid
      from counted
      where per_claim < ${CHECK_LIMITS.perClaim.max}
        and per_account < ${CHECK_LIMITS.perAccount.max}
      returning id
    `);

    return rows.length > 0 ? { outcome: 'allowed' } : { outcome: 'limited' };
  } catch {
    // Fails closed, for the same reason as the sign in limiter: claims live in this database too,
    // so an outage here already means the product is down. The error is not logged, because it can
    // carry the statement and its parameters.
    return { outcome: 'unavailable' };
  }
};
