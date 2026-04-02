# Story 5.4 : Micro-classement confrontations directes et gestion promus

Status: done

## Story

En tant qu'utilisateur,
Je veux que les equipes a egalite de points soient departagees par confrontation directe et que les promus soient correctement geres,
Afin que le classement reflete les regles reelles du TOP 14.

## Acceptance Criteria

1. **Given** deux equipes ou plus sont a egalite de points dans le classement **When** le classement est calcule **Then** un micro-classement base sur les confrontations directes les departage (FR31)
2. **And** l'indicateur de departage est visible dans la fiche detaillee (bottom sheet)
3. **Given** une equipe promue de Pro D2 rejoint le TOP 14 **When** le modele calcule son Elo initial **Then** un proxy base sur les performances Pro D2 avec coefficient de decote est utilise (FR32)
4. **And** la confiance pour cette equipe est marquee comme basse en debut de saison

## Perimetre — deux volets distincts

Cette story touche le **pipeline** (calcul) ET le **frontend** (affichage). Les deux parties sont independantes : le pipeline produit les donnees, le frontend les consomme.

### Volet Pipeline (FR31 + FR32)

- **FR31** : Calculer les confrontations directes (H2H) a partir des resultats existants dans `scraped.json`. Quand 2+ equipes sont a egalite de points, les departager par bilan H2H (victoires - defaites entre elles). Ajouter les donnees H2H dans le JSON de sortie.
- **FR32** : Detecter les equipes promues (absentes de la saison precedente ou marquees comme telles). Appliquer un Elo initial = `INITIAL_ELO * decoteCoeff` (ex: 1500 * 0.85 = 1275) au lieu de 1500. Marquer `promoted: true` et forcer `confidence` basse en debut de saison.

### Volet Frontend (FR31)

- Remplacer le placeholder "Duels" dans `app.js` par un vrai composant `tab-duels.js`
- Afficher le micro-classement H2H pour les groupes d'equipes a egalite de points
- Afficher l'indicateur "departage par confrontation directe" dans le bottom sheet quand applicable
- En mode simple : afficher uniquement le resultat du departage (qui passe devant)
- En mode detaille : afficher le bilan H2H complet (V/N/D entre les equipes concernees)

### Volet Frontend (FR32)

- Afficher un badge "Promu" sur les equipes promues dans le classement et le bottom sheet
- Afficher la confiance basse avec une mention explicative

## Tasks / Subtasks

### Pipeline

