# Story 11.2 : Retrait de GitHub Actions du flux metier

Status: done

## Story

En tant que dev,
Je veux retirer le workflow GitHub Actions du chemin de production,
Afin que Vercel devienne le seul runtime.

## Acceptance Criteria

1. **Given** la migration est terminee
   **When** on regarde le deploiement
   **Then** le flux metier ne depend plus de GitHub Actions

2. **Given** un ancien workflow existe encore
   **When** on relit la configuration
   **Then** il n'est plus reference par les operations courantes

3. **Given** un dev ouvre le projet
   **When** il cherche le point de publication
   **Then** il voit Vercel et non un cron GitHub Actions

## Tasks / Subtasks

- [x] Supprimer le workflow de production legacy (AC: 1, 2)
  - [x] Retirer le cron et les actions de generation
  - [x] Verifier qu'aucune doc ne le presente comme runtime actif
- [x] Rebrancher la publication sur Vercel (AC: 1, 3)
  - [x] Laisser Vercel etre la seule plateforme active
  - [x] Garder GitHub comme repo de code uniquement

## Dev Notes

- GitHub Actions peut rester en archive si necessaire, mais pas dans le chemin de production.
- La difference entre code source et runtime doit etre explicite.
- Cette story doit aider un lecteur debutant a comprendre ce qui a change.

### Project Structure Notes

- Touche les workflows, la doc de deploiement et les references runtime.
- Aucun changement fonctionnel attendu cote UI.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Migration Plan]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

### Completion Notes List

- Supprime les workflows GitHub Actions legacy `pipeline.yml` et `deploy.yml`.
- Ajoute des tests de garde confirmant l'absence de workflows de production GitHub Actions.
- Met a jour la documentation projet pour presenter Vercel comme seul runtime actif.

### Change Log

- 2026-05-04 : Retrait des workflows Actions de production et clarification du runtime Vercel.

### File List

- .github/workflows/pipeline.yml
- .github/workflows/deploy.yml
- tests/pipeline.test.js
- AGENTS.md
- _bmad-output/planning-artifacts/architecture.md
- src/deployment-base.js
- src/__tests__/deployment-base.test.js
- src/__tests__/router.test.js

## Senior Developer Review (AI)

- Review date: 2026-05-04
- Outcome: Approve
- Reviewer: bmad-code-review via general subagent

### Findings

- Aucun finding sur le retrait des workflows GitHub Actions. Le finding initial concernait uniquement l'affichage Donjon apres bascule des resultats vers l'API Vercel et a ete corrige dans la story 11.1/11.3.

### Action Items

- [x] Confirmer l'absence de workflows `.github/workflows/pipeline.yml` et `.github/workflows/deploy.yml`.
- [x] Reexecuter `npx vitest run`, `npx biome check .` et `npm run build`.
