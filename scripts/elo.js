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

/** Base K-factor — sensitivity to individual match results (legacy default) */
export const K_FACTOR = 30;

/** Home advantage in Elo points (rugby-adapted, higher than football) */
export const HOME_ADVANTAGE = 65;

/** Weight of victory margin in Elo delta */
export const MARGIN_FACTOR = 0.006;

/** Dynamic K-factor by season phase (finale-model.md) */
export const K_SCHEDULE = [
  { from: 1, to: 6, k: 48 },
  { from: 7, to: 13, k: 36 },
  { from: 14, to: 19, k: 28 },
  { from: 20, to: 26, k: 24 },
];

/** Pythagorean expectation exponent for point differential */
export const PYTHAGOREAN_EXP = 2.37;

/** Dominant victory margin threshold (bonus delta *= 1.2) */
export const DOMINANT_MARGIN = 20;

/** Draw probability (fixed, per finale-model.md) */
export const P_DRAW = 0.05;

/** Temporal decay rate per matchday (exponential) */
export const DECAY_RATE = 0.05;

/** Number of Monte Carlo simulations for projections */
export const NUM_SIMULATIONS = 10000;

/** Total matchdays in TOP 14 regular season */
export const TOTAL_MATCHDAYS = 26;

/** Probability of offensive bonus per match (~30% based on TOP 14 historical average) */
export const OFFENSIVE_BONUS_PROB = 0.3;

/** Maximum point margin for defensive bonus eligibility */
export const DEFENSIVE_MARGIN = 5;

/** Matchday threshold below which season is considered "early" */
const EARLY_SEASON_THRESHOLD = 5;

/** Maximum confidence during early season */
const EARLY_SEASON_MAX_CONFIDENCE = 0.3;

// ─── Training-Oriented Functions ──────────────────────────────────────────

/**
 * Get dynamic K-factor based on matchday (finale-model.md §1.1).
 * Falls back to K_FACTOR if no schedule matches.
 *
 * @param {number} matchday - Current matchday (1-26)
 * @param {Array<{from:number,to:number,k:number}>} [schedule=K_SCHEDULE]
 * @returns {number} K value for the matchday
 */
export function getDynamicK(matchday, schedule = K_SCHEDULE) {
  for (const band of schedule) {
    if (matchday >= band.from && matchday <= band.to) return band.k;
  }
  return K_FACTOR;
}

/**
 * Pythagorean expectation — consistency modifier (finale-model.md §1.3).
 * Penalises teams that win more than their point differential suggests.
 *
 * @param {number} avgPointDiff - Average point differential per game
 * @param {number} actualWinRate - Actual win rate (0-1)
 * @param {number} [exp=PYTHAGOREAN_EXP] - Pythagorean exponent
 * @returns {number} consistencyModifier (around 1.0)
 */
export function computeConsistencyModifier(avgPointDiff, actualWinRate, exp = PYTHAGOREAN_EXP) {
  const ptsFor = 500 + avgPointDiff;
  const ptsAgainst = 500 - avgPointDiff;
  if (ptsFor <= 0 || ptsAgainst <= 0) return 1.0;
  const expectedWinRate = ptsFor ** exp / (ptsFor ** exp + ptsAgainst ** exp);
  return 1.0 - (actualWinRate - expectedWinRate) * 0.3;
}

/**
 * Strength of Schedule — average opponent Elo / 1500 (finale-model.md §2.2).
 *
 * @param {string} teamId
 * @param {object[]} calendar - Remaining matches
 * @param {Map<string,number>} elos - Current Elo ratings
 * @returns {number} SoS ratio (>1 = hard schedule, <1 = easy)
 */
export function computeSoS(teamId, calendar, elos) {
  const opponents = calendar
    .filter((m) => m.home === teamId || m.away === teamId)
    .map((m) => (m.home === teamId ? m.away : m.home));
  if (opponents.length === 0) return 1.0;
  const avgElo = opponents.reduce((s, id) => s + (elos.get(id) ?? INITIAL_ELO), 0) / opponents.length;
  return avgElo / 1500;
}

