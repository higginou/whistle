#!/usr/bin/env node

/**
 * scripts/validate.js
 *
 * Validates the integrity of scraped data (data/scraped.json) before
 * passing it to the Elo calculation pipeline.
 *
 * Pipeline position: scrape.js -> **validate.js** -> elo.js -> generate.js
 *
 * Usage: node scripts/validate.js
 *
 * Error handling:
 *   - Collects ALL validation errors before reporting
 *   - console.error() for each violation
 *   - process.exit(1) if any validation fails
 *   - process.exit(0) with summary on success
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VALID_TEAM_IDS } from './team-mapping.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const EXPECTED_TEAM_COUNT = 14;
const MAX_SCORE = 150;
const MIN_MATCHDAY = 1;
const MAX_MATCHDAY = 26;
const MAX_RANK = 14;
const MAX_PLAYED = 26;
const SEASON_START = '2025-08-01';
const SEASON_END = '2026-07-31';

const REQUIRED_TOP_LEVEL_FIELDS = [
  'scrapedAt',
  'source',
  'matchday',
  'complete',
  'standings',
  'results',
  'calendar',
];

const REQUIRED_STANDING_FIELDS = [
  'id',
  'rank',
  'points',
  'played',
  'won',
  'drawn',
  'lost',
];

const REQUIRED_RESULT_FIELDS = [
  'matchday',
  'date',
  'home',
  'away',
  'homeScore',
  'awayScore',
];

const REQUIRED_CALENDAR_FIELDS = ['matchday', 'home', 'away'];

// ─── Validation Functions ───────────────────────────────────────────────────

/**
 * Validate that all required top-level fields are present.
 * @param {object} data - Parsed scraped data
 * @returns {string[]} Array of error messages
 */
export function validateTopLevelFields(data) {
  const errors = [];
  for (const field of REQUIRED_TOP_LEVEL_FIELDS) {
    if (data[field] === undefined || data[field] === null) {
      errors.push(`Champ obligatoire manquant au premier niveau : "${field}"`);
    }
  }

  // Matchday range validation (integer 1-26)
  if (typeof data.matchday === 'number') {
    if (
      !Number.isInteger(data.matchday) ||
      data.matchday < MIN_MATCHDAY ||
      data.matchday > MAX_MATCHDAY
    ) {
      errors.push(
        `matchday au premier niveau doit etre un entier entre ${MIN_MATCHDAY} et ${MAX_MATCHDAY}, recu ${data.matchday}`,
      );
    }
  }

  return errors;
}

/**
 * Validate standings: 14 teams, valid IDs, no duplicates, required fields.
 * @param {object[]} standings
 * @returns {string[]} Array of error messages
 */
export function validateStandings(standings) {
  const errors = [];

  if (!Array.isArray(standings)) {
    errors.push('standings doit etre un tableau');
    return errors;
  }

  if (standings.length !== EXPECTED_TEAM_COUNT) {
    errors.push(
      `standings contient ${standings.length} equipes au lieu de ${EXPECTED_TEAM_COUNT}`,
    );
  }

  const seenIds = new Set();

  for (let i = 0; i < standings.length; i++) {
    const entry = standings[i];
    const prefix = `standings[${i}]`;

    // Required fields
    for (const field of REQUIRED_STANDING_FIELDS) {
      if (entry[field] === undefined || entry[field] === null) {
        errors.push(`${prefix} : champ obligatoire manquant "${field}"`);
      }
    }

    // Valid team ID
    if (entry.id !== undefined && entry.id !== null) {
      if (!VALID_TEAM_IDS.includes(entry.id)) {
        errors.push(
          `${prefix} : ID equipe inconnu "${entry.id}" (non present dans VALID_TEAM_IDS)`,
        );
      }

      // Duplicate check
      if (seenIds.has(entry.id)) {
        errors.push(`${prefix} : ID equipe en doublon "${entry.id}"`);
      }
      seenIds.add(entry.id);
    }

    // Rank range
    if (typeof entry.rank === 'number') {
      if (!Number.isInteger(entry.rank) || entry.rank < 1 || entry.rank > MAX_RANK) {
        errors.push(
          `${prefix} : rank doit etre un entier entre 1 et ${MAX_RANK}, recu ${entry.rank}`,
        );
      }
    }

    // Points >= 0
    if (typeof entry.points === 'number') {
      if (!Number.isInteger(entry.points) || entry.points < 0) {
        errors.push(
          `${prefix} : points doit etre un entier >= 0, recu ${entry.points}`,
        );
      }
    }

    // Played range
    if (typeof entry.played === 'number') {
      if (
        !Number.isInteger(entry.played) ||
        entry.played < 0 ||
        entry.played > MAX_PLAYED
      ) {
        errors.push(
          `${prefix} : played doit etre un entier entre 0 et ${MAX_PLAYED}, recu ${entry.played}`,
        );
      }
    }
  }

  return errors;
}

