# الدخيل — Build Scope

Libyan social-deduction party game. Pass-and-play on one phone, fully offline, Arabic-first (RTL), Libyan dialect and content throughout.

Reference prototype: `dakheel-v2.html` (working single-file HTML). Treat it as the interaction spec, not the codebase. Rebuild properly per this document.

---

## 1. Product

**One line:** كلكم تعرفوا الكلمة… إلا واحد.

**What it is.** 3–14 people, one phone. The phone goes around; each player privately sees a secret word. One or more players are the imposter. Then a round of one-word clues, a timer, a vote, a reveal.

**Who it's for.** Libyan friend groups and family gatherings — قعدة شاي, عزومة, رمضان evenings, university breaks. Ages ~12 and up. Most will play in a room with poor or no internet.

**Why it exists.** Every imposter app on the store is translated Gulf or Egyptian content. Nothing in it sounds Libyan. The content and the humor are the product; the mechanic is commodity.

**Non-goals for v1**
- No online/multi-device play. One phone only.
- No accounts, no login, no server.
- No ads in v1.
- No English localization in v1 (architect for it, don't build it).

---

## 2. Platform and stack

**PWA first** (single `index.html` + service worker), three distribution targets:
- **Web** — primary growth channel. Deploy to Vercel/Netlify; WhatsApp link, zero install. Ships first.
- **Android** — wrap the PWA as TWA / Capacitor for Play Store (later).
- **iOS** — same PWA in Safari; App Store wrapper later if needed.

**Rules**
- No backend, no network calls required to play. The app must work with the phone in airplane mode after first load (service worker + local fonts).
- Bundle all fonts locally in `assets/fonts/`. Do not load Google Fonts over the network.
- Persistence: `localStorage` only, for the small things listed in §6.
- Portrait-first UI. Keep the screen stack small — no heavy SPA framework required for v1.

---

## 3. Game rules (canonical)

### Setup
- Players: 3–14. Default 5.
- Imposters: 1–3, hard-capped at `max(1, floor((players - 1) / 2))`. Recompute and clamp whenever player count changes.
- Discussion timer: 1–10 minutes. Default 3.

### Round flow
1. **Deal** — pick the secret word and a decoy word from the chosen pack (decoy must differ from the word). Assign imposter indices randomly. Assign informant if enabled.
2. **Pass** — the phone shows whose turn it is. Player taps **افتح** to see their card, then taps **اللاعب الجاي** to hide it and advance. The word must never be on screen until they open, and must leave the screen before the phone is passed.
3. **Twist** (قبلي mode only) — one rule card shown to the room before discussion.
4. **Discuss** — timer runs, a random player is named as starter. Blackout prank may fire.
5. **Vote** — select exactly as many players as there are imposters.
6. **Court** (المحكمة mode only) — 45-second defense clock for the accused, then convict or reopen the vote.
7. **Judge** — correct if every selected player is an imposter.
8. **Guess** — if the imposters were caught (and mode ≠ الشبيهة), they get one spoken guess at the word. The secret word is **not** shown on this screen — host listens, then taps صابها / غلط. The word appears on the result screen.
9. **Result** — verdict, roast line, the word, the full role reveal, cumulative per-player points.

### Scoring
- Citizens win: every citizen +1.
- Imposter wins: every imposter +2.
- Points persist across rounds until the session is reset. Roles do not.

---

## 4. Modes

| id | Name | Behavior |
|---|---|---|
| `classic` | كلاسيكي | Imposter sees "أنت الدخيل", plus a max-two-word word hint if `showHint` is on. Guess step enabled. |
| `shabiha` | الشبيهة | Imposter sees the **decoy word** from the same pack, styled exactly like a normal card. He is never told he is the imposter. **Guess step is skipped** — he has nothing to guess. |
| `qibli` | قبلي | Classic rules + one random twist card per round, shown before discussion and pinned as a band during it. |
| `court` | المحكمة | Classic rules + a 45-second defense phase after the vote, with the option to reopen voting once. |

**Twist cards** (قبلي). One is drawn per round. Most are social-only; one modifies the timer.
1. الكلام بكلمة وحدة بس — اللي يزيد كلمة، يتشك فيه
2. ممنوع تقول اسم أي لاعب طول النقاش
3. كل واحد لازم يضحّك واحد قبل ما يقول كلمته
4. لفّة سكوت: أول لفّة بالإشارات بس، بلا كلام
5. ممنوع تعيد كلمة قالها اللي قبلك
6. الأصغر سنًا يبدأ، والأكبر يختم
7. الكهرباء ضعيفة — الوقت انقسم على اثنين → **effect: `timer *= 0.5`**
8. ممنوع تقول «ما نعرفش» — اللي يقولها يخسر دوره
9. كل واحد يتكلم وهو واقف
10. لازم كلمتك تبدا بنفس حرف كلمة اللي قبلك

Model twists as `{ id, text, effect? }` so more can be added without touching logic.

---

## 5. Toggles

- **دور المخبر** (default off) — one citizen additionally sees the name of **one** imposter (the first assigned when there are several). Card is styled differently (blue-grey). Copy warns him not to be obvious, since exposing himself early tells the room he's the informant. Only assign if at least one citizen exists.
- **مقلب المولّد** (default on) — once per round, during the second half of the discussion timer, the screen cuts to full black: «الكهرباء قطعت — كملوا في الضلمة»، six-second countdown, then «جات». The discussion timer keeps running underneath. Fires at most once per round. On Android, a short vibration pattern accompanies it.
- **تلميح للدخيل** (default on) — classic/qibli/court only. Shows a max-two-word Libyan clue that nudges toward the secret word (never the word itself, never the category name alone). Off → «بلا تلميح». Ignored in الشبيهة. Custom packs have no hints.
- **أسماء اللاعبين** (default off) — when off, players are «اللاعب ١…ن». When on, a name entry screen with a tappable emoji avatar per player.

---

## 6. Persistence

Store only:
- Last used mode, player count, imposter count, minutes, all four toggles.
- Player names and avatars from the last session (offer to reuse: "نفس القعدة متاع قبل؟").
- Custom word packs the user created.

Landing is always **home**; rules are opened only via «كيف نلعبوها». Do not auto-route first visits to rules.

Never store round state. A killed app starts a fresh round.

---

## 7. Content

Ten built-in packs plus مشكّل (all packs merged) and فئة خاصة (user-entered, minimum 3 words). Canonical v1 lists live in `index.html` (production PWA). Pack keys and names:

| key | name | count |
|---|---|---|
| `food` | أكل ليبي | 28 |
| `cities` | مدن ومناطق | 30 |
| `places` | معالم وأماكن | 22 |
| `slang` | لهجة وكلام | 28 |
| `customs` | عادات ومناسبات | 22 |
| `sport` | رياضة وأندية | 22 |
| `home` | البيت والسوق | 22 |
| `annoy` | حاجات تعصّب | 18 |
| `work` | مهن وشغل | 24 |
| `nature` | طبيعة وجو | 22 |

**Content rules**
- Keep packs in JSON, not in Dart source. Adding words must not require a rebuild of logic.
- Words should be nameable in one clue word. Cut anything that can't be.
- **Regional balance is a known gap.** Word entries carry a `r` region tag (`tripoli` / `benghazi` / `south` / `all`). v1 UI ignores the tag. Before store listing, get sign-off from at least one person from Benghazi and one from the south/Fezzan. A "لهجة المنطقة" filter is the obvious v2 feature.
- Avoid: real private individuals, politics, anything sectarian or tribal, anything that names a living political figure. Public institutions, football clubs, cities, food, and shared frustrations are the safe and funny zone.
- Do not put religious terms in a mocking frame. عيد, رمضان, المولد are fine as words; jokes about them are not.

**Voice lines.** Three rotating string arrays, also in JSON:
- `quips` — shown on the dealing screen and under the discussion timer.
- `roastCitizens` — result screen when citizens win.
- `roastImposter` — result screen when the imposter wins.

Write at least 15 of each for v1. Never repeat the same line twice in a row.

---

## 8. Screens

```
home ─┬─ rules
      └─ mode ── setup ──[names]── category ── deal
                                                 │
                              ┌──────────────────┘
                          pass ⇄ reveal  (loop per player)
                              │
                          [twist] ── discuss ── vote ──[court]── judge
                                                          │
                                                    [guess] ── result
                                                                 │
                              ┌──────────────────────────────────┤
                          new round / change pack / change mode / reset
```

Screen-by-screen requirements:

**home** — wordmark with offset shadow layer, tagline, two buttons. This screen sets the tone; it should look like a printed poster, not a menu.

**mode** — four selectable cards, each with icon, name, and a one-line description of what it does to the game.

**setup** — three steppers, four toggle rows with sub-labels explaining the effect.

**names** — one row per player: tappable emoji avatar + text field. Empty field falls back to «اللاعب ن».

**category** — chips, single-select. Custom shows a textarea splitting on newline, comma, or Arabic comma.

**deal** — ~1.1s interstitial with a quip. Exists so the room can't infer roles from screen timing.

**pass** — progress dots, position counter, avatar, name, and a primary **افتح** button. Do not show the word until they open.

**reveal** — card stays open until they tap **اللاعب الجاي** (last player: **يلا نبدوا**). Three card variants: normal, imposter (warm red), informant (blue-grey). No hold gesture.

**twist** — full-screen rule card, single acknowledge button.

**discuss** — starter name, large clock, twist band if present, pause/resume, and "نصوّتوا".

**vote** — 2-column grid of avatar+name buttons. Selection capped at imposter count, oldest selection drops when exceeded. Confirm disabled until exactly N selected.

**court** — accused name(s), 45s clock, two buttons: convict, or reopen the vote (once).

**guess** — instruction only; word stays hidden. Host taps whether the imposter got it after the spoken guess. Word revealed on result.

**result** — verdict, roast line, the word, sorted per-player point table with role tags (دخيل / مخبر / أهلي), and four continue options.

---

## 9. Design system

```
ink      #12100C   app background
deep     #1B1811   cards
surf     #262117   raised controls
line     #3A3223   borders
sand     #F4EBD7   primary text
mute     #A2947A   secondary text
saffron  #F2B134   primary action, highlights
tea      #C4602A   imposter, danger, loss
mint     #79B95C   success, citizens win
plum     #7A3B4E   reserved for future roles
```

- Background carries a faint two-layer dot grid at 34px — a flattened tile motif. Subtle, never above 6% opacity.
- **Display type:** Rakkas. Headings, wordmark, clock, words, scores.
- **Body type:** Tajawal (400/500/700/900). Everything else.
- Bundle both as local assets with full Arabic coverage. Verify Arabic diacritics and ligatures render correctly on Android 8 through 15.
- Radii: 26 cards, 20 buttons and panels, 13–16 small controls, 999 chips.
- Motion: only in response to a tap. Card press scales to 0.975. No entrance animations on every section. Honor reduced-motion.

**RTL**
- `Directionality.rtl` app-wide, `locale: ar`.
- Test every screen with `flutter run --dart-define` in RTL and verify no LTR leakage in stepper controls, progress dots, or the switch thumb travel.
- Numbers: use Western digits (5, 03:00) — Libyan users read these fluently and they're clearer at a glance in a timer.

**Accessibility floor**
- Minimum touch target 44×44.
- Visible focus ring on web build (keyboard play is real on a laptop passed around).
- Contrast: all body text against `ink`/`deep` must clear 4.5:1. Verify `mute` on `deep` — raise it if it fails.
- Screen reader labels on avatar buttons and vote tiles.

---

## 10. Haptics and sound

- Reveal: light impact.
- Blackout start: pattern.
- Timer expiry: heavy, three pulses.
- Result: distinct patterns for win vs loss.
- **No sound in v1.** The phone is passed around a quiet room; audio leaks role information. If sound is added later it must be a single tick option, off by default.

---

## 11. Build order

**Phase 1 — playable core**
Modes classic + shabiha, all ten packs, full round loop, open-then-next reveal, timer, vote, result, per-player scoring. Android debug build in hand.

**Phase 2 — the personality**
قبلي twists, المحكمة defense phase, informant role, blackout prank, quips and roasts, avatars and names, persistence.

**Phase 3 — ship**
PWA on a short shareable URL (Vercel), Play Store via TWA/Capacitor later, Arabic-first store copy and screenshots, icon and splash, custom pack creation and reuse.

**Phase 4 — after feedback**
Regional word tagging and filter, more packs (مدرسة وجامعة, طفولة وتسعينات, أفلام وبرامج), a "أكثر أو أقل" second game mode in the same shell, share-a-pack via a copyable code string.

---

## 12. Acceptance criteria for v1

- Full round from home to result on a 5-player game in under 4 minutes of hands-on time.
- Word is never visible until the player taps افتح, and is gone as soon as they tap اللاعب الجاي.
- Guess screen never shows the secret word before صابها/غلط.
- Court reopen voting is available at most once per round.
- Airplane mode: install, launch, and play a complete session with no degradation.
- Imposter cap never allows a majority of imposters.
- Custom pack with 3 words plays without crashing or repeating the word as its own decoy.
- Rotate through 20 rounds on مشكّل without the same word appearing twice.
- No English text visible anywhere in the UI.
- Cold start under 2 seconds on a mid-range Android device.

---

## 13. Repository shape

```
lib/
  main.dart
  app.dart                 theme, RTL, routing
  state/game_state.dart    single source of truth for a session
  state/settings.dart      persisted preferences
  models/                  pack.dart, mode.dart, twist.dart, player.dart
  engine/round.dart        dealing, role assignment, judging, scoring
  screens/                 one file per screen in §8
  widgets/                 stepper_row, toggle_row, chip, player_tile,
                           clock, card_face, blackout_overlay
  theme/tokens.dart        colors, radii, type scale from §9
assets/
  content/packs.json
  content/voice.json       quips, roasts, twists
  fonts/
test/
  engine/round_test.dart   role assignment, imposter cap, decoy uniqueness, scoring
```

Put the whole round engine in `engine/round.dart` with no Flutter imports, so it's unit-testable without a widget tree. Every rule in §3 should have a test.

---

## 14. Open decisions

1. **App name for the store.** «الدخيل» is clean but generic in Arabic search. Consider «الدخيل — قعدة ليبية» as the listing title.
2. **Icon.** Suggest the wordmark's offset-shadow treatment on saffron. Needs a designer pass.
3. **Regional content sign-off** — blocking for v1 per §7.
4. **Monetization** — recommend free with no ads for v1. Revisit only if it spreads.
