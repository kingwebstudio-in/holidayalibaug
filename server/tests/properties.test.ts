import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { query } from '../src/db/pool.js';
import { seedDemoVillas, DEMO_VILLAS } from '../src/db/demoData.js';
import { withTransaction } from '../src/db/pool.js';
import { H, app, bookingPayload, closePool, loginAs, makeVilla, resetDb, setupDb } from './helpers.js';

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(closePool);

const payload = (over: Record<string, unknown> = {}) => ({
  name: 'Test Property', propertyType: 'Sea-View Villa', location: 'Kihim, Alibaug', locality: 'Kihim', shortDescription: 'Short blurb', fullDescription: 'A complete description of at least twenty characters.',
  bedrooms: 3, bathrooms: 3, maxGuests: 8, featuredImage: '/demo-villas/ocean.jpg',
  gallery: [{ url: '/demo-villas/ocean.jpg', alt: 'One' }, { url: 'https://cdn.example.test/two.jpg', alt: 'Two' }, { url: '/demo-villas/palm.jpg', alt: 'Three' }],
  amenities: [{ label: 'Pool', icon: 'waves' }, { label: 'Wi-Fi', icon: 'wifi' }], highlights: ['Near the beach'], rules: ['No parties'], ...over,
});

describe('demo dataset', () => {
  it('provides 8–10 varied, clearly-marked sample properties with several images each', async () => {
    await withTransaction((c) => seedDemoVillas(c));
    const res = await request(app).get('/api/v1/villas?pageSize=50');
    expect(res.body.meta.total).toBe(DEMO_VILLAS.length);
    expect(DEMO_VILLAS.length).toBeGreaterThanOrEqual(8);
    const v = res.body.data;
    expect(v.every((x: any) => x.isDemo === true)).toBe(true);
    expect(new Set(v.map((x: any) => x.propertyType)).size).toBeGreaterThanOrEqual(6);
    expect(new Set(v.map((x: any) => x.slug)).size).toBe(v.length);
    expect(v.every((x: any) => x.gallery.length >= 3 && x.amenities.length >= 3 && x.highlights.length && x.rules.length)).toBe(true);
    expect(v.every((x: any) => /demo listing/i.test(x.fullDescription))).toBe(true);
    expect(v.some((x: any) => x.startingPrice === null)).toBe(true); // "Price on enquiry" example
    expect(Math.min(...v.map((x: any) => x.maxGuests))).toBeLessThan(5);
    expect(Math.max(...v.map((x: any) => x.maxGuests))).toBeGreaterThan(15);
  });
  it('seeding is idempotent', async () => {
    await withTransaction((c) => seedDemoVillas(c));
    expect(await withTransaction((c) => seedDemoVillas(c))).toBe(0);
    expect((await query(`SELECT count(*) FROM villas`)).rows[0].count).toBe(String(DEMO_VILLAS.length));
  });
});

