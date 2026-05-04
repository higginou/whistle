# Story 11.3 : Nettoyage final et verification

Status: done

## Story

En tant que dev,
Je veux nettoyer les docs, scripts et references obsoletes,
Afin que le projet soit lisible et coherent apres migration.

## Acceptance Criteria

1. **Given** la migration est terminee
   **When** on lit les docs
   **Then** il n'y a plus de reference confuse a GitHub Pages, au scraping ou au pipeline legacy

2. **Given** les fichiers de code sont revus
   **When** on inspecte les imports et les scripts
   **Then** seuls les chemins Vercel actifs restent visibles

3. **Given** le projet est teste apres nettoyage
   **When** le front se lance
   **Then** il reste fonctionnel sans regression visible

## Tasks / Subtasks

- [x] Nettoyer les documents de reference (AC: 1)
  - [x] Mettre a jour les epics, l'architecture et les notes de migration
  - [x] Supprimer les references trompeuses
- [x] Verifier les chemins actifs (AC: 2, 3)
  - [x] Confirmer les imports utiles
  - [x] S'assurer que le build passe
- [x] Faire la checklist finale de migration (AC: 1, 2, 3)
  - [x] Confirmer le front public
  - [x] Confirmer l'admin gere la saisie
  - [x] Confirmer le recalcul serveur

## Dev Notes

- Cette story est la derniere et doit laisser le projet propre.
- Penser comme un debutant Vercel : si une reference n'explique pas le flux actuel, elle doit etre corrigee.
- Le but est la lisibilite, pas l'ajout de nouvelles fonctions.

### Project Structure Notes

- Touche la documentation, les scripts de maintenance et les references runtime.
- Peut inclure une verification du build final.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Migration Plan]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

### Completion Notes List

- Supprime les payloads statiques `public/data/*` qui concurrencaient l'API Vercel.
- Nettoie les commentaires de scripts et docs actives pour expliciter que les scripts sont des archives locales.
- Verifie le front public, les APIs admin/public et le recalcul par `npx vitest run`, `npx biome check .` et `npm run build`.

### Change Log

- 2026-05-04 : Nettoyage final des chemins publics statiques et verification complete de migration.
- 2026-05-04 : Correction review — ajout de garde contre les essais absents dans Donjon avec tests dedies.

### File List

- public/data/2025-2026.json
- public/data/seasons.json
- public/data/scraped.json
- scripts/generate.js
- src/server/api/README.md
- AGENTS.md
- _bmad-output/planning-artifacts/architecture.md
- tests/pipeline.test.js
- src/server/api/public-season.js
- src/components/donjon-combat.js
- src/components/donjon-finale.js
- src/__tests__/donjon-data.test.js
- src/__tests__/donjon-finale.test.js

## Senior Developer Review (AI)

- Review date: 2026-05-04
- Outcome: Approve
- Reviewer: bmad-code-review via general subagent

### Findings

- Medium: Donjon calculait/affichait des essais depuis l'ancien `scraped.json`, mais le payload Vercel public ne les expose pas. Corrige avant passage a done.

### Action Items

- [x] Eviter les sorties `undefined` / `NaN` quand les essais ne sont pas connus.
- [x] Couvrir la forme Vercel `results` et le total d'essais inconnu par tests.
- [x] Reexecuter `npx vitest run`, `npx biome check .` et `npm run build`.
