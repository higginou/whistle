# Bonus Enrichment Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Inject real offensive/defensive bonus data (BO/BD) and try counts from Rugbyrama match pages into the Elo pipeline so that `computeResultBonuses()` uses accurate point totals.

**Architecture:** Incremental scraping inside `scrape-rugbyrama.js` — extract `matchUrl` from the calendar page, then lazily fetch individual match pages for unenriched results. `scrape.js` loads existing `scraped.json` to preserve already-enriched data across runs. `computeResultBonuses()` in `elo.js` uses real bonuses when available, falling back to margin heuristic otherwise.

**Tech Stack:** Node.js ESM, cheerio (already installed), Vitest for tests. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-04-06-bonus-enrichment-design.md`

---

## File Map

| File | Change |
|------|--------|
| `scripts/scrape-rugbyrama.js` | Extract `matchUrl` in `parseRugbyramaCalendar()`, add `homeTries`/`awayTries: null`, new `parseMatchPage(html)`, new `enrichMatchBonuses(results)` — all exported |
| `scripts/scrape.js` | Load existing `scraped.json`, pass previously-enriched results to preserve incremental state |
| `scripts/elo.js` | `computeResultBonuses()` uses real bonuses when `homeBonus !== null`, falls back to margin logic |
| `tests/scrape-rugbyrama.test.js` | New tests: `matchUrl` extraction, `parseMatchPage()`, `enrichMatchBonuses()` |
| `tests/elo.test.js` | New tests: real-bonus path in `computeResultBonuses()` |

---

## Task 1: Extract `matchUrl` from calendar page

**Files:**
- Modify: `scripts/scrape-rugbyrama.js` (lines 135–158, the `state === 1` branch)
- Modify: `tests/scrape-rugbyrama.test.js` (add assertions)

The score `<a>` element with class `a_idalgo_content_result_match_score_end` already holds the match URL as its `href`. Extract it into `matchUrl`. Also add `homeTries: null, awayTries: null` to each result object.

- [ ] **Step 1.1: Write failing tests for `matchUrl` extraction**

Add to `tests/scrape-rugbyrama.test.js`, inside the existing `describe('parseRugbyramaCalendar : extraction des resultats')` block:

```js
it('extrait matchUrl pour les matchs joues', () => {
  const { results } = parseRugbyramaCalendar(CALENDAR_HTML);

  const sfMontauban = results.find(
    (r) => r.home === 'stade-francais' && r.away === 'montauban',
  );
  expect(sfMontauban.matchUrl).toBe(
    '/resultats/rugby/top-14/phase-reguliere/rencontre/55924/stade-francais-montauban',
  );
});

it('extrait matchUrl pour tous les matchs joues', () => {
  const { results } = parseRugbyramaCalendar(CALENDAR_HTML);
  for (const r of results) {
    expect(typeof r.matchUrl).toBe('string');
    expect(r.matchUrl).toMatch(/\/rencontre\/\d+\//);
  }
});

it('inclut homeTries et awayTries null par defaut', () => {
  const { results } = parseRugbyramaCalendar(CALENDAR_HTML);
  for (const r of results) {
    expect(r).toHaveProperty('homeTries', null);
    expect(r).toHaveProperty('awayTries', null);
  }
});
```

Also add to `describe('parseRugbyramaCalendar : extraction du calendrier')`:

```js
it('les matchs calendrier n\'ont pas de matchUrl', () => {
  const { calendar } = parseRugbyramaCalendar(CALENDAR_HTML);
  for (const m of calendar) {
    expect(m).not.toHaveProperty('matchUrl');
  }
});
```

- [ ] **Step 1.2: Run tests to verify they fail**

```bash
npx vitest run tests/scrape-rugbyrama.test.js
```

Expected: FAIL on the new `matchUrl` and `homeTries` assertions.

- [ ] **Step 1.3: Implement — extract `matchUrl`, add `homeTries`/`awayTries`**

In `scripts/scrape-rugbyrama.js`, inside the `if (state === 1)` block (around line 135), find the score link and extract its href before pushing to `results`:

```js
// Extract match URL from the score link
const scoreLink = $el
  .find('a.a_idalgo_content_result_match_score_end')
  .first();
const matchUrl = scoreLink.attr('href') || null;

if (!matchUrl) {
  console.warn(`No match URL found for ${homeId} vs ${awayId} on ${date}`);
}

results.push({
  matchday: 0, // filled below
  round,
  date,
  home: homeId,
  away: awayId,
  homeScore,
  awayScore,
  matchUrl,
  homeBonus: null,
  awayBonus: null,
  homeTries: null,
  awayTries: null,
});
```

- [ ] **Step 1.4: Run tests to verify they pass**

```bash
npx vitest run tests/scrape-rugbyrama.test.js
```

Expected: all tests pass, including existing ones.

- [ ] **Step 1.5: Commit**

```bash
git add scripts/scrape-rugbyrama.js tests/scrape-rugbyrama.test.js
git commit -m "feat: extraire matchUrl et champs tries depuis le calendrier rugbyrama"
```

---

## Task 2: Implement `parseMatchPage(html)`

**Files:**
- Modify: `scripts/scrape-rugbyrama.js` (add new exported function)
- Modify: `tests/scrape-rugbyrama.test.js` (add new test suite)

This task has a **discovery step**: fetch a real match page to understand the HTML structure before implementing the parser. This is expected — the spec explicitly flagged this as an at-implementation-time discovery.

- [ ] **Step 2.1: Fetch a real match page and inspect the HTML**

Run this one-off fetch (output to a temp file, inspect manually):

```bash
node -e "
const url = 'https://www.rugbyrama.fr/resultats/rugby/top-14/phase-reguliere/rencontre/55924/stade-francais-montauban';
fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Whistle-Pipeline/1.0)' } })
  .then(r => r.text())
  .then(html => require('fs').writeFileSync('/tmp/match-page.html', html))
  .then(() => console.log('Done — inspect /tmp/match-page.html'));
