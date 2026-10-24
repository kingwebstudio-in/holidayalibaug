import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Configure Cloudinary BEFORE the app modules load (config is read once at import time).
process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
process.env.CLOUDINARY_API_KEY = 'key123';
process.env.CLOUDINARY_API_SECRET = 'supersecret';
process.env.CLOUDINARY_FOLDER = 'hol/test';
const { H, closePool, loginAs, resetDb, setupDb } = await import('./helpers.js');
const { query } = await import('../src/db/pool.js');

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(closePool);
afterEach(() => vi.restoreAllMocks());

const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 2)]);

function mockCloudinary() {
  const calls: Array<{ url: string; body: any }> = [];
  const real = globalThis.fetch;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = String(input);
    if (!url.startsWith('https://api.cloudinary.com/')) return real(input, init);
    calls.push({ url, body: init?.body });
    if (url.endsWith('/upload')) return new Response(JSON.stringify({ secure_url: 'https://res.cloudinary.com/demo-cloud/image/upload/v1/hol/test/abc.jpg', public_id: 'hol/test/abc', width: 800, height: 600, bytes: 68 }), { status: 200 });
    return new Response(JSON.stringify({ result: 'ok' }), { status: 200 });
  });
  return calls;
}

describe('Cloudinary uploads (mocked Cloudinary API)', () => {
  it('uploads a validated image with a correct signature and returns its URL and public id', async () => {
    const calls = mockCloudinary();
    const a = await loginAs('owner');
    const r = await a.post('/api/v1/admin/uploads/image').set(H).attach('file', JPEG, { filename: 'villa.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(201);
    expect(r.body.data).toMatchObject({ url: expect.stringMatching(/^https:\/\/res\.cloudinary\.com\//), publicId: 'hol/test/abc' });
    const form = calls[0].body as FormData;
    const ts = String(form.get('timestamp'));
    expect(form.get('api_key')).toBe('key123');
    expect(form.get('folder')).toBe('hol/test');
    expect(form.get('signature')).toBe(crypto.createHash('sha1').update(`folder=hol/test&timestamp=${ts}supersecret`).digest('hex'));
    expect(JSON.stringify([...form.keys()])).not.toContain('api_secret'); // the secret is never sent
    expect((await query(`SELECT count(*) FROM audit_log WHERE action = 'image.upload'`)).rows[0].count).toBe('1');
  });

  it('rejects non-images, spoofed MIME types, empty requests and oversized files', async () => {
    const calls = mockCloudinary();
    const a = await loginAs('owner');
    expect((await a.post('/api/v1/admin/uploads/image').set(H).attach('file', Buffer.from('<script>alert(1)</script>'), { filename: 'x.jpg', contentType: 'image/jpeg' })).status).toBe(415);
    expect((await a.post('/api/v1/admin/uploads/image').set(H).attach('file', Buffer.from('%PDF-1.4'), { filename: 'x.pdf', contentType: 'application/pdf' })).status).toBe(415);
    expect((await a.post('/api/v1/admin/uploads/image').set(H).send({})).status).toBe(400);
    const big = await a.post('/api/v1/admin/uploads/image').set(H).attach('file', Buffer.concat([JPEG, Buffer.alloc(9 * 1024 * 1024)]), { filename: 'big.jpg', contentType: 'image/jpeg' });
    expect(big.status).toBe(413);
    expect(calls).toHaveLength(0); // nothing reached Cloudinary
    expect((await a.post('/api/v1/admin/uploads/image').set(H).attach('file', PNG, { filename: 'ok.png', contentType: 'image/png' })).status).toBe(201);
  });

  it('requires authentication and the CSRF header', async () => {
    mockCloudinary();
    const request2 = (await import('supertest')).default;
    const { app } = await import('./helpers.js');
    expect((await request2(app).post('/api/v1/admin/uploads/image').set(H).attach('file', JPEG, 'a.jpg')).status).toBe(401);
    const a = await loginAs('owner');
    expect((await a.post('/api/v1/admin/uploads/image').attach('file', JPEG, 'a.jpg')).status).toBe(403);
  });

  it('turns provider failures into clean errors without crashing', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: { message: 'Invalid api_key key123' } }), { status: 401 }));
    const a = await loginAs('owner');
    const r = await a.post('/api/v1/admin/uploads/image').set(H).attach('file', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(r.status).toBe(502);
    expect(r.body.error.code).toBe('storage_credentials');
    expect(JSON.stringify(r.body)).not.toContain('supersecret');
    vi.restoreAllMocks();
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    expect((await a.post('/api/v1/admin/uploads/image').set(H).attach('file', JPEG, { filename: 'a.jpg', contentType: 'image/jpeg' })).status).toBe(502);
    expect((await (await import('supertest')).default((await import('./helpers.js')).app).get('/api/v1/villas')).status).toBe(200);
  });

  it('stores asset ids, and removes replaced/deleted assets only when no other property uses them', async () => {
    const calls = mockCloudinary();
    const a = await loginAs('owner');
    const body = (over: any = {}) => ({ name: 'Cloud Villa', propertyType: 'Sea-View Villa', location: 'Awas', shortDescription: 's', fullDescription: 'A long enough description for publishing.', bedrooms: 2, maxGuests: 4,
      featuredImage: 'https://res.cloudinary.com/demo-cloud/image/upload/f.jpg', featuredImagePublicId: 'hol/test/feat',
      gallery: [{ url: 'https://res.cloudinary.com/demo-cloud/image/upload/g1.jpg', alt: '', publicId: 'hol/test/g1' }, { url: 'https://res.cloudinary.com/demo-cloud/image/upload/g2.jpg', alt: '', publicId: 'hol/test/g2' }], ...over });
    const id = (await a.post('/api/v1/admin/villas').set(H).send(body())).body.data.id;
    expect((await query(`SELECT public_id FROM villa_images WHERE villa_id = $1 ORDER BY sort_order`, [id])).rows.map((r) => r.public_id)).toEqual(['hol/test/g1', 'hol/test/g2']);
    const copy = (await a.post(`/api/v1/admin/villas/${id}/duplicate`).set(H)).body.data.id; // shares the same assets
    const destroyed = () => calls.filter((c) => c.url.endsWith('/destroy')).map((c) => (c.body as URLSearchParams).get('public_id')).sort();

    // remove g2 from the original: still used by the copy -> kept
    await a.put(`/api/v1/admin/villas/${id}`).set(H).send(body({ gallery: [{ url: 'https://res.cloudinary.com/demo-cloud/image/upload/g1.jpg', alt: '', publicId: 'hol/test/g1' }] }));
    expect(destroyed()).toEqual([]);
    // delete the copy: g2 is now unused -> destroyed; g1/feat still used by the original -> kept
    await a.delete(`/api/v1/admin/villas/${copy}`).set(H);
    expect(destroyed()).toEqual(['hol/test/g2']);
    const del = calls.find((c) => c.url.endsWith('/destroy'))!.body as URLSearchParams;
    expect(del.get('signature')).toBe(crypto.createHash('sha1').update(`public_id=hol/test/g2&timestamp=${del.get('timestamp')}supersecret`).digest('hex'));
    // delete the original: everything left is destroyed
    await a.delete(`/api/v1/admin/villas/${id}`).set(H);
    expect(destroyed()).toEqual(['hol/test/feat', 'hol/test/g1', 'hol/test/g2']);
  });

  it('a failed asset cleanup never fails the admin request', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('cloudinary down'));
    const a = await loginAs('owner');
    const id = (await a.post('/api/v1/admin/villas').set(H).send({ name: 'V', propertyType: 'Sea-View Villa', bedrooms: 1, maxGuests: 2, featuredImage: 'https://x.test/a.jpg', featuredImagePublicId: 'hol/test/zzz' })).body.data.id;
    expect((await a.delete(`/api/v1/admin/villas/${id}`).set(H)).status).toBe(200);
  });
});
