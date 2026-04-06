import { describe, it, expect } from 'vitest';
import {
  parseRugbyramaCalendar,
  parseIdalgoDate,
  parseMatchPage,
} from '../scripts/scrape-rugbyrama.js';
import { resolveIdalgoSlug, IDALGO_SLUG_TO_ID } from '../scripts/team-mapping.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

/**
 * Minimal HTML fixture simulating the Rugbyrama calendar page.
 * Contains played matches (data-state="1") and upcoming (data-state="0").
 * Uses the real idalgo class names from the spike analysis.
 */
const CALENDAR_HTML = `
<!DOCTYPE html>
<html lang="fr">
<body>
<div class="div_idalgo_content_calendar_cup">
<ul class="ul_idalgo_content_calendar_cup_date">
<li class="li_idalgo_content_calendar_cup_date">
  <div class="div_idalgo_content_calendar_cup_date_title">
    <span class="span_idalgo_content_calendar_cup_date_title_left">Samedi  6 septembre 2025</span>
  </div>
  <ul class="ul_idalgo_content_calendar_cup_date_match">
    <li class="li_idalgo_content_calendar_cup_date_match" data-localteam="17" data-visitorteam="20" data-state="1" data-round="1539">
      <div class="div_idalgo_content_calendar_cup_date_match_hour">
        <span class="idalgo_date_timezone" data-value-default="Sat Sep 06 2025 13:00:00 +0200" data-format="%H:%M">13:00</span>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_local">
        <a class="a_idalgo_content_calendar_cup_date_match_local idalgo_team_winner" href="/resultats/rugby/equipe/17/stade-francais" title="Stade Fran&ccedil;ais">Stade Fran&ccedil;ais</a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_score">
        <a class="a_idalgo_content_calendar_cup_date_match_score a_idalgo_content_result_match_score_end" href="/resultats/rugby/top-14/phase-reguliere/rencontre/55924/stade-francais-montauban">
          <span class="span_idalgo_score_part_left">47</span>
          <span class="span_idalgo_score_part_center">-</span>
          <span class="span_idalgo_score_part_right">24</span>
        </a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_visitor">
        <a class="a_idalgo_content_calendar_cup_date_match_visitor" href="/resultats/rugby/equipe/20/montauban" title="Montauban">Montauban</a>
      </div>
    </li>
    <li class="li_idalgo_content_calendar_cup_date_match" data-localteam="158" data-visitorteam="186" data-state="1" data-round="1539">
      <div class="div_idalgo_content_calendar_cup_date_match_hour">
        <span class="idalgo_date_timezone" data-value-default="Sat Sep 06 2025 21:05:00 +0200" data-format="%H:%M">21:05</span>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_local">
        <a class="a_idalgo_content_calendar_cup_date_match_local idalgo_team_winner" href="/resultats/rugby/equipe/158/bordeaux-begles" title="Bordeaux-B&egrave;gles">Bordeaux-B&egrave;gles</a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_score">
        <a class="a_idalgo_content_calendar_cup_date_match_score a_idalgo_content_result_match_score_end" href="/resultats/rugby/top-14/phase-reguliere/rencontre/55925/bordeaux-begles-la-rochelle">
          <span class="span_idalgo_score_part_left">23</span>
          <span class="span_idalgo_score_part_center">-</span>
          <span class="span_idalgo_score_part_right">18</span>
        </a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_visitor">
        <a class="a_idalgo_content_calendar_cup_date_match_visitor" href="/resultats/rugby/equipe/186/la-rochelle" title="La Rochelle">La Rochelle</a>
      </div>
    </li>
  </ul>
</li>
</ul>

<!-- Round 2: one played, one upcoming -->
<ul class="ul_idalgo_content_calendar_cup_date">
<li class="li_idalgo_content_calendar_cup_date">
  <div class="div_idalgo_content_calendar_cup_date_title">
    <span class="span_idalgo_content_calendar_cup_date_title_left">Samedi 13 septembre 2025</span>
  </div>
  <ul class="ul_idalgo_content_calendar_cup_date_match">
    <li class="li_idalgo_content_calendar_cup_date_match" data-localteam="186" data-visitorteam="18" data-state="1" data-round="1540">
      <div class="div_idalgo_content_calendar_cup_date_match_hour">
        <span class="idalgo_date_timezone" data-value-default="Sat Sep 13 2025 21:05:00 +0200" data-format="%H:%M">21:05</span>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_local">
        <a class="a_idalgo_content_calendar_cup_date_match_local" href="/resultats/rugby/equipe/186/la-rochelle" title="La Rochelle">La Rochelle</a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_score">
        <a class="a_idalgo_content_calendar_cup_date_match_score a_idalgo_content_result_match_score_end" href="/resultats/rugby/top-14/phase-reguliere/rencontre/55930/la-rochelle-stade-toulousain">
          <span class="span_idalgo_score_part_left">22</span>
          <span class="span_idalgo_score_part_center">-</span>
          <span class="span_idalgo_score_part_right">19</span>
        </a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_visitor">
        <a class="a_idalgo_content_calendar_cup_date_match_visitor" href="/resultats/rugby/equipe/18/stade-toulousain" title="Stade Toulousain">Stade Toulousain</a>
      </div>
    </li>
    <li class="li_idalgo_content_calendar_cup_date_match" data-localteam="98" data-visitorteam="11" data-state="0" data-round="1540">
      <div class="div_idalgo_content_calendar_cup_date_match_hour">
        <span class="idalgo_date_timezone" data-value-default="Sun Sep 14 2025 15:00:00 +0200" data-format="%H:%M">15:00</span>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_local">
        <a class="a_idalgo_content_calendar_cup_date_match_local" href="/resultats/rugby/equipe/98/toulon" title="Toulon">Toulon</a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_score">
        <a class="a_idalgo_content_calendar_cup_date_match_score" href="/resultats/rugby/top-14/phase-reguliere/rencontre/55931/toulon-castres"></a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_visitor">
        <a class="a_idalgo_content_calendar_cup_date_match_visitor" href="/resultats/rugby/equipe/11/castres" title="Castres">Castres</a>
      </div>
    </li>
  </ul>
</li>
</ul>
</div>
</body>
</html>
`;

