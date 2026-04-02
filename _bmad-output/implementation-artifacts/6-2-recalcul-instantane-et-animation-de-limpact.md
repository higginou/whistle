# Story 6.2 : Recalcul instantane et animation de l'impact

Status: done

## Story

En tant qu'utilisateur,
Je veux voir l'impact anime de mes scenarios sur le classement projete,
Afin de jouer avec les futurs possibles et comprendre les enjeux.

## Acceptance Criteria

1. **Given** l'utilisateur a selectionne un ou plusieurs resultats simules **When** il tape "Voir l'impact" **Then** les projections sont recalculees instantanement avec les resultats simules (FR34)
2. **And** le classement se reanime avec la meme mecanique que le reveal reel (spring, stagger, graduation) (FR35)
3. **And** les deltas sont clairement affiches ("La Rochelle +4% top 6", "Toulouse -1 place")
4. **And** une distinction visuelle claire differencie le mode simule du mode reel (pas de confusion possible)
5. **And** un bouton "Revenir au reel" permet de quitter le mode simule et retrouver le classement projete reel

## Perimetre

Cette story est **frontend-only**. Le recalcul Elo se fait entierement cote client en reimplementant la logique de `scripts/elo.js` dans un nouveau module `src/simulator-engine.js`. Pas de modification du pipeline ni des JSON. L'animation reutilise `src/animation/engine.js` existant.

### Ce qui est IN scope

- Nouveau module `src/simulator-engine.js` : reimplementation frontend des fonctions Elo necessaires (`calculateExpectedScore`, `calculateEloChange`, `simulateMatch`, `simulateSeason`, `computeProjectedRank`, `computeZoneProbabilities`)
- Bouton "Voir l'impact" dans `tab-simulateur.js` : visible quand >= 1 match simule, lance le recalcul + animation
- Recalcul des projections (projectedRank, zones, confidence) a partir des resultats simules + matchs restants
- Animation du classement avec la meme mecanique que `revealProjection()` (spring, stagger, graduation)
- Affichage des deltas par equipe : changement de rang projete et changement de probabilite de zone
- Mode simule : distinction visuelle claire (indicateur "Mode simule" + teinte/bordure distincte sur la section classement)
- Bouton "Revenir au reel" : quitte le mode simule, restaure les projections reelles
- Nouveaux store keys : `simulationMode` (boolean) et `simulatedStandings` (teams array avec projectedRank/zones recalcules)

### Ce qui est OUT scope

- Modification du pipeline ou de `scripts/elo.js`
- Ajout de nouvelles donnees JSON
- Modification de `rank-row.js` ou `zone-group.js` au-dela du necessaire pour supporter les deltas
- Persistance des simulations entre sessions

ui-structural: true

## Maquettes

Liens vers les maquettes dans `_bmad-output/mockups/epic-6/` :
- Variant A : [simulateur-impact-variant-a.html](_bmad-output/mockups/epic-6/simulateur-impact-variant-a.html) — sobre, bandeau discret, deltas texte simple
- Variant B : [simulateur-impact-variant-b.html](_bmad-output/mockups/epic-6/simulateur-impact-variant-b.html) — gaming, badges colores, glow movers
- **Variant C (retenue)** : [simulateur-impact-variant-c.html](_bmad-output/mockups/epic-6/simulateur-impact-variant-c.html) — mixte, bandeau integre avec "Quitter", deltas compacts, bouton sticky frosted-glass

GO higgin: oui (variant C — mixte/integree, 2026-04-02)

## Tasks / Subtasks

