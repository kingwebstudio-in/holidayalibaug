/** Property categories used for filtering. Shared by validation, filters and the admin form. */
export const PROPERTY_TYPES = [
  'Luxury Private Pool Villa',
  'Family Holiday Villa',
  'Sea-View Villa',
  'Group-Stay Bungalow',
  'Premium Holiday Home',
  'Couple-Friendly Stay',
  'Large Group Villa',
  'Budget-Friendly Holiday Home',
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export const AMENITY_ICONS = ['sparkles', 'waves', 'sun', 'home', 'tree', 'users', 'map-pin', 'sofa', 'utensils', 'wifi', 'car', 'wind', 'tv', 'flame', 'dog', 'music'] as const;
