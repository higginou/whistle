# Story 8.3 : Saisie guidee d'un match

Status: done

## Story

En tant que supporteur qui saisit les resultats,
Je veux renseigner un match avec scores, essais et bonus calcules automatiquement,
Afin d'entrer les donnees vite et sans erreur.

## Acceptance Criteria

1. **Given** un match est affiche dans la popup
   **When** l'utilisateur remplit les scores domicile et exterieur
   **Then** il voit aussi les essais domicile et exterieur

2. **Given** les scores et essais sont saisis
   **When** les champs changent
   **Then** les bonus offensif et defensif se recalculent automatiquement

3. **Given** les regles de bonus TOP 14 sont appliquees
   **When** un resultat est inferieur ou egal a 7 points d'ecart pour le perdant
   **Then** le bonus defensif est calcule selon la regle existante

4. **Given** l'utilisateur passe d'un match au suivant
   **When** le match courant est valide
   **Then** le focus de saisie suit le flux guide

5. **Given** un match est partiellement saisi
   **When** les champs sont incomplets
   **Then** la validation de ce match reste bloquee

## Tasks / Subtasks

- [ ] Construire la carte de saisie du match courant (AC: 1, 4, 5)
  - [ ] Afficher domicile / exterieur clairement
  - [ ] Ajouter les champs scores et essais
- [ ] Brancher le calcul automatique des bonus (AC: 2, 3)
  - [ ] Reutiliser les regles rugby deja documentees
  - [ ] Afficher le resultat calcule sans saisie manuelle
- [ ] Gérer la validation d'un match (AC: 5)
  - [ ] Empêcher la validation si un champ manque
  - [ ] Avancer seulement quand le match est coherent

## Dev Notes

- Ne pas reinventer les regles de bonus : reutiliser les regles TOP 14 deja posees dans les stories precedentes.
- Le but est la rapidite de saisie, pas un ecran de saisie completement nouveau.
- Garder la logique de calcul pure et testable.

### Project Structure Notes

- Cette story ajoute surtout de la logique de formulaire dans la popup cockpit.
- Preferer des fonctions pures pour les bonus et la validation.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 8]
- [Source: _bmad-output/implementation-artifacts/6-1-selection-et-modification-de-resultats-de-matchs.md]

## Dev Agent Record

### Agent Model Used

gpt-5.4-mini

### Debug Log References

- `npm test -- --run src/__tests__/match-cockpit.test.js`

### Completion Notes List

- Carte de saisie guidee rendue avec scores, essais et recap des bonus.
- Calcul automatique des bonus offensif et defensif conserve dans une fonction pure testable.
- Validation empêche d'avancer tant que les 4 champs ne sont pas coherents.

### File List

- `src/components/match-cockpit.js`
- `src/styles/components/match-cockpit.css`
- `src/__tests__/match-cockpit.test.js`

## Senior Developer Review (AI)

**Review Date:** 2026-04-21
**Outcome:** Approved
**Action Items:** 0

### Action Items

- None.

### Change Log

- 2026-04-21 : Added documented review trace for Epic 8 story 8.3.
