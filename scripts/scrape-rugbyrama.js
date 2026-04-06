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
import { resolveIdalgoSlug, resolveTeamId, VALID_TEAM_IDS } from './team-mapping.js';

// ─── Constants ───────────────────────────────────────────────────────────────

const CALENDAR_URL =
  'https://www.rugbyrama.fr/resultats/rugby/top-14/calendrier';

const STANDINGS_URL =
  'https://www.rugbyrama.fr/resultats/rugby/top-14/classements';

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

  // Check if data-round is reliable (distinct rounds ≈ number of matchdays)
  const distinctRounds = roundMatches.size;
  const allMatches = [...results, ...calendar];
  const expectedMatchdays = Math.ceil(allMatches.length / MATCHES_PER_MATCHDAY);
  const roundsReliable = distinctRounds >= expectedMatchdays * 0.5;

  if (roundsReliable) {
    // Original logic: assign matchday from round order
    const roundIds = [...roundMatches.keys()].sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10),
    );
    const roundToMatchday = new Map();
    for (let i = 0; i < roundIds.length; i++) {
      roundToMatchday.set(roundIds[i], i + 1);
    }
    for (const entry of allMatches) {
      entry.matchday = roundToMatchday.get(entry.round);
    }
  } else {
    // Fallback: derive matchdays from dates.
    // Sort all matches by date, then assign matchdays in groups of MATCHES_PER_MATCHDAY.
    // This handles deferred matches correctly by treating every 7 matches as one matchday.
    const sorted = [...allMatches].sort((a, b) => a.date.localeCompare(b.date));
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].matchday = Math.floor(i / MATCHES_PER_MATCHDAY) + 1;
    }
  }

  // Clean up round from entries
  for (const entry of allMatches) {
    delete entry.round;
  }

  // Current matchday = last matchday with at least 1 played match
  let currentMatchday = 1;
  for (const r of results) {
    if (r.matchday > currentMatchday) currentMatchday = r.matchday;
  }

  // Complete = all matches in current matchday are played
  const currentMdMatches = allMatches.filter((m) => m.matchday === currentMatchday);
  const currentMdPlayed = results.filter((r) => r.matchday === currentMatchday).length;
  const complete = currentMdPlayed >= MATCHES_PER_MATCHDAY;

  return { matchday: currentMatchday, results, calendar, complete };
}

/**
 * Parse an individual Rugbyrama match page to extract bonus indicators and try counts.
 *
 * HTML structure (idalgo widget, server-rendered):
 *
 * Two `.div_idalgo_content_rugby_match_header_full_main_header_bonus` blocks appear in
 * document order — first for the home team, second for the away team. Inside each:
 *   - `span.span_idalgo_content_rugby_match_header_full_main_header_bonus_content_defense`
 *     → BD (bonus défensif). Active when style="display:block;", inactive when "display:none;".
 *   - `span.span_idalgo_content_rugby_match_header_full_main_header_bonus_content_try`
 *     → BO (bonus offensif, ≥4 tries). Same display logic.
 *
 * Try counts are in `.div_idalgo_dom_event_match_center_team_list_count > span`
 * with text like "7 Essais". First occurrence = home, second = away.
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

    const bonusBlocks = $(
      '.div_idalgo_content_rugby_match_header_full_main_header_bonus',
    );

    if (bonusBlocks.length < 2) {
      return null;
    }

    const isActive = (style) =>
      style.replace(/\s/g, '').toLowerCase().includes('display:block');

    const parseBonus = (block) => {
      const $block = $(block);
      const bdStyle = $block
        .find(
          '.span_idalgo_content_rugby_match_header_full_main_header_bonus_content_defense',
        )
        .attr('style') || '';
      const boStyle = $block
        .find(
          '.span_idalgo_content_rugby_match_header_full_main_header_bonus_content_try',
        )
        .attr('style') || '';

      return {
        defensive: isActive(bdStyle),
        offensive: isActive(boStyle),
      };
    };

    const homeBonus = parseBonus(bonusBlocks[0]);
    const awayBonus = parseBonus(bonusBlocks[1]);

    const tryCounts = $('.div_idalgo_dom_event_match_center_team_list_count');

    if (tryCounts.length < 2) {
      return null;
    }

    const parseTries = (el) => {
      const text = $(el).find('span').first().text().trim();
      const m = text.match(/^(\d+)/);
      return m ? parseInt(m[1], 10) : NaN;
    };

    const homeTries = parseTries(tryCounts[0]);
    const awayTries = parseTries(tryCounts[1]);

    if (Number.isNaN(homeTries) || Number.isNaN(awayTries)) {
      return null;
    }

    return { homeBonus, awayBonus, homeTries, awayTries };
  } catch (err) {
    console.warn(`parseMatchPage failed: ${err.message}`);
    return null;
  }
}

// ─── Bonus Enrichment ────────────────────────────────────────────────────────

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

// ─── Standings Parsing ──────────────────────────────────────────────────────

/**
 * Parse the Rugbyrama standings page (idalgo widget).
 * Extracts the first (general) standings table — the page also contains
 * home-only, away-only, and recent-form tables that we skip.
 *
 * Each team is a `<li class="li_idalgo_content_standing_team_{id}">` with
 * child spans for points, played, wins, draws, losses, BO, BD, etc.
 *
 * @param {string} html - Raw HTML of the standings page
 * @returns {Array<object>} Parsed standings (14 teams, general classification only)
 */
