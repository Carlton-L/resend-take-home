// src/lib/favicon/icons.test.ts
import { describe, expect, it } from 'vitest';
import { acceptableIcon, iconLinks, MAX_ICON_BYTES, mediaType } from '@/lib/favicon/icons';

describe('iconLinks', () => {
  const page = 'https://acme.dev/';

  it('reads icon links, resolved against the page', () => {
    const html =
      '<head><link rel="icon" href="/favicon-32.png"><link rel=stylesheet href=a.css></head>';
    expect(iconLinks(html, page)).toEqual(['https://acme.dev/favicon-32.png']);
  });

  it('puts icons before the apple touch icon', () => {
    const html = `<link rel="apple-touch-icon" href="/touch.png"><link rel='shortcut icon' href='https://cdn.acme.dev/f.ico'>`;
    expect(iconLinks(html, page)).toEqual([
      'https://cdn.acme.dev/f.ico',
      'https://acme.dev/touch.png',
    ]);
  });

  it('skips SVG icons, by type or by name', () => {
    const html =
      '<link rel="icon" type="image/svg+xml" href="/i"><link rel="icon" href="/i.svg"><link rel="icon" href="/i.png">';
    expect(iconLinks(html, page)).toEqual(['https://acme.dev/i.png']);
  });

  it('skips addresses that are not http or https', () => {
    const html =
      '<link rel="icon" href="data:image/png;base64,AAAA"><link rel="icon" href="javascript:x">';
    expect(iconLinks(html, page)).toEqual([]);
  });

  it('reads attributes in any order and case', () => {
    const html = '<LINK HREF="/a.png" REL="ICON">';
    expect(iconLinks(html, page)).toEqual(['https://acme.dev/a.png']);
  });
});

describe('acceptableIcon', () => {
  it('takes raster images up to the cap', () => {
    expect(acceptableIcon('image/png', 1200)).toBe(true);
    expect(acceptableIcon('image/x-icon; charset=binary', MAX_ICON_BYTES)).toBe(true);
  });

  it('refuses SVG, which could run script from our origin', () => {
    expect(acceptableIcon('image/svg+xml', 800)).toBe(false);
  });

  it('refuses pages, empty bodies and anything over the cap', () => {
    expect(acceptableIcon('text/html', 800)).toBe(false);
    expect(acceptableIcon('image/png', 0)).toBe(false);
    expect(acceptableIcon('image/png', MAX_ICON_BYTES + 1)).toBe(false);
    expect(acceptableIcon(null, 800)).toBe(false);
  });
});

describe('mediaType', () => {
  it('drops parameters and case', () => {
    expect(mediaType('Image/PNG; q=1')).toBe('image/png');
  });
});
