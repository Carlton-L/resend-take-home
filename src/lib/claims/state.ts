// src/lib/claims/state.ts

/**
 * The claim state machine, as a plain tuple so one declaration feeds three things: the Postgres
 * enum in the schema, the uniqueness predicate, and the TypeScript union used everywhere above.
 *
 * Kept out of the schema module on purpose. Components import these types, and importing the
 * schema to get them would pull the database driver toward the client bundle.
 */
export const CLAIM_STATUSES = ['pending', 'verified', 'at_risk', 'contested', 'revoked'] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

/**
 * The states that hold a name against everyone else. A unique index restricted to these is what
 * enforces one owner per name while leaving any number of pending attempts, which is what the
 * transfer path needs.
 *
 * `contested` is in the set because a contested row is still the incumbent's, carrying its own
 * `verified_at`. Leaving it out would drop the incumbent from the index for the length of the
 * contest and let a third account verify the name underneath both of them.
 */
export const OWNED_STATUSES = [
  'verified',
  'at_risk',
  'contested',
] as const satisfies readonly ClaimStatus[];

/** Whether a claim in this state currently holds its name against every other account. */
export const holdsTheName = (status: ClaimStatus): boolean =>
  (OWNED_STATUSES as readonly ClaimStatus[]).includes(status);

/**
 * Why a check did not prove control.
 *
 * A subset of the nine reasons in the RFC. `cname_at_name`, `dnssec_broken` and
 * `appended_zone_suspected` all need the DoH leg to tell them apart from what is here, so they
 * arrive with it. The switch that renders these is exhaustive, so adding one breaks the build
 * until it has a message.
 */
export type FailureReason =
  | {
      code: 'record_not_found';
      queriedName: string;
      nameservers: string[];
      negativeTtlSeconds: number | null;
    }
  | { code: 'no_txt_at_name'; queriedName: string }
  | { code: 'value_mismatch'; expected: string; found: string[] }
  | { code: 'token_expired'; expiredAt: Date }
  | { code: 'nameservers_unreachable'; attempted: string[]; timeoutMs: number }
  | { code: 'zone_not_found'; walked: string[] };

/**
 * What one check concluded about one claim.
 *
 * `answeredBy` is the nameserver that got there first. Others may hold the record too; the trace
 * is where that shows.
 */
export type CheckResult =
  | { status: 'verified'; record: string; answeredBy: string }
  | { status: 'failed'; reason: FailureReason };