export function parseRugbyramaStandings(html) {
  const $ = cheerio.load(html);
  const standings = [];
  const seen = new Set();

  $('li[class*="li_idalgo_content_standing_team_"]').each((_i, el) => {
    const $el = $(el);

    // Extract team slug from the link href (/resultats/rugby/equipe/{id}/{slug})
    const href = $el.find('.a_idalgo_content_standing_name').attr('href') || '';
    const slugMatch = href.match(/\/resultats\/rugby\/equipe\/\d+\/([^/"]+)/);
    const slug = slugMatch ? slugMatch[1] : null;

    // Try idalgo slug first, fall back to display name
    let teamId = resolveIdalgoSlug(slug);
    if (!teamId) {
      const name = $el.find('.a_idalgo_content_standing_name').text().trim();
      teamId = resolveTeamId(name);
    }
    if (!teamId) return;

    // Only take the first occurrence of each team (general classification)
    if (seen.has(teamId)) return;
    seen.add(teamId);

    const int = (sel) => parseInt($el.find(sel).text().trim(), 10) || 0;

    standings.push({
      id: teamId,
      rank: standings.length + 1,
      points: int('.span_idalgo_content_standing_points'),
      played: int('.span_idalgo_content_standing_played'),
      won: int('.span_idalgo_content_standing_win'),
      drawn: int('.span_idalgo_content_standing_draw'),
      lost: int('.span_idalgo_content_standing_lost'),
      bonusOffensive: int('.span_idalgo_content_standing_bo'),
      bonusDefensive: int('.span_idalgo_content_standing_bd'),
      pointsFor: int('.span_idalgo_content_standing_for'),
      pointsAgainst: int('.span_idalgo_content_standing_against'),
    });
  });

  return standings;
}

// ─── Main ────────────────────────────────────────────────────────────────────

/**
 * Scrape Rugbyrama and return structured data (does NOT write to disk).
 * @returns {Promise<object>} Scraped data object
 */
export async function scrapeRugbyrama() {
  console.log('Whistle — Scraping Rugbyrama TOP 14 data...');

  const [calendarHtml, standingsHtml] = await Promise.all([
    fetchPage(CALENDAR_URL),
    fetchPage(STANDINGS_URL),
  ]);

  const matchData = parseRugbyramaCalendar(calendarHtml);
  const standings = parseRugbyramaStandings(standingsHtml);

  if (standings.length > 0) {
    console.log(`Standings: ${standings.length} teams parsed (leader: ${standings[0].id} with ${standings[0].points} pts)`);
  } else {
    console.warn('Could not parse standings from Rugbyrama — page structure may have changed');
  }

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
    standings,
    results: matchData.results,
    calendar: matchData.calendar,
  };
}
