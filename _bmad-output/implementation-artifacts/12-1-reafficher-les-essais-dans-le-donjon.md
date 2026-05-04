# Story 12.1 : Reafficher les essais dans le Donjon

Status: done

ui-structural: false

## Story

En tant que supporter de La Rochelle,
Je veux revoir les essais marques et encaisses dans le Donjon,
Afin que le recit des matchs retrouve les stats rugby qui existaient avant le retrait du `scraped.json`.

## Acceptance Criteria

1. **Given** un match est saisi via le cockpit admin avec `homeTries` et `awayTries`
   **When** le match est valide et stocke
   **Then** les essais domicile/exterieur sont persistés avec le match dans Vercel Postgres

2. **Given** des matchs joues existent en base avec leurs essais
   **When** `GET /api/public/season?season=2025-2026` renvoie le payload public
   **Then** chaque entree `results[]` expose `homeTries` et `awayTries` en entiers >= 0

3. **Given** le Donjon recoit un payload `season.results` contenant `homeTries` et `awayTries`
   **When** l'utilisateur lance le Donjon
   **Then** l'ecran combat affiche les essais de La Rochelle et de l'adversaire
   **And** la finale affiche a nouveau le total d'essais marques

4. **Given** un ancien match ou fixture ne contient pas encore les champs d'essais
   **When** le Donjon normalise ce match
   **Then** il conserve le comportement safe actuel : pas de `undefined`, pas de `NaN`, pas de crash

## Tasks / Subtasks

- [x] Ajouter les essais au modele de donnees Vercel (AC: 1)
  - [x] Ajouter `home_tries` et `away_tries` a la table `matches` avec contraintes entiers >= 0
  - [x] Prevoir une migration additive compatible avec les donnees deja saisies
  - [x] Mettre a jour la documentation DB si necessaire
- [x] Faire transiter les essais dans l'API admin (AC: 1)
  - [x] Normaliser `homeTries` et `awayTries` dans `normalizeAdminMatchPayload()`
  - [x] Les inclure dans `saveAdminMatch()` en insert et update
  - [x] Ajouter les tests de validation et persistance SQL
- [x] Exposer les essais dans l'API publique (AC: 2)
  - [x] Lire `home_tries` et `away_tries` dans `getPublicSeasonPayload()`
  - [x] Mapper vers `homeTries` et `awayTries` dans `results[]`
  - [x] Ajouter une regression sur le contrat public
- [x] Verifier le Donjon avec les champs restaurés (AC: 3, 4)
  - [x] Confirmer que `normalizeMatch()` affiche les essais quand ils sont fournis
  - [x] Conserver le fallback optionnel quand les essais sont absents
  - [x] Ajouter/mettre a jour les tests Donjon combat/finale ou normalisation
- [x] Executer la verification complete (AC: 1, 2, 3, 4)
  - [x] `npx vitest run`
  - [x] `npx biome check .`
  - [x] `npm run build`

## Dev Notes

- Le cockpit admin collecte deja `homeTries` et `awayTries` dans les drafts et les utilise pour calculer les bonus. La story ne doit pas refaire le flux UI sauf si un bug de branchement est decouvert.
- La correction Epic 11 a rendu les essais optionnels dans Donjon. Ne pas supprimer ce garde-fou : il protege les anciennes fixtures et payloads incomplets.
- Les probabilites et autres champs JSON restent en decimals 0-1 ; les essais sont des entiers bruts.
- Les chemins actifs doivent rester Vercel API + Postgres. Ne pas recreer de dependance a `public/data/*` ou au scraping.
- Si une migration DB additive est ajoutee, elle doit etre idempotente et compatible avec une base existante.

### Project Structure Notes

- Fichiers probables :
  - `src/server/db/migrations/001_initial_schema.sql` ou nouvelle migration additive sous `src/server/db/migrations/`
  - `src/server/api/admin-matches.js`
  - `src/server/api/public-season.js`
  - `src/components/donjon-data.js`
  - `src/components/donjon-combat.js`
  - `src/components/donjon-finale.js`
  - `tests/api-contract.test.js`
  - `src/__tests__/donjon-data.test.js`
  - `src/__tests__/donjon-finale.test.js`

### References

- [Source: _bmad-output/implementation-artifacts/epic-11-retro-2026-05-04.md#Action-Items]
- [Source: src/components/match-cockpit.js — drafts `homeTries` / `awayTries` et calcul des bonus]
- [Source: src/server/api/admin-matches.js — normalisation et persistance admin]
- [Source: src/server/api/public-season.js — contrat public `results[]`]
- [Source: src/components/donjon-data.js — normalisation safe des essais optionnels]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run tests/api-contract.test.js src/__tests__/match-cockpit.test.js src/__tests__/donjon-data.test.js src/__tests__/donjon-finale.test.js` : 51 tests OK.
- `npx vitest run tests/api-contract.test.js tests/db-schema.test.js` : 16 tests OK.
- `npx vitest run` : 45 fichiers, 908 tests OK.
- `npx biome check .` : OK.
- `npm run build` : OK.

### Completion Notes List

- Ajoute `home_tries` et `away_tries` au schema initial et une migration additive idempotente `002_match_tries.sql`.
- L'API admin exige, normalise et persiste `homeTries` / `awayTries` avec les scores et bonus.
- Le cockpit admin envoie les essais deja saisis vers `POST /api/admin/matches`.
- L'API publique expose `homeTries` / `awayTries` dans `results[]`.
- La validation des essais est bornee a 0-50 cote API et DB pour eviter les faux `503` de stockage.
- Donjon conserve le fallback safe pour les anciennes fixtures sans essais.

### File List

- _bmad-output/implementation-artifacts/12-1-reafficher-les-essais-dans-le-donjon.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- _bmad-output/planning-artifacts/epics.md
- src/server/db/migrations/001_initial_schema.sql
- src/server/db/migrations/002_match_tries.sql
- src/server/db/README.md
- src/server/api/admin-matches.js
- src/server/api/public-season.js
- src/components/match-cockpit.js
- src/__tests__/match-cockpit.test.js
- tests/db-schema.test.js
- tests/api-contract.test.js

## Senior Developer Review (AI)

### Review Date

2026-05-04

### Review Outcome

Approve

### Action Items

- [x] Borner `homeTries` / `awayTries` avant la DB pour eviter les faux `503`.
- [x] Rendre les contraintes de migration idempotentes meme si les colonnes existent deja.
- [x] Ajouter les tests de schema pour les contraintes `home_tries` / `away_tries`.

### Change Log

- 2026-05-04 : Story creee depuis l'action item de retrospective Epic 11.
- 2026-05-04 : Implementation complete, story prete pour review automatique.
- 2026-05-04 : Findings review corriges, review approuvee et story terminee.
