const { getSql } = require('../_lib/db');
const { ensureSchema } = require('../_lib/ensure-schema');
const {
  verifyPassword,
  normalizeEmail,
  validEmail,
  validPassword,
  signToken,
  mergeSettings,
  publicProfile,
  isLocked,
  LOCK_FAILS,
  LOCK_MS,
} = require('../_lib/auth');
const { readJson, send, method } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const password = body.password;
    if (!validEmail(email) || !validPassword(password)) {
      return send(res, 400, { error: 'invalid_credentials', message: 'الإيميل أو كلمة السر غلط' });
    }

    const sql = getSql();
    await ensureSchema(sql);

    const rows = await sql`
      SELECT id, email, password_hash, stats, settings, updated_at, failed_logins, locked_until
      FROM profiles WHERE email = ${email} LIMIT 1
    `;
    if (!rows.length) {
      return send(res, 401, { error: 'invalid_credentials', message: 'الإيميل أو كلمة السر غلط' });
    }

    const row = rows[0];
    if (isLocked(row)) {
      return send(res, 429, {
        error: 'locked',
        message: 'الحساب مقفول ربع ساعة — جرّب بعدين',
      });
    }

    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) {
      const lockExpired = row.locked_until && new Date(row.locked_until).getTime() <= Date.now();
      const fails = (lockExpired ? 0 : Number(row.failed_logins) || 0) + 1;
      const lockUntil = fails >= LOCK_FAILS ? new Date(Date.now() + LOCK_MS).toISOString() : null;
      await sql`
        UPDATE profiles
        SET failed_logins = ${fails},
            locked_until = ${lockUntil}
        WHERE id = ${row.id}
      `;
      const msg =
        fails >= LOCK_FAILS ? 'الحساب مقفول ربع ساعة — جرّب بعدين' : 'الإيميل أو كلمة السر غلط';
      return send(res, fails >= LOCK_FAILS ? 429 : 401, {
        error: fails >= LOCK_FAILS ? 'locked' : 'invalid_credentials',
        message: msg,
      });
    }

    const localSettings = body.settings && typeof body.settings === 'object' ? body.settings : {};
    const remoteUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const mergedSettings = mergeSettings(
      localSettings,
      row.settings,
      Number(localSettings.updatedAt) || 0,
      remoteUpdated
    );

    const updated = await sql`
      UPDATE profiles
      SET settings = ${JSON.stringify(mergedSettings)}::jsonb,
          failed_logins = 0,
          locked_until = NULL,
          updated_at = now()
      WHERE id = ${row.id}
      RETURNING id, email, stats, settings, updated_at
    `;

    const profile = publicProfile(updated[0]);
    const token = signToken({ sub: profile.id, email: profile.email });
    return send(res, 200, { token, profile });
  } catch (e) {
    console.error('login', e);
    return send(res, 500, { error: 'server_error', message: 'صار خطأ، جرّب بعدين' });
  }
};