/**
 * Validate scores in results: integers >= 0, within plausible range.
 * @param {object[]} results
 * @returns {string[]} Array of error messages
 */
export function validateScores(results) {
  const errors = [];

  if (!Array.isArray(results)) {
    errors.push('results doit etre un tableau');
    return errors;
  }

  for (let i = 0; i < results.length; i++) {
    const entry = results[i];
    const prefix = `results[${i}]`;

    for (const field of ['homeScore', 'awayScore']) {
      const value = entry[field];
      if (value === undefined || value === null) continue; // checked by required fields

      if (typeof value !== 'number' || !Number.isInteger(value)) {
        errors.push(`${prefix} : ${field} doit etre un entier, recu ${value}`);
      } else if (value < 0 || value > MAX_SCORE) {
        errors.push(
          `${prefix} : ${field} doit etre entre 0 et ${MAX_SCORE}, recu ${value}`,
        );
      }
    }
  }

  return errors;
}

/**
 * Check if a string is a valid ISO 8601 date (YYYY-MM-DD or full datetime).
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isValidISODate(dateStr) {
  if (typeof dateStr !== 'string') return false;
  if (!/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  // Round-trip check: re-serialize and compare to catch rolled-over dates
  // e.g. 2026-02-30 silently becomes 2026-03-02
  const isoDate = d.toISOString().slice(0, 10);
  const inputDate = dateStr.slice(0, 10);
  return isoDate === inputDate;
}

/**
 * Check if a date falls within the season range.
 * @param {string} dateStr
 * @returns {boolean}
 */
export function isWithinSeasonRange(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(SEASON_START);
  const end = new Date(SEASON_END);
  return d >= start && d <= end;
}

/**
 * Validate dates in results and calendar.
 * @param {object[]} results
 * @param {object[]} calendar
 * @returns {string[]} Array of error messages
 */
export function validateDates(results, calendar) {
  const errors = [];

  if (Array.isArray(results)) {
    for (let i = 0; i < results.length; i++) {
      const entry = results[i];
      const prefix = `results[${i}]`;
      const dateVal = entry.date;

      if (dateVal === undefined || dateVal === null) continue; // checked by required fields

      if (!isValidISODate(dateVal)) {
        errors.push(
          `${prefix} : date "${dateVal}" n'est pas au format ISO 8601 valide`,
        );
      } else if (!isWithinSeasonRange(dateVal)) {
        errors.push(
          `${prefix} : date "${dateVal}" hors de la plage saison (${SEASON_START} a ${SEASON_END})`,
        );
      }
    }
  }

  if (Array.isArray(calendar)) {
    for (let i = 0; i < calendar.length; i++) {
      const entry = calendar[i];
      const prefix = `calendar[${i}]`;
      const dateVal = entry.date;

      // date is optional in calendar
      if (dateVal === undefined || dateVal === null || dateVal === '') continue;

      if (!isValidISODate(dateVal)) {
        errors.push(
          `${prefix} : date "${dateVal}" n'est pas au format ISO 8601 valide`,
        );
      } else if (!isWithinSeasonRange(dateVal)) {
        errors.push(
          `${prefix} : date "${dateVal}" hors de la plage saison (${SEASON_START} a ${SEASON_END})`,
        );
      }
    }
  }

  return errors;
}

/**
 * Validate required fields for each entity in results and calendar.
 * @param {object[]} results
 * @param {object[]} calendar
 * @returns {string[]} Array of error messages
 */
