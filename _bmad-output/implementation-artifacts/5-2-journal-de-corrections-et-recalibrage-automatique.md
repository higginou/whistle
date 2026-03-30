# Story 5.2 : Journal de corrections et recalibrage automatique

Status: review

ui-structural: true

## Story

En tant qu'utilisateur,
Je veux consulter le journal des corrections du modele et voir ses recalibrages,
Afin de comprendre comment il apprend de ses erreurs.

## Acceptance Criteria (BDD)

1. **Journal visible dans Oracle** — quand l'utilisateur est sur l'onglet Oracle, une section "Journal de l'Oracle" est visible apres les cartes facteurs, accessible via un tap sur "En savoir plus" (progressive disclosure — collapsed par defaut)
2. **Entrees du journal** — chaque correction est documentee avec : quoi a change, pourquoi, quel impact (FR28). Chaque entree est une carte avec date, titre, description, et un badge impact (positif/neutre/negatif)
3. **Ton editorial** — le ton est humble et intrigant, style journal de bord d'un oracle ("Mi-saison : facteur domicile recalibre de 1.2 a 1.35 pour La Rochelle — l'Oracle apprend que Marcel Deflandre est une forteresse")
4. **Donnees depuis JSON** — le journal est lu depuis un nouveau champ `season.corrections[]` dans le JSON. Chaque entree : `{ "matchday": number, "date": "ISO", "title": string, "description": string, "impact": "positive"|"neutral"|"negative", "parameter": string, "oldValue": number, "newValue": number }`
5. **Extension du pipeline** — le script `generate.js` est etendu pour inclure le champ `corrections[]` dans le JSON de saison. Pour l'instant, le tableau est peuple avec des entrees statiques coherentes (pas de detection automatique — c'est du contenu editorial). Au moins 3 entrees d'exemple pour la saison en cours.
6. **Etat vide** — si `corrections` est absent, vide, ou `null`, afficher un message : "L'Oracle n'a pas encore eu besoin de se corriger — patience, ca viendra"
7. **Recalibrage automatique** — le pipeline `elo.js` log dans le JSON les recalibrages effectues a mi-saison (J13) et fin de saison (J26) avec tracabilite (FR29). Les recalibrages sont des entrees dans `corrections[]` avec un champ supplementaire `"type": "recalibration"` (vs `"type": "correction"` pour les corrections manuelles)
8. **Esthetique coherente** — les cartes journal suivent le meme style visuel que les cartes facteurs Oracle (palette or+violet, bordures, rarity), avec une icone specifique par type (correction = wrench, recalibration = refresh)
9. **Prefers-reduced-motion** — toute animation (expand/collapse, stagger entrees) desactivee, transitions instantanees
10. **Accessibilite** — aria-labels sur la section journal et chaque entree, aria-expanded sur le toggle "En savoir plus", tabindex sur les elements interactifs, support clavier (Enter/Space pour expand), outline focus-visible WCAG AA

## FRs couvertes

FR28 (journal de corrections), FR29 (recalibrage automatique mi-saison/fin saison)

## Tasks / Subtasks

