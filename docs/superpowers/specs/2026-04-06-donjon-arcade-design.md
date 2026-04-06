# Donjon — Arcade Fight Game Tab

## Overview

The Donjon tab transforms La Rochelle's season into an arcade fight game experience. Each match is presented as a combat encounter with sequential stat reveals, impact-scaled verdicts, and an epic finale screen with a rank title. Full sound design with synthwave BGM and SFX.

Single user (La Rochelle supporter), season 2025-2026, 26 matchdays.

## Design Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Metaphor | Arcade / Fight Game — neon, flash, raw energy |
| 2 | Entry screen | Minimal splash — counter + FIGHT button |
| 3 | Navigation | Strict linear — J1 to J26, no going back |
| 4 | Match display | Sequenced element by element |
| 5 | Data | Design for all stats (conversions, penalties, cards, scorers), code with what's available |
| 6 | Verdict | Impact adapts to magnitude (bonus off = explosion, close loss = subdued) |
| 7 | Season end | Epic screen with assigned rank/title |
| 8 | Next button | 1.5s delay after verdict |
| 9 | Future matches | Locked door + next opponent shown |
| 10 | Sound | Ambitious — SFX + BGM + mute toggle |
| 11 | Animations | Full animations, NO prefers-reduced-motion respect |

## Architecture

Multi-component orchestrated approach. `tab-donjon.js` is a lightweight orchestrator with a state machine. It delegates rendering to sub-components:

```
tab-donjon.js          → state machine + orchestration
donjon-splash.js       → entry screen (counter + FIGHT)
donjon-combat.js       → match display + animation sequence
donjon-verdict.js      → victory/defeat with scaled effects
donjon-locked-door.js  → locked door + next opponent
donjon-finale.js       → epic end screen + rank
donjon-audio.js        → Web Audio API (SFX + BGM + mute)
```

Each component exports `render()` + `destroy()`. The orchestrator mounts/unmounts based on state.

## Data Layer

### Source

Match results: `scraped.json` → `results` field, filtered on `home === 'la-rochelle' || away === 'la-rochelle'`, sorted by `matchday`.

Future matches: `2025-2026.json` → `calendar` field, filtered on La Rochelle.

Team names: `2025-2026.json` → `teams` field (mapping id → name).

### Normalized match structure

```js
{
  matchday: 4,
  date: "2025-09-27",
  isHome: true,
  opponent: { id: "perpignan", name: "USA Perpignan" },
  score: { lr: 31, opponent: 8 },
  tries: { lr: 4, opponent: 1 },
  bonus: {
    lr: { offensive: true, defensive: false },
    opponent: { offensive: false, defensive: false }
  },
  // Future fields (null until pipeline provides them)
  conversions: null,
  penalties: null,
  cards: null,
  scorers: null,
  // Derived
  result: "win",       // "win" | "loss" | "draw"
  magnitude: "large"   // "large" (>15pts) | "medium" (8-15) | "close" (<8)
}
```

`magnitude` drives verdict intensity (section 5).

## State Machine

### States

```
SPLASH → COMBAT → VERDICT → (loop matchday++)
                           → LOCKED_DOOR (if matchday > last played)
                           → FINALE (if matchday === 26 and all played)
```

### Local state (not in global store)

```js
{
  phase: "splash",        // splash | combat | verdict | locked | finale
  currentIndex: 0,        // index in LR matches array
  matches: [],            // normalized matches
  nextOpponent: null,     // calendar data for locked door
  muted: false            // audio state
}
```

### Transitions

- **SPLASH** → FIGHT button clicked → **COMBAT** (index 0)
- **COMBAT** → animation sequence complete → **VERDICT**
- **VERDICT** → 1.5s delay → SUIVANT button appears → click → check:
  - index+1 < matches.length → **COMBAT** (index++)
  - index+1 >= matches.length && matchday < 26 → **LOCKED_DOOR**
  - all 26 matchdays played → **FINALE**
- **LOCKED_DOOR** → auto-transition after 3s → **FINALE**
- **FINALE** → REJOUER button → **SPLASH**

Each transition calls `destroy()` on current component and `render()` on next.

## Component Specifications

### 1. Splash (`donjon-splash.js`)

**Content:**
- Title: "DONJON" — large, bold, uppercase, letter-spacing, neon glow
- Subtitle: "SAISON 2025-26"
- Counter: "20 / 26 COMBATS DISPUTES" — animated counter from 0 to 20 on mount
- Button: "FIGHT" — large, centered, infinite pulse glow. On click: full-screen white flash then transition.

