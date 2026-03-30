#!/usr/bin/env node

/**
 * scripts/generate.js
 *
 * Generates the season JSON file with append-only prediction history
 * and updates the seasons index.
 *
 * Pipeline position: scrape.js -> validate.js -> elo.js -> **generate.js**
 *
 * Usage: node scripts/generate.js
 *
 * Input:  data/elo-output.json (produced by elo.js)
 * Output: data/2025-2026.json (season file), data/seasons.json (index)
 *
 * Error handling:
 *   - console.error() + process.exit(1) for critical failures
 *   - No generic try/catch — each catch handles a specific case
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Constants ────────────────────────────────────────────────────────────

const SEASON_ID = '2025-2026';

/** @type {Record<string, string>} Mapping from kebab-case team ID to display name */
export const TEAM_NAMES = {
  'toulouse': 'Stade Toulousain',
  'bordeaux-begles': 'Union Bordeaux-Begles',
  'la-rochelle': 'Stade Rochelais',
  'toulon': 'RC Toulon',
  'racing-92': 'Racing 92',
  'clermont': 'ASM Clermont Auvergne',
  'castres': 'Castres Olympique',
  'lyon': 'LOU Rugby',
  'montpellier': 'Montpellier Herault Rugby',
  'pau': 'Section Paloise',
  'montauban': 'US Montauban',
  'bayonne': 'Aviron Bayonnais',
  'stade-francais': 'Stade Francais Paris',
  'vannes': 'Rugby Club Vannetais',
};

// ─── Data Loading ─────────────────────────────────────────────────────────

/**
 * Load and parse a JSON file.
 * @param {string} filePath - Absolute path to the JSON file
 * @returns {object} Parsed JSON data
 * @throws {Error} If file cannot be read or parsed
 */
export function loadJson(filePath) {
  const raw = readFileSync(filePath, 'utf-8');
  return JSON.parse(raw);
}

/**
 * Load the existing season file if it exists, otherwise return a skeleton.
 * @param {string} filePath - Absolute path to the season JSON file
 * @returns {object} Existing season data or empty skeleton
 */
export function loadExistingSeason(filePath) {
  if (!existsSync(filePath)) {
    return {
      season: SEASON_ID,
      lastUpdated: null,
      matchday: 0,
      brierScore: null,
      teams: [],
      calendar: [],
      predictions: [],
    };
  }
  return loadJson(filePath);
}

// ─── Team Mapping ─────────────────────────────────────────────────────────

/**
 * Get the display name for a team ID.
 * Falls back to the ID itself if no mapping is found.
 * @param {string} teamId - kebab-case team ID
 * @returns {string} Display name
 */
export function getTeamName(teamId) {
  return TEAM_NAMES[teamId] ?? teamId;
}

// ─── Season File Building ─────────────────────────────────────────────────

/**
 * Build a team entry for the season file from elo-output data.
 * Strips eloHistory and adds name.
 * @param {object} eloTeam - Team data from elo-output.json
 * @returns {object} Team entry for the season file
 */
export function buildTeamEntry(eloTeam) {
  return {
    id: eloTeam.id,
    name: getTeamName(eloTeam.id),
    currentRank: eloTeam.currentRank,
    projectedRank: eloTeam.projectedRank,
    elo: eloTeam.elo,
    confidence: eloTeam.confidence,
    zones: eloTeam.zones,
    form: eloTeam.form,
    trend: eloTeam.trend,
  };
}

/**
 * Build a prediction entry from the current elo-output teams.
 * @param {number} matchday - Current matchday
 * @param {string} date - ISO 8601 date string
 * @param {object[]} teams - Teams from elo-output.json
 * @returns {object} Prediction entry with matchday, date, projections[]
 */
export function buildPredictionEntry(matchday, date, teams) {
  const projections = teams.map((team) => ({
    teamId: team.id,
    projectedRank: team.projectedRank,
    confidence: team.confidence,
  }));

  return {
    matchday,
    date,
    projections,
  };
}

/**
 * Merge a new prediction into the existing predictions array (append-only).
 * If a prediction for the same matchday already exists, skip it (idempotence).
 * @param {object[]} existingPredictions - Existing predictions array
 * @param {object} newPrediction - New prediction entry to append
 * @returns {object[]} Updated predictions array
 */
export function mergePredictions(existingPredictions, newPrediction) {
  const exists = existingPredictions.some(
    (p) => p.matchday === newPrediction.matchday,
  );

  if (exists) {
    return existingPredictions;
  }

  return [...existingPredictions, newPrediction];
}

/**
 * Build the complete season JSON object.
 * @param {object} eloOutput - Parsed elo-output.json
 * @param {object[]} existingPredictions - Predictions from existing season file
 * @returns {object} Complete season JSON object
 */
export function buildSeasonData(eloOutput, existingPredictions, existingCalendar = [], existingCorrections = []) {
  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const teams = eloOutput.teams.map(buildTeamEntry);

  const newPrediction = buildPredictionEntry(
    eloOutput.matchday,
    now,
    eloOutput.teams,
  );

  const predictions = mergePredictions(existingPredictions, newPrediction);
  const calendar = mergeCalendarDates(eloOutput.calendar, existingCalendar);
  const corrections = mergeCorrections(existingCorrections, eloOutput.corrections ?? []);

  return {
    season: SEASON_ID,
    lastUpdated: now,
    matchday: eloOutput.matchday,
    brierScore: null,
    teams,
    calendar,
    predictions,
    corrections,
  };
}

