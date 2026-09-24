// src/screens/SpikeList/SpikeList.tsx
'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import SpikeLink from '@/screens/SpikeLink/SpikeLink';
import { reportPaint } from '@/screens/SpikeShell/timing';

type Arrival = { line: string; clientMs: number };

/**
 * Spike only. The list screen: links to three detail screens, and a button that reads the NDJSON
 * route and stamps each line with when it reached the browser.
 */
const SpikeList: React.FC = () => {
  const [arrivals, setArrivals] = useState<Arrival[]>([]);
  const [headersMs, setHeadersMs] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    reportPaint('/spike/a');
  }, []);

  const runStream = async () => {
    setArrivals([]);
    setHeadersMs(null);
    setError(null);
    const started = performance.now();
    const since = () => Math.round(performance.now() - started);

    const response = await fetch('/api/spike/stream', { method: 'POST' });
    setHeadersMs(since());
    if (!response.ok || response.body === null) {
      setError(`${response.status} ${await response.text()}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      const at = since();
      setArrivals((previous) => [
        ...previous,
        ...lines.filter(Boolean).map((line) => ({ line, clientMs: at })),
      ]);
    }
  };

  return (
    <div className='flex flex-col gap-6 rounded-lg border border-line bg-surface p-6'>
      <h1 className='font-semibold text-2xl'>Screen A</h1>

      <ul className='flex flex-col gap-2'>
        {['1', '2', '3'].map((id) => (
          <li key={id}>
            <SpikeLink href={`/spike/b/${id}`} className='text-signal underline'>
              Open detail {id}
            </SpikeLink>
          </li>
        ))}
      </ul>

      <div className='flex flex-col gap-3'>
        <button
          type='button'
          onClick={runStream}
          className='self-start rounded-md bg-primary px-3 py-2 text-on-primary text-sm'
        >
          Run the stream
        </button>
        {error !== null && <p className='text-wrong-fg text-sm'>{error}</p>}
        {headersMs !== null && (
          <p className='font-mono text-fg-3 text-xs'>headers at {headersMs}ms</p>
        )}
        <ol className='font-mono text-fg-2 text-xs'>
          {arrivals.map((arrival) => (
            <li key={arrival.line}>
              client {arrival.clientMs}ms · {arrival.line}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
};

export default SpikeList;
