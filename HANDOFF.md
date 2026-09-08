# الدخيل — Project Handoff

> Last updated: 2026-09-08
> Author of this handoff: Claude (Opus 4.6) via Claude Code

---

## What is this project

**الدخيل** (The Imposter) is a Libyan Arabic social-deduction party game. Think Spyfall, but built entirely in Libyan dialect — the content, humor, and cultural references are the product.

- **How it works:** 3–14 players, one phone passed around. Each player privately opens their card (**افتح**), then taps **اللاعب الجاي**. One or more players are the imposter — they either don't know the word or get a decoy word. Players give one-word clues, discuss, then vote. If they catch the imposter, citizens win. If not, the imposter wins.
- **Target audience:** Libyan friend groups and family gatherings (قعدة شاي, عزومة, رمضان evenings). Ages ~12+. Most play with poor or no internet.
- **Why it exists:** Every imposter app on the store uses Gulf or Egyptian content. Nothing sounds Libyan. The dialect and cultural content ARE the product.

---

## Key documents

| File | Purpose |
|------|---------|
| `dakheel-scope.md` | **The canonical spec.** Full game rules, modes, content rules, design system, acceptance criteria. Platform target is PWA (+ TWA later). |
| `dakheel-v2.html` | **The original prototype.** Single-file HTML with all game logic, used as the interaction spec. Preserved as reference — do not edit. |
| `index.html` | **The production PWA.** Enhanced version of the prototype. This is the live codebase. |

---

## Current file structure

```
الدخيل/
├── index.html              ← Production PWA (HTML + CSS + JS)
├── auth-sync.js            ← Client auth + offline sync queue
├── api/                    ← Vercel serverless (auth + profile)
│   ├── auth/register.js · login.js · logout.js
│   ├── profile.js
│   └── _lib/               ← db, JWT/scrypt, HTTP helpers
├── package.json            ← @neondatabase/serverless
├── vercel.json             ← API no-store headers; SW no-cache
├── manifest.json           ← PWA web app manifest
├── sw.js                   ← Service worker (v17; shell network-first; /api never cached)
├── assets/
│   ├── fonts/              ← 11 woff2 files (Rakkas + Tajawal)
│   └── icons/
│       └── icon.svg
├── dakheel-scope.md        ← Canonical spec (read-only reference)
└── dakheel-v2.html         ← Original prototype (read-only reference)
```

### Guest auth + cloud sync (shipped)
- [x] **Neon Postgres** via Vercel Marketplace (`dakheel-db`) — env: `DATABASE_URL`, `AUTH_SECRET`, plus Neon `POSTGRES_*`
- [x] Table `profiles` (email, password_hash, stats jsonb, settings jsonb)
- [x] API: `POST /api/auth/register|login|logout`, `GET|PUT /api/profile` (JWT Bearer ~30d)
- [x] Home guest: **إلعب كضيف** + **دخول / تسجيل** + **كيف نلعبوها**
- [x] Home signed-in: **يلا نبداو** + **كيف نلعبوها** (no guest CTA); chip shows displayName + **خروج**
- [x] Post-signup / incomplete profile screen **معلوماتك** (name, birthday, region, optional bio) → `settings.profile`
- [x] Sync scores/streaks/settings (+ profile) across devices for signed-in users (not custom packs)
- [x] Guest path stays fully offline via localStorage; offline sync queue when signed in
- [x] No Supabase, no Firebase, no Google OAuth in v1

---

## Architecture decision: PWA, not Flutter

The scope document (`dakheel-scope.md`) originally specified **Flutter** for Android + Web + iOS from a single codebase. We pivoted to a **PWA + TWA** approach instead:

- **Web:** The existing HTML game becomes a proper Progressive Web App — installable, offline-capable, shareable via WhatsApp link (the primary growth channel in Libya).
- **Android APK:** Wrap the PWA as a TWA (Trusted Web Activity) or Capacitor shell for the Play Store.
- **iOS:** Same PWA works in Safari; App Store wrapper possible later.

