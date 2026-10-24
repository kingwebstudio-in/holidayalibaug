/** Diagnoses configuration and connectivity. Usage:  npm run doctor  (never prints secrets) */
import { config } from '../config.js';
import { describeDbError } from '../db/diagnostics.js';
import { pendingMigrations } from '../db/migrate.js';
import { pool, query } from '../db/pool.js';

const ok = (m: string) => console.log(`  ✔ ${m}`);
const warn = (m: string) => console.log(`  ! ${m}`);
const bad = (m: string) => { console.log(`  ✖ ${m}`); process.exitCode = 1; };

console.log(`HolidayAlibag doctor — NODE_ENV=${config.NODE_ENV}`);
ok(`Configuration is valid. Data mode: ${config.dataMode}${config.isLocalMode ? ' (embedded demo database)' : ` → ${config.dbHost}${config.dbSsl ? ' (TLS)' : ''}`}`);
try {
  await query('SELECT 1');
  ok('Database is reachable');
  const pend = await pendingMigrations();
  pend.length ? bad(`Pending migrations: ${pend.join(', ')} — run: npm run db:migrate`) : ok('Schema is up to date');
  if (!pend.length) {
    const c = (await query(`SELECT (SELECT count(*) FROM villas) AS villas, (SELECT count(*) FROM villas WHERE is_published) AS pub, (SELECT count(*) FROM villas WHERE is_demo) AS demo, (SELECT count(*) FROM admin_users) AS admins`)).rows[0];
    ok(`${c.villas} properties (${c.pub} published, ${c.demo} demo) · ${c.admins} admin account(s)`);
    if (Number(c.admins) === 0) warn(config.isLocalMode ? 'No admin account yet — run: npm run local:setup' : 'No admin account yet — run: npm run admin:create');
    if (!config.isLocalMode && Number(c.demo) > 0) warn('Demo properties exist in this database. Remove them before launch: npm run db:remove-demo -- --yes');
  }
} catch (e) {
  bad(describeDbError(e));
}
config.cloudinary.configured ? ok('Cloudinary is configured (image uploads enabled)') : config.cloudinary.partial ? bad('Cloudinary is partly configured: need CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET') : warn('Cloudinary not configured — uploads disabled; use image URLs');
config.smtpConfigured ? ok('SMTP e-mail notifications configured') : warn('SMTP not configured — enquiries are saved but no e-mail alert is sent');
config.isProd && config.SESSION_SECRET.length >= 32 ? ok('SESSION_SECRET is set') : config.isProd ? bad('SESSION_SECRET missing/short') : ok('Development session secret (generated per run)');
await pool.end();
process.exit(process.exitCode ?? 0);
