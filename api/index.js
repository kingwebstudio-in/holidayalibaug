// Vercel serverless entry point for the Express API (same domain as the Vite frontend).
// Loads the already-compiled server (server/dist, produced by `npm run build:all`).
import { createApp } from '../server/dist/app.js';
import { prepareDatabase } from '../server/dist/db/bootstrap.js';

let app;
let ready;
let failedStage = 'database';

function init() {
  if (!ready) {
    ready = (async () => {
      failedStage = 'database';
      await prepareDatabase();
      failedStage = 'app';
      app = createApp();
    })().catch((error) => {
      ready = undefined; // allow the next request to retry
      throw error;
    });
  }
  return ready;
}

// TEMPORARY DIAGNOSTIC: a short, scrubbed version of the startup error. Remove `stage` and `detail` once the API works.
function scrub(message) {
  return String(message || '')
    .replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, '<hidden>') // any URL, including database URLs
    .replace(/[\w.+-]+@[\w.-]+/g, '<hidden>')           // e-mail-like or user@host text
    .replace(/(password|passwd|secret|token|key)\s*[=:]\s*\S+/gi, '$1=<hidden>')
    .slice(0, 220);
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
        error: {
          code: 'service_unavailable',
          message: 'The API is temporarily unavailable.',
          stage: failedStage,
          detail: scrub(message),
        },
      }),
    );
    return;
  }
  return app(req, res);
}