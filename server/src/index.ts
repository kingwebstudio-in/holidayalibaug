import { createApp } from './app.js';
import { config } from './config.js';
import { StartupError, prepareDatabase } from './db/bootstrap.js';
import { pool } from './db/pool.js';

async function main() {
  const where = config.isLocalMode ? `embedded database at ${config.localDataDir}` : `PostgreSQL at ${config.dbHost}${config.dbSsl ? ' (TLS)' : ''}`;
  console.log(`Data mode: ${config.dataMode.toUpperCase()} — ${where}`);
  const r = await prepareDatabase();
  if (r.applied.length) console.log(`Applied migrations: ${r.applied.join(', ')}`);
  if (r.seeded) console.log(`Loaded ${r.seeded} DEMO properties (sample content, flagged as demo).`);
  if (config.isLocalMode) console.log('⚠ LOCAL DEMO MODE: data stays on this machine. Set DATABASE_URL (Supabase) for real data — see README.');

  const app = createApp();
  const server = app.listen(config.PORT, () => {
    console.log(`HolidayAlibag API listening on http://localhost:${config.PORT} (${config.NODE_ENV})`);
    console.log(`Image uploads: ${config.cloudinary.configured ? 'Cloudinary' : 'not configured (add image URLs instead)'} · E-mail notifications: ${config.smtpConfigured ? 'SMTP' : 'not configured'}`);
    if (config.cloudinary.partial) console.warn('⚠ Cloudinary is only partly configured (need cloud name, API key and API secret) — uploads are disabled.');
  });
  // Slow-client (slowloris) protection; uploads of up to 50 MB still have two minutes.
  server.headersTimeout = 15_000;
  server.requestTimeout = 120_000;
  server.keepAliveTimeout = 65_000; // longer than typical load-balancer idle timeouts (60 s) to avoid sporadic 502s
  const shutdown = () => server.close(() => pool.end().finally(() => process.exit(0)));
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((e) => {
  console.error(`\n✖ Cannot start the API: ${e instanceof StartupError ? e.message : (e as Error).message}\n  Run \`npm run doctor\` for a full diagnosis.\n`);
  process.exit(1);
});
