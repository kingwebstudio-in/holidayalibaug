import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { config } from '../config.js';

/**
 * One data-access API, two engines:
 *  - postgres mode: a normal `pg` pool (Supabase / any PostgreSQL).
 *  - local mode:    an embedded PostgreSQL (PGlite) persisted to a directory on disk.
 * Both speak the same SQL and run the same migrations, so every service, validation rule and
 * business rule behaves identically in both modes.
 */

pg.types.setTypeParser(1082, (v: string) => v); // DATE → 'YYYY-MM-DD' string (no timezone shifting)

type Result = { rows: any[]; rowCount: number };

/** Minimal pg.Pool look-alike over PGlite. A mutex serialises access: PGlite has a single connection, and
 *  a transaction (BEGIN…COMMIT) must never interleave with another request's statements. */
class LocalPool {
  private dbp: Promise<any> | null = null;
  private tail: Promise<void> = Promise.resolve();
  private closed = false;

  private db() {
    this.dbp ??= (async () => {
      const { PGlite } = await import('@electric-sql/pglite');
      const dir = config.localDataDir;
      const target = dir.startsWith('memory://') ? dir : path.resolve(dir);
      if (!target.startsWith('memory://')) fs.mkdirSync(target, { recursive: true });
      const db = new PGlite(target, { parsers: { 1082: (v: string) => v, 20: (v: string) => v } });
      await db.waitReady;
      return db;
    })();
    return this.dbp;
  }

  private acquire(): Promise<() => void> {
    let release!: () => void;
    const prev = this.tail;
    this.tail = new Promise<void>((r) => (release = r));
    return prev.then(() => release);
  }

  private async run(text: string, params?: unknown[]): Promise<Result> {
    if (this.closed) throw new Error('Local database is closed');
    const db = await this.db();
    if (!params || params.length === 0) {
      const results = await db.exec(text);
      const last = results[results.length - 1];
      const rows = last?.rows ?? [];
      return { rows, rowCount: rows.length || last?.affectedRows || 0 };
    }
    const r = await db.query(text, params);
    return { rows: r.rows, rowCount: r.rows.length || r.affectedRows || 0 };
  }

  async query(text: string, params?: unknown[]): Promise<Result> {
    const release = await this.acquire();
    try {
      return await this.run(text, params);
    } finally {
      release();
    }
  }

  async connect() {
    const release = await this.acquire();
    let released = false;
    return {
      query: (text: string, params?: unknown[]) => this.run(text, params),
      release: () => {
        if (!released) { released = true; release(); }
      },
    };
  }

  on() { /* pg.Pool compatibility */ }

  async end() {
    this.closed = true;
    if (this.dbp) await (await this.dbp).close();
  }
}

function makePool(): pg.Pool {
  if (config.isLocalMode) return new LocalPool() as unknown as pg.Pool;
  const ca = config.DATABASE_SSL_CA ? (fs.readFileSync(config.DATABASE_SSL_CA, 'utf8')) : undefined;
  const p = new pg.Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.dbSsl ? (ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }) : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 8_000,
  });
  p.on('error', (err) => console.error('Unexpected PostgreSQL pool error:', err.message));
  return p;
}

export const pool: pg.Pool = makePool();

export async function query<T extends pg.QueryResultRow = any>(text: string, params?: unknown[]) {
  return pool.query<T>(text, params as any[]);
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
