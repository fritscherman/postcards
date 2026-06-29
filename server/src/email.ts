import nodemailer from 'nodemailer';
import { t, type Lang } from './i18n';

// Sends an invite email via SMTP when SMTP_HOST is configured; otherwise the
// caller falls back to just returning the shareable link. The wording is
// localised in `lang` (the inviter's language — the closest signal we have for
// what the invitee will understand).
export async function sendInviteEmail(
  to: string,
  inviter: string,
  link: string,
  lang: Lang,
): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  if (!host) return false;

  const transport = nodemailer.createTransport({
    host,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
  });

  try {
    await transport.sendMail({
      from: process.env.INVITE_FROM ?? process.env.SMTP_USER,
      to,
      subject: t(lang, 'email.invite.subject', { inviter }),
      html: `<p>${t(lang, 'email.invite.intro', { inviter })}</p>
             <p><a href="${link}">${t(lang, 'email.invite.join')}</a></p>
             <p>${t(lang, 'email.invite.copy', { link })}</p>`,
    });
    return true;
  } catch (err) {
    console.error('Invite email failed:', err);
    return false;
  }
}