" 2>&1 | head -5
```

Search the HTML for: `bonus`, `BO`, `BD`, `essai`, `try`, `idalgo`. Identify the CSS classes or text patterns that indicate each bonus and try count.

**Known structure (from spec risk notes):** Look for:
- Elements with text "Bonus offensif" / "Bonus défensif" or class names containing "bonus"
- A timeline or event list with "Essai" labels for try counts
- BO/BD may appear as checkboxes, icons, or text near each team's score block

Document your findings in a comment above `parseMatchPage` — this is critical context for future maintenance.

- [ ] **Step 2.2: Write failing tests for `parseMatchPage`**

Based on what you discovered in 2.1, create an HTML fixture (`MATCH_PAGE_HTML`) at the top of `tests/scrape-rugbyrama.test.js` that mimics the real structure. Then add:

```js
import {
  parseRugbyramaCalendar,
  parseIdalgoDate,
  parseMatchPage,  // add to import
} from '../scripts/scrape-rugbyrama.js';
```

```js
// ─── Fixtures ────────────────────────────────────────────────────────────────
// TODO: fill in with real HTML structure discovered in Task 2.1
const MATCH_PAGE_HTML = `
<!DOCTYPE html>
<html lang="fr">
<body>
  <!-- Paste the relevant bonus/try HTML structure here -->
</body>
</html>
`;

const MATCH_PAGE_NO_BONUS_HTML = `
<!DOCTYPE html>
<html lang="fr">
<body>
  <!-- Match page where bonus indicators are absent -->
</body>
</html>
`;
```

```js
describe('parseMatchPage', () => {
  it('extrait les bonus offensifs et defensifs', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    expect(result).not.toBeNull();
    expect(result.homeBonus).toEqual({ offensive: true, defensive: false });
    expect(result.awayBonus).toEqual({ offensive: false, defensive: true });
  });

  it('extrait le nombre d\'essais', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    expect(typeof result.homeTries).toBe('number');
    expect(typeof result.awayTries).toBe('number');
    expect(result.homeTries).toBeGreaterThanOrEqual(0);
    expect(result.awayTries).toBeGreaterThanOrEqual(0);
  });

  it('retourne null si le parsing echoue (page vide)', () => {
    const result = parseMatchPage('<html><body></body></html>');
    expect(result).toBeNull();
  });

  it('retourne homeBonus et awayBonus avec des booleens', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    if (result !== null) {
      expect(typeof result.homeBonus.offensive).toBe('boolean');
      expect(typeof result.homeBonus.defensive).toBe('boolean');
      expect(typeof result.awayBonus.offensive).toBe('boolean');
      expect(typeof result.awayBonus.defensive).toBe('boolean');
    }
  });
});
```

Adjust fixture values to match real data from step 2.1.

- [ ] **Step 2.3: Run tests to verify they fail**

```bash
npx vitest run tests/scrape-rugbyrama.test.js
```

Expected: FAIL — `parseMatchPage` not yet exported.

- [ ] **Step 2.4: Implement `parseMatchPage(html)`**

Add to `scripts/scrape-rugbyrama.js`, after the `parseRugbyramaCalendar` function:

```js
/**
 * Parse an individual Rugbyrama match page to extract bonus indicators and try counts.
 *
 * [Document here what HTML structure you found in Task 2.1 step]
 * e.g. "Bonus offensif" appears as <span class="...bonus-offensif..."> with text "BO"
 * adjacent to team name when awarded. Try count from <li class="...essai..."> events.
 *
 * @param {string} html - Raw HTML of the match page
 * @returns {{ homeBonus: {offensive: boolean, defensive: boolean},
 *             awayBonus: {offensive: boolean, defensive: boolean},
 *             homeTries: number,
 *             awayTries: number } | null}
 */
