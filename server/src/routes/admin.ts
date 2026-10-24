import { Router } from 'express';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
import { asyncHandler, ok } from '../lib/http.js';
import { COOKIE_NAME, cookieOptions, csrfGuard, requireAdmin, requireRole } from '../middleware/auth.js';
import { adminLimiter, loginLimiter } from '../middleware/rateLimit.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.js';
import { audit } from '../services/audit.js';
import { changePassword, login, logout } from '../services/auth.js';
import { dashboardStats, getBookingEnquiry, listBookingEnquiries, listLeads, updateBookingEnquiry, updateLead } from '../services/enquiries.js';
import { getSettings, updateSettings } from '../services/settings.js';
import { createTestimonial, deleteTestimonial, listAdminTestimonials, updateTestimonial } from '../services/testimonials.js';
import { createVilla, deleteVilla, duplicateVilla, getAdminVilla, listAdminVillaOptions, listAdminVillas, setVillaFeatured, setVillaPublished, updateVilla } from '../services/villas.js';
import { getEnvironmentStatus } from '../services/environment.js';
import { imageStorage, sniffImageType, sniffVideoType } from '../services/imageStorage.js';
import { AMENITY_ICONS, PROPERTY_TYPES } from '../lib/propertyTypes.js';
import multer from 'multer';
import { badRequest } from '../lib/errors.js';
import rateLimit from 'express-rate-limit';
import {
  adminVillaListQuery, featuredSchema, bookingListQuery, bookingUpdateSchema, changePasswordSchema, idParam, leadListQuery, leadUpdateSchema, loginSchema,
  publishSchema, settingsSchema, testimonialSchema, villaInputSchema,
} from '../validators/admin.js';

const MAX_UPLOAD = 8 * 1024 * 1024;
const MAX_VIDEO_UPLOAD = 50 * 1024 * 1024;

