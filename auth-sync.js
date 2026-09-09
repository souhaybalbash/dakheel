/* الدخيل — guest-first auth + cloud sync (scores/streaks/settings) */
(function (global) {
  const TOKEN_KEY = 'dakheel-auth-token';
  const USER_KEY = 'dakheel-auth-user';
  const QUEUE_KEY = 'dakheel-sync-queue';
  const STATS_KEY = 'dakheel-stats';
  const PROFILE_KEY = 'dakheel-user-profile';

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

  function getProfile() {
    return readJson(PROFILE_KEY, null);
  }

  function isProfileComplete(profileOrSettings) {
    const p =
      profileOrSettings && profileOrSettings.profile
        ? profileOrSettings.profile
        : profileOrSettings;
    if (!p || typeof p !== 'object') return false;
    const name = String(p.displayName || '').trim();
    const region = String(p.region || '').trim();
    return !!(p.completed && name.length >= 2 && region);
  }

  function setLocalUser(user) {
    if (!user) {
      try {
        localStorage.removeItem(USER_KEY);
      } catch (e) {}
      return;
    }
    const prev = getUser() || {};
    const displayName =
      user.displayName != null
        ? user.displayName
        : prev.displayName || (getProfile() && getProfile().displayName) || '';
    writeJson(USER_KEY, {
      id: user.id || prev.id,
      email: user.email || prev.email,
      displayName: displayName || undefined,
    });
  }

  function saveLocalProfile(profile) {
    if (!profile) {
      try {
        localStorage.removeItem(PROFILE_KEY);
      } catch (e) {}
      return;
    }
    writeJson(PROFILE_KEY, profile);
    const u = getUser();
    if (u) {
      setLocalUser({
        id: u.id,
        email: u.email,
        displayName: profile.displayName || u.displayName,
      });
    }
  }

  function setSession(token, profile) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
      if (profile) {
        const p = (profile.settings && profile.settings.profile) || getProfile();
        setLocalUser({
          id: profile.id,
          email: profile.email,
          displayName: (p && p.displayName) || undefined,
        });
        if (profile.settings && profile.settings.profile) {
          saveLocalProfile(profile.settings.profile);
        }
      } else {
        setLocalUser(null);
        saveLocalProfile(null);
      }
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

  function applyProfileLocally(profile, applySettings) {
    if (!profile) return;
    if (profile.stats) {
      saveLocalStats(profile.stats);
      if (typeof global.applyCloudStats === 'function') global.applyCloudStats(profile.stats);
    }
    if (profile.settings && profile.settings.profile) {
      saveLocalProfile(profile.settings.profile);
    }
    if (profile.id || profile.email) {
      const p = (profile.settings && profile.settings.profile) || getProfile();
      setLocalUser({
        id: profile.id,
        email: profile.email,
        displayName: (p && p.displayName) || undefined,
      });
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

  function cloudBody(payload) {
    const src = payload || {};
    const body = {};
    if (src.settings) body.settings = src.settings;
    if (src.delta && typeof src.delta === 'object') body.delta = src.delta;
    if (src.resetStreak) body.resetStreak = true;
    return body;
  }

  async function pushProfile(payload) {
    if (!isSignedIn()) return null;
    const body = cloudBody(payload);
    if (!navigator.onLine) {
      queuePush(body);
      return null;
    }
    try {
      const data = await api('/api/profile', { method: 'PUT', body });
      if (data && data.profile) applyProfileLocally(data.profile);
      return data;
    } catch (e) {
      queuePush(body);
      return null;
    }
  }

  function collectLocalPayload(getSettings) {
    const settings = typeof getSettings === 'function' ? getSettings() : {};
    if (settings && settings.updatedAt == null) settings.updatedAt = Date.now();
    const localProfile = getProfile();
    if (localProfile && !settings.profile) settings.profile = localProfile;
    return { settings };
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
    if (!getToken()) return null;
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

  function roundDelta(winner) {
    return {
      roundsPlayed: 1,
      citizenWins: winner === 'citizens' ? 1 : 0,
      imposterWins: winner === 'imposter' ? 1 : 0,
      currentStreak: 1,
    };
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
    getProfile,
    isProfileComplete,
    saveLocalProfile,
    setLocalUser,
    loadLocalStats,
    saveLocalStats,
    register,
    login,
    logout,
    refresh,
    pushProfile,
    scheduleSync,
    recordRound,
    roundDelta,
    resetStreakLocal,
    flushQueue,
    collectLocalPayload,
  };

  global.addEventListener('online', () => {
    flushQueue();
  });
})(window);