- [x] Task 1 : Etendre le schema JSON — champ `corrections[]` (AC: #4, #7)
  - [x] 1.1 Ajouter le champ `corrections` (tableau) au schema JSON de saison dans les tests `season-schema.test.js`
  - [x] 1.2 Definir la structure d'une entree : `{ matchday, date, title, description, impact, parameter, oldValue, newValue, type }`
  - [x] 1.3 Mettre a jour `data/2025-2026.json` avec au moins 3 entrees d'exemple editoriales

- [x] Task 2 : Etendre le pipeline `generate.js` (AC: #5, #7)
  - [x] 2.1 Dans `scripts/generate.js`, inclure le champ `corrections` dans le JSON de sortie
  - [x] 2.2 Ajouter la logique de recalibrage dans `scripts/elo.js` : a J13 et J26, generer une entree `type: "recalibration"` avec les parametres recalibres
  - [x] 2.3 Les entrees de recalibrage sont appendees dans le tableau `corrections` du JSON

- [x] Task 3 : Creer la section journal dans `tab-oracle.js` (AC: #1, #2, #3, #6, #8)
  - [x] 3.1 Ajouter une fonction `renderJournalSection(corrections)` dans `tab-oracle.js`
  - [x] 3.2 Toggle "Ouvrir le grimoire" / "Refermer le grimoire" avec expand/collapse (aria-expanded)
  - [x] 3.3 Chaque entree en carte grimoire avec date, titre, description, badge impact, icone type
  - [x] 3.4 Etat vide si pas de corrections
  - [x] 3.5 Injecter la section dans le `render()` principal apres les cartes facteurs

- [x] Task 4 : CSS du journal (AC: #8)
  - [x] 4.1 Ajouter les styles dans `src/styles/components/tab-oracle.css` (pas de nouveau fichier CSS — meme composant)
  - [x] 4.2 Classes prefixees `w-oracle-journal-*`
  - [x] 4.3 Palette coherente avec les cartes existantes (or+violet) + grimoire parchment tokens
  - [x] 4.4 Badges impact : vert (positive), gris (neutral), orange (negative)
  - [x] 4.5 Icones : wrench (correction), refresh (recalibration) en SVG inline

- [x] Task 5 : Accessibilite et motion (AC: #9, #10)
  - [x] 5.1 `aria-expanded` sur le toggle "Ouvrir le grimoire"
  - [x] 5.2 `aria-label` sur la section journal et chaque entree
  - [x] 5.3 Tabindex sur le toggle, focus-visible outline WCAG AA
  - [x] 5.4 Clavier : Enter/Space pour expand/collapse
  - [x] 5.5 CSS : `@media (prefers-reduced-motion: reduce)` → desactiver stagger et expand animation

- [x] Task 6 : Tests (AC: #1-10)
  - [x] 6.1 Tests schema JSON : `corrections` present, structure d'entree valide
  - [x] 6.2 Tests render : journal affiche les corrections, etat vide, toggle expand/collapse
  - [x] 6.3 Tests logique : tri par matchday, formatage dates, badge impact, XSS escape, NaN guard
  - [x] 6.4 Biome check 0 erreurs

## Maquettes

> **ui-structural: true** — cette story ajoute une nouvelle section avec progressive disclosure (toggle expand/collapse) et un nouveau type de carte (entree journal).

Variantes produites dans `_bmad-output/mockups/epic-5/` :
- Variante A : `journal-v1-timeline.html` — timeline verticale avec ligne connectrice lumineuse
- **Variante B : `journal-v1-logbook.html`** — grimoire / carnet de bord avec police serif, pages empilees (RETENUE)
- Variante C : `journal-v1-patch-notes.html` — patch notes jeu video, style terminal

Direction retenue : **Logbook / Grimoire** — esthetique carnet de bord ancien, police serif italique pour la voix de l'Oracle, pages empilees avec coin plie, accent or, sceau de cire en footer. Toggle "Ouvrir le grimoire / Refermer le grimoire".

**GO higgin : oui** (2026-03-30)

## Dev Notes

### Contexte architectural

- Le composant `tab-oracle.js` existe deja (story 5-1). Cette story **etend** ce composant en ajoutant une section journal — PAS de nouveau composant JS.
- Le CSS est deja dans `src/styles/components/tab-oracle.css` — ajouter les styles journal dans le meme fichier.
- Le toggle "En savoir plus" / "Refermer" utilise le pattern `aria-expanded` + `display: none/block`. Voir `bottom-sheet.js` pour un exemple de toggle accessible.

### Donnees JSON — extension schema

Le JSON `2025-2026.json` n'a PAS de champ `corrections` actuellement. Il faut l'ajouter :

```json
{
  "season": "2025-2026",
  "corrections": [
    {
      "matchday": 10,
      "date": "2025-12-15T00:00:00Z",
      "title": "Facteur domicile recalibre",
      "description": "L'avantage domicile de La Rochelle passe de 1.2 a 1.35 — Marcel Deflandre est une forteresse",
      "impact": "positive",
      "parameter": "homeFactor.la-rochelle",
      "oldValue": 1.2,
      "newValue": 1.35,
      "type": "correction"
    },
    {
      "matchday": 13,
      "date": "2026-01-12T00:00:00Z",
      "title": "Recalibrage mi-saison",
      "description": "L'Oracle ajuste ses coefficients a mi-parcours — la decroissance temporelle passe de 0.92 a 0.88",
      "impact": "neutral",
      "parameter": "temporalDecay",
      "oldValue": 0.92,
      "newValue": 0.88,
      "type": "recalibration"
    }
  ]
}
```

**Important :** le spike schema JSON (retro4-spike-schema-json-epic5) a confirme que les extensions se font au fil des stories. C'est le moment d'ajouter `corrections[]`.

### Pipeline — modifications necessaires

- `scripts/generate.js` : ajouter `corrections` dans l'objet de sortie. Les entrees sont editoriales (pas de detection automatique pour l'instant).
- `scripts/elo.js` : ajouter une detection de recalibrage a J13 et J26. Quand un recalibrage est effectue, generer une entree dans un fichier intermediaire ou la passer a `generate.js`.

**Attention :** le pipeline est actuellement execute dans GitHub Actions. Les modifications doivent etre testables en local (`node scripts/generate.js`).

### Patterns existants a suivre

| Pattern | Reference | Detail |
|---------|-----------|--------|
| Tab composant Oracle | `src/components/tab-oracle.js` | Etendre `render()` avec la section journal, meme structure |
| Toggle accessible | `src/components/bottom-sheet.js` | Pattern aria-expanded + toggle click/keyboard |
| Cartes facteurs | `src/components/tab-oracle.js:177-191` | Meme style visuel pour les cartes journal |
| XSS protection | `src/components/tab-oracle.js:3-7` | Fonction `esc()` deja presente — l'utiliser pour toutes les donnees journal |
| Animation stagger | `src/components/tab-oracle.js:248-269` | Meme pattern pour le stagger des entrees journal |

### TEAM_COLORS duplication

Pas de besoin de `TEAM_COLORS` dans cette story. Ne pas toucher a la duplication existante.

### Animation

- Expand/collapse du toggle : `opacity` + `transform: translateY()` ou `scaleY()`, JAMAIS `height` ou `max-height`.
- Stagger des entrees journal : 80ms entre chaque entree (plus lent que les cartes facteurs car c'est du contenu de lecture).
- Respect `prefers-reduced-motion` dans CSS ET JS.

### Store

- **Pas de nouveau state store** — l'etat expanded/collapsed du toggle est local au composant (variable module-level ou dataset).
- Les corrections sont lues depuis `season.corrections` via `get('season')`.

### Budget performance

- Budget actuel apres story 5-1 : ~26 KB gz / 200 KB (marge ~87%).
- Impact estime : ~0.5 KB JS + ~0.3 KB CSS = negligeable.
- Les corrections JSON ajoutent ~1-2 KB au JSON de saison (quelques entrees textuelles).
- Pas de nouvelles dependances.

### Ce que cette story NE fait PAS

- Pas de toggle simple/detaille global (story 5-3)
- Pas de detection automatique de corrections — les entrees sont editoriales pour l'instant
- Pas de graphique d'evolution du Brier Score (pas dans le scope)
- Pas de micro-classement (story 5-4)
- Pas de nouveau composant — extension de `tab-oracle.js` existant

### Project Structure Notes

- Fichiers modifies : `src/components/tab-oracle.js`, `src/styles/components/tab-oracle.css`, `data/2025-2026.json`, `scripts/generate.js`, `scripts/elo.js`
- Tests modifies/ajoutes : `tests/season-schema.test.js` (schema corrections), `tests/tab-oracle.test.js` (journal render)
- Zero nouveau fichier composant — extension du composant existant.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/prd.md#FR28-FR29]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Progressive Disclosure]
- [Source: _bmad-output/implementation-artifacts/5-1-vue-transparence-donnees-sources-et-metriques-du-modele.md]
- [Source: _bmad-output/implementation-artifacts/epic-4-retro-2026-03-30.md#Preparation Epic 5]
- [Source: sprint-status.yaml#retro4-spike-schema-json-epic5 — extensions au fil des stories]

### Learnings de la story 5-1

- **XSS obligatoire** (DoD #9) : `esc()` est deja dans `tab-oracle.js` — l'utiliser pour toutes les donnees journal (title, description, parameter, date).
- **Animations transform-only** : la review 5-1 a corrige les barres de progression pour utiliser `scaleX()` au lieu de `width`. Appliquer le meme pattern pour toute animation de barre dans le journal.
- **Guard NaN** : la review 5-1 a ajoute un guard NaN pour brierScore. Appliquer le meme principe aux `oldValue`/`newValue` dans les entrees corrections.
- **Tests DOM** : la review 5-1 a demande plus de variantes de tests DOM. Prevoir des tests pour chaque etat (vide, corrections seules, recalibrations seules, mix).
- **jsdom matchMedia** : guard `typeof window.matchMedia === 'function'` necessaire avant appel dans les tests.
- **513/513 tests green** apres story 5-1 — ne pas casser.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun blocage — implementation lineaire.

### Completion Notes List

- Schema JSON etendu avec `corrections[]` (3 entrees editoriales : correction positive J8, recalibrage neutre J13, correction negative J16)
- Pipeline `generate.js` : nouvelle fonction `mergeCorrections()` pour fusionner corrections existantes + nouvelles du pipeline (dedupe par matchday+parameter, tri par matchday)
- Pipeline `elo.js` : nouvelle fonction `generateRecalibrations()` qui genere des entrees de recalibrage a J13 (temporalDecay) et J26 (kFactor)
- Section journal grimoire dans `tab-oracle.js` : toggle "Ouvrir/Refermer le grimoire" avec expand/collapse, cartes pages empilees (corner fold, bordure or, serif italic), badges impact et type, etat vide, sceau de cire
- CSS grimoire complet dans `tab-oracle.css` (tokens parchment, stacked pages, type badges, impact badges, seal)
- Accessibilite complete : aria-expanded, aria-label section + entrees, tabindex, keyboard Enter/Space, focus-visible WCAG AA
- Prefers-reduced-motion : animations stagger et transitions desactivees en CSS et JS
- XSS : toutes les donnees JSON echappees via `esc()`, NaN guard sur oldValue/newValue
- 542/542 tests green (+25 nouveaux), Biome 0 erreurs

### Change Log

- 2026-03-30 : Implementation complete story 5-2, toutes taches validees

### File List

- `data/2025-2026.json` (modified — ajout champ `corrections[]` avec 3 entrees)
- `scripts/generate.js` (modified — `mergeCorrections()`, `buildSeasonData` accepte corrections, main propage corrections)
- `scripts/elo.js` (modified — `generateRecalibrations()`, `RECALIBRATION_MATCHDAYS`, corrections dans output)
- `src/components/tab-oracle.js` (modified — `renderJournalSection()`, `renderJournalPage()`, toggle handler, keyboard handler)
- `src/styles/components/tab-oracle.css` (modified — ~250 lignes CSS journal grimoire + reduced motion)
- `tests/season-schema.test.js` (modified — 4 tests corrections schema)
- `tests/tab-oracle.test.js` (modified — 15 tests journal render/toggle/XSS/impact/empty)
- `tests/generate.test.js` (modified — 7 tests mergeCorrections + 2 tests buildSeasonData corrections)
- `tests/elo.test.js` (modified — 4 tests generateRecalibrations)
