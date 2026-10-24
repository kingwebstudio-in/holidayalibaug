import { API_BASE, CROSS_ORIGIN_API, ApiError, api } from './api';
import type {
  AdminBooking, AdminInvestmentEnquiry, AdminMeta, AdminOwnerEnquiry, AdminTestimonial, AdminUser, AdminVilla, AdminVillaRow,
  DashboardStats, PageMeta, PublicSettings,
} from '../types';

const a = { admin: true } as const;
const qs = (o: Record<string, string | number | undefined | null>) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== undefined && v !== null && v !== '') p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
};
type Paged<T> = { items: T[]; meta: PageMeta };
const paged = async <T,>(path: string): Promise<Paged<T>> => {
  const r = await api<T[]>(path, a);
  return { items: r.data, meta: r.meta as PageMeta };
};

function uploadFile(kind: 'image' | 'video', file: File, onProgress?: (pct: number) => void) {
  return new Promise<{ url: string; publicId: string }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/api/v1/admin/uploads/${kind}`);
    xhr.withCredentials = CROSS_ORIGIN_API;
    xhr.setRequestHeader('X-Requested-With', 'HolidayAlibagAdmin');
    xhr.setRequestHeader('Accept', 'application/json');
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
    xhr.onerror = () => reject(new ApiError(0, 'network', 'Upload failed: could not reach the server.'));
    xhr.ontimeout = () => reject(new ApiError(0, 'timeout', 'Upload timed out.'));
    xhr.timeout = kind === 'video' ? 180_000 : 60_000;
    xhr.onload = () => {
      let body: any = null;
      try { body = JSON.parse(xhr.responseText); } catch { /* not JSON */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.success) return resolve(body.data);
      if (xhr.status === 401) window.dispatchEvent(new CustomEvent('admin:unauthorized'));
      reject(new ApiError(xhr.status, body?.error?.code ?? 'upload_failed', body?.error?.message ?? `Upload failed (${xhr.status}).`));
    };
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

export const adminApi = {
  login: (email: string, password: string) => api<{ admin: AdminUser }>('/admin/auth/login', { ...a, method: 'POST', body: { email, password } }).then((r) => r.data.admin),
  logout: () => api('/admin/auth/logout', { ...a, method: 'POST' }),
  me: () => api<{ admin: AdminUser }>('/admin/auth/me', a).then((r) => r.data.admin),
  changePassword: (currentPassword: string, newPassword: string) => api('/admin/auth/change-password', { ...a, method: 'POST', body: { currentPassword, newPassword } }),

  dashboard: () => api<DashboardStats>('/admin/dashboard', a).then((r) => r.data),

  bookings: (f: { q?: string; status?: string; villaId?: string; from?: string; to?: string; page?: number; pageSize?: number }) => paged<AdminBooking>(`/admin/booking-enquiries${qs(f)}`),
  booking: (id: string) => api<AdminBooking>(`/admin/booking-enquiries/${id}`, a).then((r) => r.data),
  updateBooking: (id: string, patch: { status?: string; internalNotes?: string; villaId?: string; availabilityChecked?: boolean; allowOverlap?: boolean }) =>
    api<AdminBooking>(`/admin/booking-enquiries/${id}`, { ...a, method: 'PATCH', body: patch }).then((r) => r.data),

  owners: (f: { q?: string; status?: string; page?: number }) => paged<AdminOwnerEnquiry>(`/admin/villa-owner-enquiries${qs(f)}`),
  updateOwner: (id: string, patch: { status?: string; internalNotes?: string }) => api<AdminOwnerEnquiry>(`/admin/villa-owner-enquiries/${id}`, { ...a, method: 'PATCH', body: patch }).then((r) => r.data),
  investments: (f: { q?: string; status?: string; page?: number }) => paged<AdminInvestmentEnquiry>(`/admin/investment-enquiries${qs(f)}`),
  updateInvestment: (id: string, patch: { status?: string; internalNotes?: string }) => api<AdminInvestmentEnquiry>(`/admin/investment-enquiries/${id}`, { ...a, method: 'PATCH', body: patch }).then((r) => r.data),

  meta: () => api<AdminMeta>('/admin/meta', a).then((r) => r.data),
  villas: (f: { q?: string; status?: string; demo?: string; featured?: string; type?: string; sort?: string; page?: number; pageSize?: number }) => paged<AdminVillaRow>(`/admin/villas${qs(f)}`),
  villaOptions: () => api<{ id: string; name: string; isPublished: boolean; isDemo: boolean }[]>('/admin/villas/options', a).then((r) => r.data),
  villa: (id: string) => api<AdminVilla>(`/admin/villas/${id}`, a).then((r) => r.data),
  createVilla: (body: unknown) => api<AdminVilla>('/admin/villas', { ...a, method: 'POST', body }).then((r) => r.data),
  updateVilla: (id: string, body: unknown) => api<AdminVilla>(`/admin/villas/${id}`, { ...a, method: 'PUT', body }).then((r) => r.data),
  publishVilla: (id: string, isPublished: boolean) => api<AdminVilla>(`/admin/villas/${id}/publish`, { ...a, method: 'PATCH', body: { isPublished } }).then((r) => r.data),
  featureVilla: (id: string, isFeatured: boolean) => api<AdminVilla>(`/admin/villas/${id}/featured`, { ...a, method: 'PATCH', body: { isFeatured } }).then((r) => r.data),
  duplicateVilla: (id: string) => api<AdminVilla>(`/admin/villas/${id}/duplicate`, { ...a, method: 'POST' }).then((r) => r.data),
  deleteVilla: (id: string) => api(`/admin/villas/${id}`, { ...a, method: 'DELETE' }),

  /** Uploads one file (multipart) with real progress events. */
  uploadImage: (file: File, onProgress?: (pct: number) => void) => uploadFile('image', file, onProgress),
  uploadVideo: (file: File, onProgress?: (pct: number) => void) => uploadFile('video', file, onProgress),

  settings: () => api<PublicSettings>('/admin/settings', a).then((r) => r.data),
  updateSettings: (body: unknown) => api<PublicSettings>('/admin/settings', { ...a, method: 'PUT', body }).then((r) => r.data),

  testimonials: () => api<AdminTestimonial[]>('/admin/testimonials', a).then((r) => r.data),
  createTestimonial: (body: unknown) => api<AdminTestimonial>('/admin/testimonials', { ...a, method: 'POST', body }).then((r) => r.data),
  updateTestimonial: (id: string, body: unknown) => api<AdminTestimonial>(`/admin/testimonials/${id}`, { ...a, method: 'PUT', body }).then((r) => r.data),
  deleteTestimonial: (id: string) => api(`/admin/testimonials/${id}`, { ...a, method: 'DELETE' }),
};
