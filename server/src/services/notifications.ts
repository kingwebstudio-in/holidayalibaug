import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';
import { escapeHtml } from '../lib/text.js';

export type NotificationResult = 'sent' | 'not_configured' | 'failed';

let transporter: Transporter | null = null;
const getTransporter = () =>
  (transporter ??= nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_SECURE === 'true',
    auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    connectionTimeout: 4000,
    greetingTimeout: 4000,
    socketTimeout: 5000,
  }));

/**
 * E-mails the business a summary of a new enquiry. Never throws: the enquiry is already saved,
 * and the outcome is stored on the row so admins can see whether a notification went out.
 */
export async function notifyNewEnquiry(title: string, reference: string, rows: Array<[string, string | number | null | undefined]>): Promise<NotificationResult> {
  if (!config.smtpConfigured) return 'not_configured';
  try {
    const html = `<h2>${escapeHtml(title)}</h2><p>Reference: <strong>${escapeHtml(reference)}</strong></p><table cellpadding="6">${rows
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(([k, v]) => `<tr><td><strong>${escapeHtml(k)}</strong></td><td>${escapeHtml(String(v))}</td></tr>`)
      .join('')}</table><p>Open the admin dashboard to respond. This is an enquiry only; availability has not been confirmed.</p>`;
    await getTransporter().sendMail({ from: config.NOTIFY_EMAIL_FROM, to: config.NOTIFY_EMAIL_TO, subject: `${title} — ${reference}`, html });
    return 'sent';
  } catch (err) {
    console.error('Enquiry notification failed:', (err as Error).message);
    return 'failed';
  }
}
