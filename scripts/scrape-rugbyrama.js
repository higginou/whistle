/**
 * scripts/scrape-rugbyrama.js
 *
 * Rugbyrama scraper — primary source for the Whistle pipeline.
 * Scrapes the entire TOP 14 season (results + upcoming matches) from
 * a single Rugbyrama calendar page (server-rendered idalgo widgets).
 *
 * Called by scrape.js orchestrator.
 *
 * Source: https://www.rugbyrama.fr/resultats/rugby/top-14/calendrier
 */

import * as cheerio from 'cheerio';
import { resolveIdalgoSlug, VALID_TEAM_IDS } from './team-mapping.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const CALENDAR_URL =
  'https://www.rugbyrama.fr/resultats/rugby/top-14/calendrier';

const MATCHES_PER_MATCHDAY = 7;

const USER_AGENT =
  'Mozilla/5.0 (compatible; Whistle-Pipeline/1.0; +https://github.com)';

// ─── HTTP Fetch ──────────────────────────────────────────────────────────────

/**
 * Fetch a URL and return its text content.
 * @param {string} url
 * @returns {Promise<string>}
 */
async function fetchPage(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': USER_AGENT },
  });

  if (!response.ok) {
    throw new Error(
      `HTTP ${response.status} fetching ${url}: ${response.statusText}`,
    );
  }

  return response.text();
}

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Extract team slug from a Rugbyrama team URL.
 * URL pattern: /resultats/rugby/equipe/{id}/{slug}
 *
 * @param {string} href
 * @returns {string|null}
 */
function extractTeamSlug(href) {
  if (!href) return null;
  const m = href.match(/\/resultats\/rugby\/equipe\/\d+\/([^/"]+)/);
  return m ? m[1] : null;
}

/**
 * Parse ISO date from idalgo data-value-default attribute.
 * Input: "Sat Sep 06 2025 21:05:00 +0200"
 * Output: "2025-09-06"
 *
 * @param {string} dateStr
 * @returns {string} ISO date (YYYY-MM-DD) or empty string
 */
export function parseIdalgoDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

/**
 * Parse the Rugbyrama calendar page HTML.
 * Extracts all matches (played + upcoming) for the entire season.
 *
 * Each match is a <li> with data attributes:
 *   data-localteam, data-visitorteam, data-state (1=played, 0=upcoming), data-round
 *
 * @param {string} html - Raw HTML of the calendar page
 * @returns {{ matchday: number, results: Array, calendar: Array, complete: boolean }}
 */
export function parseRugbyramaCalendar(html) {
  const $ = cheerio.load(html);

  const results = [];
  const calendar = [];

  // Track rounds to determine current matchday
  const roundMatches = new Map(); // round → { played: number, total: number }

  $('li.li_idalgo_content_calendar_cup_date_match').each((_i, el) => {
    const $el = $(el);
    const state = parseInt($el.attr('data-state') || '0', 10);
    const round = $el.attr('data-round') || '0';

    // Track round statistics
    if (!roundMatches.has(round)) {
      roundMatches.set(round, { played: 0, total: 0 });
    }
    const roundStats = roundMatches.get(round);
    roundStats.total++;
    if (state === 1) roundStats.played++;

    // Extract date from the hour span
    const dateSpan = $el.find('span.idalgo_date_timezone').first();
    const rawDate = dateSpan.attr('data-value-default') || '';
    const date = parseIdalgoDate(rawDate);

    // Extract home team
    const homeLink = $el.find(
      'a.a_idalgo_content_calendar_cup_date_match_local',
    ).first();
    const homeSlug = extractTeamSlug(homeLink.attr('href'));
    const homeId = resolveIdalgoSlug(homeSlug);

    // Extract away team
    const awayLink = $el.find(
      'a.a_idalgo_content_calendar_cup_date_match_visitor',
    ).first();
    const awaySlug = extractTeamSlug(awayLink.attr('href'));
    const awayId = resolveIdalgoSlug(awaySlug);

    if (!homeId || !awayId) {
      console.warn(
        `Could not resolve teams: home=${homeSlug} away=${awaySlug}`,
      );
      return;
    }

    if (state === 1) {
      // Played match — extract score
      const scoreLeft = $el.find('span.span_idalgo_score_part_left').first();
      const scoreRight = $el.find('span.span_idalgo_score_part_right').first();

      const homeScore = parseInt(scoreLeft.text().trim(), 10);
      const awayScore = parseInt(scoreRight.text().trim(), 10);

      if (Number.isNaN(homeScore) || Number.isNaN(awayScore)) {
        console.warn(`Could not parse score for ${homeId} vs ${awayId}`);
        return;
      }

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
    } else {
      // Upcoming match
      calendar.push({
        matchday: 0, // filled below
        round,
        date,
        home: homeId,
        away: awayId,
      });
    }
  });

  if (results.length === 0 && calendar.length === 0) {
    throw new Error(
      'No matches found on Rugbyrama calendar — page structure may have changed',
    );
  }

  // Assign matchday numbers from round order
  const roundIds = [...roundMatches.keys()].sort(
    (a, b) => parseInt(a, 10) - parseInt(b, 10),
  );
  const roundToMatchday = new Map();
  for (let i = 0; i < roundIds.length; i++) {
    roundToMatchday.set(roundIds[i], i + 1);
  }

  for (const entry of results) {
    entry.matchday = roundToMatchday.get(entry.round);
    delete entry.round;
  }
  for (const entry of calendar) {
    entry.matchday = roundToMatchday.get(entry.round);
    delete entry.round;
  }

  // Current matchday = last round with at least 1 played match
  let currentMatchday = 1;
  for (const [round, stats] of roundMatches) {
    if (stats.played > 0) {
      const md = roundToMatchday.get(round);
      if (md > currentMatchday) currentMatchday = md;
    }
  }

  // Complete = all matches in current matchday are played
  const currentRound = roundIds[currentMatchday - 1];
  const currentStats = roundMatches.get(currentRound);
  const complete =
    currentStats && currentStats.played >= MATCHES_PER_MATCHDAY;

  return { matchday: currentMatchday, results, calendar, complete };
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Scrape Rugbyrama and return structured data (does NOT write to disk).
 * @returns {Promise<object>} Scraped data object
 */
export async function scrapeRugbyrama() {
  console.log('Whistle — Scraping Rugbyrama TOP 14 data...');

  const html = await fetchPage(CALENDAR_URL);
  const matchData = parseRugbyramaCalendar(html);

  // Validate team IDs
  const unknownTeams = new Set();
  for (const match of [...matchData.results, ...matchData.calendar]) {
    if (!VALID_TEAM_IDS.includes(match.home)) unknownTeams.add(match.home);
    if (!VALID_TEAM_IDS.includes(match.away)) unknownTeams.add(match.away);
  }
  if (unknownTeams.size > 0) {
    console.warn(
      `Unknown team IDs found: ${[...unknownTeams].join(', ')}. ` +
        'Team mapping may need updating.',
    );
  }

  return {
    scrapedAt: new Date().toISOString(),
    source: 'rugbyrama',
    matchday: matchData.matchday,
    complete: matchData.complete,
    standings: [], // computed by elo.js from results
    results: matchData.results,
    calendar: matchData.calendar,
  };
}
