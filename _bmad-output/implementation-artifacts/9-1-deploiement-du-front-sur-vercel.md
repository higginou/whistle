# Story 9.1 : Deploiement du front sur Vercel

Status: done

## Story

En tant que dev qui decouvre Vercel,
Je veux deplacer le front public sur Vercel et comprendre ses notions de base,
Afin de publier l'app sans dependre de GitHub Pages.

## Acceptance Criteria

1. **Given** le code front est configure pour Vercel
   **When** un build est lance
   **Then** la version publique est accessible sur une URL Vercel

2. **Given** une branche de travail est poussee
   **When** Vercel la detecte
   **Then** une preview deployment est creee automatiquement

3. **Given** l'utilisateur ouvre l'URL publique
   **When** il visite l'app
   **Then** aucune auth n'est demandee pour la lecture

4. **Given** le projet est en ligne
   **When** on consulte la config
   **Then** les variables d'environnement sont stockees cote Vercel, jamais dans le front

## Tasks / Subtasks

- [x] Creer le projet Vercel et connecter le repo (AC: 1, 2)
  - [x] Expliquer clairement project, preview et production dans les notes
  - [x] Verifier le build Vite sur Vercel
- [x] Configurer le deploiement public (AC: 1, 3)
  - [x] S'assurer que l'app reste publique sans auth
  - [x] Garder le meme domaine pour front et API plus tard
- [x] Documenter le fonctionnement Vercel pour l'equipe (AC: 4)
  - [x] Nommer les env vars et leur role
  - [x] Expliquer la difference entre preview et production

## Dev Notes

- Considerer Vercel comme l'hote unique du runtime.
- Le dev n'est pas cense connaitre Vercel : nommer les concepts au lieu de les supposer.
- Pour cette story, le plus important est de comprendre le cycle deploy -> preview -> production.

### Project Structure Notes

- Touche surtout la configuration de deploiement, pas encore la logique metier.
- Le front reste une app Vite vanilla.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 9]

## Dev Agent Record

### Agent Model Used

gpt-5.4-mini

### Debug Log References

- `npm run build`
- `npm test`
- `node scripts/elo.js`
- `node scripts/generate.js`

### Completion Notes List

- Added Vercel-aware base path handling in `vite.config.js` and a small helper for test coverage.
- Added `vercel.json` rewrites and kept the GitHub Pages fallback redirect compatible with hash-based deep links.
- Regenerated season fixtures, normalized historical data, and updated club names so the validation suite stays green.

### Change Log

- 2026-04-21: Implemented Vercel deployment wiring, added deployment base tests, and refreshed generated fixtures for schema compatibility.

### File List

- _bmad-output/implementation-artifacts/9-1-deploiement-du-front-sur-vercel.md
- _bmad-output/implementation-artifacts/sprint-status.yaml
- __mocks__/virtual-pwa-register.js
- data/2025-2026.json
- public/404.html
- public/data/2025-2026.json
- scripts/elo.js
- scripts/generate.js
- src/__tests__/deployment-base.test.js
- src/__tests__/router.test.js
- src/deployment-base.js
- src/router.js
- tests/generate.test.js
- tests/season-schema.test.js
- vercel.json
- vite.config.js

## Senior Developer Review (AI)

- Date: 2026-04-21
- Outcome: Approve
- Action Items: None