/**
 * Merge corrections arrays. Existing corrections are preserved, new ones
 * are appended if they don't already exist (matched by matchday + parameter).
 * @param {object[]} existing - Corrections from existing season file
 * @param {object[]} incoming - New corrections from elo-output (recalibrations)
 * @returns {object[]} Merged corrections sorted by matchday
 */
export function mergeCorrections(existing, incoming) {
  if (!incoming || incoming.length === 0) return existing;

  const keys = new Set(existing.map((c) => `${c.matchday}-${c.parameter}`));
  const merged = [...existing];

  for (const c of incoming) {
    const key = `${c.matchday}-${c.parameter}`;
    if (!keys.has(key)) {
      merged.push(c);
      keys.add(key);
    }
  }

  return merged.sort((a, b) => a.matchday - b.matchday);
}

/**
 * Merge calendar entries, preserving existing dates when new ones are empty.
 * Matches are identified by matchday + home + away.
 * @param {object[]} newCalendar - Calendar from elo-output (may have empty dates)
 * @param {object[]} existingCalendar - Calendar from existing season file
 * @returns {object[]} Merged calendar with best available dates
 */
export function mergeCalendarDates(newCalendar, existingCalendar) {
  if (!existingCalendar || existingCalendar.length === 0) return newCalendar;
  if (!newCalendar || newCalendar.length === 0) return newCalendar;

  const existingByKey = new Map();
  for (const entry of existingCalendar) {
    const key = `${entry.matchday}-${entry.home}-${entry.away}`;
    existingByKey.set(key, entry);
  }

  return newCalendar.map((entry) => {
    if (entry.date) return entry;
    const key = `${entry.matchday}-${entry.home}-${entry.away}`;
    const existing = existingByKey.get(key);
    if (existing?.date) {
      return { ...entry, date: existing.date };
    }
    return entry;
  });
}

// ─── Seasons Index ────────────────────────────────────────────────────────

/**
 * Ensure the season is present in the seasons index.
 * Returns { data, modified } to know if writing is needed.
 * @param {object} seasonsIndex - Parsed seasons.json
 * @param {string} seasonId - Season ID to ensure (e.g. "2025-2026")
 * @returns {{ data: object, modified: boolean }}
 */
export function ensureSeasonInIndex(seasonsIndex, seasonId) {
  const seasons = seasonsIndex.seasons ?? [];
  const exists = seasons.some((s) => s.id === seasonId);

  if (exists) {
    return { data: seasonsIndex, modified: false };
  }

  const updated = {
    ...seasonsIndex,
    seasons: [
      ...seasons,
      { id: seasonId, label: `Saison ${seasonId}`, current: true },
    ],
  };

  return { data: updated, modified: true };
}

// ─── Main ─────────────────────────────────────────────────────────────────

/**
 * Main entry point: load elo-output, generate season JSON, update index.
 */
export async function main() {
  const eloInputPath = resolve('data/elo-output.json');
  const seasonPath = resolve('data/2025-2026.json');
  const seasonsIndexPath = resolve('data/seasons.json');

  // Load elo-output.json
  let eloOutput;
  try {
    eloOutput = loadJson(eloInputPath);
  } catch (err) {
    console.error(`Impossible de lire ${eloInputPath} : ${err.message}`);
    process.exit(1);
  }

  // Validate minimal structure
  if (!eloOutput.teams || !Array.isArray(eloOutput.teams) || eloOutput.teams.length === 0) {
    console.error('elo-output.json invalide : teams[] manquant ou vide');
    process.exit(1);
  }

  if (typeof eloOutput.matchday !== 'number') {
    console.error('elo-output.json invalide : matchday manquant');
    process.exit(1);
  }

  // Load existing season file (for predictions history, calendar dates, and corrections)
  const existingSeason = loadExistingSeason(seasonPath);
  const existingPredictions = existingSeason.predictions ?? [];
  const existingCalendar = existingSeason.calendar ?? [];
  const existingCorrections = existingSeason.corrections ?? [];

  // Build season data
  const seasonData = buildSeasonData(eloOutput, existingPredictions, existingCalendar, existingCorrections);

  // Write season file
  try {
    writeFileSync(seasonPath, `${JSON.stringify(seasonData, null, 2)}\n`, 'utf-8');
  } catch (err) {
    console.error(`Impossible d'ecrire ${seasonPath} : ${err.message}`);
    process.exit(1);
  }

  // Update seasons.json index
  let seasonsIndex;
  try {
    seasonsIndex = loadJson(seasonsIndexPath);
  } catch (_err) {
    // If seasons.json doesn't exist, start with empty
    seasonsIndex = { seasons: [] };
  }

  const { data: updatedIndex, modified } = ensureSeasonInIndex(seasonsIndex, SEASON_ID);

  if (modified) {
    try {
      writeFileSync(seasonsIndexPath, `${JSON.stringify(updatedIndex, null, 2)}\n`, 'utf-8');
    } catch (err) {
      console.error(`Impossible d'ecrire ${seasonsIndexPath} : ${err.message}`);
      process.exit(1);
    }
  }

  // Success summary
  console.log('\n✅ Generation JSON de saison terminee');
  console.log(`  Equipes        : ${seasonData.teams.length}`);
  console.log(`  Journee        : ${seasonData.matchday}`);
  console.log(`  Predictions    : ${seasonData.predictions.length} entree(s)`);
  console.log(`  Saison index   : ${modified ? 'mis a jour' : 'deja present'}`);
  console.log(`  Sortie         : ${seasonPath}`);
  console.log('');
}

// Guard: only run main() when script is executed directly
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
