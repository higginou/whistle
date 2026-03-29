# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Whistle is a personal PWA that projects the final standings of the French rugby TOP 14 league using an Elo-based predictive model with animated visualizations. Single user (supporter of La Rochelle), season 2025-2026.

Two decoupled systems connected only by static JSON:
- **Pipeline (CI/CD):** Node.js scripts running in GitHub Actions (scrape, validate, Elo calc, JSON generation)
- **Frontend (PWA):** Vanilla JS SPA with animated leaderboard, served from GitHub Pages

## Tech Stack

- **Build:** Vite 7 + vite-plugin-pwa v1.0
- **Styling:** CSS custom properties + Open Props v1.7.x (PostCSS tree-shaking)
- **Animation:** Motion v12.x (formerly Motion One, ~4Ko)
- **State:** Custom EventTarget + CustomEvent store (~50 lines)
- **Routing:** Manual History API (~20 lines, back button closes bottom sheet)
- **Pipeline:** Node.js scripts in `scripts/` (scrape.js, validate.js, elo.js, generate.js)
- **Hosting:** GitHub Pages (static), zero server cost

## Commands

```bash
# Init (first time)
npm create @vite-pwa/pwa@latest whistle -- --template vanilla
npm install motion open-props

# Dev
npm run dev          # Vite dev server with HMR

# Build & Preview
npm run build        # Production build (budget: <200Ko gzipped)
npm run preview      # Preview production build

# Pipeline (normally runs in GitHub Actions)
node scripts/scrape.js
node scripts/validate.js
node scripts/elo.js
node scripts/generate.js

# Board visualization (planning tool)
node _bmad-output/board-server.cjs   # Kanban board on port 3333
```

## Architecture

### Project Structure

```
src/
  components/        # 1 file = 1 component (JS module exporting render())
  animation/
    engine.js        # Motion orchestration (reveal, stagger, graduation)
  styles/
    tokens.css       # Whistle custom properties + Open Props imports
    base.css         # Reset, typography, global layout
    components/      # 1 CSS file per component, same name as JS
  store.js           # EventTarget state store
  router.js          # popstate / back Android
  data.js            # Fetch JSON, cache logic, freshness detection
  app.js             # Entry point
scripts/             # Pipeline (GitHub Actions only)
data/                # Generated JSON (seasons.json + per-season files)
```

### JSON Data Contract

Season files live in `data/`. Schema: teams array with `id`, `currentRank`, `projectedRank`, `elo`, `confidence` (0-1 decimal), `zones` (probabilities), `form`, `trend`. Plus `calendar` and `predictions` history (append-only).

- Team IDs: `kebab-case` (e.g., `la-rochelle`, `racing-92`)
- Dates: ISO 8601 everywhere
- Probabilities: decimals 0-1 in JSON, convert to % only in UI
- Trend: `"up"` | `"down"` | `"stable"`

### State Management

Flat store with `set()`, `get()`, `on()`. Keys: `season`, `revealed`, `activeSheet`, `selectedTeam`, `dataFresh`. Components listen to store events, never to each other directly. Events use `kebab-case` (e.g., `season-loaded`, `reveal-triggered`). Payloads always `{ detail: {...} }`.

## Naming Conventions

