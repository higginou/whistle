# Story 9.2 : Modele de donnees et stockage Vercel Postgres

Status: done

## Story

En tant que dev,
Je veux definir le modele de donnees de la migration sur Vercel Postgres,
Afin de stocker les matchs, les snapshots et les logs proprement.

## Acceptance Criteria

1. **Given** la migration Vercel commence
   **When** le schema est defini
   **Then** on sait ou stocker les saisons, matchs, snapshots et logs

2. **Given** une saisie de match est enregistree
   **When** elle est persistee
   **Then** la structure permet de retrouver les donnees sans JSON bricolage

3. **Given** le recalcul genere des snapshots
   **When** une nouvelle projection est produite
   **Then** l'historique reste append-only

4. **Given** le lecteur doit comprendre Vercel
   **When** la story est lue
   **Then** il est clair que Vercel Postgres est une base relationnelle geree par Vercel

## Tasks / Subtasks

- [x] Definir les tables minimales (AC: 1, 2, 3)
  - [x] seasons
  - [x] matches
  - [x] projections ou snapshots
  - [x] audit_log
- [x] Brancher la connexion a Vercel Postgres (AC: 2, 4)
  - [x] Expliquer les secrets d'acces via env vars
  - [x] Garder un schema simple et lisible
- [x] Prevoir les migrations et les seeds (AC: 1, 2)
  - [x] Ajouter des donnees initiales
  - [x] Verifier que le schema supporte la saison courante

## Dev Notes

- La base doit etre simple, pas un modele surdimensionne.
- Vercel Postgres = service gere, accessible depuis l'app Vercel via variables d'environnement.
- Garder la source de verite cote base, pas dans des JSON statiques.

### Project Structure Notes

- Touche le schema et la couche d'acces aux donnees.
- Ne pas melanger la logique de calcul avec la couche de persistence.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 9]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-04-24 : `npx vitest run tests/db-schema.test.js tests/db-connection.test.js` (9 tests passes)
- 2026-04-24 : `npx vitest run` (896 tests passes)
- 2026-04-24 : `npx biome check .` (0 erreur)
- 2026-04-24 : `cargo test` non applicable, aucun `src-tauri/Cargo.toml`

### Completion Notes List

- Schema relationnel initial ajoute pour `seasons`, `matches`, `projection_snapshots` et `audit_log`, avec les matchs saisis en colonnes explicites et contraintes simples.
- Connexion Postgres preparee via variables Vercel `POSTGRES_URL` puis `DATABASE_URL`, documentee comme service Postgres gere via Vercel/Marketplace.
- Migration initiale et seed de la saison courante `2025-2026` ajoutes, avec tests de contrat couvrant tables, colonnes, append-only des snapshots et secrets d'acces.
- Revue automatique approuvee apres corrections : append-only DB, coherence status/scores, prevention du double-booking equipe, seed courant robuste, fallback URL malformee et client Postgres.js concret.

### File List

- src/server/db/README.md
- src/server/db/connection.js
- src/server/db/migrations/001_initial_schema.sql
- src/server/db/schema.js
- src/server/db/seeds/001_current_season.sql
- tests/db-connection.test.js
- tests/db-schema.test.js
- _bmad-output/implementation-artifacts/9-2-modele-de-donnees-et-stockage-vercel-postgres.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- package.json
- package-lock.json

### Change Log

- 2026-04-24 : Ajout du socle de stockage Postgres Vercel pour la story 9.2, corrections post-review et passage en done.

## Senior Developer Review (AI)

Review Date: 2026-04-24

Outcome: Approve

### Summary

- Revue automatique executee sur le schema Postgres, la couche de connexion, les tests et les artefacts de story.
- Les premiers findings ont ete corriges avant approbation : append-only DB, coherence status/scores, double-booking equipe, seed current-season, fallback URL malformee et client Postgres.js concret.

### Action Items

- [x] Corriger la garantie append-only de `projection_snapshots` au niveau DB.
- [x] Lier `matches.status` a la presence des scores.
- [x] Empêcher une equipe d'avoir deux matchs sur la même journee.
- [x] Rendre le seed de saison courante robuste si une autre saison est deja courante.
- [x] Ignorer une URL Postgres malformee quand un fallback valide existe.
- [x] Ajouter un vrai client Postgres compatible Vercel/Marketplace.
- [x] Mettre a jour la tracabilite des tests et de la File List.

### Residual Risks

- Les tests valident le contrat SQL statiquement ; l'execution live de la migration sur une base Postgres reelle reste a faire lors du raccordement API/deploiement.
