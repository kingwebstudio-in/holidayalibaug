import { config } from '../config.js';
import { query, withTransaction } from '../db/pool.js';
import { audit } from './audit.js';
import { pruneUnusedAssets } from './imageStorage.js';
import type { SettingsInput } from '../validators/admin.js';

const KEYS = ['businessName', 'publicEmail', 'publicPhone', 'whatsappNumber', 'address', 'footerText', 'bookingInstructions', 'heroSupportingText', 'whatsappDefaultMessage', 'heroImage', 'heroVideo', 'socialLinks'] as const;

/** Provider asset ids referenced by website media settings (hero image, hero video, poster). */
const mediaAssets = (v: Record<string, any>) => [
  v.heroImage?.publicId && { id: v.heroImage.publicId, type: 'image' as const },
  v.heroVideo?.publicId && { id: v.heroVideo.publicId, type: 'video' as const },
  v.heroVideo?.posterPublicId && { id: v.heroVideo.posterPublicId, type: 'image' as const },
].filter(Boolean) as Array<{ id: string; type: 'image' | 'video' }>;

export async function getSettings() {
  const { rows } = await query(`SELECT key, value FROM site_settings`);
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const out: Record<string, any> = {};
  for (const k of KEYS) out[k] = stored[k] ?? null;
  out.socialLinks = { instagram: null, facebook: null, youtube: null, ...(stored.socialLinks ?? {}) };
  // Env fallback so a deployment can ship a verified number without touching the DB.
  if (!out.whatsappNumber && /^[1-9][0-9]{7,14}$/.test(config.WHATSAPP_NUMBER)) out.whatsappNumber = config.WHATSAPP_NUMBER;
  return out;
}

export async function updateSettings(adminId: string, patch: SettingsInput) {
  const before = mediaAssets(await getSettings());
  await withTransaction(async (c) => {
    for (const [key, value] of Object.entries(patch)) {
      if (!(KEYS as readonly string[]).includes(key) || value === undefined) continue;
      await c.query(
        `INSERT INTO site_settings (key, value, updated_by) VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
        [key, JSON.stringify(value), adminId],
      );
    }
    await audit(adminId, 'settings.update', 'settings', null, { keys: Object.keys(patch) }, c);
  });
  const after = await getSettings();
  const still = new Set(mediaAssets(after).map((a) => a.id));
  await pruneUnusedAssets(before.filter((a) => !still.has(a.id))); // replaced / removed hero media is deleted from storage when unused
  return after;
}
