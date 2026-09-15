// src/lib/email/signInEmail.ts
import { signInEmailCopy } from '@/lib/auth/messages';

/** Escapes the values that reach the HTML part. Both are ours, and neither is trusted anyway. */
const escapeHtml = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export type SignInEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * Hand written HTML with inline styles and a table for the button, because email clients drop
 * stylesheets and half of them do not lay out a styled anchor the same way. No component library
 * here for the same reason there is none in the interface.
 *
 * The plain text part is written rather than generated, so the message reads properly in a client
 * that shows it, and the URL is visible in both parts. Somebody should be able to see where a link
 * goes before following it.
 */
/**
 * Same surfaces as the app: near black ground, one card, a pale button for the one thing to press.
 * The
 * colours are literals that match globals.css by hand, because mail clients strip stylesheets.
 *
 * Keeping it dark in a dark client takes four things, learned on carlton.dev's mail: the
 * color-scheme metas and the :root rule so Apple Mail and Proton do not lighten a dark ground,
 * bgcolor attributes beside every background style, !important pins under prefers-color-scheme,
 * and a divider that is a 1px cell rather than a border, which Outlook inverts.
 */
const F_SANS = "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
const F_MONO = "'IBM Plex Mono','SFMono-Regular',Menlo,Consolas,monospace";
const C = {
  bg: '#0a0a0b',
  card: '#101013',
  line: '#232326',
  text: '#e6e6e2',
  muted: '#8f8f8a',
  primary: '#e6e6e2',
} as const;

export const buildSignInEmail = (email: string, url: string): SignInEmail => {
  const safeUrl = escapeHtml(url);
  const safeEmail = escapeHtml(email);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark">
<title>${escapeHtml(signInEmailCopy.subject)}</title>
<style>
  :root { color-scheme: dark; supported-color-schemes: dark; }
  @media (prefers-color-scheme: dark) {
    .dc-ground, .dc-ground td.dc-g { background-color: ${C.bg} !important; }
    .dc-card { background-color: ${C.card} !important; border-color: ${C.line} !important; }
    .dc-text, .dc-text p, .dc-text a { color: ${C.text} !important; }
    .dc-muted, .dc-muted a { color: ${C.muted} !important; }
    .dc-btn { background-color: ${C.primary} !important; }
    .dc-btn a { color: ${C.bg} !important; }
  }
  [data-ogsc] .dc-text, [data-ogsc] .dc-text p { color: ${C.text} !important; }
  [data-ogsc] .dc-muted { color: ${C.muted} !important; }
</style>
</head>
<body class="dc-ground" bgcolor="${C.bg}" style="margin:0;padding:0;background:${C.bg};background-color:${C.bg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="dc-ground" bgcolor="${C.bg}" style="background:${C.bg};background-color:${C.bg};">
<tr><td align="center" class="dc-g" bgcolor="${C.bg}" style="padding:32px 16px;background-color:${C.bg};">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" class="dc-card" bgcolor="${C.card}" style="width:480px;max-width:480px;border:1px solid ${C.line};border-radius:12px;background:${C.card};background-color:${C.card};">
<tr><td class="dc-text" bgcolor="${C.card}" style="padding:24px;font-family:${F_SANS};color:${C.text};background-color:${C.card};">
<h1 style="margin:0 0 16px;font-size:18px;font-weight:500;letter-spacing:-0.01em;color:${C.text};">${signInEmailCopy.heading}</h1>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${C.text};">${signInEmailCopy.body(safeEmail)}</p>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td class="dc-btn" bgcolor="${C.primary}" style="border-radius:7px;background:${C.primary};background-color:${C.primary};">
<a href="${safeUrl}" style="display:inline-block;padding:10px 18px;font-family:${F_SANS};font-size:14px;font-weight:600;color:${C.bg};text-decoration:none;">${signInEmailCopy.button}</a>
</td></tr></table>
<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:${C.text};">${signInEmailCopy.expiry}</p>
<p class="dc-muted" style="margin:0 0 8px;font-size:13px;line-height:1.6;color:${C.muted};">${signInEmailCopy.fallbackIntro}</p>
<p class="dc-muted" style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;font-family:${F_MONO};color:${C.muted};"><a href="${safeUrl}" style="color:${C.muted};">${safeUrl}</a></p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td bgcolor="${C.line}" style="height:1px;line-height:1px;font-size:1px;background-color:${C.line};">&nbsp;</td></tr></table>
<p class="dc-muted" style="margin:16px 0 0;font-size:13px;line-height:1.6;color:${C.muted};">${signInEmailCopy.ignore}</p>
</td></tr>
</table>
</td></tr>
</table>
</body></html>`;

  const text = [
    signInEmailCopy.heading,
    '',
    signInEmailCopy.body(email),
    '',
    url,
    '',
    signInEmailCopy.expiry,
    '',
    signInEmailCopy.ignore,
    '',
  ].join('\n');

  return { subject: signInEmailCopy.subject, html, text };
};
