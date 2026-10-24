import type { PoolClient } from 'pg';
import { query, withTransaction } from '../db/pool.js';
import { AppError, conflict, notFound, unprocessable } from '../lib/errors.js';
import { slugify } from '../lib/text.js';
import { audit } from './audit.js';
import { pruneUnusedAssets } from './imageStorage.js';
import type { VillaInput } from '../validators/admin.js';

type Row = Record<string, any>;
export interface VillaFilters {
  q?: string; location?: string; type?: string; guests?: number; bedrooms?: number; minPrice?: number; maxPrice?: number; featured?: boolean;
  sort?: 'order' | 'price_asc' | 'price_desc' | 'newest' | 'guests_desc'; page?: number; pageSize?: number;
}

const like = (s: string) => `%${s.replace(/[%_\\]/g, '\\$&')}%`;

async function attach(rows: Row[]) {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [am, im] = await Promise.all([
    query(`SELECT villa_id, label, icon FROM villa_amenities WHERE villa_id = ANY($1::uuid[]) ORDER BY sort_order, label`, [ids]),
    query(`SELECT villa_id, url, alt, public_id FROM villa_images WHERE villa_id = ANY($1::uuid[]) ORDER BY sort_order`, [ids]),
  ]);
  return rows.map((r) => ({
    ...r,
    amenities: am.rows.filter((a) => a.villa_id === r.id).map((a) => ({ icon: a.icon, label: a.label })),
    images: im.rows.filter((i) => i.villa_id === r.id).map((i) => ({ url: i.url, alt: i.alt, publicId: i.public_id })),
  }));
}

const publicDto = (v: Row) => ({
  id: v.id,
  name: v.name,
  slug: v.slug,
  badge: v.badge,
  propertyType: v.property_type,
  bedrooms: v.bedrooms,
  bathrooms: v.bathrooms,
  maxGuests: v.max_guests,
  startingPrice: v.starting_price,
  currency: v.currency,
  image: v.featured_image ?? v.images[0]?.url ?? null,
  gallery: [v.featured_image, ...v.images.map((i: Row) => i.url)].filter((u, i, a) => u && a.indexOf(u) === i),
  galleryAlts: Object.fromEntries(v.images.map((i: Row) => [i.url, i.alt])),
  location: v.location,
  locality: v.locality,
  shortDescription: v.short_description,
  fullDescription: v.full_description,
  amenities: v.amenities,
  highlights: v.highlights,
  rules: v.house_rules,
  checkInTime: v.check_in_time,
  checkOutTime: v.check_out_time,
  seoTitle: v.seo_title,
  seoDescription: v.seo_description,
  isFeatured: v.is_featured,
  isDemo: v.is_demo,
});

const adminDto = (v: Row) => ({
  ...publicDto(v),
  addressDetails: v.address_details,
  galleryImages: v.images,
  featuredImage: v.featured_image,
  featuredImagePublicId: v.featured_image_public_id,
  isPublished: v.is_published,
  displayOrder: v.display_order,
  createdAt: v.created_at,
  updatedAt: v.updated_at,
});

const listDto = (v: Row) => ({
  id: v.id, name: v.name, slug: v.slug, propertyType: v.property_type, location: v.location, locality: v.locality,
  bedrooms: v.bedrooms, bathrooms: v.bathrooms, maxGuests: v.max_guests, startingPrice: v.starting_price, currency: v.currency,
  image: v.featured_image, isPublished: v.is_published, isFeatured: v.is_featured, isDemo: v.is_demo, displayOrder: v.display_order, updatedAt: v.updated_at,
});

const pageMeta = (total: number, page: number, pageSize: number) => ({ total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) });

// ───────────────────────────── Public queries ─────────────────────────────
function publicWhere(f: VillaFilters) {
  const where = ['is_published = true'];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace(/\?/g, `$${params.length}`)); };
  if (f.featured !== undefined) add('is_featured = ?', f.featured);
  if (f.guests) add('max_guests >= ?', f.guests);
  if (f.bedrooms) add('bedrooms >= ?', f.bedrooms);
  if (f.type) add('property_type = ?', f.type);
  if (f.minPrice !== undefined) add('starting_price >= ?', f.minPrice);
  if (f.maxPrice !== undefined) add('starting_price <= ?', f.maxPrice);
  if (f.q) add('(name ILIKE ? OR location ILIKE ? OR locality ILIKE ?)', like(f.q));
  if (f.location) add('(locality ILIKE ? OR location ILIKE ?)', like(f.location));
  return { where: where.join(' AND '), params };
}

const ORDER: Record<string, string> = {
  order: 'display_order, name',
  price_asc: 'starting_price ASC NULLS LAST, display_order, name',
  price_desc: 'starting_price DESC NULLS LAST, display_order, name',
  newest: 'created_at DESC',
  guests_desc: 'max_guests DESC, display_order, name',
};

