# Story 6.1 : Selection et modification de resultats de matchs

Status: review

## Story

En tant qu'utilisateur,
Je veux modifier le resultat de matchs a venir (victoire, nul, defaite, bonus),
Afin de creer des scenarios hypothetiques.

## Acceptance Criteria

1. **Given** l'utilisateur accede au simulateur depuis le classement ou la fiche equipe **When** la liste des prochains matchs de la journee s'affiche **Then** chaque match est tappable pour choisir un resultat (victoire domicile, nul, victoire exterieur + bonus eventuel) (FR33)
2. **And** le resultat selectionne est visuellement confirme
3. **And** l'utilisateur peut modifier plusieurs matchs avant de simuler
4. **And** un compteur de matchs simules est visible
5. **And** un bouton "Reinitialiser" remet tous les resultats a zero

## Perimetre

Cette story est **frontend-only**. Pas de modification du pipeline. Le simulateur est une nouvelle vue/section qui consomme les donnees `calendar` du JSON saison existant. Le recalcul et l'animation sont dans la story 6-2 — ici on construit uniquement l'interface de selection.

### Ce qui est IN scope

- Nouveau composant `tab-simulateur.js` : affiche les matchs a venir, permet de choisir un resultat par match
- Selecteur de resultat par match : 3 options (victoire domicile / nul / victoire exterieur) + toggle bonus offensif / bonus defensif
- Feedback visuel immediat quand un resultat est selectionne
- Compteur de matchs simules
- Bouton "Reinitialiser" pour tout effacer
- Nouveau store key `simulatedResults` pour stocker les choix utilisateur
- Integration dans `bottom-nav.js` et `app.js` (remplacement du placeholder)

### Ce qui est OUT scope

- Recalcul Elo / projections (story 6-2)
- Animation du classement simule (story 6-2)
- Bouton "Voir l'impact" (story 6-2)
- Mode simule vs mode reel (story 6-2)

## Tasks / Subtasks

