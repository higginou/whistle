#!/usr/bin/env node

/**
 * scripts/elo.js
 *
 * Calculates Elo ratings for all TOP 14 teams, projects final standings
 * using Monte Carlo simulation, and computes confidence/difficulty metrics.
 *
 * Pipeline position: scrape.js -> validate.js -> **elo.js** -> generate.js
 *
 * Usage: node scripts/elo.js
 *
 * Input:  data/scraped.json (validated by validate.js)
 * Output: data/elo-output.json (consumed by generate.js)
 *
 * Error handling:
 *   - console.error() + process.exit(1) for critical failures
 *   - No generic try/catch — each catch handles a specific case
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// ─── Model Constants ───────────────────────────────────────────────────────

/** Elo starting value for teams without prior history */
export const INITIAL_ELO = 1500;

/** Base K-factor — sensitivity to individual match results */
export const K_FACTOR = 30;

/** Home advantage in Elo points (rugby-adapted, higher than football) */
export const HOME_ADVANTAGE = 65;

/** Weight of victory margin in Elo delta */
export const MARGIN_FACTOR = 0.006;

/** Temporal decay rate per matchday (exponential) */
export const DECAY_RATE = 0.05;

/** Number of Monte Carlo simulations for projections */
export const NUM_SIMULATIONS = 10000;

/** Total matchdays in TOP 14 regular season */
export const TOTAL_MATCHDAYS = 26;

/** Matchday threshold below which season is considered "early" */
const EARLY_SEASON_THRESHOLD = 5;

/** Maximum confidence during early season */
const EARLY_SEASON_MAX_CONFIDENCE = 0.3;

// ─── Elo Calculation Functions ─────────────────────────────────────────────

/**
 * Calculate expected score (win probability) for team A against team B.
 * Standard Elo formula: E(A) = 1 / (1 + 10^((eloB - eloA) / 400))
 *
 * @param {number} eloA - Elo rating of team A
 * @param {number} eloB - Elo rating of team B
 * @returns {number} Expected score (probability) between 0 and 1
 */
export function calculateExpectedScore(eloA, eloB) {
  return 1 / (1 + 10 ** ((eloB - eloA) / 400));
}

/**
 * Calculate Elo change after a match, incorporating margin of victory
 * and home advantage.
 *
 * @param {object} params
 * @param {number} params.homeScore - Points scored by home team
 * @param {number} params.awayScore - Points scored by away team
 * @param {number} params.eloHome - Current Elo of home team
 * @param {number} params.eloAway - Current Elo of away team
 * @returns {{ homeChange: number, awayChange: number }} Elo deltas
 */
export function calculateEloChange({ homeScore, awayScore, eloHome, eloAway }) {
  // Determine result: 1 = home win, 0.5 = draw, 0 = away win
  let homeResult;
  if (homeScore > awayScore) {
    homeResult = 1;
  } else if (homeScore === awayScore) {
    homeResult = 0.5;
  } else {
    homeResult = 0;
  }

  // Apply home advantage to expected score calculation (not to stored Elo)
  const expectedHome = calculateExpectedScore(
    eloHome + HOME_ADVANTAGE,
    eloAway,
  );

  // Margin factor: amplifies delta for large victory margins
  const margin = Math.abs(homeScore - awayScore);
  const marginMultiplier = 1 + MARGIN_FACTOR * margin;

  const homeChange =
    K_FACTOR * marginMultiplier * (homeResult - expectedHome);
  const awayChange = -homeChange;

  return { homeChange, awayChange };
}

/**
 * Apply temporal decay weighting to match results.
 * Recent matches have weight 1, older matches decay exponentially.
 *
 * weight = exp(-DECAY_RATE * (currentMatchday - matchMatchday))
 *
 * @param {object[]} results - Match results with matchday field
 * @param {number} currentMatchday - Current matchday number
 * @returns {object[]} Results with added `weight` field
 */
export function applyDecay(results, currentMatchday) {
  return results.map((result) => {
    const age = currentMatchday - result.matchday;
    const weight = Math.exp(-DECAY_RATE * Math.max(0, age));
    return { ...result, weight };
  });
}

