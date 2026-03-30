# Story 5.1 : Vue transparence — donnees sources et metriques du modele

Status: review

ui-structural: true

## Story

En tant qu'utilisateur,
Je veux consulter les donnees sources du modele, le Brier Score et le taux de prediction,
Afin de jauger la fiabilite des projections au fil de la saison.

## Acceptance Criteria (BDD)

1. **Onglet Oracle actif** — quand l'utilisateur tape sur l'onglet "Oracle" dans la bottom-nav, le contenu de transparence s'affiche dans le viewport (remplace le placeholder actuel)
2. **Brier Score en carte Legendaire** — le Brier Score (`season.brierScore`) est affiche dans une carte hero avec bordure animee holographique et indicateur visuel de qualite (vert < 0.25 = bon, orange 0.25-0.40 = moyen, rouge > 0.40 = faible). Si `null` (debut de saison), afficher "Pas encore assez de donnees — l'Oracle se reveillera apres la journee 5"
3. **Taux de prediction** — le nombre de matchs correctement predits est affiche (calculer depuis `season.predictions` : comparer `projectedRank` predit vs `currentRank` effectif a chaque journee)
4. **Facteurs du modele en cartes** — 6 cartes en grille 2 colonnes montrant les facteurs Elo : Elo de base, forme recente, facteur domicile/exterieur, calendrier pondere, confiance, zones. Chaque carte a une icone, un titre, une description et une barre de progression. PAS de liste d'equipes.
5. **Esthetique jeu video** — style carte a collectionner (Card Collection), animation flip-reveal au chargement, bordures avec glow selon la qualite, palette or+violet sur fond sombre
6. **Prefers-reduced-motion** — toutes les animations (flip, glow, shimmer) desactivees, transitions instantanees
7. **Accessibilite** — aria-labels sur toutes les cartes et sections, tabindex sur les elements interactifs, support clavier (Enter/Space), outline focus-visible WCAG AA

## FRs couvertes

FR25 (donnees sources du modele), FR26 (Brier Score et evolution), FR27 (matchs correctement predits)

## Tasks / Subtasks

