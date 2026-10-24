/**
 * WhatsApp links are built ONLY from the business number the admin saved in Website Content / Media (or the server's
 * WHATSAPP_NUMBER fallback). With no number, every helper returns null and the UI hides the WhatsApp action — a number is
 * never invented. Opening a link only pre-fills a message; the visitor still has to press send in WhatsApp.
 */
const digits = (n?: string | null) => (n ?? '').replace(/[^0-9]/g, '');

export const DEFAULT_WHATSAPP_MESSAGE = 'Hello! I would like to enquire about a villa stay in Alibaug. Could you please help me with availability and details?';

/** https://wa.me/<number>?text=<URL-encoded message>. The number must be international (country code, no +, no leading 0). */
export function buildWhatsAppUrl(number: string | null | undefined, text: string): string | null {
  const phone = digits(number);
  if (!/^[1-9][0-9]{7,14}$/.test(phone)) return null;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

/** Link for the floating button, header, footer: the admin's default message, optionally followed by a property name. */
export function whatsappGeneralUrl(number: string | null | undefined, defaultMessage?: string | null, villaName?: string): string | null {
  const base = (defaultMessage && defaultMessage.trim()) || DEFAULT_WHATSAPP_MESSAGE;
  return buildWhatsAppUrl(number, villaName ? `${base}\nProperty: ${villaName}` : base);
}

const clip = (s: string | undefined | null, n = 400) => {
  const v = (s ?? '').replace(/\s+/g, ' ').trim();
  return v.length > n ? `${v.slice(0, n - 1)}…` : v;
};
const lines = (rows: Array<[string, string | undefined | null] | string>) =>
  rows
    .map((r) => (typeof r === 'string' ? r : r[1] && String(r[1]).trim() ? `${r[0]}: ${clip(String(r[1]))}` : ''))
    .filter((l, i, a) => l !== '' || (i > 0 && a[i - 1] !== '' && i < a.length - 1))
    .join('\n');

const plural = (n: number, w: string, p = `${w}s`) => `${n} ${n === 1 ? w : p}`;

export interface BookingMessageData { reference: string; propertyName: string; checkIn: string; checkOut: string; adults: number; children: number; guestName: string; phone: string; email?: string; message?: string }
export const bookingWhatsAppText = (d: BookingMessageData) =>
  lines([
    '*New villa booking enquiry* — HolidayAlibag',
    ['Reference', d.reference],
    '',
    ['Property', d.propertyName || 'Any villa'],
    ['Check-in', d.checkIn],
    ['Check-out', d.checkOut],
    ['Guests', `${plural(d.adults, 'adult')}${d.children ? `, ${plural(d.children, 'child', 'children')}` : ''}`],
    '',
    ['Name', d.guestName],
    ['Phone', d.phone],
    ['Email', d.email],
    ['Notes', d.message],
    '',
    'This is an enquiry only — please confirm availability and rates. Thank you!',
  ]);

export interface OwnerMessageData { reference: string; ownerName: string; phone: string; villaName: string; location: string; details?: string }
export const ownerWhatsAppText = (d: OwnerMessageData) =>
  lines([
    '*New villa-owner enquiry* — HolidayAlibag',
    ['Reference', d.reference],
    '',
    ['Owner', d.ownerName],
    ['Phone', d.phone],
    ['Villa', d.villaName],
    ['Location', d.location],
    ['Details', d.details],
    '',
    'I would like to list my villa with you. Please get in touch. Thank you!',
  ]);

export interface InvestmentMessageData { reference: string; name: string; phone: string; email: string; location: string; budget: string; propertyType: string; requirements?: string }
export const investmentWhatsAppText = (d: InvestmentMessageData) =>
  lines([
    '*New property-investment enquiry* — HolidayAlibag',
    ['Reference', d.reference],
    '',
    ['Name', d.name],
    ['Phone', d.phone],
    ['Email', d.email],
    ['Preferred location', d.location],
    ['Budget', d.budget],
    ['Property type', d.propertyType],
    ['Requirements', d.requirements],
    '',
    'I am interested in investing in Alibaug property. Please share suitable options. Thank you!',
  ]);
