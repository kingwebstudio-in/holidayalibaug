import type { PoolClient } from 'pg';
import { z } from 'zod';
import { config } from '../config.js';
import { query, withTransaction } from '../db/pool.js';
import { daysBetween, todayIn } from '../lib/dates.js';
import { AppError, conflict, forbidden, notFound, unprocessable } from '../lib/errors.js';
import { generateReference } from '../lib/reference.js';
import { audit } from './audit.js';
import { notifyNewEnquiry } from './notifications.js';
import type { bookingEnquirySchema, investmentEnquirySchema, ownerEnquirySchema } from '../validators/public.js';
import type { AdminIdentity } from './auth.js';

type Row = Record<string, any>;
const MAX_NIGHTS = 60;
const MAX_ADVANCE_DAYS = 730;

/** Inserts with a generated reference, retrying on the (very unlikely) reference collision. */
async function insertWithReference(client: PoolClient, prefix: 'HA' | 'OWN' | 'INV', sql: (refIdx: number) => string, params: unknown[]) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = generateReference(prefix);
    await client.query('SAVEPOINT ins');
    try {
      const { rows } = await client.query(sql(params.length + 1), [...params, ref]);
      await client.query('RELEASE SAVEPOINT ins');
      return rows[0] as Row;
    } catch (e: any) {
      await client.query('ROLLBACK TO SAVEPOINT ins');
      if (e.code === '23505' && String(e.constraint).includes('reference')) continue;
      throw e;
    }
  }
  throw new AppError(500, 'reference_failed', 'Could not generate a reference. Please try again.');
}

async function findByKey(table: string, key?: string) {
  if (!key) return null;
  const { rows } = await query(`SELECT * FROM ${table} WHERE idempotency_key = $1`, [key]);
  return rows[0] ?? null;
}

/** What a bot sees when it trips the honeypot: a plausible receipt, but nothing is stored, e-mailed or notified. */
export function fakeReceipt(prefix: 'HA' | 'OWN' | 'INV') {
  return { reference: generateReference(prefix), status: prefix === 'HA' ? 'Pending' : 'New', createdAt: new Date().toISOString() };
}

/** Same person re-submitting the same request (reload + retry, double tap with a new key): return the original instead of a duplicate row. */
async function findRecentDuplicate(sql: string, params: unknown[]) {
  const { rows } = await query(`${sql} AND created_at > now() - interval '15 minutes' ORDER BY created_at DESC LIMIT 1`, params);
  return rows[0] ?? null;
}

async function recordNotification(table: string, id: string, status: string) {
  await query(`UPDATE ${table} SET notification_status = $2 WHERE id = $1`, [id, status]).catch(() => undefined);
}