export async function listPublicVillas(f: VillaFilters) {
  const page = f.page ?? 1, pageSize = f.pageSize ?? 12;
  const { where, params } = publicWhere(f);
  const total = Number((await query(`SELECT count(*) FROM villas WHERE ${where}`, params)).rows[0].count);
  const { rows } = await query(`SELECT * FROM villas WHERE ${where} ORDER BY ${ORDER[f.sort ?? 'order']} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, pageSize, (page - 1) * pageSize]);
  return { items: (await attach(rows)).map(publicDto), meta: pageMeta(total, page, pageSize) };
}

/** Lightweight list of every published property (for dropdowns such as the hero selector). */
export async function listVillaOptions() {
  const { rows } = await query(`SELECT id, slug, name, bedrooms, max_guests, is_demo FROM villas WHERE is_published ORDER BY display_order, name LIMIT 500`);
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, bedrooms: r.bedrooms, maxGuests: r.max_guests, isDemo: r.is_demo }));
}

/** Values that actually exist, so filter controls only offer choices that can return results. */
export async function getVillaFacets() {
  const [types, places, agg] = await Promise.all([
    query(`SELECT property_type AS value, count(*) AS count FROM villas WHERE is_published GROUP BY property_type ORDER BY property_type`),
    query(`SELECT COALESCE(NULLIF(locality, ''), location) AS value, count(*) AS count FROM villas WHERE is_published AND COALESCE(NULLIF(locality, ''), location) <> '' GROUP BY 1 ORDER BY 1`),
    query(`SELECT count(*) AS total, min(starting_price) AS min_price, max(starting_price) AS max_price, max(bedrooms) AS max_bedrooms, max(max_guests) AS max_guests, count(starting_price) AS priced FROM villas WHERE is_published`),
  ]);
  const a = agg.rows[0];
  return {
    total: Number(a.total),
    propertyTypes: types.rows.map((r) => ({ value: r.value, count: Number(r.count) })),
    locations: places.rows.map((r) => ({ value: r.value, count: Number(r.count) })),
    priceRange: Number(a.priced) > 0 ? { min: Number(a.min_price), max: Number(a.max_price) } : null,
    maxBedrooms: a.max_bedrooms ? Number(a.max_bedrooms) : 0,
    maxGuests: a.max_guests ? Number(a.max_guests) : 0,
  };
}

export async function getPublicVillaBySlug(slug: string) {
  const { rows } = await query(`SELECT * FROM villas WHERE slug = $1 AND is_published = true`, [slug]);
  if (!rows[0]) throw notFound('Property not found');
  return publicDto((await attach(rows))[0]);
}

export async function getRelatedVillas(slug: string, limit = 3) {
  const cur = (await query(`SELECT id, property_type, locality FROM villas WHERE slug = $1 AND is_published`, [slug])).rows[0];
  if (!cur) throw notFound('Property not found');
  // Same type or same locality first, then anything else; stable, deterministic order.
  const { rows } = await query(
    `SELECT * FROM villas WHERE is_published AND id <> $1
      ORDER BY (property_type = $2)::int + (locality <> '' AND locality = $3)::int DESC, display_order, name LIMIT $4`,
    [cur.id, cur.property_type, cur.locality, limit],
  );
  return (await attach(rows)).map(publicDto);
}

// ───────────────────────────────── Admin ──────────────────────────────────
export async function listAdminVillas(f: { q?: string; status?: string; demo?: string; featured?: string; type?: string; sort?: string; page: number; pageSize: number }) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => { params.push(v); where.push(sql.replace(/\?/g, `$${params.length}`)); };
  if (f.q) add('(name ILIKE ? OR location ILIKE ? OR locality ILIKE ?)', like(f.q));
  if (f.status) where.push(f.status === 'published' ? 'is_published' : 'NOT is_published');
  if (f.demo) where.push(f.demo === 'true' ? 'is_demo' : 'NOT is_demo');
  if (f.featured) where.push(f.featured === 'true' ? 'is_featured' : 'NOT is_featured');
  if (f.type) add('property_type = ?', f.type);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = { updated: 'updated_at DESC', name: 'name', order: 'display_order, name', price_asc: 'starting_price ASC NULLS LAST, name', price_desc: 'starting_price DESC NULLS LAST, name' }[f.sort ?? 'updated'];
  const total = Number((await query(`SELECT count(*) FROM villas ${w}`, params)).rows[0].count);
  const { rows } = await query(`SELECT * FROM villas ${w} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, f.pageSize, (f.page - 1) * f.pageSize]);
  return { items: rows.map(listDto), meta: pageMeta(total, f.page, f.pageSize) };
}

