// Spawns the real server / CLI as child processes: startup, persistence across restarts, and failure diagnostics.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');
const PW = 'Startup-Test-Pass-2026';
const baseEnv = (extra: Record<string, string>) => ({ PATH: process.env.PATH!, HOME: process.env.HOME ?? '', DOTENV_CONFIG_PATH: '/nonexistent/.env', NODE_ENV: 'development', ...extra });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hol-startup-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

function runCli(file: string, env: Record<string, string>) {
  const r = spawnSync('node', ['--import', 'tsx', file], { cwd: ROOT, env: baseEnv(env), encoding: 'utf8', timeout: 60_000 });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}
let nextPort = 4300 + Math.floor(Math.random() * 400);
async function startServer(env: Record<string, string>) {
  const port = nextPort++;
  const p = spawn('node', ['--import', 'tsx', 'server/src/index.ts'], { cwd: ROOT, env: baseEnv({ PORT: String(port), ...env }) });
  let out = '';
  p.stdout.on('data', (d) => (out += d)); p.stderr.on('data', (d) => (out += d));
  const exited = new Promise<number | null>((r) => p.on('exit', (c) => r(c)));
  const url = `http://127.0.0.1:${port}/api/v1`;
  const t0 = Date.now();
  while (Date.now() - t0 < 40_000) {
    if (p.exitCode !== null) break;
    try { if ((await fetch(`${url}/health`)).ok) break; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  return { url, output: () => out, exited, stop: async () => { if (p.exitCode === null) p.kill('SIGINT'); return exited; }, alive: () => p.exitCode === null };
}
const J = (h: Record<string, string> = {}) => ({ 'Content-Type': 'application/json', 'X-Requested-With': 'HolidayAlibagAdmin', ...h });

describe.skipIf(process.env.TEST_DATA_MODE !== 'local')('local demo mode lifecycle', () => {
  const dir = path.join(tmp, 'localdb');
  const env = { DATA_MODE: 'local', LOCAL_DATA_DIR: dir };

  it('starts with no DATABASE_URL, loads the demo dataset once, and serves the property API', async () => {
    const setup = runCli('server/src/cli/localSetup.ts', { ...env, ADMIN_INITIAL_EMAIL: 'dev@example.test', ADMIN_INITIAL_PASSWORD: PW });
    expect(setup.code).toBe(0);
    expect(setup.out).toMatch(/loaded 10 demo properties/);
    const s = await startServer(env);
    try {
      expect(s.alive(), s.output()).toBe(true);
      expect(s.output()).toMatch(/Data mode: LOCAL/);
      expect(s.output()).not.toContain(PW);
      const list = await (await fetch(`${s.url}/villas?pageSize=50`)).json();
      expect(list.meta.total).toBe(10);
      const health = (await (await fetch(`${s.url}/health`)).json()).data;
      expect(health.status).toBe('ok');
      expect(health.dataMode).toBeUndefined(); // no internal details on a public endpoint
    } finally { await s.stop(); }
  });

  it('keeps admin-created, edited, unpublished and deleted properties after a restart (no re-seeding)', async () => {
    let s = await startServer(env);
    let cookie = '';
    const api = async (method: string, p: string, body?: unknown) => {
      const r = await fetch(`${s.url}${p}`, { method, headers: J(cookie ? { Cookie: cookie } : {}), body: body ? JSON.stringify(body) : undefined });
      if (r.headers.get('set-cookie')) cookie = r.headers.get('set-cookie')!.split(';')[0];
      return { status: r.status, body: await r.json() };
    };
    let createdId = '';
    try {
      expect((await api('POST', '/admin/auth/login', { email: 'dev@example.test', password: PW })).status).toBe(200);
      const c = await api('POST', '/admin/villas', { name: 'Persisted Villa', propertyType: 'Family Holiday Villa', location: 'Alibaug', shortDescription: 's', fullDescription: 'A description that is long enough to publish.', bedrooms: 2, maxGuests: 4, featuredImage: '/demo-villas/palm.jpg', isPublished: true });
      expect(c.status).toBe(201);
      createdId = c.body.data.id;
      expect((await api('PUT', '/admin/settings', { whatsappNumber: '+91 91234 56789', whatsappDefaultMessage: 'Hello persist', heroImage: { url: '/demo-villas/ocean.jpg', alt: 'Persisted hero' }, heroVideo: { url: 'https://cdn.example.test/v.mp4', posterUrl: '/demo-villas/palm.jpg' } })).status).toBe(200);
      const demo = (await api('GET', '/admin/villas?demo=true&pageSize=50')).body.data;
      expect((await api('DELETE', `/admin/villas/${demo[0].id}`)).status).toBe(200); // delete one demo property
      expect((await api('PATCH', `/admin/villas/${demo[1].id}/publish`, { isPublished: false })).status).toBe(200); // unpublish another
      expect((await api('PUT', `/admin/villas/${createdId}`, { name: 'Persisted Villa Edited', propertyType: 'Family Holiday Villa', location: 'Alibaug', shortDescription: 's', fullDescription: 'A description that is long enough to publish.', bedrooms: 2, maxGuests: 4, featuredImage: '/demo-villas/palm.jpg', isPublished: true, startingPrice: 12345 })).status).toBe(200);
    } finally { await s.stop(); }

    s = await startServer(env); // ── restart ──
    try {
      expect(s.alive(), s.output()).toBe(true);
      expect(s.output()).not.toMatch(/Loaded \d+ DEMO/); // demo data is NOT loaded again
      const list = (await (await fetch(`${s.url}/villas?pageSize=50`)).json());
      expect(list.meta.total).toBe(9); // 10 demo −1 deleted −1 unpublished +1 created
      const mine = list.data.find((v: any) => v.slug === 'persisted-villa');
      expect(mine).toMatchObject({ name: 'Persisted Villa Edited', startingPrice: 12345 });
      expect(list.data.find((v: any) => v.id === createdId)).toBeTruthy();
      const st = (await (await fetch(`${s.url}/settings/public`)).json()).data;
      expect(st).toMatchObject({ whatsappNumber: '919123456789', whatsappDefaultMessage: 'Hello persist', heroImage: { url: '/demo-villas/ocean.jpg', alt: 'Persisted hero' }, heroVideo: { url: 'https://cdn.example.test/v.mp4', posterUrl: '/demo-villas/palm.jpg' } }); // WhatsApp + media settings survive a restart
      // admin account also persisted
      expect((await api('POST', '/admin/auth/login', { email: 'dev@example.test', password: PW })).status).toBe(200);
    } finally { await s.stop(); }
  });

  it('local:reset refuses without --yes and never touches data in that case', () => {
    const r = runCli('server/src/cli/localReset.ts', env);
    expect(r.out).toMatch(/--yes/);
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('starts even when Cloudinary is only partly configured (uploads disabled, site works)', async () => {
    const s = await startServer({ ...env, CLOUDINARY_CLOUD_NAME: 'only-name' });
    try {
      expect(s.alive(), s.output()).toBe(true);
      expect(s.output()).toMatch(/only partly configured/);
      expect((await fetch(`${s.url}/villas`)).status).toBe(200);
    } finally { await s.stop(); }
  });
});

describe.skipIf(process.env.TEST_DATA_MODE !== 'local')('safe failure — clear diagnostics, no silent fallback', () => {
  const secret = 'sekrit-pw-123';
  const run = (env: Record<string, string>) => runCli('server/src/index.ts', env);

  it('rejects a malformed DATABASE_URL without echoing it', () => {
    const r = run({ DATA_MODE: 'postgres', DATABASE_URL: `mysql://u:${secret}@h/db` });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/not a valid PostgreSQL connection string/);
    expect(r.out).not.toContain(secret);
  });
  it('postgres mode without DATABASE_URL fails (does not drop to demo data)', () => {
    const r = run({ DATA_MODE: 'postgres' });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/requires DATABASE_URL/);
  });
  it('reports an unreachable database clearly', () => {
    const r = run({ DATABASE_URL: `postgresql://u:${secret}@127.0.0.1:1/db`, DATABASE_SSL: 'false' });
    expect(r.code).not.toBe(0);
    expect(r.out).toMatch(/connection refused/i);
    expect(r.out).not.toContain(secret);
  });
  it.skipIf(!process.env.TEST_PG_URL_BASE)('reports bad credentials, a missing database and an unmigrated schema', () => {
    const base = process.env.TEST_PG_URL_BASE!; // e.g. postgresql://holiday:pw@127.0.0.1:5432
    const user = new URL(base).username;
    expect(run({ DATABASE_URL: `postgresql://${user}:wrong-${secret}@${new URL(base).host}/postgres`, DATABASE_SSL: 'false' }).out).toMatch(/authentication failed|rejected the credentials/i);
    expect(run({ DATABASE_URL: `${base}/no_such_db_xyz`, DATABASE_SSL: 'false' }).out).toMatch(/does not exist/i);
    const unmigrated = run({ DATABASE_URL: `${base}/hol_empty_test`, DATABASE_SSL: 'false' });
    expect(unmigrated.code).not.toBe(0);
    expect(unmigrated.out).toMatch(/npm run db:migrate/);
  });
  it('production never falls back to local demo data and never uses weak secrets', () => {
    const noDb = run({ NODE_ENV: 'production', SESSION_SECRET: 'x'.repeat(40) });
    expect(noDb.code).not.toBe(0);
    expect(noDb.out).toMatch(/Production never falls back to local demo data/);
    const local = run({ NODE_ENV: 'production', DATA_MODE: 'local', SESSION_SECRET: 'x'.repeat(40) });
    expect(local.code).not.toBe(0);
    expect(local.out).toMatch(/not allowed in production/);
    const weak = run({ NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/db', SESSION_SECRET: 'short' });
    expect(weak.out).toMatch(/SESSION_SECRET/);
    // New launch guards: every one of these must stop the server from starting.
    const prod = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/db', DATA_MODE: 'postgres', SESSION_SECRET: 'aB3dE5gH7jK9mN1pQ3sT5vW7yZ9bC1dF3hJ5' };
    expect(run({ ...prod, TRUST_PROXY: '1' }).out).toMatch(/SITE_URL is required in production/);
    expect(run({ ...prod, SITE_URL: 'https://holidayalibag.com' }).out).toMatch(/TRUST_PROXY must be set explicitly/);
    expect(run({ ...prod, SITE_URL: 'http://holidayalibag.com', TRUST_PROXY: '1' }).out).toMatch(/SITE_URL must use https/);
    expect(run({ ...prod, SITE_URL: 'https://localhost', TRUST_PROXY: '1' }).out).toMatch(/not localhost/);
    expect(run({ ...prod, SITE_URL: 'https://holidayalibag.com', TRUST_PROXY: 'true' }).out).toMatch(/TRUST_PROXY=true would trust any/);
    expect(run({ ...prod, SITE_URL: 'https://holidayalibag.com', TRUST_PROXY: 'false' }).out).toMatch(/FORCE_HTTPS needs TRUST_PROXY/);
    expect(run({ ...prod, SESSION_SECRET: 'change-me-change-me-change-me-change-me', SITE_URL: 'https://holidayalibag.com', TRUST_PROXY: '1' }).out).toMatch(/placeholder or a low-entropy/);
    expect(run({ ...prod, SITE_URL: 'https://holidayalibag.com', TRUST_PROXY: '1', ANALYTICS_MEASUREMENT_ID: 'UA-1' }).out).toMatch(/ANALYTICS_MEASUREMENT_ID/);
    expect(runCli('server/src/cli/localSetup.ts', { NODE_ENV: 'production', DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/db', SESSION_SECRET: 'x'.repeat(40), DATA_MODE: 'postgres' }).code).not.toBe(0);
  });
});
