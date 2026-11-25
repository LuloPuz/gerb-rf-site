-- Apply after yandex-backend/schema.sql, as migration owner.
BEGIN;
CREATE TABLE IF NOT EXISTS customers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 phone text NOT NULL UNIQUE CHECK (phone ~ '^7[0-9]{10}$'),
 name text NOT NULL DEFAULT '',
 email text NOT NULL DEFAULT '',
 organization text NOT NULL DEFAULT '',
 inn text NOT NULL DEFAULT '',
 address text NOT NULL DEFAULT '',
 active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
-- Link orders explicitly after verified ownership; never infer ownership from an unverified checkout phone.
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
CREATE INDEX IF NOT EXISTS orders_customer_idx ON orders(customer_id, created_at DESC);
CREATE TABLE IF NOT EXISTS customer_sms_challenges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 code_mac text NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz,
 sent boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS customer_sms_recent_idx ON customer_sms_challenges(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS customer_sms_created_idx ON customer_sms_challenges(created_at);
CREATE TABLE IF NOT EXISTS customer_sms_requests (
 id bigserial PRIMARY KEY,
 contact_mac text NOT NULL,
 ip_mac text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS customer_sms_request_contact_idx ON customer_sms_requests(contact_mac,created_at DESC);
CREATE INDEX IF NOT EXISTS customer_sms_request_ip_idx ON customer_sms_requests(ip_mac,created_at DESC);
CREATE INDEX IF NOT EXISTS customer_sms_request_created_idx ON customer_sms_requests(created_at);
CREATE TABLE IF NOT EXISTS customer_sessions (
 token_hash text PRIMARY KEY,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS customer_sessions_customer_idx ON customer_sessions(customer_id);
COMMIT;
