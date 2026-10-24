import { config } from '../config.js';
import { pool, withTransaction } from './pool.js';
import { describeDbError } from './diagnostics.js';
import { pendingMigrations, runMigrations } from './migrate.js';
import { seedDemoVillas } from './demoData.js';

export class StartupError extends Error {}

const SEED_MARKER = '_demo_seeded';

/**
 * Prepares the database for the active mode.
 *  - local:    creates/opens the on-disk database, applies migrations, loads demo villas ONCE (never again, so edits and deletions persist).
 *  - postgres: verifies connectivity and that migrations were applied. It never migrates or seeds automatically and never
 *              falls back to local data.
 */
export async function prepareDatabase(opts: { migrate?: boolean; seedDemo?: boolean } = {}): Promise<{ mode: string; seeded: number; applied: string[] }> {
  let applied: string[] = [];
  let seeded = 0;
  try {
    if (config.isLocalMode || opts.migrate) {
      applied = await runMigrations(() => undefined);
    } else {
      await pool.query('SELECT 1');
      const pending = await pendingMigrations();
      if (pending.length) {
        throw new StartupError(`The database has not been migrated (${pending.length} pending: ${pending.join(', ')}). Run: npm run db:migrate`);
      }
    }
    if ((config.isLocalMode && config.LOCAL_AUTO_SEED === 'true') || opts.seedDemo) {
      const marker = await pool.query(`SELECT 1 FROM site_settings WHERE key = $1`, [SEED_MARKER]);
      if (!marker.rowCount) {
        seeded = await withTransaction(async (c) => {
          const n = (await c.query(`SELECT count(*) FROM villas`)).rows[0].count === '0' ? await seedDemoVillas(c) : 0;
          await c.query(`INSERT INTO site_settings (key, value) VALUES ($1, 'true'::jsonb) ON CONFLICT (key) DO NOTHING`, [SEED_MARKER]);
          return n;
        });
      }
    }
  } catch (e) {
    if (e instanceof StartupError) throw e;
    throw new StartupError(describeDbError(e));
  }
  return { mode: config.dataMode, seeded, applied };
}