export function validateRequiredFields(results, calendar) {
  const errors = [];

  if (Array.isArray(results)) {
    for (let i = 0; i < results.length; i++) {
      const entry = results[i];
      const prefix = `results[${i}]`;

      for (const field of REQUIRED_RESULT_FIELDS) {
        if (entry[field] === undefined || entry[field] === null) {
          errors.push(`${prefix} : champ obligatoire manquant "${field}"`);
        }
      }

      // Matchday range
      if (typeof entry.matchday === 'number') {
        if (
          !Number.isInteger(entry.matchday) ||
          entry.matchday < MIN_MATCHDAY ||
          entry.matchday > MAX_MATCHDAY
        ) {
          errors.push(
            `${prefix} : matchday doit etre un entier entre ${MIN_MATCHDAY} et ${MAX_MATCHDAY}, recu ${entry.matchday}`,
          );
        }
      }
    }
  }

  if (Array.isArray(calendar)) {
    for (let i = 0; i < calendar.length; i++) {
      const entry = calendar[i];
      const prefix = `calendar[${i}]`;

      for (const field of REQUIRED_CALENDAR_FIELDS) {
        if (entry[field] === undefined || entry[field] === null) {
          errors.push(`${prefix} : champ obligatoire manquant "${field}"`);
        }
      }

      // Matchday range
      if (typeof entry.matchday === 'number') {
        if (
          !Number.isInteger(entry.matchday) ||
          entry.matchday < MIN_MATCHDAY ||
          entry.matchday > MAX_MATCHDAY
        ) {
          errors.push(
            `${prefix} : matchday doit etre un entier entre ${MIN_MATCHDAY} et ${MAX_MATCHDAY}, recu ${entry.matchday}`,
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Validate team IDs in results and calendar belong to VALID_TEAM_IDS.
 * @param {object[]} results
 * @param {object[]} calendar
 * @returns {string[]} Array of error messages
 */
export function validateTeamIds(results, calendar) {
  const errors = [];

  if (Array.isArray(results)) {
    for (let i = 0; i < results.length; i++) {
      const entry = results[i];
      const prefix = `results[${i}]`;

      for (const field of ['home', 'away']) {
        const id = entry[field];
        if (id !== undefined && id !== null && !VALID_TEAM_IDS.includes(id)) {
          errors.push(
            `${prefix} : ${field} ID equipe inconnu "${id}" (non present dans VALID_TEAM_IDS)`,
          );
        }
      }
    }
  }

  if (Array.isArray(calendar)) {
    for (let i = 0; i < calendar.length; i++) {
      const entry = calendar[i];
      const prefix = `calendar[${i}]`;

      for (const field of ['home', 'away']) {
        const id = entry[field];
        if (id !== undefined && id !== null && !VALID_TEAM_IDS.includes(id)) {
          errors.push(
            `${prefix} : ${field} ID equipe inconnu "${id}" (non present dans VALID_TEAM_IDS)`,
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Run all validations on scraped data and return collected errors.
 * @param {object} data - Parsed scraped JSON data
 * @returns {string[]} Array of all error messages
 */
export function validateAll(data) {
  const errors = [];

  // Top-level fields
  errors.push(...validateTopLevelFields(data));

  // Standings validation
  if (Array.isArray(data.standings)) {
    errors.push(...validateStandings(data.standings));
  }

  // Scores validation
  if (Array.isArray(data.results)) {
    errors.push(...validateScores(data.results));
  }

  // Dates validation
  errors.push(...validateDates(data.results || [], data.calendar || []));

  // Required fields per entity
  errors.push(...validateRequiredFields(data.results || [], data.calendar || []));

  // Team IDs in results and calendar
  errors.push(...validateTeamIds(data.results || [], data.calendar || []));

  return errors;
}

// ─── Main ───────────────────────────────────────────────────────────────────

/**
 * Main entry point: load scraped.json, validate, report.
 */
export async function main() {
  const dataPath = resolve('data/scraped.json');

  let raw;
  try {
    raw = readFileSync(dataPath, 'utf-8');
  } catch (err) {
    console.error(`Impossible de lire ${dataPath} : ${err.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Impossible de parser ${dataPath} : ${err.message}`);
    process.exit(1);
  }

  const errors = validateAll(data);

  if (errors.length > 0) {
    console.error(`\n❌ Validation echouee : ${errors.length} erreur(s) trouvee(s)\n`);
    for (const err of errors) {
      console.error(`  • ${err}`);
    }
    console.error('');
    process.exit(1);
  }

  // Success summary
  const standingsCount = Array.isArray(data.standings)
    ? data.standings.length
    : 0;
  const resultsCount = Array.isArray(data.results) ? data.results.length : 0;
  const calendarCount = Array.isArray(data.calendar) ? data.calendar.length : 0;

  console.log('\n✅ Validation reussie');
  console.log(`  Equipes    : ${standingsCount}`);
  console.log(`  Resultats  : ${resultsCount}`);
  console.log(`  Calendrier : ${calendarCount}`);
  console.log(`  Journee    : ${data.matchday}`);
  console.log(`  Complete   : ${data.complete}`);
  console.log('');
}

// Guard: only run main() when script is executed directly
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