// ───────────────────────────── Booking enquiries ─────────────────────────────
export async function createBookingEnquiry(input: z.infer<typeof bookingEnquirySchema>, idemKey?: string) {
  const existing = await findByKey('booking_enquiries', idemKey);
  if (existing) return { created: false, enquiry: publicBooking(existing) };

  const dupBooking = await findRecentDuplicate(
    `SELECT * FROM booking_enquiries WHERE phone = $1 AND check_in = $2 AND check_out = $3 AND villa_id IS NOT DISTINCT FROM $4::uuid`,
    [input.phone, input.checkIn, input.checkOut, input.villaId ?? null],
  );
  if (dupBooking) return { created: false, enquiry: publicBooking(dupBooking) };

  const today = todayIn(config.BUSINESS_TIMEZONE);
  if (input.checkIn < today) throw unprocessable('invalid_dates', 'Check-in date cannot be in the past.', [{ field: 'checkIn', message: 'Check-in date cannot be in the past.' }]);
  if (input.checkOut <= input.checkIn) throw unprocessable('invalid_dates', 'Check-out must be after check-in.', [{ field: 'checkOut', message: 'Check-out must be after check-in.' }]);
  if (daysBetween(input.checkIn, input.checkOut) > MAX_NIGHTS) throw unprocessable('invalid_dates', `Stays longer than ${MAX_NIGHTS} nights need to be discussed with our team directly.`, [{ field: 'checkOut', message: `Maximum ${MAX_NIGHTS} nights per enquiry.` }]);
  if (daysBetween(today, input.checkIn) > MAX_ADVANCE_DAYS) throw unprocessable('invalid_dates', 'Check-in date is too far in the future.', [{ field: 'checkIn', message: 'Check-in date is too far in the future.' }]);

  const guests = input.adults + input.children;
  const row = await withTransaction(async (c) => {
    let villaName = 'Any villa';
    let villaId: string | null = null;
    if (input.villaId) {
      const { rows } = await c.query(`SELECT id, name, max_guests FROM villas WHERE id = $1 AND is_published = true`, [input.villaId]);
      if (!rows[0]) throw unprocessable('villa_unavailable', 'The selected villa is not available for enquiries.', [{ field: 'villaId', message: 'Please choose another villa.' }]);
      if (guests > rows[0].max_guests) throw unprocessable('capacity_exceeded', `${rows[0].name} accommodates up to ${rows[0].max_guests} guests.`, [{ field: 'adults', message: `Maximum ${rows[0].max_guests} guests for ${rows[0].name}.` }]);
      villaId = rows[0].id;
      villaName = rows[0].name;
    } else {
      const { rows } = await c.query(`SELECT max(max_guests) AS m FROM villas WHERE is_published = true`);
      if (!rows[0].m) throw unprocessable('no_villas', 'No villas are currently open for enquiries.');
      if (guests > rows[0].m) throw unprocessable('capacity_exceeded', `Our largest villa accommodates up to ${rows[0].m} guests.`, [{ field: 'adults', message: `Maximum ${rows[0].m} guests.` }]);
    }
    return insertWithReference(
      c,
      'HA',
      (n) => `INSERT INTO booking_enquiries (villa_id, villa_name, customer_name, phone, email, check_in, check_out, adults, children, message, consent, idempotency_key, reference)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,$${n}) RETURNING *`,
      [villaId, villaName, input.guestName, input.phone, input.email, input.checkIn, input.checkOut, input.adults, input.children, input.message, idemKey ?? null],
    );
  }).catch(async (e) => {
    if (e?.code === '23505' && idemKey) {
      const dup = await findByKey('booking_enquiries', idemKey);
      if (dup) return dup; // concurrent double-click: return the first record
    }
    throw e;
  });

  const note = await notifyNewEnquiry('New booking enquiry', row.reference, [
    ['Villa', row.villa_name], ['Check-in', row.check_in], ['Check-out', row.check_out], ['Guests', `${row.adults} adults, ${row.children} children`],
    ['Name', row.customer_name], ['Phone', row.phone], ['Email', row.email], ['Message', row.message],
  ]);
  await recordNotification('booking_enquiries', row.id, note);
  return { created: true, enquiry: publicBooking(row) };
}

const publicBooking = (r: Row) => ({ reference: r.reference, status: r.status, villaName: r.villa_name, checkIn: r.check_in, checkOut: r.check_out, adults: r.adults, children: r.children, createdAt: r.created_at });

// ─────────────────────────────── Owner enquiries ─────────────────────────────
export async function createOwnerEnquiry(input: z.infer<typeof ownerEnquirySchema>, idemKey?: string) {
  const existing = await findByKey('villa_owner_enquiries', idemKey);
  if (existing) return { created: false, enquiry: publicLead(existing) };
  const dupOwner = await findRecentDuplicate(`SELECT * FROM villa_owner_enquiries WHERE phone = $1 AND lower(villa_name) = lower($2)`, [input.phone, input.villaName]);
  if (dupOwner) return { created: false, enquiry: publicLead(dupOwner) };
  const row = await withTransaction((c) =>
    insertWithReference(
      c, 'OWN',
      (n) => `INSERT INTO villa_owner_enquiries (owner_name, phone, email, villa_name, property_location, property_details, consent, idempotency_key, reference)
              VALUES ($1,$2,$3,$4,$5,$6,true,$7,$${n}) RETURNING *`,
      [input.ownerName, input.phone, input.email, input.villaName, input.propertyLocation, input.propertyDetails, idemKey ?? null],
    ),
  ).catch(async (e) => {
    if (e?.code === '23505' && idemKey) { const dup = await findByKey('villa_owner_enquiries', idemKey); if (dup) return dup; }
    throw e;
  });
  const note = await notifyNewEnquiry('New villa-owner enquiry', row.reference, [
    ['Owner', row.owner_name], ['Phone', row.phone], ['Email', row.email], ['Villa', row.villa_name], ['Location', row.property_location], ['Details', row.property_details],
  ]);
  await recordNotification('villa_owner_enquiries', row.id, note);
  return { created: true, enquiry: publicLead(row) };
}

