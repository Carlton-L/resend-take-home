// src/lib/email/layout.test.ts
import { describe, expect, it } from 'vitest';
import {
  button,
  COLOR,
  checkNodes,
  emailShell,
  escapeHtml,
  field,
  type NodeState,
} from '@/lib/email/layout';

const shell = (over: Partial<Parameters<typeof emailShell>[0]> = {}) =>
  emailShell({
    title: 'Title',
    preheader: 'First line',
    label: 'Sign in',
    badge: { text: 'Link', tone: 'link' },
    body: '<p>body</p>',
    foot: '<p>foot</p>',
    ...over,
  });

describe('escapeHtml', () => {
  it('escapes everything that could close a tag or an attribute', () => {
    expect(escapeHtml(`<a href="x" title='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;',
    );
  });
});

describe('emailShell', () => {
  it('keeps a dark client dark', () => {
    const html = shell();
    expect(html).toContain('<meta name="color-scheme" content="dark">');
    expect(html).toContain('supported-color-schemes');
    expect(html).toContain('[data-ogsc]');
    expect(html).toContain(`bgcolor="${COLOR.ground}"`);
  });

  it('puts the preheader first in the body, hidden', () => {
    const html = shell({ preheader: 'Use the button below' });
    const body = html.slice(html.indexOf('<body'));
    expect(body.indexOf('Use the button below')).toBeLessThan(body.indexOf('DomainClaim'));
    expect(body).toContain('display:none');
  });

  it('escapes the plain text inputs', () => {
    const html = shell({ label: '<script>x</script>', preheader: '<b>', title: '<i>' });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<title><i>');
  });

  it('is fluid to 520px, with a fixed table for Outlook', () => {
    const html = shell();
    expect(html).toContain('max-width:520px');
    expect(html).toContain('<!--[if mso]><table role="presentation" width="520"');
  });
});

describe('button and field', () => {
  it('escapes the address and the label', () => {
    const html = button('Open <x>', 'https://a.example/?a=1&b="2"');
    expect(html).toContain('href="https://a.example/?a=1&amp;b=&quot;2&quot;"');
    expect(html).toContain('Open &lt;x&gt;');
  });

  it('shows a value in full and wrapped', () => {
    const html = field('Value', 'domainclaim-token=A expiry=Z');
    expect(html).toContain('word-break:break-all');
    expect(html).toContain('domainclaim-token=A expiry=Z');
  });
});

describe('checkNodes', () => {
  const colorsOf = (states: NodeState[]) => checkNodes(states);

  it('draws five labelled nodes', () => {
    const html = colorsOf(['pass', 'pass', 'pass', 'pass', 'pass']);
    for (const label of ['Zone', 'Nameservers', 'TXT record', 'Token', 'Claim']) {
      expect(html).toContain(`>${label}</p>`);
    }
    expect(html.match(/&#10003;/g)).toHaveLength(5);
  });

  it('marks a wrong step and leads into it in amber', () => {
    const html = colorsOf(['pass', 'pass', 'wrong', 'idle', 'idle']);
    expect(html.match(/>!</g)).toHaveLength(1);
    expect(html.match(/&#10003;/g)).toHaveLength(2);
    expect(html).toContain(`color:${COLOR.amber};">TXT record</p>`);
    expect(html).toContain(`color:${COLOR.dim};">Token</p>`);
    expect(html).toContain(`bgcolor="${COLOR.amber}" style="height:2px`);
  });

  it('draws no signal connector when nothing passed', () => {
    const html = colorsOf(['idle', 'idle', 'idle', 'idle', 'idle']);
    expect(html).not.toContain(`bgcolor="${COLOR.signal}" style="height:2px`);
  });
});
