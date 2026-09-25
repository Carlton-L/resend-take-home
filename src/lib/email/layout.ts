// src/lib/email/layout.ts

/**
 * The one layout every DomainClaim email uses: a wordmark, one card with a labelled header, and
 * fine print under it. Pure, so the tests read the same HTML a mail client does.
 *
 * Hand written tables and inline styles, because mail clients drop stylesheets and half of them
 * don't lay out a styled anchor the same way. The colours are literals that match globals.css by
 * hand for the same reason.
 *
 * Keeping it dark in a dark client takes four things, learned on carlton.dev's mail: the
 * color-scheme metas and the :root rule so Apple Mail and Proton don't lighten a dark ground,
 * bgcolor attributes beside every background style, !important pins under prefers-color-scheme
 * plus the [data-ogsc] rules for Outlook, and connectors drawn as filled cells, since Outlook
 * inverts borders.
 */

export const FONT_SANS =
  "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
export const FONT_MONO = "'IBM Plex Mono','SFMono-Regular',Menlo,Consolas,monospace";

export const COLOR = {
  ground: '#0a0a0b',
  card: '#101013',
  field: '#161619',
  line: '#232326',
  control: '#2a2a2e',
  text: '#e6e6e2',
  muted: '#8f8f8a',
  dim: '#5c5c58',
  signal: '#3dff88',
  onSignal: '#05140b',
  amber: '#e8a317',
  onAmber: '#1a1204',
  cyan: '#56b4e9',
} as const;

/** Every dynamic value in the HTML part goes through this: names, addresses, URLs, record values. */
export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export type BadgeTone = 'link' | 'warn' | 'good';

const BADGE_COLOR: Record<BadgeTone, string> = {
  link: COLOR.cyan,
  warn: COLOR.amber,
  good: COLOR.signal,
};

const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"';

/** Pads the inbox preview after the preheader, so the client doesn't pull in body text after it. */
const PREHEADER_PAD = '&#8199;&#65279;&#847;'.repeat(3);

/** A heading in the card. `html` is already escaped. */
export const heading = (html: string): string =>
  `<h1 class="dc-text dc-h1" style="margin:0 0 12px;font-family:${FONT_SANS};font-size:21px;font-weight:600;letter-spacing:-0.015em;line-height:1.3;color:${COLOR.text};">${html}</h1>`;

/**
 * A paragraph. `html` is already escaped. `text` for what the email says, `muted` for what it
 * adds, `fine` for the small print under the card. `gap` is the space after it, in pixels.
 */
export const paragraph = (
  html: string,
  tone: 'text' | 'muted' | 'fine' = 'text',
  gap = tone === 'fine' ? 0 : 20,
): string => {
  if (tone === 'text') {
    return `<p class="dc-text" style="margin:0 0 ${gap}px;font-family:${FONT_SANS};font-size:14px;line-height:1.6;color:${COLOR.text};">${html}</p>`;
  }
  const size = tone === 'fine' ? '12px' : '13px';
  const color = tone === 'fine' ? COLOR.dim : COLOR.muted;
  return `<p class="dc-muted" style="margin:0 0 ${gap}px;font-family:${FONT_SANS};font-size:${size};line-height:1.6;color:${color};">${html}</p>`;
};

/** An address shown in full, so the destination is readable before it is followed. */
export const linkLine = (url: string): string => {
  const safe = escapeHtml(url);
  return `<p class="dc-muted" style="margin:0 0 20px;font-family:${FONT_MONO};font-size:12px;line-height:1.6;word-break:break-all;color:${COLOR.muted};"><a href="${safe}" style="color:${COLOR.muted};">${safe}</a></p>`;
};

