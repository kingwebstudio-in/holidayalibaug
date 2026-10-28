import { Destination, Experience } from '../types';

import thumbOcean from '../assets/images/villa_ocean_estate_1791832507656-160.webp';
import thumbPalm from '../assets/images/villa_palm_retreat_1791832520404-160.webp';
import thumbGarden from '../assets/images/villa_garden_estate_1791832533757-160.webp';
import villaOceanImg from '../assets/images/villa_ocean_estate_1791832507656.webp';
import villaPalmImg from '../assets/images/villa_palm_retreat_1791832520404.webp';
import villaGardenImg from '../assets/images/villa_garden_estate_1791832533757.webp';
import villaSerenityImg from '../assets/images/villa_serenity_estate_1791832549772.webp';
import alibaugPanoramaImg from '../assets/images/alibaug_panorama_1791832559150.webp';
import alibaugBeachThumb from '../assets/images/alibaug_beach_thumb_1791832597957-480.webp';
import varsoliBeachThumb from '../assets/images/varsoli_beach_thumb_1791832611563-480.webp';
import kihimBeachThumb from '../assets/images/kihim_beach_thumb_1791832621989-480.webp';
import alibaugFortThumb from '../assets/images/alibaug_fort_thumb_1791832637389-480.webp';
import villaOwnerPatioImg from '../assets/images/villa_owner_patio_1791832682680-760.webp';

/** Brand constants only. Phone, e-mail and WhatsApp live in Admin → Website Settings (never hardcoded here). */
export const SITE_CONFIG = {
  name: 'HolidayAlibag',
  tagline: 'VILLAS · STAYS · EXPERIENCES',
  domain: 'holidayalibaug.com',
  /** Public origin used only for display text; canonical URLs come from the server's SITE_URL. */
  address: 'Alibaug, Raigad, Maharashtra, India',
};

/** Responsive candidates for the default hero (the LCP image): the browser picks the smallest that fills the screen. */
export const HERO_IMAGE = '/hero/hero-1376.webp';
export const HERO_SRCSET = '/hero/hero-640.webp 640w, /hero/hero-960.webp 960w, /hero/hero-1376.webp 1376w'; // keep in step with HERO_PRELOAD in server/src/seo.ts

export const IMAGES = {
  hero: HERO_IMAGE,
  thumbOcean,
  thumbPalm,
  thumbGarden,
  villaOcean: villaOceanImg,
  villaPalm: villaPalmImg,
  villaGarden: villaGardenImg,
  villaSerenity: villaSerenityImg,
  alibaugPanorama: alibaugPanoramaImg,
  alibaugBeach: alibaugBeachThumb,
  varsoliBeach: varsoliBeachThumb,
  kihimBeach: kihimBeachThumb,
  alibaugFort: alibaugFortThumb,
  villaOwnerPatio: villaOwnerPatioImg,
};

export const EXPERIENCES: Experience[] = [
  {
    id: 'private-pool',
    label: 'Private Pool',
    icon: 'waves',
    description: 'Every villa includes a clean, secluded, temperature-friendly private swimming pool maintained daily.',
  },
  {
    id: 'chef-dining',
    label: 'Chef & Dining',
    sublabel: '(on Request)',
    icon: 'chef-hat',
    description: 'Authentic coastal Konkani curries, fresh sea catch, and customized multi-course menus prepared by private cooks.',
  },
  {
    id: 'bbq-celebrations',
    label: 'BBQ & Celebrations',
    icon: 'flame',
    description: 'Poolside charcoal barbecue setups, birthday styling, anniversaries, and family celebrations.',
  },
  {
    id: 'beach-access',
    label: 'Beach Access',
    icon: 'umbrella',
    description: 'Villas situated within walking distance or a short private ride to Alibaug’s quietest sandy beaches.',
  },
  {
    id: 'sightseeing',
    label: 'Sightseeing',
    icon: 'landmark',
    description: 'Curated heritage visits to Kolaba Fort, Murud-Janjira, and charming local coastal artisan markets.',
  },
  {
    id: 'water-activities',
    label: 'Water Activities',
    icon: 'sailboat',
    description: 'Jet ski excursions, banana boat rides, sea kayaking, and sunset sailing off the coast.',
  },
];

export const DESTINATIONS: Destination[] = [
  {
    id: 'alibaug-beach',
    name: 'Alibaug Beach',
    travelTime: '10 mins',
    distance: '3.5 km',
    image: alibaugBeachThumb,
    description: 'The historic town beach offering panoramic views of Kolaba Fort standing out in the sea waves.',
  },
  {
    id: 'varsoli-beach',
    name: 'Varsoli Beach',
    travelTime: '15 mins',
    distance: '5.2 km',
    image: varsoliBeachThumb,
    description: 'Peaceful white-sand crescent lined with casuarina trees, famous for tranquil walks and water sports.',
  },
  {
    id: 'kihim-beach',
    name: 'Kihim Beach',
    travelTime: '20 mins',
    distance: '9.8 km',
    image: kihimBeachThumb,
    description: 'A verdant coastal stretch renowned for its rich birdlife, dense coconut groves, and romantic sunset vistas.',
  },
  {
    id: 'alibaug-fort',
    name: 'Alibaug Fort',
    travelTime: '25 mins',
    distance: '6.0 km',
    image: alibaugFortThumb,
    description: 'Historic Kolaba Fort built in 1680 by Chhatrapati Shivaji Maharaj, accessible by foot during low tide.',
  },
];

export const TRUST_HIGHLIGHTS = [
  { icon: 'home', label: 'Premium Villas' },
  { icon: 'map-pin', label: 'Best Locations' },
  { icon: 'users', label: 'Family & Group Friendly' },
  { icon: 'sparkles', label: 'Curated Experiences' },
];
