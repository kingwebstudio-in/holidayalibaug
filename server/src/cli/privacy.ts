/**
 * Privacy-rights and retention tool for enquiry data. Dry-run by default; nothing is deleted without --yes.
 *
 *   npm run privacy -- export --email jane@example.com        print everything held about a person (access request)
 *   npm run privacy -- export --phone "+91 98200 12345"
 *   npm run privacy -- export --reference HA-20261023-ABC123
 *   npm run privacy -- erase  --email jane@example.com [--yes]  delete a person's enquiries (erasure request)
 *   npm run privacy -- purge  --older-than-days 730 [--yes]     delete enquiries older than the retention period you decided
 *
 * The retention period is a BUSINESS decision (see docs/LEGAL_REVIEW_CHECKLIST.md); nothing is purged automatically.
 * Deleting an enquiry also removes its notification log entries. Audit-log entries never contain personal data.
 */
import { describeDbError } from '../db/diagnostics.js';
import { pool, query } from '../db/pool.js';

const TABLES = ['booking_enquiries', 'villa_owner_enquiries', 'investment_enquiries'] as const;
const args = process.argv.slice(2);
const cmd = args[0];
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined; };
const confirmed = args.includes('--yes');
const digits = (s: string) => s.replace(/[^\d]/g, '');

function usage(): never {
  console.log('Usage: npm run privacy -- <export|erase|purge> [--email X | --phone X | --reference X | --older-than-days N] [--yes]');
  process.exit(2);
}

/** Returns the WHERE clause + params that identify one person (or one enquiry). */
function who(): { where: string; params: unknown[] } {
  const email = flag('email'), phone = flag('phone'), reference = flag('reference');
  const given = [email, phone, reference].filter(Boolean).length;
  if (given !== 1) { console.error('Provide exactly one of --email, --phone or --reference.'); usage(); }
  if (email) return { where: `lower(email) = lower($1)`, params: [email.trim()] };
  if (reference) return { where: `reference = $1`, params: [reference.trim().toUpperCase()] };
  const d = digits(phone!);
  if (d.length < 7) { console.error('That phone number looks too short to match safely.'); process.exit(2); }
  // Match on the last 10 digits so "+91 98200 12345" and "9820012345" find the same person.
  return { where: `right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = $1`, params: [d.slice(-10)] };
}

try {
  if (cmd === 'export') {
    const { where, params } = who();
    const out: Record<string, unknown[]> = {};
    for (const t of TABLES) out[t] = (await query(`SELECT * FROM ${t} WHERE ${where} ORDER BY created_at`, params)).rows;
    console.log(JSON.stringify(out, null, 2));
  } else if (cmd === 'erase') {
    const { where, params } = who();
    let total = 0;
    for (const t of TABLES) {
      const n = Number((await query(`SELECT count(*) FROM ${t} WHERE ${where}`, params)).rows[0].count);
      total += n;
      console.log(`${t}: ${n} matching record(s)`);
      if (confirmed && n) await query(`DELETE FROM ${t} WHERE ${where}`, params);
    }
    console.log(confirmed ? `Deleted ${total} record(s).` : `${total} record(s) would be deleted. Re-run with --yes to confirm. (Tip: run "export" first if you must keep a copy for a legal reason.)`);
  } else if (cmd === 'purge') {
    const days = Number(flag('older-than-days'));
    if (!Number.isInteger(days) || days < 30) { console.error('--older-than-days must be a whole number of at least 30 (a safety floor against typos).'); process.exit(2); }
    let total = 0;
    for (const t of TABLES) {
      const n = Number((await query(`SELECT count(*) FROM ${t} WHERE created_at < now() - ($1 || ' days')::interval`, [String(days)])).rows[0].count);
      total += n;
      console.log(`${t}: ${n} record(s) older than ${days} days`);
      if (confirmed && n) await query(`DELETE FROM ${t} WHERE created_at < now() - ($1 || ' days')::interval`, [String(days)]);
    }
    console.log(confirmed ? `Deleted ${total} record(s).` : `${total} record(s) would be deleted. Re-run with --yes to confirm.`);
  } else usage();
} catch (e) {
  console.error(`Error: ${describeDbError(e)}`);
  process.exitCode = 1;
} finally {
  await pool.end();
}
