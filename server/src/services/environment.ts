import { config } from '../config.js';
import { pendingMigrations } from '../db/migrate.js';
import { query } from '../db/pool.js';
import { describeDbError } from '../db/diagnostics.js';
import { imageStorage } from './imageStorage.js';
import { getSettings } from './settings.js';

/** Non-sensitive status for the admin dashboard. Never includes passwords, secrets, API keys or full connection strings. */
export async function getEnvironmentStatus() {
  let db: { connected: boolean; error?: string; pendingMigrations: string[]; demoProperties: number; totalProperties: number } = { connected: false, pendingMigrations: [], demoProperties: 0, totalProperties: 0 };
  try {
    const counts = (await query(`SELECT count(*) AS total, count(*) FILTER (WHERE is_demo) AS demo FROM villas`)).rows[0];
    db = { connected: true, pendingMigrations: await pendingMigrations(), demoProperties: Number(counts.demo), totalProperties: Number(counts.total) };
  } catch (e) {
    db.error = describeDbError(e);
  }
  let whatsappSet = true;
  try { whatsappSet = !!(await getSettings()).whatsappNumber; } catch { /* reported via database status */ }
  return {
    nodeEnv: config.NODE_ENV,
    dataMode: config.dataMode,
    database: {
      engine: config.isLocalMode ? 'Embedded PostgreSQL (local demo)' : 'PostgreSQL',
      host: config.isLocalMode ? 'this machine' : config.dbHost,
      tls: config.isLocalMode ? false : config.dbSsl,
      ...db,
    },
    imageStorage: { provider: imageStorage.configured ? imageStorage.name : 'none', configured: imageStorage.configured, partiallyConfigured: config.cloudinary.partial },
    email: { configured: config.smtpConfigured },
    whatsapp: { configured: whatsappSet },
    warnings: [
      ...(whatsappSet ? [] : ['No WhatsApp number is set — the floating WhatsApp button and “Send on WhatsApp” actions are hidden. Add one under Website Content / Media.']),
      ...(config.isLocalMode ? ['LOCAL DEMO MODE: data is stored on this machine only. Configure DATABASE_URL (Supabase) for real data.'] : []),
      ...(db.demoProperties > 0 ? [`${db.demoProperties} sample (demo) ${db.demoProperties === 1 ? 'property is' : 'properties are'} present. Delete them before going live.`] : []),
      ...(config.cloudinary.partial ? ['Cloudinary is only partly configured — uploads are disabled.'] : []),
      ...(db.pendingMigrations.length ? [`Pending migrations: ${db.pendingMigrations.join(', ')} — run npm run db:migrate.`] : []),
    ],
  };
}

/** What the public site may know: just enough to show a "demo data" indicator. */
export async function getPublicEnvironment() {
  let demoData = config.isLocalMode;
  if (!demoData) {
    try { demoData = (await query(`SELECT 1 FROM villas WHERE is_published AND is_demo LIMIT 1`)).rowCount! > 0; } catch { /* ignore */ }
  }
  return { demoData };
}
