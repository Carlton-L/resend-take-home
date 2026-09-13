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
export const buildSignInEmail = (email: string, url: string): SignInEmail => {
  const safeUrl = escapeHtml(url);
  const safeEmail = escapeHtml(email);

  const html = [
    '<div style="margin:0;padding:24px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#171717;">',
    '<div style="max-width:480px;margin:0 auto;">',
    `<h1 style="margin:0 0 16px;font-size:18px;font-weight:600;letter-spacing:-0.01em;">${signInEmailCopy.heading}</h1>`,
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#404040;">${signInEmailCopy.body(safeEmail)}</p>`,
    '<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;"><tr><td style="border-radius:6px;background:#171717;">',
    `<a href="${safeUrl}" style="display:inline-block;padding:10px 18px;font-size:14px;font-weight:500;color:#ffffff;text-decoration:none;">${signInEmailCopy.button}</a>`,
    '</td></tr></table>',
    `<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#404040;">${signInEmailCopy.expiry}</p>`,
    `<p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#737373;">${signInEmailCopy.fallbackIntro}</p>`,
    `<p style="margin:0 0 24px;font-size:13px;line-height:1.6;word-break:break-all;"><a href="${safeUrl}" style="color:#525252;">${safeUrl}</a></p>`,
    `<p style="margin:0;padding-top:16px;border-top:1px solid #e5e5e5;font-size:13px;line-height:1.6;color:#737373;">${signInEmailCopy.ignore}</p>`,
    '</div>',
    '</div>',
  ].join('');

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