/**
 * Compute Elo ratings for all teams by iterating through match results
 * in chronological order.
 *
 * @param {object[]} standings - Team standings (used for team list)
 * @param {object[]} results - Match results sorted by matchday
 * @returns {{ elos: Map<string, number>, eloHistories: Map<string, number[]> }}
 */
export function computeEloRatings(standings, results) {
  // Initialize all teams at INITIAL_ELO
  const elos = new Map();
  const eloHistories = new Map();

  for (const team of standings) {
    elos.set(team.id, INITIAL_ELO);
    eloHistories.set(team.id, [INITIAL_ELO]);
  }

  // Sort results by matchday for chronological processing
  const sortedResults = [...results].sort((a, b) => a.matchday - b.matchday);

  // Determine current matchday for decay
  const currentMatchday =
    sortedResults.length > 0
      ? sortedResults[sortedResults.length - 1].matchday
      : 0;

  // Apply decay weighting
  const weightedResults = applyDecay(sortedResults, currentMatchday);

  for (const result of weightedResults) {
    const eloHome = elos.get(result.home);
    const eloAway = elos.get(result.away);

    // Skip if team not found in standings (shouldn't happen with validated data)
    if (eloHome === undefined || eloAway === undefined) continue;

    const { homeChange, awayChange } = calculateEloChange({
      homeScore: result.homeScore,
      awayScore: result.awayScore,
      eloHome,
      eloAway,
    });

    // Apply decay-weighted change
    const newHomeElo = eloHome + homeChange * result.weight;
    const newAwayElo = eloAway + awayChange * result.weight;

    elos.set(result.home, Math.round(newHomeElo));
    elos.set(result.away, Math.round(newAwayElo));

    eloHistories.get(result.home).push(Math.round(newHomeElo));
    eloHistories.get(result.away).push(Math.round(newAwayElo));
  }

  return { elos, eloHistories };
}

// ─── Monte Carlo Projection ───────────────────────────────────────────────

/**
 * Simulate a single match outcome based on Elo ratings.
 * Returns points awarded to each team (rugby scoring: 4 for win, 2 for draw, 0 for loss).
 *
 * @param {number} eloHome - Elo of home team
 * @param {number} eloAway - Elo of away team
 * @param {function} [rng=Math.random] - Random number generator (injectable for testing)
 * @returns {{ homePoints: number, awayPoints: number, homeEloChange: number, awayEloChange: number }}
 */
export function simulateMatch(eloHome, eloAway, rng = Math.random) {
  const expectedHome = calculateExpectedScore(
    eloHome + HOME_ADVANTAGE,
    eloAway,
  );

  // Draw probability: higher when teams are close in Elo
  const drawProb = 0.15 * (1 - Math.abs(expectedHome - 0.5) * 2);
  const homeWinProb = expectedHome * (1 - drawProb);

  const roll = rng();

  let homePoints;
  let awayPoints;
  let homeScore;
  let awayScore;

  if (roll < homeWinProb) {
    // Home win
    homePoints = 4;
    awayPoints = 0;
    homeScore = 25;
    awayScore = 15;
  } else if (roll < homeWinProb + drawProb) {
    // Draw
    homePoints = 2;
    awayPoints = 2;
    homeScore = 20;
    awayScore = 20;
  } else {
    // Away win
    homePoints = 0;
    awayPoints = 4;
    homeScore = 15;
    awayScore = 25;
  }

  // Calculate Elo change for the simulated result
  const { homeChange, awayChange } = calculateEloChange({
    homeScore,
    awayScore,
    eloHome,
    eloAway,
  });

  return {
    homePoints,
    awayPoints,
    homeEloChange: homeChange,
    awayEloChange: awayChange,
  };
}

/**
 * Run Monte Carlo simulation of remaining season matches.
 *
 * @param {Map<string, number>} currentElos - Current Elo ratings
 * @param {object[]} calendar - Remaining matches to simulate
 * @param {number} numSimulations - Number of simulation runs
 * @param {function} [rng=Math.random] - Random number generator
 * @returns {{ rankCounts: Map<string, number[]>, pointTotals: Map<string, number[]> }}
 */
