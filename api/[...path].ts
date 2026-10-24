
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createApp } from '../server/src/app.js';
import { prepareDatabase } from '../server/src/db/bootstrap.js';

const app = createApp();

let initialization: Promise<unknown> | undefined;

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    initialization ??= prepareDatabase();
    await initialization;

    return app(req, res);
  } catch (error) {
    console.error(
      'HolidayAlibaug API initialization failed:',
      error instanceof Error ? error.message : 'Unknown error',
    );

    return res.status(503).json({
      success: false,
      error: {
        code: 'service_unavailable',
        message: 'The API is temporarily unavailable.',
      },
    });
  }
}
