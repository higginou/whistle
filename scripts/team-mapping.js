/**
 * Mapping between LNR display names and internal kebab-case team IDs.
 * Used by scrape.js and potentially other pipeline scripts.
 *
 * Each entry maps a normalized (lowercase, no accents) LNR name to the
 * internal ID defined in data/2025-2026.json (Story 1.2).
 */

/** @type {Record<string, string>} */
const TEAM_NAME_TO_ID = {
  // Exact matches (normalized)
  'stade toulousain': 'toulouse',
  'toulouse': 'toulouse',
  'union bordeaux-begles': 'bordeaux-begles',
  'bordeaux-begles': 'bordeaux-begles',
  'ub bordeaux-begles': 'bordeaux-begles',
  'stade rochelais': 'la-rochelle',
  'la rochelle': 'la-rochelle',
  'rc toulon': 'toulon',
  'toulon': 'toulon',
  'racing 92': 'racing-92',
  'asm clermont auvergne': 'clermont',
  'asm clermont': 'clermont',
  'clermont': 'clermont',
  'castres olympique': 'castres',
  'castres': 'castres',
  'lou rugby': 'lyon',
  'lyon': 'lyon',
  'lou': 'lyon',
  'montpellier herault rugby': 'montpellier',
  'montpellier herault': 'montpellier',
  'montpellier': 'montpellier',
  'mhr': 'montpellier',
  'section paloise': 'pau',
  'pau': 'pau',
  'usa perpignan': 'perpignan',
  'perpignan': 'perpignan',
  'usap': 'perpignan',
  'aviron bayonnais': 'bayonne',
  'bayonne': 'bayonne',
  'stade francais paris': 'stade-francais',
  'stade francais': 'stade-francais',
  'paris': 'stade-francais',
  'rugby club vannetais': 'vannes',
  'rc vannes': 'vannes',
  'vannes': 'vannes',
  // 2025-2026 promoted team alternative
  'us montauban': 'montauban',
  'montauban': 'montauban',
};

/**
 * Remove diacritics (accents) from a string.
 * @param {string} str
 * @returns {string}
 */
function removeDiacritics(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Resolve an LNR team name to its internal kebab-case ID.
 * Tolerant to accents, casing, and minor variations.
 *
 * @param {string} lnrName - Team name as displayed on LNR
 * @returns {string|null} Internal team ID or null if unrecognized
 */
export function resolveTeamId(lnrName) {
  if (!lnrName || typeof lnrName !== 'string') return null;

  const normalized = removeDiacritics(lnrName).toLowerCase().trim();

  // Direct lookup
  if (TEAM_NAME_TO_ID[normalized]) {
    return TEAM_NAME_TO_ID[normalized];
  }

  // Partial match fallback: check if any key is contained in the input
  // Guard: require minimum 5 chars to avoid false positives (e.g., "us" matching "castres")
  if (normalized.length >= 5) {
    for (const [key, id] of Object.entries(TEAM_NAME_TO_ID)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return id;
      }
    }
  }

  return null;
}

/**
 * List of all valid internal team IDs for the current season.
 * @type {string[]}
 */
export const VALID_TEAM_IDS = [
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
  'perpignan',
  'bayonne',
  'stade-francais',
  'vannes',
];

export { TEAM_NAME_TO_ID };