**Entry animation:**
- Title slides from top with bounce
- Counter fades in with delay
- Button appears last, pulse starts

**Callback:** `onStart()` → orchestrator transitions to COMBAT.

### 2. Combat (`donjon-combat.js`)

**Layout:** Two columns face to face. La Rochelle ALWAYS on the left regardless of home/away. Opponent on the right. Score zone centered between them.

**Animation sequence (each step waits for previous to complete):**

1. **Combatants enter** (~0.5s) — Team names slide in from sides (LR from left, opponent from right). Home/away indicator below name.
2. **Matchday + date** (~0.3s) — "JOURNEE 4 — 27 sept. 2025" drops from top, centered.
3. **LR score** (~0.4s) — Number appears on left with impact (scale 1.5 → 1 + flash).
4. **Opponent score** (~0.4s) — Same effect on right.
5. **LR tries** (~0.3s) — Ball icon + count, slides in below left score.
6. **Opponent tries** (~0.3s) — Same on right.
7. **LR bonus** (~0.3s) — "OFF" and/or "DEF" badges pop in (only if bonus earned, skip otherwise).
8. **Opponent bonus** (~0.3s) — Same.
9. **Future fields** (conversions, penalties, cards, scorers) — Same slide-in pattern. Skipped if `null`.
10. **Transition** — 0.3s pause then orchestrator transitions to VERDICT.

**Timing:** 100-200ms silence between each step. Total sequence: ~3-4 seconds.

**Callback:** `onSequenceComplete()` → orchestrator transitions to VERDICT.

### 3. Verdict (`donjon-verdict.js`)

**Impact levels based on `magnitude` + `result`:**

| Scenario | Visual | Audio |
|----------|--------|-------|
| Win large (>15pts) or bonus offensif | "VICTOIRE" gold, particle explosion, screen flashes gold, light shake | Epic fanfare, crowd roar |
| Win medium/close | "VICTOIRE" green, subtle glow, no particles | Short positive sting |
| Draw | "MATCH NUL" white, neutral flash | Neutral sound |
| Loss close (bonus def or <8pts) | "DEFAITE" orange, slight screen tremble | Muted thud |
| Loss large (>15pts) | "DEFAITE" red, violent screen shake, dark vignette closing in | Heavy impact, low rumble |

**Sequence:**
1. Verdict text arrives with scale (0 → 1.2 → 1) plus corresponding flash/shake
2. Final score remains visible below verdict (small)
3. 1.5s pause
4. "SUIVANT →" button fades in
5. Click → `onNext()` callback to orchestrator

**Particles (win large):** Small gold/yellow rectangles exploding from center, falling with gravity. Pure CSS animations (no external lib), 15-20 particles max.

### 4. Locked Door (`donjon-locked-door.js`)

**Content:**
- Large centered padlock icon with slow pulse glow
- "PROCHAIN COMBAT" in arcade letter-spacing
- Opponent name in large text, letter-by-letter reveal effect
- Date and home/away indicator ("A MARCEL DEFLANDRE" or "A L'EXTERIEUR")

**Entry animation:**
- Padlock drops from top with bounce + lock sound
- Match info fades in cascade (opponent, date, venue)

**Transition:** Auto-transition to FINALE after 3s. No button.

**Callback:** `onTimeout()` after 3s → orchestrator transitions to FINALE.

### 5. Finale (`donjon-finale.js`)

**Rank system based on win rate:**

| Win rate | Rank | Color | Effect |
|----------|------|-------|--------|
| >= 85% | LEGENDE | Gold | Continuous gold particle rain |
| 70-84% | GLADIATEUR | Purple | Pulsing neon glow |
| 55-69% | CHEVALIER | Blue | Occasional lightning |
| 40-54% | ECUYER | Green | Subtle flame |
| < 40% | RECRUE | Grey | Smoke/mist |

**Animation sequence:**
1. Fade to black (~0.5s)
2. Stats scroll in one by one, "end credits" style:
   - "20 COMBATS DISPUTES"
   - "12 VICTOIRES — 6 DEFAITES — 2 NULS"
   - "MEILLEURE VICTOIRE : 31-8 vs Perpignan (J4)"
   - "PIRE DEFAITE : 18-23 vs Bordeaux-Begles (J1)"
   - "ESSAIS MARQUES : 47"
   - "BONUS OFFENSIFS : 5"
3. Dramatic pause (~1s)
4. Rank appears large with visual effect + rank-specific sound
5. Rank stays on screen with looping effect

