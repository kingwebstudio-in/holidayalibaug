import rateLimit from 'express-rate-limit';

const json = (message: string) => ({ success: false, error: { code: 'rate_limited', message } });

export const loginLimiter = () =>
  rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many sign-in attempts. Please wait and try again.'), skipSuccessfulRequests: true });

/** Public enquiry forms: a short burst limit and an hourly cap, shared by all three forms. Idempotent replays count too. */
export const submitLimiter = () => [
  rateLimit({ windowMs: 10 * 60_000, limit: 8, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many submissions from this connection. Please wait a few minutes and try again.') }),
  rateLimit({ windowMs: 60 * 60_000, limit: 25, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many submissions from this connection. Please try again later.') }),
];

/** Read-only public API (property lists, settings): generous, but not unlimited, so it cannot be used to hammer the database. */
export const readLimiter = () =>
  rateLimit({ windowMs: 60_000, limit: 240, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many requests. Please slow down.') });

export const adminLimiter = () =>
  rateLimit({ windowMs: 15 * 60_000, limit: 1500, standardHeaders: 'draft-7', legacyHeaders: false, message: json('Too many requests. Please slow down.') });
