import { describe, it, expect } from 'vitest';
import {
  INITIAL_ELO,
  K_FACTOR,
  HOME_ADVANTAGE,
  TOTAL_MATCHDAYS,
  calculateExpectedScore,
  calculateEloChange,
  applyDecay,
  computeEloRatings,
  simulateMatch,
  simulateSeason,
  computeProjectedRank,
  computeZoneProbabilities,
  calculateConfidence,
  calculateMatchDifficulty,
  computeForm,
  computeTrend,
  computeNeighborGap,
  roundDecimal,
} from '../scripts/elo.js';

// ─── Fixtures ──────────────────────────────────────────────────────────────

function makeStandings(count = 14) {
  const ids = [
    'toulouse', 'bordeaux-begles', 'la-rochelle', 'toulon',
    'racing-92', 'clermont', 'castres', 'lyon',
    'montpellier', 'pau', 'montauban', 'bayonne',
    'stade-francais', 'vannes',
  ];
  return ids.slice(0, count).map((id, i) => ({
    id,
    rank: i + 1,
    points: 0,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
  }));
}

function makeResult(overrides = {}) {
  return {
    matchday: 1,
    date: '2025-09-06',
    home: 'toulouse',
    away: 'la-rochelle',
    homeScore: 24,
    awayScore: 18,
    ...overrides,
  };
}

// ─── calculateExpectedScore ────────────────────────────────────────────────

describe('calculateExpectedScore', () => {
  it('returns 0.5 when both teams have equal Elo', () => {
    expect(calculateExpectedScore(1500, 1500)).toBeCloseTo(0.5, 5);
  });

  it('returns value between 0 and 1', () => {
    const result = calculateExpectedScore(1600, 1400);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1);
  });

  it('higher Elo yields higher expected score', () => {
    const strong = calculateExpectedScore(1600, 1400);
    const weak = calculateExpectedScore(1400, 1600);
    expect(strong).toBeGreaterThan(0.5);
    expect(weak).toBeLessThan(0.5);
  });

  it('is symmetric: E(A) + E(B) = 1', () => {
    const eA = calculateExpectedScore(1550, 1450);
    const eB = calculateExpectedScore(1450, 1550);
    expect(eA + eB).toBeCloseTo(1, 5);
  });

  it('large Elo difference gives extreme probability', () => {
    const result = calculateExpectedScore(1800, 1200);
    expect(result).toBeGreaterThan(0.95);
  });
});

// ─── calculateEloChange ────────────────────────────────────────────────────

describe('calculateEloChange', () => {
  it('home win produces positive homeChange', () => {
    const { homeChange } = calculateEloChange({
      homeScore: 30, awayScore: 15, eloHome: 1500, eloAway: 1500,
    });
    expect(homeChange).toBeGreaterThan(0);
  });

  it('away win produces negative homeChange', () => {
    const { homeChange } = calculateEloChange({
      homeScore: 10, awayScore: 25, eloHome: 1500, eloAway: 1500,
    });
    expect(homeChange).toBeLessThan(0);
  });

  it('draw with equal Elo and home advantage gives slight negative for home', () => {
    // Home team is expected to win due to HOME_ADVANTAGE, so a draw is a slight loss
    const { homeChange } = calculateEloChange({
      homeScore: 20, awayScore: 20, eloHome: 1500, eloAway: 1500,
    });
    expect(homeChange).toBeLessThan(0);
  });

  it('homeChange and awayChange are opposite', () => {
    const { homeChange, awayChange } = calculateEloChange({
      homeScore: 24, awayScore: 18, eloHome: 1500, eloAway: 1500,
    });
    expect(homeChange + awayChange).toBeCloseTo(0, 5);
  });

  it('larger margin produces larger absolute change', () => {
    const narrow = calculateEloChange({
      homeScore: 21, awayScore: 20, eloHome: 1500, eloAway: 1500,
    });
    const wide = calculateEloChange({
      homeScore: 50, awayScore: 10, eloHome: 1500, eloAway: 1500,
    });
    expect(Math.abs(wide.homeChange)).toBeGreaterThan(Math.abs(narrow.homeChange));
  });
});

// ─── applyDecay ────────────────────────────────────────────────────────────

