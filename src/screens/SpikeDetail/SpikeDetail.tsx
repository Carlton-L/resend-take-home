// src/screens/SpikeDetail/SpikeDetail.tsx
'use client';

import { useParams } from 'next/navigation';
import type React from 'react';
import { useEffect } from 'react';
import SpikeLink from '@/screens/SpikeLink/SpikeLink';
import { reportPaint } from '@/screens/SpikeShell/timing';

/** Spike only. The detail screen, reading its id on the client. */
const SpikeDetail: React.FC = () => {
  const params = useParams<{ id: string }>();
  const id = params.id;

  useEffect(() => {
    reportPaint(`/spike/b/${id}`);
  }, [id]);

  return (
    <div className='flex flex-col gap-6 rounded-lg border border-line bg-surface p-6'>
      <h1 className='font-semibold text-2xl'>Detail {id}</h1>
      <div className='flex gap-4'>
        <SpikeLink href='/spike/a' className='text-signal underline'>
          Back to A
        </SpikeLink>
        {['1', '2', '3']
          .filter((other) => other !== id)
          .map((other) => (
            <SpikeLink key={other} href={`/spike/b/${other}`} className='text-fg-2 underline'>
              Detail {other}
            </SpikeLink>
          ))}
      </div>
    </div>
  );
};

export default SpikeDetail;
