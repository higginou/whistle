# Story 11.1 : Retrait du scraping legacy

Status: done

## Story

En tant que dev,
Je veux supprimer le scraping du runtime,
Afin que la migration ne dependa plus de la LNR ni d'un fallback automate.

## Acceptance Criteria

1. **Given** la migration vers Vercel est en place
   **When** on inspecte le runtime
   **Then** aucun flux critique ne depend du scraping LNR

2. **Given** les anciens scripts existent encore
   **When** on les relit
   **Then** ils ne sont plus utilises par le chemin de production

3. **Given** le code est nettoye
   **When** le front se lance
   **Then** il ne tente plus de recuperer des donnees via scraping

## Tasks / Subtasks

- [x] Isoler puis retirer les appels au scraping du chemin critique (AC: 1, 3)
  - [x] Supprimer les dependances runtime au script
  - [x] Verifier qu'aucune page ne les invoque
- [x] Nettoyer les references au fallback LNR/API-Sports (AC: 1, 2)
  - [x] Retirer les commentaires et docs trompeurs
  - [x] Garder seulement l'historique utile

## Dev Notes

- Cette story retire le legacy du runtime, pas l'historique du projet.
- Ne pas laisser des chemins fantomes vers le scraping.
- La version Vercel doit etre la seule source active.

### Project Structure Notes

- Touche les scripts de pipeline et les references associees.
- Ne pas casser les documents de migration deja ecrits.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Migration Plan]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

### Completion Notes List

- Retire le chargement runtime de `public/data/scraped.json` et la cle store associee.
- Le Donjon lit les resultats depuis le payload public Vercel `season.results`.
- Les scripts de scraping restent presents comme archives locales, avec commentaires explicites hors runtime Vercel.

### Change Log

- 2026-05-04 : Suppression du flux `loadScraped()` et branchement des resultats joues sur l'API publique Vercel.
- 2026-05-04 : Correction review — les essais Donjon sont optionnels quand le payload Vercel ne les fournit pas.

### File List

- src/data.js
- src/app.js
- src/store.js
- src/components/tab-donjon.js
- src/components/donjon-data.js
- src/server/api/public-season.js
- tests/api-contract.test.js
- src/__tests__/app.test.js
- src/__tests__/data.test.js
- src/__tests__/donjon-state.test.js
- scripts/scrape.js
- scripts/scrape-rugbyrama.js
- scripts/scrape-lnr.js
- scripts/scrape-api.js
- scripts/team-mapping.js
- scripts/validate.js
- scripts/elo.js
- public/data/scraped.json
- src/components/donjon-combat.js
- src/components/donjon-finale.js
- src/__tests__/donjon-data.test.js
- src/__tests__/donjon-finale.test.js

## Senior Developer Review (AI)

- Review date: 2026-05-04
- Outcome: Approve
- Reviewer: bmad-code-review via general subagent

### Findings

- Medium: le payload public Vercel `results` ne fournit pas `homeTries` / `awayTries`, alors que Donjon rendait encore ces valeurs comme obligatoires. Corrige en normalisant les essais manquants a `null`, en masquant les lignes d'essais absentes dans le combat, et en evitant `NaN` dans la finale.

### Action Items

- [x] Rendre les essais Donjon optionnels pour le payload public Vercel.
- [x] Ajouter une regression sur la forme exacte `results` sans essais.
- [x] Reexecuter `npx vitest run`, `npx biome check .` et `npm run build`.
