// src/lib/claims/difference.ts

/**
 * Splits a value where it stops matching another, so a screen can mark the part that differs.
 *
 * Wrong values are usually right at the start and wrong at the end: a paste that lost its tail, a
 * token from an earlier claim, a name with the zone typed twice. So the shared start stays plain and
 * everything after it is the difference. A value that matches in full has nothing to mark.
 */
export const splitAtDifference = (
  value: string,
  against: string,
): { same: string; rest: string } => {
  let index = 0;
  while (index < value.length && index < against.length && value[index] === against[index]) {
    index += 1;
  }
  return { same: value.slice(0, index), rest: value.slice(index) };
};
