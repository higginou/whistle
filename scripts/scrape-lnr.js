/**
 * scripts/scrape-lnr.js
 *
 * LNR scraper — legacy local archive, outside the Vercel runtime.
 * Scrapes TOP 14 results, standings, and calendar from top14.lnr.fr.
 *
 * Called by scrape.js orchestrator when Rugbyrama (primary) fails.
 *
 * Sources:
 *   - Results & Calendar: https://top14.lnr.fr/calendrier-et-resultats
 *   - Standings: https://top14.lnr.fr/classement
 */

import { resolve } from 'node:path';
import * as cheerio from 'cheerio';
import { resolveTeamId, VALID_TEAM_IDS } from './team-mapping.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = 'https://top14.lnr.fr';
const RESULTS_URL = `${BASE_URL}/calendrier-et-resultats`;
const STANDINGS_URL = `${BASE_URL}/classement`;
const EXPECTED_TEAMS = 14;
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

// ─── Results & Calendar Parsing ──────────────────────────────────────────────

/**
 * Parse results and calendar from the LNR calendar-et-resultats page.
 *
 * The page shows the current/latest matchday with match cards.
 * Each match card contains: home team, away team, score (if played),
 * date, and a link to the match sheet.
 *
 * @param {string} html - Raw HTML of the page
 * @returns {{ matchday: number, results: Array, calendar: Array, complete: boolean }}
 */
export function parseResultsAndCalendar(html) {
  const $ = cheerio.load(html);

  const results = [];
  const calendar = [];
  let matchday = 0;
  let matchdayDetected = false;

  // Strategy 1: Extract matchday from page heading or match sheet URLs
  // Match sheet URLs follow pattern: /feuille-de-match/2025-2026/j{N}/...
  const matchSheetPattern = /\/feuille-de-match\/\d{4}-\d{4}\/j(\d+)\//;

  // Find all links that point to match sheets
  $('a[href*="feuille-de-match"]').each((_i, el) => {
    const href = $(el).attr('href') || '';
    const m = href.match(matchSheetPattern);
    if (m && !matchdayDetected) {
      matchday = parseInt(m[1], 10);
      matchdayDetected = true;
    }
  });

  // Strategy 2: Look for "Journée N" text in page
  if (!matchdayDetected) {
    const journeeMatch = $.text().match(/journ[ée]e\s+(\d+)/i);
    if (journeeMatch) {
      matchday = parseInt(journeeMatch[1], 10);
      matchdayDetected = true;
    }
  }

  // Parse match cards
  // The page renders matches with team names as links to club pages
  // and scores between them. We look for structural patterns.
  parseMatchCards($, matchday, results, calendar);

  // If no match cards found via structural parsing, try text-based extraction
  if (results.length === 0 && calendar.length === 0) {
    parseMatchesFromText($.text(), matchday, results, calendar);
  }

  const totalMatches = results.length + calendar.length;
  const complete = results.length >= MATCHES_PER_MATCHDAY;

  if (totalMatches === 0) {
    throw new Error(
      'No matches found on the results page — page structure may have changed',
    );
  }

  return { matchday, results, calendar, complete };
}

/**
 * Parse match cards from DOM structure.
 * Looks for common patterns in LNR match rendering.
 *
 * @param {cheerio.CheerioAPI} $
 * @param {number} matchday
 * @param {Array} results
 * @param {Array} calendar
 */
