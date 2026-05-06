# Story 13.4 : Runbook de deploiement admin

Status: done

ui-structural: false

Cette story documente le deploiement Vercel et le parcours admin existant. Elle ne cree pas de nouvelle UI, route, API ou modification runtime ; elle produit une procedure maintenable et actionnable.

## Story

En tant que mainteneur,
Je veux une procedure documentee du deploiement Vercel et du parcours admin,
Afin de pouvoir refaire l'initialisation ou diagnostiquer une panne sans dependance a la conversation.

## Acceptance Criteria

1. **Given** le deploiement Vercel est configure  
   **When** un mainteneur lit le runbook  
   **Then** il trouve les variables requises : `POSTGRES_URL` ou `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`  
   **And** il trouve l'ordre d'initialisation DB : schema, seed saison, import matchs, recalcul  
   **And** il trouve la procedure de verification : API publique, interface admin, snapshot public

2. **Given** une erreur connue survient  
   **When** le mainteneur consulte le runbook  
   **Then** il trouve les diagnostics attendus pour `503 storage-unavailable`, `404 season-not-found`, `404 projection-not-found` et echec de recalcul

## Tasks / Subtasks

- [x] Creer le runbook de deploiement admin (AC: 1)
  - [x] Documenter les variables Vercel requises et leurs contraintes minimales
  - [x] Documenter l'ordre d'initialisation DB : migrations, seed saison, import matchs, recalcul admin
  - [x] Documenter la verification API publique, interface admin et snapshot public
- [x] Documenter les diagnostics operationnels (AC: 2)
  - [x] `503 storage-unavailable`
  - [x] `404 season-not-found`
  - [x] `404 projection-not-found`
  - [x] Echec de recalcul admin
- [x] Mettre a jour la tracabilite Epic 13 (AC: 1, 2)
  - [x] Referencer le runbook dans les notes de completion
  - [x] Mettre a jour `sprint-status.yaml` selon le workflow
  - [x] Executer les verifications pertinentes pour une story documentation-only

## Dev Notes

- Scope strictement documentation : ne pas modifier `api/`, `src/`, schema SQL ou UI admin sauf bug concret decouvert et necessaire.
- Le runbook doit etre autonome : ne pas supposer que le lecteur a acces a cette conversation.
- Sources runtime a aligner :
  - `src/server/db/connection.js` accepte `POSTGRES_URL` puis `DATABASE_URL`.
  - `src/server/auth/admin-session.js` exige `ADMIN_AUTH_SECRET` d'au moins 32 caracteres et `ADMIN_PASSWORD` d'au moins 12 caracteres pour un login valide.
  - `src/server/db/migrations/001_initial_schema.sql` cree `seasons`, `matches`, `projection_snapshots`, `audit_log`.
  - `src/server/db/migrations/002_match_tries.sql` ajoute/garantit les colonnes essais.
  - `src/server/db/seeds/001_current_season.sql` initialise la saison `2025-2026`.
  - `_bmad-output/implementation-artifacts/vercel-matches-import.sql` importe les matchs initiaux.
  - `/admin` permet login, recalcul et diagnostic public.
- Les endpoints publics/admin a citer :
  - `GET /api/public/season?season=2025-2026`
  - `POST /api/admin/login`
  - `GET /api/admin/session`
  - `POST /api/admin/recompute` avec `{ "seasonId": "2025-2026" }`
  - `POST /api/admin/matches` pour les futures saisies cockpit
- Les erreurs attendues doivent rester actionnables sans exposer de secrets.
- Eviter les commandes destructives SQL. `projection_snapshots` est append-only : ne pas documenter d'UPDATE/DELETE comme procedure normale.

### Project Structure Notes

- Emplacement recommande : `_bmad-output/implementation-artifacts/admin-deployment-runbook.md` pour rester avec les artefacts d'implementation et le todo Vercel existant.
- Mettre a jour `_bmad-output/implementation-artifacts/vercel-deployment-todo.md` seulement si cela clarifie l'etat final de l'Epic 13.
- Pas de maquettes requises : `ui-structural: false`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 13, Story 13.4]
- [Source: _bmad-output/implementation-artifacts/vercel-deployment-todo.md]
- [Source: _bmad-output/implementation-artifacts/13-1-acces-admin-protege.md]
- [Source: _bmad-output/implementation-artifacts/13-2-recalcul-manuel-et-creation-du-premier-snapshot.md]
- [Source: _bmad-output/implementation-artifacts/13-3-diagnostic-runtime-vercel-et-donnees-publiques.md]
- [Source: src/server/db/README.md]
- [Source: src/server/db/connection.js]
- [Source: src/server/db/migrations/001_initial_schema.sql]
- [Source: src/server/db/migrations/002_match_tries.sql]
- [Source: src/server/db/seeds/001_current_season.sql]
- [Source: src/server/auth/admin-session.js]
- [Source: api/admin/login.js]
- [Source: api/admin/recompute.js]
- [Source: api/public/season.js]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run` - pass, 922 tests
- `npx biome check .` - pass
- `npm run build` - pass
- `npx vitest run` - pass apres corrections review, 922 tests
- `npx biome check .` - pass apres corrections review
- `npm run build` - pass apres corrections review
- `src-tauri/Cargo.toml` absent, no `cargo test` target in this workspace

### Completion Notes List

- Runbook autonome ajoute dans `_bmad-output/implementation-artifacts/admin-deployment-runbook.md`.
- Variables Vercel documentees : `POSTGRES_URL` ou `DATABASE_URL`, `ADMIN_PASSWORD`, `ADMIN_AUTH_SECRET`, avec contraintes minimales.
- Ordre d'initialisation DB documente : migrations, seed saison, import matchs, recalcul admin.
- Verification documentee : SQL, `/admin`, `GET /api/public/season?season=2025-2026`, snapshot public et application publique.
- Diagnostics documentes pour `503 storage-unavailable`, `404 season-not-found`, `404 projection-not-found` et echec de recalcul.
- Todo de deploiement Vercel mis a jour pour pointer vers le runbook et l'interface admin livree.
- Review approuvee apres correction du texte de blocage stale et du diagnostic `503 storage-unavailable` incomplet.

### File List

- `_bmad-output/implementation-artifacts/13-4-runbook-de-deploiement-admin.md`
- `_bmad-output/implementation-artifacts/admin-deployment-runbook.md`
- `_bmad-output/implementation-artifacts/vercel-deployment-todo.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`

## Senior Developer Review (AI)

### Review Date

2026-05-06

### Review Outcome

Approved

### Action Items

- [x] Mettre a jour le bloquant courant dans `vercel-deployment-todo.md` pour ne plus dire que l'UI admin manque.
- [x] Elargir le diagnostic `503 storage-unavailable` aux erreurs SQL/schema/migrations, pas seulement aux variables Postgres.

### Change Log

- 2026-05-06: Story created and prepared for implementation.
- 2026-05-06: Admin deployment runbook documented and story moved to review.
- 2026-05-06: Code review approved after documentation corrections; story marked done.
