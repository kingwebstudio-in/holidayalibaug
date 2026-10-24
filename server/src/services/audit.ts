import type { PoolClient } from 'pg';
import { query } from '../db/pool.js';

/** Logs what an admin did. Never pass customer personal data in `meta`. */
export async function audit(adminId: string | null, action: string, entityType: string, entityId: string | null, meta: Record<string, unknown> = {}, client?: PoolClient) {
  const run = client ? client.query.bind(client) : query;
  await run(`INSERT INTO audit_log (admin_id, action, entity_type, entity_id, meta) VALUES ($1,$2,$3,$4,$5)`, [adminId, action, entityType, entityId, JSON.stringify(meta)]);
}