describe('applyDecay', () => {
  it('current matchday result has weight 1', () => {
    const results = [makeResult({ matchday: 10 })];
    const weighted = applyDecay(results, 10);
    expect(weighted[0].weight).toBeCloseTo(1, 5);
  });

  it('older matchday has lower weight', () => {
    const results = [
      makeResult({ matchday: 5 }),
      makeResult({ matchday: 10 }),
    ];
    const weighted = applyDecay(results, 10);
    expect(weighted[0].weight).toBeLessThan(weighted[1].weight);
  });

  it('weight decreases exponentially with age', () => {
    const results = [
      makeResult({ matchday: 1 }),
      makeResult({ matchday: 5 }),
      makeResult({ matchday: 10 }),
    ];
    const weighted = applyDecay(results, 10);

    // Older should have lower weight
    expect(weighted[0].weight).toBeLessThan(weighted[1].weight);
    expect(weighted[1].weight).toBeLessThan(weighted[2].weight);

    // All weights between 0 and 1
    for (const r of weighted) {
      expect(r.weight).toBeGreaterThan(0);
      expect(r.weight).toBeLessThanOrEqual(1);
    }
  });

  it('preserves original result fields', () => {
    const results = [makeResult({ matchday: 5 })];
    const weighted = applyDecay(results, 10);
    expect(weighted[0].home).toBe('toulouse');
    expect(weighted[0].homeScore).toBe(24);
  });
});

// ─── computeEloRatings ────────────────────────────────────────────────────

describe('computeEloRatings', () => {
  it('initializes all teams at INITIAL_ELO with no results', () => {
    const standings = makeStandings(14);
    const { elos } = computeEloRatings(standings, []);
    expect(elos.size).toBe(14);
    for (const elo of elos.values()) {
      expect(elo).toBe(INITIAL_ELO);
    }
  });

  it('returns 14 teams when given 14 standings', () => {
    const standings = makeStandings(14);
    const results = [makeResult()];
    const { elos } = computeEloRatings(standings, results);
    expect(elos.size).toBe(14);
  });

  it('Elo sum is approximately constant (zero-sum changes)', () => {
    const standings = makeStandings(14);
    const results = [
      makeResult({ matchday: 1, home: 'toulouse', away: 'la-rochelle', homeScore: 30, awayScore: 20 }),
      makeResult({ matchday: 2, home: 'bordeaux-begles', away: 'toulon', homeScore: 25, awayScore: 15 }),
    ];

    const { elos } = computeEloRatings(standings, results);
    const totalElo = [...elos.values()].reduce((sum, e) => sum + e, 0);
    // Should be close to 14 * INITIAL_ELO (rounding may cause slight drift)
    expect(totalElo).toBeCloseTo(14 * INITIAL_ELO, -1);
  });

  it('builds eloHistory for each team', () => {
    const standings = makeStandings(14);
    const results = [
      makeResult({ matchday: 1, home: 'toulouse', away: 'la-rochelle', homeScore: 30, awayScore: 20 }),
    ];

    const { eloHistories } = computeEloRatings(standings, results);
    // Teams that played: 2 entries (initial + after match)
    expect(eloHistories.get('toulouse').length).toBe(2);
    expect(eloHistories.get('la-rochelle').length).toBe(2);
    // Teams that didn't play: 1 entry (initial only)
    expect(eloHistories.get('bordeaux-begles').length).toBe(1);
  });
});

// ─── simulateMatch ─────────────────────────────────────────────────────────

describe('simulateMatch', () => {
  it('returns valid point values for home win', () => {
    // Force home win with low random value
    const result = simulateMatch(1500, 1500, () => 0.01);
    expect(result.homePoints).toBe(4);
    expect(result.awayPoints).toBe(0);
  });

  it('returns valid point values for away win', () => {
    // Force away win with high random value
    const result = simulateMatch(1500, 1500, () => 0.99);
    expect(result.homePoints).toBe(0);
    expect(result.awayPoints).toBe(4);
  });

  it('returns draw for middle random value', () => {
    // Expected home with 65 advantage is ~0.59, drawProb ~0.15*(1-0.18) ≈ 0.123
    // homeWinProb ≈ 0.59 * (1 - 0.123) ≈ 0.517
    // Draw range: 0.517 to 0.517 + 0.123 ≈ 0.640
    const result = simulateMatch(1500, 1500, () => 0.55);
    expect(result.homePoints).toBe(2);
    expect(result.awayPoints).toBe(2);
  });

  it('produces Elo changes that sum to approximately zero', () => {
    const result = simulateMatch(1500, 1500, () => 0.3);
    expect(result.homeEloChange + result.awayEloChange).toBeCloseTo(0, 5);
  });

  it('distribution is reasonable over many simulations', () => {
    let homeWins = 0;
    let draws = 0;
    let awayWins = 0;
    const n = 10000;

    // Use a seeded-like approach with deterministic sequence
    let seed = 0;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    for (let i = 0; i < n; i++) {
      const result = simulateMatch(1500, 1500, rng);
      if (result.homePoints === 4) homeWins++;
      else if (result.homePoints === 2) draws++;
      else awayWins++;
    }

    // With home advantage, home should win more often
    expect(homeWins / n).toBeGreaterThan(0.3);
    expect(homeWins / n).toBeLessThan(0.8);
    expect(draws / n).toBeGreaterThan(0.01);
    expect(draws / n).toBeLessThan(0.3);
    expect(awayWins / n).toBeGreaterThan(0.1);
    expect(homeWins + draws + awayWins).toBe(n);
  });
});

