export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
export const badRequest = (m: string, d?: unknown) => new AppError(400, 'bad_request', m, d);
export const unauthorized = (m = 'Authentication required') => new AppError(401, 'unauthorized', m);
export const forbidden = (m = 'You do not have permission to do that') => new AppError(403, 'forbidden', m);
export const notFound = (m = 'Not found') => new AppError(404, 'not_found', m);
export const conflict = (m: string) => new AppError(409, 'conflict', m);
export const unprocessable = (code: string, m: string, d?: unknown) => new AppError(422, code, m, d);
