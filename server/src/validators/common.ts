import { z } from 'zod';
import { cleanText } from '../lib/text.js';
import { isValidIsoDate } from '../lib/dates.js';

export const text = (min: number, max: number, opts: { multiline?: boolean } = {}) =>
  z.string().transform((v) => cleanText(v, opts)).pipe(z.string().min(min, min ? 'This field is required' : undefined).max(max, `Must be at most ${max} characters`));

export const optionalText = (max: number, opts: { multiline?: boolean } = {}) =>
  z
    .string()
    .max(max * 2)
    .optional()
    .nullable()
    .transform((v) => (v == null ? null : cleanText(v, opts)))
    .pipe(z.string().max(max, `Must be at most ${max} characters`).nullable())
    .transform((v) => (v ? v : null));

const PHONE_IN = /^(\+91|0)?[6-9]\d{9}$/;
const PHONE_INTL = /^\+?[0-9]{8,15}$/;
export const phone = z
  .string()
  .transform((v) => v.replace(/[\s\-().]/g, ''))
  .pipe(z.string().refine((v) => PHONE_IN.test(v) || PHONE_INTL.test(v), 'Please enter a valid phone number'));

export const email = z
  .string()
  .transform((v) => v.trim())
  .pipe(z.string().max(254).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'));

export const optionalEmail = z
  .string()
  .optional()
  .nullable()
  .transform((v) => (v == null || v.trim() === '' ? null : v.trim()))
  .pipe(email.nullable());

export const isoDate = z.string().refine(isValidIsoDate, 'Must be a valid date in YYYY-MM-DD format');

export const uuid = z.string().uuid('Invalid id');

export const consentTrue = z.literal(true, { error: 'Consent is required to submit' });

export const pagination = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
