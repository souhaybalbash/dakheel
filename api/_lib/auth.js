const crypto = require('crypto');
const { promisify } = require('util');

const scrypt = promisify(crypto.scrypt);

const TOKEN_TTL_SEC = 60 * 60 * 24 * 30; // 30 days
const MIN_PASSWORD = 8;
const STAT_CAP = 9999;
const LOCK_FAILS = 8;
const LOCK_MS = 15 * 60 * 1000;

const SETTINGS_KEYS = [
  'mode',
  'players',
  'imposters',
  'minutes',
  'informant',
  'blackout',
  'showHint',
  'useNames',
  'secretBallot',
  'emojiClue',
  'sfx',
  'intensity',
  'region',
  'names',
  'avs',
  'cat',
  'updatedAt',
  'profile',
];

const STAT_KEYS = ['roundsPlayed', 'citizenWins', 'imposterWins', 'currentStreak', 'bestStreak'];

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

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)).toString('hex');
  return `${salt}:${hash}`;
}

async function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const check = (await scrypt(password, salt, 64)).toString('hex');
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
  return typeof password === 'string' && password.length >= MIN_PASSWORD && password.length <= 128;
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

function clampStat(n) {
  const v = Number(n) || 0;
  if (v < 0) return 0;
  if (v > STAT_CAP) return STAT_CAP;
  return Math.floor(v);
}

function sanitizeStats(stats) {
  const s = emptyStats();
  const src = stats && typeof stats === 'object' ? stats : {};
  STAT_KEYS.forEach((k) => {
    s[k] = clampStat(src[k]);
  });
  if (s.bestStreak < s.currentStreak) s.bestStreak = s.currentStreak;
  return s;
}

function applyStatDelta(current, delta) {
  const out = sanitizeStats(current);
  if (!delta || typeof delta !== 'object') return out;
  STAT_KEYS.forEach((k) => {
    if (delta[k] == null) return;
    const d = Math.min(1, Math.max(0, Math.floor(Number(delta[k]) || 0)));
    out[k] = clampStat((Number(out[k]) || 0) + d);
  });
  if (out.bestStreak < out.currentStreak) out.bestStreak = out.currentStreak;
  return out;
}

function sanitizeProfile(p) {
  if (!p || typeof p !== 'object') return undefined;
  return {
    displayName: String(p.displayName || '')
      .trim()
      .slice(0, 24),
    birthday: String(p.birthday || '').slice(0, 10),
    region: String(p.region || '').slice(0, 32),
    bio: String(p.bio || '').slice(0, 80),
    completed: !!p.completed,
    updatedAt: Number(p.updatedAt) || Date.now(),
  };
}

function sanitizeSettings(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const out = {};
  SETTINGS_KEYS.forEach((k) => {
    if (raw[k] == null) return;
    if (k === 'profile') {
      const p = sanitizeProfile(raw.profile);
      if (p) out.profile = p;
      return;
    }
    if (k === 'names' || k === 'avs') {
      if (Array.isArray(raw[k])) {
        out[k] = raw[k].slice(0, 14).map((x) => String(x || '').slice(0, 24));
      }
      return;
    }
    if (k === 'updatedAt' || k === 'players' || k === 'imposters' || k === 'minutes') {
      out[k] = Number(raw[k]) || 0;
      return;
    }
    if (
      k === 'informant' ||
      k === 'blackout' ||
      k === 'showHint' ||
      k === 'useNames' ||
      k === 'secretBallot' ||
      k === 'emojiClue' ||
      k === 'sfx'
    ) {
      out[k] = !!raw[k];
      return;
    }
    out[k] = typeof raw[k] === 'string' ? raw[k].slice(0, 64) : raw[k];
  });
  return out;
}

function mergeSettings(localSettings, remoteSettings, localUpdatedAt, remoteUpdatedAt) {
  const l = sanitizeSettings(localSettings);
  const r = sanitizeSettings(remoteSettings);
  const lt = Number(localUpdatedAt) || 0;
  const rt = Number(remoteUpdatedAt) || 0;
  if (lt >= rt) return { ...r, ...l, updatedAt: Math.max(lt, rt, Date.now()) };
  return { ...l, ...r, updatedAt: Math.max(lt, rt, Date.now()) };
}

function publicProfile(row) {
  return {
    id: row.id,
    email: row.email,
    stats: sanitizeStats(row.stats),
    settings: sanitizeSettings(row.settings),
    updated_at: row.updated_at,
  };
}

function isLocked(row) {
  if (!row || !row.locked_until) return false;
  const t = new Date(row.locked_until).getTime();
  return Number.isFinite(t) && t > Date.now();
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
  sanitizeStats,
  applyStatDelta,
  sanitizeSettings,
  mergeSettings,
  publicProfile,
  isLocked,
  TOKEN_TTL_SEC,
  MIN_PASSWORD,
  LOCK_FAILS,
  LOCK_MS,
  STAT_CAP,
};
