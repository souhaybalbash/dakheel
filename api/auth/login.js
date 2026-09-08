const { getSql } = require('../_lib/db');
const {
  verifyPassword,
  normalizeEmail,
  validEmail,
  validPassword,
  signToken,
  mergeStats,
  mergeSettings,
  publicProfile,
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
    const rows = await sql`SELECT id, email, password_hash, stats, settings, updated_at FROM profiles WHERE email = ${email} LIMIT 1`;
    if (!rows.length || !verifyPassword(password, rows[0].password_hash)) {
      return send(res, 401, { error: 'invalid_credentials', message: 'الإيميل أو كلمة السر غلط' });
    }

    const row = rows[0];
    const localStats = body.stats || {};
    const localSettings = body.settings && typeof body.settings === 'object' ? body.settings : {};
    const remoteUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    const mergedStats = mergeStats(row.stats, localStats);
    const mergedSettings = mergeSettings(
      localSettings,
      row.settings,
      Number(localSettings.updatedAt) || 0,
      remoteUpdated
    );

    const updated = await sql`
      UPDATE profiles
      SET stats = ${JSON.stringify(mergedStats)}::jsonb,
          settings = ${JSON.stringify(mergedSettings)}::jsonb,
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
