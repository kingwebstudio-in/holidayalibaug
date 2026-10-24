/**
 * Central API client. Never assumes a request worked: every failure becomes an ApiError.
 * Base URL is same-origin by default (Vite proxies /api in dev; Express serves both in production).
 * Set VITE_API_URL only if the API lives on another origin (it is public config, never a secret).
 */
const BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const API_BASE = BASE;
export const CROSS_ORIGIN_API = BASE !== '' && !BASE.startsWith('/');

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fieldErrors: Record<string, string> = {},
  ) {
    super(message);
  }
}

interface Options {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  admin?: boolean;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export interface ApiResult<T> { data: T; meta?: any }

export async function api<T>(path: string, opts: Options = {}): Promise<ApiResult<T>> {
  const { method = 'GET', body, headers = {}, admin = false, timeoutMs = 15_000, signal } = opts;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort('timeout'), timeoutMs);
  signal?.addEventListener('abort', () => controller.abort('aborted'));

  const h: Record<string, string> = { Accept: 'application/json', ...headers };
  if (body !== undefined) h['Content-Type'] = 'application/json';
  if (admin) h['X-Requested-With'] = 'HolidayAlibagAdmin';

  let res: Response;
  try {
    res = await fetch(`${BASE}/api/v1${path}`, {
      method,
      headers: h,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: CROSS_ORIGIN_API ? 'include' : 'same-origin',
      signal: controller.signal,
    });
  } catch (err) {
    if (controller.signal.aborted && controller.signal.reason === 'timeout') {
      throw new ApiError(0, 'timeout', 'The server took too long to respond. Please try again.');
    }
    if (controller.signal.aborted) throw new ApiError(0, 'aborted', 'Request cancelled.');
    throw new ApiError(0, 'network', 'We could not reach the server. Please check your connection and try again.');
  } finally {
    clearTimeout(timer);
  }

  let payload: any = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON response (e.g. proxy error page) */
  }

  if (!res.ok || !payload || payload.success !== true) {
    const e = payload?.error;
    const fieldErrors: Record<string, string> = {};
    if (Array.isArray(e?.details)) for (const d of e.details) if (d?.field && !fieldErrors[d.field]) fieldErrors[d.field] = d.message;
    // A 5xx without our JSON envelope means the request never reached the API (dev proxy/reverse proxy error page).
    const unreachable = !payload && [500, 502, 503, 504].includes(res.status);
    const hint = import.meta.env.DEV ? ' (Development: the API server is probably not running — start it with `npm run dev:server` or use `npm run dev:all`; `npm run doctor` explains configuration problems.)' : '';
    const message = unreachable ? `The website could not reach its server. Please try again in a moment.${hint}`
      : e?.code === 'database_unavailable' || e?.code === 'schema_not_migrated' ? `${e.message}${import.meta.env.DEV ? ' Run `npm run doctor` for details.' : ''}`
      : e?.message ?? (res.status >= 500 ? 'The server had a problem. Please try again shortly.' : `Request failed (${res.status}).`);
    const err = new ApiError(res.status, unreachable ? 'api_unreachable' : (e?.code ?? 'http_error'), message, fieldErrors);
    if (admin && res.status === 401 && !path.startsWith('/admin/auth/login')) window.dispatchEvent(new CustomEvent('admin:unauthorized'));
    throw err;
  }
  return { data: payload.data as T, meta: payload.meta };
}

export const newIdempotencyKey = () =>
  (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^A-Za-z0-9_-]/g, '');