export function adminRoutes(opts: { rateLimit: boolean }) {
  const r = Router();
  r.use(csrfGuard({ selfOrigin: (req) => `${req.protocol}://${req.get('host')}` }));
  if (opts.rateLimit) r.use(adminLimiter());

  // ── Auth ──
  const loginChain = opts.rateLimit ? [loginLimiter()] : [];
  r.post('/auth/login', ...loginChain, validateBody(loginSchema), asyncHandler(async (req, res) => {
    const { email, password } = req.parsed;
    const { token, admin } = await login(email, password, req.ip, req.get('user-agent'));
    res.cookie(COOKIE_NAME, token, cookieOptions());
    await audit(admin.id, 'auth.login', 'admin_user', admin.id);
    ok(res, { admin });
  }));

  r.post('/auth/logout', asyncHandler(async (req, res) => {
    const token = req.cookies?.[COOKIE_NAME];
    if (token) await logout(token);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
    ok(res, { loggedOut: true });
  }));

  // Everything below requires a valid server-side session.
  r.use(requireAdmin);

  r.get('/auth/me', (req, res) => ok(res, { admin: req.admin }));

  r.post('/auth/change-password', validateBody(changePasswordSchema), asyncHandler(async (req, res) => {
    await changePassword(req.admin!.id, req.parsed.currentPassword, req.parsed.newPassword, req.sessionToken);
    await audit(req.admin!.id, 'auth.change_password', 'admin_user', req.admin!.id);
    ok(res, { changed: true });
  }));

  r.get('/dashboard', asyncHandler(async (_req, res) => ok(res, await dashboardStats())));

  // ── Booking enquiries ──
  r.get('/booking-enquiries', validateQuery(bookingListQuery), asyncHandler(async (req, res) => {
    const { items, ...meta } = await listBookingEnquiries(req.parsed);
    ok(res, items, meta);
  }));
  r.get('/booking-enquiries/:id', validateParams(idParam), asyncHandler(async (req, res) => ok(res, await getBookingEnquiry(req.params.id))));
  r.patch('/booking-enquiries/:id', validateParams(idParam), validateBody(bookingUpdateSchema), asyncHandler(async (req, res) =>
    ok(res, await updateBookingEnquiry(req.admin!, req.params.id, req.parsed))));

  // ── Owner & investment enquiries ──
  for (const [path, kind] of [['villa-owner-enquiries', 'owner'], ['investment-enquiries', 'investment']] as const) {
    r.get(`/${path}`, validateQuery(leadListQuery), asyncHandler(async (req, res) => {
      const { items, ...meta } = await listLeads(kind, req.parsed);
      ok(res, items, meta);
    }));
    r.patch(`/${path}/:id`, validateParams(idParam), validateBody(leadUpdateSchema), asyncHandler(async (req, res) =>
      ok(res, await updateLead(kind, req.admin!, req.params.id, req.parsed))));
  }

  // ── Content management (owner/admin only) ──
  const editors = requireRole('owner', 'admin');
  r.get('/meta', asyncHandler(async (_req, res) => ok(res, { propertyTypes: PROPERTY_TYPES, amenityIcons: AMENITY_ICONS, uploads: { enabled: imageStorage.configured, provider: imageStorage.configured ? imageStorage.name : null, maxBytes: MAX_UPLOAD, types: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], video: { maxBytes: MAX_VIDEO_UPLOAD, types: ['video/mp4', 'video/webm', 'video/quicktime'] } }, environment: await getEnvironmentStatus() })));

  r.get('/villas', validateQuery(adminVillaListQuery), asyncHandler(async (req, res) => {
    const { items, meta } = await listAdminVillas(req.parsed);
    ok(res, items, meta);
  }));
  r.get('/villas/options', asyncHandler(async (_req, res) => ok(res, await listAdminVillaOptions())));
  r.get('/villas/:id', validateParams(idParam), asyncHandler(async (req, res) => ok(res, await getAdminVilla(req.params.id))));
  r.post('/villas', editors, validateBody(villaInputSchema), asyncHandler(async (req, res) => ok(res, await createVilla(req.admin!.id, req.parsed), undefined, 201)));
  r.put('/villas/:id', editors, validateParams(idParam), validateBody(villaInputSchema), asyncHandler(async (req, res) => ok(res, await updateVilla(req.admin!.id, req.params.id, req.parsed))));
  r.patch('/villas/:id/publish', editors, validateParams(idParam), validateBody(publishSchema), asyncHandler(async (req, res) =>
    ok(res, await setVillaPublished(req.admin!.id, req.params.id, req.parsed.isPublished))));
  r.patch('/villas/:id/featured', editors, validateParams(idParam), validateBody(featuredSchema), asyncHandler(async (req, res) =>
    ok(res, await setVillaFeatured(req.admin!.id, req.params.id, req.parsed.isFeatured))));
  r.post('/villas/:id/duplicate', editors, validateParams(idParam), asyncHandler(async (req, res) => ok(res, await duplicateVilla(req.admin!.id, req.params.id), undefined, 201)));
  r.delete('/villas/:id', editors, validateParams(idParam), asyncHandler(async (req, res) => { await deleteVilla(req.admin!.id, req.params.id); ok(res, { deleted: true }); }));

  // Image upload (admin-only, size/type validated, rate-limited). One file per request so the UI can show per-file progress.
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_UPLOAD, files: 1 } });
  const uploadLimit = opts.rateLimit ? [rateLimit({ windowMs: 10 * 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false, message: { success: false, error: { code: 'rate_limited', message: 'Too many uploads. Please wait a few minutes.' } } })] : [];
  const uploadVideo = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VIDEO_UPLOAD, files: 1 } });
  r.post('/uploads/video', editors, ...uploadLimit, (req, res, next) => {
    if (!imageStorage.configured) return next(new AppError(503, 'storage_not_configured', 'Video uploads are not configured on this server. Add CLOUDINARY_* settings (see README), or paste a video URL instead.'));
    uploadVideo.single('file')(req, res, (err: any) => {
      if (err?.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'file_too_large', `Video is too large. Maximum size is ${MAX_VIDEO_UPLOAD / 1024 / 1024} MB — compress it or paste a hosted video URL.`));
      next(err);
    });
  }, asyncHandler(async (req, res) => {
    const f = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
    if (!f) throw badRequest('Choose a video file to upload.');
    const mime = sniffVideoType(f.buffer);
    if (!mime) throw new AppError(415, 'unsupported_type', 'Only MP4, WebM or MOV videos can be uploaded.');
    const v = await imageStorage.upload(f.buffer, f.originalname.replace(/[^\w.\- ]/g, '_').slice(0, 100) || 'video', mime, 'video');
    await audit(req.admin!.id, 'video.upload', 'video', v.publicId, { bytes: v.bytes });
    ok(res, v, undefined, 201);
  }));

  r.post('/uploads/image', editors, ...uploadLimit, (req, res, next) => {
    if (!imageStorage.configured) return next(new AppError(503, 'storage_not_configured', 'Image uploads are not configured on this server. Add CLOUDINARY_* settings (see README), or paste image URLs instead.'));
    upload.single('file')(req, res, (err: any) => {
      if (err?.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'file_too_large', `Image is too large. Maximum size is ${MAX_UPLOAD / 1024 / 1024} MB.`));
      next(err);
    });
  }, asyncHandler(async (req, res) => {
    const f = (req as any).file as { buffer: Buffer; originalname: string } | undefined;
    if (!f) throw badRequest('Choose an image file to upload.');
    const mime = sniffImageType(f.buffer);
    if (!mime) throw new AppError(415, 'unsupported_type', 'Only JPEG, PNG, WebP or GIF images can be uploaded.');
    const img = await imageStorage.upload(f.buffer, f.originalname.replace(/[^\w.\- ]/g, '_').slice(0, 100) || 'image', mime);
    await audit(req.admin!.id, 'image.upload', 'image', img.publicId, { bytes: img.bytes });
    ok(res, img, undefined, 201);
  }));

  r.get('/settings', asyncHandler(async (_req, res) => ok(res, await getSettings())));
  r.put('/settings', editors, validateBody(settingsSchema), asyncHandler(async (req, res) => ok(res, await updateSettings(req.admin!.id, req.parsed))));

  r.get('/testimonials', asyncHandler(async (_req, res) => ok(res, await listAdminTestimonials())));
  r.post('/testimonials', editors, validateBody(testimonialSchema), asyncHandler(async (req, res) => ok(res, await createTestimonial(req.admin!.id, req.parsed), undefined, 201)));
  r.put('/testimonials/:id', editors, validateParams(idParam), validateBody(testimonialSchema), asyncHandler(async (req, res) => ok(res, await updateTestimonial(req.admin!.id, req.params.id, req.parsed))));
  r.delete('/testimonials/:id', editors, validateParams(idParam), asyncHandler(async (req, res) => { await deleteTestimonial(req.admin!.id, req.params.id); ok(res, { deleted: true }); }));

  void config;
  return r;
}