function parseMatchCards($, matchday, results, calendar) {
  // Strategy: Find match sheet links, then extract surrounding context
  // Each match typically has two club links and possibly a score
  const matchLinks = $('a[href*="feuille-de-match"]');

  if (matchLinks.length === 0) return;

  // Group by match sheet URL (each match has a unique URL)
  const matchUrls = new Set();
  matchLinks.each((_i, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('feuille-de-match')) {
      matchUrls.add(href.split('?')[0].replace(/\/$/, ''));
    }
  });

  for (const matchUrl of matchUrls) {
    // Extract team slugs from URL: /feuille-de-match/2025-2026/j20/11444-paris-clermont
    const urlMatch = matchUrl.match(
      /\/feuille-de-match\/\d{4}-\d{4}\/j(\d+)\/\d+-(.+)/,
    );
    if (!urlMatch) continue;

    const slugPart = urlMatch[2]; // e.g. "paris-clermont"

    // Find the match container — the link and its surrounding elements
    const matchLink = $(`a[href*="${matchUrl}"]`).first();
    const container = matchLink.closest(
      'div, article, section, li, [class*="match"], [class*="game"]',
    );

    // Try to extract team names from club links in the container
    const clubLinks = container.find('a[href*="/club/"]');
    let homeTeam = null;
    let awayTeam = null;

    if (clubLinks.length >= 2) {
      homeTeam = resolveTeamId(clubLinks.eq(0).text().trim());
      awayTeam = resolveTeamId(clubLinks.eq(1).text().trim());
    }

    // Fallback: try to resolve from URL slug
    if (!homeTeam || !awayTeam) {
      const resolved = resolveTeamsFromSlug(slugPart);
      if (resolved) {
        homeTeam = homeTeam || resolved.home;
        awayTeam = awayTeam || resolved.away;
      }
    }

    if (!homeTeam || !awayTeam) {
      console.warn(
        `Could not resolve teams for match: ${matchUrl} (slug: ${slugPart})`,
      );
      continue;
    }

    // Try to extract score from the container text
    const containerText = container.text();
    const scoreMatch = containerText.match(/(\d{1,3})\s*[-–]\s*(\d{1,3})/);

    // Extract date from container or page context
    // Strategy 1: semantic date elements in the match container
    const dateEl = container
      .find('time, [datetime], [class*="date"]')
      .first();
    let matchDate = dateEl.attr('datetime') || '';

    // Strategy 2: data- attributes on the container or its parents
    if (!matchDate) {
      const dataDate = container.attr('data-date')
        || container.closest('[data-date]').attr('data-date')
        || container.attr('data-datetime')
        || container.closest('[data-datetime]').attr('data-datetime')
        || '';
      if (dataDate) matchDate = dataDate;
    }

    // Strategy 3: parse French date text from the container
    if (!matchDate) {
      matchDate = parseFrenchDate(containerText) || '';
    }

    // Strategy 4: look for date in the nearest preceding sibling or parent heading
    if (!matchDate) {
      const parent = container.parent();
      const prevSiblings = container.prevAll().toArray();
      for (const sib of prevSiblings) {
        const parsed = parseFrenchDate($(sib).text());
        if (parsed) { matchDate = parsed; break; }
      }
      if (!matchDate) {
        const parentText = parent.closest('[class*="day"], [class*="round"], [class*="journee"]').text();
        if (parentText) matchDate = parseFrenchDate(parentText) || '';
      }
    }

    if (scoreMatch) {
      const homeScore = parseInt(scoreMatch[1], 10);
      const awayScore = parseInt(scoreMatch[2], 10);

      results.push({
        matchday,
        date: matchDate,
        home: homeTeam,
        away: awayTeam,
        homeScore,
        awayScore,
        homeBonus: null,
        awayBonus: null,
      });
    } else {
      // No score = upcoming match
      calendar.push({
        matchday,
        date: matchDate,
        home: homeTeam,
        away: awayTeam,
      });
    }
  }
}

/**
 * Fallback: parse matches from raw page text when DOM structure fails.
 *
 * @param {string} text - Full page text
 * @param {number} matchday
 * @param {Array} results
 * @param {Array} calendar
 */
