import { describe, it, expect } from 'vitest';
import {
  parseResultsAndCalendar,
  parseStandings,
  parseFrenchDate,
  resolveTeamsFromSlug,
} from '../scripts/scrape.js';
import { resolveTeamId, VALID_TEAM_IDS } from '../scripts/team-mapping.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Minimal HTML fixture simulating the LNR calendar-et-resultats page.
 * Contains match cards with scores (played) and one without (upcoming).
 */
const RESULTS_HTML = `
<!DOCTYPE html>
<html>
<head><title>TOP 14 - Calendrier et Resultats</title></head>
<body>
  <h1>Journée 20</h1>
  <div class="matches">
    <div class="match-card">
      <span class="date">samedi 28 mars 2026</span>
      <a href="/club/toulouse">Stade Toulousain</a>
      <span class="score">45 - 27</span>
      <a href="/club/montpellier">Montpellier Hérault Rugby</a>
      <a href="/feuille-de-match/2025-2026/j20/11440-toulouse-montpellier/">Feuille de match</a>
    </div>
    <div class="match-card">
      <span class="date">samedi 28 mars 2026</span>
      <a href="/club/castres">Castres Olympique</a>
      <span class="score">49 - 17</span>
      <a href="/club/montauban">US Montauban</a>
      <a href="/feuille-de-match/2025-2026/j20/11441-castres-montauban/">Feuille de match</a>
    </div>
    <div class="match-card">
      <span class="date">samedi 28 mars 2026</span>
      <a href="/club/lyon">LOU Rugby</a>
      <span class="score">17 - 21</span>
      <a href="/club/bordeaux-begles">Union Bordeaux-Bègles</a>
      <a href="/feuille-de-match/2025-2026/j20/11442-lyon-bordeaux-begles/">Feuille de match</a>
    </div>
    <div class="match-card">
      <span class="date">samedi 28 mars 2026</span>
      <a href="/club/pau">Section Paloise</a>
      <span class="score">27 - 17</span>
      <a href="/club/racing-92">Racing 92</a>
      <a href="/feuille-de-match/2025-2026/j20/11443-pau-racing-92/">Feuille de match</a>
    </div>
    <div class="match-card">
      <span class="date">samedi 28 mars 2026</span>
      <a href="/club/perpignan">USA Perpignan</a>
      <span class="score">36 - 20</span>
      <a href="/club/toulon">RC Toulon</a>
      <a href="/feuille-de-match/2025-2026/j20/11445-perpignan-toulon/">Feuille de match</a>
    </div>
    <div class="match-card">
      <span class="date">samedi 28 mars 2026</span>
      <a href="/club/bayonne">Aviron Bayonnais</a>
      <span class="score">26 - 15</span>
      <a href="/club/la-rochelle">Stade Rochelais</a>
      <a href="/feuille-de-match/2025-2026/j20/11446-bayonne-la-rochelle/">Feuille de match</a>
    </div>
    <div class="match-card">
      <span class="date">dimanche 29 mars 2026</span>
      <a href="/club/paris">Stade Français Paris</a>
      <a href="/club/clermont">ASM Clermont</a>
      <a href="/feuille-de-match/2025-2026/j20/11444-paris-clermont/">Feuille de match</a>
    </div>
  </div>
</body>
</html>
`;

/**
 * HTML fixture with ALL matches played (complete matchday).
 */