**Why the pivot:** The game is a single-screen-stack, fully offline, pass-and-play experience with no native API needs beyond basic vibration. Flutter would have meant a ground-up rebuild for no functional gain. The PWA ships faster and the WhatsApp-link distribution (zero install) is more important for Libyan adoption than a store listing.

---

## What has been done (v1 PWA — Phase 1+2 complete)

### Game logic (all from prototype, fully working)
- [x] All core modes + Layer 3: كلاسيكي، الشبيهة، قبلي، المحكمة، **أسئلة**، **فوضى الدخلاء**
- [x] Full round flow: deal → pass → افتح/reveal → twist → discuss → vote → court → guess → result
- [x] 3–14 players, 1–3 imposters with hard cap at `max(1, floor((players-1)/2))`
- [x] Open-then-next reveal (**افتح** → card → **اللاعب الجاي** / **يلا نبدوا**)
- [x] Discussion timer with pause/resume
- [x] Blackout prank (مقلب المولّد) — second half of actual discuss duration (`discussTotal`)
- [x] Qibli twists — 10 twist cards, one per round
- [x] Court defense phase — 45-second defense clock, reopen vote **once** per round
- [x] Imposter guess step (skipped in shabiha mode); word hidden until result
- [x] Session used-word history (no immediate repeats across rounds)
- [x] Per-player scoring across rounds
- [x] Informant role (المخبر) — one citizen sees who the imposter is
- [x] Imposter word hint toggle (تلميح للدخيل) — max two words per secret word; replaces category hint
- [x] Libyan dialect UI pass (منو، تشوف، تفضح، الجاي, Western digits)

### Content (all Libyan dialect)
- [x] 14 word packs: أكل ليبي (28), مدن ومناطق (30), معالم وأماكن (22), لهجة وكلام (28), عادات ومناسبات (22), رياضة وأندية (47), البيت والسوق (22), حاجات تعصّب (18), مهن وشغل (24), طبيعة وجو (22), مدرسة وجامعة (50), طفولة وتسعينات (50), قعدة وقهوة (45), شوارع وطرق (35) — مشكّل ≈443
- [x] Word shape `{t,h,r}` + authored decoy `d` on **443/443** entries for الشبيهة; 2026-09-08 copy pass elevated food/slang/qaeda + voice; residual pass filled last 7 decoys + كاكاوية + MSA voice polish (`dakheel-v13`)
- [x] مشكّل (all packs merged) + فئة خاصة (user-entered, min 3 words)
- [x] ~40 quips (deal/discussion; no-repeat within session)
- [x] ~30 citizen-win roast lines
- [x] ~30 imposter-win roast lines
- [x] 20 twist cards with mechanical effects (half / skipGuess / muteStarter / blackoutX2 / emoji)
- [x] Intensity preset «قعدة الليلة» (هادية / عادية / مجنونة) → minutes + blackout/twist density + ballot default on مجنونة
- [x] Secret ballot toggle · rematch streak line on result · rotating deal titles · 5 blackout prank lines

### PWA infrastructure
- [x] **Local fonts** — Rakkas + Tajawal (4 weights) bundled as woff2, no CDN dependency
- [x] **Service Worker** (`sw.js`) — precaches all 15 assets, cache-first strategy, old cache cleanup
- [x] **Web App Manifest** — standalone, portrait, RTL, dark theme, SVG icon
- [x] **PWA meta tags** — theme-color, apple-mobile-web-app-capable, apple-touch-icon
- [x] **Fully offline** — works in airplane mode from first load onward

### Persistence (localStorage)
- [x] Saves: mode, player count, imposter count, minutes, toggles (incl. secret ballot), intensity, category, player names, avatars
- [x] Rules screen available from home («كيف نلعبوها») — landing always opens on home
- [x] "نفس القعدة متاع قبل؟" — returning users prompted to reuse last session's names
- [x] Custom word packs saved and restored

### Accessibility
- [x] `role="switch"` + `aria-checked` on setup toggle switches
- [x] `aria-label` on stepper +/- buttons (Arabic)
- [x] `aria-label` on avatar picker buttons
- [x] `aria-label` on vote tile buttons
- [x] Focus rings on all interactive elements (visible on web/keyboard)
- [x] Minimum 44x44 touch targets