function parseMatchesFromText(text, matchday, results, calendar) {
  // Pattern: "Team A  score1 - score2  Team B"
  // or: "Team A  vs  Team B" (upcoming)
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try to match a result line with scores
    const resultMatch = line.match(
      /^(.+?)\s+(\d{1,3})\s*[-–]\s*(\d{1,3})\s+(.+?)$/,
    );
    if (resultMatch) {
      const homeTeam = resolveTeamId(resultMatch[1]);
      const awayTeam = resolveTeamId(resultMatch[4]);
      if (homeTeam && awayTeam) {
        results.push({
          matchday,
          date: findNearestDate(lines, i),
          home: homeTeam,
          away: awayTeam,
          homeScore: parseInt(resultMatch[2], 10),
          awayScore: parseInt(resultMatch[3], 10),
          homeBonus: null,
          awayBonus: null,
        });
      }
    }
  }
}

/**
 * Try to find a date string near a given line index.
 *
 * @param {string[]} lines
 * @param {number} index
 * @returns {string}
 */
function findNearestDate(lines, index) {
  // Look backwards for a date-like string
  for (let i = index; i >= Math.max(0, index - 10); i--) {
    const parsed = parseFrenchDate(lines[i]);
    if (parsed) return parsed;
  }
  return '';
}

/**
 * Parse a French date string to ISO 8601 date format.
 * Handles: "samedi 28 mars", "28 mars 2026", "28/03/2026", etc.
 *
 * @param {string} text
 * @returns {string|null} ISO date (YYYY-MM-DD) or null
 */
