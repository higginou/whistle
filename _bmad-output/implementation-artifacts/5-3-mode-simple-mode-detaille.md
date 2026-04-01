# Story 5.3 : Mode simple / mode detaille

Status: done

## Story

En tant qu'utilisateur,
Je veux basculer entre un mode simple et un mode detaille,
Afin de choisir mon niveau de profondeur d'information.

## Acceptance Criteria

1. **Given** l'utilisateur est sur n'importe quelle vue **When** il bascule le mode (tap sur un toggle) **Then** le mode simple affiche l'essentiel (positions, tendances, probabilites) (FR30)
2. **And** le mode detaille ajoute : Elo, Brier Score, forme 5 matchs, facteurs, journal corrections
3. **And** le mode simple est le defaut — le detail ne s'impose jamais
4. **And** le choix est persiste entre les sessions (localStorage)

## Scope — ce qui change par mode

| Vue / Composant | Mode simple (defaut) | Mode detaille (ajoute) |
|---|---|---|
| **Oracle** (`tab-oracle.js`) | Niveau Oracle pill + titre + journee, prediction card | Brier Score card, factor cards grid, journal grimoire |
| **Classement** (`zone-group.js` / rank rows) | Rang, nom, tendance, zone couleur | Elo numerique, confiance % |
| **Bottom sheet** (fiche equipe) | Nom, rang actuel, rang projete, tendance, zone | Elo, confiance, forme 5 matchs, probabilites zones |
| **Score card** (hero La Rochelle) | Rang actuel/projete, tendance | Elo, confiance, forme detaillee |
| **Projection** (`tab-projection.js`) | Rang projete, tendance | Elo, confiance %, barre de progression detaillee |

## Tasks / Subtasks