// ───────────────────────────── Investment enquiries ──────────────────────────
export async function createInvestmentEnquiry(input: z.infer<typeof investmentEnquirySchema>, idemKey?: string) {
  const existing = await findByKey('investment_enquiries', idemKey);
  if (existing) return { created: false, enquiry: publicLead(existing) };
  const dupInvestment = await findRecentDuplicate(`SELECT * FROM investment_enquiries WHERE phone = $1 AND lower(email) = lower($2)`, [input.phone, input.email]);
  if (dupInvestment) return { created: false, enquiry: publicLead(dupInvestment) };
  const row = await withTransaction((c) =>
    insertWithReference(
      c, 'INV',
      (n) => `INSERT INTO investment_enquiries (customer_name, phone, email, preferred_location, budget_range, property_type, requirements, consent, idempotency_key, reference)
              VALUES ($1,$2,$3,$4,$5,$6,$7,true,$8,$${n}) RETURNING *`,
      [input.customerName, input.phone, input.email, input.preferredLocation, input.budgetRange, input.propertyType, input.requirements, idemKey ?? null],
    ),
  ).catch(async (e) => {
    if (e?.code === '23505' && idemKey) { const dup = await findByKey('investment_enquiries', idemKey); if (dup) return dup; }
    throw e;
  });
  const note = await notifyNewEnquiry('New property-investment enquiry', row.reference, [
    ['Name', row.customer_name], ['Phone', row.phone], ['Email', row.email], ['Location', row.preferred_location], ['Budget', row.budget_range], ['Property type', row.property_type], ['Requirements', row.requirements],
  ]);
  await recordNotification('investment_enquiries', row.id, note);
  return { created: true, enquiry: publicLead(row) };
}

const publicLead = (r: Row) => ({ reference: r.reference, status: r.status, createdAt: r.created_at });

// ─────────────────────────────────── Admin ───────────────────────────────────
const likeEscape = (s: string) => `%${s.replace(/[%_\\]/g, '\\$&')}%`;

const bookingDto = (r: Row) => ({
  id: r.id, reference: r.reference, status: r.status, villaId: r.villa_id, villaName: r.villa_name,
  checkIn: r.check_in, checkOut: r.check_out, adults: r.adults, children: r.children,
  customerName: r.customer_name, phone: r.phone, email: r.email, message: r.message,
  internalNotes: r.internal_notes, notificationStatus: r.notification_status, createdAt: r.created_at, updatedAt: r.updated_at,
});

export async function listBookingEnquiries(f: { q?: string; status?: string; villaId?: string; from?: string; to?: string; page: number; pageSize: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace('?', `$${params.length}`)); };
  if (f.q) { params.push(likeEscape(f.q)); where.push(`(customer_name ILIKE $${params.length} OR reference ILIKE $${params.length} OR phone ILIKE $${params.length})`); }
  if (f.status) add('status = ?', f.status);
  if (f.villaId) add('villa_id = ?', f.villaId);
  if (f.from) add('check_in >= ?', f.from);
  if (f.to) add('check_in <= ?', f.to);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number((await query(`SELECT count(*) FROM booking_enquiries ${w}`, params)).rows[0].count);
  params.push(f.pageSize, (f.page - 1) * f.pageSize);
  const { rows } = await query(`SELECT * FROM booking_enquiries ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return { items: rows.map(bookingDto), total, page: f.page, pageSize: f.pageSize, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) };
}

export async function getBookingEnquiry(id: string) {
  const { rows } = await query(`SELECT * FROM booking_enquiries WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('Enquiry not found');
  return bookingDto(rows[0]);
}