export function parseMatchPage(html) {
  try {
    const $ = cheerio.load(html);

    // TODO: implement based on discovered HTML structure from Task 2.1
    // The implementation details depend on the real page structure.
    // Pattern: find bonus indicators near each team block, count try events.

    // Defensive implementation: return null if key elements are missing
    // so enrichMatchBonuses can log a warning and move on.

    // Example skeleton (replace with real selectors):
    // const homeBonusEl = $('.home-team .bonus-offensif');
    // if (!homeBonusEl.length) return null;

    throw new Error('parseMatchPage not yet implemented — fill in after Task 2.1');
  } catch (err) {
    console.warn(`parseMatchPage failed: ${err.message}`);
    return null;
  }
}
```

**After discovering the real structure in step 2.1**, replace the skeleton with the actual implementation. The function must:
- Return `null` on any parse failure (missing elements, unexpected structure) — the `try/catch` already handles exceptions
- Return an object with `homeBonus`, `awayBonus`, `homeTries`, `awayTries` on success
- Use cheerio selectors matching the real page structure

- [ ] **Step 2.5: Run tests to verify they pass**

```bash
npx vitest run tests/scrape-rugbyrama.test.js
```

Expected: all tests pass.

- [ ] **Step 2.6: Commit**

```bash
git add scripts/scrape-rugbyrama.js tests/scrape-rugbyrama.test.js
git commit -m "feat: parseMatchPage — extraction bonus et essais depuis page match rugbyrama"
```

---

## Task 3: `enrichMatchBonuses()` + incremental `scrape.js`

**Files:**
- Modify: `scripts/scrape-rugbyrama.js` (add `enrichMatchBonuses`, add to exports)
- Modify: `scripts/scrape.js` (load existing `scraped.json`, pass enriched results)
- Modify: `tests/scrape-rugbyrama.test.js` (add test suite)

- [ ] **Step 3.1: Write failing tests for `enrichMatchBonuses`**

Add to the import in `tests/scrape-rugbyrama.test.js`:

```js
import {
  parseRugbyramaCalendar,
  parseIdalgoDate,
  parseMatchPage,
  enrichMatchBonuses,  // add
} from '../scripts/scrape-rugbyrama.js';
```

Add test suite:

```js
describe('enrichMatchBonuses', () => {
  it('enrichit les matchs avec matchUrl et bonus null', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(MATCH_PAGE_HTML),
    });
    global.fetch = fetchMock;

    const results = [
      {
        matchday: 1, date: '2025-09-06',
        home: 'stade-francais', away: 'montauban',
        homeScore: 47, awayScore: 24,
        matchUrl: '/resultats/rugby/top-14/phase-reguliere/rencontre/55924/stade-francais-montauban',
        homeBonus: null, awayBonus: null,
        homeTries: null, awayTries: null,
      },
    ];

    await enrichMatchBonuses(results);

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(results[0].homeBonus).not.toBeNull();
    expect(results[0].awayBonus).not.toBeNull();
  });

  it('ne re-fetche pas les matchs deja enrichis', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const results = [
      {
        matchday: 1, date: '2025-09-06',
        home: 'toulouse', away: 'la-rochelle',
        homeScore: 30, awayScore: 20,
        matchUrl: '/resultats/rugby/top-14/phase-reguliere/rencontre/99999/toulouse-la-rochelle',
        homeBonus: { offensive: true, defensive: false },
        awayBonus: { offensive: false, defensive: false },
        homeTries: 4, awayTries: 2,
      },
    ];

    await enrichMatchBonuses(results);

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('ignore les matchs sans matchUrl', async () => {
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    const results = [
      {
        matchday: 1, date: '2025-09-06',
        home: 'toulouse', away: 'la-rochelle',
        homeScore: 30, awayScore: 20,
        matchUrl: null,
        homeBonus: null, awayBonus: null,
        homeTries: null, awayTries: null,
      },
    ];

    await enrichMatchBonuses(results);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(results[0].homeBonus).toBeNull();
  });

  it('laisse le match intact si parseMatchPage retourne null', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve('<html><body></body></html>'),
    });

    const results = [
      {
        matchday: 1, date: '2025-09-06',
        home: 'toulon', away: 'castres',
        homeScore: 20, awayScore: 15,
        matchUrl: '/resultats/rugby/top-14/phase-reguliere/rencontre/99998/toulon-castres',
        homeBonus: null, awayBonus: null,
        homeTries: null, awayTries: null,
      },
    ];

    await enrichMatchBonuses(results);

    expect(results[0].homeBonus).toBeNull();
  });
});
```

Add `import { vi } from 'vitest';` at the top of the test file.

- [ ] **Step 3.2: Run tests to verify they fail**

```bash
npx vitest run tests/scrape-rugbyrama.test.js
```

Expected: FAIL — `enrichMatchBonuses` not yet exported.

- [ ] **Step 3.3: Implement `enrichMatchBonuses(results)` in `scrape-rugbyrama.js`**

Add after `parseMatchPage`, before the main export section:

```js
const RUGBYRAMA_BASE_URL = 'https://www.rugbyrama.fr';
const ENRICH_THROTTLE_MS = 1000;

