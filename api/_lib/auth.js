const crypto = require('crypto');

const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days

function b64url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromB64url(str) {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  return Buffer.from(b64, 'base64');
}

function getSecret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET missing');
  return s;
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = crypto.scryptSync(password, salt, 64).toString('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(check, 'hex'));
  } catch {
    return false;
  }
}

function signToken(payload) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(
    JSON.stringify({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC,
    })
  );
  const data = `${header}.${body}`;
  const sig = b64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
  return `${data}.${sig}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const data = `${header}.${body}`;
  const expected = b64url(crypto.createHmac('sha256', getSecret()).update(data).digest());
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(fromB64url(body).toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if (!payload.sub) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearerUser(req) {
  const h = req.headers.authorization || req.headers.Authorization || '';
  const m = String(h).match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  return verifyToken(m[1].trim());
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 128;
}

function emptyStats() {
  return {
    roundsPlayed: 0,
    citizenWins: 0,
    imposterWins: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

function mergeStats(a, b) {
  const x = { ...emptyStats(), ...(a || {}) };
  const y = { ...emptyStats(), ...(b || {}) };
  return {
    roundsPlayed: Math.max(0, Math.max(+x.roundsPlayed || 0, +y.roundsPlayed || 0)),
    citizenWins: Math.max(0, Math.max(+x.citizenWins || 0, +y.citizenWins || 0)),
    imposterWins: Math.max(0, Math.max(+x.imposterWins || 0, +y.imposterWins || 0)),
    currentStreak: Math.max(0, Math.max(+x.currentStreak || 0, +y.currentStreak || 0)),
    bestStreak: Math.max(0, Math.max(+x.bestStreak || 0, +y.bestStreak || 0)),
  };
}

function mergeSettings(localSettings, remoteSettings, localUpdatedAt, remoteUpdatedAt) {
  const l = localSettings && typeof localSettings === 'object' ? localSettings : {};
  const r = remoteSettings && typeof remoteSettings === 'object' ? remoteSettings : {};
  const lt = Number(localUpdatedAt) || 0;
  const rt = Number(remoteUpdatedAt) || 0;
  if (lt >= rt) return { ...r, ...l, updatedAt: Math.max(lt, rt, Date.now()) };
  return { ...l, ...r, updatedAt: Math.max(lt, rt, Date.now()) };
}

function publicProfile(row) {
  return {
    id: row.id,
    email: row.email,
    stats: row.stats || emptyStats(),
    settings: row.settings || {},
    updated_at: row.updated_at,
  };
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  verifyToken,
  bearerUser,
  normalizeEmail,
  validEmail,
  validPassword,
  emptyStats,
  mergeStats,
  mergeSettings,
  publicProfile,
  TOKEN_TTL_SEC,
};