export async function updateBookingEnquiry(admin: AdminIdentity, id: string, patch: { status?: string; internalNotes?: string; villaId?: string; availabilityChecked?: boolean; allowOverlap?: boolean }) {
  await withTransaction(async (c) => {
    const { rows } = await c.query(`SELECT * FROM booking_enquiries WHERE id = $1 FOR UPDATE`, [id]);
    const cur = rows[0];
    if (!cur) throw notFound('Enquiry not found');

    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.villaId && patch.villaId !== cur.villa_id) {
      const v = await c.query(`SELECT id, name, max_guests FROM villas WHERE id = $1`, [patch.villaId]);
      if (!v.rows[0]) throw unprocessable('villa_unavailable', 'That villa does not exist.');
      if (cur.adults + cur.children > v.rows[0].max_guests) throw unprocessable('capacity_exceeded', `${v.rows[0].name} accommodates up to ${v.rows[0].max_guests} guests.`);
      vals.push(v.rows[0].id); sets.push(`villa_id = $${vals.length}`);
      vals.push(v.rows[0].name); sets.push(`villa_name = $${vals.length}`);
      cur.villa_id = v.rows[0].id; // use the newly assigned villa for the overlap check below
      await audit(admin.id, 'booking.villa', 'booking_enquiry', id, { reference: cur.reference, villaId: v.rows[0].id }, c);
    }

    if (patch.status === 'Confirmed' && cur.status !== 'Confirmed') {
      if (admin.role === 'staff') throw forbidden('Only an owner or admin can confirm a booking.');
      if (!patch.availabilityChecked) throw unprocessable('availability_not_checked', 'Confirm that you have checked real availability before marking this booking as Confirmed.');
      if (cur.villa_id && !patch.allowOverlap) {
        const clash = await c.query(
          `SELECT reference FROM booking_enquiries WHERE villa_id = $1 AND status = 'Confirmed' AND id <> $2 AND check_in < $4 AND check_out > $3`,
          [cur.villa_id, id, cur.check_in, cur.check_out],
        );
        if (clash.rowCount) throw conflict(`Dates overlap with confirmed booking ${clash.rows.map((r) => r.reference).join(', ')}. Review before confirming.`);
      }
      if (!cur.villa_id) throw unprocessable('villa_required', 'Assign this enquiry to a specific villa before confirming it.');
    }
    if (patch.status !== undefined) { vals.push(patch.status); sets.push(`status = $${vals.length}`); }
    if (patch.internalNotes !== undefined) { vals.push(patch.internalNotes.trim()); sets.push(`internal_notes = $${vals.length}`); }
    vals.push(id);
    await c.query(`UPDATE booking_enquiries SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    if (patch.status !== undefined && patch.status !== cur.status) await audit(admin.id, 'booking.status', 'booking_enquiry', id, { reference: cur.reference, from: cur.status, to: patch.status }, c);
    if (patch.internalNotes !== undefined) await audit(admin.id, 'booking.notes', 'booking_enquiry', id, { reference: cur.reference }, c);
  });
  return getBookingEnquiry(id);
}

type LeadKind = 'owner' | 'investment';
const LEAD = {
  owner: { table: 'villa_owner_enquiries', entity: 'owner_enquiry', search: ['owner_name', 'villa_name', 'phone', 'reference'] },
  investment: { table: 'investment_enquiries', entity: 'investment_enquiry', search: ['customer_name', 'preferred_location', 'phone', 'reference'] },
} as const;

const ownerDto = (r: Row) => ({ id: r.id, reference: r.reference, ownerName: r.owner_name, phone: r.phone, email: r.email, villaName: r.villa_name, propertyLocation: r.property_location, propertyDetails: r.property_details, status: r.status, internalNotes: r.internal_notes, notificationStatus: r.notification_status, createdAt: r.created_at, updatedAt: r.updated_at });
const investmentDto = (r: Row) => ({ id: r.id, reference: r.reference, customerName: r.customer_name, phone: r.phone, email: r.email, preferredLocation: r.preferred_location, budgetRange: r.budget_range, propertyType: r.property_type, requirements: r.requirements, status: r.status, internalNotes: r.internal_notes, notificationStatus: r.notification_status, createdAt: r.created_at, updatedAt: r.updated_at });
const leadDto = (kind: LeadKind): ((r: Row) => Record<string, unknown>) => (kind === 'owner' ? ownerDto : investmentDto);

export async function listLeads(kind: LeadKind, f: { q?: string; status?: string; page: number; pageSize: number }) {
  const { table, search } = LEAD[kind];
  const where: string[] = [];
  const params: unknown[] = [];
  if (f.q) { params.push(likeEscape(f.q)); where.push(`(${search.map((s) => `${s} ILIKE $${params.length}`).join(' OR ')})`); }
  if (f.status) { params.push(f.status); where.push(`status = $${params.length}`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number((await query(`SELECT count(*) FROM ${table} ${w}`, params)).rows[0].count);
  params.push(f.pageSize, (f.page - 1) * f.pageSize);
  const { rows } = await query(`SELECT * FROM ${table} ${w} ORDER BY created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
  return { items: rows.map(leadDto(kind)), total, page: f.page, pageSize: f.pageSize, totalPages: Math.max(1, Math.ceil(total / f.pageSize)) };
}

export async function updateLead(kind: LeadKind, admin: AdminIdentity, id: string, patch: { status?: string; internalNotes?: string }) {
  const { table, entity } = LEAD[kind];
  await withTransaction(async (c) => {
    const { rows } = await c.query(`SELECT status, reference FROM ${table} WHERE id = $1 FOR UPDATE`, [id]);
    if (!rows[0]) throw notFound('Enquiry not found');
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (patch.status !== undefined) { vals.push(patch.status); sets.push(`status = $${vals.length}`); }
    if (patch.internalNotes !== undefined) { vals.push(patch.internalNotes.trim()); sets.push(`internal_notes = $${vals.length}`); }
    vals.push(id);
    await c.query(`UPDATE ${table} SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    if (patch.status !== undefined && patch.status !== rows[0].status) await audit(admin.id, `${entity}.status`, entity, id, { reference: rows[0].reference, from: rows[0].status, to: patch.status }, c);
    if (patch.internalNotes !== undefined) await audit(admin.id, `${entity}.notes`, entity, id, { reference: rows[0].reference }, c);
  });
  const { rows } = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return leadDto(kind)(rows[0]);
}

export async function dashboardStats() {
  const count = async (sql: string) => Number((await query(sql)).rows[0].count);
  const [publishedVillas, totalBookings, pendingBookings, confirmedBookings, newOwner, newInvestment, bookings7d] = await Promise.all([
    count(`SELECT count(*) FROM villas WHERE is_published`),
    count(`SELECT count(*) FROM booking_enquiries`),
    count(`SELECT count(*) FROM booking_enquiries WHERE status = 'Pending'`),
    count(`SELECT count(*) FROM booking_enquiries WHERE status = 'Confirmed'`),
    count(`SELECT count(*) FROM villa_owner_enquiries WHERE status = 'New'`),
    count(`SELECT count(*) FROM investment_enquiries WHERE status = 'New'`),
    count(`SELECT count(*) FROM booking_enquiries WHERE created_at > now() - interval '7 days'`),
  ]);
  const recent = (await query(`SELECT * FROM booking_enquiries ORDER BY created_at DESC LIMIT 8`)).rows.map(bookingDto);
  return { publishedVillas, totalBookings, pendingBookings, confirmedBookings, newOwnerEnquiries: newOwner, newInvestmentEnquiries: newInvestment, bookingsLast7Days: bookings7d, recentBookings: recent };
}