// ─── simulateSeason (zone probabilities) ───────────────────────────────────

describe('simulateSeason', () => {
  it('zone probabilities sum to 1 for each team', () => {
    const elos = new Map();
    const standings = makeStandings(14);
    for (const s of standings) {
      elos.set(s.id, INITIAL_ELO + (s.rank - 7) * -20);
    }

    const calendar = [
      { matchday: 21, home: 'toulouse', away: 'la-rochelle' },
      { matchday: 21, home: 'bordeaux-begles', away: 'toulon' },
    ];

    let seed = 42;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const { rankCounts } = simulateSeason(elos, calendar, 1000, rng);

    for (const [, distribution] of rankCounts) {
      const zones = computeZoneProbabilities(distribution, 1000);
      const sum = zones.europe + zones.top6 + zones.mid + zones.relegation;
      expect(sum).toBeCloseTo(1, 2);
    }
  });

  it('rank counts sum to numSimulations per rank position', () => {
    const elos = new Map([
      ['toulouse', 1550],
      ['la-rochelle', 1500],
      ['bordeaux-begles', 1450],
    ]);

    const calendar = [
      { matchday: 21, home: 'toulouse', away: 'la-rochelle' },
    ];

    let seed = 99;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const numSim = 500;
    const { rankCounts } = simulateSeason(elos, calendar, numSim, rng);

    // For each rank position, total across all teams should equal numSim
    const numTeams = elos.size;
    for (let rank = 0; rank < numTeams; rank++) {
      let total = 0;
      for (const [, dist] of rankCounts) {
        total += dist[rank];
      }
      expect(total).toBe(numSim);
    }
  });
});

// ─── computeProjectedRank ──────────────────────────────────────────────────

describe('computeProjectedRank', () => {
  it('returns rank 1 when team finishes first in all simulations', () => {
    const distribution = [1000, 0, 0, 0];
    expect(computeProjectedRank(distribution, 1000)).toBe(1);
  });

  it('returns median rank for spread distribution', () => {
    // 200 at rank 1, 600 at rank 2, 200 at rank 3
    const distribution = [200, 600, 200];
    expect(computeProjectedRank(distribution, 1000)).toBe(2);
  });

  it('returns last rank as fallback for empty distribution', () => {
    const distribution = [0, 0, 0, 0];
    expect(computeProjectedRank(distribution, 1000)).toBe(4);
  });
});

// ─── computeZoneProbabilities ──────────────────────────────────────────────

