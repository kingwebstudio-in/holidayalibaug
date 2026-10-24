import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

declare module 'express-serve-static-core' {
  interface Request {
    parsed?: any;
  }
}

/** Parses req.body with a zod schema and stores the result in req.parsed. */
export const validateBody =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    try {
      req.parsed = schema.parse(req.body ?? {});
      next();
    } catch (e) {
      next(e);
    }
  };

export const validateQuery =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    try {
      req.parsed = schema.parse(req.query ?? {});
      next();
    } catch (e) {
      next(e);
    }
  };

export const validateParams =
  (schema: ZodType): RequestHandler =>
  (req, _res, next) => {
    try {
      schema.parse(req.params);
      next();
    } catch (e) {
      next(e);
    }
  };
