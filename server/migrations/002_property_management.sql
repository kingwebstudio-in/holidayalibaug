-- Property management: property type, locality, stay times, SEO, image asset ids, extra indexes.

ALTER TABLE villas
  ADD COLUMN property_type text NOT NULL DEFAULT 'Family Holiday Villa' CHECK (char_length(property_type) BETWEEN 1 AND 80),
  ADD COLUMN locality text NOT NULL DEFAULT '' CHECK (char_length(locality) <= 120),
  ADD COLUMN check_in_time text NOT NULL DEFAULT '14:00' CHECK (check_in_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD COLUMN check_out_time text NOT NULL DEFAULT '11:00' CHECK (check_out_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  ADD COLUMN seo_title text CHECK (seo_title IS NULL OR char_length(seo_title) <= 120),
  ADD COLUMN seo_description text CHECK (seo_description IS NULL OR char_length(seo_description) <= 320),
  ADD COLUMN featured_image_public_id text;

-- Image storage provider asset id (e.g. Cloudinary public_id). NULL for plain URLs / bundled images.
ALTER TABLE villa_images ADD COLUMN public_id text;

CREATE INDEX villas_type_idx ON villas (property_type) WHERE is_published;
CREATE INDEX villas_locality_idx ON villas (lower(locality)) WHERE is_published;
CREATE INDEX villas_price_idx ON villas (starting_price) WHERE is_published AND starting_price IS NOT NULL;
CREATE INDEX villas_guests_idx ON villas (max_guests) WHERE is_published;
CREATE INDEX villas_demo_idx ON villas (is_demo);
CREATE INDEX villas_updated_idx ON villas (updated_at DESC);
CREATE INDEX villa_images_public_id_idx ON villa_images (public_id) WHERE public_id IS NOT NULL;
CREATE INDEX villas_featured_public_id_idx ON villas (featured_image_public_id) WHERE featured_image_public_id IS NOT NULL;