/**
 * Home/away ratio modifier (finale-model.md §2.3).
 *
 * @param {string} teamId
 * @param {object[]} calendar - Remaining matches
 * @returns {number} modifier (1.0 = balanced, >1 = more home games)
 */
export function computeHomeAwayModifier(teamId, calendar) {
  const teamGames = calendar.filter((m) => m.home === teamId || m.away === teamId);
  if (teamGames.length === 0) return 1.0;
  const homeGames = teamGames.filter((m) => m.home === teamId).length;
  const homeRatio = homeGames / teamGames.length;
  return 1.0 + (homeRatio - 0.5) * 0.16;
}

/**
 * Weighted form with bonus rates (finale-model.md §1.2).
 * Returns offensive and defensive bonus probabilities for simulation.
 *
 * @param {string} teamId
 * @param {object[]} results - Match results (with homeBonus/awayBonus if available)
 * @param {number} [window=5] - Number of recent matches to consider
 * @param {number} [decay=0.8] - Temporal decay factor
 * @returns {{ offensiveBonusProb: number, defensiveBonusProb: number, formScore: number }}
 */
export function computeWeightedForm(teamId, results, window = 5, decay = 0.8) {
  const teamResults = results
    .filter((r) => r.home === teamId || r.away === teamId)
    .sort((a, b) => a.matchday - b.matchday)
    .slice(-window);

  if (teamResults.length === 0) {
    return { offensiveBonusProb: OFFENSIVE_BONUS_PROB, defensiveBonusProb: 0.35, formScore: 1.0 };
  }

  let offensiveBonusCount = 0;
  let defensiveBonusCount = 0;
  let weightedBonusSum = 0;
  let weightSum = 0;

  for (let i = 0; i < teamResults.length; i++) {
    const age = teamResults.length - 1 - i;
    const w = decay ** age;
    const r = teamResults[i];
    const isHome = r.home === teamId;

    // Count bonus occurrences
    const bonus = isHome ? r.homeBonus : r.awayBonus;
    if (bonus != null) {
      const bonusVal = typeof bonus === 'number' ? bonus : (bonus ? 1 : 0);
      weightedBonusSum += (bonusVal / 2.0) * w;

      // Offensive bonus detection (homeBonus/awayBonus from scraped data)
      if (bonusVal > 0) offensiveBonusCount++;
    }

    // Defensive bonus: loss by ≤ 15 pts (wider window for form)
    const teamScore = isHome ? r.homeScore : r.awayScore;
    const oppScore = isHome ? r.awayScore : r.homeScore;
    if (teamScore != null && oppScore != null) {
      if (oppScore > teamScore && (oppScore - teamScore) <= 15) {
        defensiveBonusCount++;
      }
    }

    weightSum += w;
  }

  const n = teamResults.length;
  const offensiveFormRate = offensiveBonusCount / n;
  const defensiveFormRate = defensiveBonusCount / n;

  const offensiveBonusProb = 0.30 * (0.5 + offensiveFormRate);
  const defensiveBonusProb = 0.35 * (0.5 + defensiveFormRate);
  const formScore = weightSum > 0 ? 1.0 + (weightedBonusSum / weightSum - 0.25) : 1.0;

  return { offensiveBonusProb, defensiveBonusProb, formScore };
}

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
 * @param {object} [config] - Optional overrides for training
 * @param {number} [config.k] - K-factor override (default: K_FACTOR)
 * @param {number} [config.homeAdvantage] - Home advantage override (default: HOME_ADVANTAGE)
 * @param {number} [config.marginFactor] - Margin factor override (default: MARGIN_FACTOR)
 * @param {number} [config.dominantMargin] - Margin threshold for dominant bonus (default: disabled)
 * @returns {{ homeChange: number, awayChange: number }} Elo deltas
 */