**Button:** "REJOUER" at bottom — returns to SPLASH. No delay, player contemplates as long as they want.

**Stats calculation:** All derived from normalized matches — best win = largest score gap in wins, worst loss = largest gap in losses, etc.

### 6. Audio (`donjon-audio.js`)

**Architecture:** Web Audio API singleton. `AudioContext` created on first user gesture (FIGHT button click — bypasses browser autoplay restrictions).

**Two channels:**
- **SFX** — punctual effects (impacts, fanfares, lock)
- **BGM** — ambient music loop

**Sound catalog:**

| ID | Type | When | Description |
|----|------|------|-------------|
| `fight-start` | SFX | FIGHT click | Gong / ring bell |
| `score-impact` | SFX | Each score reveal | Dull thud |
| `stat-reveal` | SFX | Tries, bonus, etc. | Light tick/blip |
| `win-large` | SFX | Win large verdict | Fanfare + crowd |
| `win-small` | SFX | Win medium/close verdict | Short positive sting |
| `draw` | SFX | Draw verdict | Neutral sound |
| `loss-small` | SFX | Loss close verdict | Muted thud |
| `loss-large` | SFX | Loss large verdict | Heavy impact + rumble |
| `lock` | SFX | Locked door | Metal lock |
| `finale-reveal` | SFX | Rank reveal | Adapted to rank |
| `arcade-bgm` | BGM | From FIGHT to FINALE | Synthwave arcade loop |

**API:**

```js
init()           // Create AudioContext (call on first gesture)
play(soundId)    // Play a SFX
startBGM()       // Start ambient music
stopBGM()        // Stop music
setMuted(bool)   // Global mute/unmute
isMuted()        // Getter
destroy()        // Cleanup
```

**Mute button:** Rendered by orchestrator (persistent across all screens), top-right corner. Speaker / muted speaker icon.

**File format:** MP3 for browser compat, lazy-loaded (fetch + decodeAudioData) on `init()`. Stored in `public/audio/donjon/`.

**Sound files:** Royalty-free, sourced separately. Infrastructure is built with placeholder slots.

## CSS & Art Direction

### Donjon palette (custom properties in `tokens.css`)

```css
--w-donjon-bg: #0a0a0f;            /* Very dark background */
--w-donjon-neon-primary: #00f0ff;   /* Cyan neon — accents */
--w-donjon-neon-secondary: #ff00aa; /* Magenta neon — opponent */
--w-donjon-gold: #ffd700;           /* Gold — wins, Legende rank */
--w-donjon-red: #ff2244;            /* Red — losses */
--w-donjon-green: #00ff88;          /* Green — subtle wins */
--w-donjon-text: #e0e0e0;           /* Main text */
```

### Typography

- Titles and verdicts: project font, uppercase, `letter-spacing: 0.15em`, neon `text-shadow` (double glow blur 10px + 40px)
- Stats: monospace for numbers (visual alignment of scores)
- No additional external font — stays within 200Ko budget

### Recurring effects

- **Neon glow:** `text-shadow` + `box-shadow` with primary color, pulsed via `@keyframes`
- **Particles:** `::before`/`::after` pseudo-elements with `@keyframes` for position + opacity. No canvas.
- **Shake:** `@keyframes` on `transform: translate()` with random-ish values (3-4 steps)
- **Flash:** Full-screen overlay `position: fixed`, opacity 1→0 in 200ms

### CSS files

- `styles/components/tab-donjon.css` — orchestrator layout + donjon variables
- `styles/components/donjon-splash.css`
- `styles/components/donjon-combat.css`
- `styles/components/donjon-verdict.css`
- `styles/components/donjon-locked-door.css`
- `styles/components/donjon-finale.css`

One CSS file per component, following project convention.

## Accessibility

- **prefers-reduced-motion:** NOT respected. Full animations for all users. This is a deliberate design choice for this personal app.
- **Keyboard:** FIGHT and SUIVANT buttons focusable and activatable with Enter/Space.
- **aria-labels:** On all interactive elements and status indicators.
- **Screen readers:** Verdict text and stats are real DOM text, not just visual effects.

## Performance

- All animations use `transform` and `opacity` only (GPU composited)
- Particles via CSS `@keyframes`, no canvas, no JS animation loops
- Audio files lazy-loaded, not bundled in main JS
- Total additional JS: estimated ~3-4Ko gzipped (7 small components + audio engine)
- Audio files: external, loaded on demand, not counted in 200Ko asset budget