/** The one thing to press, in a table cell with bgcolor so every client paints it. */
export const button = (label: string, href: string): string =>
  `<table ${TABLE} style="margin:0 0 20px;"><tr>
<td class="dc-btn" bgcolor="${COLOR.signal}" style="border-radius:7px;background-color:${COLOR.signal};">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:11px 20px;font-family:${FONT_SANS};font-size:14px;font-weight:600;line-height:1;color:${COLOR.onSignal};text-decoration:none;border-radius:7px;">${escapeHtml(label)}</a>
</td></tr></table>`;

/** A labelled value, shown in full and wrapped. */
export const field = (label: string, value: string, last = false): string =>
  `<p class="dc-muted" style="margin:0 0 6px;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:${COLOR.muted};">${escapeHtml(label)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 ${last ? '20px' : '12px'};"><tr>
<td bgcolor="${COLOR.field}" style="padding:10px 12px;border:1px solid ${COLOR.control};border-radius:6px;background-color:${COLOR.field};font-family:${FONT_MONO};font-size:13px;line-height:1.5;color:${COLOR.text};word-break:break-all;" class="dc-text">${escapeHtml(value)}</td>
</tr></table>`;

export type NodeState = 'pass' | 'wrong' | 'idle';

export const NODE_LABELS = ['Zone', 'Nameservers', 'TXT record', 'Token', 'Claim'] as const;

const connector = (color: string): string =>
  `<td style="font-size:1px;line-height:1px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${color}" style="height:2px;font-size:1px;line-height:2px;background-color:${color};">&nbsp;</td></tr></table></td>`;

const EMPTY_SIDE = '<td style="font-size:1px;">&nbsp;</td>';

/** Signal between two passes, amber into a wrong node, grey otherwise. */
const segmentColor = (from: NodeState, to: NodeState): string =>
  to === 'wrong' ? COLOR.amber : from === 'pass' && to === 'pass' ? COLOR.signal : COLOR.control;

const node = (state: NodeState): string => {
  const fill = state === 'pass' ? COLOR.signal : state === 'wrong' ? COLOR.amber : COLOR.card;
  const edge = state === 'idle' ? COLOR.control : fill;
  const ink = state === 'pass' ? COLOR.onSignal : state === 'wrong' ? COLOR.onAmber : COLOR.card;
  const mark = state === 'pass' ? '&#10003;' : state === 'wrong' ? '!' : '&nbsp;';
  return `<td width="22" style="width:22px;min-width:22px;max-width:22px;"><table ${TABLE}><tr><td width="20" height="20" align="center" valign="middle" bgcolor="${fill}" style="width:20px;min-width:20px;height:20px;padding:0;border:1px solid ${edge};border-radius:50%;background-color:${fill};font-family:${FONT_SANS};font-size:11px;font-weight:700;line-height:20px;color:${ink};text-align:center;">${mark}</td></tr></table></td>`;
};

/**
 * The five check steps as a row of nodes, the way the claim screen draws them. Outlook desktop
 * draws the circles as squares, which is accepted.
 */
export const checkNodes = (states: readonly NodeState[]): string => {
  const cells = NODE_LABELS.map((label, index) => {
    const state = states[index] ?? 'idle';
    const before = states[index - 1];
    const after = states[index + 1];
    const left =
      index === 0 || before === undefined ? EMPTY_SIDE : connector(segmentColor(before, state));
    const right =
      index === NODE_LABELS.length - 1
        ? EMPTY_SIDE
        : connector(segmentColor(state, after ?? 'idle'));
    const labelColor = state === 'wrong' ? COLOR.amber : state === 'idle' ? COLOR.dim : COLOR.text;
    return `<td width="20%" valign="top" style="width:20%;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${left}${node(state)}${right}</tr></table>
<p style="margin:8px 0 0;font-family:${FONT_MONO};font-size:9.5px;letter-spacing:0.06em;text-transform:uppercase;text-align:center;color:${labelColor};">${label}</p></td>`;
  });
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 24px;"><tr>${cells.join('')}</tr></table>`;
};

