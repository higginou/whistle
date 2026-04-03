#!/usr/bin/env node

/**
 * scripts/train.js
 *
 * Grid search over Elo model hyperparameters using historical season data.
 * Replays a completed season matchday by matchday, simulates from each
 * matchday forward, and compares projected final standings to reality.
 *
 * Usage: node scripts/train.js [--season 2024] [--sims 1000] [--verbose]
 *
 * Input:  data/{season}-{season+1}.scraped.json (from scrape-api.js)
 * Output: Console — best params, Brier score, position error, Top6/relegation accuracy
 *
 * Grid: kMax × kMin × homeAdvantage × pDraw × marginFactor = 324 combos × 1000 sims
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  INITIAL_ELO,
  calculateExpectedScore,
  calculateEloChange,
  simulateMatch,
  getDynamicK,
  computeSoS,
  computeHomeAwayModifier,
  computeWeightedForm,
  computeConsistencyModifier,
  roundDecimal,
} from './elo.js';

// ─── Grid Search Parameter Space ─────────────────────────────────────────

const GRID = {
  kMax: [40, 44, 48, 52],
  kMin: [20, 24, 28],
  homeAdvantage: [40, 50, 60],
  pDraw: [0.03, 0.05, 0.07],
  marginFactor: [0.004, 0.006, 0.008],
};

// ─── Seeded RNG (Mulberry32) ─────────────────────────────────────────────

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Build K schedule from kMax/kMin ─────────────────────────────────────

function buildKSchedule(kMax, kMin) {
  // Linear interpolation across 4 phases
  const range = kMax - kMin;
  return [
    { from: 1, to: 6, k: kMax },
    { from: 7, to: 13, k: Math.round(kMax - range * 0.33) },
    { from: 14, to: 19, k: Math.round(kMax - range * 0.67) },
    { from: 20, to: 26, k: kMin },
  ];
}

// ─── Replay Season ───────────────────────────────────────────────────────

/**
 * Replay a season matchday by matchday with given params.
 * At each matchday, compute Elo from all played results, then simulate
 * the remaining matches forward to get projected final standings.
 *
 * Returns per-matchday Brier scores and final position errors.
 */
