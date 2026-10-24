import crypto from 'node:crypto';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

process.env.CLOUDINARY_CLOUD_NAME = 'demo-cloud';
process.env.CLOUDINARY_API_KEY = 'key123';
process.env.CLOUDINARY_API_SECRET = 'supersecret';
const { H, app, closePool, loginAs, makeVilla, resetDb, setupDb } = await import('./helpers.js');
const { query } = await import('../src/db/pool.js');

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(closePool);
afterEach(() => vi.restoreAllMocks());

const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftypisom'), Buffer.alloc(40, 1)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(40, 2)]);
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]);

function mockCloudinary() {
  const calls: Array<{ url: string; body: any }> = [];
  const real = globalThis.fetch;
  let n = 0;
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const url = String(input);
    if (!url.startsWith('https://api.cloudinary.com/')) return real(input, init);
    calls.push({ url, body: init?.body });
    if (url.endsWith('/upload')) { n++; const kind = url.includes('/video/') ? 'video' : 'image'; return new Response(JSON.stringify({ secure_url: `https://res.cloudinary.com/demo-cloud/${kind}/upload/v1/hol/${kind}${n}.${kind === 'video' ? 'mp4' : 'jpg'}`, public_id: `hol/${kind}${n}`, bytes: 100 }), { status: 200 }); }
    return new Response(JSON.stringify({ result: 'ok' }), { status: 200 });
  });
  return calls;
}
const destroyed = (calls: ReturnType<typeof mockCloudinary>) => calls.filter((c) => c.url.endsWith('/destroy')).map((c) => `${c.url.split('/').slice(-2)[0]}:${(c.body as URLSearchParams).get('public_id')}`).sort();

describe('WhatsApp number, default message and website media settings', () => {
  it('stores the number in international format plus a default message, and exposes them publicly', async () => {
    const a = await loginAs('owner');
    expect((await request(app).get('/api/v1/settings/public')).body.data).toMatchObject({ whatsappNumber: null, whatsappDefaultMessage: null, heroImage: null, heroVideo: null });
    for (const bad of ['12ab', '0123456789', '+0', '98765', '1'.repeat(16)]) expect((await a.put('/api/v1/admin/settings').set(H).send({ whatsappNumber: bad })).status, bad).toBe(400);
    const r = await a.put('/api/v1/admin/settings').set(H).send({ whatsappNumber: '+91 91234-56789', whatsappDefaultMessage: 'Hi! I would like to know more about your villas.' });
    expect(r.status).toBe(200);
    expect((await request(app).get('/api/v1/settings/public')).body.data).toMatchObject({ whatsappNumber: '919123456789', whatsappDefaultMessage: 'Hi! I would like to know more about your villas.' });
    expect((await a.put('/api/v1/admin/settings').set(H).send({ whatsappNumber: null })).body.data.whatsappNumber).toBeNull(); // clearing hides every WhatsApp action
  });

  it('validates and persists hero image and hero video, and clears them with null', async () => {
    const a = await loginAs('owner');
    const bad = (hero: any) => a.put('/api/v1/admin/settings').set(H).send(hero);
    expect((await bad({ heroImage: { url: 'javascript:alert(1)' } })).status).toBe(400);
    expect((await bad({ heroImage: { url: 'http://insecure.test/a.jpg' } })).status).toBe(400);
    expect((await bad({ heroVideo: { url: 'data:text/html,x' } })).status).toBe(400);
    expect((await bad({ heroVideo: { url: 'https://cdn.test/v.mp4', posterUrl: 'ftp://x/p.jpg' } })).status).toBe(400);
    const ok = await bad({ heroImage: { url: '/demo-villas/serenity.jpg', alt: 'Villa at dusk' }, heroVideo: { url: 'https://cdn.example.test/hero.mp4', posterUrl: '/demo-villas/ocean.jpg' } });
    expect(ok.status).toBe(200);
    const pub = (await request(app).get('/api/v1/settings/public')).body.data;
    expect(pub.heroImage).toEqual({ url: '/demo-villas/serenity.jpg', alt: 'Villa at dusk', publicId: null });
    expect(pub.heroVideo).toMatchObject({ url: 'https://cdn.example.test/hero.mp4', posterUrl: '/demo-villas/ocean.jpg' });
    // a partial update leaves media untouched
    await bad({ businessName: 'X' });
    expect((await request(app).get('/api/v1/settings/public')).body.data.heroImage.url).toBe('/demo-villas/serenity.jpg');
    await bad({ heroImage: null, heroVideo: null });
    expect((await request(app).get('/api/v1/settings/public')).body.data).toMatchObject({ heroImage: null, heroVideo: null });
  });

  it('is restricted to authenticated owners/admins', async () => {
    expect((await request(app).put('/api/v1/admin/settings').set(H).send({ whatsappNumber: '919123456789' })).status).toBe(401);
    const staff = await loginAs('staff');
    expect((await staff.put('/api/v1/admin/settings').set(H).send({ heroImage: { url: '/a.jpg' } })).status).toBe(403);
    expect((await staff.get('/api/v1/admin/settings')).status).toBe(200);
    expect((await request(app).get('/api/v1/settings/public')).body.data.whatsappNumber).toBeNull();
  });

  it('warns in the environment status while no WhatsApp number is set', async () => {
    const a = await loginAs('owner');
    const w = (await a.get('/api/v1/admin/meta')).body.data.environment;
    expect(w.whatsapp.configured).toBe(false);
    expect(w.warnings.join(' ')).toMatch(/WhatsApp number/);
    await a.put('/api/v1/admin/settings').set(H).send({ whatsappNumber: '919123456789' });
    expect((await a.get('/api/v1/admin/meta')).body.data.environment.whatsapp.configured).toBe(true);
  });
});

