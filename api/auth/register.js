const { getSql } = require('../_lib/db');
const { ensureSchema } = require('../_lib/ensure-schema');
const {
  hashPassword,
  normalizeEmail,
  validEmail,
  validPassword,
  signToken,
  mergeSettings,
  emptyStats,
  publicProfile,
} = require('../_lib/auth');
const { readJson, send, method } = require('../_lib/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['POST'])) return;
  try {
    const body = await readJson(req);
    const email = normalizeEmail(body.email);
    const password = body.password;
    if (!validEmail(email)) return send(res, 400, { error: 'invalid_email', message: 'الإيميل مش صحيح' });
    if (!validPassword(password)) {
      return send(res, 400, {
        error: 'weak_password',
        message: 'كلمة السر لازم ٨ حروف على الأقل',
      });
    }

    const sql = getSql();
    await ensureSchema(sql);
    const existing = await sql`SELECT id FROM profiles WHERE email = ${email} LIMIT 1`;
    if (existing.length) return send(res, 409, { error: 'email_taken', message: 'هالإيميل مسجّل من قبل' });

    const localSettings = body.settings && typeof body.settings === 'object' ? body.settings : {};
    const settings = mergeSettings(localSettings, {}, Number(localSettings.updatedAt) || Date.now(), 0);
    const password_hash = await hashPassword(password);
    const localStats = emptyStats();

    const rows = await sql`
      INSERT INTO profiles (email, password_hash, stats, settings, updated_at, failed_logins, locked_until)
      VALUES (${email}, ${password_hash}, ${JSON.stringify(localStats)}::jsonb, ${JSON.stringify(settings)}::jsonb, now(), 0, NULL)
      RETURNING id, email, stats, settings, updated_at
    `;
    const profile = publicProfile(rows[0]);
    const token = signToken({ sub: profile.id, email: profile.email });
    return send(res, 201, { token, profile });
  } catch (e) {
    console.error('register', e);
    return send(res, 500, { error: 'server_error', message: 'صار خطأ، جرّب بعدين' });
  }
};