- [x] Task 1 — Store : ajouter la cle `viewMode` (AC: #3, #4)
  - [x] 1.1 Ajouter `viewMode` dans `EVENT_NAMES` (`mode-changed`) et `INITIAL_STATE` (`'simple'`) dans `store.js`
  - [x] 1.2 Au boot de l'app (`app.js`), lire `localStorage.getItem('w-viewMode')` et appeler `set('viewMode', ...)` si valeur existante
  - [x] 1.3 Ecouter `on('viewMode', ...)` dans `app.js` pour persister dans `localStorage.setItem('w-viewMode', value)` a chaque changement

- [x] Task 2 — Toggle UI global (AC: #1)
  - [x] 2.1 Creer `src/components/view-mode-toggle.js` — exporte `render(container)` qui insere un toggle compact dans le header (`page-layout.js`)
  - [x] 2.2 Le toggle : deux labels "Simple" / "Detaille", style pill/segment control, tap bascule `set('viewMode', ...)` dans le store
  - [x] 2.3 Creer `src/styles/components/view-mode-toggle.css` — style coherent avec l'identite visuelle existante (`--w-*` tokens)
  - [x] 2.4 Integrer le toggle dans `page-layout.js` (header, a droite du titre ou sous le titre)

- [x] Task 3 — Oracle : conditionner l'affichage (AC: #1, #2)
  - [x] 3.1 Dans `tab-oracle.js`, modifier `render()` pour accepter le mode courant via `get('viewMode')`
  - [x] 3.2 Mode simple : afficher header (level pill + titre + journee) + prediction card uniquement
  - [x] 3.3 Mode detaille : afficher en plus Brier card + factor cards grid + journal section (comportement actuel)
  - [x] 3.4 Ecouter `on('viewMode', ...)` pour re-render quand le mode change

- [x] Task 4 — Classement / bottom sheet / score card : conditionner (AC: #1, #2)
  - [x] 4.1 `zone-group.js` / rank rows : masquer Elo et confiance en mode simple, les afficher en mode detaille
  - [x] 4.2 `bottom-sheet.js` : masquer Elo, confiance, forme 5 matchs, probabilites zones en mode simple
  - [x] 4.3 `score-card.js` : masquer Elo, confiance, forme detaillee en mode simple
  - [x] 4.4 `tab-projection.js` : masquer Elo et confiance en mode simple

- [x] Task 5 — Accessibilite (AC: #1)
  - [x] 5.1 Toggle : `role="radiogroup"` ou `role="switch"` avec `aria-label="Mode d'affichage"`, `aria-checked` sur l'option active
  - [x] 5.2 Support clavier : Enter/Space pour basculer, focus-visible outline WCAG AA
  - [x] 5.3 `prefers-reduced-motion` : transition instant si activee
  - [x] 5.4 Les sections masquees en mode simple sont retirees du DOM (pas `display:none`), pas d'aria-hidden inutile

- [x] Task 6 — Tests (AC: #1, #2, #3, #4)
  - [x] 6.1 Tests unitaires `view-mode-toggle.test.js` : render, bascule, etat par defaut `simple`
  - [x] 6.2 Tests `tab-oracle.test.js` : ajouter tests mode simple (sections masquees) vs mode detaille (tout visible)
  - [x] 6.3 Tests store : `viewMode` set/get/event dispatch
  - [x] 6.4 Test persistance : mock localStorage, verifier lecture au boot et ecriture au changement
  - [x] 6.5 Test accessibilite : aria-checked bascule correctement, keyboard Enter/Space

ui-structural: true

## Maquettes

Liens vers les maquettes a produire dans `_bmad-output/mockups/epic-5/` :
- Variant A : toggle pill segment control dans le header
- Variant B : toggle switch minimal dans le header
- Variant C : toggle flottant en bas a droite

GO higgin: oui (variant B — switch minimal dans le header, 2026-04-01)

## Dev Notes

### Architecture du mode simple/detaille

Le mode est un **etat global** gere par le store, PAS un etat local composant. Chaque composant consulte `get('viewMode')` au render et ecoute `on('viewMode', ...)` pour re-render.

**Pattern recommande :** chaque composant qui varie selon le mode doit conditionner le HTML genere dans son `render()` — PAS masquer/afficher via CSS. On ne veut pas de DOM invisible.

**Strategie de re-render :** quand le mode change, les vues deja en cache dans `tabViews` (Map dans `app.js`) doivent etre invalidees. Deux options :
1. **Recommandee :** vider la Map des tab views et re-render la tab active — simple, coherent avec le pattern existant
2. Alternative : chaque composant ecoute le store et fait un self-update — plus complexe, risque de fuites

### Fichiers a modifier

| Fichier | Action |
|---|---|
| `src/store.js` | Ajouter `viewMode` dans EVENT_NAMES et INITIAL_STATE |
| `src/app.js` | localStorage read au boot, persist on change, invalidation tab cache |
| `src/components/page-layout.js` | Slot pour le toggle dans le header |
| `src/components/view-mode-toggle.js` | **NOUVEAU** — composant toggle |
| `src/styles/components/view-mode-toggle.css` | **NOUVEAU** — styles toggle |
| `src/components/tab-oracle.js` | Conditionner render selon viewMode |
| `src/components/zone-group.js` | Conditionner Elo/confiance |
| `src/components/bottom-sheet.js` | Conditionner sections detaillees |
| `src/components/score-card.js` | Conditionner Elo/confiance/forme |
| `src/components/tab-projection.js` | Conditionner Elo/confiance |
| `tests/view-mode-toggle.test.js` | **NOUVEAU** — tests toggle |
| `tests/tab-oracle.test.js` | Ajouter tests par mode |

### Patterns existants a respecter

- **State store** : `set('viewMode', 'simple'|'detaille')`, `get('viewMode')`, `on('viewMode', cb)` — pattern identique a `revealed`, `activeTab`, etc.
- **CSS tokens** : prefixe `--w-`, classes prefixe `w-` — voir `tab-oracle.css` pour reference
- **Escape HTML** : tout contenu dynamique via `esc()` — helper deja present dans `tab-oracle.js`, a copier/importer si necessaire
- **Animations** : seulement `transform` + `opacity`, spring stiffness 200/damping 20, `prefers-reduced-motion` respecte
- **Tab cache** : `app.js` maintient une Map `tabViews` — le toggle viewMode doit invalider cette cache pour forcer le re-render

### Ce qu'il ne faut PAS faire

- Ne PAS creer un nouveau systeme de state — utiliser le store existant
- Ne PAS masquer via CSS (`display:none` ou `visibility:hidden`) — conditionner le DOM genere
- Ne PAS ajouter de spinners ou transitions de chargement entre les modes
- Ne PAS toucher aux tests existants qui passent — ajouter de nouveaux tests
- Ne PAS ajouter de troisieme mode ou de mode intermediaire
- Ne PAS persister dans sessionStorage — c'est localStorage (`w-viewMode` comme cle)

### Lecons des stories precedentes (5-1, 5-2)

- Story 5-1 a cree `tab-oracle.js` avec `render(container, season)` — le composant fait `container.innerHTML = ''` puis reconstruit tout. Le viewMode doit etre lu AVANT la construction HTML.
- Story 5-2 a ajoute le journal (grimoire) avec un toggle local (expand/collapse) — ce toggle local est INDEPENDANT du toggle global simple/detaille. En mode simple, le journal n'apparait pas du tout. En mode detaille, le journal apparait avec son propre toggle expand/collapse.
- Story 5-2 note explicitement : "Pas de toggle simple/detaille global (story 5-3)" — cette story est prevue pour ca.
- Pattern XSS : tout innerHTML doit passer par `esc()`. Critique pour les labels du toggle.

### Project Structure Notes

- Alignement avec la structure existante : 1 fichier JS + 1 fichier CSS par composant dans `src/components/` et `src/styles/components/`
- Le toggle est un composant autonome (`view-mode-toggle.js`) integre dans le layout (`page-layout.js`)
- Tests dans `tests/` a la racine, nommage `{component}.test.js`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.3]
- [Source: _bmad-output/planning-artifacts/prd.md#FR30]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Progressive Disclosure]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR25-32]
- [Source: _bmad-output/implementation-artifacts/5-1-vue-transparence-donnees-sources-et-metriques-du-modele.md]
- [Source: _bmad-output/implementation-artifacts/5-2-journal-de-corrections-et-recalibrage-automatique.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

- Task 1 : Ajout `viewMode` dans le store (EVENT_NAMES + INITIAL_STATE), localStorage read/write dans app.js, invalidation cache tab views sur changement de mode
- Task 2 : Composant `view-mode-toggle.js` (switch variant B — minimal), CSS dediee, integre dans le header via `page-layout.js` avec container `.w-app-header__right`
- Task 3 : Oracle conditionnel — mode simple affiche header + prediction card, mode detaille ajoute Brier card + factor cards + journal
- Task 4 : rank-row.js masque Elo + confiance bar en simple, bottom-sheet.js masque Elo/tier/confiance/form/zones en simple, score-card.js masque mini-card Elo en simple, tab-projection.js masque confiance globale en simple
- Task 5 : Toggle utilise `role="switch"` + `aria-checked` + `aria-label`, Enter/Space keyboard support, `focus-visible` outline, `prefers-reduced-motion` sur toutes les transitions, sections masquees retirees du DOM
- Task 6 : 19 nouveaux tests (view-mode-toggle, store viewMode, localStorage, Oracle mode simple, a11y), 542→561 total, 0 regressions

### Change Log

- 2026-04-01 : Implementation complete story 5-3 — mode simple/detaille avec toggle switch

### File List

**Nouveaux :**
- `src/components/view-mode-toggle.js`
- `src/styles/components/view-mode-toggle.css`
- `tests/view-mode-toggle.test.js`
- `_bmad-output/mockups/epic-5/toggle-variant-a-pill-segment.html`
- `_bmad-output/mockups/epic-5/toggle-variant-b-switch-minimal.html`
- `_bmad-output/mockups/epic-5/toggle-variant-c-floating.html`

**Modifies :**
- `src/store.js` — ajout viewMode dans EVENT_NAMES et INITIAL_STATE
- `src/app.js` — localStorage boot/persist, tab cache invalidation sur viewMode change
- `src/components/page-layout.js` — import toggle, structure header avec .w-app-header__right
- `src/styles/components/page-layout.css` — ajout .w-app-header__right flex container
- `src/components/tab-oracle.js` — import store get, conditionnel viewMode dans render
- `src/components/rank-row.js` — import get, conditionnel Elo/confiance
- `src/components/bottom-sheet.js` — import get, conditionnel Elo/tier/confiance/form/zones
- `src/components/score-card.js` — conditionnel mini-card Elo
- `src/components/tab-projection.js` — import get, conditionnel confiance globale
- `tests/tab-oracle.test.js` — ajout import store, set viewMode detaille dans beforeEach, 5 tests mode simple
- `tests/bottom-sheet.test.js` — import store, set viewMode detaille dans beforeEach
- `tests/rank-row-tap.test.js` — ajout get mock avec viewMode detaille
- `src/__tests__/tab-projection.test.js` — import store, set viewMode detaille dans beforeEach
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — 5-3 in-progress → review
