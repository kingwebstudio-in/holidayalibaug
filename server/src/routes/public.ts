import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { asyncHandler, ok } from '../lib/http.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createBookingEnquiry, createInvestmentEnquiry, createOwnerEnquiry } from '../services/enquiries.js';
import { getSettings } from '../services/settings.js';
import { listPublicTestimonials } from '../services/testimonials.js';
import { getPublicEnvironment } from '../services/environment.js';
import { getPublicVillaBySlug, getRelatedVillas, getVillaFacets, listPublicVillas, listVillaOptions } from '../services/villas.js';
import { bookingEnquirySchema, idempotencyKey, investmentEnquirySchema, ownerEnquirySchema, slugParam, villaListQuery } from '../validators/public.js';
import { badRequest } from '../lib/errors.js';
import { readLimiter, submitLimiter } from '../middleware/rateLimit.js';
import { fakeReceipt } from '../services/enquiries.js';

export function publicRoutes(opts: { rateLimit: boolean }) {
  const r = Router();
  const limit = opts.rateLimit ? submitLimiter() : [];
  if (opts.rateLimit) r.use(readLimiter());

  r.get('/health', asyncHandler(async (_req, res) => {
    try {
      await query('SELECT 1');
      ok(res, { status: 'ok', database: 'up', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ success: false, error: { code: 'database_down', message: 'Database is unreachable' } });
    }
  }));

  r.get('/villas', validateQuery(villaListQuery), asyncHandler(async (req, res) => {
    const q = req.parsed as z.infer<typeof villaListQuery>;
    const { items, meta } = await listPublicVillas({ ...q, featured: q.featured === undefined ? undefined : q.featured === 'true' });
    ok(res, items, meta);
  }));
  r.get('/villas/options', asyncHandler(async (_req, res) => ok(res, await listVillaOptions())));
  r.get('/villas/facets', asyncHandler(async (_req, res) => ok(res, await getVillaFacets())));
  r.get('/villas/:slug/related', asyncHandler(async (req, res) => {
    const slug = slugParam.safeParse(req.params.slug);
    if (!slug.success) throw badRequest('Invalid property slug');
    ok(res, await getRelatedVillas(slug.data));
  }));

  r.get('/villas/:slug', asyncHandler(async (req, res) => {
    const slug = slugParam.safeParse(req.params.slug);
    if (!slug.success) throw badRequest('Invalid property slug');
    ok(res, await getPublicVillaBySlug(slug.data));
  }));

  r.get('/settings/public', asyncHandler(async (_req, res) => ok(res, { ...(await getSettings()), environment: await getPublicEnvironment(), analytics: { measurementId: config.analyticsId || null } })));
  r.get('/testimonials', asyncHandler(async (_req, res) => ok(res, await listPublicTestimonials())));

  const key = (req: any) => {
    const raw = req.get('idempotency-key');
    if (!raw) return undefined;
    const p = idempotencyKey.safeParse(raw);
    if (!p.success) throw badRequest('Invalid Idempotency-Key header');
    return p.data;
  };

  r.post('/booking-enquiries', ...limit, validateBody(bookingEnquirySchema), asyncHandler(async (req, res) => {
    if (req.parsed.website) return ok(res, fakeReceipt('HA'), undefined, 201); // bot trap: look successful, store nothing
    const { created, enquiry } = await createBookingEnquiry(req.parsed, key(req));
    ok(res, { ...enquiry, message: 'Your enquiry has been received. This is a request only — availability is not confirmed until our team contacts you.' }, undefined, created ? 201 : 200);
  }));

  r.post('/villa-owner-enquiries', ...limit, validateBody(ownerEnquirySchema), asyncHandler(async (req, res) => {
    if (req.parsed.website) return ok(res, fakeReceipt('OWN'), undefined, 201);
    const { created, enquiry } = await createOwnerEnquiry(req.parsed, key(req));
    ok(res, enquiry, undefined, created ? 201 : 200);
  }));

  r.post('/investment-enquiries', ...limit, validateBody(investmentEnquirySchema), asyncHandler(async (req, res) => {
    if (req.parsed.website) return ok(res, fakeReceipt('INV'), undefined, 201);
    const { created, enquiry } = await createInvestmentEnquiry(req.parsed, key(req));
    ok(res, enquiry, undefined, created ? 201 : 200);
  }));

  return r;
}
