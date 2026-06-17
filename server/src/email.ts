import nodemailer from 'nodemailer';

// Sends an invite email via SMTP when SMTP_HOST is configured; otherwise the
// caller falls back to just returning the shareable link.
export async function sendInviteEmail(to: string, inviter: string, link: string): Promise<boolean> {
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
      subject: `${inviter} lädt dich zu Postkarten ein ✉️`,
      html: `<p>${inviter} möchte dir virtuelle Postkarten schicken.</p>
             <p><a href="${link}">Jetzt beitreten</a></p>
             <p>Oder kopiere diesen Link: ${link}</p>`,
    });
    return true;
  } catch (err) {
    console.error('Invite email failed:', err);
    return false;
  }
}
