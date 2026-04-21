# Story 9.1 : Deploiement du front sur Vercel

Status: ready-for-dev

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

- [ ] Creer le projet Vercel et connecter le repo (AC: 1, 2)
  - [ ] Expliquer clairement project, preview et production dans les notes
  - [ ] Verifier le build Vite sur Vercel
- [ ] Configurer le deploiement public (AC: 1, 3)
  - [ ] S'assurer que l'app reste publique sans auth
  - [ ] Garder le meme domaine pour front et API plus tard
- [ ] Documenter le fonctionnement Vercel pour l'equipe (AC: 4)
  - [ ] Nommer les env vars et leur role
  - [ ] Expliquer la difference entre preview et production

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

TBD

### Debug Log References

### Completion Notes List

### File List
