import crypto from 'node:crypto';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { AppError } from '../lib/errors.js';

/** Provider-neutral image storage. Cloudinary is the only implementation today; swap by implementing this interface. */
export interface UploadedImage { url: string; publicId: string; width?: number; height?: number; bytes?: number }
export type ResourceType = 'image' | 'video';
export interface ImageStorage {
  readonly name: string;
  readonly configured: boolean;
  upload(file: Buffer, filename: string, mime: string, resourceType?: ResourceType): Promise<UploadedImage>;
  destroy(publicId: string, resourceType?: ResourceType): Promise<boolean>;
}

const sign = (params: Record<string, string | number>, secret: string) => {
  const toSign = Object.keys(params).filter((k) => params[k] !== '' && params[k] != null).sort().map((k) => `${k}=${params[k]}`).join('&');
  return crypto.createHash('sha1').update(toSign + secret).digest('hex');
};

class CloudinaryStorage implements ImageStorage {
  readonly name = 'cloudinary';
  get configured() { return config.cloudinary.configured; }
  private base(type: ResourceType) { return `https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudinary.cloudName)}/${type}`; }

  async upload(file: Buffer, filename: string, mime: string, resourceType: ResourceType = 'image'): Promise<UploadedImage> {
    if (!this.configured) throw new AppError(503, 'storage_not_configured', 'Uploads are not configured. Add CLOUDINARY_* settings, or paste URLs instead.');
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = config.cloudinary.folder;
    const signature = sign({ folder, timestamp }, config.cloudinary.apiSecret);
    const form = new FormData();
    form.set('file', new Blob([new Uint8Array(file)], { type: mime }), filename);
    form.set('api_key', config.cloudinary.apiKey);
    form.set('timestamp', String(timestamp));
    form.set('folder', folder);
    form.set('signature', signature);
    let res: Response;
    try {
      res = await fetch(`${this.base(resourceType)}/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(resourceType === 'video' ? 120_000 : 30_000) });
    } catch {
      throw new AppError(502, 'storage_unreachable', 'Could not reach the image storage service. Please try again.');
    }
    const body: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = String(body?.error?.message ?? '');
      if (res.status === 401 || /api key|signature|cloud name/i.test(msg)) throw new AppError(502, 'storage_credentials', 'Image storage rejected the credentials. Check the CLOUDINARY_* settings.');
      throw new AppError(502, 'storage_error', `Image storage error: ${msg || res.status}`);
    }
    return { url: body.secure_url, publicId: body.public_id, width: body.width, height: body.height, bytes: body.bytes };
  }

  async destroy(publicId: string, resourceType: ResourceType = 'image'): Promise<boolean> {
    if (!this.configured) return false;
    const timestamp = Math.floor(Date.now() / 1000);
    const body = new URLSearchParams({ public_id: publicId, timestamp: String(timestamp), api_key: config.cloudinary.apiKey, signature: sign({ public_id: publicId, timestamp }, config.cloudinary.apiSecret) });
    try {
      const res = await fetch(`${this.base(resourceType)}/destroy`, { method: 'POST', body, signal: AbortSignal.timeout(15_000) });
      const j: any = await res.json().catch(() => ({}));
      return res.ok && (j.result === 'ok' || j.result === 'not found');
    } catch {
      return false;
    }
  }
}

export const imageStorage: ImageStorage = new CloudinaryStorage();

type AssetRef = string | { id: string; type?: ResourceType };

/**
 * Deletes provider assets that are no longer referenced by any property or website setting. Best effort: a storage
 * failure is logged and never fails the admin request. An asset still used elsewhere (e.g. a duplicated property, or
 * the hero image) is kept.
 */
export async function pruneUnusedAssets(refs: Array<AssetRef | null | undefined>, storage: ImageStorage = imageStorage): Promise<{ removed: string[]; kept: string[]; failed: string[] }> {
  const out = { removed: [] as string[], kept: [] as string[], failed: [] as string[] };
  const seen = new Map<string, ResourceType>();
  for (const r of refs) {
    if (!r) continue;
    const id = typeof r === 'string' ? r : r.id;
    if (id) seen.set(id, typeof r === 'string' ? 'image' : (r.type ?? 'image'));
  }
  if (!seen.size || !storage.configured) return out;
  for (const [id, type] of seen) {
    const { rowCount } = await query(
      `SELECT 1 FROM villa_images WHERE public_id = $1
       UNION ALL SELECT 1 FROM villas WHERE featured_image_public_id = $1
       UNION ALL SELECT 1 FROM site_settings WHERE left(key, 1) <> '_' AND position($1 in value::text) > 0 LIMIT 1`, [id]);
    if (rowCount) { out.kept.push(id); continue; }
    (await storage.destroy(id, type)) ? out.removed.push(id) : (out.failed.push(id), console.warn(`Could not remove unused asset "${id}" from ${storage.name}`));
  }
  return out;
}

const SIGNATURES: Array<[string, number[]]> = [['image/jpeg', [0xff, 0xd8, 0xff]], ['image/png', [0x89, 0x50, 0x4e, 0x47]], ['image/gif', [0x47, 0x49, 0x46, 0x38]]];
/** Detects the real image type from magic bytes (never trust the client-provided MIME type). */
export function sniffImageType(buf: Buffer): string | null {
  for (const [mime, sig] of SIGNATURES) if (sig.every((b, i) => buf[i] === b)) return mime;
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

/** MP4/MOV ('ftyp' box) and WebM (EBML header). Never trust the client-provided MIME type. */
export function sniffVideoType(buf: Buffer): string | null {
  if (buf.length > 12 && buf.subarray(4, 8).toString() === 'ftyp') return buf.subarray(8, 12).toString() === 'qt  ' ? 'video/quicktime' : 'video/mp4';
  if (buf.length > 4 && buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return 'video/webm';
  return null;
}
