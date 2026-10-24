/** Deletes the local demo database (all local properties, enquiries and admin accounts). Usage:  npm run local:reset -- --yes */
import fs from 'node:fs';
import { config } from '../config.js';

if (!config.isLocalMode) { console.error('Not in local mode — refusing. This command never touches a PostgreSQL/Supabase database.'); process.exit(1); }
if (config.isProd) { console.error('Refusing to run in production.'); process.exit(1); }
if (!process.argv.includes('--yes')) { console.log(`This will permanently delete ${config.localDataDir}.\nRe-run with --yes to confirm. To keep your data, copy it first with: npm run data:copy-to-postgres`); process.exit(0); }
fs.rmSync(config.localDataDir, { recursive: true, force: true });
console.log('Local demo data deleted. Run `npm run local:setup` to start fresh.');