function replaySeason(data, params, numSims, seed) {
  const { standings, results } = data;
  const teamIds = standings.map((s) => s.id);

  // Real final standings (truth)
  const realRank = new Map();
  for (const s of standings) realRank.set(s.id, s.rank);

  // Real final points
  const realPoints = new Map();
  for (const s of standings) realPoints.set(s.id, s.points);

  // Real top 6 and relegated teams
  const realTop6 = new Set(standings.filter((s) => s.rank <= 6).map((s) => s.id));
  const realRelegated = new Set(standings.filter((s) => s.rank >= 13).map((s) => s.id));

  // Sort results by matchday
  const sortedResults = [...results].sort((a, b) => a.matchday - b.matchday);

  // Group results by matchday
  const resultsByMatchday = new Map();
  for (const r of sortedResults) {
    if (!resultsByMatchday.has(r.matchday)) resultsByMatchday.set(r.matchday, []);
    resultsByMatchday.get(r.matchday).push(r);
  }

  const maxMatchday = Math.max(...sortedResults.map((r) => r.matchday));
  const kSchedule = buildKSchedule(params.kMax, params.kMin);

  // We evaluate at specific checkpoints (every 4 matchdays + final)
  const checkpoints = [4, 8, 13, 17, 21, 26];
  const brierScores = [];
  const positionErrors = [];
  let top6Correct = 0;
  let relegationCorrect = 0;

  for (const checkpoint of checkpoints) {
    if (checkpoint > maxMatchday) continue;

    // Results up to this checkpoint
    const playedResults = sortedResults.filter((r) => r.matchday <= checkpoint);
    // Remaining results (used as "calendar" for simulation)
    const remainingResults = sortedResults
      .filter((r) => r.matchday > checkpoint)
      .map((r) => ({ matchday: r.matchday, date: r.date, home: r.home, away: r.away }));

    // Compute Elo ratings from played results
    const elos = new Map();
    for (const id of teamIds) elos.set(id, INITIAL_ELO);

    for (const r of playedResults) {
      const eloHome = elos.get(r.home);
      const eloAway = elos.get(r.away);
      if (eloHome === undefined || eloAway === undefined) continue;

      const k = getDynamicK(r.matchday, kSchedule);
      const { homeChange, awayChange } = calculateEloChange(
        { homeScore: r.homeScore, awayScore: r.awayScore, eloHome, eloAway },
        { k, homeAdvantage: params.homeAdvantage, marginFactor: params.marginFactor, dominantMargin: 20 },
      );

      elos.set(r.home, eloHome + homeChange);
      elos.set(r.away, eloAway + awayChange);
    }

    // Compute real points accumulated so far
    const currentPoints = new Map();
    for (const id of teamIds) currentPoints.set(id, 0);
    for (const r of playedResults) {
      if (r.homeScore > r.awayScore) {
        currentPoints.set(r.home, currentPoints.get(r.home) + 4);
        // Defensive bonus
        if (r.homeScore - r.awayScore <= 5) {
          currentPoints.set(r.away, currentPoints.get(r.away) + 1);
        }
      } else if (r.homeScore < r.awayScore) {
        currentPoints.set(r.away, currentPoints.get(r.away) + 4);
        if (r.awayScore - r.homeScore <= 5) {
          currentPoints.set(r.home, currentPoints.get(r.home) + 1);
        }
      } else {
        currentPoints.set(r.home, currentPoints.get(r.home) + 2);
        currentPoints.set(r.away, currentPoints.get(r.away) + 2);
      }
    }

    // Monte Carlo simulation from this checkpoint
    const rng = mulberry32(seed + checkpoint);

    // Pre-compute advanced factors per team
    const teamSoS = new Map();
    const teamHAMod = new Map();
    const teamForm = new Map();
    const teamConsistency = new Map();

    for (const id of teamIds) {
      teamSoS.set(id, computeSoS(id, remainingResults, elos));
      teamHAMod.set(id, computeHomeAwayModifier(id, remainingResults));
      teamForm.set(id, computeWeightedForm(id, playedResults));

      // Consistency modifier from point differential
      const teamGames = playedResults.filter((r) => r.home === id || r.away === id);
      if (teamGames.length > 0) {
        const totalFor = teamGames.reduce((s, r) => s + (r.home === id ? r.homeScore : r.awayScore), 0);
        const totalAgainst = teamGames.reduce((s, r) => s + (r.home === id ? r.awayScore : r.homeScore), 0);
        const avgDiff = (totalFor - totalAgainst) / teamGames.length;
        const wins = teamGames.filter((r) =>
          (r.home === id && r.homeScore > r.awayScore) || (r.away === id && r.awayScore > r.homeScore)
        ).length;
        teamConsistency.set(id, computeConsistencyModifier(avgDiff, wins / teamGames.length));
      } else {
        teamConsistency.set(id, 1.0);
      }
    }

    // Accumulate projected rank probabilities
    const rankCounts = new Map();
    for (const id of teamIds) rankCounts.set(id, new Array(teamIds.length).fill(0));

    for (let sim = 0; sim < numSims; sim++) {
      const simElos = new Map(elos);
      const simPoints = new Map(currentPoints);

      for (const match of remainingResults) {
        const eloH = simElos.get(match.home);
        const eloA = simElos.get(match.away);
        if (eloH === undefined || eloA === undefined) continue;

        // Apply advanced modifiers to effective Elos
        const homeForm = teamForm.get(match.home);
        const awayForm = teamForm.get(match.away);
        const formRatio = (homeForm?.formScore ?? 1.0) / (awayForm?.formScore ?? 1.0);
        const consistencyRatio = (teamConsistency.get(match.home) ?? 1.0) / (teamConsistency.get(match.away) ?? 1.0);
        const haMod = teamHAMod.get(match.home) ?? 1.0;

        // SoS modifier: favorable schedule boosts win probability
        const sosHome = teamSoS.get(match.home) ?? 1.0;
        const sosAway = teamSoS.get(match.away) ?? 1.0;
        const sosMod = (1.0 / sosAway) * sosHome * 0.15 + 0.85;

        // Combine modifiers into effective Elo adjustment
        const combinedMod = formRatio * consistencyRatio * haMod * sosMod;
        const eloBoost = Math.log(Math.max(combinedMod, 0.1)) * 200; // convert multiplier to Elo points
        const effectiveEloH = eloH + eloBoost;

        const simConfig = {
          homeAdvantage: params.homeAdvantage,
          pDraw: params.pDraw,
          marginFactor: params.marginFactor,
          dominantMargin: 20,
          offensiveBonusProb: homeForm?.offensiveBonusProb,
        };

        const result = simulateMatch(effectiveEloH, eloA, rng, simConfig);
        simPoints.set(match.home, simPoints.get(match.home) + result.homePoints);
        simPoints.set(match.away, simPoints.get(match.away) + result.awayPoints);
        simElos.set(match.home, eloH + result.homeEloChange);
        simElos.set(match.away, eloA + result.awayEloChange);
      }

      // Rank by points, break ties by Elo
      const ranked = teamIds
        .map((id) => ({ id, points: simPoints.get(id), elo: simElos.get(id) }))
        .sort((a, b) => b.points - a.points || b.elo - a.elo);

      for (let rank = 0; rank < ranked.length; rank++) {
        rankCounts.get(ranked[rank].id)[rank]++;
      }
    }

    // Compute Brier score: for each team, P(top6) vs actual top6 membership
    let brierSum = 0;
    let brierCount = 0;
    for (const id of teamIds) {
      const counts = rankCounts.get(id);
      // P(top6) = sum of rank 1-6 counts / numSims
      const pTop6 = counts.slice(0, 6).reduce((a, b) => a + b, 0) / numSims;
      const actual = realTop6.has(id) ? 1 : 0;
      brierSum += (pTop6 - actual) ** 2;
      brierCount++;
    }
    brierScores.push(brierSum / brierCount);

    // Position error: projected rank (median) vs real rank
    if (checkpoint === maxMatchday) {
      // Only measure position error at the final checkpoint
      for (const id of teamIds) {
        const counts = rankCounts.get(id);
        // Median rank
        let cumulative = 0;
        let projectedRank = teamIds.length;
        for (let r = 0; r < counts.length; r++) {
          cumulative += counts[r];
          if (cumulative >= numSims / 2) {
            projectedRank = r + 1;
            break;
          }
        }
        positionErrors.push(Math.abs(projectedRank - realRank.get(id)));

        // Top 6 accuracy (at final checkpoint)
        if (projectedRank <= 6 && realTop6.has(id)) top6Correct++;
        // Relegation accuracy
        if (projectedRank >= 13 && realRelegated.has(id)) relegationCorrect++;
      }
    }
  }

  const avgBrier = brierScores.reduce((a, b) => a + b, 0) / brierScores.length;
  const avgPosError = positionErrors.length > 0
    ? positionErrors.reduce((a, b) => a + b, 0) / positionErrors.length
    : 0;

  return {
    brier: avgBrier,
    posError: avgPosError,
    top6Accuracy: top6Correct / 6,
    relegationAccuracy: relegationCorrect / 2,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────

function loadSeasonData(season) {
  const seasonLabel = `${season}-${season + 1}`;
  const dataPath = resolve(import.meta.dirname, '..', 'data', `${seasonLabel}.scraped.json`);

  let raw;
  try {
    raw = readFileSync(dataPath, 'utf-8');
  } catch {
    console.error(`Data file not found: ${dataPath}`);
    console.error('Run scrape-api.js first: node scripts/scrape-api.js ' + season);
    process.exit(1);
  }

  return { data: JSON.parse(raw), seasonLabel };
}

function runValidation(seasons, params, numSims, seed) {
  console.log(`\nValidating trained params on ${seasons.length} season(s) (${numSims} sims, seed=${seed})\n`);
  console.log(`  Params: kMax=${params.kMax}  kMin=${params.kMin}  homeAdv=${params.homeAdvantage}  pDraw=${params.pDraw}  marginF=${params.marginFactor}\n`);

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  VALIDATION RESULTS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const allMetrics = [];

  for (const season of seasons) {
    const { data, seasonLabel } = loadSeasonData(season);

    if (!data.complete) {
      console.warn(`  Warning: ${seasonLabel} is not complete (matchday ${data.matchday})`);
    }

    const metrics = replaySeason(data, params, numSims, seed);
    allMetrics.push({ seasonLabel, metrics });

    console.log(`  ${seasonLabel}:`);
    console.log(`    Brier: ${roundDecimal(metrics.brier, 4)}  PosErr: ${roundDecimal(metrics.posError, 2)}  Top6: ${roundDecimal(metrics.top6Accuracy * 100, 0)}%  Releg: ${roundDecimal(metrics.relegationAccuracy * 100, 0)}%`);
    console.log('');
  }

  if (allMetrics.length > 1) {
    const avgBrier = allMetrics.reduce((s, m) => s + m.metrics.brier, 0) / allMetrics.length;
    const avgPos = allMetrics.reduce((s, m) => s + m.metrics.posError, 0) / allMetrics.length;
    const avgTop6 = allMetrics.reduce((s, m) => s + m.metrics.top6Accuracy, 0) / allMetrics.length;
    const avgReleg = allMetrics.reduce((s, m) => s + m.metrics.relegationAccuracy, 0) / allMetrics.length;
    console.log('  ─────────────────────────────────────────────────────');
    console.log(`  AVERAGE:`);
    console.log(`    Brier: ${roundDecimal(avgBrier, 4)}  PosErr: ${roundDecimal(avgPos, 2)}  Top6: ${roundDecimal(avgTop6 * 100, 0)}%  Releg: ${roundDecimal(avgReleg * 100, 0)}%`);
    console.log('');
  }
}

function runGridSearch(season, numSims, seed, verbose) {
  const { data, seasonLabel } = loadSeasonData(season);

  if (!data.complete) {
    console.warn(`Warning: season ${seasonLabel} is not complete (matchday ${data.matchday})`);
  }

  console.log(`\nTraining Elo model on ${seasonLabel} (${numSims} sims/combo, seed=${seed})\n`);

  // Generate all parameter combinations
  const combos = [];
  for (const kMax of GRID.kMax) {
    for (const kMin of GRID.kMin) {
      if (kMin >= kMax) continue; // kMin must be < kMax
      for (const homeAdvantage of GRID.homeAdvantage) {
        for (const pDraw of GRID.pDraw) {
          for (const marginFactor of GRID.marginFactor) {
            combos.push({ kMax, kMin, homeAdvantage, pDraw, marginFactor });
          }
        }
      }
    }
  }

  console.log(`Grid: ${combos.length} combinations\n`);

  let best = null;
  let bestScore = Infinity;
  const results = [];

  const startTime = Date.now();

  for (let i = 0; i < combos.length; i++) {
    const params = combos[i];
    const metrics = replaySeason(data, params, numSims, seed);

    // Composite score: weighted combination (lower is better)
    // Brier score is primary, position error secondary
    const score = metrics.brier * 0.6 + metrics.posError * 0.04;

    results.push({ params, metrics, score });

    if (score < bestScore) {
      bestScore = score;
      best = { params, metrics, score };
    }

    if (verbose && (i + 1) % 50 === 0) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  [${i + 1}/${combos.length}] ${elapsed}s — best Brier: ${roundDecimal(best.metrics.brier, 4)}`);
    }
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  // Sort by composite score
  results.sort((a, b) => a.score - b.score);

  // Display top 5
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  TOP 5 PARAMETER SETS');
  console.log('═══════════════════════════════════════════════════════════\n');

  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i];
    const p = r.params;
    const m = r.metrics;
    console.log(`  #${i + 1} (score: ${roundDecimal(r.score, 4)})`);
    console.log(`    kMax=${p.kMax}  kMin=${p.kMin}  homeAdv=${p.homeAdvantage}  pDraw=${p.pDraw}  marginF=${p.marginFactor}`);
    console.log(`    Brier: ${roundDecimal(m.brier, 4)}  PosErr: ${roundDecimal(m.posError, 2)}  Top6: ${roundDecimal(m.top6Accuracy * 100, 0)}%  Releg: ${roundDecimal(m.relegationAccuracy * 100, 0)}%`);
    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  BEST PARAMETERS');
  console.log('═══════════════════════════════════════════════════════════\n');

  const b = best.params;
  const m = best.metrics;
  console.log(`  kMax             : ${b.kMax}`);
  console.log(`  kMin             : ${b.kMin}`);
  console.log(`  homeAdvantage    : ${b.homeAdvantage}`);
  console.log(`  pDraw            : ${b.pDraw}`);
  console.log(`  marginFactor     : ${b.marginFactor}`);
  console.log('');
  console.log(`  Brier Score      : ${roundDecimal(m.brier, 4)}`);
  console.log(`  Avg Pos Error    : ${roundDecimal(m.posError, 2)}`);
  console.log(`  Top 6 Accuracy   : ${roundDecimal(m.top6Accuracy * 100, 0)}%`);
  console.log(`  Relegation Acc   : ${roundDecimal(m.relegationAccuracy * 100, 0)}%`);
  console.log('');
  console.log(`  Combinations     : ${combos.length}`);
  console.log(`  Sims/combo       : ${numSims}`);
  console.log(`  Total time       : ${totalTime}s`);
  console.log('');
}

function main() {
  const args = process.argv.slice(2);
  const flagIndex = (flag) => args.indexOf(flag);

  const simsArg = flagIndex('--sims') >= 0 ? args[flagIndex('--sims') + 1] : '1000';
  const numSims = parseInt(simsArg, 10);
  const verbose = args.includes('--verbose');
  const seed = 42;

  if (args.includes('--validate')) {
    // Validation mode: evaluate fixed params on one or more seasons
    const seasonArgs = [];
    let idx = flagIndex('--season');
    while (idx >= 0) {
      seasonArgs.push(parseInt(args[idx + 1], 10));
      idx = args.indexOf('--season', idx + 1);
    }
    if (seasonArgs.length === 0) seasonArgs.push(2022, 2023); // default: validate on all available

    const params = {
      kMax: flagIndex('--kMax') >= 0 ? parseInt(args[flagIndex('--kMax') + 1], 10) : 44,
      kMin: flagIndex('--kMin') >= 0 ? parseInt(args[flagIndex('--kMin') + 1], 10) : 28,
      homeAdvantage: flagIndex('--homeAdv') >= 0 ? parseInt(args[flagIndex('--homeAdv') + 1], 10) : 60,
      pDraw: flagIndex('--pDraw') >= 0 ? parseFloat(args[flagIndex('--pDraw') + 1]) : 0.03,
      marginFactor: flagIndex('--marginF') >= 0 ? parseFloat(args[flagIndex('--marginF') + 1]) : 0.006,
    };

    runValidation(seasonArgs, params, numSims, seed);
  } else {
    // Grid search mode (default)
    const seasonArg = flagIndex('--season') >= 0 ? args[flagIndex('--season') + 1] : '2024';
    runGridSearch(parseInt(seasonArg, 10), numSims, seed, verbose);
  }
}

if (
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1])
) {
  main();
}
