// src/lib/auth/rateLimit.ts
import { sql } from 'drizzle-orm';
import { ATTEMPT_RETENTION_SECONDS, SEND_LIMITS } from '@/lib/auth/config';
import { identifierHash } from '@/lib/auth/secrets';
import { db } from '@/lib/db/client';

/**
 * Returned rather than thrown, the same as the input errors and the DNS failures. `unavailable`
 * exists so the caller can tell a refusal apart from a database it could not reach, because those
 * two owe the user different answers.
 */
export type SendDecision =
  | { outcome: 'allowed' }
  | { outcome: 'limited' }
  | { outcome: 'unavailable' };

/**
 * Decides and records in one statement.
 *
 * One statement rather than a read followed by a write, because two concurrent requests would
 * both read a count under the limit and both insert. Here the insert only happens when the counts
 * taken in the same statement are under the limits, so the decision and the record cannot come
 * apart. No row returned means refused.
 *
 * Counting rows inside a window gives a sliding window rather than a fixed one, which matters
 * because a fixed window lets double the limit through around the boundary. The cost of counting
 * rows is that they accumulate, so the same statement deletes anything older than the longest
 * window first.
 */
export const recordSendAttempt = async (email: string, ipBucket: string): Promise<SendDecision> => {
  const emailHash = identifierHash('email', email);
  const ipHash = identifierHash('ip', ipBucket);

  try {
    const rows = await db.execute(sql`
      with pruned as (
        delete from sign_in_attempts
        where created_at < now() - make_interval(secs => ${ATTEMPT_RETENTION_SECONDS})
      ),
      counted as (
        select
          count(*) filter (
            where email_hash = ${emailHash}
              and created_at > now() - make_interval(secs => ${SEND_LIMITS.perEmail.windowSeconds})
          ) as per_email,
          count(*) filter (
            where ip_hash = ${ipHash}
              and created_at > now() - make_interval(secs => ${SEND_LIMITS.perIp.windowSeconds})
          ) as per_ip,
          count(*) filter (
            where created_at > now() - make_interval(secs => ${SEND_LIMITS.global.windowSeconds})
          ) as overall
        from sign_in_attempts
      )
      insert into sign_in_attempts (email_hash, ip_hash)
      select ${emailHash}, ${ipHash}
      from counted
      where per_email < ${SEND_LIMITS.perEmail.max}
        and per_ip < ${SEND_LIMITS.perIp.max}
        and overall < ${SEND_LIMITS.global.max}
      returning id
    `);

    return rows.length > 0 ? { outcome: 'allowed' } : { outcome: 'limited' };
  } catch {
    // Deliberately fails closed. Claims live in this database too, so an outage here already means
    // the product is down, and failing open would remove the limit exactly when things are wrong.
    // The error itself is not logged, because it can carry the statement and its parameters.
    return { outcome: 'unavailable' };
  }
};