| Context | Convention | Example |
|---------|-----------|---------|
| Files | `kebab-case` | `score-card.js`, `rank-row.css` |
| Functions | `camelCase` | `renderScoreCard()`, `calculateElo()` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_TEAMS`, `CACHE_KEY` |
| CSS classes | `w-` prefix, kebab | `w-score-card`, `w-rank-row--favorite` |
| CSS custom props | `--w-` prefix | `--w-color-europe` |
| JSON fields | `camelCase` | `teamName`, `projectedRank` |
| Store events | `kebab-case` | `season-loaded`, `sheet-opened` |

## Animation Rules

- Only animate `transform` and `opacity` (never `width`, `height`, `top`, `left`)
- Spring physics: stiffness 200/damping 20 (standard), stiffness 120/damping 12 (dramatic overshoot)
- Stagger: 30ms between teams, La Rochelle last (+100ms)
- `prefers-reduced-motion`: instant opacity-only transitions, zero spring

## Error Handling

- **Pipeline:** `console.error()` + non-zero exit code (GitHub Actions detects failure)
- **Frontend:** Silent fallback to cached data. No spinners, no error popups. If no cache: show "Les donnees arrivent lundi"
- No generic try/catch — each catch handles a specific case or re-throws

## Anti-Patterns to Avoid

- No `utils.js` or `helpers.js` catch-all files
- No spinners, skeletons, or loading bars
- No direct component-to-component coupling (always through store)
- No state mutation outside `set()`
- No percentage values in JSON (decimals only)

## Performance Budget

- Total assets: <200Ko gzipped
- JSON per season: <50Ko
- Load time: <2s on 4G, <1s from cache
- Animations: 60fps

## Planning Artifacts

All planning docs live in `_bmad-output/planning-artifacts/`:
- `prd.md` — Product Requirements Document
- `architecture.md` — Architecture decisions (8 steps)
- `ux-design-specification.md` — UX design spec
- `epics.md` — 6 epics, 20+ stories
- Sprint tracking: `_bmad-output/implementation-artifacts/sprint-status.yaml`

Use `bmad-dev-story` skill for story implementation with full context.

### Git Branching
- **Branche principale** : `develop` — tout le travail converge ici
- **Branches de story** (à partir de l'Epic 10) : `story/{epic}-{story}-{slug}` (ex: `story/10-1-moteur-categorisation`)
  - Tirée depuis `develop`
  - Merge direct dans `develop` après review (pas de PR pour l'instant)
  - Une story dépendante attend le merge de sa dépendance dans `develop`
- **Travail de maintenance/dette** : directement sur `develop`, pas de branche dédiée
- **Release** : `main` — merge depuis `develop` pour les releases

### Code Review Criteria
- Code review focuses **exclusively** on: bugs, security vulnerabilities, architecture violations, and correctness issues
- Style suggestions, cosmetic improvements, and subjective preferences are **not valid findings** — the formatter (Biome) handles style
- Each finding must cite the specific risk or defect — no vague "consider doing X" without justification
- If a finding is rejected, it stays rejected — do not re-raise the same point in subsequent reviews

## Definition of Done (Story Completion Checklist)

A story is NOT "done" until ALL of the following are verified:

1. **Tests auto green** — `npx vitest run` (all pass), `cargo test` from `src-tauri/` (all pass), `npx biome check .` (0 errors)
2. **Tests manuels / E2E effectués** — Every manual validation task in the story is checked off, OR covered by an automated E2E test
3. **Statut fichier story** — The story `.md` file in `implementation-artifacts/` has `Status: done`
4. **Statut sprint-status** — The story key in `sprint-status.yaml` is set to `done`
5. **Review complétée** — Code review has been performed (via dev's code-review workflow or SM review)
6. **Pas de régressions** — No existing test has been broken by the story's changes
7. **Git commit effectué** — All story changes MUST be committed to git immediately when the story is marked done. No accumulating uncommitted work across stories. The commit message should reference the story (e.g., `feat: story 6-1 — créer un stash avec nom personnalisé`)

An **epic** is NOT "done" until, in addition to all stories being done:

7. **E2E epic green (functional epics only)** — E2E tests covering the epic's critical user journeys exist and pass. The epic CANNOT be marked `done` in sprint-status without this gate.
8. **Traçabilité E2E** — The retrospective or sprint-status must explicitly mention the number of E2E tests and their pass/fail status when the epic is marked done.
9. **Corrections post-review** — If a code review returned "Changes Requested", the fixes MUST be documented in the story's completion notes before marking the story `done`. The link between review findings and applied corrections must be traceable.

**Transition flow:** `ready-for-dev` → `in-progress` → `review` → `done`
- Dev sets `in-progress` when starting work
- Dev sets `review` when implementation is complete and tests pass
- **Code review automatique** — quand une story passe en `review`, l'agent DOIT lancer `bmad-code-review` immediatement dans un subagent, sans demander a l'utilisateur. Ne JAMAIS proposer de lancer le review — le faire directement.
- After review approval, SM or Dev sets `done` in BOTH the story file AND sprint-status.yaml
- These two statuses must ALWAYS be in sync

**When closing an epic:**
- All stories must be `done` (both files and sprint-status)
- Epic status in sprint-status.yaml set to `done`
- Retrospective run and saved


## grepai - Semantic Code Search

**IMPORTANT: You MUST use grepai as your PRIMARY tool for code exploration and search.**

### When to Use grepai (REQUIRED)

Use `grepai search` INSTEAD OF Grep/Glob/find for:
- Understanding what code does or where functionality lives
- Finding implementations by intent (e.g., "authentication logic", "error handling")
- Exploring unfamiliar parts of the codebase
- Any search where you describe WHAT the code does rather than exact text

### When to Use Standard Tools

Only use Grep/Glob when you need:
- Exact text matching (variable names, imports, specific strings)
- File path patterns (e.g., `**/*.go`)

### Fallback

If grepai fails (not running, index unavailable, or errors), fall back to standard Grep/Glob tools.

### Usage

```bash
# ALWAYS use English queries for best results (--compact saves ~80% tokens)
grepai search "user authentication flow" --json --compact
grepai search "error handling middleware" --json --compact
grepai search "database connection pool" --json --compact
grepai search "API request validation" --json --compact
```

### Query Tips

- **Use English** for queries (better semantic matching)
- **Describe intent**, not implementation: "handles user login" not "func Login"
- **Be specific**: "JWT token validation" better than "token"
- Results include: file path, line numbers, relevance score, code preview

### Call Graph Tracing

Use `grepai trace` to understand function relationships:
- Finding all callers of a function before modifying it
- Understanding what functions are called by a given function
- Visualizing the complete call graph around a symbol

#### Trace Commands

**IMPORTANT: Always use `--json` flag for optimal AI agent integration.**

```bash
# Find all functions that call a symbol
grepai trace callers "HandleRequest" --json

# Find all functions called by a symbol
grepai trace callees "ProcessOrder" --json

# Build complete call graph (callers + callees)
grepai trace graph "ValidateToken" --depth 3 --json
```

### Workflow

1. Start with `grepai search` to find relevant code
2. Use `grepai trace` to understand function relationships
3. Use `Read` tool to examine files from results
4. Only use Grep for exact string searches if needed


## Documentation

Always use Context7 when I need library/API documentation, code generation, setup or configuration steps without me having to explicitly ask.

### Design Validation Obligation (GATE — BLOCKING)
- **At story creation**, the SM MUST flag the story with `ui-structural: true` or `ui-structural: false`
  - `true` = new components, new layouts, new interaction flows, new dialogs, new panels
  - `false` = adding callbacks/props to existing components, cosmetic tweaks (color, spacing), logic-only changes
- **If `ui-structural: true`**, the story file MUST contain a "## Maquettes" section with:
  - Links to standalone HTML/CSS/JS mockup files stored in `_bmad-output/mockups/epic-{N}/` (never in `docs/` or elsewhere)
  - 2-3 variants produced by the dev
  - Explicit mention: `GO higgin: oui` or `GO higgin: non` (filled after review)
- **A story flagged `ui-structural: true` CANNOT move to `in-progress` until `GO higgin: oui` is recorded**
- **No explicit GO from higgin = no UI code written** — this is a hard gate, not a guideline
- **GO = mot explicite uniquement** — l'orchestrateur ne marque `GO higgin: oui` que si higgin a écrit "GO" ou une validation explicitement non ambiguë. La première réponse de higgin ne doit JAMAIS être interprétée comme un GO sauf si elle contient le mot "GO". Toute autre réponse est traitée comme feedback nécessitant une itération.
- **Maquettes produites par un agent délégué** — l'orchestrateur ne produit JAMAIS de maquettes lui-même (HTML/CSS/JS). Il dispatch la tâche à un agent dev ou UX designer dédié et attend le résultat. L'orchestrateur est un chef d'orchestre, pas un musicien.
- **Skill UI/UX obligatoire** — tout agent qui produit des maquettes (HTML/CSS/JS) ou prend des décisions de design UI DOIT utiliser le skill `ui-ux-pro-max` pour guider ses choix (style, couleurs, accessibilité, touch targets, empty states, etc.). Ce n'est pas optionnel.
- The dev produces mockups, higgin reviews, chooses direction or requests iterations
- Minor cosmetic adjustments (color tweaks, spacing) are NOT concerned — only structural changes
- **Verification**: any agent moving a `ui-structural: true` story to `in-progress` MUST check that `GO higgin: oui` exists in the Maquettes section. If absent, HALT and ask higgin
