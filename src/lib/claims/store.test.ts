// src/lib/claims/store.test.ts
import { describe, expect, it } from 'vitest';
import { isUniqueViolation } from '@/lib/claims/store';

/**
 * The first automated test in this module. Everything else here needs Postgres, and this does not,
 * because deciding what an error is happens before anything is written.
 *
 * Importing the module is safe: `getDb` opens the connection on first use rather than at import,
 * so nothing here reaches a database.
 */
describe('isUniqueViolation', () => {
  /** What postgres.js throws. The SQLSTATE is on the error itself. */
  const violation = (): Error =>
    Object.assign(new Error('duplicate key value violates unique constraint'), { code: '23505' });

  /** What Drizzle throws instead, since 0.44. The original is on `cause` and there is no `code`. */
  const wrapped = (cause: unknown): Error =>
    Object.assign(new Error('Failed query: update claims set status = $1\nparams: verified'), {
      cause,
    });

  it('recognises the driver error on its own', () => {
    expect(isUniqueViolation(violation())).toBe(true);
  });

  /**
   * The bug this test exists for. Reading `code` off the wrapper found nothing, so every unique
   * violation read as an outage and the Control proved screen was unreachable.
   */
  it('recognises it through the wrapper drizzle throws', () => {
    expect(isUniqueViolation(wrapped(violation()))).toBe(true);
  });

  it('recognises it through more than one wrapper', () => {
    expect(isUniqueViolation(wrapped(wrapped(violation())))).toBe(true);
  });

  it('says no to another constraint, which is a different failure with a different answer', () => {
    expect(isUniqueViolation(Object.assign(new Error('fk'), { code: '23503' }))).toBe(false);
    expect(isUniqueViolation(wrapped(Object.assign(new Error('fk'), { code: '23503' })))).toBe(
      false,
    );
  });

  it('says no to an error carrying no code at all', () => {
    expect(isUniqueViolation(new Error('connection terminated unexpectedly'))).toBe(false);
    expect(isUniqueViolation(wrapped(new Error('connection terminated unexpectedly')))).toBe(false);
  });

  it('says no to anything that is not an error', () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation(undefined)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
    expect(isUniqueViolation({})).toBe(false);
  });

  // A cause that points back at its own error would otherwise spin inside a catch block, which is
  // the one place in this code that must always return.
  it('stops on a cause that points at itself', () => {
    const loop: { cause?: unknown } = {};
    loop.cause = loop;
    expect(isUniqueViolation(loop)).toBe(false);
  });
});
