import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { query } from '../src/db/pool.js';
import { createAdminUser } from '../src/services/auth.js';
import { H, PASSWORD, addDays, app, bookingPayload, closePool, setupDb, loginAs, makeVilla, resetDb } from './helpers.js';

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(closePool);

const ADMIN_ENDPOINTS: Array<[string, string]> = [
  ['get', '/api/v1/admin/auth/me'], ['get', '/api/v1/admin/dashboard'],
  ['get', '/api/v1/admin/booking-enquiries'], ['get', '/api/v1/admin/booking-enquiries/11111111-1111-4111-8111-111111111111'],
  ['patch', '/api/v1/admin/booking-enquiries/11111111-1111-4111-8111-111111111111'],
  ['get', '/api/v1/admin/villa-owner-enquiries'], ['get', '/api/v1/admin/investment-enquiries'],
  ['patch', '/api/v1/admin/villa-owner-enquiries/11111111-1111-4111-8111-111111111111'],
  ['get', '/api/v1/admin/villas'], ['post', '/api/v1/admin/villas'], ['put', '/api/v1/admin/villas/11111111-1111-4111-8111-111111111111'],
  ['patch', '/api/v1/admin/villas/11111111-1111-4111-8111-111111111111/publish'],
  ['get', '/api/v1/admin/settings'], ['put', '/api/v1/admin/settings'], ['get', '/api/v1/admin/testimonials'], ['post', '/api/v1/admin/testimonials'],
  ['post', '/api/v1/admin/auth/change-password'],
];

describe('authentication', () => {
  it('blocks EVERY admin endpoint without a session (even with the CSRF header)', async () => {
    for (const [method, url] of ADMIN_ENDPOINTS) {
      const res = await (request(app) as any)[method](url).set(H).send({});
      expect(res.status, `${method.toUpperCase()} ${url}`).toBe(401);
    }
  });

  it('rejects forged or garbage session cookies', async () => {
    const res = await request(app).get('/api/v1/admin/dashboard').set('Cookie', 'ha_admin=totally-fake-token').set(H);
    expect(res.status).toBe(401);
  });

  it('logs in with an HttpOnly cookie, never returns the hash, and logs out server-side', async () => {
    await createAdminUser({ name: 'Owner', email: 'boss@example.test', password: PASSWORD });
    const agent = request.agent(app);
    const res = await agent.post('/api/v1/admin/auth/login').set(H).send({ email: 'BOSS@example.test', password: PASSWORD });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toMatch(/hash|password/i);
    const cookie = String(res.headers['set-cookie']);
    expect(cookie).toMatch(/ha_admin=/);
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Lax/i);
    expect((await agent.get('/api/v1/admin/auth/me')).body.data.admin.email).toBe('boss@example.test');
    const raw = cookie.match(/ha_admin=([^;]+)/)![1];
    expect((await query(`SELECT count(*) FROM admin_sessions WHERE token_hash = $1`, [raw])).rows[0].count).toBe('0'); // only a keyed hash is stored
    await agent.post('/api/v1/admin/auth/logout').set(H);
    expect((await request(app).get('/api/v1/admin/auth/me').set('Cookie', `ha_admin=${raw}`)).status).toBe(401); // token dead server-side
  });

  it('returns the same generic error for unknown e-mail and wrong password', async () => {
    await createAdminUser({ name: 'Owner', email: 'boss@example.test', password: PASSWORD });
    const a = await request(app).post('/api/v1/admin/auth/login').set(H).send({ email: 'boss@example.test', password: 'wrong-password-1' });
    const b = await request(app).post('/api/v1/admin/auth/login').set(H).send({ email: 'ghost@example.test', password: 'wrong-password-1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toEqual(b.body.error);
  });

  it('locks the account after repeated failures, even for the correct password', async () => {
    await createAdminUser({ name: 'Owner', email: 'boss@example.test', password: PASSWORD });
    for (let i = 0; i < 5; i++) await request(app).post('/api/v1/admin/auth/login').set(H).send({ email: 'boss@example.test', password: 'nope-nope-nope' });
    const res = await request(app).post('/api/v1/admin/auth/login').set(H).send({ email: 'boss@example.test', password: PASSWORD });
    expect(res.status).toBe(401);
  });

  it('rate-limits login attempts per IP (429)', async () => {
    const limited = createApp({ rateLimit: true });
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await request(limited).post('/api/v1/admin/auth/login').set(H).send({ email: 'x@example.test', password: 'whatever-123' })).status;
    expect(last).toBe(429);
  });

  it('refuses state-changing admin requests without the CSRF header or from a foreign Origin', async () => {
    const agent = await loginAs('owner');
    expect((await agent.post('/api/v1/admin/testimonials').send({ quote: 'x', guestName: 'y' })).status).toBe(403);
    expect((await agent.post('/api/v1/admin/testimonials').set(H).set('Origin', 'https://evil.example').send({ quote: 'x', guestName: 'y' })).status).toBe(403);
    expect((await agent.post('/api/v1/admin/testimonials').set(H).send({ quote: 'x', guestName: 'y' })).status).toBe(201);
  });

  it('changes password, enforces policy, and signs out other sessions', async () => {
    const a = await loginAs('owner', 'boss@example.test');
    const other = request.agent(app);
    await other.post('/api/v1/admin/auth/login').set(H).send({ email: 'boss@example.test', password: PASSWORD });
    expect((await a.post('/api/v1/admin/auth/change-password').set(H).send({ currentPassword: 'wrong', newPassword: 'Another-pass-1234' })).status).toBe(400);
    expect((await a.post('/api/v1/admin/auth/change-password').set(H).send({ currentPassword: PASSWORD, newPassword: 'short1' })).status).toBe(400);
    expect((await a.post('/api/v1/admin/auth/change-password').set(H).send({ currentPassword: PASSWORD, newPassword: 'Another-pass-1234' })).status).toBe(200);
    expect((await a.get('/api/v1/admin/auth/me')).status).toBe(200);
    expect((await other.get('/api/v1/admin/auth/me')).status).toBe(401);
    const relog = await request(app).post('/api/v1/admin/auth/login').set(H).send({ email: 'boss@example.test', password: 'Another-pass-1234' });
    expect(relog.status).toBe(200);
  });

  it('stores only bcrypt hashes', async () => {
    await createAdminUser({ name: 'Owner', email: 'boss@example.test', password: PASSWORD });
    const { rows } = await query(`SELECT password_hash FROM admin_users`);
    expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
    expect(rows[0].password_hash).not.toContain(PASSWORD);
    await expect(createAdminUser({ name: 'W', email: 'weak@example.test', password: 'password' })).rejects.toThrow();
  });
});