/**
 * HTML with no matches at all.
 */
const EMPTY_HTML = `
<!DOCTYPE html>
<html lang="fr">
<body>
  <div class="div_idalgo_content_calendar_cup"></div>
</body>
</html>
`;

/**
 * Minimal HTML fixture simulating a Rugbyrama individual match page.
 * Mirrors the real idalgo class structure from the Stade Français vs Montauban match (id 55924).
 *
 * Key structure:
 *   - Two .div_idalgo_content_rugby_match_header_full_main_header_bonus divs (home then away)
 *   - Inside each: span _bonus_content_defense (BD) and span _bonus_content_try (BO)
 *     Active = style="display:block;" / Inactive = style="display:none;"
 *   - .div_idalgo_dom_event_match_center_team_list_count > span: "N Essais"
 *     First occurrence = home, second = away
 *
 * Fixture scenario: home has BO (7 tries), away has BD (lost by 3 pts), neither has the other.
 */
const MATCH_PAGE_HTML = `
<!DOCTYPE html>
<html lang="fr">
<body>
<div class="div_idalgo_content_match_header_full_main_header" id="idalgo_content_rugby_match_header_full" data-status="1" data-match="55924">
  <div class="div_idalgo_content_match_header_full_main_header_local">
    <div class="div_idalgo_content_match_header_full_main_header_local_cnt">
      <img alt="Stade Français">
    </div>
  </div>
  <div class="div_idalgo_content_rugby_match_header_full_main_header_bonus">
    <div class="div_idalgo_content_rugby_match_header_full_main_header_bonus_content">
      <span class="span_idalgo_content_rugby_match_header_full_main_header_bonus_content_defense" style="display:none;">BD</span>
      <span class="span_idalgo_content_rugby_match_header_full_main_header_bonus_content_try" style="display:block;">BO</span>
    </div>
  </div>
  <div class="div_idalgo_content_match_header_full_main_header_local_side">
    <div class="div_idalgo_dom_event_match_center_team_list_count" data-try="__numTry__ Essai"><span>7 Essais</span></div>
  </div>
  <div class="div_idalgo_content_match_header_full_main_header_visitor">
    <div class="div_idalgo_content_match_header_full_main_header_visitor_cnt">
      <img alt="Montauban">
    </div>
  </div>
  <div class="div_idalgo_content_rugby_match_header_full_main_header_bonus">
    <div class="div_idalgo_content_rugby_match_header_full_main_header_bonus_content">
      <span class="span_idalgo_content_rugby_match_header_full_main_header_bonus_content_defense" style="display:block;">BD</span>
      <span class="span_idalgo_content_rugby_match_header_full_main_header_bonus_content_try" style="display:none;">BO</span>
    </div>
  </div>
  <div class="div_idalgo_content_match_header_full_main_header_visitor_side">
    <div class="div_idalgo_dom_event_match_center_team_list_count" data-try="__numTry__ Essai"><span>4 Essais</span></div>
  </div>
</div>
</body>
</html>
`;