export function calculateEloChange({ homeScore, awayScore, eloHome, eloAway }, config = {}) {
  const k = config.k ?? K_FACTOR;
  const ha = config.homeAdvantage ?? HOME_ADVANTAGE;
  const mf = config.marginFactor ?? MARGIN_FACTOR;

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
  const expectedHome = calculateExpectedScore(eloHome + ha, eloAway);

  // Margin factor: amplifies delta for large victory margins
  const margin = Math.abs(homeScore - awayScore);
  let marginMultiplier = 1 + mf * margin;

  // Dominant victory bonus (finale-model.md §1.1)
  if (config.dominantMargin != null && margin > config.dominantMargin) {
    marginMultiplier *= 1.2;
  }

  const homeChange = k * marginMultiplier * (homeResult - expectedHome);
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
 * NOTE: standings are used only for the team list and currentRank.
 * When the LNR standings page is JS-rendered (empty scrape), the pipeline
 * should provide standings derived from results (team IDs + rank by points).
 * The Elo computation itself depends only on results, not standings data.
 *
 * @param {object[]} standings - Team standings (used for team list)
 * @param {object[]} results - Match results sorted by matchday
 * @returns {{ elos: Map<string, number>, eloHistories: Map<string, number[]> }}
 */
export function computeEloRatings(standings, results) {
  // Initialize all teams — promoted teams get a decoted starting Elo
  const elos = new Map();
  const eloHistories = new Map();

  for (const team of standings) {
    const initialElo = PROMOTED_TEAMS.includes(team.id)
      ? Math.round(INITIAL_ELO * PROMOTED_DECOTE)
      : INITIAL_ELO;
    elos.set(team.id, initialElo);
    eloHistories.set(team.id, [initialElo]);
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
 * @param {object} [config] - Optional overrides for training
 * @param {number} [config.homeAdvantage] - Home advantage Elo points
 * @param {number} [config.pDraw] - Fixed draw probability (replaces dynamic calc)
 * @param {number} [config.offensiveBonusProb] - Offensive bonus probability
 * @param {number} [config.defensiveMargin] - Defensive bonus margin threshold
 * @param {number} [config.k] - K-factor for Elo change
 * @param {number} [config.marginFactor] - Margin factor for Elo change
 * @param {number} [config.dominantMargin] - Dominant victory threshold
 * @returns {{ homePoints: number, awayPoints: number, homeEloChange: number, awayEloChange: number }}
 */
export function simulateMatch(eloHome, eloAway, rng = Math.random, config = {}) {
  const ha = config.homeAdvantage ?? HOME_ADVANTAGE;
  const defMargin = config.defensiveMargin ?? DEFENSIVE_MARGIN;
  const offBonusProb = config.offensiveBonusProb ?? OFFENSIVE_BONUS_PROB;

  const expectedHome = calculateExpectedScore(eloHome + ha, eloAway);

  // Draw probability: fixed (finale-model.md) or dynamic (legacy)
  const drawProb = config.pDraw != null
    ? config.pDraw
    : 0.15 * (1 - Math.abs(expectedHome - 0.5) * 2);
  const homeWinProb = expectedHome * (1 - drawProb);

  const roll = rng();

  let homePoints;
  let awayPoints;
  let homeScore;
  let awayScore;

  if (roll < homeWinProb) {
    const margin = Math.floor(rng() * 30) + 1;
    homeScore = 20 + Math.floor(margin / 2);
    awayScore = 20 - Math.ceil(margin / 2);
    homePoints = 4;
    awayPoints = 0;
  } else if (roll < homeWinProb + drawProb) {
    homePoints = 2;
    awayPoints = 2;
    homeScore = 20;
    awayScore = 20;
  } else {
    const margin = Math.floor(rng() * 30) + 1;
    awayScore = 20 + Math.floor(margin / 2);
    homeScore = 20 - Math.ceil(margin / 2);
    homePoints = 0;
    awayPoints = 4;
  }

  // Defensive bonus: +1 to loser if margin ≤ threshold
  const margin = Math.abs(homeScore - awayScore);
  if (margin > 0 && margin <= defMargin) {
    if (homePoints === 0) homePoints += 1;
    else if (awayPoints === 0) awayPoints += 1;
  }

  // Offensive bonus
  if (rng() < offBonusProb) {
    if (homeScore > awayScore) homePoints += 1;
    else if (awayScore > homeScore) awayPoints += 1;
    else { homePoints += 1; awayPoints += 1; }
  }

  // Calculate Elo change for the simulated result
  const { homeChange, awayChange } = calculateEloChange({
    homeScore,
    awayScore,
    eloHome,
    eloAway,
  }, {
    k: config.k,
    homeAdvantage: ha,
    marginFactor: config.marginFactor,
    dominantMargin: config.dominantMargin,
  });

  return {
    homePoints,
    awayPoints,
    homeEloChange: homeChange,
    awayEloChange: awayChange,
  };
}

/**
 * Compute rugby points from real match results.
 * Uses real BO/BD data when homeBonus/awayBonus are available (scraped),
 * falls back to margin heuristic (BD only, margin ≤ DEFENSIVE_MARGIN) otherwise.
 *
 * @param {object[]} results - Match results with home, away, homeScore, awayScore,
 *   and optionally homeBonus/awayBonus ({ offensive: boolean, defensive: boolean })
 * @returns {Map<string, number>} Team ID → accumulated rugby points
 */
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
      // Fallback: infer defensive bonus from margin only (no offensive bonus).
      // Draws have margin = 0 and no loser — no BD applicable.
      if (r.homeScore > r.awayScore && margin <= DEFENSIVE_MARGIN) {
        points.set(r.away, points.get(r.away) + 1);
      } else if (r.homeScore < r.awayScore && margin <= DEFENSIVE_MARGIN) {
        points.set(r.home, points.get(r.home) + 1);
      }
    }
  }

  return points;
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
  initialPoints = null,
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
      simPoints.set(id, initialPoints?.get(id) ?? 0);
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

// ─── Recalibration ────────────────────────────────────────────────────────

/** Matchdays where recalibration occurs */
export const RECALIBRATION_MATCHDAYS = [13, 26];

/**
 * Generate recalibration correction entries for the current matchday.
 * Recalibrations happen at J13 (mid-season) and J26 (end of season).
 * Only generates entries for the current matchday if it is a recalibration point.
 *
 * NOTE: These are editorial/cosmetic entries for the Oracle journal UI.
 * The model does NOT actually use the recalibrated values — the constants
 * (DECAY_RATE, K_FACTOR) remain unchanged during computation.
 *
 * @param {number} matchday - Current matchday
 * @returns {object[]} Array of recalibration correction entries (0 or 1 entry)
 */
export function generateRecalibrations(matchday) {
  if (!RECALIBRATION_MATCHDAYS.includes(matchday)) return [];

  const now = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  if (matchday === 13) {
    return [{
      matchday: 13,
      date: now,
      title: 'Recalibrage mi-saison',
      description: "L'Oracle ajuste ses coefficients a mi-parcours — la decroissance temporelle s'affine pour mieux suivre la forme recente",
      impact: 'neutral',
      parameter: 'temporalDecay',
      oldValue: DECAY_RATE,
      newValue: roundDecimal(DECAY_RATE * 0.9, 4),
      type: 'recalibration',
    }];
  }

  if (matchday === 26) {
    return [{
      matchday: 26,
      date: now,
      title: 'Recalibrage fin de saison',
      description: "Bilan final — l'Oracle ajuste le facteur K pour la saison prochaine en fonction de la precision observee",
      impact: 'neutral',
      parameter: 'kFactor',
      oldValue: K_FACTOR,
      newValue: K_FACTOR - 2,
      type: 'recalibration',
    }];
  }

  return [];
}

// ─── Head-to-Head & Tiebreaker ────────────────────────────────────────

/**
 * Compute head-to-head records for every pair of teams from match results.
 *
 * @param {object[]} results - Match results with home, away, homeScore, awayScore
 * @returns {Map<string, { wins: number, draws: number, losses: number, pointsFor: number, pointsAgainst: number }>}
 *   Keys are "teamA:teamB" (alphabetically ordered), values contain record from teamA's perspective.
 *   Also stores reverse key "teamB:teamA" for teamB's perspective.
 */
export function computeHeadToHead(results) {
  const h2h = new Map();

  for (const r of results) {
    if (r.homeScore == null || r.awayScore == null) continue;

    const home = r.home;
    const away = r.away;

    // Ensure entries exist for both perspectives
    const keyHA = `${home}:${away}`;
    const keyAH = `${away}:${home}`;

    if (!h2h.has(keyHA)) {
      h2h.set(keyHA, { wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }
    if (!h2h.has(keyAH)) {
      h2h.set(keyAH, { wins: 0, draws: 0, losses: 0, pointsFor: 0, pointsAgainst: 0 });
    }

    const homeRec = h2h.get(keyHA);
    const awayRec = h2h.get(keyAH);

    homeRec.pointsFor += r.homeScore;
    homeRec.pointsAgainst += r.awayScore;
    awayRec.pointsFor += r.awayScore;
    awayRec.pointsAgainst += r.homeScore;

    if (r.homeScore > r.awayScore) {
      homeRec.wins++;
      awayRec.losses++;
    } else if (r.homeScore < r.awayScore) {
      homeRec.losses++;
      awayRec.wins++;
    } else {
      homeRec.draws++;
      awayRec.draws++;
    }
  }

  return h2h;
}

/**
 * Apply head-to-head tiebreaker to teams sharing the same currentRank points.
 * Groups teams with identical standing points, then re-orders within each group
 * by H2H win balance (wins - losses among the tied teams).
 *
 * Mutates `teams` array in place by updating `currentRank` for tied teams.
 * Returns the set of team IDs that were reordered by tiebreaker.
 *
 * @param {object[]} teams - Array of team objects with { id, currentRank } (sorted by currentRank)
 * @param {object[]} standings - Standings from scraped data with { id, points }
 * @param {Map<string, object>} h2hMap - Head-to-head map from computeHeadToHead
 * @returns {Set<string>} Team IDs that were resolved by H2H tiebreaker
 */
export function applyTiebreaker(teams, standings, h2hMap) {
  // Returns Map<teamId, groupIndex> so the frontend can distinguish groups
  const tiebreakerTeams = new Map();
  let groupIndex = 0;

  // Build points lookup from standings
  const pointsById = new Map();
  for (const s of standings) {
    pointsById.set(s.id, s.points);
  }

  // Group teams by points
  const groups = new Map();
  for (const team of teams) {
    const pts = pointsById.get(team.id) ?? 0;
    if (!groups.has(pts)) groups.set(pts, []);
    groups.get(pts).push(team);
  }

  for (const [, group] of groups) {
    if (group.length < 2) continue;

    // Compute H2H balance within the group
    const balances = group.map((team) => {
      let balance = 0;
      for (const other of group) {
        if (other.id === team.id) continue;
        const key = `${team.id}:${other.id}`;
        const rec = h2hMap.get(key);
        if (rec) balance += rec.wins - rec.losses;
      }
      return { team, balance };
    });

    // Sort by H2H balance descending
    balances.sort((a, b) => b.balance - a.balance);

    // Check if any actual reordering happens (not all same balance)
    const allSame = balances.every((b) => b.balance === balances[0].balance);
    if (allSame) continue;

    // Assign ranks: use the lowest rank in the group as base
    const baseRank = Math.min(...group.map((t) => t.currentRank));
    groupIndex++;
    for (let i = 0; i < balances.length; i++) {
      balances[i].team.currentRank = baseRank + i;
      tiebreakerTeams.set(balances[i].team.id, groupIndex);
    }
  }

  return tiebreakerTeams;
}

// ─── Promoted Teams ───────────────────────────────────────────────────

/** Elo decote multiplier for promoted teams */
export const PROMOTED_DECOTE = 0.85;

/** Teams promoted for the 2025-2026 season */
export const PROMOTED_TEAMS = ['vannes'];

/** Number of matchdays during which promoted confidence is capped */
const PROMOTED_CONFIDENCE_MATCHDAYS = 5;

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

  // ── Step 1b: Compute head-to-head records ──
  const h2hMap = computeHeadToHead(results);

  // ── Step 1c: Compute real rugby points from results ──
  const realPoints = computeResultBonuses(results);

  // ── Step 2: Monte Carlo projection ──
  const { rankCounts } = simulateSeason(
    elos,
    calendar,
    NUM_SIMULATIONS,
    Math.random,
    realPoints,
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

    let confidence = calculateConfidence(matchday, TOTAL_MATCHDAYS, neighborGap);

    // Promoted teams: cap confidence during early season
    const isPromoted = PROMOTED_TEAMS.includes(teamId);
    if (isPromoted && matchday <= PROMOTED_CONFIDENCE_MATCHDAYS) {
      confidence = Math.min(confidence, EARLY_SEASON_MAX_CONFIDENCE);
    }

    const form = computeForm(teamId, results);
    const trend = computeTrend(history);

    const entry = {
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

    if (isPromoted) entry.promoted = true;

    return entry;
  });

  // ── Step 3b: Apply H2H tiebreaker ──
  const tiebreakerMap = applyTiebreaker(teams, standings, h2hMap);
  for (const team of teams) {
    const groupId = tiebreakerMap.get(team.id);
    if (groupId != null) {
      team.tiebreaker = `h2h-${groupId}`;
    }
  }

  // ── Step 3c: Build headToHead output ──
  const headToHead = buildHeadToHeadOutput(h2hMap, results);

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

  // ── Step 5: Generate recalibration entries ──
  const corrections = generateRecalibrations(matchday);

  // ── Step 6: Write output ──
  const output = {
    calculatedAt: new Date().toISOString(),
    matchday,
    teams,
    calendar: calendarOutput,
    corrections,
    headToHead,
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

// ─── H2H Output Builder ──────────────────────────────────────────────────

/**
 * Build the headToHead array for the JSON output from the h2h map and results.
 * Each entry represents a pair of teams with their match records.
 *
 * @param {Map<string, object>} h2hMap - Head-to-head map from computeHeadToHead
 * @param {object[]} results - Match results
 * @returns {object[]} Array of { teams, matches, record } objects
 */
export function buildHeadToHeadOutput(h2hMap, results) {
  // Collect unique team pairs (alphabetically ordered)
  const pairsSeen = new Set();
  const output = [];

  for (const key of h2hMap.keys()) {
    const [teamA, teamB] = key.split(':');
    const pairKey = [teamA, teamB].sort().join(':');
    if (pairsSeen.has(pairKey)) continue;
    pairsSeen.add(pairKey);

    const [first, second] = pairKey.split(':');
    const recFirst = h2hMap.get(`${first}:${second}`);
    const recSecond = h2hMap.get(`${second}:${first}`);

    if (!recFirst || !recSecond) continue;

    // Find matches between these two teams
    const matches = results
      .filter(
        (r) =>
          (r.home === first && r.away === second) ||
          (r.home === second && r.away === first),
      )
      .filter((r) => r.homeScore != null && r.awayScore != null)
      .map((r) => ({
        matchday: r.matchday,
        home: r.home,
        away: r.away,
        scoreHome: r.homeScore,
        scoreAway: r.awayScore,
      }));

    output.push({
      teams: [first, second],
      matches,
      record: {
        [first]: { w: recFirst.wins, d: recFirst.draws, l: recFirst.losses },
        [second]: { w: recSecond.wins, d: recSecond.draws, l: recSecond.losses },
      },
    });
  }

  return output;
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
