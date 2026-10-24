import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export const migrationFiles = () => fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();

/** Names of migration files that have not been applied yet (empty if the tracking table does not exist). */
export async function pendingMigrations(): Promise<string[]> {
  const t = await pool.query(`SELECT to_regclass('public.schema_migrations') AS t`);
  if (!t.rows[0].t) return migrationFiles();
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  return migrationFiles().filter((f) => !done.has(f));
}

export async function runMigrations(log: (m: string) => void = console.log): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
    // Serialise concurrent runners.
    await client.query('SELECT pg_advisory_lock(727001)');
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const file of migrationFiles()) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(dir, file), 'utf8');
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        applied.push(file);
        log(`applied ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${file} failed: ${(err as Error).message}`);
      }
    }
    if (!applied.length) log('database is up to date');
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => undefined);
    client.release();
  }
  return applied;
}

// CLI entry: `npm run db:migrate`
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const { describeDbError } = await import('./diagnostics.js');
  console.log(`Data mode: ${(await import('../config.js')).config.dataMode}`);
  runMigrations()
    .then(() => pool.end())
    .catch(async (e) => {
      console.error(`\n✖ ${describeDbError(e)}\n`);
      await pool.end().catch(() => undefined);
      process.exit(1);
    });
}