describe('computeZoneProbabilities', () => {
  it('all in europe if team always finishes rank 1', () => {
    const distribution = [1000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    const zones = computeZoneProbabilities(distribution, 1000);
    expect(zones.europe).toBeCloseTo(1, 5);
    expect(zones.top6).toBeCloseTo(0, 5);
    expect(zones.mid).toBeCloseTo(0, 5);
    expect(zones.relegation).toBeCloseTo(0, 5);
  });

  it('probabilities sum to 1', () => {
    const distribution = [100, 100, 200, 200, 100, 100, 50, 50, 30, 20, 20, 10, 10, 10];
    const zones = computeZoneProbabilities(distribution, 1000);
    const sum = zones.europe + zones.top6 + zones.mid + zones.relegation;
    expect(sum).toBeCloseTo(1, 5);
  });

  it('all in relegation if team always finishes rank 14', () => {
    const distribution = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 500];
    const zones = computeZoneProbabilities(distribution, 500);
    expect(zones.relegation).toBeCloseTo(1, 5);
    expect(zones.europe).toBeCloseTo(0, 5);
  });

  it('values are decimals between 0 and 1', () => {
    const distribution = [50, 50, 100, 100, 200, 200, 100, 100, 50, 20, 10, 10, 5, 5];
    const zones = computeZoneProbabilities(distribution, 1000);
    for (const value of Object.values(zones)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });
});

// ─── calculateConfidence ───────────────────────────────────────────────────

describe('calculateConfidence', () => {
  it('returns value between 0 and 1', () => {
    const confidence = calculateConfidence(15, TOTAL_MATCHDAYS, 50);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it('higher matches played means higher confidence', () => {
    const early = calculateConfidence(6, TOTAL_MATCHDAYS, 50);
    const late = calculateConfidence(22, TOTAL_MATCHDAYS, 50);
    expect(late).toBeGreaterThan(early);
  });

  it('larger Elo gap means higher confidence', () => {
    const small = calculateConfidence(15, TOTAL_MATCHDAYS, 10);
    const large = calculateConfidence(15, TOTAL_MATCHDAYS, 200);
    expect(large).toBeGreaterThan(small);
  });

  it('early season (<=5 matchdays) produces confidence < 0.3', () => {
    const conf0 = calculateConfidence(0, TOTAL_MATCHDAYS, 0);
    const conf3 = calculateConfidence(3, TOTAL_MATCHDAYS, 50);
    const conf5 = calculateConfidence(5, TOTAL_MATCHDAYS, 100);
    expect(conf0).toBeLessThanOrEqual(0.3);
    expect(conf3).toBeLessThanOrEqual(0.3);
    expect(conf5).toBeLessThanOrEqual(0.3);
  });

  it('full season with large gap gives high confidence', () => {
    const conf = calculateConfidence(26, TOTAL_MATCHDAYS, 300);
    expect(conf).toBeGreaterThan(0.8);
  });
});

// ─── calculateMatchDifficulty ──────────────────────────────────────────────

describe('calculateMatchDifficulty', () => {
  it('returns value between 0 and 1', () => {
    const diff = calculateMatchDifficulty(1500, 1500, true);
    expect(diff).toBeGreaterThanOrEqual(0);
    expect(diff).toBeLessThanOrEqual(1);
  });

  it('playing stronger opponent at away is harder', () => {
    const easy = calculateMatchDifficulty(1600, 1400, true);
    const hard = calculateMatchDifficulty(1400, 1600, false);
    expect(hard).toBeGreaterThan(easy);
  });

  it('home advantage reduces difficulty', () => {
    const home = calculateMatchDifficulty(1500, 1500, true);
    const away = calculateMatchDifficulty(1500, 1500, false);
    expect(home).toBeLessThan(away);
  });

  it('equal teams at home gives difficulty < 0.5 (home advantage)', () => {
    const diff = calculateMatchDifficulty(1500, 1500, true);
    expect(diff).toBeLessThan(0.5);
  });

  it('much weaker opponent gives low difficulty', () => {
    const diff = calculateMatchDifficulty(1700, 1300, true);
    expect(diff).toBeLessThan(0.15);
  });
});

// ─── computeForm ───────────────────────────────────────────────────────────

describe('computeForm', () => {
  it('returns empty array when team has no results', () => {
    const form = computeForm('toulouse', []);
    expect(form).toEqual([]);
  });

  it('returns W for home win', () => {
    const form = computeForm('toulouse', [
      makeResult({ home: 'toulouse', homeScore: 30, awayScore: 20 }),
    ]);
    expect(form).toEqual(['W']);
  });

  it('returns L for away loss', () => {
    const form = computeForm('la-rochelle', [
      makeResult({ home: 'toulouse', away: 'la-rochelle', homeScore: 30, awayScore: 20 }),
    ]);
    expect(form).toEqual(['L']);
  });

  it('returns D for draw', () => {
    const form = computeForm('toulouse', [
      makeResult({ homeScore: 20, awayScore: 20 }),
    ]);
    expect(form).toEqual(['D']);
  });

  it('returns at most 5 results (most recent)', () => {
    const results = [];
    for (let i = 1; i <= 8; i++) {
      results.push(makeResult({
        matchday: i,
        home: 'toulouse',
        away: 'la-rochelle',
        homeScore: i % 2 === 0 ? 30 : 10,
        awayScore: 20,
      }));
    }
    const form = computeForm('toulouse', results);
    expect(form.length).toBe(5);
  });

  it('includes both home and away matches', () => {
    const results = [
      makeResult({ matchday: 1, home: 'toulouse', away: 'la-rochelle', homeScore: 30, awayScore: 20 }),
      makeResult({ matchday: 2, home: 'la-rochelle', away: 'toulouse', homeScore: 10, awayScore: 25 }),
    ];
    const form = computeForm('toulouse', results);
    expect(form).toEqual(['W', 'W']);
  });
});

// ─── computeTrend ──────────────────────────────────────────────────────────

describe('computeTrend', () => {
  it('returns "stable" for short history', () => {
    expect(computeTrend([1500])).toBe('stable');
    expect(computeTrend([1500, 1510])).toBe('stable');
  });

  it('returns "up" when Elo is rising', () => {
    expect(computeTrend([1500, 1510, 1530])).toBe('up');
  });

  it('returns "down" when Elo is falling', () => {
    expect(computeTrend([1530, 1520, 1510])).toBe('down');
  });

  it('returns "stable" for small fluctuations', () => {
    expect(computeTrend([1500, 1505, 1503])).toBe('stable');
  });

  it('uses last 3 entries for long histories', () => {
    // Overall up but last 3 are down
    expect(computeTrend([1400, 1450, 1500, 1495, 1480])).toBe('down');
  });
});

// ─── Early season (0 results) ──────────────────────────────────────────────

describe('early season handling', () => {
  it('computeEloRatings works with 0 results', () => {
    const standings = makeStandings(14);
    const { elos, eloHistories } = computeEloRatings(standings, []);

    expect(elos.size).toBe(14);
    for (const elo of elos.values()) {
      expect(elo).toBe(INITIAL_ELO);
    }
    for (const history of eloHistories.values()) {
      expect(history).toEqual([INITIAL_ELO]);
    }
  });

  it('confidence is very low with 0 matches played', () => {
    const conf = calculateConfidence(0, TOTAL_MATCHDAYS, 0);
    expect(conf).toBeLessThanOrEqual(0.3);
    expect(conf).toBeCloseTo(0, 1);
  });

  it('form is empty with 0 results', () => {
    const form = computeForm('toulouse', []);
    expect(form).toEqual([]);
  });

  it('trend is stable with minimal history', () => {
    const trend = computeTrend([INITIAL_ELO]);
    expect(trend).toBe('stable');
  });

  it('simulateSeason works with full calendar and equal Elos', () => {
    const elos = new Map();
    for (const s of makeStandings(4)) {
      elos.set(s.id, INITIAL_ELO);
    }

    const calendar = [
      { matchday: 1, home: 'toulouse', away: 'bordeaux-begles' },
      { matchday: 1, home: 'la-rochelle', away: 'toulon' },
    ];

    let seed = 12345;
    const rng = () => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };

    const { rankCounts } = simulateSeason(elos, calendar, 100, rng);

    // All teams should have rank distribution summing to 100
    for (const [, dist] of rankCounts) {
      const total = dist.reduce((s, c) => s + c, 0);
      expect(total).toBe(100);
    }
  });
});

// ─── roundDecimal ──────────────────────────────────────────────────────────

describe('roundDecimal', () => {
  it('rounds to specified decimal places', () => {
    expect(roundDecimal(0.12345, 2)).toBe(0.12);
    expect(roundDecimal(0.12345, 4)).toBe(0.1235);
  });

  it('handles 0', () => {
    expect(roundDecimal(0, 2)).toBe(0);
  });
});

// ─── computeNeighborGap ───────────────────────────────────────────────────

describe('computeNeighborGap', () => {
  it('returns 0 for single team', () => {
    expect(computeNeighborGap([{ id: 'toulouse', elo: 1500 }], 0)).toBe(0);
  });

  it('returns gap to nearest neighbor', () => {
    const teams = [
      { id: 'toulouse', elo: 1600 },
      { id: 'la-rochelle', elo: 1550 },
      { id: 'toulon', elo: 1400 },
    ];
    // la-rochelle (index 1): gap to toulouse=50, gap to toulon=150 -> min=50
    expect(computeNeighborGap(teams, 1)).toBe(50);
  });
});