describe('public search, filters, pagination', () => {
  async function seed() {
    await makeVilla({ name: 'Alpha', slug: 'alpha', location: 'Awas, Alibaug', locality: 'Awas', property_type: 'Luxury Private Pool Villa', max_guests: 14, bedrooms: 5, starting_price: 40000, is_featured: true, display_order: 1 });
    await makeVilla({ name: 'Bravo', slug: 'bravo', location: 'Kihim, Alibaug', locality: 'Kihim', property_type: 'Sea-View Villa', max_guests: 6, bedrooms: 2, starting_price: 15000, display_order: 2 });
    await makeVilla({ name: 'Charlie', slug: 'charlie', location: 'Kihim, Alibaug', locality: 'Kihim', property_type: 'Sea-View Villa', max_guests: 10, bedrooms: 4, starting_price: null, display_order: 3 });
    await makeVilla({ name: 'Delta', slug: 'delta', location: 'Thal, Alibaug', locality: 'Thal', property_type: 'Budget-Friendly Holiday Home', max_guests: 4, bedrooms: 1, starting_price: 6000, display_order: 4 });
    await makeVilla({ name: 'Draft One', slug: 'draft-one', is_published: false });
  }
  const names = async (qs: string) => (await request(app).get(`/api/v1/villas${qs}`)).body.data.map((v: any) => v.name);

  it('filters by location, type, guests, bedrooms and price; excludes drafts', async () => {
    await seed();
    expect(await names('')).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta']);
    expect(await names('?location=kihim')).toEqual(['Bravo', 'Charlie']);
    expect(await names('?type=Sea-View%20Villa')).toEqual(['Bravo', 'Charlie']);
    expect(await names('?guests=9')).toEqual(['Alpha', 'Charlie']);
    expect(await names('?bedrooms=4')).toEqual(['Alpha', 'Charlie']);
    expect(await names('?minPrice=10000&maxPrice=20000')).toEqual(['Bravo']); // unpriced listings never match a price filter
    expect(await names('?featured=true')).toEqual(['Alpha']);
    expect(await names('?q=thal')).toEqual(['Delta']);
    expect(await names('?location=kihim&type=Budget-Friendly%20Holiday%20Home')).toEqual([]);
  });

  it('sorts by price (unpriced last) and paginates with accurate metadata', async () => {
    await seed();
    expect(await names('?sort=price_asc')).toEqual(['Delta', 'Bravo', 'Alpha', 'Charlie']);
    expect(await names('?sort=price_desc')).toEqual(['Alpha', 'Bravo', 'Delta', 'Charlie']);
    const p2 = await request(app).get('/api/v1/villas?pageSize=3&page=2');
    expect(p2.body.data.map((v: any) => v.name)).toEqual(['Delta']);
    expect(p2.body.meta).toEqual({ total: 4, page: 2, pageSize: 3, totalPages: 2 });
    expect((await request(app).get('/api/v1/villas?pageSize=500')).status).toBe(400);
    expect((await request(app).get('/api/v1/villas?type=Castle')).status).toBe(400);
    expect((await request(app).get('/api/v1/villas?sort=random')).status).toBe(400);
  });

  it('exposes facets (only values that exist) and a lightweight options list', async () => {
    await seed();
    const f = (await request(app).get('/api/v1/villas/facets')).body.data;
    expect(f.propertyTypes.map((t: any) => t.value)).toEqual(['Budget-Friendly Holiday Home', 'Luxury Private Pool Villa', 'Sea-View Villa']);
    expect(f.locations).toEqual([{ value: 'Awas', count: 1 }, { value: 'Kihim', count: 2 }, { value: 'Thal', count: 1 }]);
    expect(f.priceRange).toEqual({ min: 6000, max: 40000 });
    expect(f.maxGuests).toBe(14);
    const o = (await request(app).get('/api/v1/villas/options')).body.data;
    expect(o).toHaveLength(4);
    expect(Object.keys(o[0]).sort()).toEqual(['bedrooms', 'id', 'isDemo', 'maxGuests', 'name', 'slug']);
  });

  it('reports no price range when no listing has a price', async () => {
    await makeVilla({ starting_price: null });
    expect((await request(app).get('/api/v1/villas/facets')).body.data.priceRange).toBeNull();
  });

  it('returns related properties (same type/locality first, never itself or drafts)', async () => {
    await seed();
    const rel = (await request(app).get('/api/v1/villas/bravo/related')).body.data;
    expect(rel.map((v: any) => v.name)).toEqual(['Charlie', 'Alpha', 'Delta']);
    expect(rel.every((v: any) => v.slug !== 'bravo' && v.slug !== 'draft-one')).toBe(true);
    expect((await request(app).get('/api/v1/villas/draft-one/related')).status).toBe(404);
  });
});