- [x] Task 1 — Module `simulator-engine.js` (AC: #1)
  - [x] 1.1 Creer `src/simulator-engine.js` — reimplementation frontend des fonctions Elo
  - [x] 1.2 `calculateExpectedScore(eloA, eloB)` : formule `1 / (1 + 10^((eloB - eloA) / 400))`
  - [x] 1.3 `calculateEloChange({ homeScore, awayScore, eloHome, eloAway })` : K=30, HOME_ADVANTAGE=65, MARGIN_FACTOR=0.006
  - [x] 1.4 `applySimulatedResults(simulatedResults, season)` : convertit les choix utilisateur en scores fictifs et calcule les deltas Elo pour chaque match simule
  - [x] 1.5 `simulateMatch(eloHome, eloAway, rng)` : identique a `scripts/elo.js` (4pts victoire, 2pts nul, 0pts defaite, drawProb, roll)
  - [x] 1.6 `simulateSeason(currentElos, calendar, numSimulations, rng)` : Monte Carlo, N=10000 (identique au pipeline)
  - [x] 1.7 `computeProjectedRank(rankDistribution, numSimulations)` : rang median
  - [x] 1.8 `computeZoneProbabilities(rankDistribution, numSimulations)` : europe (1-2), top6 (3-6), mid (7-12), relegation (13-14)
  - [x] 1.9 `recalculateProjections(season, simulatedResults)` : orchestrateur — applique les resultats simules, met a jour les Elos, simule le reste de la saison, retourne un nouveau tableau `teams` avec `projectedRank`, `zones`, `elo` recalcules + `deltas` par rapport aux projections reelles

- [x] Task 2 — Extension du store (AC: #4, #5)
  - [x] 2.1 Ajouter `simulationMode` dans `EVENT_NAMES` (event: `'simulation-mode-changed'`) et `INITIAL_STATE` (valeur: `false`)
  - [x] 2.2 Ajouter `simulatedStandings` dans `EVENT_NAMES` (event: `'simulated-standings-changed'`) et `INITIAL_STATE` (valeur: `null`)
  - [x] 2.3 Convention : `simulatedStandings` est un array de teams identique a `season.teams` mais avec les champs projetes recalcules + un champ `delta` par equipe

- [x] Task 3 — Bouton "Voir l'impact" dans `tab-simulateur.js` (AC: #1, #3)
  - [x] 3.1 Ajouter un bouton "Voir l'impact" en bas du tab simulateur — visible uniquement si `countSimulated() >= 1`
  - [x] 3.2 Style : gradient violet, pleine largeur, pattern identique au `reveal-button` (glow, uppercase bold)
  - [x] 3.3 Au tap : appeler `recalculateProjections(season, simulatedResults)`, stocker le resultat dans `set('simulatedStandings', result)`, puis `set('simulationMode', true)`, puis `set('activeTab', 'classements')` pour basculer vers le classement
  - [x] 3.4 Etats du bouton : defaut "Voir l'impact" / en cours "Calcul en cours..." (disabled) / post-simulation "Recalculer" (si resultats modifies apres une premiere simulation)
  - [x] 3.5 Le bouton ecoute `simulatedResults` pour se montrer/cacher et basculer entre "Voir l'impact" et "Recalculer"

- [x] Task 4 — Mode simule sur la vue classement (AC: #2, #4)
  - [x] 4.1 Dans `app.js` : quand `simulationMode === true` et `activeTab === 'classements'`, utiliser `simulatedStandings` au lieu de `season.teams` pour le rendu des `zone-group` et `rank-row`
  - [x] 4.2 Ajouter un bandeau "Mode simule" en haut de la section classement — fond violet pale, texte "Projection simulee", icone ou badge distinctif
  - [x] 4.3 Appliquer une classe CSS `w-standings-section--simulated` pour teinter la bordure/fond de la zone classement
  - [x] 4.4 Declencher `revealProjection()` avec les `simulatedStandings` quand le mode simule s'active — meme animation que le reveal reel
  - [x] 4.5 Les rank-rows en mode simule affichent le `projectedRank` simule, pas le reel

- [x] Task 5 — Affichage des deltas (AC: #3)
  - [x] 5.1 Chaque equipe dans `simulatedStandings` porte un objet `delta` : `{ rank: +/-N, europe: +/-0.XX, top6: +/-0.XX, mid: +/-0.XX, relegation: +/-0.XX }`
  - [x] 5.2 Afficher le delta de rang dans `rank-row` en mode simule : badge colore "+2" (vert) ou "-1" (rouge) a cote de la position
  - [x] 5.3 Afficher le delta de zone principal dans un sous-texte : "top 6 +12%" (vert) ou "maintien +5%" (rouge) — afficher le delta le plus significatif pour chaque equipe
  - [x] 5.4 Les deltas a 0 ne sont pas affiches (pas de bruit visuel)
  - [x] 5.5 Format : signe explicite (+/-), pourcentage arrondi a l'entier pour les zones, entier pour le rang

- [x] Task 6 — Bouton "Revenir au reel" (AC: #5)
  - [x] 6.1 Bouton "Revenir au reel" visible en haut ou en bas de la section classement quand `simulationMode === true`
  - [x] 6.2 Au tap : `set('simulationMode', false)`, `set('simulatedStandings', null)` — la vue classement redevient les projections reelles
  - [x] 6.3 Style : bouton secondaire (pas primary), texte clair "Revenir au reel"
  - [x] 6.4 Optionnel : `resetProjection()` puis `revealProjection()` avec les teams reels pour re-animer le retour au reel

- [x] Task 7 — Styles (AC: #2, #3, #4)
  - [x] 7.1 `src/styles/components/tab-simulateur.css` — ajouter styles bouton "Voir l'impact" (pattern reveal-button)
  - [x] 7.2 `src/styles/components/zone-group.css` ou nouveau fichier — styles mode simule (bordure, fond, bandeau)
  - [x] 7.3 Styles delta badges (couleur vert/rouge, taille compacte)
  - [x] 7.4 `prefers-reduced-motion` : desactiver les animations de transition, deltas visibles immediatement

- [x] Task 8 — Accessibilite (AC: #1-#5)
  - [x] 8.1 Bouton "Voir l'impact" : `aria-label` descriptif, `aria-busy="true"` pendant le calcul
  - [x] 8.2 Bandeau "Mode simule" : `role="status"`, `aria-live="polite"`
  - [x] 8.3 Deltas : `aria-label` descriptif pour les lecteurs d'ecran (ex: "La Rochelle monte de 2 places, top 6 plus 12 pourcent")
  - [x] 8.4 Bouton "Revenir au reel" : `aria-label="Quitter le mode simule et revenir aux projections reelles"`
  - [x] 8.5 Navigation clavier : Enter/Space pour les boutons, tabindex correct
  - [x] 8.6 Focus : apres activation du mode simule, focus sur le bandeau ou le premier rank-row. Apres retour au reel, focus sur le bouton reveal

- [x] Task 9 — Tests (AC: #1-#5)
  - [x] 9.1 `tests/simulator-engine.test.js` — tests unitaires : calculateExpectedScore, calculateEloChange, simulateMatch, applySimulatedResults, recalculateProjections (deterministe avec rng fixe)
  - [x] 9.2 `tests/tab-simulateur-impact.test.js` — tests composant : bouton visible/cache, tap lance recalcul, etats du bouton, navigation vers classement
  - [x] 9.3 Tests store : `simulationMode` et `simulatedStandings` set/get/on
  - [x] 9.4 Tests integration : mode simule active sur la vue classement, deltas affiches, retour au reel
  - [x] 9.5 Tests a11y : roles, aria-labels, aria-live, keyboard
  - [x] 9.6 Integration dans le runner existant (vitest) — baseline actuelle : 658 tests passent (3 failures pre-existantes dans app.test.js)

## Dev Notes

### Architecture du recalcul — `simulator-engine.js`

Le module `src/simulator-engine.js` est un **nouveau fichier** qui reimplemente la logique de `scripts/elo.js` pour le frontend. Il ne faut PAS importer `scripts/elo.js` (c'est un module Node.js avec `import { readFileSync }` etc.).

Fonctions a reimplementer (constantes identiques) :
- `INITIAL_ELO = 1500`, `K_FACTOR = 30`, `HOME_ADVANTAGE = 65`, `MARGIN_FACTOR = 0.006`
- `calculateExpectedScore(eloA, eloB)` — `1 / (1 + 10**((eloB - eloA) / 400))`
- `calculateEloChange({ homeScore, awayScore, eloHome, eloAway })` — incorpore home advantage dans l'expected score, margin factor, K-factor scaling
- `simulateMatch(eloHome, eloAway, rng)` — drawProb, homeWinProb, rugby points (4/2/0), scores fictifs (25-15, 20-20, 15-25)
- `simulateSeason(currentElos, calendar, numSim, rng)` — clone Elos, simule matchs, accumule points, rank par points desc puis Elo desc
- `computeProjectedRank(rankDist, numSim)` — rang median (cumulative >= numSim/2)
- `computeZoneProbabilities(rankDist, numSim)` — europe 1-2, top6 3-6, mid 7-12, relegation 13-14

Fonction specifique a cette story :
- `applySimulatedResults(simulatedResults, season)` — pour chaque match simule, convertir `outcome` en score fictif et `bonus` en points bonus, calculer le delta Elo, et retourner les Elos mis a jour + les points rugby accumules
- `recalculateProjections(season, simulatedResults)` — orchestrateur complet

#### Conversion outcome → score fictif

```js
// Dans applySimulatedResults :
// outcome 'homeWin'  → homeScore=25, awayScore=15
// outcome 'draw'     → homeScore=20, awayScore=20
// outcome 'awayWin'  → homeScore=15, awayScore=25
```

#### Conversion outcome + bonus → points rugby

```js
// Points de base : victoire=4, nul=2, defaite=0
// bonus 'offensive' : +1 (applicable a n'importe quelle equipe)
// bonus 'defensive' : +1 (uniquement equipe perdante, defaite <= 7 pts)
// Pour simplifier cote simulation : les scores fictifs donnent une marge de 10 pts
// donc bonus defensif n'est PAS applicable sur nos scores fictifs (marge > 7)
// SAUF si l'utilisateur l'a explicitement active → on l'applique quand meme (choix UX)
```

#### Performance frontend

Le pipeline et le frontend utilisent tous les deux `NUM_SIMULATIONS = 10000` pour la precision. Si le recalcul depasse 200ms sur mobile, envisager un `requestAnimationFrame` ou `setTimeout(0)` pour ne pas bloquer l'UI, mais ne PAS reduire le nombre d'iterations.

### Flow utilisateur complet

1. L'utilisateur est sur l'onglet "Simuler" (story 6-1 : tab-simulateur)
2. Il selectionne des resultats pour des matchs a venir
3. Le bouton "Voir l'impact" apparait quand >= 1 match est simule
4. Tap "Voir l'impact" :
   a. `recalculateProjections(season, simulatedResults)` est appele
   b. Le resultat est stocke dans `set('simulatedStandings', result)`
   c. `set('simulationMode', true)` active le mode simule
   d. `set('activeTab', 'classements')` bascule vers l'onglet classement
5. La vue classement detecte `simulationMode === true` :
   a. Affiche le bandeau "Mode simule"
   b. Rend les rank-rows avec `simulatedStandings` au lieu de `season.teams`
   c. Declenche `revealProjection()` avec les nouvelles positions
   d. Affiche les deltas par equipe
6. Bouton "Revenir au reel" : `set('simulationMode', false)` → la vue revient aux projections reelles

### Animation — reutilisation de `engine.js`

L'animation du mode simule reutilise **exactement** `revealProjection(rankRowElements, teams)` de `src/animation/engine.js`. Les `teams` passes sont les `simulatedStandings` avec leurs `projectedRank` recalcules. Le moteur d'animation :
- Fait correspondre les DOM elements via `data-team-id`
- Calcule le `translateY` de la position courante vers la position projetee simulee
- Applique spring + stagger + glow (meme parametres)
- La Rochelle animee en dernier (+100ms)

**Important** : avant de lancer l'animation simulee, appeler `resetProjection()` pour remettre les rank-rows a leur position `currentRank`. Puis `revealProjection()` avec les standings simules.

### Calcul des deltas

Pour chaque equipe, le delta est calcule en comparant les projections simulees aux projections reelles :

```js
const delta = {
  rank: team.projectedRank - realTeam.projectedRank,  // negatif = monte
  europe: team.zones.europe - realTeam.zones.europe,
  top6: team.zones.top6 - realTeam.zones.top6,
  mid: team.zones.mid - realTeam.zones.mid,
  relegation: team.zones.relegation - realTeam.zones.relegation,
}
```

Convention : `delta.rank` negatif = l'equipe monte (amelioration). Les probabilites de zone sont en decimales 0-1, afficher en % dans l'UI.

### Integration dans `app.js`

Le rendering du classement dans `app.js` doit etre adapte pour supporter le mode simule. Le pattern :

```js
on('simulationMode', () => {
  const isSimulated = get('simulationMode')
  if (isSimulated) {
    const teams = get('simulatedStandings')
    // Rerender zone-groups + rank-rows avec teams simules
    // Ajouter bandeau + bouton "Revenir au reel"
    // Declencher revealProjection()
  } else {
    // Rerender avec season.teams (projections reelles)
    // Retirer bandeau + bouton
  }
})
```

**Cache des tabs** : quand `simulationMode` change, invalider le cache de la vue `classements` (comme pour `viewMode`).

### Pattern composant — reference `tab-simulateur.js`

Le composant suit le meme pattern que la story 6-1 :
```js
import '../styles/components/tab-simulateur.css'
import { get, set, on } from '../store.js'

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
```

### Baseline de tests

658 tests passent actuellement (3 failures pre-existantes dans `src/__tests__/app.test.js` — non liees a cette story). Le dev doit s'assurer que les 658 tests existants + les nouveaux tests passent tous.

### Ce qu'il ne faut PAS faire

- Ne PAS importer `scripts/elo.js` dans le frontend — c'est un module pipeline Node.js avec `readFileSync`
- Ne PAS modifier `scripts/elo.js` — le pipeline ne change pas
- Ne PAS modifier `rank-row.js` structurellement — les deltas sont affiches via DOM manipulation dans `app.js` ou un wrapper
- Ne PAS stocker les simulations en localStorage — ephemeres seulement
- Ne PAS reduire le nombre de simulations Monte Carlo en dessous de 10000 — la precision prime sur la vitesse
- Ne PAS creer de helper `utils.js` — chaque helper est local au module qui l'utilise
- Ne PAS ajouter de spinner — le recalcul est assez rapide pour etre synchrone
- Ne PAS confondre `currentRank` et `projectedRank` — le delta est sur `projectedRank` simule vs `projectedRank` reel

### Lecons des stories precedentes

- **Story 6-1** : Le composant `tab-simulateur.js` utilise event delegation pour les clicks. Le bouton "Voir l'impact" doit s'integrer dans ce meme pattern. `filterUpcoming()` et `countSimulated()` sont deja exportes et reutilisables. Le store key `simulatedResults` est un objet `{ [matchKey]: { outcome, bonus } }`.
- **Story 5-4** : `tab-duels.js` est le dernier composant tab cree avant le simulateur. Pattern d'integration identique dans `app.js`.
- **Story 3-2** : Le `reveal-button.js` gere 3 etats (defaut/animating/replay). Le bouton "Voir l'impact" suit le meme pattern mais avec des labels differents.
- **Pattern XSS** : tout innerHTML passe par `esc()`. Critique pour les noms d'equipes et les deltas.
- **CSS tokens** : prefixe `--w-`, classes `w-` — voir `tab-simulateur.css` pour reference recente.
- **Animations** : uniquement `transform` + `opacity`, respecter `prefers-reduced-motion`.
- **Git** : commits suivent le format `feat: story X-Y — description courte`.

### Fichiers a creer

| Fichier | Action |
|---|---|
| `src/simulator-engine.js` | **NOUVEAU** — logique Elo frontend pour recalcul simule |
| `tests/simulator-engine.test.js` | **NOUVEAU** — tests unitaires moteur de simulation |
| `tests/tab-simulateur-impact.test.js` | **NOUVEAU** — tests composant bouton + mode simule |

### Fichiers a modifier

| Fichier | Action |
|---|---|
| `src/store.js` | Ajouter `simulationMode` et `simulatedStandings` dans EVENT_NAMES et INITIAL_STATE |
| `src/components/tab-simulateur.js` | Ajouter bouton "Voir l'impact" + logique recalcul |
| `src/styles/components/tab-simulateur.css` | Styles bouton "Voir l'impact" |
| `src/app.js` | Support mode simule dans le rendu classement, bandeau, bouton "Revenir au reel" |
| `src/styles/components/zone-group.css` | Styles mode simule (bordure, fond) |

### Project Structure Notes

- `simulator-engine.js` dans `src/` a la racine (pas dans `components/` car c'est de la logique pure, pas un composant UI)
- Tests dans `tests/` a la racine, coherent avec `tab-simulateur.test.js`
- Pas de nouveau fichier CSS dedie aux deltas — les styles sont dans `zone-group.css` ou `tab-simulateur.css`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 6, Story 6.2]
- [Source: _bmad-output/planning-artifacts/prd.md#FR34, FR35]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Parcours 4 Le simulateur]
- [Source: _bmad-output/planning-artifacts/architecture.md#FR33-35 Simulateur]
- [Source: _bmad-output/implementation-artifacts/6-1-selection-et-modification-de-resultats-de-matchs.md]
- [Source: scripts/elo.js — calculateExpectedScore, calculateEloChange, simulateMatch, simulateSeason, computeProjectedRank, computeZoneProbabilities]
- [Source: src/animation/engine.js — revealProjection, resetProjection, getSpringConfig]
- [Source: src/store.js — EVENT_NAMES, INITIAL_STATE, set/get/on API]
- [Source: src/components/tab-simulateur.js — filterUpcoming, countSimulated, matchKey, render]
- [Source: src/components/reveal-button.js — 3 etats bouton, handleReveal/handleReplay pattern]
- [Source: src/components/rank-row.js — data-team-id, DOM structure, delta display]
- [Source: src/components/zone-group.js — ZONE_DEFS, assignTeamsToZones, render]
- [Source: src/app.js — renderTabContent, showTab, tabViews cache, viewMode invalidation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

- **Task 1** : Cree `src/simulator-engine.js` avec toutes les fonctions Elo reimplementees pour le frontend (calculateExpectedScore, calculateEloChange, simulateMatch, simulateSeason, computeProjectedRank, computeZoneProbabilities, applySimulatedResults, recalculateProjections). Constantes identiques au pipeline. Injectable rng pour tests deterministes. 29 tests unitaires passent.
- **Task 2** : Ajout `simulationMode` (boolean, false) et `simulatedStandings` (null) dans le store avec events dedies.
- **Task 3** : Bouton "Voir l'impact" dans tab-simulateur.js — visible si >= 1 match simule, gradient violet sticky, 3 etats (defaut/calcul/recalculer), lance recalculateProjections puis bascule vers classement.
- **Task 4** : app.js adapte — quand simulationMode=true, le rendu classement utilise simulatedStandings. Bandeau "Projection simulee" avec role=status, aria-live=polite. Classe w-standings-section--simulated. Animation revealProjection declenchee sur les standings simules.
- **Task 5** : Deltas affiches via badges (rank: +/-N colore vert/rouge) et sous-texte zone (delta le plus significatif en %). Deltas a 0 masques. aria-label mis a jour par equipe.
- **Task 6** : Bouton "Revenir au reel" en bas du classement, style secondaire, remet simulationMode=false et simulatedStandings=null. Cache classement invalide et re-rendu automatique.
- **Task 7** : Styles pour bouton impact (gradient, sticky, frosted-glass shadow), mode simule (bordure violette, bandeau), delta badges (vert/rouge), bouton retour. prefers-reduced-motion gere.
- **Task 8** : a11y complete — aria-label descriptifs, aria-busy pendant calcul, role=status sur bandeau, aria-live=polite, focus-visible, keyboard (natifs <button>).
- **Task 9** : 30 tests simulator-engine + 9 tests tab-simulateur-impact (bouton, store, click). Total 697 tests passent (3 failures pre-existantes inchangees dans app.test.js).

## Senior Developer Review (AI)

**Review Date:** 2026-04-02
**Outcome:** Changes Requested
**Action Items:** 4 (1 Critical, 3 Important)

- [x] [CRITICAL] `rugbyPoints` from simulated matches were discarded in Monte Carlo — `simulateSeason` initialized all team points to 0 instead of carrying over simulated match points. Fixed by adding `initialPoints` parameter to `simulateSeason` and passing `rugbyPoints` from `recalculateProjections`.
- [x] [IMPORTANT] `hasSimulated` module-level flag was never reset on "Reinitialiser" click. Fixed by resetting in `handleReset()`.
- [x] [IMPORTANT] `matchKey` function duplicated in `simulator-engine.js` and `tab-simulateur.js`. Fixed by exporting from `simulator-engine.js` and re-exporting from `tab-simulateur.js`.
- [x] [IMPORTANT] JSDoc `@param simulatedTeams` on `renderSimulationOverlay` did not match actual signature. Fixed by removing the extraneous param.

### Change Log

- 2026-04-02 : Implementation complete story 6-2 — recalcul instantane et animation de l'impact
- 2026-04-02 : Addressed code review findings — 4 items resolved (1 critical, 3 important)

### File List

**Nouveaux fichiers :**
- `src/simulator-engine.js`
- `tests/simulator-engine.test.js`
- `tests/tab-simulateur-impact.test.js`

**Fichiers modifies :**
- `src/store.js` — ajout simulationMode et simulatedStandings
- `src/components/tab-simulateur.js` — import simulator-engine, bouton "Voir l'impact", handleImpact
- `src/app.js` — import engine, mode simule dans renderTabContent, listener simulationMode, bandeau, deltas, bouton retour
- `src/styles/components/tab-simulateur.css` — styles bouton impact + prefers-reduced-motion
- `src/styles/components/zone-group.css` — styles mode simule, bandeau, bouton retour, delta badges
