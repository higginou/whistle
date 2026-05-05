# Story 13.2 : Recalcul manuel et creation du premier snapshot

Status: done

ui-structural: false

Cette story active l'action de recalcul deja presente comme placeholder dans la vue admin de 13.1. Elle ne cree pas de nouveau layout ni de nouveau parcours structurel ; elle branche un bouton existant, les etats de requete et le resultat.

## Story

En tant qu'administrateur,
Je veux declencher un recalcul manuel depuis l'interface admin,
Afin de creer ou rafraichir le snapshot public sans outil externe.

## Acceptance Criteria

1. **Given** l'admin est authentifie  
   **When** il clique sur `Recalculer la saison`  
   **Then** l'application appelle `POST /api/admin/recompute` avec `seasonId: '2025-2026'`  
   **And** le bouton est desactive pendant le recalcul  
   **And** le resultat affiche `snapshotId` et `matchday` en cas de succes

2. **Given** le recalcul echoue  
   **When** l'API retourne une erreur controlee  
   **Then** l'interface affiche un message actionnable : non authentifie, donnees manquantes, DB indisponible ou recalcul impossible  
   **And** l'utilisateur peut relancer apres correction

## Tasks / Subtasks

- [x] Brancher l'action de recalcul sur le panneau admin existant (AC: 1)
  - [x] Remplacer le bouton disabled de 13.1 par un bouton actif apres session valide
  - [x] Appeler `POST /api/admin/recompute` avec JSON `{ seasonId: '2025-2026' }`
  - [x] Desactiver le bouton pendant la requete
- [x] Afficher le resultat de recalcul (AC: 1)
  - [x] Afficher `snapshotId` et `matchday` sur reponse `201` / `recalculated: true`
  - [x] Garder un etat lisible et accessible via `aria-live`
- [x] Afficher les erreurs controlees et permettre la relance (AC: 2)
  - [x] Message non authentifie pour `401`
  - [x] Message donnees manquantes pour `400 invalid-season` ou entree invalide
  - [x] Message DB indisponible pour `503` ou erreur reseau
  - [x] Message recalcul impossible pour `422 recalculation-failed`
  - [x] Re-activer le bouton apres erreur
- [x] Ajouter les tests de flux admin recompute (AC: 1, 2)
  - [x] Test appel `POST /api/admin/recompute` avec `seasonId: '2025-2026'`
  - [x] Test bouton disabled pendant requete
  - [x] Test affichage succes `snapshotId` + `matchday`
  - [x] Test mapping erreurs et possibilite de relance

## Dev Notes

- Base UI a etendre : `src/components/admin-access.js` et `src/styles/components/admin-access.css`.
- Endpoint serveur existant : `api/admin/recompute.js`.
- Contrat succes : `201` avec `{ recalculated: true, snapshotId, matchday }`.
- Contrats erreurs serveur connus : `401 { recalculated: false }`, `400 { recalculated: false, error: 'invalid-json' | 'invalid-season' }`, `422 { recalculated: false, error: 'recalculation-failed' }`.
- Le front doit envoyer le JSON exact `{ seasonId: '2025-2026' }` et ne doit jamais manipuler le cookie admin HttpOnly.
- Si la plateforme retourne une reponse non-JSON, mapper d'abord les statuts connus quand possible et afficher un message generique actionnable sinon.
- Ne pas implementer le diagnostic public de 13.3 dans cette story.
- Ne pas rendre les routes publiques dependantes de la session admin.

### Project Structure Notes

- Fichiers probables : `src/components/admin-access.js`, `src/styles/components/admin-access.css`, `src/__tests__/admin-access.test.js`.
- Story precedente 13.1 a etabli `/admin`, session check et panneau admin. Reutiliser ces patterns au lieu de creer un nouveau composant.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 13, Story 13.2]
- [Source: _bmad-output/implementation-artifacts/13-1-acces-admin-protege.md]
- [Source: api/admin/recompute.js]
- [Source: src/server/api/admin-recompute.js]
- [Source: tests/recompute-api.test.js]
- [Source: src/components/admin-access.js]
- [Source: src/__tests__/admin-access.test.js]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run src/__tests__/admin-access.test.js` - pass, 13 tests
- `npx vitest run` - pass, 914 tests
- `npx biome check .` - pass
- `npm run build` - pass
- `npx vitest run tests/recompute-api.test.js src/__tests__/admin-access.test.js` - pass, 20 tests
- `npx vitest run` - pass apres correction review, 915 tests
- `npx biome check .` - pass apres correction review
- `npm run build` - pass apres correction review
- `src-tauri/Cargo.toml` absent, no `cargo test` target in this workspace

### Completion Notes List

- Le bouton `Recalculer la saison` est actif uniquement dans le panneau admin authentifie.
- L'appel `POST /api/admin/recompute` envoie le payload exact `{ seasonId: '2025-2026' }`.
- Le bouton est desactive pendant la requete et redevient utilisable apres succes ou erreur.
- Le succes affiche `snapshotId` et `matchday` via une zone `aria-live`.
- Les erreurs controlees `401`, `400`, `422`, `503` et les erreurs reseau affichent un message actionnable sans exposer de detail serveur sensible.
- Review approuvee apres correction serveur : les pannes DB/config de `/api/admin/recompute` retournent `503 storage-unavailable` au lieu de `422`.

### File List

- `_bmad-output/implementation-artifacts/13-2-recalcul-manuel-et-creation-du-premier-snapshot.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
- `src/components/admin-access.js`
- `src/styles/components/admin-access.css`
- `src/__tests__/admin-access.test.js`
- `api/admin/recompute.js`
- `tests/recompute-api.test.js`

## Senior Developer Review (AI)

### Review Date

2026-05-05

### Review Outcome

Approved

### Action Items

- [x] Retourner `503 storage-unavailable` pour les pannes DB/config de `/api/admin/recompute` afin d'afficher le bon message admin.

### Change Log

- 2026-05-05: Story created and moved to in-progress.
- 2026-05-05: Manual recompute action implemented and story moved to review.
- 2026-05-05: Code review approved after storage-unavailable API fix; story marked done.
