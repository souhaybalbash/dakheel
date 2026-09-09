let ensured = false;

async function ensureSchema(sql) {
  if (ensured) return;
  try {
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS failed_logins integer NOT NULL DEFAULT 0`;
    await sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_until timestamptz`;
    ensured = true;
  } catch (e) {
    console.error('ensure-schema', e);
    throw e;
  }
}

module.exports = { ensureSchema };
