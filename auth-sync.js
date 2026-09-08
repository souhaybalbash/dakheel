/* الدخيل — guest-first auth + cloud sync (scores/streaks/settings) */
(function (global) {
  const TOKEN_KEY = 'dakheel-auth-token';
  const USER_KEY = 'dakheel-auth-user';
  const QUEUE_KEY = 'dakheel-sync-queue';
  const STATS_KEY = 'dakheel-stats';

  function emptyStats() {
    return {
      roundsPlayed: 0,
      citizenWins: 0,
      imposterWins: 0,
      currentStreak: 0,
      bestStreak: 0,
    };
  }

  function readJson(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {}
  }

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function setSession(token, profile) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
      if (profile) writeJson(USER_KEY, { id: profile.id, email: profile.email });
      else localStorage.removeItem(USER_KEY);
    } catch (e) {}
  }

  function getUser() {
    return readJson(USER_KEY, null);
  }

  function isSignedIn() {
    return !!(getToken() && getUser());
  }

  function loadLocalStats() {
    return { ...emptyStats(), ...readJson(STATS_KEY, {}) };
  }

  function saveLocalStats(stats) {
    writeJson(STATS_KEY, { ...emptyStats(), ...stats });
  }

  function mergeStats(a, b) {
    const x = { ...emptyStats(), ...(a || {}) };
    const y = { ...emptyStats(), ...(b || {}) };
    return {
      roundsPlayed: Math.max(+x.roundsPlayed || 0, +y.roundsPlayed || 0),
      citizenWins: Math.max(+x.citizenWins || 0, +y.citizenWins || 0),
      imposterWins: Math.max(+x.imposterWins || 0, +y.imposterWins || 0),
      currentStreak: Math.max(+x.currentStreak || 0, +y.currentStreak || 0),
      bestStreak: Math.max(+x.bestStreak || 0, +y.bestStreak || 0),
    };
  }

  function applyProfileLocally(profile, applySettings) {
    if (!profile) return;
    if (profile.stats) {
      const merged = mergeStats(loadLocalStats(), profile.stats);
      saveLocalStats(merged);
      if (typeof global.applyCloudStats === 'function') global.applyCloudStats(merged);
    }
    if (profile.settings && typeof applySettings === 'function') {
      applySettings(profile.settings);
    }
  }

  async function api(path, opts) {
    const options = opts || {};
    const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
    const token = getToken();
    if (token) headers.Authorization = 'Bearer ' + token;
    const res = await fetch(path, {
      method: options.method || 'GET',
      headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch (e) {
      data = null;
    }
    if (!res.ok) {
      const err = new Error((data && data.message) || 'فشل الطلب');
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  function queuePush(payload) {
    const q = readJson(QUEUE_KEY, []);
    q.push({ at: Date.now(), payload });
    writeJson(QUEUE_KEY, q.slice(-20));
  }

  async function flushQueue() {
    if (!isSignedIn() || !navigator.onLine) return;
    const q = readJson(QUEUE_KEY, []);
    if (!q.length) return;
    writeJson(QUEUE_KEY, []);
    for (const item of q) {
      try {
        await api('/api/profile', { method: 'PUT', body: item.payload });
      } catch (e) {
        queuePush(item.payload);
        break;
      }
    }
  }

  async function pushProfile(payload) {
    if (!isSignedIn()) return null;
    if (!navigator.onLine) {
      queuePush(payload);
      return null;
    }
    try {
      const data = await api('/api/profile', { method: 'PUT', body: payload });
      if (data && data.profile) applyProfileLocally(data.profile);
      return data;
    } catch (e) {
      queuePush(payload);
      return null;
    }
  }

  function collectLocalPayload(getSettings) {
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    if (settings && settings.updatedAt == null) settings.updatedAt = Date.now();
    return { stats: loadLocalStats(), settings };
  }

  async function register(email, password, getSettings) {
    const body = Object.assign({ email, password }, collectLocalPayload(getSettings));
    const data = await api('/api/auth/register', { method: 'POST', body });
    setSession(data.token, data.profile);
    applyProfileLocally(data.profile, null);
    return data.profile;
  }

  async function login(email, password, getSettings, applySettings) {
    const body = Object.assign({ email, password }, collectLocalPayload(getSettings));
    const data = await api('/api/auth/login', { method: 'POST', body });
    setSession(data.token, data.profile);
    applyProfileLocally(data.profile, applySettings);
    await flushQueue();
    return data.profile;
  }

  async function logout() {
    try {
      if (navigator.onLine) await api('/api/auth/logout', { method: 'POST', body: {} });
    } catch (e) {}
    setSession('', null);
  }

  async function refresh(applySettings) {
    if (!isSignedIn()) return null;
    if (!navigator.onLine) return getUser();
    try {
      const data = await api('/api/profile');
      applyProfileLocally(data.profile, applySettings);
      await flushQueue();
      return data.profile;
    } catch (e) {
      if (e.status === 401) setSession('', null);
      return null;
    }
  }

  let saveTimer = null;
  function scheduleSync(getSettings) {
    if (!isSignedIn()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      pushProfile(collectLocalPayload(getSettings));
    }, 800);
  }

  function recordRound(winner) {
    const s = loadLocalStats();
    s.roundsPlayed = (+s.roundsPlayed || 0) + 1;
    if (winner === 'citizens') s.citizenWins = (+s.citizenWins || 0) + 1;
    else s.imposterWins = (+s.imposterWins || 0) + 1;
    s.currentStreak = (+s.currentStreak || 0) + 1;
    s.bestStreak = Math.max(+s.bestStreak || 0, s.currentStreak);
    saveLocalStats(s);
    return s;
  }

  function resetStreakLocal() {
    const s = loadLocalStats();
    s.currentStreak = 0;
    saveLocalStats(s);
    return s;
  }

  global.DakheelAuth = {
    isSignedIn,
    getUser,
    getToken,
    loadLocalStats,
    saveLocalStats,
    mergeStats,
    register,
    login,
    logout,
    refresh,
    pushProfile,
    scheduleSync,
    recordRound,
    resetStreakLocal,
    flushQueue,
    collectLocalPayload,
  };

  global.addEventListener('online', () => {
    flushQueue();
  });
})(window);
