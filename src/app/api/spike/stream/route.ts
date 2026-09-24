// src/app/api/spike/stream/route.ts
import { type NextRequest, NextResponse } from 'next/server';
import { supabaseRouteClient } from '@/lib/auth/supabase/route';
import { isSameOrigin } from '@/lib/http/sameOrigin';

/** Spike only. Proves a route handler can stream NDJSON line by line on a Vercel preview. */
export const runtime = 'nodejs';
export const maxDuration = 20;

const LINES = 5;
const GAP_MS = 400;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Same shape as the real check: origin and session answered as plain JSON before any stream
 * starts, then one JSON object per line, each stamped with server time since the request began.
 */
export const POST = async (request: NextRequest) => {
  if (!isSameOrigin(request)) {
    return new NextResponse('Cross-origin request refused.', { status: 403 });
  }

  const { supabase, applyCookies } = supabaseRouteClient(request);
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    return applyCookies(NextResponse.json({ ok: false, error: 'signed_out' }, { status: 401 }));
  }

  const started = performance.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      for (let index = 0; index < LINES; index += 1) {
        await sleep(GAP_MS);
        const event = { type: 'step', index, serverMs: Math.round(performance.now() - started) };
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      }
      const done = { type: 'done', serverMs: Math.round(performance.now() - started) };
      controller.enqueue(encoder.encode(`${JSON.stringify(done)}\n`));
      controller.close();
    },
  });

  return applyCookies(
    new NextResponse(stream, {
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
        'cache-control': 'no-store',
      },
    }),
  );
};