// ─── parseIdalgoDate ─────────────────────────────────────────────────────────

describe('parseIdalgoDate', () => {
  it('parse un datetime idalgo complet', () => {
    expect(parseIdalgoDate('Sat Sep 06 2025 21:05:00 +0200')).toBe(
      '2025-09-06',
    );
  });

  it('parse un datetime avec timezone differente', () => {
    expect(parseIdalgoDate('Sun Mar 29 2026 21:05:00 +0200')).toBe(
      '2026-03-29',
    );
  });

  it('retourne une chaine vide pour un input vide', () => {
    expect(parseIdalgoDate('')).toBe('');
    expect(parseIdalgoDate(null)).toBe('');
    expect(parseIdalgoDate(undefined)).toBe('');
  });

  it('retourne une chaine vide pour un format invalide', () => {
    expect(parseIdalgoDate('pas une date')).toBe('');
  });
});

// ─── resolveIdalgoSlug ───────────────────────────────────────────────────────

describe('resolveIdalgoSlug', () => {
  it('resout les slugs directs', () => {
    expect(resolveIdalgoSlug('clermont')).toBe('clermont');
    expect(resolveIdalgoSlug('bayonne')).toBe('bayonne');
    expect(resolveIdalgoSlug('toulon')).toBe('toulon');
  });

  it('resout stade-toulousain en toulouse', () => {
    expect(resolveIdalgoSlug('stade-toulousain')).toBe('toulouse');
  });

  it('resout les slugs avec tirets', () => {
    expect(resolveIdalgoSlug('bordeaux-begles')).toBe('bordeaux-begles');
    expect(resolveIdalgoSlug('la-rochelle')).toBe('la-rochelle');
    expect(resolveIdalgoSlug('racing-92')).toBe('racing-92');
    expect(resolveIdalgoSlug('stade-francais')).toBe('stade-francais');
  });

  it('retourne null pour un slug inconnu', () => {
    expect(resolveIdalgoSlug('equipe-inconnue')).toBeNull();
    expect(resolveIdalgoSlug('')).toBeNull();
    expect(resolveIdalgoSlug(null)).toBeNull();
  });

  it('couvre toutes les equipes de VALID_TEAM_IDS', () => {
    const coveredIds = new Set(Object.values(IDALGO_SLUG_TO_ID));
    // vannes may not be in current season but should be mapped
    expect(coveredIds.size).toBeGreaterThanOrEqual(14);
  });
});

// ─── parseRugbyramaCalendar ──────────────────────────────────────────────────