- [x] Task 1 — Extension du store (AC: #3)
  - [x] 1.1 Ajouter `simulatedResults` dans `EVENT_NAMES` (event: `'simulated-results-changed'`) et `INITIAL_STATE` (valeur: `{}`)
  - [x] 1.2 Convention : `simulatedResults` est un objet `{ [matchKey]: { outcome, bonus } }` ou `matchKey` = `"matchday-home-away"` (ex: `"20-stade-francais-clermont"`)
  - [x] 1.3 `outcome` : `'homeWin'` | `'draw'` | `'awayWin'` | `null`
  - [x] 1.4 `bonus` : `'offensive'` | `'defensive'` | `null`

- [x] Task 2 — Composant `tab-simulateur.js` (AC: #1, #2, #3, #4, #5)
  - [x] 2.1 `src/components/tab-simulateur.js` — exporte `render(container, season)`
  - [x] 2.2 Extraire les matchs a venir du `calendar` (matchs sans score / status != 'played')
  - [x] 2.3 Pour chaque match : afficher equipe domicile, equipe exterieur, difficulte
  - [x] 2.4 Selecteur resultat : 3 boutons radio-like (Dom / Nul / Ext) — un seul selectionnable par match
  - [x] 2.5 Sous-selecteur bonus : 2 toggles optionnels (bonus offensif, bonus defensif) qui apparaissent apres choix du resultat
  - [x] 2.6 Etat selectionne : style visuel distinct (fond colore, bordure accentuee)
  - [x] 2.7 Tap sur un resultat deja selectionne = deselection (retour a neutre)
  - [x] 2.8 Chaque changement met a jour `store.set('simulatedResults', {...})` immediatement
  - [x] 2.9 Compteur en haut : "X match(s) simule(s)" — mis a jour a chaque changement
  - [x] 2.10 Bouton "Reinitialiser" : `store.set('simulatedResults', {})`, remet tous les selecteurs a neutre

- [x] Task 3 — Styles `tab-simulateur.css` (AC: #1, #2)
  - [x] 3.1 `src/styles/components/tab-simulateur.css`
  - [x] 3.2 Match card : fond blanc, coins arrondis 12px, ombre subtile — pattern identique aux cards existantes
  - [x] 3.3 Selecteur resultat : boutons pilule en ligne, etat neutre gris, etat selectionne couleur accent
  - [x] 3.4 Bonus toggles : petits pills sous le selecteur, apparition animee (opacity + transform)
  - [x] 3.5 Compteur : style label discret en haut de liste
  - [x] 3.6 Bouton reinitialiser : style secondaire (pas primary), positionne apres le compteur
  - [x] 3.7 `prefers-reduced-motion` : desactiver les animations de transition

- [x] Task 4 — Integration dans `app.js` et `bottom-nav.js` (AC: #1)
  - [x] 4.1 Verifier si un onglet simulateur existe deja dans `bottom-nav.js` — sinon l'ajouter (id: `'simulateur'`, label: `'Simuler'`)
  - [x] 4.2 Import `renderSimulateur` dans `app.js`
  - [x] 4.3 Ajouter case `'simulateur'` dans le switch de rendu des tabs
  - [x] 4.4 Le tab simulateur beneficie du meme cache invalidation que les autres tabs

- [x] Task 5 — Accessibilite (AC: #1, #2)
  - [x] 5.1 Selecteur resultat : `role="radiogroup"` avec `aria-label` par match, chaque option `role="radio"` avec `aria-checked`
  - [x] 5.2 Bonus toggles : `role="switch"` avec `aria-checked` et `aria-label` descriptif
  - [x] 5.3 Compteur : `aria-live="polite"` pour annoncer les changements
  - [x] 5.4 Bouton reinitialiser : `aria-label="Reinitialiser tous les resultats simules"`
  - [x] 5.5 Navigation clavier : Enter/Space pour activer les selecteurs, tabindex sur tous les elements interactifs
  - [x] 5.6 Focus visible : outline WCAG AA sur tous les elements interactifs

- [x] Task 6 — Etat vide (AC: #1)
  - [x] 6.1 Si `calendar` est vide ou ne contient aucun match a venir : afficher etat vide "Aucun match a simuler pour le moment" — reutiliser le pattern `empty-state.js`
  - [x] 6.2 Si `calendar` n'existe pas dans le JSON (retrocompatibilite) : meme etat vide

- [x] Task 7 — Tests (AC: #1, #2, #3, #4, #5)
  - [x] 7.1 `tests/tab-simulateur.test.js` — render avec matchs, render etat vide, selection/deselection resultat, compteur, reset, bonus toggles
  - [x] 7.2 Tests store : `simulatedResults` key set/get/on
  - [x] 7.3 Tests a11y : roles, aria-labels, aria-live, keyboard navigation
  - [x] 7.4 Integration dans le runner existant (vitest)

ui-structural: true

## Maquettes

Liens vers les maquettes dans `_bmad-output/mockups/epic-6/` :
- Variant A : [simulateur-v1-variant-a.html](_bmad-output/mockups/epic-6/simulateur-v1-variant-a.html) — cards empilees
- Variant B : [simulateur-v1-variant-b.html](_bmad-output/mockups/epic-6/simulateur-v1-variant-b.html) — liste compacte
- **Variant C (retenue)** : [simulateur-v1-variant-c.html](_bmad-output/mockups/epic-6/simulateur-v1-variant-c.html) — gaming/duel, initiales en cercles, zones tappables

GO higgin: oui (variant C — gaming/duel, 2026-04-02)

## Dev Notes

### Donnees source — calendar dans le JSON saison

Le JSON saison (`data/2025-2026.json`) contient un array `calendar` avec les matchs a venir :
```json
{
  "matchday": 20,
  "date": "2026-03-29T14:00:00Z",
  "home": "stade-francais",
  "away": "clermont",
  "difficulty": 0.41
}
```

Les matchs a venir n'ont PAS de champ `status` ni de scores. Filtrer par : absence de `homeScore`/`awayScore` OU `status !== 'played'`.

Les IDs equipe sont en `kebab-case`. Pour afficher les noms lisibles, utiliser le tableau `teams` du JSON saison : `season.teams.find(t => t.id === matchHomeId).name`.

### Points rugby TOP 14

Le systeme de points pour le selecteur :
- **Victoire** : 4 pts
- **Nul** : 2 pts
- **Defaite** : 0 pts
- **Bonus offensif** : +1 pt (4 essais ou plus marques — applicable au vainqueur comme au perdant)
- **Bonus defensif** : +1 pt (defaite de 7 points ou moins — applicable uniquement au perdant)

Pour la story 6-1, on stocke uniquement le choix utilisateur (`outcome` + `bonus`). Le calcul des points est dans la story 6-2.

**Regle bonus** : le bonus offensif est cumulable avec victoire ou defaite. Le bonus defensif est UNIQUEMENT cumulable avec une defaite. L'UI doit reflechir cette contrainte : si victoire selectionnee, masquer le toggle "bonus defensif".

### Structure du store `simulatedResults`

```js
// Exemple avec 2 matchs simules
{
  "20-stade-francais-clermont": {
    outcome: "homeWin",   // 'homeWin' | 'draw' | 'awayWin' | null
    bonus: "offensive"    // 'offensive' | 'defensive' | null
  },
  "20-la-rochelle-toulouse": {
    outcome: "awayWin",
    bonus: null
  }
}
```

La cle `matchKey` est construite comme `${matchday}-${home}-${away}` pour garantir l'unicite.

### Pattern composant — reference `tab-duels.js` et `tab-oracle.js`

```js
import '../styles/components/tab-simulateur.css'
import { get, set, on } from '../store.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function render(container, season) {
  container.innerHTML = ''
  // ... build DOM
}
```

### Navigation — integration dans bottom-nav

`bottom-nav.js` a actuellement **5 onglets** : `classements`, `projection`, `duels`, `donjon`, `oracle`. Ajouter un 6eme onglet `simulateur` (label: `'Simuler'`). L'ajout d'un 6eme onglet impacte le layout CSS de `bottom-nav.css` (les icones/labels doivent tenir sur 6 colonnes au lieu de 5, verifier que les touch targets restent >= 48px sur un ecran 360px).

Le tab simulateur suit le meme pattern d'integration que les autres tabs dans `app.js` :
- Import statique
- Case dans le switch `activeTab`
- La Map `tabViews` gere le cache

### Filtrage des matchs a venir — pattern existant

`bottom-sheet.js` exporte `filterUpcomingForTeam(calendar, teamId)` qui filtre les matchs a venir pour une equipe. Le simulateur a besoin d'un filtre similaire mais sans restriction par equipe. Pattern de filtrage : un match est "a venir" si `homeScore` est absent/null (le champ `difficulty` est toujours present). Attention : selon les donnees, le champ `homeScore` peut etre absent ou `null`.

### Baseline de tests

610 tests passent actuellement (baseline post-5-4). Le dev doit s'assurer que les 610 tests existants + les nouveaux tests passent tous.

### Interaction — UX flow

Flux utilisateur (ref: UX spec, Parcours 4) :
1. Tap sur l'onglet "Simuler" dans la nav
2. Liste des matchs a venir de la prochaine journee
3. Tap sur un selecteur de resultat (Dom / Nul / Ext)
4. Le choix est visuellement confirme, le compteur s'incremente
5. Optionnel : activer un bonus (offensif ou defensif selon le resultat)
6. Repeter pour d'autres matchs
7. Bouton "Reinitialiser" pour tout effacer

Le bouton "Voir l'impact" sera ajoute dans la story 6-2.

### Selecteur de resultat — design du composant

Chaque match card contient :
- Header : equipe domicile vs equipe exterieur + indicateur difficulte
- 3 boutons en ligne : [Dom] [Nul] [Ext]
  - Etat neutre : fond gris clair, texte gris fonce
  - Etat selectionne : fond accent (victoire = vert pour le vainqueur), bordure coloree
  - Un seul selectionnable par match (comportement radio)
  - Re-tap = deselection
- Sous-section bonus (visible uniquement si un resultat est choisi) :
  - Toggle "Bonus offensif" (toujours disponible)
  - Toggle "Bonus defensif" (uniquement si defaite selectionnee pour l'equipe concernee)
  - Les bonus sont des toggles on/off independants

### Ce qu'il ne faut PAS faire

- Ne PAS importer ou utiliser `scripts/elo.js` dans le frontend — c'est un module pipeline Node.js
- Ne PAS calculer de points ou de projections dans cette story — c'est la story 6-2
- Ne PAS creer de nouveau fichier JSON — les donnees viennent du JSON saison existant
- Ne PAS modifier le store au-dela de l'ajout de `simulatedResults` — pas de nouvelle route
- Ne PAS hardcoder les matchs — tout vient de `season.calendar`
- Ne PAS creer de helper `utils.js` — le helper `esc()` est declare localement dans chaque composant (pattern etabli)
- Ne PAS ajouter de spinner ou loading state — les donnees sont deja en memoire quand le tab est rendu

### Lecons des stories precedentes

- **Story 5-4** : `tab-duels.js` est le dernier composant tab cree. Suivre exactement le meme pattern pour l'integration dans `app.js` (import statique, case dans le switch, render(container, season)).
- **Story 5-3** : Le `viewMode` (simple/detaille) est global. Le simulateur peut ignorer le viewMode pour la v1 — la selection de resultats est la meme en simple et detaille.
- **Story 5-1** : `tab-oracle.js` utilise `container.innerHTML = ''` puis reconstruction. Meme pattern.
- **Pattern XSS** : tout innerHTML passe par `esc()`. Critique pour les noms d'equipes venant du JSON.
- **CSS tokens** : prefixe `--w-`, classes `w-` — voir `tab-duels.css` pour reference recente.
- **Animations** : uniquement `transform` + `opacity`, respecter `prefers-reduced-motion`.
- **Git** : derniers commits suivent le format `feat: story X-Y — description courte`.

### Fichiers a creer

| Fichier | Action |
|---|---|
| `src/components/tab-simulateur.js` | **NOUVEAU** — composant onglet simulateur |
| `src/styles/components/tab-simulateur.css` | **NOUVEAU** — styles onglet simulateur |
| `tests/tab-simulateur.test.js` | **NOUVEAU** — tests composant simulateur |

### Fichiers a modifier

| Fichier | Action |
|---|---|
| `src/store.js` | Ajouter `simulatedResults` dans EVENT_NAMES et INITIAL_STATE |
| `src/app.js` | Import `renderSimulateur`, case `'simulateur'` dans le switch |
| `src/components/bottom-nav.js` | Ajouter onglet simulateur si absent |
| `src/styles/components/bottom-nav.css` | Ajuster si necessaire pour 6 onglets |

### Project Structure Notes

- Alignement avec la structure existante : 1 fichier JS + 1 fichier CSS par composant
- Tests dans `tests/` a la racine, nommage `tab-simulateur.test.js`
- Le composant suit le pattern `render(container, season)` comme tous les tabs
- Le store reste plat, pas d'objet imbrique dans la valeur (le `simulatedResults` est l'objet le plus complexe du store)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/prd.md#FR33]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Parcours 4 Le simulateur]
- [Source: _bmad-output/planning-artifacts/architecture.md#JSON Saison Structure]
- [Source: _bmad-output/implementation-artifacts/5-4-micro-classement-confrontations-directes-et-gestion-promus.md]
- [Source: src/store.js — EVENT_NAMES, INITIAL_STATE, set/get/on API]
- [Source: src/data.js — loadSeason, JSON structure]
- [Source: src/components/tab-duels.js — dernier composant tab cree, pattern de reference]
- [Source: scripts/elo.js#simulateMatch — logique de points, NE PAS importer cote frontend]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- bottom-nav.test.js needed update (5 → 6 tabs, 4 → 5 inactive) — expected regression, fixed immediately.

### Completion Notes List

- **Task 1** : Ajout `simulatedResults` dans EVENT_NAMES (`'simulated-results-changed'`) et INITIAL_STATE (`{}`) dans `store.js`
- **Task 2** : Composant `tab-simulateur.js` cree — render(container, season), match cards gaming/duel avec initiales en cercles, selecteur 3 options (homeWin/draw/awayWin), bonus toggles (offensif toujours, defensif seulement si non-draw), compteur, reset. Event delegation pour clicks et clavier.
- **Task 3** : CSS `tab-simulateur.css` — style gaming variant C fidele a la maquette validee. Duel cards, team zones tappables, bonus pills, empty state, `prefers-reduced-motion` gere.
- **Task 4** : Integration dans `bottom-nav.js` (6eme onglet "Simul."), `app.js` (import + case switch), `router.js` (TAB_IDS + regex URL). Touch targets OK sur 360px (60px/tab > 48px min).
- **Task 5** : Accessibilite complete — `role="radiogroup"` sur arena, `role="radio"` sur zones/draw, `aria-checked`, `role="switch"` sur bonus, `aria-live="polite"` sur compteur, `tabindex="0"` + Enter/Space, `focus-visible` outline WCAG AA.
- **Task 6** : Etat vide — gere calendar absent, vide, ou sans matchs a venir. Reutilise le pattern visuel des empty states existants.
- **Task 7** : 48 tests — filterUpcoming, matchKey, getInitials, countSimulated, store simulatedResults, render (empty + matches + journee + counter + team names + initials + favorite + difficulty), interactions (select/deselect/draw/counter/reset/bonus/defensive-hidden-on-draw/bonus-clear-on-change), a11y (roles/aria/keyboard/tabindex), multiple matchdays.

### Change Log

- 2026-04-02 : Story 6-1 implementation complete — simulateur tab avec selection de resultats

### File List

| Fichier | Action |
|---|---|
| `src/store.js` | MODIFIE — ajout simulatedResults |
| `src/components/tab-simulateur.js` | NOUVEAU — composant onglet simulateur |
| `src/styles/components/tab-simulateur.css` | NOUVEAU — styles onglet simulateur |
| `src/components/bottom-nav.js` | MODIFIE — ajout onglet simulateur |
| `src/app.js` | MODIFIE — import + case simulateur |
| `src/router.js` | MODIFIE — TAB_IDS + regex |
| `tests/tab-simulateur.test.js` | NOUVEAU — 48 tests |
| `src/__tests__/bottom-nav.test.js` | MODIFIE — 5→6 tabs, 4→5 inactive |
