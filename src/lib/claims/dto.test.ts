// src/lib/claims/dto.test.ts
import { describe, expect, it } from 'vitest';
import { type ClaimFields, parseDate, toClaimDetailDTO, toClaimDTO } from '@/lib/claims/dto';
import { CLAIM_STATUSES } from '@/lib/claims/state';

const claim = (over: Partial<ClaimFields> = {}): ClaimFields => ({
  id: '0b4f6c1e-2f39-4d53-9d0c-5b1c8f2a7e11',
  name: 'example.com',
  status: 'pending',
  issuedAt: new Date('2026-09-21T09:00:00Z'),
  expiresAt: new Date('2026-09-28T09:00:00Z'),
  verifiedAt: null,
  failingSince: null,
  actionNeededSince: null,
  lastCheckedAt: null,
  dnsHost: null,
  ...over,
});

const roundTrip = <T>(value: T): T => JSON.parse(JSON.stringify(value));

describe('toClaimDTO', () => {
  it('survives JSON unchanged', () => {
    const dto = toClaimDTO(
      claim({
        verifiedAt: new Date('2026-09-22T10:00:00Z'),
        lastCheckedAt: new Date('2026-09-24T08:30:00Z'),
        dnsHost: 'Cloudflare',
      }),
    );
    expect(roundTrip(dto)).toEqual(dto);
  });

  it('sends dates as ISO strings and keeps nulls', () => {
    const dto = toClaimDTO(claim());
    expect(dto.issuedAt).toBe('2026-09-21T09:00:00.000Z');
    expect(dto.verifiedAt).toBeNull();
    expect(dto.lastCheckedAt).toBeNull();
  });

  it('never sends the token or the owner', () => {
    const dto = toClaimDTO({ ...claim(), token: 'SECRET', ownerId: 'someone' } as ClaimFields);
    expect(JSON.stringify(dto)).not.toContain('SECRET');
    expect(JSON.stringify(dto)).not.toContain('someone');
  });

  it.each(CLAIM_STATUSES)('maps a %s claim', (status) => {
    expect(toClaimDTO(claim({ status })).status).toBe(status);
  });

  it('links the DNS panel only for a host we link to', () => {
    expect(toClaimDTO(claim({ dnsHost: 'Cloudflare' })).dnsPanelUrl).toBe(
      'https://dash.cloudflare.com/',
    );
    expect(toClaimDTO(claim({ dnsHost: 'some-small-host.com' })).dnsPanelUrl).toBeNull();
    expect(toClaimDTO(claim()).dnsPanelUrl).toBeNull();
  });
});

describe('toClaimDetailDTO', () => {
  const detail = (name: string, registrableDomain: string) =>
    toClaimDetailDTO({ ...claim({ name }), registrableDomain, token: 'ABC' }, false);

  it('survives JSON unchanged', () => {
    const dto = detail('example.com', 'example.com');
    expect(roundTrip(dto)).toEqual(dto);
  });

  it('gives the short host for the apex and the full name beside it', () => {
    const { record } = detail('example.com', 'example.com');
    expect(record.type).toBe('TXT');
    expect(record.host).toBe('_domainclaim-challenge');
    expect(record.fullName).toBe('_domainclaim-challenge.example.com');
  });

  it('keeps the subdomain label in the short host', () => {
    expect(detail('app.example.com', 'example.com').record.host).toBe('_domainclaim-challenge.app');
  });

  it('carries the token inside the record value, with its expiry', () => {
    expect(detail('example.com', 'example.com').record.value).toBe(
      'domainclaim-token=ABC expiry=2026-09-28T09:00:00Z',
    );
  });

  it('says when another account holds the name', () => {
    const dto = toClaimDetailDTO(
      { ...claim(), registrableDomain: 'example.com', token: 'ABC' },
      true,
    );
    expect(dto.heldByAnother).toBe(true);
  });
});

describe('parseDate', () => {
  it('turns a DTO date back into the same instant', () => {
    expect(parseDate('2026-09-21T09:00:00.000Z')?.getTime()).toBe(
      new Date('2026-09-21T09:00:00Z').getTime(),
    );
    expect(parseDate(null)).toBeNull();
  });
});