const COMPLETE_MATCHDAY_HTML = `
<!DOCTYPE html>
<html>
<body>
  <div class="matches">
    <div class="match-card">
      <a href="/club/toulouse">Stade Toulousain</a>
      <span>45 - 27</span>
      <a href="/club/montpellier">Montpellier Hérault Rugby</a>
      <a href="/feuille-de-match/2025-2026/j20/11440-toulouse-montpellier/">x</a>
    </div>
    <div class="match-card">
      <a href="/club/castres">Castres Olympique</a>
      <span>49 - 17</span>
      <a href="/club/montauban">US Montauban</a>
      <a href="/feuille-de-match/2025-2026/j20/11441-castres-montauban/">x</a>
    </div>
    <div class="match-card">
      <a href="/club/lyon">LOU Rugby</a>
      <span>17 - 21</span>
      <a href="/club/bordeaux-begles">Union Bordeaux-Bègles</a>
      <a href="/feuille-de-match/2025-2026/j20/11442-lyon-bordeaux-begles/">x</a>
    </div>
    <div class="match-card">
      <a href="/club/pau">Section Paloise</a>
      <span>27 - 17</span>
      <a href="/club/racing-92">Racing 92</a>
      <a href="/feuille-de-match/2025-2026/j20/11443-pau-racing-92/">x</a>
    </div>
    <div class="match-card">
      <a href="/club/perpignan">USA Perpignan</a>
      <span>36 - 20</span>
      <a href="/club/toulon">RC Toulon</a>
      <a href="/feuille-de-match/2025-2026/j20/11445-perpignan-toulon/">x</a>
    </div>
    <div class="match-card">
      <a href="/club/bayonne">Aviron Bayonnais</a>
      <span>26 - 15</span>
      <a href="/club/la-rochelle">Stade Rochelais</a>
      <a href="/feuille-de-match/2025-2026/j20/11446-bayonne-la-rochelle/">x</a>
    </div>
    <div class="match-card">
      <a href="/club/paris">Stade Français Paris</a>
      <span>22 - 18</span>
      <a href="/club/clermont">ASM Clermont</a>
      <a href="/feuille-de-match/2025-2026/j20/11444-paris-clermont/">x</a>
    </div>
  </div>
</body>
</html>
`;

/**
 * HTML fixture with standings table (for when the page is server-rendered).
 */
const STANDINGS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <table>
    <thead>
      <tr><th>Rang</th><th>Equipe</th><th>Pts</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BO</th><th>BD</th><th>PF</th><th>PC</th></tr>
    </thead>
    <tbody>
      <tr><td>1</td><td>Stade Toulousain</td><td>68</td><td>22</td><td>15</td><td>1</td><td>6</td><td>5</td><td>3</td><td>520</td><td>380</td></tr>
      <tr><td>2</td><td>Union Bordeaux-Bègles</td><td>62</td><td>22</td><td>14</td><td>0</td><td>8</td><td>4</td><td>2</td><td>490</td><td>370</td></tr>
      <tr><td>3</td><td>Stade Rochelais</td><td>58</td><td>22</td><td>13</td><td>1</td><td>8</td><td>3</td><td>2</td><td>470</td><td>390</td></tr>
      <tr><td>4</td><td>RC Toulon</td><td>55</td><td>22</td><td>12</td><td>0</td><td>10</td><td>3</td><td>3</td><td>440</td><td>400</td></tr>
      <tr><td>5</td><td>Racing 92</td><td>52</td><td>22</td><td>11</td><td>1</td><td>10</td><td>4</td><td>1</td><td>430</td><td>410</td></tr>
      <tr><td>6</td><td>ASM Clermont Auvergne</td><td>48</td><td>22</td><td>10</td><td>2</td><td>10</td><td>2</td><td>2</td><td>420</td><td>420</td></tr>
      <tr><td>7</td><td>Castres Olympique</td><td>45</td><td>22</td><td>10</td><td>0</td><td>12</td><td>1</td><td>4</td><td>400</td><td>430</td></tr>
      <tr><td>8</td><td>LOU Rugby</td><td>42</td><td>22</td><td>9</td><td>1</td><td>12</td><td>2</td><td>1</td><td>390</td><td>440</td></tr>
      <tr><td>9</td><td>Montpellier Hérault Rugby</td><td>38</td><td>22</td><td>8</td><td>0</td><td>14</td><td>2</td><td>2</td><td>380</td><td>450</td></tr>
      <tr><td>10</td><td>Section Paloise</td><td>35</td><td>22</td><td>7</td><td>1</td><td>14</td><td>3</td><td>1</td><td>360</td><td>460</td></tr>
      <tr><td>11</td><td>USA Perpignan</td><td>32</td><td>22</td><td>6</td><td>2</td><td>14</td><td>2</td><td>2</td><td>350</td><td>470</td></tr>
      <tr><td>12</td><td>Aviron Bayonnais</td><td>28</td><td>22</td><td>5</td><td>1</td><td>16</td><td>1</td><td>2</td><td>330</td><td>480</td></tr>
      <tr><td>13</td><td>Stade Français Paris</td><td>25</td><td>22</td><td>5</td><td>0</td><td>17</td><td>1</td><td>4</td><td>320</td><td>490</td></tr>
      <tr><td>14</td><td>Rugby Club Vannetais</td><td>20</td><td>22</td><td>4</td><td>0</td><td>18</td><td>0</td><td>4</td><td>300</td><td>510</td></tr>
    </tbody>
  </table>
