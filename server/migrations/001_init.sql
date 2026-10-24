-- HolidayAlibag initial schema.  Applied by `npm run db:migrate`.

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ───────────────────────── Admin users & sessions ─────────────────────────
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  password_hash text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('owner', 'admin', 'staff')),
  is_active boolean NOT NULL DEFAULT true,
  failed_login_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX admin_users_email_lower_idx ON admin_users (lower(email));
CREATE TRIGGER admin_users_updated BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE admin_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_sessions_admin_idx ON admin_sessions (admin_id);
CREATE INDEX admin_sessions_expires_idx ON admin_sessions (expires_at);

-- ───────────────────────────────── Villas ─────────────────────────────────
CREATE TABLE villas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  badge text,
  short_description text NOT NULL DEFAULT '',
  full_description text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  address_details text,
  bedrooms integer NOT NULL CHECK (bedrooms BETWEEN 1 AND 50),
  bathrooms integer NOT NULL DEFAULT 1 CHECK (bathrooms BETWEEN 0 AND 50),
  max_guests integer NOT NULL CHECK (max_guests BETWEEN 1 AND 100),
  -- Only fill when the business has verified the price. NULL => "price on enquiry".
  starting_price integer CHECK (starting_price IS NULL OR starting_price >= 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  featured_image text,
  highlights text[] NOT NULL DEFAULT '{}',
  house_rules text[] NOT NULL DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  is_demo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX villas_public_idx ON villas (is_published, display_order, name);
CREATE TRIGGER villas_updated BEFORE UPDATE ON villas FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE villa_amenities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id uuid NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (char_length(label) BETWEEN 1 AND 80),
  icon text NOT NULL DEFAULT 'sparkles',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX villa_amenities_villa_idx ON villa_amenities (villa_id, sort_order);

CREATE TABLE villa_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  villa_id uuid NOT NULL REFERENCES villas(id) ON DELETE CASCADE,
  url text NOT NULL CHECK (char_length(url) <= 2000),
  alt text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE INDEX villa_images_villa_idx ON villa_images (villa_id, sort_order);

-- ──────────────────────────────── Enquiries ───────────────────────────────
CREATE TABLE booking_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  villa_id uuid REFERENCES villas(id) ON DELETE SET NULL,
  villa_name text NOT NULL,                       -- snapshot at submission time ("Any villa" when none chosen)
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 30),
  email text CHECK (email IS NULL OR char_length(email) <= 254),
  check_in date NOT NULL,
  check_out date NOT NULL,
  adults integer NOT NULL CHECK (adults BETWEEN 1 AND 100),
  children integer NOT NULL DEFAULT 0 CHECK (children BETWEEN 0 AND 100),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  consent boolean NOT NULL CHECK (consent),
  -- 'Confirmed' may only be set by an admin after checking real availability.
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending','Contacted','Confirmed','Cancelled','Completed')),
  internal_notes text NOT NULL DEFAULT '' CHECK (char_length(internal_notes) <= 5000),
  notification_status text NOT NULL DEFAULT 'not_attempted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out > check_in)
);
CREATE INDEX booking_enquiries_status_idx ON booking_enquiries (status, created_at DESC);
CREATE INDEX booking_enquiries_created_idx ON booking_enquiries (created_at DESC);
CREATE INDEX booking_enquiries_villa_idx ON booking_enquiries (villa_id);
CREATE INDEX booking_enquiries_checkin_idx ON booking_enquiries (check_in);
CREATE TRIGGER booking_enquiries_updated BEFORE UPDATE ON booking_enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE villa_owner_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  owner_name text NOT NULL CHECK (char_length(owner_name) BETWEEN 1 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 30),
  email text CHECK (email IS NULL OR char_length(email) <= 254),
  villa_name text NOT NULL CHECK (char_length(villa_name) BETWEEN 1 AND 160),
  property_location text NOT NULL CHECK (char_length(property_location) BETWEEN 1 AND 160),
  property_details text CHECK (property_details IS NULL OR char_length(property_details) <= 3000),
  consent boolean NOT NULL CHECK (consent),
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Contacted','In Discussion','Closed')),
  internal_notes text NOT NULL DEFAULT '' CHECK (char_length(internal_notes) <= 5000),
  notification_status text NOT NULL DEFAULT 'not_attempted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX owner_enquiries_status_idx ON villa_owner_enquiries (status, created_at DESC);
CREATE TRIGGER owner_enquiries_updated BEFORE UPDATE ON villa_owner_enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE investment_enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE,
  idempotency_key text UNIQUE,
  customer_name text NOT NULL CHECK (char_length(customer_name) BETWEEN 1 AND 120),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 6 AND 30),
  email text NOT NULL CHECK (char_length(email) <= 254),
  preferred_location text NOT NULL CHECK (char_length(preferred_location) BETWEEN 1 AND 160),
  budget_range text NOT NULL CHECK (char_length(budget_range) BETWEEN 1 AND 80),
  property_type text NOT NULL CHECK (char_length(property_type) BETWEEN 1 AND 80),
  requirements text CHECK (requirements IS NULL OR char_length(requirements) <= 3000),
  consent boolean NOT NULL CHECK (consent),
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Contacted','In Discussion','Closed')),
  internal_notes text NOT NULL DEFAULT '' CHECK (char_length(internal_notes) <= 5000),
  notification_status text NOT NULL DEFAULT 'not_attempted',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX investment_enquiries_status_idx ON investment_enquiries (status, created_at DESC);
CREATE TRIGGER investment_enquiries_updated BEFORE UPDATE ON investment_enquiries FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────── Settings, testimonials, audit ────────────────────
CREATE TABLE site_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_by uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote text NOT NULL CHECK (char_length(quote) BETWEEN 1 AND 1000),
  guest_name text NOT NULL CHECK (char_length(guest_name) BETWEEN 1 AND 120),
  city text,
  villa_name text,
  rating integer NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_approved boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX testimonials_public_idx ON testimonials (is_approved, display_order);
CREATE TRIGGER testimonials_updated BEFORE UPDATE ON testimonials FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Records WHAT an admin did, never customer personal data.
CREATE TABLE audit_log (
  id bigserial PRIMARY KEY,
  admin_id uuid REFERENCES admin_users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  meta jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_log_created_idx ON audit_log (created_at DESC);
