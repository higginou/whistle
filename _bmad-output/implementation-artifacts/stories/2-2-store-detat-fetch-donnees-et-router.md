# Story 2.2 : Store d'etat, fetch donnees et router

**Epic:** 2 — Score Card & Situation Equipe Favorite
**Status:** done
**ui-structural:** false

## User Story

En tant qu'utilisateur,
Je veux que l'app charge les donnees de saison et les rende disponibles a tous les composants,
Afin que l'ouverture soit instantanee et la navigation fluide.

## Acceptance Criteria

**Given** les fichiers `src/store.js`, `src/data.js` et `src/router.js` sont crees
**When** l'app demarre
**Then** le store EventTarget expose `get()`, `set()`, `on()` pour un etat plat (season, revealed, activeSheet, selectedTeam, dataFresh)
**And** `data.js` fetch le JSON de saison (network-first), detecte la fraicheur, et appelle `set('season', data)` quand pret
**And** les composants ne fetchent jamais directement — ils reagissent a l'evenement `season-loaded`
**And** `router.js` gere le back Android via popstate/history API (~20 lignes)
**And** la navigation entre vues est < 100ms (NFR2)
**And** le demarrage depuis le cache est < 1s (NFR6)

## Technical Context

### Architecture References

- Store: Custom EventTarget + CustomEvent (~50 lignes, zero dependance)
- Etat plat: `season`, `revealed`, `activeSheet`, `selectedTeam`, `dataFresh`
- Events: `kebab-case` (ex: `season-loaded`, `reveal-triggered`, `sheet-opened`)
- Payloads: toujours `{ detail: {...} }`
- Routing: Manual History API (~20 lignes), back Android ferme le bottom sheet (push/pop history state)
- data.js: network-first fetch, cache logic, detection fraicheur
- Erreurs front silencieuses: cache fallback, jamais de popup. Si pas de cache: "Les donnees arrivent lundi"
- Pas de spinner, pas de skeleton, pas de loading bar

### Data Contract

- JSON saison dans `data/2025-2026.json` (teams, calendar, predictions)
- Index dans `data/seasons.json` (liste des saisons, `current: true`)
- Champ `lastUpdated` ISO 8601 pour detection fraicheur

### Dependencies

- Story 2-1 (done) — tokens CSS et fondation visuelle
- Aucune dependance externe — modules vanilla JS

## Tasks

### Task 1 : Creer `src/store.js`

Implementer le store EventTarget avec:
- `get(key)` — retourne la valeur courante
- `set(key, value)` — met a jour la valeur et dispatch un CustomEvent
- `on(key, callback)` — ecoute les changements sur une cle
- Etat initial: `{ season: null, revealed: false, activeSheet: null, selectedTeam: null, dataFresh: false }`
- Chaque `set()` dispatch un event nomme avec la cle en kebab-case (ex: `set('season', data)` dispatch `season-loaded`)
- Payload: `{ detail: { value, previous } }`
- Export singleton

### Task 2 : Creer `src/data.js`

Implementer le module de fetch et cache:
- `loadSeason(seasonId?)` — fonction principale
- Strategie network-first: tente fetch, fallback sur cache (localStorage)
- Si fetch reussit: stocker en localStorage, appeler `store.set('season', data)`
- Si fetch echoue: charger depuis localStorage, appeler `store.set('season', cachedData)`
- Detection de fraicheur: comparer `lastUpdated` du JSON avec la valeur en cache
- Si donnees fraiches (differentes du cache): `store.set('dataFresh', true)`
- Si aucun cache et fetch echoue: `store.set('season', null)` — le composant affichera "Les donnees arrivent lundi"
- URL de fetch: `./data/seasons.json` puis `./data/{seasonId}.json`
- Stocker `lastVisit` en localStorage a chaque chargement reussi

### Task 3 : Creer `src/router.js`

Implementer le routeur minimal:
- Ecouter `popstate` pour gerer le back Android
- `pushSheet(sheetId)` — push un state dans history, appeler `store.set('activeSheet', sheetId)`
- Sur popstate: `store.set('activeSheet', null)` (ferme le bottom sheet)
- ~20 lignes max
- Export des fonctions utilitaires

### Task 4 : Integrer dans `src/app.js`

- Importer store, data, router
- Appeler `loadSeason()` au demarrage
- Ecouter `season-loaded` pour le rendu initial
- Garder le squelette minimal (le rendu des composants viendra dans les stories suivantes)

### Task 5 : Tests unitaires

- Tester store: get/set/on, dispatch events, payloads corrects
- Tester data: mock fetch, network-first logic, cache fallback, detection fraicheur
- Tester router: pushSheet, popstate handling
- Utiliser vitest (deja configure dans le projet)

## Validation Manuelle

- [ ] `npm run dev` demarre sans erreur
- [ ] La console affiche les donnees de saison chargees
- [ ] Le store emet les events correctement (verifiable via console)
- [ ] Le back navigateur ne cause pas d'erreur
- [ ] `npm run build` produit un build valide