describe('admin property management', () => {
  it('creates a draft, previews it via the admin API, publishes it and shows it publicly with all gallery images', async () => {
    const a = await loginAs('owner');
    const c = await a.post('/api/v1/admin/villas').set(H).send(payload());
    expect(c.status).toBe(201);
    const id = c.body.data.id;
    expect(c.body.data).toMatchObject({ isPublished: false, propertyType: 'Sea-View Villa', locality: 'Kihim', checkInTime: '14:00', checkOutTime: '11:00' });
    expect((await request(app).get('/api/v1/villas/test-property')).status).toBe(404);
    expect((await a.get(`/api/v1/admin/villas/${id}`)).body.data.galleryImages).toHaveLength(3);
    expect((await a.patch(`/api/v1/admin/villas/${id}/publish`).set(H).send({ isPublished: true })).status).toBe(200);
    const pub = (await request(app).get('/api/v1/villas/test-property')).body.data;
    expect(pub.gallery).toHaveLength(3);
    expect(pub.galleryAlts['https://cdn.example.test/two.jpg']).toBe('Two');
    expect((await request(app).get('/api/v1/villas')).body.data.map((v: any) => v.name)).toContain('Test Property');
  });

  it('keeps gallery order, edits fields, toggles featured, and un-publishes', async () => {
    const a = await loginAs('owner');
    const id = (await a.post('/api/v1/admin/villas').set(H).send(payload({ isPublished: true }))).body.data.id;
    const reordered = payload({ isPublished: true, name: 'Renamed', startingPrice: 22000, checkInTime: '13:30', seoTitle: 'SEO', gallery: [{ url: '/demo-villas/palm.jpg', alt: 'P' }, { url: '/demo-villas/ocean.jpg', alt: 'O' }] });
    const u = (await a.put(`/api/v1/admin/villas/${id}`).set(H).send(reordered)).body.data;
    expect(u).toMatchObject({ name: 'Renamed', startingPrice: 22000, checkInTime: '13:30', seoTitle: 'SEO' });
    expect(u.galleryImages.map((g: any) => g.alt)).toEqual(['P', 'O']);
    expect((await a.patch(`/api/v1/admin/villas/${id}/featured`).set(H).send({ isFeatured: true })).body.data.isFeatured).toBe(true);
    expect((await request(app).get('/api/v1/villas?featured=true')).body.data).toHaveLength(1);
    await a.patch(`/api/v1/admin/villas/${id}/publish`).set(H).send({ isPublished: false });
    expect((await request(app).get('/api/v1/villas')).body.data).toHaveLength(0);
  });

  it('refuses to publish an incomplete property and reports every missing field', async () => {
    const a = await loginAs('owner');
    const bad = await a.post('/api/v1/admin/villas').set(H).send(payload({ isPublished: true, fullDescription: 'short', location: '', featuredImage: null, gallery: [] }));
    expect(bad.status).toBe(422);
    expect(bad.body.error.code).toBe('villa_incomplete');
    expect(bad.body.error.details.map((d: any) => d.field).sort()).toEqual(['featuredImage', 'fullDescription', 'location']);
    expect((await query(`SELECT count(*) FROM villas`)).rows[0].count).toBe('0'); // nothing half-saved
    const draft = await a.post('/api/v1/admin/villas').set(H).send(payload({ fullDescription: '', isPublished: false }));
    expect(draft.status).toBe(201); // drafts may be incomplete
    expect((await a.patch(`/api/v1/admin/villas/${draft.body.data.id}/publish`).set(H).send({ isPublished: true })).status).toBe(422);
  });

  it('returns field-level validation errors', async () => {
    const a = await loginAs('owner');
    const r = await a.post('/api/v1/admin/villas').set(H).send(payload({ propertyType: 'Castle', maxGuests: 0, checkInTime: '25:99', seoDescription: 'x'.repeat(400) }));
    expect(r.status).toBe(400);
    const fields = r.body.error.details.map((d: any) => d.field);
    expect(fields).toEqual(expect.arrayContaining(['propertyType', 'maxGuests', 'checkInTime', 'seoDescription']));
  });

  it('lists with search, status/demo/type filters, sorting and pagination', async () => {
    const a = await loginAs('owner');
    await makeVilla({ name: 'Published A', slug: 'pub-a', locality: 'Awas', property_type: 'Sea-View Villa' });
    await makeVilla({ name: 'Draft B', slug: 'draft-b', is_published: false, location: 'Thal' });
    await makeVilla({ name: 'Demo C', slug: 'demo-c', is_demo: true, starting_price: 5000 });
    const list = (qs: string) => a.get(`/api/v1/admin/villas${qs}`);
    expect((await list('')).body.meta.total).toBe(3);
    expect((await list('?status=draft')).body.data.map((v: any) => v.name)).toEqual(['Draft B']);
    expect((await list('?status=published&demo=false')).body.data.map((v: any) => v.name)).toEqual(['Published A']);
    expect((await list('?demo=true')).body.data[0].isDemo).toBe(true);
    expect((await list('?q=thal')).body.data).toHaveLength(1);
    expect((await list('?type=Sea-View%20Villa')).body.data).toHaveLength(1);
    expect((await list('?sort=name&pageSize=2&page=2')).body.data.map((v: any) => v.name)).toEqual(['Published A']);
    expect(Object.keys((await list('')).body.data[0])).not.toContain('fullDescription'); // light rows for the table
    expect((await a.get('/api/v1/admin/villas/options')).body.data).toHaveLength(3);
  });

  it('duplicates as an unpublished, unfeatured draft with a new slug', async () => {
    const a = await loginAs('owner');
    const id = (await a.post('/api/v1/admin/villas').set(H).send(payload({ isPublished: true, isFeatured: true }))).body.data.id;
    const d = await a.post(`/api/v1/admin/villas/${id}/duplicate`).set(H);
    expect(d.status).toBe(201);
    expect(d.body.data).toMatchObject({ name: 'Test Property (copy)', slug: 'test-property-copy', isPublished: false, isFeatured: false, isDemo: false });
    expect(d.body.data.galleryImages).toHaveLength(3);
    const d2 = await a.post(`/api/v1/admin/villas/${id}/duplicate`).set(H);
    expect(d2.body.data.slug).toBe('test-property-copy-2');
  });

  it('deletes a property but keeps its enquiries (with the villa name snapshot)', async () => {
    const a = await loginAs('owner');
    const v = await makeVilla({ name: 'Doomed Villa' });
    await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id));
    expect((await a.delete(`/api/v1/admin/villas/${v.id}`).set(H)).status).toBe(200);
    expect((await a.delete(`/api/v1/admin/villas/${v.id}`).set(H)).status).toBe(404);
    expect((await request(app).get('/api/v1/villas')).body.data).toHaveLength(0);
    const row = (await query(`SELECT villa_id, villa_name FROM booking_enquiries`)).rows[0];
    expect(row).toMatchObject({ villa_id: null, villa_name: 'Doomed Villa' });
    expect((await query(`SELECT count(*) FROM audit_log WHERE action = 'villa.delete'`)).rows[0].count).toBe('1');
  });

  it('only owners/admins may create, edit, publish, feature, duplicate, delete or upload', async () => {
    const owner = await loginAs('owner');
    const id = (await owner.post('/api/v1/admin/villas').set(H).send(payload())).body.data.id;
    const staff = await loginAs('staff');
    for (const [m, u, b] of [
      ['post', '/api/v1/admin/villas', payload({ name: 'X' })], ['put', `/api/v1/admin/villas/${id}`, payload()], ['patch', `/api/v1/admin/villas/${id}/publish`, { isPublished: true }],
      ['patch', `/api/v1/admin/villas/${id}/featured`, { isFeatured: true }], ['post', `/api/v1/admin/villas/${id}/duplicate`, {}], ['delete', `/api/v1/admin/villas/${id}`, {}], ['post', '/api/v1/admin/uploads/image', {}],
    ] as const) expect((await (staff as any)[m](u).set(H).send(b)).status, `${m} ${u}`).toBe(403);
    for (const [m, u] of [['post', '/api/v1/admin/villas'], ['delete', `/api/v1/admin/villas/${id}`], ['post', '/api/v1/admin/uploads/image'], ['get', '/api/v1/admin/meta']] as const)
      expect((await (request(app) as any)[m](u).set(H).send({})).status, `anon ${m} ${u}`).toBe(401);
    expect((await owner.get(`/api/v1/admin/villas/${id}`)).status).toBe(200); // still there
  });

  it('uploads are cleanly disabled (not crashing) when Cloudinary is not configured', async () => {
    const a = await loginAs('owner');
    const r = await a.post('/api/v1/admin/uploads/image').set(H).attach('file', Buffer.from([0xff, 0xd8, 0xff, 0xdb, 0, 0]), 'a.jpg');
    expect(r.status).toBe(503);
    expect(r.body.error.code).toBe('storage_not_configured');
    const meta = (await a.get('/api/v1/admin/meta')).body.data;
    expect(meta.uploads.enabled).toBe(false);
    expect(meta.propertyTypes).toContain('Sea-View Villa');
    expect(meta.environment.dataMode).toBe(process.env.TEST_DATA_MODE);
    expect(JSON.stringify(meta)).not.toMatch(/password|secret|postgresql:\/\//i);
    expect((await request(app).get('/api/v1/villas')).status).toBe(200); // public site unaffected
  });

  it('public settings flag demo data so the site can show a sample-data indicator', async () => {
    await makeVilla({ is_demo: true });
    const s = (await request(app).get('/api/v1/settings/public')).body.data;
    expect(s.environment).toEqual({ demoData: true }); // the data engine is never revealed publicly
  });
});