export function parseFrenchDate(text) {
  if (!text) return null;

  const FRENCH_MONTHS = {
    janvier: '01',
    fevrier: '02',
    mars: '03',
    avril: '04',
    mai: '05',
    juin: '06',
    juillet: '07',
    aout: '08',
    septembre: '09',
    octobre: '10',
    novembre: '11',
    decembre: '12',
    // With accents (normalized away by the regex below)
    février: '02',
    août: '08',
    décembre: '12',
  };

  // Remove diacritics for matching
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  // Pattern: "28 mars 2026" or "samedi 28 mars 2026" or "28 mars"
  const frenchMatch = normalized.match(
    /(\d{1,2})\s+(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)(?:\s+(\d{4}))?/,
  );
  if (frenchMatch) {
    const day = frenchMatch[1].padStart(2, '0');
    const month = FRENCH_MONTHS[frenchMatch[2]];
    const year = frenchMatch[3] || getCurrentSeasonYear(month);
    return `${year}-${month}-${day}`;
  }

  // Pattern: "28/03/2026"
  const slashMatch = normalized.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2]}-${slashMatch[1]}`;
  }

  return null;
}

/**
 * Determine the year for a month in the current TOP 14 season.
 * Season runs roughly September to June.
 *
 * @param {string} month - Two-digit month string (01-12)
 * @returns {string} Four-digit year
 */
function getCurrentSeasonYear(month) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12
  const monthNum = parseInt(month, 10);

  // Months 08-12 belong to the first year of the season
  // Months 01-07 belong to the second year of the season
  if (monthNum >= 8) {
    // If we're currently in Jan-Jul, an Aug-Dec date refers to last year
    return currentMonth <= 7
      ? String(currentYear - 1)
      : String(currentYear);
  }
  return String(currentYear);
}

/**
 * Try to resolve home and away team IDs from a match URL slug.
 * Slug format: "paris-clermont", "bordeaux-begles-toulon"
 *
 * @param {string} slug
 * @returns {{ home: string, away: string } | null}
 */
export function resolveTeamsFromSlug(slug) {
  if (!slug) return null;

  // Known slug patterns for teams that have hyphens in their names
  const SLUG_TEAMS = [
    'bordeaux-begles',
    'la-rochelle',
    'stade-francais',
    'racing-92',
  ];

  // Try each known hyphenated team as prefix or suffix
  for (const team of SLUG_TEAMS) {
    if (slug.startsWith(team + '-')) {
      const remainder = slug.slice(team.length + 1);
      const away = resolveTeamId(remainder);
      if (away) return { home: team, away };
    }
    if (slug.endsWith('-' + team)) {
      const remainder = slug.slice(0, slug.length - team.length - 1);
      const home = resolveTeamId(remainder);
      if (home) return { home, away: team };
    }
  }

  // Simple split: try splitting at each hyphen position
  const parts = slug.split('-');
  for (let i = 1; i < parts.length; i++) {
    const homePart = parts.slice(0, i).join('-');
    const awayPart = parts.slice(i).join('-');
    const home = resolveTeamId(homePart);
    const away = resolveTeamId(awayPart);
    if (home && away) return { home, away };
  }

  return null;
}

// ─── Standings Parsing ───────────────────────────────────────────────────────

/**
 * Parse standings from the LNR classement page.
 *
 * NOTE: As of 2026-03, the LNR standings page renders the table via
 * client-side JavaScript, so the static HTML may not contain the data.
 * This parser attempts extraction but returns an empty array if the
 * table is not server-rendered.
 *
 * @param {string} html - Raw HTML of the standings page
 * @returns {Array} Parsed standings or empty array
 */
export function parseStandings(html) {
  const $ = cheerio.load(html);
  const standings = [];

  // Strategy 1: Look for a table with team data
  $('table tr, tbody tr').each((_i, row) => {
    const cells = $(row).find('td');
    if (cells.length < 4) return; // Skip header or invalid rows

    const teamCell = cells.eq(1); // Usually rank is first, team is second
    const teamName = teamCell.text().trim();
    const teamId = resolveTeamId(teamName);

    if (!teamId) return;

    // Try to extract numerical values from remaining cells
    const values = [];
    cells.each((j, cell) => {
      if (j > 1) {
        const val = parseInt($(cell).text().trim(), 10);
        if (!isNaN(val)) values.push(val);
      }
    });

    if (values.length >= 5) {
      standings.push({
        id: teamId,
        rank: _i + 1,
        points: values[0] || 0,
        played: values[1] || 0,
        won: values[2] || 0,
        drawn: values[3] || 0,
        lost: values[4] || 0,
        bonusOffensive: values[5] || 0,
        bonusDefensive: values[6] || 0,
        pointsFor: values[7] || 0,
        pointsAgainst: values[8] || 0,
      });
    }
  });

  // Strategy 2: Look for structured divs with team rankings
  if (standings.length === 0) {
    $('[class*="classement"], [class*="ranking"], [class*="standing"]').each(
      (_i, el) => {
        const text = $(el).text().trim();
        const teamId = resolveTeamId(text);
        if (teamId && !standings.find((s) => s.id === teamId)) {
          standings.push({
            id: teamId,
            rank: standings.length + 1,
            points: 0,
            played: 0,
            won: 0,
            drawn: 0,
            lost: 0,
            bonusOffensive: 0,
            bonusDefensive: 0,
            pointsFor: 0,
            pointsAgainst: 0,
          });
        }
      },
    );
  }

  return standings;
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Scrape LNR and return structured data (does NOT write to disk).
 * @returns {Promise<object>} Scraped data object
 */
export async function scrapeLnr() {
  console.log('Whistle — Scraping LNR TOP 14 data...');

  const resultsHtml = await fetchPage(RESULTS_URL);
  const matchData = parseResultsAndCalendar(resultsHtml);

  // Standings — best-effort (may be empty if JS-rendered)
  let standings = [];
  try {
    const standingsHtml = await fetchPage(STANDINGS_URL);
    standings = parseStandings(standingsHtml);
  } catch (err) {
    console.warn(`Could not fetch standings: ${err.message}`);
  }

  if (standings.length === 0) {
    console.warn('Standings table not found (likely JS-rendered).');
  } else if (standings.length !== EXPECTED_TEAMS) {
    console.warn(
      `Expected ${EXPECTED_TEAMS} teams in standings, found ${standings.length}`,
    );
  }

  return {
    scrapedAt: new Date().toISOString(),
    source: 'lnr',
    matchday: matchData.matchday,
    complete: matchData.complete,
    standings,
    results: matchData.results,
    calendar: matchData.calendar,
  };
}
