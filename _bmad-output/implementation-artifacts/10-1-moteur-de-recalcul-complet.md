# Story 10.1 : Moteur de recalcul complet

Status: ready-for-dev

## Story

En tant que dev,
Je veux un moteur de calcul pur et deterministe,
Afin de reconstruire les donnees a partir de la source de verite sans etat cache fragile.

## Acceptance Criteria

1. **Given** les matchs saisis sont stockes en base
   **When** le moteur de calcul est execute
   **Then** il produit le classement, l'Elo et les projections depuis le debut de saison

2. **Given** le moteur tourne plusieurs fois
   **When** les memes donnees sont fournies
   **Then** le resultat reste identique

3. **Given** le code est lu par un dev qui ne connait pas Vercel
   **When** il cherche ou vit le calcul
   **Then** il comprend qu'il s'agit d'une fonction pure partagee entre l'API et le runtime

4. **Given** le moteur est teste en local
   **When** on le lance sans le frontend
   **Then** il fonctionne de facon autonome

## Tasks / Subtasks

- [ ] Extraire le calcul dans un module pur (AC: 1, 2, 4)
  - [ ] Reprendre les regles Elo existantes
  - [ ] Garder les entrees et sorties explicites
- [ ] Verifier la determinisme du calcul (AC: 2)
  - [ ] Meme entree = meme sortie
  - [ ] Pas d'etat cache dependant du navigateur
- [ ] Rendre le module partageable par l'API Vercel (AC: 3, 4)
  - [ ] Eviter les dependances serveur inutiles
  - [ ] Garder une interface simple

## Dev Notes

- Ne pas melanger calcul et persistence.
- Le moteur doit pouvoir tourner dans un contexte serveur Vercel comme en local.
- Le code doit rester lisible pour quelqu'un qui decouvre Vercel.

### Project Structure Notes

- Touche les modules de calcul partagees et la couche de recompute.
- Pas de logique UI ici.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