export function simulateSeason(
  currentElos,
  calendar,
  numSimulations,
  rng = Math.random,
) {
  const teamIds = [...currentElos.keys()];
  const numTeams = teamIds.length;

  // rankCounts[teamId][rank-1] = number of times team finished at that rank
  const rankCounts = new Map();
  // pointTotals[teamId] = array of total points across simulations
  const pointTotals = new Map();

  for (const id of teamIds) {
    rankCounts.set(id, new Array(numTeams).fill(0));
    pointTotals.set(id, []);
  }

  for (let sim = 0; sim < numSimulations; sim++) {
    // Clone Elos for this simulation
    const simElos = new Map(currentElos);
    const simPoints = new Map();
    for (const id of teamIds) {
      simPoints.set(id, 0);
    }

    // Simulate each remaining match
    for (const match of calendar) {
      const eloHome = simElos.get(match.home);
      const eloAway = simElos.get(match.away);

      if (eloHome === undefined || eloAway === undefined) continue;

      const result = simulateMatch(eloHome, eloAway, rng);

      // Accumulate points
      simPoints.set(match.home, simPoints.get(match.home) + result.homePoints);
      simPoints.set(match.away, simPoints.get(match.away) + result.awayPoints);

      // Update Elos within this simulation
      simElos.set(match.home, eloHome + result.homeEloChange);
      simElos.set(match.away, eloAway + result.awayEloChange);
    }

    // Rank teams by points (descending), break ties by Elo
    const ranked = teamIds
      .map((id) => ({
        id,
        points: simPoints.get(id),
        elo: simElos.get(id),
      }))
      .sort((a, b) => b.points - a.points || b.elo - a.elo);

    // Record rank for each team
    for (let rank = 0; rank < ranked.length; rank++) {
      const counts = rankCounts.get(ranked[rank].id);
      counts[rank]++;
    }

    // Record point total
    for (const id of teamIds) {
      pointTotals.get(id).push(simPoints.get(id));
    }
  }

  return { rankCounts, pointTotals };
}

/**
 * Compute projected rank (median rank across simulations).
 *
 * @param {number[]} rankDistribution - Array of size numTeams, counts per rank
 * @param {number} numSimulations - Total number of simulations
 * @returns {number} Projected rank (1-indexed)
 */
export function computeProjectedRank(rankDistribution, numSimulations) {
  let cumulative = 0;
  const median = numSimulations / 2;

  for (let rank = 0; rank < rankDistribution.length; rank++) {
    cumulative += rankDistribution[rank];
    if (cumulative >= median) {
      return rank + 1; // 1-indexed
    }
  }

  return rankDistribution.length; // Fallback: last rank
}

/**
 * Compute zone probabilities from rank distribution.
 *
 * Zones:
 * - europe: rank 1-2
 * - top6: rank 3-6
 * - mid: rank 7-12
 * - relegation: rank 13-14
 *
 * @param {number[]} rankDistribution - Counts per rank position
 * @param {number} numSimulations - Total simulations
 * @returns {{ europe: number, top6: number, mid: number, relegation: number }}
 */
export function computeZoneProbabilities(rankDistribution, numSimulations) {
  let europe = 0;
  let top6 = 0;
  let mid = 0;
  let relegation = 0;

  for (let rank = 0; rank < rankDistribution.length; rank++) {
    const count = rankDistribution[rank];
    const r = rank + 1; // 1-indexed rank

    if (r <= 2) {
      europe += count;
    } else if (r <= 6) {
      top6 += count;
    } else if (r <= 12) {
      mid += count;
    } else {
      relegation += count;
    }
  }

  return {
    europe: europe / numSimulations,
    top6: top6 / numSimulations,
    mid: mid / numSimulations,
    relegation: relegation / numSimulations,
  };
}

// ─── Confidence & Difficulty ───────────────────────────────────────────────

/**
 * Calculate confidence index for a team's projection.
 * Confidence depends on:
 * - Proportion of season completed (more matches = higher confidence)
 * - Elo separation from nearest rival (bigger gap = higher confidence)
 *
 * @param {number} matchesPlayed - Number of matchdays completed
 * @param {number} totalMatchdays - Total matchdays in season
 * @param {number} eloGap - Absolute Elo difference to nearest rival in projected rank
 * @returns {number} Confidence between 0 and 1
 */
