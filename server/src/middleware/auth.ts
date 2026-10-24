import type { Request, RequestHandler } from 'express';
import { config } from '../config.js';
import { forbidden, unauthorized } from '../lib/errors.js';
import { AdminIdentity, getAdminBySessionToken } from '../services/auth.js';

export const COOKIE_NAME = 'ha_admin';

declare module 'express-serve-static-core' {
  interface Request {
    admin?: AdminIdentity;
    sessionToken?: string;
  }
}

export const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd || config.COOKIE_SAMESITE === 'none',
  sameSite: config.COOKIE_SAMESITE,
  path: '/api/v1/admin',
  maxAge: config.SESSION_TTL_HOURS * 3_600_000,
});

/** Authenticates every request on the server; frontend route guards are only a convenience. */
export const requireAdmin: RequestHandler = async (req, _res, next) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token || typeof token !== 'string') throw unauthorized();
    const admin = await getAdminBySessionToken(token);
    if (!admin) throw unauthorized('Your session has expired. Please sign in again.');
    req.admin = admin;
    req.sessionToken = token;
    next();
  } catch (e) {
    next(e);
  }
};

export const requireRole =
  (...roles: AdminIdentity['role'][]): RequestHandler =>
  (req, _res, next) => (req.admin && roles.includes(req.admin.role) ? next() : next(forbidden()));

/**
 * CSRF defence for cookie auth: state-changing requests must carry a custom header
 * (which browsers will not send cross-site without a CORS preflight) and, when an Origin
 * header is present, it must be this site or an allowed origin.
 */
export const csrfGuard =
  (opts: { selfOrigin: (req: Request) => string }): RequestHandler =>
  (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.get('x-requested-with') !== 'HolidayAlibagAdmin') return next(forbidden('Missing CSRF header'));
    const origin = req.get('origin');
    if (origin) {
      const normalized = origin.replace(/\/$/, '');
      if (normalized !== opts.selfOrigin(req) && !config.allowedOrigins.includes(normalized)) return next(forbidden('Origin not allowed'));
    }
    next();
  };
