# Story 10.3 : Publication et rafraichissement des vues

Status: done

## Story

En tant qu'utilisateur,
Je veux que l'app publique se mette a jour apres le recalcul,
Afin de voir les nouvelles donnees sans bricolage manuel.

## Acceptance Criteria

1. **Given** une validation finale est terminee
   **When** le backend a ecrit les nouveaux resultats
   **Then** les vues publiques lisent la nouvelle version

2. **Given** l'utilisateur reste sur l'app
   **When** les donnees ont change
   **Then** la lecture suivante retourne les valeurs fraiches

3. **Given** une erreur reseau survient pendant la lecture
   **When** l'app consulte les donnees
   **Then** elle reste lisible sans ecran d'erreur technique

4. **Given** le code est lu par un debutant Vercel
   **When** il regarde la publication
   **Then** il comprend que la mise a jour passe par l'API et la base, pas par GitHub Pages

## Tasks / Subtasks

- [x] Brancher les vues publiques sur les donnees fraiches (AC: 1, 2)
  - [x] Recharger ou rerendre apres validation
  - [x] Garder le flux simple
- [x] Poser une strategie de cache claire (AC: 2, 3)
  - [x] Eviter les donnees stale inutiles
  - [x] Laisser un fallback lisible
- [x] Documenter le nouveau flux de publication (AC: 4)
  - [x] Expliquer API -> DB -> front
  - [x] Retirer la confusion avec GitHub Pages

## Dev Notes

- Le runtime Vercel doit publier via l'API et non via un deploy de JSON statique.
- Ne pas rajouter un systeme complexe de synchronisation si un simple refresh suffit.
- Garder le comportement silencieux et robuste.

### Project Structure Notes

- Touche la couche de lecture front et le contrat de publication apres recalcul.
- Pas de nouveau composant visuel obligatoire.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-04-25 : `npx vitest run src/__tests__/data.test.js src/__tests__/match-cockpit.test.js tests/api-contract.test.js` : 35 tests passes.
- 2026-04-25 : `npx vitest run` : 45 fichiers, 934 tests passes.
- 2026-04-25 : `npx vitest run` : 45 fichiers, 935 tests passes apres correction de review.
- 2026-04-25 : `npx biome check .` : passe.
- 2026-04-25 : `cargo test` non execute : aucun `src-tauri/Cargo.toml` present dans le repo.

### Completion Notes List

- `loadSeason()` lit maintenant la saison publique via `GET /api/public/season?season=...` avec `cache: no-store`, puis conserve le fallback localStorage existant.
- La validation finale cockpit recharge la saison apres `POST /api/admin/recompute`, ce qui met a jour le store et rerend les vues abonnees.
- L'API publique envoie `Cache-Control: no-store` pour eviter les lectures stale inutiles apres recalcul.
- Documentation ajoutee pour clarifier le flux Vercel API -> DB -> front, sans redeploiement GitHub Pages.
- Correction de review appliquee : le rerender `season` est idempotent et nettoie les elements body-mounted avant de remonter le layout.

### File List

- api/public/season.js
- src/app.js
- src/data.js
- src/components/match-cockpit.js
- src/__tests__/app.test.js
- src/__tests__/data.test.js
- src/__tests__/match-cockpit.test.js
- src/server/api/README.md
- tests/api-contract.test.js
- _bmad-output/implementation-artifacts/10-3-publication-et-rafraichissement-des-vues.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-04-25 : Publication publique basculee sur API Vercel no-store avec refresh front apres recalcul et documentation du flux.
- 2026-04-25 : Correction du rerender apres refresh pour eviter les doublons de nav/dialogs.

## Senior Developer Review (AI)

Review Date: 2026-04-25

Outcome: Approve

### Findings

- Aucun finding bloquant apres re-review.

### Action Items

- [x] Lire les donnees publiques via l'API Vercel avec `cache: no-store`.
- [x] Recharger la saison apres recalcul admin pour rerendre les vues publiques.
- [x] Envoyer `Cache-Control: no-store` sur l'API publique.
- [x] Conserver le fallback localStorage/null en cas d'erreur reseau.
- [x] Documenter le flux API -> DB -> front.
- [x] Rendre le refresh `season` idempotent pour eviter les doublons de nav/dialogs.

### Residual Risks / Testing Gaps

- Le header `Cache-Control: no-store` est teste sur le chemin public API succes; les chemins d'erreur ne l'assertent pas explicitement.
