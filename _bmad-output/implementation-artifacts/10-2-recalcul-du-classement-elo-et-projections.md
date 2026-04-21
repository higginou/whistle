# Story 10.2 : Recalcul du classement, Elo et projections

Status: ready-for-dev

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

- [ ] Brancher le moteur de calcul sur la validation finale (AC: 1, 2)
  - [ ] Lire les matchs saisis depuis la base
  - [ ] Recalculer tout, pas seulement un delta
- [ ] Persistre les sorties derivees (AC: 1, 3)
  - [ ] Mettre a jour les classements et projections
  - [ ] Conserver l'historique
- [ ] Gerer les erreurs de recalcul (AC: 4)
  - [ ] Retourner un message exploitable
  - [ ] Eviter les donnees partiellement ecrites

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

TBD

### Debug Log References

### Completion Notes List

### File List
