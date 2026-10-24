import type { PoolClient } from 'pg';

/**
 * ILLUSTRATIVE DEMO LISTINGS for the Alibaug area. They are NOT real businesses: names, descriptions, prices and
 * capacities are invented samples. Images are bundled in /public/demo-villas. Every record is flagged is_demo=true.
 * Prices are sample figures only; no ratings, reviews, street addresses or availability are included.
 */
const IMG = {
  ocean: ['ocean', 'Sea-facing villa with pool deck'],
  palm: ['palm', 'Villa among coconut palms'],
  garden: ['garden', 'Villa with lawn and garden lounge'],
  serenity: ['serenity', 'Modern villa with glass frontage'],
  villa: ['hero', 'Villa exterior at golden hour'],
  patio: ['patio', 'Covered patio and outdoor seating'],
  beach: ['beach-alibaug', 'Alibaug beach nearby'],
  kihim: ['beach-kihim', 'Kihim beach nearby'],
  varsoli: ['beach-varsoli', 'Varsoli beach nearby'],
  fort: ['fort', 'Kolaba fort nearby'],
  pano: ['panorama', 'Alibaug coastline panorama'],
} as const;
type ImgKey = keyof typeof IMG;
const gal = (...k: ImgKey[]) => k.map((x) => ({ url: `/demo-villas/${IMG[x][0]}.jpg`, alt: IMG[x][1] }));

type Demo = {
  name: string; slug: string; type: string; badge?: string; location: string; locality: string; bedrooms: number; bathrooms: number; guests: number; price: number | null;
  featured?: boolean; short: string; full: string; amenities: [string, string][]; highlights: string[]; rules: string[]; gallery: ImgKey[]; inTime?: string; outTime?: string;
};

const COMMON_RULES = ['Government photo ID required for all guests', 'Sample house rules — the real rules would come from the owner'];

