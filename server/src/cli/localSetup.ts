/**
 * One-command local demo setup:  npm run local:setup
 * Creates the embedded database, applies migrations, loads the demo properties and — only if no admin exists —
 * creates a development administrator with a RANDOM password that is printed once. Never runs in production.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';
import { prepareDatabase } from '../db/bootstrap.js';
import { pool, query } from '../db/pool.js';
import { createAdminUser } from '../services/auth.js';

try {
  if (config.isProd) throw new Error('local:setup is a development tool and cannot run in production.');
  if (!config.isLocalMode) throw new Error('local:setup only works in local mode. Remove DATABASE_URL / set DATA_MODE=local, or use `npm run db:migrate` and `npm run admin:create` for PostgreSQL.');
  const r = await prepareDatabase();
  console.log(`Local database ready at ${config.localDataDir}${r.seeded ? ` (loaded ${r.seeded} demo properties)` : ''}.`);
  const has = (await query(`SELECT 1 FROM admin_users LIMIT 1`)).rowCount;
  if (has) console.log('An admin account already exists — nothing changed. (Forgot the password? Run: npm run local:reset -- --yes)');
  else {
    const email = process.env.ADMIN_INITIAL_EMAIL || 'admin@local.test';
    const password = process.env.ADMIN_INITIAL_PASSWORD || `Demo-${crypto.randomBytes(9).toString('base64url')}-9`;
    await createAdminUser({ name: process.env.ADMIN_INITIAL_NAME || 'Local Admin', email, password, role: 'owner' });
    console.log(`\nCreated a LOCAL DEMO administrator (shown once — copy it now):\n  e-mail:   ${email}\n  password: ${password}\n`);
  }
} catch (e) {
  console.error(`Error: ${(e as Error).message}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
