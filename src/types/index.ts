// ───────────────────────── Public site types ─────────────────────────
export interface Amenity { icon: string; label: string }

/** Shape returned by GET /api/v1/villas */
export interface ApiVilla {
  id: string;
  name: string;
  slug: string;
  badge: string | null;
  propertyType: string;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  startingPrice: number | null;
  currency: string;
  image: string | null;
  gallery: string[];
  galleryAlts: Record<string, string>;
  location: string;
  locality: string;
  checkInTime: string;
  checkOutTime: string;
  seoTitle: string | null;
  seoDescription: string | null;
  isDemo: boolean;
  shortDescription: string;
  fullDescription: string;
  amenities: Amenity[];
  highlights: string[];
  rules: string[];
  isFeatured: boolean;
}

/** ApiVilla plus derived display fields used throughout the existing components. */
export interface Villa extends Omit<ApiVilla, 'image' | 'badge'> {
  image: string;
  badge: string | null;
  specs: string;
  /** null when the business has not verified a price — UI shows "Price on enquiry". */
  displayPrice: string | null;
}

/** Lightweight entry for dropdowns (hero selector, booking form, footer). */
export interface VillaOption { id: string; slug: string; name: string; bedrooms: number; maxGuests: number; isDemo: boolean; specs: string }

export interface VillaFilters {
  q?: string; location?: string; type?: string; guests?: number; bedrooms?: number; minPrice?: number; maxPrice?: number;
  featured?: boolean; sort?: 'order' | 'price_asc' | 'price_desc' | 'newest' | 'guests_desc'; page?: number; pageSize?: number;
}
export interface VillaFacets {
  total: number;
  propertyTypes: { value: string; count: number }[];
  locations: { value: string; count: number }[];
  priceRange: { min: number; max: number } | null;
  maxBedrooms: number;
  maxGuests: number;
}

export interface Experience { id: string; label: string; sublabel?: string; icon: string; description: string }
export interface Destination { id: string; name: string; travelTime: string; distance: string; image: string; description: string }

export interface Testimonial {
  id: string;
  quote: string;
  guestName: string;
  city: string | null;
  villaName: string | null;
  rating: number;
}

export interface PublicSettings {
  businessName: string | null;
  publicEmail: string | null;
  publicPhone: string | null;
  whatsappNumber: string | null;
  whatsappDefaultMessage: string | null;
  heroImage: { url: string; alt: string; publicId: string | null } | null;
  heroVideo: { url: string; publicId: string | null; posterUrl: string | null; posterPublicId: string | null } | null;
  address: string | null;
  footerText: string | null;
  bookingInstructions: string | null;
  heroSupportingText: string | null;
  socialLinks: { instagram: string | null; facebook: string | null; youtube: string | null };
  environment?: { demoData: boolean };
  /** Google Analytics 4 measurement ID from the server (null = analytics off). Loaded only after the visitor consents. */
  analytics?: { measurementId: string | null };
}

export interface EnquiryReceipt {
  reference: string;
  status: string;
  villaName?: string;
  checkIn?: string;
  checkOut?: string;
  message?: string;
}

// ─────────────────────────── Admin types ───────────────────────────
export type BookingStatus = 'Pending' | 'Contacted' | 'Confirmed' | 'Cancelled' | 'Completed';
export type LeadStatus = 'New' | 'Contacted' | 'In Discussion' | 'Closed';
export const BOOKING_STATUSES: BookingStatus[] = ['Pending', 'Contacted', 'Confirmed', 'Cancelled', 'Completed'];
export const LEAD_STATUSES: LeadStatus[] = ['New', 'Contacted', 'In Discussion', 'Closed'];

export interface AdminUser { id: string; name: string; email: string; role: 'owner' | 'admin' | 'staff' }

export interface AdminBooking {
  id: string; reference: string; status: BookingStatus; villaId: string | null; villaName: string;
  checkIn: string; checkOut: string; adults: number; children: number;
  customerName: string; phone: string; email: string | null; message: string | null;
  internalNotes: string; notificationStatus: string; createdAt: string; updatedAt: string;
}
export interface AdminOwnerEnquiry {
  id: string; reference: string; ownerName: string; phone: string; email: string | null; villaName: string;
  propertyLocation: string; propertyDetails: string | null; status: LeadStatus; internalNotes: string;
  notificationStatus: string; createdAt: string; updatedAt: string;
}
export interface AdminInvestmentEnquiry {
  id: string; reference: string; customerName: string; phone: string; email: string; preferredLocation: string;
  budgetRange: string; propertyType: string; requirements: string | null; status: LeadStatus; internalNotes: string;
  notificationStatus: string; createdAt: string; updatedAt: string;
}
export interface AdminVilla extends ApiVilla {
  addressDetails: string | null; galleryImages: { url: string; alt: string; publicId?: string | null }[]; featuredImage: string | null; featuredImagePublicId: string | null;
  isPublished: boolean; displayOrder: number; isDemo: boolean; createdAt: string; updatedAt: string;
}
export interface AdminTestimonial extends Testimonial { isApproved: boolean; displayOrder: number }
export interface DashboardStats {
  publishedVillas: number; totalBookings: number; pendingBookings: number; confirmedBookings: number;
  newOwnerEnquiries: number; newInvestmentEnquiries: number; bookingsLast7Days: number; recentBookings: AdminBooking[];
}
export interface PageMeta { total: number; page: number; pageSize: number; totalPages: number }

export interface AdminVillaRow {
  id: string; name: string; slug: string; propertyType: string; location: string; locality: string; bedrooms: number; bathrooms: number; maxGuests: number;
  startingPrice: number | null; currency: string; image: string | null; isPublished: boolean; isFeatured: boolean; isDemo: boolean; displayOrder: number; updatedAt: string;
}
export interface EnvironmentStatus {
  nodeEnv: string; dataMode: 'local' | 'postgres';
  database: { engine: string; host: string; tls: boolean; connected: boolean; error?: string; pendingMigrations: string[]; demoProperties: number; totalProperties: number };
  imageStorage: { provider: string; configured: boolean; partiallyConfigured: boolean };
  email: { configured: boolean };
  whatsapp: { configured: boolean };
  warnings: string[];
}
export interface AdminMeta {
  propertyTypes: string[]; amenityIcons: string[];
  uploads: { enabled: boolean; provider: string | null; maxBytes: number; types: string[]; video: { maxBytes: number; types: string[] } };
  environment: EnvironmentStatus;
}