/**
 * Enrich match results with real bonus data from individual match pages.
 * Incremental: only fetches pages for matches where homeBonus is still null.
 * Modifies results in-place.
 *
 * @param {Array} results - Array of match result objects (mutated in-place)
 * @returns {Promise<void>}
 */
export async function enrichMatchBonuses(results) {
  const toEnrich = results.filter(
    (r) => r.homeBonus === null && r.matchUrl !== null,
  );

  if (toEnrich.length === 0) {
    console.log('Bonus enrichment: nothing to fetch (all enriched or no URLs).');
    return;
  }

  console.log(`Bonus enrichment: fetching ${toEnrich.length} match page(s)...`);

  for (let i = 0; i < toEnrich.length; i++) {
    const match = toEnrich[i];

    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, ENRICH_THROTTLE_MS));
    }

    const url = `${RUGBYRAMA_BASE_URL}${match.matchUrl}`;
    let html;
    try {
      html = await fetchPage(url);
    } catch (err) {
      console.warn(`Could not fetch ${url}: ${err.message}`);
      continue;
    }

    const parsed = parseMatchPage(html);
    if (!parsed) {
      console.warn(`Could not parse bonus data from ${url}`);
      continue;
    }

    match.homeBonus = parsed.homeBonus;
    match.awayBonus = parsed.awayBonus;
    match.homeTries = parsed.homeTries;
    match.awayTries = parsed.awayTries;

    console.log(
      `  [${i + 1}/${toEnrich.length}] ${match.home} vs ${match.away}: ` +
      `home BO=${parsed.homeBonus.offensive} BD=${parsed.homeBonus.defensive} ` +
      `away BO=${parsed.awayBonus.offensive} BD=${parsed.awayBonus.defensive}`,
    );
  }
}
```

- [ ] **Step 3.4: Update `scrape.js` to load existing `scraped.json` and call `enrichMatchBonuses`**

In `scripts/scrape.js`, modify the imports and `main()` function:

```js
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scrapeRugbyrama, enrichMatchBonuses } from './scrape-rugbyrama.js';
import { scrapeLnr } from './scrape-lnr.js';

const OUTPUT_PATH = resolve(import.meta.dirname, '..', 'data', 'scraped.json');

/**
 * Load previously enriched results from scraped.json, indexed by matchUrl.
 * Returns empty map if file doesn't exist or has no rugbyrama results.
 */
function loadPreviouslyEnrichedResults() {
  if (!existsSync(OUTPUT_PATH)) return new Map();

  let previous;
  try {
    previous = JSON.parse(readFileSync(OUTPUT_PATH, 'utf-8'));
  } catch {
    return new Map();
  }

  if (previous.source !== 'rugbyrama') return new Map();

  const enriched = new Map();
  for (const r of previous.results ?? []) {
    if (r.matchUrl && r.homeBonus !== null) {
      enriched.set(r.matchUrl, {
        homeBonus: r.homeBonus,
        awayBonus: r.awayBonus,
        homeTries: r.homeTries,
        awayTries: r.awayTries,
      });
    }
  }
  return enriched;
}