export const DEMO_VILLAS: Demo[] = [
  { name: 'Azure Crest Villa', slug: 'azure-crest-villa', type: 'Luxury Private Pool Villa', badge: 'Sample', location: 'Awas, Alibaug', locality: 'Awas', bedrooms: 5, bathrooms: 5, guests: 14, price: 38000, featured: true,
    short: 'Sample listing: a five-bedroom pool villa with a sun deck, designed for relaxed family weekends.',
    full: 'DEMO LISTING — not a real property.\n\nAzure Crest is an illustrative five-bedroom private-pool villa used to demonstrate how a listing looks on HolidayAlibag. It shows a typical layout: ensuite bedrooms, an open living and dining space, a pool deck and a covered patio.\n\nReplace this text with the real owner-verified description before publishing a real property.',
    amenities: [['Private Pool', 'waves'], ['Sea Glimpses', 'sun'], ['Air Conditioning', 'wind'], ['Fully Equipped Kitchen', 'utensils'], ['Wi-Fi', 'wifi'], ['Parking', 'car']],
    highlights: ['Pool deck with loungers', 'Five ensuite bedrooms', 'Covered patio for meals'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['ocean', 'patio', 'pano', 'beach'] },
  { name: 'Coconut Grove Retreat', slug: 'coconut-grove-retreat', type: 'Family Holiday Villa', badge: 'Sample', location: 'Varsoli, Alibaug', locality: 'Varsoli', bedrooms: 4, bathrooms: 4, guests: 12, price: 29000, featured: true,
    short: 'Sample listing: a four-bedroom family villa set among coconut palms with a private lawn.',
    full: 'DEMO LISTING — not a real property.\n\nCoconut Grove Retreat is an illustrative family villa with a lawn, a small pool and shaded seating. Use it to preview cards, galleries, amenities and the enquiry flow.',
    amenities: [['Private Pool', 'waves'], ['Lawn & Garden', 'tree'], ['Family Friendly', 'users'], ['Kitchen', 'utensils'], ['Wi-Fi', 'wifi']],
    highlights: ['Large private lawn', 'Palm-shaded seating', 'Short drive to Varsoli beach'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['palm', 'garden', 'varsoli', 'patio'] },
  { name: 'Salt & Sky Sea-View Villa', slug: 'salt-and-sky-sea-view-villa', type: 'Sea-View Villa', badge: 'Sample', location: 'Kihim, Alibaug', locality: 'Kihim', bedrooms: 3, bathrooms: 3, guests: 8, price: 24500, featured: true,
    short: 'Sample listing: a three-bedroom villa with open sea-facing terraces near Kihim.',
    full: 'DEMO LISTING — not a real property.\n\nSalt & Sky is an illustrative sea-view villa with wide terraces and a compact plunge pool, shown here so you can test search by locality and type.',
    amenities: [['Sea View Terrace', 'sun'], ['Plunge Pool', 'waves'], ['Air Conditioning', 'wind'], ['Wi-Fi', 'wifi'], ['TV Lounge', 'tv']],
    highlights: ['Open terraces facing the water', 'Quiet lane near Kihim beach', 'Sunset seating area'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['serenity', 'kihim', 'pano', 'villa'] },
  { name: 'Banyan Courtyard Bungalow', slug: 'banyan-courtyard-bungalow', type: 'Group-Stay Bungalow', badge: 'Sample', location: 'Nagaon, Alibaug', locality: 'Nagaon', bedrooms: 6, bathrooms: 6, guests: 18, price: 42000,
    short: 'Sample listing: a six-bedroom bungalow around a central courtyard, built for group trips.',
    full: 'DEMO LISTING — not a real property.\n\nBanyan Courtyard is an illustrative group-stay bungalow with a shared courtyard, a large dining area and a games corner. It demonstrates how larger capacities are displayed.',
    amenities: [['Courtyard', 'home'], ['Large Dining Hall', 'utensils'], ['Games Corner', 'music'], ['Parking for 6 cars', 'car'], ['Wi-Fi', 'wifi']],
    highlights: ['Six bedrooms for large groups', 'Central courtyard', 'Big dining table'], rules: ['Check-in from 1:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['garden', 'patio', 'beach', 'ocean'], inTime: '13:00' },
  { name: 'Mango Lane Holiday Home', slug: 'mango-lane-holiday-home', type: 'Premium Holiday Home', location: 'Thal, Alibaug', locality: 'Thal', bedrooms: 3, bathrooms: 3, guests: 7, price: 19500,
    short: 'Sample listing: a tidy three-bedroom premium home with a garden and covered parking.',
    full: 'DEMO LISTING — not a real property.\n\nMango Lane is an illustrative premium holiday home for small families, with a garden, a modern kitchen and a quiet neighbourhood setting.',
    amenities: [['Garden', 'tree'], ['Modern Kitchen', 'utensils'], ['Air Conditioning', 'wind'], ['Covered Parking', 'car']],
    highlights: ['Quiet residential lane', 'Garden seating', 'Easy parking'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['villa', 'garden', 'patio', 'fort'] },
  { name: 'Driftwood Hideaway', slug: 'driftwood-hideaway', type: 'Couple-Friendly Stay', badge: 'Sample', location: 'Kihim, Alibaug', locality: 'Kihim', bedrooms: 1, bathrooms: 1, guests: 3, price: 12500,
    short: 'Sample listing: a one-bedroom cottage for two, with a private sit-out and garden shower.',
    full: 'DEMO LISTING — not a real property.\n\nDriftwood Hideaway is an illustrative couples’ cottage showing how a one-bedroom listing appears alongside larger villas.',
    amenities: [['Private Sit-Out', 'sofa'], ['Garden Shower', 'sparkles'], ['Air Conditioning', 'wind'], ['Wi-Fi', 'wifi']],
    highlights: ['Intimate one-bedroom layout', 'Private garden sit-out', 'Walkable to the beach (sample claim)'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', 'Best suited to couples and solo travellers (sample)', ...COMMON_RULES], gallery: ['kihim', 'serenity', 'patio'] },
  { name: 'Horizon Estate', slug: 'horizon-estate', type: 'Large Group Villa', badge: 'Sample', location: 'Awas, Alibaug', locality: 'Awas', bedrooms: 8, bathrooms: 8, guests: 24, price: 68000,
    short: 'Sample listing: an eight-bedroom estate with a pool and event lawn for large gatherings.',
    full: 'DEMO LISTING — not a real property.\n\nHorizon Estate is an illustrative large-group villa used to test high guest capacities, long descriptions and the “large group” filter.',
    amenities: [['Private Pool', 'waves'], ['Event Lawn', 'tree'], ['Outdoor Kitchen', 'flame'], ['Parking for 10 cars', 'car'], ['Wi-Fi', 'wifi']],
    highlights: ['Eight bedrooms', 'Event-sized lawn', 'Pool and covered seating'], rules: ['Check-in from 12:00 PM, check-out by 11:00 AM', 'Events need prior approval (sample rule)', ...COMMON_RULES], gallery: ['ocean', 'serenity', 'garden', 'pano'], inTime: '12:00' },
  { name: 'Tidewater Budget Stay', slug: 'tidewater-budget-stay', type: 'Budget-Friendly Holiday Home', location: 'Revdanda, Alibaug', locality: 'Revdanda', bedrooms: 2, bathrooms: 2, guests: 6, price: 8500,
    short: 'Sample listing: a simple two-bedroom home for small groups watching their budget.',
    full: 'DEMO LISTING — not a real property.\n\nTidewater is an illustrative budget-friendly home with essentials only, shown so you can test price sorting and filters at the lower end.',
    amenities: [['Fans & Cross-Ventilation', 'wind'], ['Basic Kitchen', 'utensils'], ['Parking', 'car']],
    highlights: ['Simple, clean layout', 'Low-key neighbourhood', 'Good for short stays'], rules: ['Check-in from 2:00 PM, check-out by 10:00 AM', ...COMMON_RULES], gallery: ['palm', 'villa', 'fort'], outTime: '10:00' },
  { name: 'Lighthouse Point Villa', slug: 'lighthouse-point-villa', type: 'Sea-View Villa', location: 'Kolaba, Alibaug', locality: 'Kolaba', bedrooms: 4, bathrooms: 4, guests: 10, price: 31000,
    short: 'Sample listing: a four-bedroom villa near the fort with a rooftop lounge.',
    full: 'DEMO LISTING — not a real property.\n\nLighthouse Point is an illustrative villa with a rooftop lounge, to show how rooftop and view amenities are listed.',
    amenities: [['Rooftop Lounge', 'sun'], ['Sea Breeze Balcony', 'wind'], ['Kitchen', 'utensils'], ['Wi-Fi', 'wifi']],
    highlights: ['Rooftop lounge', 'Close to the fort (sample claim)', 'Balcony bedrooms'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['fort', 'pano', 'ocean', 'serenity'] },
  { name: 'Palmyra Pool House', slug: 'palmyra-pool-house', type: 'Luxury Private Pool Villa', badge: 'Sample', location: 'Varsoli, Alibaug', locality: 'Varsoli', bedrooms: 4, bathrooms: 5, guests: 10, price: null,
    short: 'Sample listing with no price set, showing how “Price on enquiry” appears.',
    full: 'DEMO LISTING — not a real property.\n\nPalmyra Pool House has no starting price so you can see how listings without a verified price are shown: the website displays “Price on enquiry”.',
    amenities: [['Private Pool', 'waves'], ['Pool Cabana', 'sofa'], ['Air Conditioning', 'wind'], ['Wi-Fi', 'wifi']],
    highlights: ['Pool with cabana', 'Four bedrooms', 'Price on enquiry'], rules: ['Check-in from 2:00 PM, check-out by 11:00 AM', ...COMMON_RULES], gallery: ['palm', 'ocean', 'varsoli', 'garden'] },
];

/** Inserts the demo villas that do not exist yet (matched by slug). Returns how many were added. */
export async function seedDemoVillas(c: Pick<PoolClient, 'query'>): Promise<number> {
  let added = 0;
  for (const [i, v] of DEMO_VILLAS.entries()) {
    const g = gal(...v.gallery);
    const { rows } = await c.query(
      `INSERT INTO villas (name, slug, badge, property_type, locality, short_description, full_description, location, bedrooms, bathrooms, max_guests, starting_price, currency,
                           featured_image, highlights, house_rules, check_in_time, check_out_time, seo_title, seo_description, is_published, is_featured, display_order, is_demo)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'INR',$13,$14,$15,$16,$17,$18,$19,true,$20,$21,true)
       ON CONFLICT (slug) DO NOTHING RETURNING id`,
      [v.name, v.slug, v.badge ?? null, v.type, v.locality, v.short, v.full, v.location, v.bedrooms, v.bathrooms, v.guests, v.price, g[0].url, v.highlights, v.rules,
       v.inTime ?? '14:00', v.outTime ?? '11:00', `${v.name} — sample listing`, v.short.slice(0, 300), !!v.featured, i],
    );
    if (!rows[0]) continue;
    added++;
    for (const [j, a] of v.amenities.entries()) await c.query(`INSERT INTO villa_amenities (villa_id,label,icon,sort_order) VALUES ($1,$2,$3,$4)`, [rows[0].id, a[0], a[1], j]);
    for (const [j, im] of g.entries()) await c.query(`INSERT INTO villa_images (villa_id,url,alt,sort_order) VALUES ($1,$2,$3,$4)`, [rows[0].id, im.url, im.alt, j]);
  }
  return added;
}
