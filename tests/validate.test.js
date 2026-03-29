import { describe, it, expect } from 'vitest';
import {
  validateTopLevelFields,
  validateStandings,
  validateScores,
  validateDates,
  validateRequiredFields,
  validateTeamIds,
  validateAll,
  isValidISODate,
  isWithinSeasonRange,
} from '../scripts/validate.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

/** Valid standing entry */
function makeStanding(overrides = {}) {
  return {
    id: 'toulouse',
    rank: 1,
    points: 68,
    played: 22,
    won: 15,
    drawn: 1,
    lost: 6,
    bonusOffensive: 5,
    bonusDefensive: 3,
    pointsFor: 520,
    pointsAgainst: 380,
    ...overrides,
  };
}

/** Valid result entry */
function makeResult(overrides = {}) {
  return {
    matchday: 20,
    date: '2026-03-28',
    home: 'toulouse',
    away: 'la-rochelle',
    homeScore: 24,
    awayScore: 18,
    homeBonus: null,
    awayBonus: 'defensive',
    ...overrides,
  };
}

/** Valid calendar entry */
function makeCalendar(overrides = {}) {
  return {
    matchday: 23,
    home: 'la-rochelle',
    away: 'toulon',
    ...overrides,
  };
}

/** All 14 valid team IDs */
const ALL_14_TEAMS = [
  'toulouse',
  'bordeaux-begles',
  'la-rochelle',
  'toulon',
  'racing-92',
  'clermont',
  'castres',
  'lyon',
  'montpellier',
  'pau',
  'montauban',
  'bayonne',
  'stade-francais',
  'vannes',
];

/** Generate 14 valid standings */
function make14Standings() {
  return ALL_14_TEAMS.map((id, i) =>
    makeStanding({ id, rank: i + 1, points: 70 - i * 4 }),
  );
}

/** Generate a complete valid scraped data object */
function makeValidData(overrides = {}) {
  return {
    scrapedAt: '2026-03-29T06:37:15.105Z',
    source: 'lnr',
    matchday: 20,
    complete: false,
    standings: make14Standings(),
    results: [makeResult()],
    calendar: [makeCalendar()],
    ...overrides,
  };
}

// ─── Top-level fields ───────────────────────────────────────────────────────

describe('validateTopLevelFields', () => {
  it('returns no errors for valid data', () => {
    const errors = validateTopLevelFields(makeValidData());
    expect(errors).toEqual([]);
  });

  it('detects missing scrapedAt', () => {
    const data = makeValidData();
    delete data.scrapedAt;
    const errors = validateTopLevelFields(data);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('scrapedAt');
  });

  it('detects multiple missing fields', () => {
    const errors = validateTopLevelFields({});
    expect(errors).toHaveLength(7);
  });

  it('detects null fields as missing', () => {
    const data = makeValidData();
    data.source = null;
    const errors = validateTopLevelFields(data);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain('source');
  });

  it('detects matchday 0 (below range)', () => {
    const data = makeValidData({ matchday: 0 });
    const errors = validateTopLevelFields(data);
    expect(errors.some((e) => e.includes('matchday'))).toBe(true);
  });

  it('detects matchday 99 (above range)', () => {
    const data = makeValidData({ matchday: 99 });
    const errors = validateTopLevelFields(data);
    expect(errors.some((e) => e.includes('matchday'))).toBe(true);
  });

  it('detects non-integer matchday', () => {
    const data = makeValidData({ matchday: 10.5 });
    const errors = validateTopLevelFields(data);
    expect(errors.some((e) => e.includes('matchday'))).toBe(true);
  });

  it('accepts matchday at boundaries (1 and 26)', () => {
    expect(validateTopLevelFields(makeValidData({ matchday: 1 }))).toEqual([]);
    expect(validateTopLevelFields(makeValidData({ matchday: 26 }))).toEqual([]);
  });
});

// ─── Standings validation ───────────────────────────────────────────────────

