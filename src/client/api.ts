// src/client/api.ts
import type {
  ClaimResponse,
  ClaimsResponse,
  CreateResponse,
  MeResponse,
  ReleaseResponse,
} from '@/lib/claims/dto';

export const ME_KEY = '/api/me';
export const CLAIMS_KEY = '/api/claims';
export const claimKey = (id: string) => `/api/claims/${id}`;

/** A refusal from the API, carrying the typed error the route answered with. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.status = status;
    this.code = code;
  }
}

type Answer = { ok: true } | { ok: false; error: string };

const read = async <T extends Answer>(response: Response): Promise<Extract<T, { ok: true }>> => {
  const body = (await response.json().catch(() => null)) as T | null;
  if (body === null) {
    throw new ApiError(response.status, 'unavailable');
  }
  if (!body.ok) {
    throw new ApiError(response.status, (body as { error: string }).error);
  }
  return body as Extract<T, { ok: true }>;
};

const get = async <T extends Answer>(url: string) =>
  read<T>(await fetch(url, { headers: { accept: 'application/json' } }));

const post = (url: string, body?: unknown) =>
  fetch(url, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

export const fetchMe = async () => get<MeResponse>(ME_KEY);

export const fetchClaims = async () => (await get<ClaimsResponse>(CLAIMS_KEY)).claims;

export const fetchClaim = async (id: string) => (await get<ClaimResponse>(claimKey(id))).claim;

/** Answers the typed result either way, so the input can show the refusal in its own words. */
export const createClaim = async (name: string): Promise<CreateResponse> => {
  try {
    const response = await post(CLAIMS_KEY, { name });
    const body = (await response.json().catch(() => null)) as CreateResponse | null;
    return body ?? { ok: false, error: 'unavailable' };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
};

export const releaseClaim = async (id: string) =>
  read<ReleaseResponse>(await post(`/api/claims/${id}/release`));

export const signOut = async () => {
  await post('/api/signout');
};