export function calculateConfidence(matchesPlayed, totalMatchdays, eloGap) {
  // Season progress factor (0 to 1)
  const progressFactor = matchesPlayed / totalMatchdays;

  // Elo gap factor: sigmoid-like, saturates around 200 Elo gap
  const gapFactor = 1 - Math.exp(-eloGap / 150);

  // Combined confidence: weighted average
  const rawConfidence = 0.6 * progressFactor + 0.4 * gapFactor;

  // Early season cap
  if (matchesPlayed <= EARLY_SEASON_THRESHOLD) {
    return Math.min(rawConfidence, EARLY_SEASON_MAX_CONFIDENCE);
  }

  return Math.min(Math.max(rawConfidence, 0), 1);
}

/**
 * Calculate difficulty of an upcoming match for a team.
 * Higher difficulty = stronger opponent relative to you.
 *
 * @param {number} teamElo - Elo of the team in question
 * @param {number} opponentElo - Elo of the opponent
 * @param {boolean} isHome - Whether the team plays at home
 * @returns {number} Difficulty between 0 and 1
 */
export function calculateMatchDifficulty(teamElo, opponentElo, isHome) {
  // Effective Elo with home advantage
  const effectiveTeamElo = isHome ? teamElo + HOME_ADVANTAGE : teamElo;
  const effectiveOpponentElo = isHome ? opponentElo : opponentElo + HOME_ADVANTAGE;

  // Difficulty = opponent's expected score (i.e., probability that you lose)
  const difficulty = calculateExpectedScore(
    effectiveOpponentElo,
    effectiveTeamElo,
  );

  return Math.min(Math.max(difficulty, 0), 1);
}

// ─── Form & Trend ──────────────────────────────────────────────────────────

/**
 * Compute form (last 5 results) for a team.
 *
 * @param {string} teamId - Team identifier
 * @param {object[]} results - All match results, sorted by matchday
 * @returns {string[]} Array of "W", "L", "D" (most recent last), max 5
 */
export function computeForm(teamId, results) {
  const teamResults = results
    .filter((r) => r.home === teamId || r.away === teamId)
    .sort((a, b) => a.matchday - b.matchday);

  const form = [];
  for (const result of teamResults) {
    const isHome = result.home === teamId;
    const teamScore = isHome ? result.homeScore : result.awayScore;
    const opponentScore = isHome ? result.awayScore : result.homeScore;

    if (teamScore > opponentScore) {
      form.push('W');
    } else if (teamScore === opponentScore) {
      form.push('D');
    } else {
      form.push('L');
    }
  }

  // Return last 5
  return form.slice(-5);
}

/**
 * Compute trend based on recent Elo movement.
 *
 * @param {number[]} eloHistory - Full Elo history for a team
 * @returns {"up" | "down" | "stable"}
 */
export function computeTrend(eloHistory) {
  if (eloHistory.length < 3) return 'stable';

  // Look at last 3 entries
  const recent = eloHistory.slice(-3);
  const diff = recent[recent.length - 1] - recent[0];

  if (diff > 10) return 'up';
  if (diff < -10) return 'down';
  return 'stable';
}

// ─── Main Pipeline ─────────────────────────────────────────────────────────

/**
 * Main entry point: load scraped data, run Elo calculations, projections,
 * and write elo-output.json.
 */
