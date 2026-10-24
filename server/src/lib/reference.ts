import crypto from 'node:crypto';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I

/** e.g. HA-20261015-K7QP3M. Uniqueness is enforced by a DB constraint; callers retry on collision. */
export function generateReference(prefix: 'HA' | 'OWN' | 'INV', date = new Date()): string {
  const ymd = date.toISOString().slice(0, 10).replace(/-/g, '');
  const bytes = crypto.randomBytes(6);
  let suffix = '';
  for (let i = 0; i < 6; i++) suffix += ALPHABET[bytes[i] % ALPHABET.length];
  return `${prefix}-${ymd}-${suffix}`;
}