describe('hero media uploads and cleanup (mocked Cloudinary)', () => {
  it('uploads a video through the video endpoint with a valid signature and rejects non-videos', async () => {
    const calls = mockCloudinary();
    const a = await loginAs('owner');
    const v = await a.post('/api/v1/admin/uploads/video').set(H).attach('file', MP4, { filename: 'hero.mp4', contentType: 'video/mp4' });
    expect(v.status).toBe(201);
    expect(v.body.data).toMatchObject({ url: expect.stringContaining('/video/upload/'), publicId: expect.stringMatching(/^hol\/video/) });
    expect(calls[0].url).toBe('https://api.cloudinary.com/v1_1/demo-cloud/video/upload');
    const form = calls[0].body as FormData;
    expect(form.get('signature')).toBe(crypto.createHash('sha1').update(`folder=holidayalibag/properties&timestamp=${form.get('timestamp')}supersecret`).digest('hex'));
    expect((await a.post('/api/v1/admin/uploads/video').set(H).attach('file', WEBM, { filename: 'h.webm', contentType: 'video/webm' })).status).toBe(201);
    // wrong types / spoofed MIME
    expect((await a.post('/api/v1/admin/uploads/video').set(H).attach('file', JPEG, { filename: 'x.mp4', contentType: 'video/mp4' })).status).toBe(415);
    expect((await a.post('/api/v1/admin/uploads/image').set(H).attach('file', MP4, { filename: 'x.jpg', contentType: 'image/jpeg' })).status).toBe(415);
    expect((await a.post('/api/v1/admin/uploads/video').set(H).send({})).status).toBe(400);
    expect(calls.filter((c) => c.url.endsWith('/upload'))).toHaveLength(2);
    // auth + CSRF
    expect((await request(app).post('/api/v1/admin/uploads/video').set(H).attach('file', MP4, 'a.mp4')).status).toBe(401);
    expect((await a.post('/api/v1/admin/uploads/video').attach('file', MP4, 'a.mp4')).status).toBe(403);
    const staff = await loginAs('staff');
    expect((await staff.post('/api/v1/admin/uploads/video').set(H).attach('file', MP4, 'a.mp4')).status).toBe(403);
  });

  it('rejects videos over the size limit without contacting Cloudinary', async () => {
    const calls = mockCloudinary();
    const a = await loginAs('owner');
    const big = await a.post('/api/v1/admin/uploads/video').set(H).attach('file', Buffer.concat([MP4, Buffer.alloc(51 * 1024 * 1024)]), { filename: 'big.mp4', contentType: 'video/mp4' });
    expect(big.status).toBe(413);
    expect(calls).toHaveLength(0);
  });

  it('deletes replaced/removed hero assets (typed image vs video) unless another record still uses them', async () => {
    const calls = mockCloudinary();
    const a = await loginAs('owner');
    const put = (b: any) => a.put('/api/v1/admin/settings').set(H).send(b);
    await put({ heroImage: { url: 'https://res.cloudinary.com/demo-cloud/image/upload/h1.jpg', publicId: 'hol/hero1' }, heroVideo: { url: 'https://res.cloudinary.com/demo-cloud/video/upload/v1.mp4', publicId: 'hol/vid1', posterUrl: 'https://res.cloudinary.com/demo-cloud/image/upload/p1.jpg', posterPublicId: 'hol/poster1' } });
    expect(destroyed(calls)).toEqual([]);
    await put({ heroImage: { url: 'https://res.cloudinary.com/demo-cloud/image/upload/h2.jpg', publicId: 'hol/hero2' } }); // replace the image
    expect(destroyed(calls)).toEqual(['image:hol/hero1']);
    await put({ heroVideo: null }); // remove the video and its poster
    expect(destroyed(calls)).toEqual(['image:hol/hero1', 'image:hol/poster1', 'video:hol/vid1']);
    // an asset also used by a property is kept
    const id = (await a.post('/api/v1/admin/villas').set(H).send({ name: 'V', propertyType: 'Sea-View Villa', bedrooms: 1, maxGuests: 2, featuredImage: 'https://res.cloudinary.com/demo-cloud/image/upload/h2.jpg', featuredImagePublicId: 'hol/hero2' })).body.data.id;
    await put({ heroImage: null });
    expect(destroyed(calls)).not.toContain('image:hol/hero2');
    await a.delete(`/api/v1/admin/villas/${id}`).set(H);
    expect(destroyed(calls)).toContain('image:hol/hero2');
  });
});

