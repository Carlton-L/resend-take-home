// src/lib/email/send.ts
import 'server-only';
import { Resend } from 'resend';
import { MAIL_FROM } from '@/lib/auth/config';

export type SendOutcome = { sent: true } | { sent: false };

/**
 * One path for all mail. Auth goes out the same way a status change notification will, which is
 * the reason the SDK is here rather than Resend being configured as Supabase's SMTP provider.
 *
 * Nothing from the failure is logged. The payload holds a link carrying a live credential, and a
 * provider error can echo what it was given.
 */
export const sendMail = async (message: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendOutcome> => {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: MAIL_FROM,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
  });

  return error ? { sent: false } : { sent: true };
};