export async function main() {
  const inputPath = resolve('data/scraped.json');
  const outputPath = resolve('data/elo-output.json');

  // Load input
  let raw;
  try {
    raw = readFileSync(inputPath, 'utf-8');
  } catch (err) {
    console.error(`Impossible de lire ${inputPath} : ${err.message}`);
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`Impossible de parser ${inputPath} : ${err.message}`);
    process.exit(1);
  }

  const { standings, results, calendar, matchday } = data;

  // ── Step 1: Compute Elo ratings ──
  const { elos, eloHistories } = computeEloRatings(standings, results);

  // ── Step 2: Monte Carlo projection ──
  const { rankCounts } = simulateSeason(
    elos,
    calendar,
    NUM_SIMULATIONS,
  );

  // ── Step 3: Build team output ──
  // Sort teams by Elo for neighbor gap calculation
  const sortedByElo = [...elos.entries()]
    .map(([id, elo]) => ({ id, elo }))
    .sort((a, b) => b.elo - a.elo);

  const teams = standings.map((standing) => {
    const teamId = standing.id;
    const elo = elos.get(teamId) ?? INITIAL_ELO;
    const history = eloHistories.get(teamId) ?? [INITIAL_ELO];
    const distribution = rankCounts.get(teamId) ?? new Array(standings.length).fill(0);
    const projectedRank = computeProjectedRank(distribution, NUM_SIMULATIONS);
    const zones = computeZoneProbabilities(distribution, NUM_SIMULATIONS);

    // Find Elo gap to nearest neighbor in projected rank
    const teamIndex = sortedByElo.findIndex((t) => t.id === teamId);
    const neighborGap = computeNeighborGap(sortedByElo, teamIndex);

    const confidence = calculateConfidence(matchday, TOTAL_MATCHDAYS, neighborGap);
    const form = computeForm(teamId, results);
    const trend = computeTrend(history);

    return {
      id: teamId,
      currentRank: standing.rank,
      elo,
      projectedRank,
      confidence: roundDecimal(confidence, 2),
      zones: {
        europe: roundDecimal(zones.europe, 4),
        top6: roundDecimal(zones.top6, 4),
        mid: roundDecimal(zones.mid, 4),
        relegation: roundDecimal(zones.relegation, 4),
      },
      form,
      trend,
      eloHistory: history,
    };
  });

  // ── Step 4: Calendar with difficulty ──
  const calendarOutput = calendar.map((match) => {
    const homeElo = elos.get(match.home) ?? INITIAL_ELO;
    const awayElo = elos.get(match.away) ?? INITIAL_ELO;
    // Difficulty from the perspective of a neutral viewer (home team's opponent strength)
    const difficulty = calculateMatchDifficulty(homeElo, awayElo, true);

    return {
      matchday: match.matchday,
      date: match.date,
      home: match.home,
      away: match.away,
      difficulty: roundDecimal(difficulty, 2),
    };
  });

  // ── Step 5: Write output ──
  const output = {
    calculatedAt: new Date().toISOString(),
    matchday,
    teams,
    calendar: calendarOutput,
  };

  try {
    writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Impossible d'ecrire ${outputPath} : ${err.message}`);
    process.exit(1);
  }

  // Success summary
  const eloValues = teams.map((t) => t.elo);
  const minElo = Math.min(...eloValues);
  const maxElo = Math.max(...eloValues);

  console.log('\n✅ Calcul Elo termine');
  console.log(`  Equipes        : ${teams.length}`);
  console.log(`  Journee        : ${matchday}`);
  console.log(`  Plage Elo      : ${minElo} - ${maxElo}`);
  console.log(`  Simulations    : ${NUM_SIMULATIONS}`);
  console.log(`  Sortie         : ${outputPath}`);
  console.log('');
}

// ─── Helpers ───────────────────────────────────────────────────────────────

/**
 * Compute the Elo gap to the nearest neighbor in ranking.
 * @param {Array<{id: string, elo: number}>} sortedTeams - Teams sorted by Elo desc
 * @param {number} index - Index of the team in the sorted array
 * @returns {number} Minimum absolute Elo gap to adjacent teams
 */
export function computeNeighborGap(sortedTeams, index) {
  if (sortedTeams.length <= 1) return 0;

  let minGap = Number.POSITIVE_INFINITY;

  if (index > 0) {
    minGap = Math.min(minGap, Math.abs(sortedTeams[index].elo - sortedTeams[index - 1].elo));
  }
  if (index < sortedTeams.length - 1) {
    minGap = Math.min(minGap, Math.abs(sortedTeams[index].elo - sortedTeams[index + 1].elo));
  }

  return minGap === Number.POSITIVE_INFINITY ? 0 : minGap;
}

/**
 * Round a decimal to a given number of places.
 * @param {number} value
 * @param {number} places
 * @returns {number}
 */
export function roundDecimal(value, places) {
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

// Guard: only run main() when script is executed directly
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