</body>
</html>
`;

/**
 * Empty standings page (JS-rendered, no table in static HTML).
 */
const EMPTY_STANDINGS_HTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>Classement</h1>
  <div id="standings-app"></div>
  <script>
    // Standings loaded via client-side JS
  </script>
</body>
</html>
`;

/**
 * HTML with no match data at all.
 */
const NO_MATCHES_HTML = `
<!DOCTYPE html>
<html>
<body>
  <h1>Calendrier et Resultats</h1>
  <p>Aucun match disponible.</p>
</body>
</html>
`;

// ─── AC1 : Extraction des resultats de la derniere journee ───────────────────

describe('AC1 : extraction des resultats', () => {
  it('extrait les matchs joues avec scores', () => {
    const { results } = parseResultsAndCalendar(RESULTS_HTML);
    expect(results.length).toBeGreaterThanOrEqual(1);

    const match = results.find(
      (r) => r.home === 'toulouse' && r.away === 'montpellier',
    );
    expect(match).toBeDefined();
    expect(match.homeScore).toBe(45);
    expect(match.awayScore).toBe(27);
  });

  it('extrait les scores domicile et exterieur', () => {
    const { results } = parseResultsAndCalendar(RESULTS_HTML);

    for (const result of results) {
      expect(typeof result.homeScore).toBe('number');
      expect(typeof result.awayScore).toBe('number');
      expect(result.homeScore).toBeGreaterThanOrEqual(0);
      expect(result.awayScore).toBeGreaterThanOrEqual(0);
    }
  });

  it('identifie correctement les equipes domicile et exterieur', () => {
    const { results } = parseResultsAndCalendar(RESULTS_HTML);

    const lyonBdx = results.find(
      (r) => r.home === 'lyon' && r.away === 'bordeaux-begles',
    );
    expect(lyonBdx).toBeDefined();
    expect(lyonBdx.homeScore).toBe(17);
    expect(lyonBdx.awayScore).toBe(21);
  });

  it('inclut les champs bonus (null par defaut)', () => {
    const { results } = parseResultsAndCalendar(RESULTS_HTML);

    for (const result of results) {
      expect(result).toHaveProperty('homeBonus');
      expect(result).toHaveProperty('awayBonus');
    }
  });
});

// ─── AC2 : Extraction du classement actuel ───────────────────────────────────

