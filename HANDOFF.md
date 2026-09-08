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
| `dakheel-scope.md` | **The canonical spec.** Full game rules, modes, content rules, design system, acceptance criteria, and originally planned Flutter architecture. Read this first for any feature work. |
| `dakheel-v2.html` | **The original prototype.** Single-file HTML with all game logic, used as the interaction spec. Preserved as reference — do not edit. |
| `index.html` | **The production PWA.** Enhanced version of the prototype. This is the live codebase. |

---

## Current file structure

```
الدخيل/
├── index.html              ← Production PWA (single-file: HTML + CSS + JS inline)
├── manifest.json           ← PWA web app manifest
├── sw.js                   ← Service worker (cache-first, offline support)
├── assets/
│   ├── fonts/              ← 11 woff2 files (Rakkas + Tajawal 400/500/700/900, Arabic + Latin subsets)
│   └── icons/
│       └── icon.svg        ← App icon (192x192, "د" in saffron with tea shadow)
├── dakheel-scope.md        ← Canonical spec (read-only reference)
└── dakheel-v2.html         ← Original prototype (read-only reference)
```

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
- [x] All 4 game modes: كلاسيكي (classic), الشبيهة (shabiha), قبلي (qibli), المحكمة (court)
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
- [x] 10 word packs: أكل ليبي (28), مدن ومناطق (30), معالم وأماكن (22), لهجة وكلام (28), عادات ومناسبات (22), رياضة وأندية (22), البيت والسوق (22), حاجات تعصّب (18), مهن وشغل (24), طبيعة وجو (22)
- [x] مشكّل (all packs merged) + فئة خاصة (user-entered, min 3 words)
- [x] 18 quips (shown during deal/discussion)
- [x] 18 citizen-win roast lines
- [x] 18 imposter-win roast lines
- [x] 10 twist cards with effects

### PWA infrastructure
- [x] **Local fonts** — Rakkas + Tajawal (4 weights) bundled as woff2, no CDN dependency
- [x] **Service Worker** (`sw.js`) — precaches all 15 assets, cache-first strategy, old cache cleanup
- [x] **Web App Manifest** — standalone, portrait, RTL, dark theme, SVG icon
- [x] **PWA meta tags** — theme-color, apple-mobile-web-app-capable, apple-touch-icon
- [x] **Fully offline** — works in airplane mode from first load onward

### Persistence (localStorage)
- [x] Saves: mode, player count, imposter count, minutes, all 4 toggles, category, player names, avatars
- [x] Rules screen available from home («كيف نلعبوها») — landing always opens on home
- [x] "نفس القعدة متاع قبل؟" — returning users prompted to reuse last session's names
- [x] Custom word packs saved and restored

### Accessibility
- [x] `role="switch"` + `aria-checked` on all 4 toggle switches
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
- [ ] **Deploy to Vercel or Netlify** — the web version needs a short shareable URL for WhatsApp distribution
- [ ] **Generate raster PNG icons** — 192x192 and 512x512 from the SVG, add to manifest for wider Android compatibility
- [ ] **TWA or Capacitor wrapper** — to produce a signed APK for the Play Store
- [ ] **Play Store listing** — Arabic-first store copy, screenshots, icon

### Content gaps
- [ ] **Regional content sign-off** — places pack rebalanced toward Benghazi/south (best-effort); still need native review from Benghazi and Fezzan/south before shipping (blocking for v1 per scope §7)
- [ ] **Region tags on words** — add a `region` field (`tripoli`/`benghazi`/`south`/`all`) to each word in the packs. Not used in v1 UI but enables a "لهجة المنطقة" filter in v2
- [ ] **More quips/roasts** — currently 18 each, which clears the 15+ minimum. More variety = better replay. Each line must be Libyan dialect, funny, relatable.

### Features deferred to v2+ (from scope §4, §11, §14)
- [ ] More packs: مدرسة وجامعة, طفولة وتسعينات, أفلام وبرامج
- [ ] "أكثر أو أقل" second game mode
- [ ] Share-a-pack via copyable code string
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
- `PACKS` — object of word packs, keyed by id. Each has `.n` (display name) and `.w` (array of `{t, h}` word+hint). `mix` auto-merges all packs. `custom` is user-entered plain strings.
- `MODES` — array of 4 mode objects: `{id, ic, t, d}` (id, icon emoji, title, description)
- `QUIPS`, `ROAST_C`, `ROAST_I` — string arrays for flavor text
- `TWISTS` — array of `{t, half?}` twist card objects (قبلي mode)
- `state` — single mutable state object for the entire session. Never persisted mid-round.

### Key JS functions
- `go(screenId)` — navigates between screens (hides all, shows target)
- `deal()` — starts a round: picks unused word/decoy, assigns roles, resets court reopen
- `showWord()` / `hideWord()` — open-then-next card display
- `beginDiscussion()` — starts timer (`discussTotal`), picks starter, shows twist band
- `buildVote()` — renders vote grid with selection logic
- `judge()` — evaluates vote correctness; guess screen does not show the word
- `finish(winner)` — scores, shows result (word + roles)
- `reVote()` — court reopen once (`courtReopened`)
- `saveState()` / `loadState()` — localStorage persistence
- `cutPower()` — blackout prank effect

### Screen IDs (match `id="s-{name}"` in HTML)
`home` → `rules` → `mode` → `setup` → `names` → `cat` → `deal` → `pass` ⇄ `reveal` → `twist` → `discuss` → `vote` → `court` → `guess` → `result`

### Service Worker
`sw.js` uses cache name `dakheel-v4`. When you change any cached file, **bump the cache name** (e.g., `dakheel-v5`) so the SW picks up changes. The activate handler auto-deletes old caches.

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
5. Check DevTools → Application → Service Workers — should show `sw.js` registered (`dakheel-v3`)
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

> You're picking up a Libyan Arabic party game called الدخيل. It's a working PWA in `index.html` (single-file, no framework). The canonical spec is `dakheel-scope.md`. The game logic is complete — all 4 modes, 10 word packs, persistence, offline support. What's left is: deploy to Vercel for the web URL, generate PNG icons, and wrap as TWA/Capacitor for a Play Store APK. Content needs regional review before ship. Read this file and `dakheel-scope.md` before making changes.
