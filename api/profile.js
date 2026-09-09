const { getSql } = require('./_lib/db');
const { ensureSchema } = require('./_lib/ensure-schema');
const {
  bearerUser,
  mergeSettings,
  publicProfile,
  applyStatDelta,
  sanitizeStats,
} = require('./_lib/auth');
const { readJson, send, method } = require('./_lib/http');

module.exports = async function handler(req, res) {
  if (!method(req, res, ['GET', 'PUT'])) return;
  try {
    const user = bearerUser(req);
    if (!user) return send(res, 401, { error: 'unauthorized', message: 'لازم تسجّل دخول' });

    const sql = getSql();
    await ensureSchema(sql);

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT id, email, stats, settings, updated_at FROM profiles WHERE id = ${user.sub} LIMIT 1
      `;
      if (!rows.length) return send(res, 404, { error: 'not_found', message: 'الحساب مش موجود' });
      return send(res, 200, { profile: publicProfile(rows[0]) });
    }

    const body = await readJson(req);
    const rows = await sql`
      SELECT id, email, stats, settings, updated_at FROM profiles WHERE id = ${user.sub} LIMIT 1
    `;
    if (!rows.length) return send(res, 404, { error: 'not_found', message: 'الحساب مش موجود' });

    const row = rows[0];
    const remoteUpdated = row.updated_at ? new Date(row.updated_at).getTime() : 0;
    let nextStats = sanitizeStats(row.stats);
    if (body.resetStreak) {
      nextStats = { ...nextStats, currentStreak: 0 };
    }
    if (body.delta && typeof body.delta === 'object') {
      nextStats = applyStatDelta(nextStats, body.delta);
    }

    const localSettings = body.settings && typeof body.settings === 'object' ? body.settings : null;
    const nextSettings = localSettings
      ? mergeSettings(localSettings, row.settings, Number(localSettings.updatedAt) || Date.now(), remoteUpdated)
      : row.settings;

    const updated = await sql`
      UPDATE profiles
      SET stats = ${JSON.stringify(nextStats)}::jsonb,
          settings = ${JSON.stringify(nextSettings)}::jsonb,
          updated_at = now()
      WHERE id = ${row.id}
      RETURNING id, email, stats, settings, updated_at
    `;
    return send(res, 200, { profile: publicProfile(updated[0]) });
  } catch (e) {
    console.error('profile', e);
    return send(res, 500, { error: 'server_error', message: 'صار خطأ، جرّب بعدين' });
  }
};
