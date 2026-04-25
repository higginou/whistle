# Story 10.2 : Recalcul du classement, Elo et projections

Status: done

## Story

En tant qu'utilisateur,
Je veux que tout soit recalcule apres validation finale,
Afin de voir immediatement l'impact sur le classement et les projections.

## Acceptance Criteria

1. **Given** tous les matchs du week-end sont validates
   **When** le recalcul se declenche
   **Then** le classement, l'Elo et les projections sont regenerees

2. **Given** les resultats en base changent
   **When** la validation est relancee
   **Then** les sorties derivées sont mises a jour a partir de la source de verite

3. **Given** la saison courante contient un historique
   **When** une nouvelle projection est calculee
   **Then** l'historique reste append-only

4. **Given** le recalcul echoue
   **When** le backend recoit une erreur
   **Then** l'echec est remonte proprement sans casser le front public

## Tasks / Subtasks

- [x] Brancher le moteur de calcul sur la validation finale (AC: 1, 2)
  - [x] Lire les matchs saisis depuis la base
  - [x] Recalculer tout, pas seulement un delta
- [x] Persistre les sorties derivees (AC: 1, 3)
  - [x] Mettre a jour les classements et projections
  - [x] Conserver l'historique
- [x] Gerer les erreurs de recalcul (AC: 4)
  - [x] Retourner un message exploitable
  - [x] Eviter les donnees partiellement ecrites

## Dev Notes

- Le recalcul doit partir de zero a chaque validation finale.
- Ne pas faire de logique incrementale fragile.
- Le lecteur ne connaissant pas Vercel doit comprendre que cette story vit cote serveur.

### Project Structure Notes

- Touche la route admin de validation et la couche de persistence derivee.
- Pas de changement UI majeur ici.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-04-25 : `npx vitest run tests/recompute-api.test.js` rouge attendu avant creation de l'endpoint, puis vert apres implementation.
- 2026-04-25 : `npx vitest run tests/recompute-api.test.js tests/recalculation-engine.test.js tests/api-contract.test.js` : 20 tests passes.
- 2026-04-25 : `npx vitest run` : 45 fichiers, 932 tests passes.
- 2026-04-25 : `npx vitest run` : 45 fichiers, 935 tests passes apres corrections de review.
- 2026-04-25 : `npx biome check .` : passe.
- 2026-04-25 : `cargo test` non execute : aucun `src-tauri/Cargo.toml` present dans le repo.

### Completion Notes List

- Endpoint admin `api/admin/recompute.js` ajoute pour declencher le recalcul cote serveur apres validation finale avec session admin obligatoire.
- Service `recomputeAndPersistSeason()` ajoute : lecture complete des matchs de la saison depuis `matches`, recalcul complet via le moteur pur 10-1, puis insertion append-only dans `projection_snapshots`.
- Les sorties derivees sont recalculées depuis la source de verite a chaque appel; les changements de resultats en base produisent une nouvelle projection sans logique incrementale.
- Les echecs de parsing, saison invalide ou recalcul retournent une reponse controlee sans ecriture partielle de snapshot.
- Corrections de review appliquees : declenchement cockpit vers save+recompute, historique `predictions[]` conserve, calendrier TOP 14 incomplet bloque, bonus persistés et recharges, dates normalisees, garde anti double-submit final.

### File List

- api/admin/recompute.js
- src/components/match-cockpit.js
- src/__tests__/match-cockpit.test.js
- src/recompute/recalculation-engine.js
- src/server/api/admin-matches.js
- src/server/api/admin-recompute.js
- src/server/db/migrations/001_initial_schema.sql
- tests/api-contract.test.js
- tests/db-schema.test.js
- tests/recompute-api.test.js
- _bmad-output/implementation-artifacts/10-2-recalcul-du-classement-elo-et-projections.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-04-25 : Ajout du recalcul serveur admin et de la persistance append-only des snapshots de projection.
- 2026-04-25 : Correction des findings de review sur flux final, historique, calendrier, bonus, dates et double-submit.

## Senior Developer Review (AI)

Review Date: 2026-04-25

Outcome: Approve

### Findings

- Aucun finding bloquant apres re-review finale.

### Action Items

- [x] Brancher la validation finale cockpit sur l'enregistrement des matchs puis le recalcul.
- [x] Conserver et exposer l'historique append-only `predictions[]` dans le dernier snapshot public.
- [x] Bloquer le recalcul TOP 14 si le calendrier futur attendu est incomplet avant J26.
- [x] Persister et recharger les bonus offensifs/defensifs pour le recalcul.
- [x] Normaliser les dates cockpit date-only vers le contrat admin UTC.
- [x] Ajouter un garde in-flight contre le double-submit final.

### Residual Risks / Testing Gaps

- Le garde double-submit est cote client pour la session cockpit active; il ne fournit pas d'idempotence cross-tab ou API directe.
- La verification de calendrier est basee sur le nombre total attendu de matchs restants, pas sur la validation detaillee de chaque journee a 7 affiches.