- [x] Task 1 : Creer le composant `tab-oracle.js` + `tab-oracle.css` (AC: #1, #2, #4, #5)
  - [x] 1.1 Creer `src/components/tab-oracle.js` avec `render(container, season)` exportee
  - [x] 1.2 Creer `src/styles/components/tab-oracle.css` avec classes prefixees `w-oracle-*`
  - [x] 1.3 Carte Legendaire Brier Score : bordure holographique animee (conic-gradient spin), glow pulsant, indicateur qualite (vert/orange/rouge), valeur grand format
  - [x] 1.4 Grille 2 colonnes de 6 cartes facteurs : icone SVG + titre + description + barre de progression par facteur (Elo de base, forme recente, facteur domicile, calendrier pondere, confiance, zones)
  - [x] 1.5 Animation flip-reveal des cartes au premier affichage (stagger 100ms)
  - [x] 1.6 Gerer l'etat `brierScore: null` (message "Pas encore assez de donnees — l'Oracle se reveillera apres la journee 5")

- [x] Task 2 : Logique metier — calcul taux prediction (AC: #3)
  - [x] 2.1 Fonction `computePredictionRate(season)` dans `tab-oracle.js` : iterer `season.predictions`, comparer projections vs resultats reels
  - [x] 2.2 Retourner `{ correct, total, rate }` (entier, entier, decimal 0-1)
  - [x] 2.3 Gerer le cas ou `predictions` est vide ou absent → afficher "Pas encore de predictions"

- [x] Task 3 : Integration dans `app.js` (AC: #1)
  - [x] 3.1 Importer `render as renderOracle` depuis `tab-oracle.js`
  - [x] 3.2 Remplacer le `renderPlaceholder` du case `'oracle'` par `renderOracle(container, season)`

- [x] Task 4 : Accessibilite et motion (AC: #6, #7)
  - [x] 4.1 Aria-labels : `section[aria-label="Transparence du modele"]`, chaque carte `article[aria-label="Brier Score 0.23, qualite bonne"]`
  - [x] 4.2 Tabindex sur les cartes interactives, focus-visible outline WCAG AA
  - [x] 4.3 CSS : `@media (prefers-reduced-motion: reduce)` → desactiver flip, glow, shimmer, transitions

- [x] Task 5 : Tests (AC: #1-7)
  - [x] 5.1 Test unitaire `computePredictionRate()` — cas nominal, vide, null
  - [x] 5.2 Test unitaire logique Brier Score display (seuils bon/moyen/faible)
  - [x] 5.3 Test composant : `render()` produit le DOM attendu avec des donnees de saison

## Maquettes

> **ui-structural: true** — cette story cree un nouveau contenu d'onglet avec une nouvelle vue de transparence.

Variantes produites dans `_bmad-output/mockups/epic-5/` :
- Variante A : `oracle-v2-rpg-stats.html` — ecran de stats RPG
- **Variante B : `oracle-v2-card-collection.html`** — collection de cartes (RETENUE)
- Variante C : `oracle-v2-mission-control.html` — briefing de mission HUD

Direction retenue : **Card Collection** — esthetique carte a collectionner, Brier Score en carte "Legendaire" avec bordure holographique animee, 6 cartes facteurs en grille 2 colonnes avec flip-reveal, palette or+violet.

Feedback higgin : pas de liste d'equipes dans Oracle, seulement les facteurs du modele. Plus jeu video.

**GO higgin : oui** (2026-03-30)

## Dev Notes

### Contexte architectural

- L'onglet **Oracle** existe deja dans la bottom-nav et dans `app.js` (line 73-78) comme placeholder. Il suffit de remplacer le `renderPlaceholder` par le nouveau composant.
- Respecter le pattern 1 composant = 1 JS + 1 CSS, meme nom (`tab-oracle.js` / `tab-oracle.css`).
- Le composant exporte `render(container, season)` comme `tab-projection.js` et `tab-donjon.js`.

### Donnees JSON disponibles

Le JSON `2025-2026.json` contient deja :
- `season.brierScore` (top-level, actuellement `null` en J20)
- `season.predictions[]` (historique append-only avec `matchday`, `date`, `projections[]`)
- `season.teams[].elo`, `.confidence`, `.form`, `.trend`, `.zones`
- `season.matchday`, `season.lastUpdated`

**Spike schema (retro4-spike-schema-json-epic5) :** les champs existants sont suffisants pour la story 5-1. Extensions au fil des stories suivantes (journal corrections = story 5-2).

### Patterns existants a suivre

| Pattern | Reference | Detail |
|---------|-----------|--------|
| Tab composant | `src/components/tab-projection.js` | Meme signature `render(container, season)`, meme import dans app.js |
| Tab composant | `src/components/tab-donjon.js` | Pattern le plus recent — suivre sa structure |
| Disclosure progressive | `src/components/bottom-sheet.js` | Expand/collapse avec aria-expanded |
| Couleurs de zone | `src/components/zone-group.js` | Classes `w-zone-europe`, `w-zone-top6`, etc. |
| XSS protection | `src/components/achievement-card.js` | Fonction `esc()` pour echapper innerHTML |
| Tactile feedback | `src/components/achievement-card.js` | `scale(0.97)` spring 150ms sur tap |
| Equipe couleurs | `src/components/bottom-sheet.js` | `TEAM_COLORS` lookup (attention: duplication — retro3 note, ne pas creer 3eme copie sans extraire) |

### TEAM_COLORS duplication

La constante `TEAM_COLORS` est dupliquee dans `bottom-sheet.js` et `score-card.js`. La retro Epic 3 recommande d'extraire dans `team-identity.js` si un 3eme usage apparait. **Si cette story necessite TEAM_COLORS**, c'est le moment d'extraire dans un module partage `src/team-identity.js`. Sinon, ne pas le faire preemptivement.

### Animation

- Pas d'animation complexe dans cette story — la vue Oracle est principalement informationnelle.
- Transition expand/collapse des details equipe : `opacity` + `transform: scaleY()` ou `translateY()`, jamais `height`.
- Respect de `prefers-reduced-motion` dans le CSS ET dans le JS (pas de spring si reduce).

### Store

- **Pas de nouveau state store necessaire** — la vue Oracle lit `season` via `get('season')` comme les autres onglets.
- Si disclosure progressive necessite un etat (equipe expandee), gerer en local dans le composant (variable module-level), pas dans le store global.

### Budget performance

- Budget actuel : ~24 KB gz / 200 KB (marge 88%).
- Impact estime : ~1-2 KB JS + ~0.5 KB CSS = negligeable.
- Pas de nouvelles dependances.

### Ce que cette story NE fait PAS

- Pas de journal de corrections (story 5-2)
- Pas de toggle simple/detaille (story 5-3)
- Pas de micro-classement confrontations directes (story 5-4)
- Pas de graphique d'evolution Brier Score — juste la valeur actuelle + indicateur qualite
- Pas d'extension du pipeline JSON — les donnees existantes suffisent

### Project Structure Notes

- Nouveaux fichiers : `src/components/tab-oracle.js`, `src/styles/components/tab-oracle.css`
- Fichier modifie : `src/app.js` (import + case oracle)
- Alignement total avec la structure existante, zero variance.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5, Story 5.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Flow 3 Understand Model]
- [Source: _bmad-output/planning-artifacts/prd.md#FR25-FR27]
- [Source: _bmad-output/implementation-artifacts/epic-4-retro-2026-03-30.md#Preparation Epic 5]
- [Source: sprint-status.yaml#retro4-spike-schema-json-epic5 — champs existants suffisants]

### Learnings des epics precedents

- **XSS obligatoire** (DoD #9) : tout innerHTML avec donnees JSON doit passer par `esc()`. Copier le pattern de `achievement-card.js`.
- **Fichier story obligatoire** (DoD #2) : ce fichier.
- **Tests green** (DoD #1) : `npx vitest run` et `npx biome check .` doivent passer avant review.
- **Spikes pre-epic** : le spike schema JSON confirme que les champs existants suffisent.
- **19 tests pre-existants** : corriges dans `retro4-fix-tests-season-schema` (done). La suite de tests est propre.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- jsdom n'a pas `window.matchMedia` — ajout guard `typeof window.matchMedia === 'function'` avant appel

### Completion Notes List

- Composant `tab-oracle.js` cree avec `render(container, season)`, pattern identique a `tab-donjon.js` et `tab-projection.js`
- CSS `tab-oracle.css` fidele a la maquette `oracle-v2-card-collection.html` retenue — palette or+violet, carte Legendaire Brier Score avec bordure holographique animee, grille 2 colonnes 6 cartes facteurs
- `computePredictionRate(season)` et `getBrierQuality(score)` exportees pour tests
- Etat brierless (brierScore null) avec message "Oracle se reveillera apres la journee 5"
- Carte prediction rate avec correct/total depuis `season.predictions`
- 6 cartes facteurs avec icones SVG, descriptions, barres de progression, rarete (high/mid/low)
- Animation flip-reveal des cartes au chargement avec stagger 100ms, skip si `prefers-reduced-motion`
- Barres de progression animees de 0% a la valeur cible, skip si `prefers-reduced-motion`
- CSS `@media (prefers-reduced-motion: reduce)` desactive toutes les animations et transitions
- Aria-labels sur toutes les sections et cartes, tabindex sur les cartes facteurs, focus-visible outline WCAG AA
- XSS protection via `esc()` sur toutes les valeurs injectees en innerHTML
- Integration dans `app.js` : import `renderOracle`, remplacement du placeholder dans case `'oracle'`
- 15 tests (4 computePredictionRate, 4 getBrierQuality, 7 render DOM) — 513/513 tests suite complete green
- Pas de TEAM_COLORS necessaire — pas d'extraction `team-identity.js` (conforme aux dev notes)
- Biome check: 0 erreurs
- Review fix [HIGH]: barres de progression utilisent `transform: scaleX()` au lieu de `width` (regle animation CLAUDE.md)
- Review fix [MEDIUM]: guard NaN pour brierScore corrompu — fallback vers brierless
- Review fix [MEDIUM]: ajout tests DOM pour variantes qualite moyen, faible, et brierScore invalide

### Change Log

- 2026-03-30 : Implementation complete story 5-1 — tab-oracle composant, CSS, integration app.js, 12 tests
- 2026-03-30 : Corrections code review — scaleX() bar fills, NaN guard, 3 tests supplementaires (15 total)

### File List

- src/components/tab-oracle.js (new)
- src/styles/components/tab-oracle.css (new)
- src/app.js (modified — import + case oracle)
- tests/tab-oracle.test.js (new)
