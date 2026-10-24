import { query } from '../db/pool.js';
import { notFound } from '../lib/errors.js';
import { audit } from './audit.js';

type Row = Record<string, any>;
const dto = (r: Row) => ({ id: r.id, quote: r.quote, guestName: r.guest_name, city: r.city, villaName: r.villa_name, rating: r.rating, isApproved: r.is_approved, displayOrder: r.display_order });

export async function listPublicTestimonials() {
  const { rows } = await query(`SELECT * FROM testimonials WHERE is_approved ORDER BY display_order, created_at DESC LIMIT 20`);
  return rows.map(dto);
}
export async function listAdminTestimonials() {
  const { rows } = await query(`SELECT * FROM testimonials ORDER BY display_order, created_at DESC`);
  return rows.map(dto);
}
export async function createTestimonial(adminId: string, t: any) {
  const { rows } = await query(
    `INSERT INTO testimonials (quote, guest_name, city, villa_name, rating, is_approved, display_order) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [t.quote, t.guestName, t.city, t.villaName, t.rating, t.isApproved, t.displayOrder],
  );
  await audit(adminId, 'testimonial.create', 'testimonial', rows[0].id, { approved: t.isApproved });
  return dto(rows[0]);
}
export async function updateTestimonial(adminId: string, id: string, t: any) {
  const { rows } = await query(
    `UPDATE testimonials SET quote=$2, guest_name=$3, city=$4, villa_name=$5, rating=$6, is_approved=$7, display_order=$8 WHERE id=$1 RETURNING *`,
    [id, t.quote, t.guestName, t.city, t.villaName, t.rating, t.isApproved, t.displayOrder],
  );
  if (!rows[0]) throw notFound('Testimonial not found');
  await audit(adminId, 'testimonial.update', 'testimonial', id, { approved: t.isApproved });
  return dto(rows[0]);
}
export async function deleteTestimonial(adminId: string, id: string) {
  const { rowCount } = await query(`DELETE FROM testimonials WHERE id = $1`, [id]);
  if (!rowCount) throw notFound('Testimonial not found');
  await audit(adminId, 'testimonial.delete', 'testimonial', id);
}
