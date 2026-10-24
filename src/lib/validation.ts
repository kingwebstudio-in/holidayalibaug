export function validatePhone(phone: string): boolean {
  const clean = phone.replace(/[\s\-().]/g, '');
  return /^(\+91|0)?[6-9]\d{9}$/.test(clean) || /^\+?[0-9]{8,15}$/.test(clean);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** YYYY-MM-DD in the visitor's local calendar (not UTC), as used by <input type="date">. */
export function toLocalISODate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toLocalISODate(new Date(y, m - 1, d + days));
}

export function isCheckOutAfterCheckIn(checkIn: string, checkOut: string): boolean {
  return Boolean(checkIn && checkOut && checkOut > checkIn);
}

export function formatReadableDate(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (isNaN(dt.getTime())) return dateStr;
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}