describe('parseRugbyramaCalendar : extraction des resultats', () => {
  it('extrait les matchs joues avec scores', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);
    expect(results.length).toBe(3);

    const sfMontauban = results.find(
      (r) => r.home === 'stade-francais' && r.away === 'montauban',
    );
    expect(sfMontauban).toBeDefined();
    expect(sfMontauban.homeScore).toBe(47);
    expect(sfMontauban.awayScore).toBe(24);
  });

  it('extrait les dates ISO correctement', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);

    const sfMontauban = results.find(
      (r) => r.home === 'stade-francais' && r.away === 'montauban',
    );
    expect(sfMontauban.date).toBe('2025-09-06');
  });

  it('identifie les equipes domicile et exterieur', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);

    const bdxLr = results.find(
      (r) => r.home === 'bordeaux-begles' && r.away === 'la-rochelle',
    );
    expect(bdxLr).toBeDefined();
    expect(bdxLr.homeScore).toBe(23);
    expect(bdxLr.awayScore).toBe(18);
  });

  it('resout stade-toulousain correctement', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);

    const lrToulouse = results.find(
      (r) => r.home === 'la-rochelle' && r.away === 'toulouse',
    );
    expect(lrToulouse).toBeDefined();
    expect(lrToulouse.homeScore).toBe(22);
    expect(lrToulouse.awayScore).toBe(19);
  });

  it('inclut les champs bonus (null par defaut)', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);

    for (const result of results) {
      expect(result).toHaveProperty('homeBonus', null);
      expect(result).toHaveProperty('awayBonus', null);
    }
  });

  it('extrait matchUrl pour les matchs joues', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);

    const sfMontauban = results.find(
      (r) => r.home === 'stade-francais' && r.away === 'montauban',
    );
    expect(sfMontauban.matchUrl).toBe(
      '/resultats/rugby/top-14/phase-reguliere/rencontre/55924/stade-francais-montauban',
    );
  });

  it('extrait matchUrl pour tous les matchs joues', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);
    for (const r of results) {
      expect(typeof r.matchUrl).toBe('string');
      expect(r.matchUrl).toMatch(/\/rencontre\/\d+\//);
    }
  });

  it('inclut homeTries et awayTries null par defaut', () => {
    const { results } = parseRugbyramaCalendar(CALENDAR_HTML);
    for (const r of results) {
      expect(r).toHaveProperty('homeTries', null);
      expect(r).toHaveProperty('awayTries', null);
    }
  });

  it('matchUrl est null si le lien de score est absent', () => {
    const html = `
<!DOCTYPE html><html lang="fr"><body>
<div class="div_idalgo_content_calendar_cup">
<ul class="ul_idalgo_content_calendar_cup_date">
<li class="li_idalgo_content_calendar_cup_date">
  <div class="div_idalgo_content_calendar_cup_date_title">
    <span class="span_idalgo_content_calendar_cup_date_title_left">Samedi  6 septembre 2025</span>
  </div>
  <ul class="ul_idalgo_content_calendar_cup_date_match">
    <li class="li_idalgo_content_calendar_cup_date_match" data-localteam="98" data-visitorteam="11" data-state="1" data-round="1539">
      <div class="div_idalgo_content_calendar_cup_date_match_hour">
        <span class="idalgo_date_timezone" data-value-default="Sat Sep 06 2025 15:00:00 +0200" data-format="%H:%M">15:00</span>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_local">
        <a class="a_idalgo_content_calendar_cup_date_match_local" href="/resultats/rugby/equipe/98/toulon" title="Toulon">Toulon</a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_score">
        <a class="a_idalgo_content_calendar_cup_date_match_score a_idalgo_content_result_match_score_end">
          <span class="span_idalgo_score_part_left">30</span>
          <span class="span_idalgo_score_part_center">-</span>
          <span class="span_idalgo_score_part_right">10</span>
        </a>
      </div>
      <div class="div_idalgo_content_calendar_cup_date_match_visitor">
        <a class="a_idalgo_content_calendar_cup_date_match_visitor" href="/resultats/rugby/equipe/11/castres" title="Castres">Castres</a>
      </div>
    </li>
  </ul>
</li>
</ul>
</div>
</body></html>`;
    const { results } = parseRugbyramaCalendar(html);
    expect(results[0].matchUrl).toBeNull();
  });
});

describe('parseRugbyramaCalendar : extraction du calendrier', () => {
  it('extrait les matchs non joues comme calendrier', () => {
    const { calendar } = parseRugbyramaCalendar(CALENDAR_HTML);
    expect(calendar.length).toBe(1);

    const match = calendar[0];
    expect(match.home).toBe('toulon');
    expect(match.away).toBe('castres');
  });

  it('les matchs calendrier ont une date', () => {
    const { calendar } = parseRugbyramaCalendar(CALENDAR_HTML);

    for (const match of calendar) {
      expect(match.date).toBeTruthy();
    }
  });

  it('les matchs calendrier n\'ont pas de score', () => {
    const { calendar } = parseRugbyramaCalendar(CALENDAR_HTML);

    for (const match of calendar) {
      expect(match).not.toHaveProperty('homeScore');
      expect(match).not.toHaveProperty('awayScore');
    }
  });

  it('les matchs calendrier n\'ont pas de matchUrl', () => {
    const { calendar } = parseRugbyramaCalendar(CALENDAR_HTML);
    for (const m of calendar) {
      expect(m).not.toHaveProperty('matchUrl');
    }
  });
});

