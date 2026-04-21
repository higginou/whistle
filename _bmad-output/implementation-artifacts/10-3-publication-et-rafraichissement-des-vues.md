# Story 10.3 : Publication et rafraichissement des vues

Status: ready-for-dev

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

- [ ] Brancher les vues publiques sur les donnees fraiches (AC: 1, 2)
  - [ ] Recharger ou rerendre apres validation
  - [ ] Garder le flux simple
- [ ] Poser une strategie de cache claire (AC: 2, 3)
  - [ ] Eviter les donnees stale inutiles
  - [ ] Laisser un fallback lisible
- [ ] Documenter le nouveau flux de publication (AC: 4)
  - [ ] Expliquer API -> DB -> front
  - [ ] Retirer la confusion avec GitHub Pages

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

TBD

### Debug Log References

### Completion Notes List

### File List
