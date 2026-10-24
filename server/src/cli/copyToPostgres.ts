/**
 * Copies data from the LOCAL demo database to your real PostgreSQL/Supabase database. Usage:
 *   TARGET_DATABASE_URL=postgresql://… npm run data:copy-to-postgres -- [--include-demo] [--with-enquiries] [--with-admins]
 *
 * Safe by design: reads the local database, only INSERTS into the target (ON CONFLICT DO NOTHING — nothing is overwritten or deleted),
 * skips demo properties unless --include-demo, and requires the target schema to be migrated already. Admin password hashes are copied only with --with-admins.
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { config } from '../config.js';

if (!config.isLocalMode) { console.error('Run this in local mode (it reads the local database). Unset DATABASE_URL or set DATA_MODE=local, and pass the destination in TARGET_DATABASE_URL.'); process.exit(1); }
const target = process.env.TARGET_DATABASE_URL;
if (!target) { console.error('Set TARGET_DATABASE_URL to the destination connection string.'); process.exit(1); }
const flag = (f: string) => process.argv.includes(f);

const { pool: local } = await import('../db/pool.js');
const host = new URL(target).hostname;
const remote = new pg.Pool({ connectionString: target, ssl: ['localhost', '127.0.0.1'].includes(host) ? undefined : (process.env.DATABASE_SSL_CA ? { ca: fs.readFileSync(path.resolve(process.env.DATABASE_SSL_CA), 'utf8'), rejectUnauthorized: true } : { rejectUnauthorized: false }) });

const TABLES: Array<{ table: string; where?: string; when?: boolean }> = [
  { table: 'villas', where: flag('--include-demo') ? '' : 'WHERE NOT is_demo' },
  { table: 'villa_amenities', where: `WHERE villa_id IN (SELECT id FROM villas ${flag('--include-demo') ? '' : 'WHERE NOT is_demo'})` },
  { table: 'villa_images', where: `WHERE villa_id IN (SELECT id FROM villas ${flag('--include-demo') ? '' : 'WHERE NOT is_demo'})` },
  { table: 'testimonials' },
  { table: 'site_settings', where: `WHERE key NOT LIKE '\\_%'` },
  { table: 'admin_users', when: flag('--with-admins') },
  { table: 'booking_enquiries', when: flag('--with-enquiries') },
  { table: 'villa_owner_enquiries', when: flag('--with-enquiries') },
  { table: 'investment_enquiries', when: flag('--with-enquiries') },
];

try {
  const pending = await remote.query(`SELECT to_regclass('public.schema_migrations') AS t`);
  if (!pending.rows[0].t) throw new Error('The target database is not migrated. Run `DATABASE_URL=… npm run db:migrate` against it first.');
  for (const t of TABLES) {
    if (t.when === false) continue;
    const { rows } = await local.query(`SELECT * FROM ${t.table} ${t.where ?? ''}`);
    let inserted = 0;
    for (const r of rows) {
      const cols = Object.keys(r);
      const res = await remote.query(`INSERT INTO ${t.table} (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(',')}) ON CONFLICT DO NOTHING`, cols.map((c) => r[c]));
      inserted += res.rowCount ?? 0;
    }
    console.log(`${t.table.padEnd(24)} ${inserted}/${rows.length} copied`);
  }
  console.log('\nDone. Existing rows in the target were left untouched.');
} catch (e) {
  console.error(`Error: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await remote.end();
  await local.end();
}
