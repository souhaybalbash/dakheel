-- Lockout after 8 failed logins for 15 minutes.
-- Applied automatically on first auth request via api/_lib/ensure-schema.js.
-- Run manually against the direct (non-pooled) DATABASE_URL if you prefer:
--   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_logins integer NOT NULL DEFAULT 0;
--   ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until timestamptz;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_logins integer NOT NULL DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until timestamptz;