/**
 * Apply previously enriched bonus data to freshly scraped results.
 * Avoids re-fetching match pages for already-processed matches.
 */
function applyPreviousEnrichment(results, enriched) {
  for (const r of results) {
    if (r.matchUrl && enriched.has(r.matchUrl)) {
      const prev = enriched.get(r.matchUrl);
      r.homeBonus = prev.homeBonus;
      r.awayBonus = prev.awayBonus;
      r.homeTries = prev.homeTries;
      r.awayTries = prev.awayTries;
    }
  }
}

async function main() {
  let output;

  // Primary: Rugbyrama
  try {
    output = await scrapeRugbyrama();
    console.log('Rugbyrama scraping succeeded.');
  } catch (err) {
    console.warn(`Rugbyrama failed: ${err.message}`);
    console.warn('Falling back to LNR...');

    try {
      output = await scrapeLnr();
      console.log('LNR fallback scraping succeeded.');
    } catch (lnrErr) {
      console.error(`LNR fallback also failed: ${lnrErr.message}`);
      process.exit(1);
    }
  }

  // Incremental bonus enrichment (Rugbyrama only — LNR has no match URLs)
  if (output.source === 'rugbyrama') {
    const previouslyEnriched = loadPreviouslyEnrichedResults();
    applyPreviousEnrichment(output.results, previouslyEnriched);
    await enrichMatchBonuses(output.results);
  }

  // Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');

  // Summary
  const enrichedCount = output.results.filter((r) => r.homeBonus !== null).length;
  console.log('Scraping complete:');
  console.log(`  Source: ${output.source}`);
  console.log(`  Matchday: ${output.matchday}`);
  console.log(`  Complete: ${output.complete}`);
  console.log(`  Standings: ${output.standings.length} teams`);
  console.log(`  Results: ${output.results.length} matches (${enrichedCount} with bonus data)`);
  console.log(`  Calendar: ${output.calendar.length} upcoming matches`);
  console.log(`  Output: ${OUTPUT_PATH}`);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
```

- [ ] **Step 3.5: Run all tests to verify they pass**

```bash
npx vitest run
```

Expected: all tests pass.

- [ ] **Step 3.6: Commit**

```bash
git add scripts/scrape-rugbyrama.js scripts/scrape.js tests/scrape-rugbyrama.test.js
git commit -m "feat: enrichMatchBonuses — scraping incremental des bonus par page match"
```

---

## Task 4: Update `computeResultBonuses()` in `elo.js`

**Files:**
- Modify: `scripts/elo.js` (`computeResultBonuses` function)
- Modify: `tests/elo.test.js` (add real-bonus test cases)

- [ ] **Step 4.1: Write failing tests for the real-bonus path**

Add to `tests/elo.test.js`, inside the existing `describe('computeResultBonuses')` block:

```js
it('utilise les vrais bonus quand homeBonus est non-null', () => {
  const results = [
    makeResult({
      home: 'toulouse', away: 'la-rochelle',
      homeScore: 30, awayScore: 20,
      homeBonus: { offensive: true, defensive: false },
      awayBonus: { offensive: false, defensive: false },
    }),
  ];
  const points = computeResultBonuses(results);
  // toulouse: 4 (win) + 1 (BO) = 5
  // la-rochelle: 0 (loss) — real bonuses say no BD, even though margin=10≤5 is false anyway
  expect(points.get('toulouse')).toBe(5);
  expect(points.get('la-rochelle')).toBe(0);
});

it('bonus defensif reel pris en compte meme si marge > 5', () => {
  // Real data: la-rochelle got BD even though they lost by 10 (edge case shouldn't happen but spec allows it)
  const results = [
    makeResult({
      home: 'toulouse', away: 'la-rochelle',
      homeScore: 30, awayScore: 20,
      homeBonus: { offensive: false, defensive: false },
      awayBonus: { offensive: false, defensive: true },
    }),
  ];
  const points = computeResultBonuses(results);
  expect(points.get('toulouse')).toBe(4);
  expect(points.get('la-rochelle')).toBe(1); // real BD from scraping
});

it('bonus offensif sur match nul', () => {
  const results = [
    makeResult({
      home: 'toulouse', away: 'la-rochelle',
      homeScore: 20, awayScore: 20,
      homeBonus: { offensive: true, defensive: false },
      awayBonus: { offensive: true, defensive: false },
    }),
  ];
  const points = computeResultBonuses(results);
  // Both get 2 (draw) + 1 (BO) = 3
  expect(points.get('toulouse')).toBe(3);
  expect(points.get('la-rochelle')).toBe(3);
});

it('fallback marge utilise quand homeBonus est null', () => {
  // Existing behavior preserved: margin ≤ 5 → defensive bonus
  const results = [
    makeResult({
      home: 'toulouse', away: 'la-rochelle',
      homeScore: 22, awayScore: 19,
      homeBonus: null, awayBonus: null,
    }),
  ];
  const points = computeResultBonuses(results);
  expect(points.get('toulouse')).toBe(4);
  expect(points.get('la-rochelle')).toBe(1); // margin=3 → defensive fallback
});

it('bonus max: victoire + BO + BD = 6 pts', () => {
  const results = [
    makeResult({
      home: 'toulouse', away: 'la-rochelle',
      homeScore: 30, awayScore: 20,
      homeBonus: { offensive: true, defensive: true },
      awayBonus: { offensive: false, defensive: false },
    }),
  ];
  const points = computeResultBonuses(results);
  expect(points.get('toulouse')).toBe(6);
  expect(points.get('la-rochelle')).toBe(0);
});
```

**Important:** Update `makeResult` in `tests/elo.test.js` to default `homeBonus: null, awayBonus: null`:

```js
function makeResult(overrides = {}) {
  return {
    matchday: 1,
    date: '2025-09-06',
    home: 'toulouse',
    away: 'la-rochelle',
    homeScore: 24,
    awayScore: 18,
    homeBonus: null,
    awayBonus: null,
    ...overrides,
  };
}
```

This ensures existing tests continue hitting the fallback branch (since `null !== null` is `false`, they won't enter the real-bonus branch).

- [ ] **Step 4.2: Run tests to verify they fail**

```bash
npx vitest run tests/elo.test.js
```

Expected: FAIL on the real-bonus tests (current implementation ignores `homeBonus`).

- [ ] **Step 4.3: Implement real-bonus path in `computeResultBonuses()`**

In `scripts/elo.js`, find `computeResultBonuses` and update the bonus application section. The win/draw/loss base points are unchanged. Only the bonus calculation changes:

```js
export function computeResultBonuses(results) {
  const points = new Map();
  for (const r of results) {
    if (r.homeScore == null || r.awayScore == null) continue;
    if (!points.has(r.home)) points.set(r.home, 0);
    if (!points.has(r.away)) points.set(r.away, 0);

    const margin = Math.abs(r.homeScore - r.awayScore);

    // Base points
    if (r.homeScore > r.awayScore) {
      points.set(r.home, points.get(r.home) + 4);
    } else if (r.homeScore < r.awayScore) {
      points.set(r.away, points.get(r.away) + 4);
    } else {
      points.set(r.home, points.get(r.home) + 2);
      points.set(r.away, points.get(r.away) + 2);
    }

    // Bonus points
    if (r.homeBonus != null && r.awayBonus != null) {
      // Real bonus data from scraping (loose != null catches both null and undefined)
      if (r.homeBonus.offensive) points.set(r.home, points.get(r.home) + 1);
      if (r.homeBonus.defensive) points.set(r.home, points.get(r.home) + 1);
      if (r.awayBonus.offensive) points.set(r.away, points.get(r.away) + 1);
      if (r.awayBonus.defensive) points.set(r.away, points.get(r.away) + 1);
    } else {
      // Fallback: infer defensive bonus from margin only (no offensive bonus)
      if (r.homeScore > r.awayScore && margin <= DEFENSIVE_MARGIN) {
        points.set(r.away, points.get(r.away) + 1);
      } else if (r.homeScore < r.awayScore && margin <= DEFENSIVE_MARGIN) {
        points.set(r.home, points.get(r.home) + 1);
      }
    }
  }
  return points;
}
```

- [ ] **Step 4.4: Run all tests to verify they pass**

```bash
npx vitest run
```

Expected: all tests pass, no regressions.

- [ ] **Step 4.5: Run Biome lint check**

```bash
npx biome check .
```

Expected: 0 errors.

- [ ] **Step 4.6: Commit**

```bash
git add scripts/elo.js tests/elo.test.js
git commit -m "feat: computeResultBonuses utilise les vrais bonus BO/BD quand disponibles"
```

---

## Final Verification

- [ ] `npx vitest run` — all pass
- [ ] `npx biome check .` — 0 errors
- [ ] Manual smoke test: `node scripts/scrape.js` (with real network) — verify enrichment log output shows bonus data being fetched and stored
