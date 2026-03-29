import { describe, it, expect } from 'vitest';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const DATA_DIR = resolve(import.meta.dirname, '..', 'data');

const seasonData = JSON.parse(readFileSync(resolve(DATA_DIR, '2025-2026.json'), 'utf-8'));
const seasonsIndex = JSON.parse(readFileSync(resolve(DATA_DIR, 'seasons.json'), 'utf-8'));

const EXPECTED_TEAM_IDS = [
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

const KEBAB_CASE_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

// --- AC1 : Fichier JSON de saison avec donnees d'exemple ---

describe('AC1 : structure racine du fichier de saison', () => {
  it('contient tous les champs racine requis', () => {
    expect(seasonData).toHaveProperty('season');
    expect(seasonData).toHaveProperty('lastUpdated');
    expect(seasonData).toHaveProperty('matchday');
    expect(seasonData).toHaveProperty('brierScore');
    expect(seasonData).toHaveProperty('teams');
    expect(seasonData).toHaveProperty('calendar');
    expect(seasonData).toHaveProperty('predictions');
  });

  it('season est une chaine de format YYYY-YYYY', () => {
    expect(seasonData.season).toMatch(/^\d{4}-\d{4}$/);
  });

  it('lastUpdated est en ISO 8601', () => {
    expect(seasonData.lastUpdated).toMatch(ISO_8601_RE);
  });

  it('matchday est un entier positif', () => {
    expect(Number.isInteger(seasonData.matchday)).toBe(true);
    expect(seasonData.matchday).toBeGreaterThan(0);
  });

  it('brierScore est null ou un decimal entre 0 et 1', () => {
    if (seasonData.brierScore !== null) {
      expect(seasonData.brierScore).toBeGreaterThanOrEqual(0);
      expect(seasonData.brierScore).toBeLessThanOrEqual(1);
    } else {
      expect(seasonData.brierScore).toBeNull();
    }
  });

  it('les champs JSON sont en camelCase (pas de snake_case ni PascalCase)', () => {
    const topKeys = Object.keys(seasonData);
    for (const key of topKeys) {
      expect(key).not.toMatch(/_/);
      expect(key[0]).toBe(key[0].toLowerCase());
    }
  });
});

// --- AC2 : Index des saisons ---

describe('AC2 : fichier seasons.json', () => {
  it('contient un tableau seasons', () => {
    expect(Array.isArray(seasonsIndex.seasons)).toBe(true);
    expect(seasonsIndex.seasons.length).toBeGreaterThan(0);
  });

  it('chaque saison a id, label, current', () => {
    for (const s of seasonsIndex.seasons) {
      expect(s).toHaveProperty('id');
      expect(s).toHaveProperty('label');
      expect(s).toHaveProperty('current');
    }
  });

  it('la saison 2025-2026 est presente et courante', () => {
    const current = seasonsIndex.seasons.find((s) => s.id === '2025-2026');
    expect(current).toBeDefined();
    expect(current.current).toBe(true);
    expect(current.label).toBe('Saison 2025-2026');
  });
});

// --- AC3 : Completude des donnees d'equipe ---

describe('AC3 : donnees des equipes', () => {
  it('contient exactement 14 equipes', () => {
    expect(seasonData.teams).toHaveLength(14);
  });

  it('toutes les equipes attendues sont presentes', () => {
    const ids = seasonData.teams.map((t) => t.id);
    for (const expectedId of EXPECTED_TEAM_IDS) {
      expect(ids).toContain(expectedId);
    }
  });

  it('les IDs equipes sont en kebab-case', () => {
    for (const team of seasonData.teams) {
      expect(team.id).toMatch(KEBAB_CASE_RE);
    }
  });

  it.each(EXPECTED_TEAM_IDS)('equipe "%s" a tous les champs requis', (teamId) => {
    const team = seasonData.teams.find((t) => t.id === teamId);
    expect(team).toBeDefined();

    // id: string kebab-case
    expect(typeof team.id).toBe('string');
    expect(team.id).toMatch(KEBAB_CASE_RE);

    // name: string
    expect(typeof team.name).toBe('string');
    expect(team.name.length).toBeGreaterThan(0);

    // currentRank: integer 1-14
    expect(Number.isInteger(team.currentRank)).toBe(true);
    expect(team.currentRank).toBeGreaterThanOrEqual(1);
    expect(team.currentRank).toBeLessThanOrEqual(14);

    // projectedRank: integer 1-14
    expect(Number.isInteger(team.projectedRank)).toBe(true);
    expect(team.projectedRank).toBeGreaterThanOrEqual(1);
    expect(team.projectedRank).toBeLessThanOrEqual(14);

    // elo: integer
    expect(Number.isInteger(team.elo)).toBe(true);

    // confidence: decimal 0-1
    expect(typeof team.confidence).toBe('number');
    expect(team.confidence).toBeGreaterThanOrEqual(0);
    expect(team.confidence).toBeLessThanOrEqual(1);

    // zones: objet avec 4 cles decimales 0-1
    expect(team.zones).toBeDefined();
    expect(typeof team.zones.europe).toBe('number');
    expect(typeof team.zones.top6).toBe('number');
    expect(typeof team.zones.mid).toBe('number');
    expect(typeof team.zones.relegation).toBe('number');

    for (const key of ['europe', 'top6', 'mid', 'relegation']) {
      expect(team.zones[key]).toBeGreaterThanOrEqual(0);
      expect(team.zones[key]).toBeLessThanOrEqual(1);
    }

    // zones somment a ~1.0
    const zoneSum = team.zones.europe + team.zones.top6 + team.zones.mid + team.zones.relegation;
    expect(zoneSum).toBeCloseTo(1.0, 1);

    // form: array de 5 elements W/L/D
    expect(Array.isArray(team.form)).toBe(true);
    expect(team.form).toHaveLength(5);
    for (const f of team.form) {
      expect(['W', 'L', 'D']).toContain(f);
    }

    // trend: enum
    expect(['up', 'down', 'stable']).toContain(team.trend);
  });

  it('les currentRank sont uniques (1 a 14)', () => {
    const ranks = seasonData.teams.map((t) => t.currentRank).sort((a, b) => a - b);
    expect(ranks).toEqual(Array.from({ length: 14 }, (_, i) => i + 1));
  });

  it('les probabilites sont en decimales 0-1 (pas de pourcentages)', () => {
    for (const team of seasonData.teams) {
      expect(team.confidence).toBeLessThanOrEqual(1);
      for (const key of ['europe', 'top6', 'mid', 'relegation']) {
        expect(team.zones[key]).toBeLessThanOrEqual(1);
      }
    }
  });
});

// --- AC4 : Structure du calendrier ---

describe('AC4 : structure du calendrier', () => {
  it('calendar est un tableau non vide', () => {
    expect(Array.isArray(seasonData.calendar)).toBe(true);
    expect(seasonData.calendar.length).toBeGreaterThan(0);
  });

  it.each(seasonData.calendar.map((c, i) => [i, c]))('entree calendrier %i a tous les champs requis', (_i, entry) => {
    // matchday: integer
    expect(Number.isInteger(entry.matchday)).toBe(true);
    expect(entry.matchday).toBeGreaterThan(0);

    // date: ISO 8601
    expect(typeof entry.date).toBe('string');
    expect(entry.date).toMatch(ISO_8601_RE);

    // home: team ID kebab-case
    expect(typeof entry.home).toBe('string');
    expect(entry.home).toMatch(KEBAB_CASE_RE);

    // away: team ID kebab-case
    expect(typeof entry.away).toBe('string');
    expect(entry.away).toMatch(KEBAB_CASE_RE);

    // difficulty: decimal 0-1
    expect(typeof entry.difficulty).toBe('number');
    expect(entry.difficulty).toBeGreaterThanOrEqual(0);
    expect(entry.difficulty).toBeLessThanOrEqual(1);
  });

  it('les team IDs du calendrier existent dans teams[]', () => {
    const teamIds = seasonData.teams.map((t) => t.id);
    for (const entry of seasonData.calendar) {
      expect(teamIds).toContain(entry.home);
      expect(teamIds).toContain(entry.away);
    }
  });
});

// --- AC5 : Structure des predictions ---

describe('AC5 : structure des predictions', () => {
  it('predictions est un tableau non vide', () => {
    expect(Array.isArray(seasonData.predictions)).toBe(true);
    expect(seasonData.predictions.length).toBeGreaterThan(0);
  });

  it('chaque prediction a matchday, date et projections[]', () => {
    for (const pred of seasonData.predictions) {
      expect(Number.isInteger(pred.matchday)).toBe(true);
      expect(pred.matchday).toBeGreaterThan(0);

      expect(typeof pred.date).toBe('string');
      expect(pred.date).toMatch(ISO_8601_RE);

      expect(Array.isArray(pred.projections)).toBe(true);
      expect(pred.projections.length).toBeGreaterThan(0);
    }
  });

  it('chaque projection a teamId, projectedRank et confidence', () => {
    for (const pred of seasonData.predictions) {
      for (const proj of pred.projections) {
        expect(typeof proj.teamId).toBe('string');
        expect(proj.teamId).toMatch(KEBAB_CASE_RE);

        expect(Number.isInteger(proj.projectedRank)).toBe(true);
        expect(proj.projectedRank).toBeGreaterThanOrEqual(1);
        expect(proj.projectedRank).toBeLessThanOrEqual(14);

        expect(typeof proj.confidence).toBe('number');
        expect(proj.confidence).toBeGreaterThanOrEqual(0);
        expect(proj.confidence).toBeLessThanOrEqual(1);
      }
    }
  });

  it('les teamId des projections existent dans teams[]', () => {
    const teamIds = seasonData.teams.map((t) => t.id);
    for (const pred of seasonData.predictions) {
      for (const proj of pred.projections) {
        expect(teamIds).toContain(proj.teamId);
      }
    }
  });
});

// --- AC6 : Budget taille ---

describe('AC6 : budget taille du fichier', () => {
  it('le fichier 2025-2026.json fait moins de 50Ko', () => {
    const filePath = resolve(DATA_DIR, '2025-2026.json');
    const stats = statSync(filePath);
    const sizeKo = stats.size / 1024;
    expect(sizeKo).toBeLessThan(50);
  });
});