describe('validateStandings', () => {
  it('returns no errors for 14 valid teams', () => {
    const errors = validateStandings(make14Standings());
    expect(errors).toEqual([]);
  });

  it('tolerates partial standings (13 teams — LNR JS-rendered workaround)', () => {
    const standings = make14Standings().slice(0, 13);
    const errors = validateStandings(standings);
    // Partial standings produce a warning, not an error
    expect(errors.some((e) => e.includes('13 equipes'))).toBe(false);
  });

  it('tolerates empty standings (0 teams — LNR JS-rendered)', () => {
    const errors = validateStandings([]);
    expect(errors).toEqual([]);
  });

  it('detects wrong team count (15 teams)', () => {
    const standings = [
      ...make14Standings(),
      makeStanding({ id: 'toulouse', rank: 1 }),
    ];
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('15 equipes'))).toBe(true);
  });

  it('detects unknown team ID', () => {
    const standings = make14Standings();
    standings[0] = makeStanding({ id: 'grenoble', rank: 1 });
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('grenoble'))).toBe(true);
  });

  it('detects duplicate team IDs', () => {
    const standings = make14Standings();
    standings[1] = makeStanding({ id: 'toulouse', rank: 2, points: 60 });
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('doublon'))).toBe(true);
  });

  it('detects missing required fields in standing', () => {
    const standings = make14Standings();
    const { points, ...incomplete } = standings[0];
    standings[0] = incomplete;
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('"points"'))).toBe(true);
  });

  it('detects rank out of range', () => {
    const standings = make14Standings();
    standings[0] = makeStanding({ id: 'toulouse', rank: 15 });
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('rank'))).toBe(true);
  });

  it('detects negative points', () => {
    const standings = make14Standings();
    standings[0] = makeStanding({ id: 'toulouse', rank: 1, points: -5 });
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('points'))).toBe(true);
  });

  it('detects played out of range', () => {
    const standings = make14Standings();
    standings[0] = makeStanding({ id: 'toulouse', rank: 1, played: 27 });
    const errors = validateStandings(standings);
    expect(errors.some((e) => e.includes('played'))).toBe(true);
  });

  it('accepts zero values for standings fields', () => {
    const standings = make14Standings();
    standings[0] = makeStanding({
      id: 'toulouse',
      rank: 1,
      points: 0,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
    });
    const errors = validateStandings(standings);
    expect(errors).toEqual([]);
  });

  it('returns error if standings is not an array', () => {
    const errors = validateStandings('not-an-array');
    expect(errors.some((e) => e.includes('tableau'))).toBe(true);
  });
});

// ─── Scores validation ──────────────────────────────────────────────────────

describe('validateScores', () => {
  it('returns no errors for valid scores', () => {
    const errors = validateScores([makeResult()]);
    expect(errors).toEqual([]);
  });

  it('detects non-integer homeScore', () => {
    const errors = validateScores([makeResult({ homeScore: 24.5 })]);
    expect(errors.some((e) => e.includes('homeScore') && e.includes('entier'))).toBe(
      true,
    );
  });

  it('detects negative awayScore', () => {
    const errors = validateScores([makeResult({ awayScore: -1 })]);
    expect(errors.some((e) => e.includes('awayScore'))).toBe(true);
  });

  it('detects score above max (150)', () => {
    const errors = validateScores([makeResult({ homeScore: 151 })]);
    expect(errors.some((e) => e.includes('homeScore') && e.includes('150'))).toBe(
      true,
    );
  });

  it('accepts zero scores', () => {
    const errors = validateScores([makeResult({ homeScore: 0, awayScore: 0 })]);
    expect(errors).toEqual([]);
  });

  it('accepts score of exactly 150', () => {
    const errors = validateScores([makeResult({ homeScore: 150 })]);
    expect(errors).toEqual([]);
  });

  it('detects string score', () => {
    const errors = validateScores([makeResult({ homeScore: '24' })]);
    expect(errors.some((e) => e.includes('homeScore') && e.includes('entier'))).toBe(
      true,
    );
  });

  it('returns error if results is not an array', () => {
    const errors = validateScores('not-an-array');
    expect(errors.some((e) => e.includes('tableau'))).toBe(true);
  });
});

