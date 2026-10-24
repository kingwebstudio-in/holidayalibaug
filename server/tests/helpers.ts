import request from 'supertest';
import { createApp } from '../src/app.js';
import { config } from '../src/config.js';
import { prepareDatabase } from '../src/db/bootstrap.js';
import { pool, query } from '../src/db/pool.js';
import { todayIn } from '../src/lib/dates.js';
import { createAdminUser } from '../src/services/auth.js';

export const app = createApp({ rateLimit: false });
export { pool };
export const H = { 'X-Requested-With': 'HolidayAlibagAdmin' };

export const addDays = (n: number) => {
  const [y, m, d] = todayIn(config.BUSINESS_TIMEZONE).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
};

export async function resetDb() {
  await query(`TRUNCATE audit_log, admin_sessions, admin_users, booking_enquiries, villa_owner_enquiries, investment_enquiries, villa_images, villa_amenities, villas, site_settings, testimonials RESTART IDENTITY CASCADE`);
}
export const closePool = () => pool.end();
/** Creates/migrates the schema for whichever data mode the suite is running in. Call in beforeAll. */
export const setupDb = () => prepareDatabase({ migrate: true });
export const MODE = process.env.TEST_DATA_MODE;

export async function makeVilla(over: Record<string, unknown> = {}) {
  const v = { name: 'Test Villa', slug: `test-villa-${Math.random().toString(36).slice(2, 8)}`, bedrooms: 3, max_guests: 8, is_published: true, is_featured: false, location: 'Alibaug', short_description: 'A test villa', featured_image: '/demo-villas/ocean.jpg', display_order: 0, ...over } as any;
  const { rows } = await query(
    `INSERT INTO villas (name, slug, bedrooms, max_guests, is_published, is_featured, location, short_description, full_description, featured_image, display_order, property_type, locality, starting_price, is_demo)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
    [v.name, v.slug, v.bedrooms, v.max_guests, v.is_published, v.is_featured, v.location, v.short_description, v.full_description ?? 'A fully described test villa for automated checks.', v.featured_image, v.display_order,
     v.property_type ?? 'Family Holiday Villa', v.locality ?? '', v.starting_price ?? null, v.is_demo ?? false],
  );
  return rows[0] as { id: string; slug: string; name: string };
}

export const PASSWORD = 'Sup3r-secret-pass-99';
export async function loginAs(role: 'owner' | 'admin' | 'staff' = 'owner', email = `${role}@example.test`) {
  await createAdminUser({ name: `${role} user`, email, password: PASSWORD, role });
  const agent = request.agent(app);
  const res = await agent.post('/api/v1/admin/auth/login').set(H).send({ email, password: PASSWORD });
  if (res.status !== 200) throw new Error(`login failed: ${res.status} ${JSON.stringify(res.body)}`);
  return agent;
}

export const bookingPayload = (villaId: string | null, over: Record<string, unknown> = {}) => ({
  villaId, checkIn: addDays(10), checkOut: addDays(13), adults: 4, children: 1,
  guestName: 'Asha Kulkarni', phone: '+91 98200 12345', email: 'asha@example.test', message: 'Early check-in please', consent: true, ...over,
});
