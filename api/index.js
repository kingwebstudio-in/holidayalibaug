// Vercel serverless entry point for the Express API (same domain as the Vite frontend).
// Loads the already-compiled server (server/dist, produced by `npm run build:all`).
import { createApp } from '../server/dist/app.js';
import { prepareDatabase } from '../server/dist/db/bootstrap.js';

let app;
let ready;

function init() {
  if (!ready) {
    ready = (async () => {
      await prepareDatabase();
      app = createApp();
    })().catch((error) => {
      ready = undefined; // allow the next request to retry
      throw error;
    });
  }
  return ready;
}

// A short, secret-free category for the failure, so it can be diagnosed from the browser.
// TEMPORARY: remove the `reason` field once the API works.
function classify(message) {
  const m = String(message || '');
  if (/authentication failed|credentials|password/i.test(m)) return 'db_auth';
  if (/Cannot resolve|ENOTFOUND/i.test(m)) return 'db_dns';
  if (/timed out|reset|ETIMEDOUT/i.test(m)) return 'db_timeout';
  if (/refused|ECONNREFUSED/i.test(m)) return 'db_refused';
  if (/not been migrated/i.test(m)) return 'migrations_pending';
  if (/ENOENT|no such file|migrations/i.test(m)) return 'migrations_files_missing';
  if (/SSL|TLS|certificate/i.test(m)) return 'db_tls';
  return 'other';
}

export default async function handler(req, res) {
  try {
    await init();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('HolidayAlibag API initialisation failed:', message);
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(
      JSON.stringify({
        success: false,
        error: { code: 'service_unavailable', message: 'The API is temporarily unavailable.', reason: classify(message) },
      }),
    );
    return;
  }
  return app(req, res);
}