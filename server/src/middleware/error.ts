import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../lib/errors.js';
import { config } from '../config.js';
import { classifyDbError } from '../db/diagnostics.js';

export const apiNotFound: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'not_found', message: 'Endpoint not found' } });
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'validation_error',
        message: 'Please correct the highlighted fields.',
        details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
      },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ success: false, error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, error: { code: 'invalid_json', message: 'Request body is not valid JSON.' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ success: false, error: { code: 'payload_too_large', message: 'Request body is too large.' } });
  }
  const db = classifyDbError(err);
  if (db) {
    if (!config.isTest) console.error(`[${req.method} ${req.path}] ${db.code}:`, err.message);
    // Public visitors never see operational hints (migration commands, connection problems); admins see them in the dashboard and logs.
    return res.status(503).json({ success: false, error: config.isProd ? { code: db.code, message: 'The service is temporarily unavailable. Please try again shortly.' } : db });
  }
  if (err?.code === '23505') {
    return res.status(409).json({ success: false, error: { code: 'conflict', message: 'A record with these details already exists.' } });
  }
  if (!config.isTest) console.error(`[${req.method} ${req.path}]`, err);
  return res.status(500).json({ success: false, error: { code: 'internal_error', message: 'Something went wrong on our side. Please try again.' } });
};