export type ShellInput = {
  /** The document title and the card heading's plain text. */
  title: string;
  /** The first line of the body, shown in the inbox list. Plain text. */
  preheader: string;
  /** The card's header label: "Sign in", or the domain. Plain text. */
  label: string;
  badge: { text: string; tone: BadgeTone };
  /** The card body. Already escaped HTML, built from the helpers above. */
  body: string;
  /** The small print under the card. Already escaped HTML. */
  foot: string;
};

/**
 * The page around every email. Fluid to 520px, with a fixed 520px table for Outlook, which
 * ignores max-width.
 */
export const emailShell = ({ title, preheader, label, badge, body, foot }: ShellInput): string => {
  const c = COLOR;
  const badgeColor = BADGE_COLOR[badge.tone];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  body { margin:0; padding:0; -webkit-text-size-adjust:100%; }
  @media (prefers-color-scheme: dark) {
    .dc-ground, .dc-ground td.dc-g { background-color:${c.ground} !important; }
    .dc-card, .dc-card td.dc-c { background-color:${c.card} !important; }
    .dc-text { color:${c.text} !important; }
    .dc-muted { color:${c.muted} !important; }
    .dc-btn { background-color:${c.signal} !important; }
    .dc-btn a { color:${c.onSignal} !important; }
  }
  [data-ogsc] .dc-text { color:${c.text} !important; }
  [data-ogsc] .dc-muted { color:${c.muted} !important; }
  @media only screen and (max-width:560px) {
    .dc-pad { padding-left:20px !important; padding-right:20px !important; }
    .dc-outer { padding:20px 12px !important; }
    .dc-h1 { font-size:19px !important; }
  }
</style>
</head>
<body class="dc-ground" bgcolor="${c.ground}" style="margin:0;padding:0;background:${c.ground};background-color:${c.ground};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${escapeHtml(preheader)}${PREHEADER_PAD}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dc-ground" bgcolor="${c.ground}" style="background-color:${c.ground};">
<tr><td align="center" class="dc-g dc-outer" bgcolor="${c.ground}" style="padding:40px 16px;background-color:${c.ground};">
<!--[if mso]><table role="presentation" width="520" cellpadding="0" cellspacing="0"><tr><td><![endif]-->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:520px;">
<tr><td style="padding:0 0 16px 2px;">
<table ${TABLE}><tr>
<td width="8" style="width:8px;"><table ${TABLE}><tr><td width="8" height="8" bgcolor="${c.signal}" style="width:8px;height:8px;border-radius:50%;background-color:${c.signal};font-size:1px;line-height:1px;">&nbsp;</td></tr></table></td>
<td style="padding-left:10px;font-family:${FONT_MONO};font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:${c.muted};" class="dc-muted">DomainClaim</td>
</tr></table></td></tr><tr><td>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="dc-card" bgcolor="${c.card}" style="border:1px solid ${c.line};border-radius:10px;background-color:${c.card};">
<tr><td class="dc-c dc-pad" bgcolor="${c.card}" style="padding:13px 24px;background-color:${c.card};border-bottom:1px solid ${c.line};border-radius:10px 10px 0 0;">
<table ${TABLE}><tr>
<td style="font-family:${FONT_MONO};font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:${c.muted};" class="dc-muted">${escapeHtml(label)}</td>
<td style="padding-left:10px;"><table ${TABLE}><tr><td style="padding:3px 7px;border:1px solid ${badgeColor};border-radius:4px;font-family:${FONT_MONO};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:${badgeColor};line-height:1;">${escapeHtml(badge.text)}</td></tr></table></td>
</tr></table></td></tr>
<tr><td class="dc-c dc-pad" bgcolor="${c.card}" style="padding:26px 24px 10px;background-color:${c.card};">${body}</td></tr>
</table></td></tr>
<tr><td class="dc-pad" style="padding:18px 26px 0;">${foot}</td></tr>
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr></table>
</body></html>`;
};
