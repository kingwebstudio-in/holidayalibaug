/** Deletes every property flagged as demo/sample content. Usage:  npm run db:remove-demo -- --yes */
import { describeDbError } from '../db/diagnostics.js';
import { pool, query } from '../db/pool.js';

try {
  const n = Number((await query(`SELECT count(*) FROM villas WHERE is_demo`)).rows[0].count);
  if (!process.argv.includes('--yes')) {
    console.log(`${n} demo ${n === 1 ? 'property' : 'properties'} would be deleted. Re-run with --yes to confirm.`);
  } else {
    await query(`DELETE FROM villas WHERE is_demo`);
    console.log(`Deleted ${n} demo ${n === 1 ? 'property' : 'properties'}. Real properties and enquiries were not touched.`);
  }
} catch (e) {
  console.error(`Error: ${describeDbError(e)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
