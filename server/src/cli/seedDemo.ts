/**
 * Adds the illustrative DEMO properties (flagged is_demo). Usage:  npm run db:seed-demo
 *  - Idempotent: properties are matched by slug and never duplicated or overwritten.
 *  - Refuses to run in production unless --force is passed.
 *  - Creates no enquiries, admins or testimonials.
 */
import { config } from '../config.js';
import { seedDemoVillas } from '../db/demoData.js';
import { describeDbError } from '../db/diagnostics.js';
import { pool, withTransaction } from '../db/pool.js';
import { pendingMigrations } from '../db/migrate.js';

try {
  if (config.isProd && !process.argv.includes('--force')) throw new Error('Refusing to seed demo data in production (use --force to override).');
  if ((await pendingMigrations()).length) throw new Error('The database has pending migrations. Run: npm run db:migrate');
  const n = await withTransaction((c) => seedDemoVillas(c));
  console.log(n ? `Added ${n} DEMO properties (${config.dataMode} mode). Remove them later with: npm run db:remove-demo` : 'Demo properties already present — nothing added.');
} catch (e) {
  console.error(`Error: ${describeDbError(e)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