describe('booking management', () => {
  async function seed() {
    const v = await makeVilla({ name: 'Ocean', max_guests: 10 });
    const w = await makeVilla({ name: 'Palm', max_guests: 10 });
    const post = (villaId: string | null, over = {}) => request(app).post('/api/v1/booking-enquiries').send(bookingPayload(villaId, over));
    const a = (await post(v.id, { guestName: 'Alice Anand' })).body.data.reference;
    const b = (await post(w.id, { guestName: 'Bhavesh Bhatt', checkIn: addDays(30), checkOut: addDays(32) })).body.data.reference;
    return { v, w, a, b };
  }

  it('shows real database-backed dashboard stats', async () => {
    const agent = await loginAs('owner');
    const empty = (await agent.get('/api/v1/admin/dashboard')).body.data;
    expect(empty).toMatchObject({ publishedVillas: 0, totalBookings: 0, pendingBookings: 0, confirmedBookings: 0, newOwnerEnquiries: 0, newInvestmentEnquiries: 0, recentBookings: [] });
    await seed();
    await request(app).post('/api/v1/villa-owner-enquiries').send({ ownerName: 'O', phone: '9890011223', villaName: 'V', propertyLocation: 'Awas', consent: true });
    const d = (await agent.get('/api/v1/admin/dashboard')).body.data;
    expect(d).toMatchObject({ publishedVillas: 2, totalBookings: 2, pendingBookings: 2, confirmedBookings: 0, newOwnerEnquiries: 1, newInvestmentEnquiries: 0 });
    expect(d.recentBookings).toHaveLength(2);
  });

  it('searches, filters and paginates', async () => {
    const agent = await loginAs('owner');
    const { v, a } = await seed();
    const list = (qs: string) => agent.get(`/api/v1/admin/booking-enquiries${qs}`);
    expect((await list('?q=alice')).body.data).toHaveLength(1);
    expect((await list(`?q=${a}`)).body.data).toHaveLength(1);
    expect((await list(`?villaId=${v.id}`)).body.data).toHaveLength(1);
    expect((await list('?status=Confirmed')).body.data).toHaveLength(0);
    expect((await list(`?from=${addDays(25)}`)).body.data).toHaveLength(1);
    expect((await list(`?to=${addDays(20)}`)).body.data).toHaveLength(1);
    const page = await list('?pageSize=1&page=2');
    expect(page.body.data).toHaveLength(1);
    expect(page.body.meta).toMatchObject({ total: 2, totalPages: 2, page: 2 });
    expect((await list('?status=Bogus')).status).toBe(400);
    expect((await list('?pageSize=5000')).status).toBe(400);
  });

  it('persists status changes and notes, and writes an audit entry without personal data', async () => {
    const agent = await loginAs('owner');
    const { a } = await seed();
    const id = (await query(`SELECT id FROM booking_enquiries WHERE reference = $1`, [a])).rows[0].id;
    const res = await agent.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ status: 'Contacted', internalNotes: 'Called, will call back' });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ status: 'Contacted', internalNotes: 'Called, will call back' });
    const fresh = (await query(`SELECT status, internal_notes, updated_at > created_at AS touched FROM booking_enquiries WHERE id = $1`, [id])).rows[0];
    expect(fresh).toMatchObject({ status: 'Contacted', internal_notes: 'Called, will call back', touched: true });
    const log = (await query(`SELECT action, meta FROM audit_log WHERE action = 'booking.status'`)).rows;
    expect(log).toHaveLength(1);
    expect(JSON.stringify(log[0].meta)).not.toMatch(/Alice|9820/);
    expect((await agent.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({})).status).toBe(400);
    expect((await agent.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ status: 'Sorted' })).status).toBe(400);
  });

  it('only confirms after the admin attests availability was checked, and flags overlaps', async () => {
    const agent = await loginAs('owner');
    const { v } = await seed();
    const post = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id, { guestName: 'Second Guest', phone: '+91 97000 54321' }));
    const rows = (await query(`SELECT id, reference FROM booking_enquiries WHERE villa_id = $1 ORDER BY created_at`, [v.id])).rows;
    expect(post.status).toBe(201);
    const [first, second] = rows;
    const noAttest = await agent.patch(`/api/v1/admin/booking-enquiries/${first.id}`).set(H).send({ status: 'Confirmed' });
    expect(noAttest.status).toBe(422);
    expect(noAttest.body.error.code).toBe('availability_not_checked');
    expect((await agent.patch(`/api/v1/admin/booking-enquiries/${first.id}`).set(H).send({ status: 'Confirmed', availabilityChecked: true })).status).toBe(200);
    const clash = await agent.patch(`/api/v1/admin/booking-enquiries/${second.id}`).set(H).send({ status: 'Confirmed', availabilityChecked: true });
    expect(clash.status).toBe(409);
    expect(clash.body.error.message).toContain(first.reference);
    expect((await agent.patch(`/api/v1/admin/booking-enquiries/${second.id}`).set(H).send({ status: 'Confirmed', availabilityChecked: true, allowOverlap: true })).status).toBe(200);
  });

  it('requires a specific villa before confirming, and lets an admin assign one (with capacity check)', async () => {
    const agent = await loginAs('owner');
    const small = await makeVilla({ name: 'Small', max_guests: 3 });
    const big = await makeVilla({ name: 'Big', max_guests: 10 });
    const ref = (await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(null))).body.data.reference;
    const id = (await query(`SELECT id FROM booking_enquiries WHERE reference = $1`, [ref])).rows[0].id;
    const noVilla = await agent.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ status: 'Confirmed', availabilityChecked: true });
    expect(noVilla.status).toBe(422);
    expect(noVilla.body.error.code).toBe('villa_required');
    expect((await agent.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ villaId: small.id })).status).toBe(422); // 5 guests > 3
    const done = await agent.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ villaId: big.id, status: 'Confirmed', availabilityChecked: true });
    expect(done.status).toBe(200);
    expect(done.body.data).toMatchObject({ villaId: big.id, villaName: 'Big', status: 'Confirmed' });
  });

  it('a public submission never produces a Confirmed status', async () => {
    const v = await makeVilla();
    const res = await request(app).post('/api/v1/booking-enquiries').send({ ...bookingPayload(v.id), status: 'Confirmed' });
    expect(res.body.data.status).toBe('Pending');
  });

  it('staff can work enquiries but cannot confirm or edit content', async () => {
    const staff = await loginAs('staff');
    const { a } = await seed();
    const id = (await query(`SELECT id FROM booking_enquiries WHERE reference = $1`, [a])).rows[0].id;
    expect((await staff.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ status: 'Contacted' })).status).toBe(200);
    expect((await staff.patch(`/api/v1/admin/booking-enquiries/${id}`).set(H).send({ status: 'Confirmed', availabilityChecked: true })).status).toBe(403);
    expect((await staff.put('/api/v1/admin/settings').set(H).send({ businessName: 'X' })).status).toBe(403);
    expect((await staff.post('/api/v1/admin/villas').set(H).send({ name: 'X', bedrooms: 1, maxGuests: 2 })).status).toBe(403);
    expect((await staff.get('/api/v1/admin/villas')).status).toBe(200);
  });

  it('manages owner and investment enquiries', async () => {
    const agent = await loginAs('owner');
    await request(app).post('/api/v1/villa-owner-enquiries').send({ ownerName: 'Vikram', phone: '9890011223', villaName: 'Cliff', propertyLocation: 'Awas', consent: true });
    await request(app).post('/api/v1/investment-enquiries').send({ customerName: 'Ananya', phone: '9765432109', email: 'a@example.test', preferredLocation: 'Kihim', budgetRange: '1-2 cr', propertyType: 'Plot', consent: true });
    const owners = (await agent.get('/api/v1/admin/villa-owner-enquiries?q=cliff')).body.data;
    expect(owners).toHaveLength(1);
    expect((await agent.patch(`/api/v1/admin/villa-owner-enquiries/${owners[0].id}`).set(H).send({ status: 'Contacted' })).body.data.status).toBe('Contacted');
    const inv = (await agent.get('/api/v1/admin/investment-enquiries')).body.data;
    expect((await agent.patch(`/api/v1/admin/investment-enquiries/${inv[0].id}`).set(H).send({ status: 'In Discussion', internalNotes: 'Send plots' })).body.data).toMatchObject({ status: 'In Discussion', internalNotes: 'Send plots' });
    expect((await agent.patch(`/api/v1/admin/investment-enquiries/${inv[0].id}`).set(H).send({ status: 'Confirmed' })).status).toBe(400);
  });
});

