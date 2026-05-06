# Story 13.3 : Diagnostic runtime Vercel et donnees publiques

Status: done

ui-structural: false

Cette story ajoute un diagnostic textuel/status dans le panneau admin existant. Elle ne cree pas de nouvelle route, nouveau layout, dialogue ou panneau structurel ; elle enrichit le contenu de la vue admin validee en 13.1.

## Story

En tant qu'administrateur,
Je veux voir l'etat minimal du runtime Vercel et du payload public,
Afin de savoir si l'application publique est deployable et alimentee.

## Acceptance Criteria

1. **Given** l'admin est authentifie  
   **When** la vue admin charge  
   **Then** elle indique si la session admin est valide  
   **And** elle teste `GET /api/public/season?season=2025-2026`  
   **And** elle distingue au minimum : JSON public disponible, `projection-not-found`, `season-not-found`, `storage-unavailable`

2. **Given** un recalcul vient de reussir  
   **When** le diagnostic public est relance  
   **Then** l'etat passe a `JSON public disponible`  
   **And** les infos de fraicheur (`lastUpdated`, `matchday`) sont affichees

## Tasks / Subtasks

- [x] Ajouter le diagnostic public dans le panneau admin existant (AC: 1)
  - [x] Afficher explicitement que la session admin est valide
  - [x] Tester `GET /api/public/season?season=2025-2026` au chargement du panneau authentifie
  - [x] Afficher l'etat dans une zone `aria-live`
- [x] Mapper les etats publics minimum (AC: 1)
  - [x] `200` : JSON public disponible
  - [x] `404 projection-not-found` : snapshot public absent
  - [x] `404 season-not-found` : saison absente
  - [x] `503 storage-unavailable` : stockage indisponible
- [x] Relancer le diagnostic apres recalcul reussi (AC: 2)
  - [x] Apres succes `POST /api/admin/recompute`, relancer `GET /api/public/season?season=2025-2026`
  - [x] Afficher `lastUpdated` et `matchday` lorsque le JSON public est disponible
- [x] Ajouter les tests de diagnostic (AC: 1, 2)
  - [x] Test appel public au chargement admin authentifie
  - [x] Test mapping `projection-not-found`, `season-not-found`, `storage-unavailable`
  - [x] Test affichage `lastUpdated` + `matchday` sur succes public
  - [x] Test relance diagnostic apres recalcul reussi

## Dev Notes

- Base UI a etendre : `src/components/admin-access.js`.
- Endpoint public : `GET /api/public/season?season=2025-2026`.
- Contrat public serveur : `200` retourne le payload public avec `lastUpdated` et `matchday`; `404` peut retourner `projection-not-found` ou `season-not-found`; `503` retourne `storage-unavailable`.
- Le diagnostic public est une lecture publique : ne pas exiger de session admin cote public et ne pas envoyer de secret.
- Ne pas implementer le runbook de 13.4.
- Garder le diagnostic minimal et actionnable, sans transformer la vue admin en console complete.

### Project Structure Notes

- Fichiers probables : `src/components/admin-access.js`, `src/styles/components/admin-access.css`, `src/__tests__/admin-access.test.js`.
- La story 13.2 relance deja le recalcul ; il faut seulement accrocher une verification publique apres succes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 13, Story 13.3]
- [Source: _bmad-output/implementation-artifacts/13-2-recalcul-manuel-et-creation-du-premier-snapshot.md]
- [Source: api/public/season.js]
- [Source: src/server/api/public-season.js]
- [Source: src/components/admin-access.js]
- [Source: src/__tests__/admin-access.test.js]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run src/__tests__/admin-access.test.js` - pass, 18 tests
- `npx vitest run` - pass, 920 tests
- `npx biome check .` - pass
- `npm run build` - pass
- `npx vitest run src/__tests__/admin-access.test.js` - pass apres correction review, 20 tests
- `npx vitest run` - pass apres correction review, 922 tests
- `npx biome check .` - pass apres correction review
- `npm run build` - pass apres correction review
- `src-tauri/Cargo.toml` absent, no `cargo test` target in this workspace

### Completion Notes List

- Le panneau admin authentifie affiche explicitement `Session admin valide` dans le diagnostic public.
- Le diagnostic appelle `GET /api/public/season?season=2025-2026` au chargement du panneau.
- Les etats `JSON public disponible`, `projection-not-found`, `season-not-found` et `storage-unavailable` sont distingues par messages actionnables.
- Le succes public affiche `lastUpdated` et `matchday`.
- Apres recalcul reussi, le diagnostic public est relance pour confirmer que le JSON public est disponible.
- Review approuvee apres correction de concurrence diagnostic et validation stricte du payload public.

### File List

- `_bmad-output/implementation-artifacts/13-3-diagnostic-runtime-vercel-et-donnees-publiques.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/admin-access.js`
- `src/styles/components/admin-access.css`
- `src/__tests__/admin-access.test.js`

## Senior Developer Review (AI)

### Review Date

2026-05-05

### Review Outcome

Approved

### Action Items

- [x] Ignorer les reponses de diagnostic public obsoletes pour eviter un ecrasement apres recalcul.
- [x] Valider `lastUpdated` et `matchday` avant d'afficher `JSON public disponible`.

### Change Log

- 2026-05-05: Story created and moved to in-progress.
- 2026-05-05: Diagnostic public implemented and story moved to review.
- 2026-05-05: Code review approved after diagnostic race/payload fixes; story marked done.