- [x] Task 1 — Calcul H2H dans `scripts/elo.js` (AC: #1)
  - [x] 1.1 `computeHeadToHead(results)` — Map `teamA:teamB` -> `{ wins, draws, losses, pointsFor, pointsAgainst }`
  - [x] 1.2 `applyTiebreaker(teams, standings, h2hMap)` — reorder tied teams by H2H balance
  - [x] 1.3 Integrated in `main()` flow after standings, before output

- [x] Task 2 — Gestion promus dans `scripts/elo.js` (AC: #3, #4)
  - [x] 2.1 Constants `PROMOTED_DECOTE = 0.85`, `PROMOTED_TEAMS = ['vannes']`
  - [x] 2.2 Promoted teams start at `Math.round(INITIAL_ELO * 0.85)` = 1275
  - [x] 2.3 `promoted: true` flag + confidence capped at 0.3 for first 5 matchdays

- [x] Task 3 — Extension du JSON de sortie (AC: #1, #2, #3)
  - [x] 3.1 `headToHead` array in season JSON output
  - [x] 3.2 `promoted: true` conditionally added to team entries
  - [x] 3.3 `tiebreaker: "h2h"` on tiebreak group teams
  - [x] 3.4 Schema tests updated for optional fields

- [x] Task 4 — Tests pipeline (AC: #1, #3)
  - [x] 4.1 `computeHeadToHead` tests (5 tests)
  - [x] 4.2 `applyTiebreaker` tests (3 tests)
  - [x] 4.3 Promoted team tests (4 tests)
  - [x] 4.4 `buildHeadToHeadOutput` integration tests (2 tests)

### Frontend

- [x] Task 5 — Composant `tab-duels.js` (AC: #1, #2)
  - [x] 5.1 `src/components/tab-duels.js` — exports `render(container, season)`, `buildTiebreakerGroups`, `computeTeamH2HBalance`
  - [x] 5.2 `src/styles/components/tab-duels.css`
  - [x] 5.3 Groups of tied teams with mini-ranking and H2H detail table
  - [x] 5.4 Mode simple: mini-rank rows with V/N/D balance
  - [x] 5.5 Mode detaille: full H2H table with per-opponent V/N/D

- [x] Task 6 — Integration dans `app.js` (AC: #1)
  - [x] 6.1 Static import of `renderDuels` from `tab-duels.js`
  - [x] 6.2 Replaced `renderPlaceholder` in case `'duels'`
  - [x] 6.3 Re-render on viewMode change handled by existing cache invalidation

- [x] Task 7 — Indicateurs dans bottom sheet et classement (AC: #2, #4)
  - [x] 7.1 `w-sheet-badge-h2h` badge in bottom-sheet (detaille mode only)
  - [x] 7.2 `w-sheet-badge-promu` badge in bottom-sheet hero
  - [x] 7.3 `w-rank-row__promu` "P" tag in rank-row for promoted teams

- [x] Task 8 — Accessibilite (AC: #1, #2)
  - [x] 8.1 `aria-label` on tiebreak groups, `role="list"` on mini-rank
  - [x] 8.2 `aria-label` on all badges (promu, h2h, promoted note)
  - [x] 8.3 Groups are read-only display, no interactive elements needed
  - [x] 8.4 `prefers-reduced-motion` in tab-duels.css

- [x] Task 9 — Tests frontend (AC: #1, #2, #3, #4)
  - [x] 9.1 `tab-duels.test.js` (22 tests): buildTiebreakerGroups, computeTeamH2HBalance, render simple/detaille, empty state, promoted note, a11y
  - [x] 9.2 `bottom-sheet.test.js` (+5 tests): badge promu, badge h2h, mode visibility
  - [x] 9.3 `rank-row-tap.test.js` (+2 tests): promu tag presence/absence
  - [x] 9.4 A11y tests integrated in tab-duels.test.js accessibility describe block

ui-structural: true

## Maquettes

Liens vers les maquettes a produire dans `_bmad-output/mockups/epic-5/` :
- **Variant A (retenue)** : [duels-v1-table-compacte.html](_bmad-output/mockups/epic-5/duels-v1-table-compacte.html) — table compacte, data-dense
- Variant B : [duels-v1-cards-groupe.html](_bmad-output/mockups/epic-5/duels-v1-cards-groupe.html) — cards par groupe
- Variant C : [duels-v1-liste-accordeon.html](_bmad-output/mockups/epic-5/duels-v1-liste-accordeon.html) — liste accordeon

GO higgin: oui (variant A — table compacte, 2026-04-01)

## Dev Notes

### Donnees H2H — source et calcul

Les resultats match par match sont dans `data/scraped.json` (produits par `scripts/scrape.js`). Le calendrier (`calendar` dans le JSON saison) contient les matchs passes avec scores. La fonction `computeHeadToHead` doit :
1. Parcourir tous les resultats joues
2. Pour chaque match, extraire home/away/score
3. Construire le bilan paire par paire

**Regles TOP 14 de departage** (simplifiees pour le modele) :
1. Nombre de points totaux (deja fait)
2. Confrontations directes (bilan victoires/defaites)
3. Difference de points marques/encaisses en H2H
4. Si toujours egal : difference generale de points

Pour cette story, implementer niveaux 1 et 2 uniquement. Niveaux 3-4 en extension future si necessaire.

### Extension du schema JSON

Nouveaux champs racine :
```json
{
  "headToHead": [
    {
      "teams": ["la-rochelle", "toulouse"],
      "matches": [
        { "matchday": 5, "home": "la-rochelle", "away": "toulouse", "scoreHome": 24, "scoreAway": 18 }
      ],
      "record": {
        "la-rochelle": { "w": 1, "d": 0, "l": 0 },
        "toulouse": { "w": 0, "d": 0, "l": 1 }
      }
    }
  ]
}
```

Nouveaux champs par equipe :
```json
{
  "id": "vannes",
  "promoted": true,
  "tiebreaker": "h2h"
}
```

- `promoted` : boolean, `false` par defaut (omis si false pour economiser)
- `tiebreaker` : string optionnel, present uniquement si l'equipe est dans un groupe de departage

### Pipeline — fichiers a modifier

| Fichier | Action |
|---|---|
| `scripts/elo.js` | Ajouter `computeHeadToHead()`, `applyTiebreaker()`, constantes promus, modifier Elo initial promus |
| `scripts/generate.js` | Ajouter `headToHead` et `promoted`/`tiebreaker` dans le JSON de sortie |
| `scripts/validate.js` | Ajouter validation des nouveaux champs (optionnels) |
| `tests/elo.test.js` | Tests H2H, tiebreaker, promus |

### Frontend — fichiers a creer/modifier

| Fichier | Action |
|---|---|
| `src/components/tab-duels.js` | **NOUVEAU** — composant onglet Duels |
| `src/styles/components/tab-duels.css` | **NOUVEAU** — styles onglet Duels |
| `src/app.js` | Remplacer placeholder par `renderDuels()` |
| `src/components/bottom-sheet.js` | Ajouter badges tiebreaker et promu |
| `src/components/rank-row.js` | Ajouter indicateur promu |
| `tests/tab-duels.test.js` | **NOUVEAU** — tests composant Duels |

### Patterns existants a respecter

- **State store** : `get('viewMode')` pour conditionner simple/detaille — pattern identique a story 5-3
- **CSS tokens** : prefixe `--w-`, classes prefixe `w-` — voir `tab-oracle.css` pour reference
- **Escape HTML** : tout contenu dynamique via `esc()` — helper present dans `tab-oracle.js` et `bottom-sheet.js`
- **Animations** : seulement `transform` + `opacity`, spring stiffness 200/damping 20, `prefers-reduced-motion` respecte
- **Composants** : `render(container, season)` — pattern identique a `tab-oracle.js`, `tab-projection.js`, `tab-donjon.js`
- **Tab cache** : `app.js` maintient une Map `tabViews` — le nouveau tab doit s'y integrer comme les autres
- **Donnees** : les probabilities sont en decimales 0-1 dans le JSON, conversion en % uniquement en UI

### Gestion des promus — Vannes (2025-2026)

Vannes (RC Vannes, id: `vannes`) est le promu de la saison 2025-2026. Le mapping existe deja dans `scripts/team-mapping.js` (ligne 46). Le pipeline demarre actuellement avec `INITIAL_ELO = 1500` pour toutes les equipes sans distinction. Cette story ajoute la decote pour les promus.

### Ce qu'il ne faut PAS faire

- Ne PAS modifier le tri du classement existant dans `app.js` — le tiebreaker s'applique dans le pipeline, le frontend consomme le `currentRank` deja calcule
- Ne PAS creer un systeme de cache separe pour les donnees H2H — elles font partie du JSON saison
- Ne PAS ajouter de nouvelle route ou page — le tab "Duels" existe deja dans `bottom-nav.js`
- Ne PAS toucher aux tests existants qui passent (sauf pour ajouter les nouveaux champs dans les fixtures)
- Ne PAS implementer les niveaux de departage 3-4 (difference de points) — hors scope
- Ne PAS hardcoder les equipes promues dans le frontend — le pipeline fournit `promoted: true`

### Lecons des stories precedentes (5-1, 5-2, 5-3)

- **Story 5-1** : `tab-oracle.js` utilise `render(container, season)` avec `container.innerHTML = ''` puis reconstruction. Suivre le meme pattern pour `tab-duels.js`.
- **Story 5-2** : Le journal (grimoire) utilise un toggle expand/collapse local — pattern reutilisable pour les groupes H2H (expand pour voir le detail).
- **Story 5-3** : Le `viewMode` est global dans le store. Le tab Duels DOIT respecter `get('viewMode')` et ecouter `on('viewMode', ...)` pour conditionner l'affichage simple/detaille.
- **Pattern XSS** : tout innerHTML doit passer par `esc()`. Critique pour les noms d'equipes.
- **Tab cache invalidation** : quand `viewMode` change, les tab views sont videes et re-rendues. Le nouveau tab Duels beneficie automatiquement de ce mecanisme (story 5-3).

### Etat vide

Si aucune egalite de points n'existe dans le classement actuel (rare mais possible en debut de saison), le tab Duels affiche un etat vide : "Aucun departage necessaire pour le moment." Utiliser le pattern `empty-state.js` existant.

Si les donnees `headToHead` sont absentes du JSON (retrocompatibilite), le tab affiche le placeholder actuel ou un etat vide.

### Project Structure Notes

- Alignement avec la structure existante : 1 fichier JS + 1 fichier CSS par composant dans `src/components/` et `src/styles/components/`
- Tests dans `tests/` a la racine et `src/__tests__/`, nommage `{component}.test.js`
- Le tab Duels est deja reference dans `bottom-nav.js` (id: `'duels'`, ligne 15)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.4]
- [Source: _bmad-output/planning-artifacts/prd.md#FR31, FR32]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Parcours 3 Comprendre le modele]
- [Source: _bmad-output/planning-artifacts/architecture.md#JSON Saison Structure]
- [Source: _bmad-output/implementation-artifacts/5-3-mode-simple-mode-detaille.md]
- [Source: scripts/elo.js#computeEloRatings, simulateSeason]
- [Source: scripts/team-mapping.js#ligne 47 — promoted team]
- [Source: src/app.js#ligne 85-89 — placeholder Duels]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
