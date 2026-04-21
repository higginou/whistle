# Story 8.2 : Detection des matchs manquants et ouverture bloquante

Status: done

## Story

En tant que supporteur qui saisit les resultats,
Je veux que l'app detecte les matchs non saisis et ouvre la popup automatiquement,
Afin de savoir tout de suite ce qu'il reste a completer.

## Acceptance Criteria

1. **Given** un week-end de matchs est termine
   **When** l'app charge les donnees locales et distantes
   **Then** elle identifie les matchs sans saisie validee

2. **Given** au moins un match manque
   **When** la page principale s'ouvre
   **Then** la popup cockpit s'ouvre automatiquement
   **And** elle reste ouverte jusqu'a completion totale

3. **Given** tous les matchs sont deja saisis
   **When** l'app s'ouvre
   **Then** la popup ne s'affiche pas

4. **Given** l'utilisateur ferme ou rouvre l'interface
   **When** des matchs restent incomplets
   **Then** l'etat ouvert/ferme reste coherent avec le nombre de matchs restants

## Tasks / Subtasks

- [ ] Identifier les matchs attendus pour le week-end courant (AC: 1, 2)
  - [ ] Construire la liste a partir des donnees courantes
  - [ ] Detecter les matchs sans saisie
- [ ] Gérer l'ouverture bloquante de la popup (AC: 2, 3, 4)
  - [ ] Ouvrir automatiquement la popup si necessaire
  - [ ] Empêcher la fermeture tant que tout n'est pas complete
- [ ] Exposer un resume du manque (AC: 1, 2)
  - [ ] Compter les matchs restants
  - [ ] Afficher ce resume dans le header cockpit

## Dev Notes

- La source de verite pour "deja saisi" doit etre claire et unique.
- Ne pas confondre brouillon local et validation finale.
- Cette story reste front-first : pas d'appel Vercel encore.

### Project Structure Notes

- Touche le store, la logique de detection et l'ouverture de la popup.
- Reutiliser les patterns d'etat existants plutot que creer un second store.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 8]

## Dev Agent Record

### Agent Model Used

gpt-5.4-mini

### Debug Log References

- `npm test -- --run src/__tests__/match-cockpit.test.js`

### Completion Notes List

- Detection des matchs restants branchee sur les drafts valides existants.
- Ouverture automatique et fermeture bloquante du cockpit conservees tant qu'il reste des matchs.
- Resume du manque expose dans le header et le statut du cockpit.

### File List

- `src/components/match-cockpit.js`
- `src/app.js`
- `src/__tests__/match-cockpit.test.js`

## Senior Developer Review (AI)

**Review Date:** 2026-04-21
**Outcome:** Approved
**Action Items:** 0

### Action Items

- None.

### Change Log

- 2026-04-21 : Added documented review trace for Epic 8 story 8.2.