describe('villa, settings & testimonial management', () => {
  const villa = (over = {}) => ({ name: 'Sea Breeze', propertyType: 'Sea-View Villa', fullDescription: 'A bright sea-facing villa used by automated tests.', bedrooms: 4, maxGuests: 9, location: 'Kihim', shortDescription: 'Nice', featuredImage: '/demo-villas/ocean.jpg', gallery: [{ url: 'https://cdn.example.test/a.jpg', alt: 'A' }], amenities: [{ label: 'Pool', icon: 'waves' }], highlights: ['Close to beach'], rules: ['No parties'], ...over });

  it('creates, publishes, edits and unpublishes a villa, reflected on the public API', async () => {
    const agent = await loginAs('owner');
    const created = await agent.post('/api/v1/admin/villas').set(H).send(villa());
    expect(created.status).toBe(201);
    expect(created.body.data).toMatchObject({ slug: 'sea-breeze', isPublished: false, startingPrice: null });
    const id = created.body.data.id;
    expect((await request(app).get('/api/v1/villas/sea-breeze')).status).toBe(404); // drafts are private
    expect((await agent.patch(`/api/v1/admin/villas/${id}/publish`).set(H).send({ isPublished: true })).body.data.isPublished).toBe(true);
    const pub = (await request(app).get('/api/v1/villas/sea-breeze')).body.data;
    expect(pub).toMatchObject({ name: 'Sea Breeze', maxGuests: 9, amenities: [{ label: 'Pool', icon: 'waves' }], startingPrice: null });
    expect(pub.gallery).toEqual(['/demo-villas/ocean.jpg', 'https://cdn.example.test/a.jpg']);
    const edited = await agent.put(`/api/v1/admin/villas/${id}`).set(H).send(villa({ name: 'Sea Breeze', maxGuests: 12, startingPrice: 40000, isPublished: true, isFeatured: true }));
    expect(edited.body.data).toMatchObject({ maxGuests: 12, startingPrice: 40000, isFeatured: true });
    await agent.patch(`/api/v1/admin/villas/${id}/publish`).set(H).send({ isPublished: false });
    expect((await request(app).get('/api/v1/villas')).body.data).toHaveLength(0);
  });

  it('validates villa input, image URLs and slug uniqueness; refuses to publish incomplete villas', async () => {
    const agent = await loginAs('owner');
    expect((await agent.post('/api/v1/admin/villas').set(H).send(villa({ featuredImage: 'javascript:alert(1)' }))).status).toBe(400);
    expect((await agent.post('/api/v1/admin/villas').set(H).send(villa({ gallery: [{ url: 'http://insecure.test/a.jpg' }] }))).status).toBe(400);
    expect((await agent.post('/api/v1/admin/villas').set(H).send(villa({ maxGuests: 0 }))).status).toBe(400);
    const a = await agent.post('/api/v1/admin/villas').set(H).send(villa());
    const b = await agent.post('/api/v1/admin/villas').set(H).send(villa());
    expect(b.body.data.slug).toBe('sea-breeze-2'); // auto-unique
    expect((await agent.post('/api/v1/admin/villas').set(H).send(villa({ slug: a.body.data.slug }))).status).toBe(409);
    const incomplete = await agent.post('/api/v1/admin/villas').set(H).send(villa({ featuredImage: null, gallery: [], isPublished: true }));
    expect(incomplete.status).toBe(422);
    expect(incomplete.body.error.code).toBe('villa_incomplete');
  });

  it('updates settings that appear on the public endpoint, and validates the WhatsApp number', async () => {
    const agent = await loginAs('owner');
    expect((await agent.put('/api/v1/admin/settings').set(H).send({ whatsappNumber: '12ab' })).status).toBe(400);
    expect((await agent.put('/api/v1/admin/settings').set(H).send({ socialLinks: { instagram: 'javascript:alert(1)' } })).status).toBe(400);
    const res = await agent.put('/api/v1/admin/settings').set(H).send({ whatsappNumber: '+91 98200 12345', publicEmail: 'hello@example.test', socialLinks: { instagram: 'https://instagram.com/example' } });
    expect(res.status).toBe(200);
    const pub = (await request(app).get('/api/v1/settings/public')).body.data;
    expect(pub).toMatchObject({ whatsappNumber: '919820012345', publicEmail: 'hello@example.test' });
    expect(pub.socialLinks.instagram).toBe('https://instagram.com/example');
  });

  it('manages testimonials with approval gating', async () => {
    const agent = await loginAs('owner');
    const t = await agent.post('/api/v1/admin/testimonials').set(H).send({ quote: 'Lovely', guestName: 'G', isApproved: false });
    expect((await request(app).get('/api/v1/testimonials')).body.data).toHaveLength(0);
    await agent.put(`/api/v1/admin/testimonials/${t.body.data.id}`).set(H).send({ quote: 'Lovely', guestName: 'G', isApproved: true });
    expect((await request(app).get('/api/v1/testimonials')).body.data).toHaveLength(1);
    expect((await agent.delete(`/api/v1/admin/testimonials/${t.body.data.id}`).set(H)).status).toBe(200);
    expect((await agent.delete(`/api/v1/admin/testimonials/${t.body.data.id}`).set(H)).status).toBe(404);
  });
});
