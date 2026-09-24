// src/lib/claims/row.ts
import type { ClaimDTO } from '@/lib/claims/dto';
import { domainsCopy } from '@/lib/copy/domains';

/** The three tones of the design, plus neutral for a state nobody can act on. */
export type Tone = 'good' | 'wait' | 'warn' | 'neutral';

/** The small badge on a favicon, only while a claim needs something. */
export type Badge = 'clock' | 'warn' | null;

export type ClaimRowView = {
  /** The word on the pill, and in the sidebar under the name. */
  word: string;
  tone: Tone;
  badge: Badge;
  /** The one date that goes with the state. Empty when there is none. */
  detail: string;
};

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** How long ago, in the words a person would use. Coarse on purpose: it updates every 30s. */
export const formatAgo = (milliseconds: number): string => {
  const copy = domainsCopy.ago;
  if (milliseconds < 45_000) {
    return copy.now;
  }
  if (milliseconds < 90_000) {
    return copy.minute;
  }
  if (milliseconds < HOUR) {
    return copy.minutes(Math.round(milliseconds / MINUTE));
  }
  if (milliseconds < 1.5 * HOUR) {
    return copy.hour;
  }
  if (milliseconds < DAY) {
    return copy.hours(Math.round(milliseconds / HOUR));
  }
  if (milliseconds < 2 * DAY) {
    return copy.day;
  }
  return copy.days(Math.round(milliseconds / DAY));
};

/** "Sep 21". UTC, so the day is the same wherever it is read. */
export const formatDay = (value: Date): string =>
  new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(
    value,
  );

/** "09:12 UTC" for today, "Sep 21" for any other day. */
const formatDayOrTime = (value: Date, now: Date): string =>
  value.toISOString().slice(0, 10) === now.toISOString().slice(0, 10)
    ? `${new Intl.DateTimeFormat('en-GB', { timeStyle: 'short', timeZone: 'UTC' }).format(value)} UTC`
    : formatDay(value);

const since = (iso: string, now: Date) => now.getTime() - new Date(iso).getTime();

/**
 * What a claim's row says, from the row alone. Used by the list, the sidebar and the picker, so the
 * three can't disagree.
 */
export const claimRowView = (claim: ClaimDTO, now: Date): ClaimRowView => {
  const copy = domainsCopy.row;

  switch (claim.status) {
    case 'pending': {
      // An expired token needs a new one before its record matters, so it wins over a wrong record.
      if (new Date(claim.expiresAt).getTime() <= now.getTime()) {
        return {
          word: copy.expired,
          tone: 'warn',
          badge: 'warn',
          detail: copy.expiredOn(formatDay(new Date(claim.expiresAt))),
        };
      }
      if (claim.actionNeededSince !== null) {
        return {
          word: copy.actionNeeded,
          tone: 'warn',
          badge: 'warn',
          detail: copy.wrongSince(formatDay(new Date(claim.actionNeededSince))),
        };
      }
      return {
        word: copy.pending,
        tone: 'wait',
        badge: 'clock',
        detail: copy.added(formatAgo(since(claim.issuedAt, now))),
      };
    }
    case 'verified':
      return {
        word: copy.verified,
        tone: 'good',
        badge: null,
        detail:
          claim.lastCheckedAt !== null
            ? copy.checked(formatAgo(since(claim.lastCheckedAt, now)))
            : claim.verifiedAt !== null
              ? copy.verifiedOn(formatDay(new Date(claim.verifiedAt)))
              : '',
      };
    case 'at_risk':
      return {
        word: copy.atRisk,
        tone: 'warn',
        badge: 'warn',
        detail:
          claim.failingSince === null
            ? ''
            : copy.missingSince(formatDayOrTime(new Date(claim.failingSince), now)),
      };
    case 'contested':
      return { word: copy.contested, tone: 'warn', badge: 'warn', detail: '' };
    case 'revoked':
      return { word: copy.revoked, tone: 'neutral', badge: null, detail: '' };
    default: {
      const unhandled: never = claim.status;
      return unhandled;
    }
  }
};
