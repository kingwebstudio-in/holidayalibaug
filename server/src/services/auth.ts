import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';
import { query } from '../db/pool.js';
import { AppError, unauthorized } from '../lib/errors.js';
import { passwordPolicy } from '../validators/admin.js';

const BCRYPT_COST = config.isTest ? 4 : 12;
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;
// Compared against when the e-mail is unknown, so timing does not reveal which accounts exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', BCRYPT_COST);

export interface AdminIdentity {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
}

export const hashPassword = (pw: string) => bcrypt.hash(pw, BCRYPT_COST);

const hashToken = (token: string) => crypto.createHmac('sha256', config.SESSION_SECRET).update(token).digest('hex');

const GENERIC_LOGIN_ERROR = 'Invalid email or password, or too many attempts. Please try again later.';

export async function login(email: string, password: string, ip?: string, userAgent?: string) {
  const { rows } = await query(
    `SELECT id, name, email, role, password_hash, is_active, failed_login_attempts, locked_until
       FROM admin_users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
  const user = rows[0];
  const hash = user?.password_hash ?? DUMMY_HASH;
  const passwordOk = await bcrypt.compare(password, hash);
  const locked = user?.locked_until && new Date(user.locked_until) > new Date();

  if (!user || !user.is_active || locked || !passwordOk) {
    if (user && user.is_active && !locked) {
      const attempts = user.failed_login_attempts + 1;
      if (attempts >= MAX_FAILED) {
        await query(`UPDATE admin_users SET failed_login_attempts = 0, locked_until = now() + ($2 || ' minutes')::interval WHERE id = $1`, [user.id, String(LOCK_MINUTES)]);
      } else {
        await query(`UPDATE admin_users SET failed_login_attempts = $2 WHERE id = $1`, [user.id, attempts]);
      }
    }
    throw new AppError(401, 'invalid_credentials', GENERIC_LOGIN_ERROR);
  }

  await query(`UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`, [user.id]);
  await query(`DELETE FROM admin_sessions WHERE expires_at < now()`);

  const token = crypto.randomBytes(32).toString('base64url');
  await query(
    `INSERT INTO admin_sessions (admin_id, token_hash, expires_at, ip, user_agent)
     VALUES ($1, $2, now() + ($3 || ' hours')::interval, $4, $5)`,
    [user.id, hashToken(token), String(config.SESSION_TTL_HOURS), ip ?? null, (userAgent ?? '').slice(0, 300)],
  );
  const admin: AdminIdentity = { id: user.id, name: user.name, email: user.email, role: user.role };
  return { token, admin };
}

export async function getAdminBySessionToken(token: string): Promise<AdminIdentity | null> {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.role
       FROM admin_sessions s JOIN admin_users u ON u.id = s.admin_id
      WHERE s.token_hash = $1 AND s.expires_at > now() AND u.is_active`,
    [hashToken(token)],
  );
  return rows[0] ?? null;
}

export async function logout(token: string) {
  await query(`DELETE FROM admin_sessions WHERE token_hash = $1`, [hashToken(token)]);
}

export async function changePassword(adminId: string, currentPassword: string, newPassword: string, keepToken?: string) {
  const { rows } = await query(`SELECT password_hash FROM admin_users WHERE id = $1`, [adminId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    throw new AppError(400, 'wrong_password', 'Your current password is incorrect.');
  }
  await query(`UPDATE admin_users SET password_hash = $2 WHERE id = $1`, [adminId, await hashPassword(newPassword)]);
  // Sign out every other device.
  await query(`DELETE FROM admin_sessions WHERE admin_id = $1 AND ($2::text IS NULL OR token_hash <> $2)`, [adminId, keepToken ? hashToken(keepToken) : null]);
}

export async function createAdminUser(input: { name: string; email: string; password: string; role?: 'owner' | 'admin' | 'staff' }) {
  const pw = passwordPolicy.safeParse(input.password);
  if (!pw.success) throw new Error(pw.error.issues.map((i) => i.message).join('; '));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) throw new Error('Invalid e-mail address');
  if (input.password.toLowerCase().includes(input.email.split('@')[0].toLowerCase()) && input.email.split('@')[0].length > 3) {
    throw new Error('Password must not contain the e-mail name');
  }
  const { rows } = await query(
    `INSERT INTO admin_users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role`,
    [input.name.trim(), input.email.trim(), await hashPassword(input.password), input.role ?? 'owner'],
  );
  return rows[0];
}

export const requireIdentity = (a: AdminIdentity | undefined): AdminIdentity => {
  if (!a) throw unauthorized();
  return a;
};
