# Story 8.4 : Sauvegarde locale, validation finale et accessibilite

Status: done

## Story

En tant que supporteur qui saisit les resultats,
Je veux retrouver mon brouillon apres fermeture et valider seulement quand tout est complet,
Afin de ne rien perdre et d'utiliser la popup sans friction.

## Acceptance Criteria

1. **Given** un match est en cours de saisie
   **When** l'onglet se ferme ou se recharge
   **Then** le brouillon reste disponible localement

2. **Given** tous les matchs sont completes
   **When** l'utilisateur valide l'ensemble
   **Then** la donnee normalisee est prete pour l'envoi au backend

3. **Given** la popup est utilisee au clavier
   **When** l'utilisateur navigue
   **Then** Enter, Space et Tab permettent de progresser sans souris

4. **Given** `prefers-reduced-motion: reduce` est actif
   **When** la popup et les etats changent
   **Then** les animations deviennent discretes ou instantanees

5. **Given** la validation finale est bloquee
   **When** un match manque encore
   **Then** l'app explique clairement ce qui manque sans afficher d'erreur technique

## Tasks / Subtasks

- [ ] Persister le brouillon localement (AC: 1)
  - [ ] Choisir `localStorage` ou `IndexedDB` selon la forme du brouillon
  - [ ] Restaurer la saisie au retour
- [ ] Preparar le payload normalise de validation (AC: 2, 5)
  - [ ] Unifier la structure avant envoi au backend
  - [ ] Bloquer la validation finale si incomplet
- [ ] Verifier l'accessibilite de la popup (AC: 3, 4)
  - [ ] Navigation clavier
  - [ ] Focus visible et motion reduite

## Dev Notes

- Le stockage local n'est qu'un brouillon : la verite finale viendra du backend Vercel plus tard.
- Ne pas commencer l'appel reseau ici ; cette story prepare seulement la sortie propre.
- Ecrire le code de facon simple pour que la transition vers Vercel soit transparente.

### Project Structure Notes

- Touche la logique de stockage local, la validation et les etats d'accessibilite.
- Pas besoin de modifier l'architecture serveur pour cette story.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 8]

## Dev Agent Record

### Agent Model Used

gpt-5.4-mini

### Debug Log References

- `npm test -- --run src/__tests__/match-cockpit.test.js`

### Completion Notes List

- Brouillon persistant via localStorage et restauration au rechargement.
- Payload de validation normalise produit avant l'envoi backend.
- Navigation clavier et `prefers-reduced-motion` geres dans le cockpit.

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

- 2026-04-21 : Added documented review trace for Epic 8 story 8.4.