### Design system (implemented in CSS)
- [x] Color tokens: ink (#12100C), deep (#1B1811), surf (#262117), line (#3A3223), sand (#F4EBD7), mute (#A2947A), saffron (#F2B134), tea (#C4602A), mint (#79B95C), plum (#7A3B4E)
- [x] Typography: Rakkas (display/headings), Tajawal (body, 4 weights)
- [x] Dot-grid background pattern at 34px
- [x] Radii: 26 cards, 20 buttons, 13-16 controls, 999 chips
- [x] RTL throughout, `dir="rtl"` + `lang="ar"`
- [x] Western digits for timer/counts (Libyan convention)

---

## What has NOT been done yet

### Deployment (next immediate step)
- [x] **Deploy to Vercel** — https://dakheel-nu.vercel.app · repo https://github.com/souhaybalbash/dakheel
- [ ] **Generate raster PNG icons** — 192x192 and 512x512 from the SVG, add to manifest for wider Android compatibility
- [ ] **TWA or Capacitor wrapper** — to produce a signed APK for the Play Store
- [ ] **Play Store listing** — Arabic-first store copy, screenshots, icon

### Content gaps
- [ ] **Regional content sign-off** — still required before store (cannot be faked). Checklist below.
- [x] **Region tags on words** — each pack entry is `{t, h, r}` with `r` in `tripoli`/`benghazi`/`south`/`all`.
- [x] **Region filter UI** — chips on category screen; expands to full pack if filtered pool &lt; 3.
- [x] **More quips/roasts** — ~40 quips + ~30 roasts each (session no-repeat for quips).

### Regional review checklist (before store) — NOT done
1. Send current packs (or a screenshare of مشكّل rounds) to **one Benghazi** reviewer and **one Fezzan/south** reviewer.
2. Ask them to mark: wrong for their region, missing must-haves, unsafe/sectarian.
3. Apply fixes; leave `r` tags accurate; only then clear the sign-off checkbox.
4. **Human sign-off is blocking for store listing, not for web ship.** Do not invent reviewer approvals.
5. Still thin for humans to fill later: Fezzan clubs / non-tourist southern landmarks; cartoon nostalgia names (السنتينل / القناص / سلام دانك) generational check.

### Features deferred to v2+ (from scope §4, §11, §14)
- [x] Packs: مدرسة وجامعة, طفولة وتسعينات, قعدة وقهوة, شوارع وطرق (+ كرة أعمق داخل رياضة)
- [x] Modes: أسئلة (as2ila) / فوضى الدخلاء (fawda) — Layer 3
- [x] قبلي twists ≈20 with mechanical effects (`half`, `skipGuess`, `muteStarter`, `blackoutX2`, `emoji`)
- [x] إشارة وإيموجي toggle (setup) — first clue pass gestures/emoji only
- [x] "أكثر ولا أقل" MVP mini-game (from result screen)
- [x] Share result (Web Share / clipboard) + custom pack share codes (`DK1.` base64)
- [x] Region filter UI
- [ ] More packs: أفلام وبرامج, عرس وعزايم
- [ ] Sound effects (off by default — phone is passed in a quiet room, audio leaks role info)
- [ ] iOS App Store wrapper
- [ ] English localization (architect for it, don't build it in v1)

### Open decisions (from scope §14)
1. **Store name:** «الدخيل» is clean but generic. Consider «الدخيل — قعدة ليبية» as listing title.
2. **Icon:** Current SVG is a placeholder. Needs a designer pass.
3. **Monetization:** Recommend free with no ads for v1.

---

## How the codebase works

### Single-file architecture
Everything lives in `index.html` — HTML structure, CSS (in `<style>`), and JavaScript (in `<script>`). This is intentional:
- One file to cache = simpler service worker
- One file to load = fastest cold start on slow Libyan networks
- No build step, no bundler, no framework

### Key JS globals
- `PACKS` — object of word packs, keyed by id. Each has `.n` (display name) and `.w` (array of `{t, h, r, d?}`). `mix` auto-merges. `custom` is user-entered plain strings.
- `MODES` — classic, shabiha, qibli, court, **as2ila**, **fawda**
- `QUIPS`, `ROAST_C`, `ROAST_I`, `DEAL_TITLES`, `BLACKOUT_LINES`, `AKTHAR` — flavor / mini-game
- `TWISTS` — ~20 قبلي cards; flags: `half`, `skipGuess`, `muteStarter`, `blackoutX2`, `emoji`
- `REGIONS` / `INTENSITY` — region filter chips; هادية/عادية/مجنونة (manual minutes soft-deselect preset)
- `state` — session state. Round-only: `roundImposters`, `forceEmoji`, `askIdx`.

### Key JS functions
- `go(screenId)` — screen navigation
- `deal()` — word/roles; fawda sets `roundImposters`; region via `filterPool`
- `setIntensity` / `bump('minutes')` — preset apply; soft-deselect when minutes diverge
- `beginDiscussion` / `paintAsk` / `advanceAsk` — discuss + as2ila «اسأل الجاي»
- `buildVote` / `needImps` / `judge` — vote uses actual round imposters; `skipGuess` twist honored
- `shareResult` / `exportPack` / `importPack` — share + pack codes
- `startAkthar` / `guessAkthar` — أكثر ولا أقل MVP
- `finish` / `reVote` / `cutPower` / `saveState` / `loadState`

### Screen IDs
`home` → (`profile` after signup) → `rules` → `mode` → `setup` → `names` → `cat` → `deal` → `pass` ⇄ `reveal` → `twist` → `discuss` → `vote` → `court` → `guess` → `result` → (`akthar` ⇄ `ak-reveal`)

### Service Worker
`sw.js` uses cache name `dakheel-v17` (network-first for index/auth-sync/manifest). Bump when cached files change.

---

## Content rules (critical — read before writing any Arabic text)

From scope §7:
- **Libyan dialect only.** Not MSA, not Egyptian, not Gulf. Match the voice in the existing quips.
- **Avoid:** real private individuals, politics, anything sectarian or tribal, living political figures.
- **Safe zone:** public institutions, football clubs, cities, food, shared frustrations.
- **Do not** put religious terms in a mocking frame. عيد, رمضان, المولد are fine as words; jokes about them are not.
- **Words should be nameable in one clue word.** Cut anything that can't be.

---

## How to test locally

```bash
cd ~/Desktop/الدخيل
npx serve .
# Opens at http://localhost:3000
```

Then:
1. Verify fonts render (Rakkas for headings, Tajawal for body)
2. Play a full round — home → mode → setup → category → deal → pass (**افتح**) → reveal (**اللاعب الجاي**) → discuss → vote → guess (no word on screen) → result
3. Court mode: reopen vote once, confirm second reopen is blocked
4. Reload the page — settings and names should persist
5. Check DevTools → Application → Service Workers — should show `sw.js` registered (`dakheel-v8`)
6. Go offline (DevTools → Network → Offline) — the game should still work fully

---

## How to deploy

### Web (Vercel)
```bash
# From project root — deploy the entire folder as a static site
npx vercel --prod
```
No build command needed. The root is the publish directory.

### APK (TWA via Bubblewrap — not yet set up)
```bash
npm i -g @nickvision/nickvision-legacy # or bubblewrap
# Requires the web version to be deployed first at a public HTTPS URL
# Then: bubblewrap init --manifest https://your-domain.com/manifest.json
# Then: bubblewrap build
# Outputs: app-release-signed.apk
```

### APK (Capacitor — alternative, not yet set up)
```bash
npm init -y
npm i @capacitor/core @capacitor/cli
npx cap init الدخيل com.dakheel.app --web-dir .
npx cap add android
npx cap sync
npx cap open android  # Opens in Android Studio for build
```

---

## Summary for the next AI session

> You're picking up a Libyan Arabic party game called الدخيل. It's a working PWA in `index.html` (single-file, no framework). The canonical spec is `dakheel-scope.md`. The game logic is complete — 4 modes, 14 word packs (~443 in مشكّل), intensity/secret ballot/streak energy, persistence, offline support. Layer 3+ still deferred (أسئلة / فوضى / share card / store). Content needs regional review before ship. Read this file and `dakheel-scope.md` before making changes.