// ─── Dates validation ───────────────────────────────────────────────────────

describe('isValidISODate', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(isValidISODate('2026-03-28')).toBe(true);
  });

  it('accepts full ISO datetime', () => {
    expect(isValidISODate('2026-03-29T06:37:15.105Z')).toBe(true);
  });

  it('rejects non-string', () => {
    expect(isValidISODate(12345)).toBe(false);
  });

  it('rejects invalid date string', () => {
    expect(isValidISODate('not-a-date')).toBe(false);
  });

  it('rejects invalid month', () => {
    expect(isValidISODate('2026-13-28')).toBe(false);
  });

  it('rejects impossible date Feb 30', () => {
    expect(isValidISODate('2026-02-30')).toBe(false);
  });

  it('rejects Feb 29 in non-leap year (2026)', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
  });

  it('rejects Apr 31 (impossible calendar date)', () => {
    expect(isValidISODate('2026-04-31')).toBe(false);
  });

  it('accepts Feb 29 in leap year (2028)', () => {
    expect(isValidISODate('2028-02-29')).toBe(true);
  });
});

describe('isWithinSeasonRange', () => {
  it('accepts date within season', () => {
    expect(isWithinSeasonRange('2026-03-28')).toBe(true);
  });

  it('accepts season start', () => {
    expect(isWithinSeasonRange('2025-08-01')).toBe(true);
  });

  it('accepts season end', () => {
    expect(isWithinSeasonRange('2026-07-31')).toBe(true);
  });

  it('rejects date before season', () => {
    expect(isWithinSeasonRange('2025-07-31')).toBe(false);
  });

  it('rejects date after season', () => {
    expect(isWithinSeasonRange('2026-08-01')).toBe(false);
  });
});

describe('validateDates', () => {
  it('returns no errors for valid dates', () => {
    const errors = validateDates([makeResult()], []);
    expect(errors).toEqual([]);
  });

  it('allows empty string date in results (scraping may not extract dates)', () => {
    const errors = validateDates([makeResult({ date: '' })], []);
    expect(errors).toEqual([]);
  });

  it('detects invalid date format in results', () => {
    const errors = validateDates([makeResult({ date: 'March 28' })], []);
    expect(errors.some((e) => e.includes('ISO 8601'))).toBe(true);
  });

  it('detects date out of season range in results', () => {
    const errors = validateDates([makeResult({ date: '2024-01-15' })], []);
    expect(errors.some((e) => e.includes('plage saison'))).toBe(true);
  });

  it('allows missing date in calendar (optional)', () => {
    const errors = validateDates([], [makeCalendar()]);
    expect(errors).toEqual([]);
  });

  it('allows empty string date in calendar', () => {
    const errors = validateDates([], [makeCalendar({ date: '' })]);
    expect(errors).toEqual([]);
  });

  it('validates present date in calendar', () => {
    const errors = validateDates(
      [],
      [makeCalendar({ date: '2026-04-04' })],
    );
    expect(errors).toEqual([]);
  });

  it('detects invalid date in calendar when present', () => {
    const errors = validateDates(
      [],
      [makeCalendar({ date: 'invalid' })],
    );
    expect(errors.some((e) => e.includes('ISO 8601'))).toBe(true);
  });
});

// ─── Required fields per entity ─────────────────────────────────────────────

