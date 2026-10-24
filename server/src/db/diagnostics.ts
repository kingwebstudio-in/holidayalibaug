import { config } from '../config.js';

/** Turns low-level database errors into actionable, non-sensitive messages. */
export function describeDbError(e: any): string {
  const code = e?.code as string | undefined;
  const host = config.dbHost || 'the database host';
  switch (code) {
    case 'ECONNREFUSED':
      return `Cannot connect to PostgreSQL at ${host}: connection refused. Is the database running and is the host/port in DATABASE_URL correct?`;
    case 'ENOTFOUND':
    case 'EAI_AGAIN':
      return `Cannot resolve the database host "${host}". Check the host name in DATABASE_URL and your internet connection. (Supabase: some networks only support the IPv4 "Session pooler" connection string.)`;
    case 'ETIMEDOUT':
    case 'ECONNRESET':
      return `Connection to ${host} timed out or was reset. Check your network/firewall, and DATABASE_SSL if the provider requires TLS.`;
    case '28P01':
    case '28000':
      return `PostgreSQL rejected the credentials (authentication failed). Check the user and password in DATABASE_URL (URL-encode special characters in the password).`;
    case '3D000':
      return `The database named in DATABASE_URL does not exist.`;
    case '42P01':
      return `The database schema is missing (table not found). Run: npm run db:migrate`;
    case '42703':
      return `The database schema is out of date (column not found). Run: npm run db:migrate`;
    default:
      if (/SSL|TLS|certificate/i.test(e?.message ?? '')) return `TLS/SSL problem talking to ${host}: ${e.message}. Try DATABASE_SSL=true (or false for a local server without TLS).`;
      return e?.message ? String(e.message) : 'Unknown database error';
  }
}

/** HTTP-level classification used by the API error handler. */
export function classifyDbError(e: any): { code: string; message: string } | null {
  const code = e?.code as string | undefined;
  if (!code) return null;
  if (['42P01', '42703'].includes(code)) return { code: 'schema_not_migrated', message: 'The database schema is not up to date. The site owner must run `npm run db:migrate`.' };
  if (['ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ETIMEDOUT', 'ECONNRESET', '28P01', '28000', '3D000', '57P01', '53300'].includes(code))
    return { code: 'database_unavailable', message: 'The database is currently unreachable. Please try again shortly.' };
  return null;
}
