#!/usr/bin/env node

/**
 * scripts/scrape-api.js
 *
 * Scrapes TOP 14 data from API-Sport (rugby v1) for a given season.
 * Outputs data/{season}-{season+1}.scraped.json in the same format
 * as data/scraped.json used by the existing pipeline.
 *
 * Usage: node scripts/scrape-api.js <startYear>
 *   e.g. node scripts/scrape-api.js 2024   → data/2024-2025.scraped.json
 *        node scripts/scrape-api.js 2025   → data/2025-2026.scraped.json
 *
 * API key is read from api-sport.md at project root.
 * Free plan: 100 req/day, header x-apisports-key.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..');
const LEAGUE_ID = 16; // TOP 14
const API_BASE = 'https://v1.rugby.api-sports.io';

// ─── Team ID Mapping ──────────────────────────────────────────────────────

const TEAM_ID_MAP = {
  95: 'bayonne',
  96: 'bordeaux-begles',
  98: 'castres',
  99: 'clermont',
  100: 'la-rochelle',
  101: 'lyon',
  102: 'montpellier',
  103: 'toulon',
  104: 'racing-92',
  105: 'pau',
  106: 'stade-francais',
  107: 'toulouse',
  120: 'perpignan',
  123: 'vannes',
  // Barrage / playoff opponents
  114: 'oyonnax',
  731: 'oyonnax', // alternate ID used in 2023-2024 season data
  // Historical teams (relegated)
  97: 'brive',
  // 2025-2026 promoted teams
  1627: 'montauban',
  121: 'grenoble',
  // La Rochelle alternate ID (API returns 0 in some seasons)
  0: 'la-rochelle',
};

function mapTeamId(apiId) {
  const mapped = TEAM_ID_MAP[apiId];
  if (!mapped) {
    console.warn(`Unknown API team ID: ${apiId} — using raw ID`);
    return `unknown-${apiId}`;
  }
  return mapped;
}

// ─── API Client ───────────────────────────────────────────────────────────

function readApiKey() {
  const keyPath = resolve(ROOT, 'api-sport.md');
  const content = readFileSync(keyPath, 'utf-8').trim();
  if (!content) {
    console.error('api-sport.md is empty. Add your API key.');
    process.exit(1);
  }
  return content;
}

async function apiFetch(endpoint, apiKey) {
  const url = `${API_BASE}${endpoint}`;
  console.log(`  GET ${url}`);

  const res = await fetch(url, {
    headers: { 'x-apisports-key': apiKey },
  });

  if (res.status === 429) {
    console.error('API rate limit reached (429). Try again later.');
    process.exit(1);
  }

  if (!res.ok) {
    console.error(`API error: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const json = await res.json();

  if (json.errors && Object.keys(json.errors).length > 0) {
    console.error('API returned errors:', JSON.stringify(json.errors));
    process.exit(1);
  }

  return json.response;
}

// ─── Data Transformation ──────────────────────────────────────────────────

function transformStandings(apiStandings) {
  // API returns nested array: response[0] is the group, which contains the standings array
  if (!apiStandings || apiStandings.length === 0) {
    console.error('Season not available — API returned no standings data');
    process.exit(1);
  }
  const group = apiStandings[0];
  if (!group || !Array.isArray(group)) {
    console.error('Unexpected standings format');
    process.exit(1);
  }

  return group.map((entry) => ({
    id: mapTeamId(entry.team.id),
    rank: entry.position,
    points: entry.points ?? 0,
    played: entry.games?.played ?? 0,
    won: entry.games?.win?.total ?? 0,
    drawn: entry.games?.draw?.total ?? 0,
    lost: entry.games?.lose?.total ?? 0,
    bonusOffensive: 0, // API doesn't provide bonus breakdown
    bonusDefensive: 0,
    pointsFor: entry.points_for ?? entry.goals?.for ?? 0,
    pointsAgainst: entry.points_against ?? entry.goals?.against ?? 0,
  }));
}

function transformGames(apiGames) {
  const results = [];
  const calendar = [];

  // Sort by date
  const sorted = [...apiGames].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  for (const game of sorted) {
    const homeId = mapTeamId(game.teams.home.id);
    const awayId = mapTeamId(game.teams.away.id);
    const rawWeek = game.week != null ? parseInt(game.week, 10) : null;
    const matchday = Number.isFinite(rawWeek) ? rawWeek : null;
    const date = game.date ? game.date.split('T')[0] : '';

    // Skip non-regular-season games (playoffs, barrage, etc.)
    if (matchday == null || matchday < 1 || matchday > 26) continue;

    const homeScore = game.scores?.home;
    const awayScore = game.scores?.away;

    if (homeScore != null && awayScore != null) {
      // Played game → result
      results.push({
        matchday,
        date,
        home: homeId,
        away: awayId,
        homeScore,
        awayScore,
        homeBonus: null,
        awayBonus: null,
      });
    } else {
      // Not yet played → calendar
      calendar.push({
        matchday,
        date,
        home: homeId,
        away: awayId,
      });
    }
  }

  return { results, calendar };
}

// ─── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const yearArg = process.argv[2];
  if (!yearArg) {
    console.error('Usage: node scripts/scrape-api.js <startYear>');
    console.error('  e.g. node scripts/scrape-api.js 2024');
    process.exit(1);
  }

  const season = parseInt(yearArg, 10);
  if (isNaN(season) || season < 2000 || season > 2100) {
    console.error(`Invalid season year: ${yearArg}`);
    process.exit(1);
  }

  const seasonLabel = `${season}-${season + 1}`;
  const outputPath = resolve(ROOT, 'data', `${seasonLabel}.scraped.json`);

  console.log(`\nScraping TOP 14 season ${seasonLabel} from API-Sport...\n`);

  const apiKey = readApiKey();

  // Fetch standings
  console.log('Fetching standings...');
  const apiStandings = await apiFetch(
    `/standings?league=${LEAGUE_ID}&season=${season}`,
    apiKey,
  );
  const standings = transformStandings(apiStandings);

  // Fetch games
  console.log('Fetching games...');
  const apiGames = await apiFetch(
    `/games?league=${LEAGUE_ID}&season=${season}`,
    apiKey,
  );
  const { results, calendar } = transformGames(apiGames);

  // Determine current matchday
  const maxMatchday = results.length > 0
    ? Math.max(...results.map((r) => r.matchday))
    : 0;

  const output = {
    scrapedAt: new Date().toISOString(),
    source: 'api-sport',
    matchday: maxMatchday,
    complete: maxMatchday >= 26 && calendar.length === 0,
    standings,
    results,
    calendar,
  };

  writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\nScraping complete:`);
  console.log(`  Season     : ${seasonLabel}`);
  console.log(`  Matchday   : ${maxMatchday}`);
  console.log(`  Complete   : ${output.complete}`);
  console.log(`  Standings  : ${standings.length} teams`);
  console.log(`  Results    : ${results.length} matches`);
  console.log(`  Calendar   : ${calendar.length} upcoming matches`);
  console.log(`  Output     : ${outputPath}`);
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
