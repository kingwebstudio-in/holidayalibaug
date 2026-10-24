// Vercel serverless entry point for the Express API (same domain as the Vite frontend).
// It loads the already-compiled server (server/dist, produced by `npm run build:all`),
// so Vercel never has to compile the server's TypeScript.
import { createApp } from '../server/dist/app.js';
import { prepareDatabase } from '../server/dist/db/bootstrap.js';

let app;
let ready;

// Initialise once per warm instance. If it fails (e.g. a transient database error),
// forget the failure so the next request tries again instead of failing until the instance is recycled.
function init() {
  if (!ready) {
    ready = (async () => {
      await prepareDatabase();
      app = createApp();
    })().catch((error) => {
      ready = undefined;
      throw error;
    });
  }
  return ready;
}

export default async function handler(req, res) {
  try {
    await init();
  } catch (error) {
    console.error('HolidayAlibag API initialisation failed:', error instanceof Error ? error.message : 'Unknown error');
    res.statusCode = 503;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ success: false, error: { code: 'service_unavailable', message: 'The API is temporarily unavailable.' } }));
    return;
  }
  return app(req, res);
}