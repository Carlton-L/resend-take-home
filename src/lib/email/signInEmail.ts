// src/lib/email/signInEmail.ts
import { signInEmailCopy } from '@/lib/auth/messages';
import {
  button,
  COLOR,
  emailShell,
  escapeHtml,
  heading,
  linkLine,
  paragraph,
} from '@/lib/email/layout';

export type SignInEmail = {
  subject: string;
  html: string;
  text: string;
};

/**
 * The sign in email, in the shared layout: a Sign in card with a Link badge, one button, and the
 * address in full under it.
 *
 * The plain text part is written rather than generated, so the message reads properly in a client
 * that shows it. The URL is visible in both parts, so someone can see where a link goes before
 * following it.
 */
export const buildSignInEmail = (email: string, url: string): SignInEmail => {
  const copy = signInEmailCopy;
  const lead = escapeHtml(copy.body(email)).replace(
    escapeHtml(email),
    `<b style="font-weight:600;color:${COLOR.text};">${escapeHtml(email)}</b>`,
  );

  const html = emailShell({
    title: copy.subject,
    preheader: copy.body(email),
    label: copy.label,
    badge: { text: copy.badge, tone: 'link' },
    body: [
      heading(escapeHtml(copy.heading)),
      paragraph(lead),
      button(copy.button, url),
      paragraph(escapeHtml(copy.expiry), 'muted'),
      paragraph(escapeHtml(copy.fallbackIntro), 'muted', 8),
      linkLine(url),
    ].join(''),
    foot: paragraph(escapeHtml(copy.ignore), 'fine'),
  });

  const text = [
    copy.heading,
    '',
    copy.bodyText(email),
    '',
    url,
    '',
    copy.expiry,
    '',
    copy.ignore,
    '',
  ].join('\n');

  return { subject: copy.subject, html, text };
};
