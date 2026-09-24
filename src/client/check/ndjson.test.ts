// src/client/check/ndjson.test.ts
import { describe, expect, it } from 'vitest';
import { readNdjson, splitLines } from '@/client/check/ndjson';

const streamOf = (chunks: string[]) => {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start: (controller) => {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
};

describe('splitLines', () => {
  it('keeps a half line for the next chunk', () => {
    expect(splitLines('{"a":1}\n{"b":')).toEqual({ lines: ['{"a":1}'], rest: '{"b":' });
  });

  it('skips empty lines', () => {
    expect(splitLines('{"a":1}\n\n')).toEqual({ lines: ['{"a":1}'], rest: '' });
  });
});

describe('readNdjson', () => {
  it('reads events split across chunks in the middle of a line', async () => {
    const seen: unknown[] = [];
    await readNdjson(
      streamOf(['{"type":"st', 'ep","i":0}\n{"type":"step","i":1}\n{"ty', 'pe":"done"}\n']),
      (event) => seen.push(event),
    );
    expect(seen).toEqual([{ type: 'step', i: 0 }, { type: 'step', i: 1 }, { type: 'done' }]);
  });

  it('reads a last line with no newline after it', async () => {
    const seen: unknown[] = [];
    await readNdjson(streamOf(['{"a":1}\n{"b":2}']), (event) => seen.push(event));
    expect(seen).toEqual([{ a: 1 }, { b: 2 }]);
  });

  it('decodes a character split across chunks', async () => {
    const bytes = new TextEncoder().encode('{"n":"münchen"}\n');
    const cut = bytes.indexOf(0xc3) + 1;
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        controller.enqueue(bytes.slice(0, cut));
        controller.enqueue(bytes.slice(cut));
        controller.close();
      },
    });
    const seen: unknown[] = [];
    await readNdjson(stream, (event) => seen.push(event));
    expect(seen).toEqual([{ n: 'münchen' }]);
  });
});