describe('property galleries', () => {
  const body = (n: number, over: any = {}) => ({ name: 'Gallery Villa', propertyType: 'Sea-View Villa', location: 'Awas', shortDescription: 's', fullDescription: 'A description that is long enough to publish.', bedrooms: 2, maxGuests: 4,
    featuredImage: '/demo-villas/ocean.jpg', gallery: Array.from({ length: n }, (_, i) => ({ url: `https://cdn.example.test/p${i}.jpg`, alt: `Photo ${i + 1}`, publicId: `hol/p${i}` })), isPublished: true, ...over });

  it('stores, orders and publishes many photos with captions, asset ids and a cover image', async () => {
    const a = await loginAs('owner');
    const c = await a.post('/api/v1/admin/villas').set(H).send(body(12));
    expect(c.status).toBe(201);
    const pub = (await request(app).get(`/api/v1/villas/${c.body.data.slug}`)).body.data;
    expect(pub.gallery).toHaveLength(13); // cover + 12
    expect(pub.gallery[0]).toBe('/demo-villas/ocean.jpg'); // cover first
    expect(pub.galleryAlts['https://cdn.example.test/p3.jpg']).toBe('Photo 4');
    // reorder + replace one image + change cover
    const g = [...body(12).gallery].reverse(); g[0] = { url: 'https://cdn.example.test/new.jpg', alt: 'Replaced', publicId: 'hol/new' };
    const u = await a.put(`/api/v1/admin/villas/${c.body.data.id}`).set(H).send(body(12, { gallery: g, featuredImage: 'https://cdn.example.test/p5.jpg', featuredImagePublicId: 'hol/p5' }));
    expect(u.body.data.galleryImages.map((x: any) => x.alt).slice(0, 2)).toEqual(['Replaced', 'Photo 11']);
    expect(u.body.data.gallery[0]).toBe('https://cdn.example.test/p5.jpg');
    expect((await query(`SELECT count(*) FROM villa_images WHERE villa_id = $1 AND public_id IS NOT NULL`, [c.body.data.id])).rows[0].count).toBe('12');
  });

  it('has a generous cap (100) rather than the old 40', async () => {
    const a = await loginAs('owner');
    expect((await a.post('/api/v1/admin/villas').set(H).send(body(60))).status).toBe(201);
    expect((await a.post('/api/v1/admin/villas').set(H).send(body(100, { name: 'Big' }))).status).toBe(201);
    const r = await a.post('/api/v1/admin/villas').set(H).send(body(101, { name: 'Too big' }));
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).toMatch(/at most 100/);
  });
});