export async function listAdminVillaOptions() {
  const { rows } = await query(`SELECT id, name, is_published, is_demo FROM villas ORDER BY name LIMIT 1000`);
  return rows.map((r) => ({ id: r.id, name: r.name, isPublished: r.is_published, isDemo: r.is_demo }));
}

export async function getAdminVilla(id: string) {
  const { rows } = await query(`SELECT * FROM villas WHERE id = $1`, [id]);
  if (!rows[0]) throw notFound('Property not found');
  return adminDto((await attach(rows))[0]);
}

type Publishable = { name: string; location: string; shortDescription: string; fullDescription: string; featuredImage?: string | null; gallery: { url: string }[] };
function assertPublishable(v: Publishable) {
  const issues: { field: string; message: string }[] = [];
  if (!v.name.trim()) issues.push({ field: 'name', message: 'A name is required to publish.' });
  if (!v.location.trim()) issues.push({ field: 'location', message: 'A location is required to publish.' });
  if (!v.shortDescription.trim()) issues.push({ field: 'shortDescription', message: 'A short description is required to publish.' });
  if (v.fullDescription.trim().length < 20) issues.push({ field: 'fullDescription', message: 'Add a full description (at least 20 characters) to publish.' });
  if (!v.featuredImage && !v.gallery.length) issues.push({ field: 'featuredImage', message: 'A featured image is required to publish.' });
  if (issues.length) throw unprocessable('villa_incomplete', `This property is incomplete and cannot be published: ${issues.map((i) => i.message.replace(/ to publish\.$|\.$/, '')).join('; ')}.`, issues);
}

async function writeChildren(client: PoolClient, villaId: string, v: Pick<VillaInput, 'amenities' | 'gallery'>) {
  await client.query(`DELETE FROM villa_amenities WHERE villa_id = $1`, [villaId]);
  await client.query(`DELETE FROM villa_images WHERE villa_id = $1`, [villaId]);
  for (const [i, a] of v.amenities.entries()) await client.query(`INSERT INTO villa_amenities (villa_id,label,icon,sort_order) VALUES ($1,$2,$3,$4)`, [villaId, a.label, a.icon, i]);
  for (const [i, g] of v.gallery.entries()) await client.query(`INSERT INTO villa_images (villa_id,url,alt,public_id,sort_order) VALUES ($1,$2,$3,$4,$5)`, [villaId, g.url, g.alt, g.publicId ?? null, i]);
}

const COLS = `name, slug, badge, property_type, short_description, full_description, location, locality, address_details, bedrooms, bathrooms, max_guests, starting_price, currency,
  featured_image, featured_image_public_id, highlights, house_rules, check_in_time, check_out_time, seo_title, seo_description, is_published, is_featured, display_order`;
const vals = (v: VillaInput, slug: string) => [
  v.name, slug, v.badge, v.propertyType, v.shortDescription, v.fullDescription, v.location, v.locality, v.addressDetails, v.bedrooms, v.bathrooms, v.maxGuests,
  v.startingPrice ?? null, v.currency, v.featuredImage ?? null, v.featuredImage ? (v.featuredImagePublicId ?? null) : null, v.highlights, v.rules, v.checkInTime, v.checkOutTime,
  v.seoTitle, v.seoDescription, v.isPublished, v.isFeatured, v.displayOrder,
];
const placeholders = (n: number) => Array.from({ length: n }, (_, i) => `$${i + 1}`).join(',');

async function uniqueSlug(client: PoolClient, base: string, excludeId?: string) {
  const root = base || 'property';
  let slug = root;
  for (let n = 2; ; n++) {
    const { rowCount } = await client.query(`SELECT 1 FROM villas WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2)`, [slug, excludeId ?? null]);
    if (!rowCount) return slug;
    slug = `${root}-${n}`;
  }
}

async function assetIds(client: Pick<PoolClient, 'query'>, id: string): Promise<string[]> {
  const r = await client.query(`SELECT featured_image_public_id AS p FROM villas WHERE id = $1 UNION SELECT public_id FROM villa_images WHERE villa_id = $1 AND public_id IS NOT NULL`, [id]);
  return r.rows.map((x) => x.p).filter(Boolean);
}

export async function createVilla(adminId: string, v: VillaInput) {
  if (v.isPublished) assertPublishable(v);
  const id = await withTransaction(async (c) => {
    if (v.slug && (await c.query(`SELECT 1 FROM villas WHERE slug = $1`, [v.slug])).rowCount) throw conflict('That URL slug is already used by another property.');
    const slug = v.slug ?? (await uniqueSlug(c, slugify(v.name)));
    const { rows } = await c.query(`INSERT INTO villas (${COLS}) VALUES (${placeholders(25)}) RETURNING id`, vals(v, slug));
    await writeChildren(c, rows[0].id, v);
    await audit(adminId, 'villa.create', 'villa', rows[0].id, { name: v.name, published: v.isPublished }, c);
    return rows[0].id as string;
  });
  return getAdminVilla(id);
}