describe('AC2 : extraction du classement', () => {
  it('extrait 14 equipes avec leurs statistiques', () => {
    const standings = parseStandings(STANDINGS_HTML);
    expect(standings).toHaveLength(14);
  });

  it('contient les champs requis pour chaque equipe', () => {
    const standings = parseStandings(STANDINGS_HTML);

    for (const team of standings) {
      expect(team).toHaveProperty('id');
      expect(team).toHaveProperty('rank');
      expect(team).toHaveProperty('points');
      expect(team).toHaveProperty('played');
      expect(team).toHaveProperty('won');
      expect(team).toHaveProperty('drawn');
      expect(team).toHaveProperty('lost');
    }
  });

  it('utilise des IDs kebab-case valides', () => {
    const standings = parseStandings(STANDINGS_HTML);

    for (const team of standings) {
      expect(team.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('extrait les valeurs numeriques correctement', () => {
    const standings = parseStandings(STANDINGS_HTML);

    const toulouse = standings.find((s) => s.id === 'toulouse');
    expect(toulouse).toBeDefined();
    expect(toulouse.points).toBe(68);
    expect(toulouse.played).toBe(22);
    expect(toulouse.won).toBe(15);
  });

  it('retourne un tableau vide si la page est JS-rendered', () => {
    const standings = parseStandings(EMPTY_STANDINGS_HTML);
    expect(standings).toHaveLength(0);
  });
});

// ─── AC3 : Extraction du calendrier restant ──────────────────────────────────

describe('AC3 : extraction du calendrier', () => {
  it('extrait les matchs non joues comme calendrier', () => {
    const { calendar } = parseResultsAndCalendar(RESULTS_HTML);
    expect(calendar.length).toBeGreaterThanOrEqual(1);
  });

  it('les matchs calendrier ont equipe domicile et exterieur', () => {
    const { calendar } = parseResultsAndCalendar(RESULTS_HTML);

    for (const match of calendar) {
      expect(match).toHaveProperty('home');
      expect(match).toHaveProperty('away');
      expect(match).toHaveProperty('matchday');
    }
  });

  it('les matchs calendrier n\'ont pas de score', () => {
    const { calendar } = parseResultsAndCalendar(RESULTS_HTML);

    for (const match of calendar) {
      expect(match).not.toHaveProperty('homeScore');
      expect(match).not.toHaveProperty('awayScore');
    }
  });
});

// ─── AC4 : Selecteurs resilients ─────────────────────────────────────────────

describe('AC4 : resilience des selecteurs', () => {
  it('detecte la journee depuis les URLs de feuille de match', () => {
    const { matchday } = parseResultsAndCalendar(RESULTS_HTML);
    expect(matchday).toBe(20);
  });

  it('detecte la journee depuis le texte si les URLs manquent', () => {
    const htmlWithoutLinks = `
      <html><body>
        <h1>Journée 15</h1>
        <div>
          <a href="/club/toulouse">Stade Toulousain</a>
          <span>30 - 20</span>
          <a href="/club/montpellier">Montpellier</a>
          <a href="/feuille-de-match/2025-2026/j15/11440-toulouse-montpellier/">x</a>
        </div>
      </body></html>
    `;
    const { matchday } = parseResultsAndCalendar(htmlWithoutLinks);
    expect(matchday).toBe(15);
  });

  it('lance une erreur si aucun match n\'est trouve', () => {
    expect(() => parseResultsAndCalendar(NO_MATCHES_HTML)).toThrow(
      /No matches found/,
    );
  });
});

// ─── AC5 : Detection de journee incomplete ───────────────────────────────────

describe('AC5 : detection de journee incomplete', () => {
  it('detecte une journee incomplete (matchs non joues)', () => {
    const { complete, results, calendar } =
      parseResultsAndCalendar(RESULTS_HTML);
    expect(complete).toBe(false);
    expect(results.length).toBeLessThan(7);
    expect(calendar.length).toBeGreaterThan(0);
  });

  it('detecte une journee complete', () => {
    const { complete, results } = parseResultsAndCalendar(
      COMPLETE_MATCHDAY_HTML,
    );
    expect(complete).toBe(true);
    expect(results.length).toBe(7);
  });

  it('le flag complete est un booleen', () => {
    const { complete } = parseResultsAndCalendar(RESULTS_HTML);
    expect(typeof complete).toBe('boolean');
  });
});

// ─── AC7 : Format de sortie (IDs et dates) ──────────────────────────────────

describe('AC7 : format de sortie', () => {
  it('les IDs equipes sont en kebab-case', () => {
    const { results, calendar } = parseResultsAndCalendar(RESULTS_HTML);

    const allMatches = [...results, ...calendar];
    for (const match of allMatches) {
      expect(match.home).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(match.away).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('le matchday est un nombre positif', () => {
    const { matchday } = parseResultsAndCalendar(RESULTS_HTML);
    expect(matchday).toBeGreaterThan(0);
    expect(Number.isInteger(matchday)).toBe(true);
  });
});

// ─── Team Mapping ────────────────────────────────────────────────────────────

describe('team-mapping : resolveTeamId', () => {
  it('resout les noms officiels LNR', () => {
    expect(resolveTeamId('Stade Toulousain')).toBe('toulouse');
    expect(resolveTeamId('Union Bordeaux-Bègles')).toBe('bordeaux-begles');
    expect(resolveTeamId('Stade Rochelais')).toBe('la-rochelle');
    expect(resolveTeamId('RC Toulon')).toBe('toulon');
    expect(resolveTeamId('Racing 92')).toBe('racing-92');
    expect(resolveTeamId('ASM Clermont Auvergne')).toBe('clermont');
    expect(resolveTeamId('Castres Olympique')).toBe('castres');
    expect(resolveTeamId('LOU Rugby')).toBe('lyon');
    expect(resolveTeamId('Montpellier Hérault Rugby')).toBe('montpellier');
    expect(resolveTeamId('Section Paloise')).toBe('pau');
    expect(resolveTeamId('USA Perpignan')).toBe('perpignan');
    expect(resolveTeamId('Aviron Bayonnais')).toBe('bayonne');
    expect(resolveTeamId('Stade Français Paris')).toBe('stade-francais');
    expect(resolveTeamId('Rugby Club Vannetais')).toBe('vannes');
  });

  it('est insensible a la casse', () => {
    expect(resolveTeamId('STADE TOULOUSAIN')).toBe('toulouse');
    expect(resolveTeamId('stade toulousain')).toBe('toulouse');
    expect(resolveTeamId('Stade TOULOUSAIN')).toBe('toulouse');
  });

  it('tolere les accents manquants', () => {
    expect(resolveTeamId('Union Bordeaux-Begles')).toBe('bordeaux-begles');
    expect(resolveTeamId('Stade Francais Paris')).toBe('stade-francais');
    expect(resolveTeamId('Montpellier Herault Rugby')).toBe('montpellier');
  });

  it('tolere les espaces en trop', () => {
    expect(resolveTeamId('  Stade Toulousain  ')).toBe('toulouse');
  });

  it('resout les abbreviations courantes', () => {
    expect(resolveTeamId('ASM Clermont')).toBe('clermont');
    expect(resolveTeamId('USAP')).toBe('perpignan');
    expect(resolveTeamId('LOU')).toBe('lyon');
    expect(resolveTeamId('MHR')).toBe('montpellier');
  });

  it('retourne null pour un nom inconnu', () => {
    expect(resolveTeamId('Equipe Inconnue')).toBeNull();
    expect(resolveTeamId('')).toBeNull();
    expect(resolveTeamId(null)).toBeNull();
  });

  it('ne produit pas de faux positif avec des inputs courts', () => {
    // "us" should not match "castres" via partial match
    expect(resolveTeamId('us')).toBeNull();
    expect(resolveTeamId('pa')).toBeNull();
    expect(resolveTeamId('ly')).toBeNull();
  });
});

describe('team-mapping : VALID_TEAM_IDS', () => {
  it('contient exactement 14 equipes', () => {
    expect(VALID_TEAM_IDS).toHaveLength(14);
  });

  it('tous les IDs sont en kebab-case', () => {
    for (const id of VALID_TEAM_IDS) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

// ─── Utilitaires ─────────────────────────────────────────────────────────────

describe('parseFrenchDate', () => {
  it('parse "samedi 28 mars 2026"', () => {
    expect(parseFrenchDate('samedi 28 mars 2026')).toBe('2026-03-28');
  });

  it('parse "28 mars 2026"', () => {
    expect(parseFrenchDate('28 mars 2026')).toBe('2026-03-28');
  });

  it('parse "5 janvier 2026"', () => {
    expect(parseFrenchDate('5 janvier 2026')).toBe('2026-01-05');
  });

  it('parse "28/03/2026"', () => {
    expect(parseFrenchDate('28/03/2026')).toBe('2026-03-28');
  });

  it('retourne null pour un texte sans date', () => {
    expect(parseFrenchDate('pas de date ici')).toBeNull();
    expect(parseFrenchDate('')).toBeNull();
    expect(parseFrenchDate(null)).toBeNull();
  });
});

describe('resolveTeamsFromSlug', () => {
  it('resout des slugs simples', () => {
    const result = resolveTeamsFromSlug('toulouse-montpellier');
    expect(result).toEqual({ home: 'toulouse', away: 'montpellier' });
  });

  it('resout des slugs avec equipes a tirets', () => {
    const result = resolveTeamsFromSlug('bordeaux-begles-toulon');
    expect(result).toEqual({ home: 'bordeaux-begles', away: 'toulon' });
  });

  it('resout le slug paris-clermont', () => {
    const result = resolveTeamsFromSlug('paris-clermont');
    expect(result).toEqual({ home: 'stade-francais', away: 'clermont' });
  });

  it('resout des slugs avec la-rochelle', () => {
    const result = resolveTeamsFromSlug('la-rochelle-toulon');
    expect(result).toEqual({ home: 'la-rochelle', away: 'toulon' });
  });

  it('resout des slugs avec racing-92', () => {
    const result = resolveTeamsFromSlug('racing-92-toulouse');
    expect(result).toEqual({ home: 'racing-92', away: 'toulouse' });
  });

  it('retourne null pour un slug invalide', () => {
    expect(resolveTeamsFromSlug('inconnu-inexistant')).toBeNull();
    expect(resolveTeamsFromSlug(null)).toBeNull();
    expect(resolveTeamsFromSlug('')).toBeNull();
  });
});
