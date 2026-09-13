// src/lib/dns/txt.ts

/**
 * One TXT record, as one string.
 *
 * A value over 255 bytes travels as several character-strings. `node:dns` surfaces that as a nested
 * array, one inner array per record. Joining here means nothing above this layer has to know the
 * boundary exists, and a token that straddles it still compares.
 *
 * Measured against `_dc-long.carlton.dev` on 2026-09-12: a 300 byte value comes back as two strings
 * split at exactly 255.
 */
export const joinChunks = (record: string[]): string => record.join('');

/** Every record at a name, each flattened to one string. */
export const joinRecords = (records: string[][]): string[] => records.map(joinChunks);