export async function updateVilla(adminId: string, id: string, v: VillaInput) {
  if (v.isPublished) assertPublishable(v);
  let before: string[] = [];
  await withTransaction(async (c) => {
    const cur = await c.query(`SELECT slug FROM villas WHERE id = $1 FOR UPDATE`, [id]);
    if (!cur.rows[0]) throw notFound('Property not found');
    before = await assetIds(c, id);
    let slug = cur.rows[0].slug as string;
    if (v.slug && v.slug !== slug) {
      if ((await c.query(`SELECT 1 FROM villas WHERE slug = $1 AND id <> $2`, [v.slug, id])).rowCount) throw conflict('That URL slug is already used by another property.');
      slug = v.slug;
    }
    const sets = COLS.split(',').map((c2, i) => `${c2.trim()} = $${i + 1}`).join(', ');
    await c.query(`UPDATE villas SET ${sets} WHERE id = $26`, [...vals(v, slug), id]);
    await writeChildren(c, id, v);
    await audit(adminId, 'villa.update', 'villa', id, { published: v.isPublished }, c);
  });
  await pruneUnusedAssets(before); // assets removed from this property and not used anywhere else
  return getAdminVilla(id);
}

export async function setVillaPublished(adminId: string, id: string, isPublished: boolean) {
  const cur = await getAdminVilla(id);
  if (isPublished) assertPublishable({ name: cur.name, location: cur.location, shortDescription: cur.shortDescription, fullDescription: cur.fullDescription, featuredImage: cur.featuredImage, gallery: cur.galleryImages });
  await query(`UPDATE villas SET is_published = $2 WHERE id = $1`, [id, isPublished]);
  await audit(adminId, isPublished ? 'villa.publish' : 'villa.unpublish', 'villa', id);
  return getAdminVilla(id);
}

export async function setVillaFeatured(adminId: string, id: string, isFeatured: boolean) {
  const { rowCount } = await query(`UPDATE villas SET is_featured = $2 WHERE id = $1 RETURNING id`, [id, isFeatured]);
  if (!rowCount) throw notFound('Property not found');
  await audit(adminId, isFeatured ? 'villa.feature' : 'villa.unfeature', 'villa', id);
  return getAdminVilla(id);
}

export async function deleteVilla(adminId: string, id: string) {
  let ids: string[] = [];
  let name = '';
  await withTransaction(async (c) => {
    const cur = await c.query(`SELECT name FROM villas WHERE id = $1 FOR UPDATE`, [id]);
    if (!cur.rows[0]) throw notFound('Property not found');
    name = cur.rows[0].name;
    ids = await assetIds(c, id);
    await c.query(`DELETE FROM villas WHERE id = $1`, [id]); // children cascade; enquiries keep their villa-name snapshot
    await audit(adminId, 'villa.delete', 'villa', id, { name }, c);
  });
  await pruneUnusedAssets(ids);
}

/** Copies a property as a new unpublished, non-featured draft. */
export async function duplicateVilla(adminId: string, id: string) {
  const src = await getAdminVilla(id);
  const newId = await withTransaction(async (c) => {
    const slug = await uniqueSlug(c, `${src.slug}-copy`);
    const input: VillaInput = {
      name: `${src.name} (copy)`.slice(0, 160), slug, badge: src.badge, propertyType: src.propertyType as VillaInput['propertyType'], shortDescription: src.shortDescription, fullDescription: src.fullDescription,
      location: src.location, locality: src.locality, addressDetails: src.addressDetails, bedrooms: src.bedrooms, bathrooms: src.bathrooms, maxGuests: src.maxGuests,
      startingPrice: src.startingPrice, currency: src.currency, featuredImage: src.featuredImage, featuredImagePublicId: src.featuredImagePublicId,
      gallery: src.galleryImages.map((g: any) => ({ url: g.url, alt: g.alt, publicId: g.publicId })), amenities: src.amenities as VillaInput['amenities'], highlights: src.highlights, rules: src.rules,
      checkInTime: src.checkInTime, checkOutTime: src.checkOutTime, seoTitle: src.seoTitle, seoDescription: src.seoDescription, isPublished: false, isFeatured: false, displayOrder: src.displayOrder + 1,
    };
    const { rows } = await c.query(`INSERT INTO villas (${COLS}) VALUES (${placeholders(25)}) RETURNING id`, vals(input, slug));
    await writeChildren(c, rows[0].id, input);
    await audit(adminId, 'villa.duplicate', 'villa', rows[0].id, { from: id }, c);
    return rows[0].id as string;
  });
  return getAdminVilla(newId);
}

export { AppError };
