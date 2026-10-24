import { api } from './api';
import type { ApiVilla, EnquiryReceipt, PageMeta, PublicSettings, Testimonial, Villa, VillaFacets, VillaFilters, VillaOption } from '../types';

const currencySymbol: Record<string, string> = { INR: '₹', USD: '$', EUR: '€', GBP: '£' };

/** Adds derived display fields. Price is shown only when the business supplied one. */
export function toVilla(v: ApiVilla): Villa {
  const money = v.startingPrice != null ? `${currencySymbol[v.currency] ?? `${v.currency} `}${v.startingPrice.toLocaleString('en-IN')} / night` : null;
  return {
    ...v,
    image: v.image ?? v.gallery[0] ?? '',
    badge: v.badge,
    specs: `${v.bedrooms} BHK · Up to ${v.maxGuests} Guests`,
    displayPrice: money,
  };
}

const qs = (o: Record<string, unknown>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  return p.toString() ? `?${p}` : '';
};

/** One page of properties matching the filters (server-side search, filtering, sorting and pagination). */
export async function fetchVillaPage(f: VillaFilters, signal?: AbortSignal): Promise<{ items: Villa[]; meta: PageMeta }> {
  const r = await api<ApiVilla[]>(`/villas${qs({ ...f })}`, { signal });
  return { items: r.data.map(toVilla), meta: r.meta as PageMeta };
}
export const fetchVillaOptions = async (signal?: AbortSignal): Promise<VillaOption[]> =>
  (await api<Omit<VillaOption, 'specs'>[]>('/villas/options', { signal })).data.map((v) => ({ ...v, specs: `${v.bedrooms} BHK · Up to ${v.maxGuests} Guests` }));
export const fetchVillaBySlug = async (slug: string, signal?: AbortSignal) => toVilla((await api<ApiVilla>(`/villas/${encodeURIComponent(slug)}`, { signal })).data);
export const fetchFacets = async (signal?: AbortSignal) => (await api<VillaFacets>('/villas/facets', { signal })).data;
export const fetchRelated = async (slug: string, signal?: AbortSignal) => (await api<ApiVilla[]>(`/villas/${encodeURIComponent(slug)}/related`, { signal })).data.map(toVilla);
export const fetchSettings = async (signal?: AbortSignal) => (await api<PublicSettings>('/settings/public', { signal })).data;
export const fetchTestimonials = async (signal?: AbortSignal) => (await api<Testimonial[]>('/testimonials', { signal })).data;

export interface BookingPayload {
  villaId: string | null;
  checkIn: string;
  checkOut: string;
  adults: number;
  children: number;
  guestName: string;
  phone: string;
  email?: string;
  message?: string;
  consent: boolean;
  /** Honeypot: always empty for real visitors. */
  website?: string;
}
export const submitBookingEnquiry = (p: BookingPayload, key: string) =>
  api<EnquiryReceipt>('/booking-enquiries', { method: 'POST', body: p, headers: { 'Idempotency-Key': key } }).then((r) => r.data);

export const submitOwnerEnquiry = (p: { ownerName: string; phone: string; email?: string; villaName: string; propertyLocation: string; propertyDetails?: string; consent: boolean; website?: string }, key: string) =>
  api<EnquiryReceipt>('/villa-owner-enquiries', { method: 'POST', body: p, headers: { 'Idempotency-Key': key } }).then((r) => r.data);

export const submitInvestmentEnquiry = (p: { customerName: string; phone: string; email: string; preferredLocation: string; budgetRange: string; propertyType: string; requirements?: string; consent: boolean; website?: string }, key: string) =>
  api<EnquiryReceipt>('/investment-enquiries', { method: 'POST', body: p, headers: { 'Idempotency-Key': key } }).then((r) => r.data);
