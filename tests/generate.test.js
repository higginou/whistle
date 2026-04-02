import { describe, it, expect } from 'vitest';
import {
  TEAM_NAMES,
  getTeamName,
  buildTeamEntry,
  buildPredictionEntry,
  mergePredictions,
  mergeCalendarDates,
  mergeCorrections,
  buildSeasonData,
  ensureSeasonInIndex,
  loadExistingSeason,
} from '../scripts/generate.js';
import { statSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

// ─── Fixtures ─────────────────────────────────────────────────────────────

function makeEloTeam(overrides = {}) {
  return {
    id: 'toulouse',
    currentRank: 1,
    elo: 1514,
    projectedRank: 4,
    confidence: 0.46,
    zones: { europe: 0, top6: 1, mid: 0, relegation: 0 },
    form: ['W'],
    trend: 'stable',
    eloHistory: [1500, 1514],
    ...overrides,
  };
}

function makeEloOutput(overrides = {}) {
  return {
    calculatedAt: '2026-03-29T07:12:04.260Z',
    matchday: 20,
    teams: [
      makeEloTeam({ id: 'toulouse', currentRank: 1, projectedRank: 4 }),
      makeEloTeam({ id: 'bordeaux-begles', currentRank: 2, projectedRank: 2, elo: 1518 }),
      makeEloTeam({ id: 'la-rochelle', currentRank: 3, projectedRank: 10, elo: 1487 }),
      makeEloTeam({ id: 'toulon', currentRank: 4, projectedRank: 7, elo: 1500 }),
      makeEloTeam({ id: 'racing-92', currentRank: 5, projectedRank: 9, elo: 1487 }),
      makeEloTeam({ id: 'clermont', currentRank: 6, projectedRank: 8, elo: 1500 }),
      makeEloTeam({ id: 'castres', currentRank: 7, projectedRank: 3, elo: 1515 }),
      makeEloTeam({ id: 'lyon', currentRank: 8, projectedRank: 13, elo: 1482 }),
      makeEloTeam({ id: 'montpellier', currentRank: 9, projectedRank: 11, elo: 1486 }),
      makeEloTeam({ id: 'pau', currentRank: 10, projectedRank: 5, elo: 1513 }),
      makeEloTeam({ id: 'montauban', currentRank: 11, projectedRank: 14, elo: 1450 }),
      makeEloTeam({ id: 'bayonne', currentRank: 12, projectedRank: 6, elo: 1513 }),
      makeEloTeam({ id: 'stade-francais', currentRank: 13, projectedRank: 1, elo: 1500 }),
      makeEloTeam({ id: 'vannes', currentRank: 14, projectedRank: 12, elo: 1470 }),
    ],
    calendar: [
      { matchday: 20, date: '', home: 'stade-francais', away: 'clermont', difficulty: 0.41 },
    ],
    ...overrides,
  };
}

function makeExistingPrediction(matchday = 19) {
  return {
    matchday,
    date: '2026-03-22T08:00:00.000Z',
    projections: [
      { teamId: 'toulouse', projectedRank: 1, confidence: 0.9 },
      { teamId: 'bordeaux-begles', projectedRank: 2, confidence: 0.85 },
    ],
  };
}

// ─── T5.1 : Structure du JSON genere ──────────────────────────────────────

describe('T5.1 : structure du JSON genere', () => {
  const eloOutput = makeEloOutput();
  const seasonData = buildSeasonData(eloOutput, []);

  it('contient tous les champs racine requis', () => {
    expect(seasonData).toHaveProperty('season');
    expect(seasonData).toHaveProperty('lastUpdated');
    expect(seasonData).toHaveProperty('matchday');
    expect(seasonData).toHaveProperty('brierScore');
    expect(seasonData).toHaveProperty('teams');
    expect(seasonData).toHaveProperty('calendar');
    expect(seasonData).toHaveProperty('predictions');
  });

  it('season est "2025-2026"', () => {
    expect(seasonData.season).toBe('2025-2026');
  });

  it('lastUpdated est en ISO 8601', () => {
    expect(seasonData.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('matchday reflète la valeur de elo-output', () => {
    expect(seasonData.matchday).toBe(20);
  });

  it('brierScore est null', () => {
    expect(seasonData.brierScore).toBeNull();
  });

  it('teams est un tableau avec le bon nombre d equipes', () => {
    expect(Array.isArray(seasonData.teams)).toBe(true);
    expect(seasonData.teams).toHaveLength(14);
  });

  it('calendar est copie directement depuis elo-output', () => {
    expect(seasonData.calendar).toEqual(eloOutput.calendar);
  });

  it('predictions est un tableau', () => {
    expect(Array.isArray(seasonData.predictions)).toBe(true);
  });

  it('chaque equipe a tous les champs requis du schema', () => {
    for (const team of seasonData.teams) {
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('name');
      expect(team).toHaveProperty('currentRank');
      expect(team).toHaveProperty('projectedRank');
      expect(team).toHaveProperty('elo');
      expect(team).toHaveProperty('confidence');
      expect(team).toHaveProperty('zones');
      expect(team).toHaveProperty('form');
      expect(team).toHaveProperty('trend');
    }
  });

  it('eloHistory n est PAS inclus dans les equipes du JSON final', () => {
    for (const team of seasonData.teams) {
      expect(team).not.toHaveProperty('eloHistory');
    }
  });
});

// ─── T5.2 : Append-only (predictions precedentes non modifiees) ───────────

describe('T5.2 : append-only des predictions', () => {
  it('les predictions precedentes sont preservees intactes', () => {
    const existing = [makeExistingPrediction(19)];
    const eloOutput = makeEloOutput({ matchday: 20 });
    const seasonData = buildSeasonData(eloOutput, existing);

    expect(seasonData.predictions).toHaveLength(2);
    // First entry is the original, untouched
    expect(seasonData.predictions[0]).toEqual(existing[0]);
  });

  it('les predictions precedentes ne sont jamais modifiees', () => {
    const original = makeExistingPrediction(18);
    const frozen = JSON.parse(JSON.stringify(original));
    const existing = [original, makeExistingPrediction(19)];
    const eloOutput = makeEloOutput({ matchday: 20 });

    buildSeasonData(eloOutput, existing);

    // Original object not mutated
    expect(existing[0]).toEqual(frozen);
  });

  it('ajoute la nouvelle prediction a la fin', () => {
    const existing = [makeExistingPrediction(19)];
    const eloOutput = makeEloOutput({ matchday: 20 });
    const seasonData = buildSeasonData(eloOutput, existing);

    const lastPrediction = seasonData.predictions[seasonData.predictions.length - 1];
    expect(lastPrediction.matchday).toBe(20);
  });
});

// ─── T5.3 : Idempotence (pas de doublons) ────────────────────────────────

describe('T5.3 : idempotence des predictions', () => {
  it('ne duplique pas une prediction pour le meme matchday', () => {
    const existing = [makeExistingPrediction(20)];
    const eloOutput = makeEloOutput({ matchday: 20 });
    const seasonData = buildSeasonData(eloOutput, existing);

    expect(seasonData.predictions).toHaveLength(1);
    // The existing prediction is kept, not replaced
    expect(seasonData.predictions[0]).toEqual(existing[0]);
  });

  it('deux executions consecutives produisent le meme nombre de predictions', () => {
    const eloOutput = makeEloOutput({ matchday: 20 });

    const first = buildSeasonData(eloOutput, []);
    const second = buildSeasonData(eloOutput, first.predictions);

    expect(second.predictions).toHaveLength(1);
  });

  it('mergePredictions ne modifie pas le tableau existant', () => {
    const existing = [makeExistingPrediction(19)];
    const newPred = { matchday: 20, date: '2026-03-29T10:00:00.000Z', projections: [] };

    const result = mergePredictions(existing, newPred);

    expect(result).toHaveLength(2);
    expect(existing).toHaveLength(1); // Original not mutated
  });
});

// ─── T5.4 : Mapping id -> name ────────────────────────────────────────────

describe('T5.4 : mapping id -> name', () => {
  it('TEAM_NAMES contient les 14 equipes TOP 14', () => {
    expect(Object.keys(TEAM_NAMES)).toHaveLength(14);
  });

  it('toutes les equipes ont un nom via getTeamName', () => {
    const knownIds = [
      'toulouse', 'bordeaux-begles', 'la-rochelle', 'toulon',
      'racing-92', 'clermont', 'castres', 'lyon',
      'montpellier', 'pau', 'montauban', 'bayonne',
      'stade-francais', 'vannes',
    ];

    for (const id of knownIds) {
      const name = getTeamName(id);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
      expect(name).not.toBe(id); // Should be a display name, not the ID
    }
  });

  it('getTeamName retourne l ID si l equipe n est pas dans le mapping', () => {
    expect(getTeamName('perpignan')).toBe('perpignan');
  });

  it('buildTeamEntry ajoute le name depuis TEAM_NAMES', () => {
    const eloTeam = makeEloTeam({ id: 'toulouse' });
    const entry = buildTeamEntry(eloTeam);

    expect(entry.name).toBe('Stade Toulousain');
  });

  it('buildTeamEntry exclut eloHistory', () => {
    const eloTeam = makeEloTeam({ id: 'toulouse', eloHistory: [1500, 1514] });
    const entry = buildTeamEntry(eloTeam);

    expect(entry).not.toHaveProperty('eloHistory');
  });
});

// ─── T5.5 : Mise a jour de seasons.json ───────────────────────────────────

describe('T5.5 : mise a jour de seasons.json', () => {
  it('n ajoute pas la saison si elle existe deja', () => {
    const index = {
      seasons: [{ id: '2025-2026', label: 'Saison 2025-2026', current: true }],
    };

    const { data, modified } = ensureSeasonInIndex(index, '2025-2026');

    expect(modified).toBe(false);
    expect(data.seasons).toHaveLength(1);
  });

  it('ajoute la saison si elle est absente', () => {
    const index = { seasons: [] };

    const { data, modified } = ensureSeasonInIndex(index, '2025-2026');

    expect(modified).toBe(true);
    expect(data.seasons).toHaveLength(1);
    expect(data.seasons[0]).toEqual({
      id: '2025-2026',
      label: 'Saison 2025-2026',
      current: true,
    });
  });

  it('preserve les saisons existantes quand on en ajoute une nouvelle', () => {
    const index = {
      seasons: [{ id: '2024-2025', label: 'Saison 2024-2025', current: false }],
    };

    const { data, modified } = ensureSeasonInIndex(index, '2025-2026');

    expect(modified).toBe(true);
    expect(data.seasons).toHaveLength(2);
    expect(data.seasons[0].id).toBe('2024-2025');
    expect(data.seasons[1].id).toBe('2025-2026');
  });

  it('gere un index sans propriete seasons', () => {
    const { data, modified } = ensureSeasonInIndex({}, '2025-2026');

    expect(modified).toBe(true);
    expect(data.seasons).toHaveLength(1);
  });
});

// ─── T5.6 : Taille du fichier < 50Ko ─────────────────────────────────────

describe('T5.6 : budget taille', () => {
  it('le JSON genere pour 14 equipes fait moins de 50Ko', () => {
    const eloOutput = makeEloOutput();
    const seasonData = buildSeasonData(eloOutput, []);
    const json = JSON.stringify(seasonData, null, 2);
    const sizeKo = Buffer.byteLength(json, 'utf-8') / 1024;

    expect(sizeKo).toBeLessThan(50);
  });

  it('le JSON reste sous 50Ko meme avec 26 predictions', () => {
    const predictions = [];
    for (let i = 1; i <= 25; i++) {
      predictions.push({
        matchday: i,
        date: new Date().toISOString(),
        projections: makeEloOutput().teams.map((t) => ({
          teamId: t.id,
          projectedRank: t.projectedRank,
          confidence: t.confidence,
        })),
      });
    }

    const eloOutput = makeEloOutput({ matchday: 26 });
    const seasonData = buildSeasonData(eloOutput, predictions);
    const json = JSON.stringify(seasonData, null, 2);
    const sizeKo = Buffer.byteLength(json, 'utf-8') / 1024;

    expect(sizeKo).toBeLessThan(50);
  });
});

// ─── T5.7 : Format (camelCase, decimales 0-1, ISO 8601) ──────────────────

describe('T5.7 : format du JSON', () => {
  const eloOutput = makeEloOutput();
  const seasonData = buildSeasonData(eloOutput, []);

  it('les champs racine sont en camelCase', () => {
    const keys = Object.keys(seasonData);
    for (const key of keys) {
      expect(key).not.toMatch(/_/);
      expect(key[0]).toBe(key[0].toLowerCase());
    }
  });

  it('les IDs equipes sont en kebab-case', () => {
    const kebabRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const team of seasonData.teams) {
      expect(team.id).toMatch(kebabRe);
    }
  });

  it('les probabilites sont en decimales 0-1 (pas de pourcentages)', () => {
    for (const team of seasonData.teams) {
      expect(team.confidence).toBeGreaterThanOrEqual(0);
      expect(team.confidence).toBeLessThanOrEqual(1);
      for (const key of ['europe', 'top6', 'mid', 'relegation']) {
        expect(team.zones[key]).toBeGreaterThanOrEqual(0);
        expect(team.zones[key]).toBeLessThanOrEqual(1);
      }
    }
  });

  it('lastUpdated est une date ISO 8601 sans millisecondes', () => {
    expect(seasonData.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    // Verify it's a valid date
    const date = new Date(seasonData.lastUpdated);
    expect(date.getTime()).not.toBeNaN();
  });

  it('trend est une valeur valide', () => {
    for (const team of seasonData.teams) {
      expect(['up', 'down', 'stable']).toContain(team.trend);
    }
  });

  it('les champs equipe sont en camelCase', () => {
    for (const team of seasonData.teams) {
      for (const key of Object.keys(team)) {
        expect(key).not.toMatch(/_/);
        expect(key[0]).toBe(key[0].toLowerCase());
      }
    }
  });
});

// ─── Prediction Entry Building ────────────────────────────────────────────

describe('buildPredictionEntry', () => {
  it('construit une entree prediction avec matchday, date et projections', () => {
    const teams = [
      makeEloTeam({ id: 'toulouse', projectedRank: 4, confidence: 0.46 }),
      makeEloTeam({ id: 'la-rochelle', projectedRank: 10, confidence: 0.46 }),
    ];
    const date = '2026-03-29T10:00:00.000Z';

    const entry = buildPredictionEntry(20, date, teams);

    expect(entry.matchday).toBe(20);
    expect(entry.date).toBe(date);
    expect(entry.projections).toHaveLength(2);
    expect(entry.projections[0]).toEqual({
      teamId: 'toulouse',
      projectedRank: 4,
      confidence: 0.46,
    });
  });
});

// ─── loadExistingSeason ───────────────────────────────────────────────────

describe('loadExistingSeason', () => {
  it('retourne un squelette si le fichier n existe pas', () => {
    const result = loadExistingSeason('/nonexistent/path/2025-2026.json');

    expect(result.season).toBe('2025-2026');
    expect(result.predictions).toEqual([]);
    expect(result.teams).toEqual([]);
    expect(result.brierScore).toBeNull();
  });
});

// ─── Handling fewer than 14 teams ─────────────────────────────────────────

describe('gestion des equipes manquantes', () => {
  it('fonctionne avec moins de 14 equipes', () => {
    const eloOutput = makeEloOutput({
      teams: [
        makeEloTeam({ id: 'toulouse', currentRank: 1 }),
        makeEloTeam({ id: 'la-rochelle', currentRank: 2 }),
      ],
    });

    const seasonData = buildSeasonData(eloOutput, []);

    expect(seasonData.teams).toHaveLength(2);
    expect(seasonData.predictions[0].projections).toHaveLength(2);
  });

  it('gere les equipes hors mapping (fallback sur l ID)', () => {
    const eloOutput = makeEloOutput({
      teams: [makeEloTeam({ id: 'perpignan', currentRank: 1 })],
    });

    const seasonData = buildSeasonData(eloOutput, []);

    expect(seasonData.teams[0].name).toBe('perpignan');
  });
});

// ─── mergeCalendarDates ───────────────────────────────────────────────────

describe('T5.6 : mergeCalendarDates — preservation des dates', () => {
  it('preserve les dates existantes quand les nouvelles sont vides', () => {
    const newCal = [
      { matchday: 23, date: '', home: 'la-rochelle', away: 'toulouse', difficulty: 0.85 },
    ];
    const existingCal = [
      { matchday: 23, date: '2026-04-04T15:00:00Z', home: 'la-rochelle', away: 'toulouse', difficulty: 0.85 },
    ];

    const merged = mergeCalendarDates(newCal, existingCal);
    expect(merged[0].date).toBe('2026-04-04T15:00:00Z');
  });

  it('garde la nouvelle date si elle est non-vide', () => {
    const newCal = [
      { matchday: 23, date: '2026-04-05T15:00:00Z', home: 'la-rochelle', away: 'toulouse', difficulty: 0.85 },
    ];
    const existingCal = [
      { matchday: 23, date: '2026-04-04T15:00:00Z', home: 'la-rochelle', away: 'toulouse', difficulty: 0.85 },
    ];

    const merged = mergeCalendarDates(newCal, existingCal);
    expect(merged[0].date).toBe('2026-04-05T15:00:00Z');
  });

  it('retourne le nouveau calendrier tel quel si pas d existant', () => {
    const newCal = [
      { matchday: 23, date: '', home: 'la-rochelle', away: 'toulouse', difficulty: 0.85 },
    ];

    const merged = mergeCalendarDates(newCal, []);
    expect(merged[0].date).toBe('');
  });

  it('retourne le nouveau calendrier tel quel si existant est vide', () => {
    const newCal = [{ matchday: 23, date: '', home: 'toulon', away: 'pau', difficulty: 0.5 }];
    const merged = mergeCalendarDates(newCal, undefined);
    expect(merged).toEqual(newCal);
  });
});

// ─── mergeCorrections ─────────────────────────────────────────────────────

describe('mergeCorrections', () => {
  const c1 = { matchday: 8, parameter: 'homeFactor', type: 'correction', oldValue: 1, newValue: 1.5, date: '2025-11-10T00:00:00Z', title: 'A', description: 'D', impact: 'positive' };
  const c2 = { matchday: 13, parameter: 'temporalDecay', type: 'recalibration', oldValue: 0.9, newValue: 0.8, date: '2026-01-12T00:00:00Z', title: 'B', description: 'D', impact: 'neutral' };

  it('returns existing when incoming is empty', () => {
    expect(mergeCorrections([c1], [])).toEqual([c1]);
  });

  it('returns existing when incoming is null', () => {
    expect(mergeCorrections([c1], null)).toEqual([c1]);
  });

  it('appends new corrections', () => {
    const result = mergeCorrections([c1], [c2]);
    expect(result).toHaveLength(2);
    expect(result[0].matchday).toBe(8);
    expect(result[1].matchday).toBe(13);
  });

  it('deduplicates by matchday+parameter', () => {
    const result = mergeCorrections([c1], [{ ...c1, title: 'Updated' }]);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('A'); // keeps existing
  });

  it('sorts by matchday ascending', () => {
    const result = mergeCorrections([c2], [c1]);
    expect(result[0].matchday).toBe(8);
    expect(result[1].matchday).toBe(13);
  });
});

// ─── buildSeasonData: corrections propagation ─────────────────────────────

describe('buildSeasonData corrections', () => {
  it('includes corrections from elo-output', () => {
    const eloOutput = {
      matchday: 13,
      teams: [{ id: 'toulouse', currentRank: 1, projectedRank: 1, elo: 1500, confidence: 0.5, zones: { europe: 0.5, top6: 0.3, mid: 0.15, relegation: 0.05 }, form: ['W', 'W', 'W', 'W', 'W'], trend: 'up', eloHistory: [1500] }],
      calendar: [],
      corrections: [{ matchday: 13, parameter: 'decay', type: 'recalibration', oldValue: 0.05, newValue: 0.045, date: '2026-01-12T00:00:00Z', title: 'R', description: 'D', impact: 'neutral' }],
    };
    const result = buildSeasonData(eloOutput, [], [], []);
    expect(result.corrections).toHaveLength(1);
    expect(result.corrections[0].type).toBe('recalibration');
  });

  it('merges existing and new corrections without duplicates', () => {
    const existing = [{ matchday: 8, parameter: 'p', type: 'correction', oldValue: 1, newValue: 2, date: '2025-11-10T00:00:00Z', title: 'E', description: 'D', impact: 'positive' }];
    const eloOutput = {
      matchday: 13,
      teams: [{ id: 'toulouse', currentRank: 1, projectedRank: 1, elo: 1500, confidence: 0.5, zones: { europe: 0.5, top6: 0.3, mid: 0.15, relegation: 0.05 }, form: ['W', 'W', 'W', 'W', 'W'], trend: 'up', eloHistory: [1500] }],
      calendar: [],
      corrections: [{ matchday: 8, parameter: 'p', type: 'correction', oldValue: 1, newValue: 2, date: '2025-11-10T00:00:00Z', title: 'Dup', description: 'D', impact: 'positive' }],
    };
    const result = buildSeasonData(eloOutput, [], [], existing);
    expect(result.corrections).toHaveLength(1);
  });
});

// ─── Story 5-4 : promoted + tiebreaker + headToHead ─────────────────────

describe('buildTeamEntry with promoted and tiebreaker', () => {
  it('includes promoted: true when set on elo team', () => {
    const eloTeam = makeEloTeam({ id: 'vannes', promoted: true });
    const entry = buildTeamEntry(eloTeam);
    expect(entry.promoted).toBe(true);
  });

  it('omits promoted when not set on elo team', () => {
    const eloTeam = makeEloTeam({ id: 'toulouse' });
    const entry = buildTeamEntry(eloTeam);
    expect(entry).not.toHaveProperty('promoted');
  });

  it('includes tiebreaker when set on elo team', () => {
    const eloTeam = makeEloTeam({ id: 'toulouse', tiebreaker: 'h2h-1' });
    const entry = buildTeamEntry(eloTeam);
    expect(entry.tiebreaker).toBe('h2h-1');
  });

  it('omits tiebreaker when not set', () => {
    const eloTeam = makeEloTeam({ id: 'toulouse' });
    const entry = buildTeamEntry(eloTeam);
    expect(entry).not.toHaveProperty('tiebreaker');
  });
});

describe('buildSeasonData with headToHead', () => {
  it('includes headToHead in season data when present', () => {
    const eloOutput = makeEloOutput({
      headToHead: [
        {
          teams: ['la-rochelle', 'toulouse'],
          matches: [{ matchday: 5, home: 'la-rochelle', away: 'toulouse', scoreHome: 24, scoreAway: 18 }],
          record: { 'la-rochelle': { w: 1, d: 0, l: 0 }, toulouse: { w: 0, d: 0, l: 1 } },
        },
      ],
    });
    const seasonData = buildSeasonData(eloOutput, []);
    expect(seasonData).toHaveProperty('headToHead');
    expect(seasonData.headToHead).toHaveLength(1);
  });

  it('omits headToHead when array is empty', () => {
    const eloOutput = makeEloOutput({ headToHead: [] });
    const seasonData = buildSeasonData(eloOutput, []);
    expect(seasonData).not.toHaveProperty('headToHead');
  });

  it('omits headToHead when not provided', () => {
    const eloOutput = makeEloOutput();
    const seasonData = buildSeasonData(eloOutput, []);
    expect(seasonData).not.toHaveProperty('headToHead');
  });
});