describe('parseRugbyramaCalendar : matchday et completude', () => {
  it('assigne les numeros de journee correctement', () => {
    const { results, calendar } = parseRugbyramaCalendar(CALENDAR_HTML);

    // Round 1539 → matchday 1
    const sfMontauban = results.find(
      (r) => r.home === 'stade-francais' && r.away === 'montauban',
    );
    expect(sfMontauban.matchday).toBe(1);

    // Round 1540 → matchday 2
    const lrToulouse = results.find(
      (r) => r.home === 'la-rochelle' && r.away === 'toulouse',
    );
    expect(lrToulouse.matchday).toBe(2);

    // Upcoming match also matchday 2
    expect(calendar[0].matchday).toBe(2);
  });

  it('detecte le matchday courant', () => {
    const { matchday } = parseRugbyramaCalendar(CALENDAR_HTML);
    // Matchday 2 has played matches, so it's the current one
    expect(matchday).toBe(2);
  });

  it('detecte une journee incomplete', () => {
    const { complete } = parseRugbyramaCalendar(CALENDAR_HTML);
    // Round 2 has 1 played + 1 upcoming = incomplete
    expect(complete).toBe(false);
  });

  it('le flag complete est un booleen', () => {
    const { complete } = parseRugbyramaCalendar(CALENDAR_HTML);
    expect(typeof complete).toBe('boolean');
  });
});

describe('parseRugbyramaCalendar : resilience', () => {
  it('lance une erreur si aucun match n\'est trouve', () => {
    expect(() => parseRugbyramaCalendar(EMPTY_HTML)).toThrow(
      /No matches found/,
    );
  });

  it('les IDs equipes sont en kebab-case', () => {
    const { results, calendar } = parseRugbyramaCalendar(CALENDAR_HTML);

    for (const match of [...results, ...calendar]) {
      expect(match.home).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(match.away).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });
});

// ─── parseMatchPage ──────────────────────────────────────────────────────────

describe('parseMatchPage', () => {
  it('extrait les bonus offensifs et defensifs', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    expect(result).not.toBeNull();
    expect(result.homeBonus).toEqual({ offensive: true, defensive: false });
    expect(result.awayBonus).toEqual({ offensive: false, defensive: true });
  });

  it('extrait le nombre d\'essais', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    expect(typeof result.homeTries).toBe('number');
    expect(typeof result.awayTries).toBe('number');
    expect(result.homeTries).toBeGreaterThanOrEqual(0);
    expect(result.awayTries).toBeGreaterThanOrEqual(0);
  });

  it('extrait les valeurs correctes du fixture', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    expect(result.homeTries).toBe(7);
    expect(result.awayTries).toBe(4);
  });

  it('retourne null si le parsing echoue (page vide)', () => {
    const result = parseMatchPage('<html><body></body></html>');
    expect(result).toBeNull();
  });

  it('retourne null si un seul bloc bonus est present', () => {
    const html = `
    <!DOCTYPE html><html><body>
    <div class="div_idalgo_content_rugby_match_header_full_main_header_bonus">
      <span class="span_idalgo_content_rugby_match_header_full_main_header_bonus_content_defense" style="display:none;"></span>
      <span class="span_idalgo_content_rugby_match_header_full_main_header_bonus_content_try" style="display:block;"></span>
    </div>
    </body></html>
  `;
    expect(parseMatchPage(html)).toBeNull();
  });

  it('reconnait display: block avec espace apres le colon', () => {
    const html = MATCH_PAGE_HTML.replace(/display:block/g, 'display: block');
    const result = parseMatchPage(html);
    expect(result).not.toBeNull();
    expect(result.homeBonus.offensive).toBe(true);
  });

  it('retourne homeBonus et awayBonus avec des booleens', () => {
    const result = parseMatchPage(MATCH_PAGE_HTML);
    expect(result).not.toBeNull();
    expect(typeof result.homeBonus.offensive).toBe('boolean');
    expect(typeof result.homeBonus.defensive).toBe('boolean');
    expect(typeof result.awayBonus.offensive).toBe('boolean');
    expect(typeof result.awayBonus.defensive).toBe('boolean');
  });
});