describe('validateRequiredFields', () => {
  it('returns no errors for valid data', () => {
    const errors = validateRequiredFields([makeResult()], [makeCalendar()]);
    expect(errors).toEqual([]);
  });

  it('detects missing field in result', () => {
    const { home, ...incomplete } = makeResult();
    const errors = validateRequiredFields([incomplete], []);
    expect(errors.some((e) => e.includes('"home"'))).toBe(true);
  });

  it('detects missing field in calendar', () => {
    const { away, ...incomplete } = makeCalendar();
    const errors = validateRequiredFields([], [incomplete]);
    expect(errors.some((e) => e.includes('"away"'))).toBe(true);
  });

  it('detects matchday out of range in result', () => {
    const errors = validateRequiredFields(
      [makeResult({ matchday: 0 })],
      [],
    );
    expect(errors.some((e) => e.includes('matchday'))).toBe(true);
  });

  it('detects matchday out of range in calendar', () => {
    const errors = validateRequiredFields(
      [],
      [makeCalendar({ matchday: 27 })],
    );
    expect(errors.some((e) => e.includes('matchday'))).toBe(true);
  });

  it('accepts matchday at boundaries (1 and 26)', () => {
    const errors = validateRequiredFields(
      [makeResult({ matchday: 1 }), makeResult({ matchday: 26 })],
      [makeCalendar({ matchday: 1 }), makeCalendar({ matchday: 26 })],
    );
    expect(errors).toEqual([]);
  });
});

// ─── Team IDs in results/calendar ───────────────────────────────────────────

describe('validateTeamIds', () => {
  it('returns no errors for valid team IDs', () => {
    const errors = validateTeamIds([makeResult()], [makeCalendar()]);
    expect(errors).toEqual([]);
  });

  it('detects unknown home team in results', () => {
    const errors = validateTeamIds(
      [makeResult({ home: 'grenoble' })],
      [],
    );
    expect(errors.some((e) => e.includes('grenoble'))).toBe(true);
  });

  it('detects unknown away team in results', () => {
    const errors = validateTeamIds(
      [makeResult({ away: 'unknown-team' })],
      [],
    );
    expect(errors.some((e) => e.includes('unknown-team'))).toBe(true);
  });

  it('detects unknown team in calendar', () => {
    const errors = validateTeamIds(
      [],
      [makeCalendar({ home: 'brive' })],
    );
    expect(errors.some((e) => e.includes('brive'))).toBe(true);
  });
});

// ─── Multiple error collection ──────────────────────────────────────────────

describe('validateAll — error collection', () => {
  it('collects multiple errors without stopping at first', () => {
    const data = {
      // Missing scrapedAt and source
      matchday: 20,
      complete: false,
      standings: [makeStanding({ id: 'unknown-team' })], // wrong count + unknown ID
      results: [makeResult({ homeScore: -1, away: 'brive' })], // bad score + unknown team
      calendar: [],
    };
    const errors = validateAll(data);
    // Should have errors from multiple validators
    expect(errors.length).toBeGreaterThan(3);
  });

  it('collects errors from all validators', () => {
    const data = {
      // Missing top-level fields
      standings: [], // wrong count
      results: [{ homeScore: 'not-a-number' }], // bad score + missing fields
      calendar: [{}], // missing fields
    };
    const errors = validateAll(data);
    // Top-level (scrapedAt, source, matchday, complete = 4 missing)
    // Standings (0 instead of 14)
    // Results & calendar (various)
    expect(errors.length).toBeGreaterThan(5);
  });
});

// ─── Nominal case ───────────────────────────────────────────────────────────

describe('validateAll — nominal case', () => {
  it('returns no errors for fully valid data', () => {
    const errors = validateAll(makeValidData());
    expect(errors).toEqual([]);
  });

  it('accepts data with empty results and calendar', () => {
    const errors = validateAll(makeValidData({ results: [], calendar: [] }));
    expect(errors).toEqual([]);
  });

  it('accepts complete = false without error', () => {
    const errors = validateAll(makeValidData({ complete: false }));
    expect(errors).toEqual([]);
  });

  it('accepts complete = true without error', () => {
    const errors = validateAll(makeValidData({ complete: true }));
    expect(errors).toEqual([]);
  });

  it('accepts standings with zero values (best-effort scraping)', () => {
    const standings = make14Standings().map((s) => ({
      ...s,
      won: 0,
      drawn: 0,
      lost: 0,
    }));
    const errors = validateAll(makeValidData({ standings }));
    expect(errors).toEqual([]);
  });
});
