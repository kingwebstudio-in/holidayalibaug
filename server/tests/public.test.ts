import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { pool, query } from '../src/db/pool.js';
import { addDays, app, bookingPayload, closePool, setupDb, makeVilla, resetDb } from './helpers.js';

beforeAll(setupDb);
beforeEach(resetDb);
afterAll(closePool);

describe('health & public villas', () => {
  it('reports database health', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok', database: 'up' } });
  });

  it('lists only published villas, supports filters, and hides internal fields', async () => {
    await makeVilla({ name: 'Alpha', slug: 'alpha', max_guests: 6, is_featured: true });
    await makeVilla({ name: 'Beta', slug: 'beta', max_guests: 14 });
    await makeVilla({ name: 'Hidden', slug: 'hidden', is_published: false });
    const all = await request(app).get('/api/v1/villas');
    expect(all.body.data.map((v: any) => v.slug)).toEqual(['alpha', 'beta']);
    expect(all.body.data[0]).not.toHaveProperty('addressDetails');
    expect((await request(app).get('/api/v1/villas?featured=true')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/villas?guests=10')).body.data.map((v: any) => v.slug)).toEqual(['beta']);
    expect((await request(app).get('/api/v1/villas?q=alp')).body.data).toHaveLength(1);
    expect((await request(app).get('/api/v1/villas?q=%25')).body.data).toHaveLength(0); // LIKE wildcards are escaped
  });

  it('rejects invalid query parameters and unknown or unpublished slugs', async () => {
    expect((await request(app).get('/api/v1/villas?guests=abc')).status).toBe(400);
    expect((await request(app).get('/api/v1/villas?featured=maybe')).status).toBe(400);
    await makeVilla({ slug: 'secret', is_published: false });
    expect((await request(app).get('/api/v1/villas/secret')).status).toBe(404);
    expect((await request(app).get('/api/v1/villas/does-not-exist')).status).toBe(404);
    expect((await request(app).get("/api/v1/villas/Bad_Slug'--")).status).toBe(400);
  });

  it('returns 404 JSON for unknown API routes', async () => {
    const res = await request(app).get('/api/v1/nope');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });
});

describe('booking enquiries', () => {
  it('persists a valid enquiry and returns a reference only after the DB write', async () => {
    const v = await makeVilla({ max_guests: 8 });
    const res = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id));
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^HA-\d{8}-[A-Z2-9]{6}$/);
    expect(res.body.data.status).toBe('Pending');
    expect(res.body.data.message).toMatch(/not confirmed/i);
    const { rows } = await query(`SELECT * FROM booking_enquiries WHERE reference = $1`, [res.body.data.reference]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ villa_id: v.id, status: 'Pending', adults: 4, children: 1, customer_name: 'Asha Kulkarni', phone: '+919820012345', check_in: addDays(10) });
  });

  it('accepts an "any villa" enquiry', async () => {
    await makeVilla({ max_guests: 8 });
    const res = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(null));
    expect(res.status).toBe(201);
    expect(res.body.data.villaName).toBe('Any villa');
  });

  it.each([
    ['past check-in', { checkIn: addDays(-1), checkOut: addDays(2) }, 422],
    ['check-out equal to check-in', { checkIn: addDays(5), checkOut: addDays(5) }, 422],
    ['check-out before check-in', { checkIn: addDays(8), checkOut: addDays(5) }, 422],
    ['over-long stay', { checkIn: addDays(5), checkOut: addDays(120) }, 422],
    ['malformed date', { checkIn: '2026-13-45' }, 400],
    ['non-date string', { checkOut: 'tomorrow' }, 400],
    ['missing consent', { consent: false }, 400],
    ['invalid phone', { phone: '12ab' }, 400],
    ['invalid email', { email: 'not-an-email' }, 400],
    ['empty name', { guestName: '   ' }, 400],
    ['zero adults', { adults: 0 }, 400],
    ['negative children', { children: -1 }, 400],
  ])('rejects %s', async (_n, over, status) => {
    const v = await makeVilla();
    const res = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id, over));
    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);
    expect((await query(`SELECT count(*) FROM booking_enquiries`)).rows[0].count).toBe('0');
  });

  it('enforces guest capacity per villa and across the collection', async () => {
    const v = await makeVilla({ max_guests: 6 });
    const over = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id, { adults: 5, children: 2 }));
    expect(over.status).toBe(422);
    expect(over.body.error.code).toBe('capacity_exceeded');
    const exact = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id, { adults: 5, children: 1 }));
    expect(exact.status).toBe(201);
    const any = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(null, { adults: 7, children: 0 }));
    expect(any.status).toBe(422);
  });

  it('rejects unknown, unpublished and malformed villa ids', async () => {
    const hidden = await makeVilla({ is_published: false });
    expect((await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(hidden.id))).status).toBe(422);
    expect((await request(app).post('/api/v1/booking-enquiries').send(bookingPayload('11111111-1111-4111-8111-111111111111'))).status).toBe(422);
    expect((await request(app).post('/api/v1/booking-enquiries').send(bookingPayload('not-a-uuid'))).status).toBe(400);
  });

  it('does not create duplicates when the same Idempotency-Key is replayed (double click)', async () => {
    const v = await makeVilla();
    const send = () => request(app).post('/api/v1/booking-enquiries').set('Idempotency-Key', 'abcdef123456').send(bookingPayload(v.id));
    const [a, b] = await Promise.all([send(), send()]);
    const c = await send();
    expect([a.status, b.status, c.status].every((s) => s === 200 || s === 201)).toBe(true);
    expect(new Set([a.body.data.reference, b.body.data.reference, c.body.data.reference]).size).toBe(1);
    expect((await query(`SELECT count(*) FROM booking_enquiries`)).rows[0].count).toBe('1');
  });

  it('stores hostile text as inert plain text and strips control characters', async () => {
    const v = await makeVilla();
    const res = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id, { guestName: 'Eve\u0000 <script>alert(1)</script>', message: "x'); DROP TABLE villas;--" }));
    expect(res.status).toBe(201);
    const { rows } = await query(`SELECT customer_name, message FROM booking_enquiries`);
    expect(rows[0].customer_name).toBe('Eve <script>alert(1)</script>'); // stored verbatim as text; React escapes on render
    expect(rows[0].message).toContain('DROP TABLE');
    expect((await query(`SELECT count(*) FROM villas`)).rows[0].count).toBe('1');
  });

  it('returns an error (never a success) when the database write fails', async () => {
    const v = await makeVilla();
    const spy = vi.spyOn(pool, 'connect').mockRejectedValueOnce(new Error('db down'));
    const res = await request(app).post('/api/v1/booking-enquiries').send(bookingPayload(v.id));
    spy.mockRestore();
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeUndefined();
  });

  it('rejects malformed JSON and an invalid idempotency header', async () => {
    expect((await request(app).post('/api/v1/booking-enquiries').set('Content-Type', 'application/json').send('{bad')).status).toBe(400);
    const v = await makeVilla();
    expect((await request(app).post('/api/v1/booking-enquiries').set('Idempotency-Key', 'x').send(bookingPayload(v.id))).status).toBe(400);
  });
});

