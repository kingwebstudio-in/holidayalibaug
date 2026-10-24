import { z } from 'zod';
import { PROPERTY_TYPES } from '../lib/propertyTypes.js';
import { consentTrue, email, isoDate, optionalEmail, optionalText, phone, text, uuid } from './common.js';

/**
 * Bot trap. The field is rendered invisibly in every public form (people never see or fill it; many bots fill every input).
 * A non-empty value makes the API pretend to succeed without storing anything.
 */
const honeypot = z.string().max(500).optional();

export const bookingEnquirySchema = z.object({
  website: honeypot,
  villaId: uuid.nullable().optional(), // null / omitted => "any villa"
  checkIn: isoDate,
  checkOut: isoDate,
  adults: z.coerce.number().int().min(1, 'At least 1 adult is required').max(100),
  children: z.coerce.number().int().min(0).max(100).default(0),
  guestName: text(1, 120),
  phone,
  email: optionalEmail,
  message: optionalText(2000, { multiline: true }),
  consent: consentTrue,
});

export const ownerEnquirySchema = z.object({
  website: honeypot,
  ownerName: text(1, 120),
  phone,
  email: optionalEmail,
  villaName: text(1, 160),
  propertyLocation: text(1, 160),
  propertyDetails: optionalText(3000, { multiline: true }),
  consent: consentTrue,
});

export const investmentEnquirySchema = z.object({
  website: honeypot,
  customerName: text(1, 120),
  phone,
  email,
  preferredLocation: text(1, 160),
  budgetRange: text(1, 80),
  propertyType: text(1, 80),
  requirements: optionalText(3000, { multiline: true }),
  consent: consentTrue,
});

export const VILLA_SORTS = ['order', 'price_asc', 'price_desc', 'newest', 'guests_desc'] as const;
export const villaListQuery = z.object({
  featured: z.enum(['true', 'false']).optional(),
  guests: z.coerce.number().int().min(1).max(100).optional(),
  bedrooms: z.coerce.number().int().min(1).max(50).optional(),
  q: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  type: z.enum(PROPERTY_TYPES).optional(),
  minPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  maxPrice: z.coerce.number().int().min(0).max(100_000_000).optional(),
  sort: z.enum(VILLA_SORTS).default('order'),
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(12),
});

export const slugParam = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(120);
export const idempotencyKey = z.string().regex(/^[A-Za-z0-9_-]{8,100}$/);
