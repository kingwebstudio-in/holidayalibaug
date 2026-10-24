import { z } from 'zod';
import { isoDate, optionalText, pagination, text, uuid, email } from './common.js';
import { slugParam } from './public.js';
import { AMENITY_ICONS, PROPERTY_TYPES } from '../lib/propertyTypes.js';

export const loginSchema = z.object({
  email: z.string().min(3).max(254),
  password: z.string().min(1).max(256),
});

export const passwordPolicy = z
  .string()
  .min(12, 'Use at least 12 characters')
  .max(128)
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number');

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(256),
  newPassword: passwordPolicy,
});

export const BOOKING_STATUSES = ['Pending', 'Contacted', 'Confirmed', 'Cancelled', 'Completed'] as const;
export const LEAD_STATUSES = ['New', 'Contacted', 'In Discussion', 'Closed'] as const;

export const bookingListQuery = pagination.extend({
  q: z.string().max(100).optional(),
  status: z.enum(BOOKING_STATUSES).optional(),
  villaId: uuid.optional(),
  from: isoDate.optional(), // check-in on/after
  to: isoDate.optional(), // check-in on/before
});

export const leadListQuery = pagination.extend({
  q: z.string().max(100).optional(),
  status: z.enum(LEAD_STATUSES).optional(),
});

export const bookingUpdateSchema = z
  .object({
    status: z.enum(BOOKING_STATUSES).optional(),
    internalNotes: z.string().max(5000).optional(),
    /** Assign the enquiry to a specific villa (e.g. one that was submitted as "any villa"). */
    villaId: uuid.optional(),
    /** Admin attests they checked real availability. Required when moving to Confirmed. */
    availabilityChecked: z.boolean().optional(),
    /** Allow confirming even if another Confirmed enquiry overlaps the same villa/dates. */
    allowOverlap: z.boolean().optional(),
  })
  .refine((v) => v.status !== undefined || v.internalNotes !== undefined || v.villaId !== undefined, 'Nothing to update');

export const leadUpdateSchema = z
  .object({
    status: z.enum(LEAD_STATUSES).optional(),
    internalNotes: z.string().max(5000).optional(),
  })
  .refine((v) => v.status !== undefined || v.internalNotes !== undefined, 'Nothing to update');

const imageUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((u) => /^\/(?!\/)[^\s]*$/.test(u) || /^https:\/\/[^\s]+$/.test(u), 'Image must be an https:// URL or a site path starting with /');

/** Sanity cap (request size / page weight), not a storage-provider limit. */
export const MAX_GALLERY_IMAGES = 100;
const hhmm = z.string().regex(/^([01][0-9]|2[0-3]):[0-5][0-9]$/, 'Use 24-hour HH:MM, e.g. 14:00');
const publicId = z.string().trim().max(300).nullable().optional().transform((v) => v || null);

export const villaInputSchema = z.object({
  name: text(1, 160),
  slug: slugParam.optional(),
  badge: optionalText(40),
  propertyType: z.enum(PROPERTY_TYPES),
  shortDescription: text(0, 400, { multiline: true }).default(''),
  fullDescription: text(0, 5000, { multiline: true }).default(''),
  location: text(0, 160).default(''),
  locality: text(0, 120).default(''),
  addressDetails: optionalText(400),
  bedrooms: z.coerce.number().int().min(1).max(50),
  bathrooms: z.coerce.number().int().min(0).max(50).default(1),
  maxGuests: z.coerce.number().int().min(1).max(100),
  startingPrice: z.coerce.number().int().min(0).max(100_000_000).nullable().optional(),
  currency: z.string().length(3).toUpperCase().default('INR'),
  featuredImage: imageUrl.nullable().optional(),
  featuredImagePublicId: publicId,
  gallery: z.array(z.object({ url: imageUrl, alt: z.string().trim().max(200).default(''), publicId })).max(MAX_GALLERY_IMAGES, `A property can have at most ${MAX_GALLERY_IMAGES} gallery images.`).default([]),
  amenities: z
    .array(z.object({ label: text(1, 80), icon: z.enum(AMENITY_ICONS).default('sparkles') }))
    .max(60)
    .default([]),
  highlights: z.array(text(1, 300)).max(30).default([]),
  rules: z.array(text(1, 300)).max(30).default([]),
  checkInTime: hhmm.default('14:00'),
  checkOutTime: hhmm.default('11:00'),
  seoTitle: optionalText(120),
  seoDescription: optionalText(320),
  isPublished: z.boolean().default(false),
  isFeatured: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});
export type VillaInput = z.infer<typeof villaInputSchema>;

export const adminVillaListQuery = pagination.extend({
  q: z.string().max(100).optional(),
  status: z.enum(['published', 'draft']).optional(),
  demo: z.enum(['true', 'false']).optional(),
  featured: z.enum(['true', 'false']).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  sort: z.enum(['updated', 'name', 'order', 'price_asc', 'price_desc']).default('updated'),
});

export const featuredSchema = z.object({ isFeatured: z.boolean() });
export const publishSchema = z.object({ isPublished: z.boolean() });

const urlOrNull = z
  .string()
  .trim()
  .max(500)
  .nullable()
  .optional()
  .transform((v) => (v ? v : null))
  .pipe(z.string().url().refine((u) => /^https?:\/\//.test(u), 'Must start with http:// or https://').nullable());

const mediaUrl = z.string().trim().max(2000).refine((u) => /^\/(?!\/)[^\s]*$/.test(u) || /^https:\/\/[^\s]+$/.test(u), 'Use an https:// URL or a site path starting with /');
const optId = z.string().trim().max(300).nullable().optional().transform((v) => v || null);
const heroImageSchema = z.object({ url: mediaUrl, alt: z.string().trim().max(200).default(''), publicId: optId });
const heroVideoSchema = z.object({ url: mediaUrl, publicId: optId, posterUrl: mediaUrl.nullable().optional().transform((v) => v || null), posterPublicId: optId });

export const settingsSchema = z
  .object({
    businessName: optionalText(120),
    publicEmail: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(email.nullable()),
    publicPhone: z
      .string()
      .trim()
      .max(30)
      .nullable()
      .optional()
      .transform((v) => (v ? v : null))
      .pipe(z.string().regex(/^\+?[0-9 ()-]{6,30}$/, 'Enter a valid phone number').nullable()),
    /** Digits only, with country code (e.g. 91XXXXXXXXXX). */
    whatsappNumber: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v ? v.replace(/[\s+()-]/g, '') : null))
      .pipe(z.string().regex(/^[1-9][0-9]{7,14}$/, 'Use digits only with country code, e.g. 919XXXXXXXXX').nullable()),
    address: optionalText(300),
    footerText: optionalText(500, { multiline: true }),
    bookingInstructions: optionalText(1000, { multiline: true }),
    heroSupportingText: optionalText(300),
    whatsappDefaultMessage: optionalText(300),
    heroImage: heroImageSchema.nullable().optional(),
    heroVideo: heroVideoSchema.nullable().optional(),
    socialLinks: z
      .object({ instagram: urlOrNull, facebook: urlOrNull, youtube: urlOrNull })
      .partial()
      .optional(),
  })
  .partial();
export type SettingsInput = z.infer<typeof settingsSchema>;

export const testimonialSchema = z.object({
  quote: text(1, 1000, { multiline: true }),
  guestName: text(1, 120),
  city: optionalText(80),
  villaName: optionalText(160),
  rating: z.coerce.number().int().min(1).max(5).default(5),
  isApproved: z.boolean().default(false),
  displayOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

export const idParam = z.object({ id: uuid });
