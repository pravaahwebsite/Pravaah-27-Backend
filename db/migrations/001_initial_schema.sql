-- Pravaah 2027 initial schema.
-- Apply only after the Supabase connection is working and the business rules are reviewed.
-- Run as one transaction so a failed statement does not leave a partial schema.

BEGIN;

CREATE TABLE profiles (
  firebase_uid text PRIMARY KEY,
  email text NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  full_name text,
  phone text,
  college text,
  photo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX profiles_email_lower_unique_idx ON profiles (lower(email));

CREATE TABLE user_roles (
  firebase_uid text NOT NULL REFERENCES profiles(firebase_uid) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('Admin', 'Scanner', 'SuperAdmin', 'SuperAccount')),
  assigned_by text REFERENCES profiles(firebase_uid) ON DELETE SET NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (firebase_uid, role)
);

CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL DEFAULT '',
  what_you_learn text NOT NULL DEFAULT '',
  rules jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(rules) = 'array'),
  venue text,
  starts_at timestamptz,
  ends_at timestamptz,
  min_team_size smallint NOT NULL DEFAULT 1 CHECK (min_team_size > 0),
  max_team_size smallint NOT NULL DEFAULT 1,
  prize_amount_paise integer CHECK (prize_amount_paise IS NULL OR prize_amount_paise >= 0),
  is_published boolean NOT NULL DEFAULT false,
  registration_open boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_team_size >= min_team_size),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TABLE pass_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  requires_day_selection boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pass_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_type_id uuid NOT NULL REFERENCES pass_types(id) ON DELETE RESTRICT,
  festival_day smallint CHECK (festival_day IS NULL OR festival_day BETWEEN 0 AND 3),
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE UNIQUE INDEX pass_prices_day_unique_idx
  ON pass_prices (pass_type_id, festival_day)
  WHERE festival_day IS NOT NULL;
CREATE UNIQUE INDEX pass_prices_flat_unique_idx
  ON pass_prices (pass_type_id)
  WHERE festival_day IS NULL;

CREATE TABLE pass_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES profiles(firebase_uid) ON DELETE RESTRICT,
  pass_type_id uuid NOT NULL REFERENCES pass_types(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'refunded')),
  total_amount_paise integer NOT NULL CHECK (total_amount_paise >= 0),
  qr_token_hash text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pass_registrations_user_idx ON pass_registrations (firebase_uid, created_at DESC);

CREATE TABLE pass_registration_days (
  pass_registration_id uuid NOT NULL REFERENCES pass_registrations(id) ON DELETE CASCADE,
  festival_day smallint NOT NULL CHECK (festival_day BETWEEN 0 AND 3),
  PRIMARY KEY (pass_registration_id, festival_day)
);

CREATE TABLE event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
  lead_firebase_uid text NOT NULL REFERENCES profiles(firebase_uid) ON DELETE RESTRICT,
  team_name text,
  status text NOT NULL DEFAULT 'registered'
    CHECK (status IN ('registered', 'cancelled', 'checked_in')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, lead_firebase_uid)
);

CREATE TABLE event_registration_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_registration_id uuid NOT NULL REFERENCES event_registrations(id) ON DELETE CASCADE,
  firebase_uid text REFERENCES profiles(firebase_uid) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text,
  phone text,
  college text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX event_registration_members_registration_idx
  ON event_registration_members (event_registration_id);

CREATE TABLE accommodation_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES profiles(firebase_uid) ON DELETE RESTRICT,
  participant_category text NOT NULL,
  hostel text NOT NULL,
  check_in_at timestamptz NOT NULL,
  check_out_at timestamptz NOT NULL,
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  status text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN ('pending_payment', 'confirmed', 'cancelled', 'refunded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (check_out_at > check_in_at)
);

CREATE INDEX accommodation_bookings_user_idx
  ON accommodation_bookings (firebase_uid, created_at DESC);

CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid text NOT NULL REFERENCES profiles(firebase_uid) ON DELETE RESTRICT,
  pass_registration_id uuid REFERENCES pass_registrations(id) ON DELETE RESTRICT,
  accommodation_booking_id uuid REFERENCES accommodation_bookings(id) ON DELETE RESTRICT,
  provider text NOT NULL,
  provider_order_id text UNIQUE,
  provider_payment_id text UNIQUE,
  idempotency_key text NOT NULL UNIQUE,
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  currency char(3) NOT NULL DEFAULT 'INR',
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'pending', 'paid', 'failed', 'refunded')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(pass_registration_id, accommodation_booking_id) = 1)
);

CREATE INDEX payments_user_idx ON payments (firebase_uid, created_at DESC);

CREATE TABLE sponsor_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  notes text NOT NULL DEFAULT '',
  requested_tier text,
  attachment_path text,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_review', 'contacted', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sponsor_inquiries_created_idx ON sponsor_inquiries (created_at DESC);

CREATE TABLE contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  category text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'in_review', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_inquiries_created_idx ON contact_inquiries (created_at DESC);

CREATE TABLE gate_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pass_registration_id uuid NOT NULL REFERENCES pass_registrations(id) ON DELETE RESTRICT,
  scanner_firebase_uid text NOT NULL REFERENCES profiles(firebase_uid) ON DELETE RESTRICT,
  event_id uuid REFERENCES events(id) ON DELETE RESTRICT,
  scan_type text NOT NULL CHECK (scan_type IN ('festival', 'event', 'accommodation')),
  direction text NOT NULL CHECK (direction IN ('entry', 'exit')),
  result text NOT NULL CHECK (result IN ('accepted', 'denied', 'duplicate')),
  details text,
  scanned_at timestamptz NOT NULL DEFAULT now(),
  CHECK (scan_type <> 'event' OR event_id IS NOT NULL)
);

CREATE INDEX gate_scans_pass_time_idx ON gate_scans (pass_registration_id, scanned_at DESC);
CREATE INDEX gate_scans_event_time_idx ON gate_scans (event_id, scanned_at DESC);

CREATE TABLE email_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email text NOT NULL,
  template text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed')),
  attempts smallint NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX email_outbox_pending_idx ON email_outbox (available_at)
  WHERE status IN ('pending', 'failed');

-- Defense in depth: new tables are private to the backend until policies are added.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_registration_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registration_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE accommodation_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gate_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_outbox ENABLE ROW LEVEL SECURITY;

COMMIT;
