/**
 * Creates an administrator account. Usage:  npm run admin:create
 *
 * Name and e-mail come from ADMIN_INITIAL_NAME / ADMIN_INITIAL_EMAIL (or prompts).
 * The password is ALWAYS typed at a hidden prompt unless ADMIN_INITIAL_PASSWORD is set
 * (intended only for automated provisioning — never commit it).
 */
import readline from 'node:readline';
import { pool, query } from '../db/pool.js';
import { createAdminUser } from '../services/auth.js';

function ask(question: string, hidden = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      (rl as any)._writeToOutput = (s: string) => { if (s.includes(question)) (rl as any).output.write(s); };
    }
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer.trim());
    });
  });
}

async function main() {
  const email = process.env.ADMIN_INITIAL_EMAIL || (await ask('Admin e-mail: '));
  const name = process.env.ADMIN_INITIAL_NAME || (await ask('Admin name: '));
  const role = (process.env.ADMIN_INITIAL_ROLE || 'owner') as 'owner' | 'admin' | 'staff';
  let password = process.env.ADMIN_INITIAL_PASSWORD || '';
  if (!password) {
    password = await ask('Password (min 12 chars, letters + numbers): ', true);
    const again = await ask('Repeat password: ', true);
    if (password !== again) throw new Error('Passwords do not match.');
  }
  const exists = await query(`SELECT 1 FROM admin_users WHERE lower(email) = lower($1)`, [email]);
  if (exists.rowCount) throw new Error(`An admin with e-mail ${email} already exists.`);
  const admin = await createAdminUser({ name, email, password, role });
  console.log(`Created ${admin.role} account for ${admin.email}. Sign in at /admin/login`);
}

main()
  .catch((e) => { console.error(`Error: ${e.message}`); process.exitCode = 1; })
  .finally(() => pool.end());