describe('owner & investment enquiries', () => {
  it('persists a villa-owner enquiry', async () => {
    const res = await request(app).post('/api/v1/villa-owner-enquiries').send({ ownerName: 'Vikram Rao', phone: '9890011223', villaName: 'Cliff House', propertyLocation: 'Awas', propertyDetails: '4 BHK with pool', consent: true });
    expect(res.status).toBe(201);
    expect(res.body.data.reference).toMatch(/^OWN-/);
    const { rows } = await query(`SELECT * FROM villa_owner_enquiries`);
    expect(rows[0]).toMatchObject({ owner_name: 'Vikram Rao', status: 'New', email: null });
  });
  it('validates owner enquiries', async () => {
    expect((await request(app).post('/api/v1/villa-owner-enquiries').send({ ownerName: '', phone: '1', villaName: '', propertyLocation: '', consent: false })).status).toBe(400);
  });
  it('persists an investment enquiry and validates required fields', async () => {
    const ok = await request(app).post('/api/v1/investment-enquiries').send({ customerName: 'Ananya D', phone: '9765432109', email: 'a@example.test', preferredLocation: 'Kihim', budgetRange: 'Above ₹2 crore', propertyType: 'Holiday Home', requirements: 'Plot near beach', consent: true });
    expect(ok.status).toBe(201);
    expect(ok.body.data.reference).toMatch(/^INV-/);
    expect((await query(`SELECT count(*) FROM investment_enquiries`)).rows[0].count).toBe('1');
    const bad = await request(app).post('/api/v1/investment-enquiries').send({ customerName: 'A', phone: '9765432109', preferredLocation: 'x', budgetRange: 'y', propertyType: 'z', consent: true });
    expect(bad.status).toBe(400); // email required
  });
});

describe('public settings & testimonials', () => {
  it('returns no business numbers until configured and never invents them', async () => {
    const res = await request(app).get('/api/v1/settings/public');
    expect(res.body.data.whatsappNumber).toBeNull();
    expect(res.body.data.publicPhone).toBeNull();
    expect(res.body.data.publicEmail).toBeNull();
  });
  it('returns only approved testimonials', async () => {
    await query(`INSERT INTO testimonials (quote, guest_name, is_approved) VALUES ('Great','A',true),('Secret draft','B',false)`);
    const res = await request(app).get('/api/v1/testimonials');
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].guestName).toBe('A');
  });
});
