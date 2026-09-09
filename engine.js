/* الدخيل — pure round helpers (browser + node). Loaded before index.html inline script. */
(function (root) {
  function impCap(players) {
    const n = Number(players) || 0;
    return Math.max(1, Math.floor((n - 1) / 2));
  }

  function shuffle(arr, rand) {
    const a = Array.isArray(arr) ? arr.slice() : [];
    const rnd = typeof rand === 'function' ? rand : Math.random;
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      const t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  }

  function wText(x) {
    return typeof x === 'string' ? x : (x && x.t) || '';
  }

  function pickDecoy(word, pool, rand) {
    const texts = (pool || []).map(wText).filter(Boolean);
    const others = texts.filter((t) => t !== word);
    if (!others.length) return '';
    const rnd = typeof rand === 'function' ? rand : Math.random;
    return others[Math.floor(rnd() * others.length)];
  }

  function chooseDecoy(word, authored, pool, rand) {
    if (authored && authored !== word) return authored;
    return pickDecoy(word, pool, rand);
  }

  function caught(votes, roles) {
    if (!Array.isArray(votes) || !Array.isArray(roles)) return false;
    const need = roles.filter((r) => r === 'imposter').length;
    if (need < 1 || votes.length !== need) return false;
    return votes.every((i) => roles[i] === 'imposter');
  }

  const BLACKOUT_P = { hadya: 0.25, adiya: 0.45, majnuna: 0.75 };

  function scheduleBlackout(opts) {
    const o = opts || {};
    if (!o.enabled) return null;
    const total = Number(o.discussTotal) || 0;
    const half = Math.floor(total / 2);
    if (half < 1) return null;
    let p = BLACKOUT_P[o.intensity] || BLACKOUT_P.adiya;
    if (o.blackoutX2) p = Math.min(1, p * 2);
    const rnd = typeof o.random === 'function' ? o.random : Math.random;
    if (rnd() >= p) return null;
    return 1 + Math.floor(rnd() * half);
  }

  const engine = {
    impCap,
    shuffle,
    pickDecoy,
    chooseDecoy,
    caught,
    scheduleBlackout,
    BLACKOUT_P,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = engine;
  }
  root.DakheelEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this);
