// src/app/api/trace/route.ts
import { createFakeResolver } from '@/lib/dns/fakeResolver';
import { createNodeResolver } from '@/lib/dns/nodeResolver';
import { isTestName, scriptFor, testNames, testNamespaceEnabled } from '@/lib/dns/testNames';
import { DEFAULT_TIMEOUT_MS, traceName } from '@/lib/dns/trace';
import { describeDomainInputError } from '@/lib/domain/messages';
import { normalizeDomainInput } from '@/lib/domain/normalize';

/** Opens UDP/53 to authoritative nameservers, which Edge cannot do. */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One trace for one name.
 *
 * Public, because this slice has no screen and the route is the only way to see the layer work.
 * A real rate limit needs state shared across invocations and there is no database yet, so the
 * control here is a bound on what one request can cost: one name, the fan-out capped at the
 * nameserver count the walk discovers, and a deadline per server. The rate limit lands with the
 * database.
 */
export const GET = async (request: Request) => {
  const requested = new URL(request.url).searchParams.get('name');

  if (requested === null) {
    return Response.json({ error: 'Pass ?name= with a domain to trace.' }, { status: 400 });
  }

  const demoEnabled = testNamespaceEnabled();
  const normalized = normalizeDomainInput(requested, { allowTestNamespace: demoEnabled });

  if (!normalized.ok) {
    const message = describeDomainInputError(normalized.error);
    return Response.json(
      { error: { code: normalized.error.code, title: message.title, action: message.action } },
      { status: 400 },
    );
  }

  const { name } = normalized.value;

  if (demoEnabled && isTestName(name)) {
    const script = scriptFor(name);
    if (script === null) {
      return Response.json(
        { error: { code: 'unknown_demo_name', known: testNames() } },
        { status: 404 },
      );
    }
    const trace = await traceName(createFakeResolver(script), name, {
      timeoutMs: DEFAULT_TIMEOUT_MS,
    });
    return Response.json({ source: 'demo', trace });
  }

  const trace = await traceName(createNodeResolver(DEFAULT_TIMEOUT_MS), name, {
    timeoutMs: DEFAULT_TIMEOUT_MS,
  });
  return Response.json({ source: 'dns', trace });
};
