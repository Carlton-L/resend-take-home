// src/client/check/ndjson.ts

/**
 * Splits what has arrived so far into whole lines and the part of a line still coming. A chunk
 * can end in the middle of a line, so the tail waits for the next one.
 */
export const splitLines = (buffer: string): { lines: string[]; rest: string } => {
  const parts = buffer.split('\n');
  const rest = parts.pop() ?? '';
  return { lines: parts.filter((line) => line.trim().length > 0), rest };
};

/** Reads a stream of JSON lines, calling `onEvent` for each one as it arrives. */
export const readNdjson = async <T>(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: T) => void,
): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
    const { lines, rest } = splitLines(done ? `${buffer}\n` : buffer);
    buffer = rest;
    for (const line of lines) {
      onEvent(JSON.parse(line) as T);
    }
    if (done) {
      return;
    }
  }
};
