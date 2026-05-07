# Story 14.3 : Suppression definitive du bouton Reveler la projection

Status: done

ui-structural: false

## Story

En tant qu'utilisateur,
Je veux acceder directement au classement apres fermeture de la Tribune,
Afin de ne plus passer par une etape de reveal devenue inutile.

## Acceptance Criteria

1. **Given** l'utilisateur a ferme l'ecran Tribune dans la session courante  
   **When** le classement s'affiche  
   **Then** aucun bouton `Reveler la projection`, `Projection en cours...` ou `Rejouer` n'est rendu dans l'application  
   **And** le composant `reveal-button` et ses imports/styles/tests obsoletes sont supprimes ou retires du chemin runtime  
   **And** les lignes de classement s'affichent directement dans leur etat utile sans dependance a un clic de reveal  
   **And** les etats de store lies a `revealed` sont retires ou limites aux usages encore necessaires hors flux de classement  
   **And** les tests couvrent l'absence du bouton reveal et l'affichage du classement apres fermeture

## Tasks / Subtasks

- [x] Retirer le reveal du runtime classements (AC: 1)
  - [x] Supprimer l'import et le rendu de `reveal-button` dans `src/app.js`
  - [x] Supprimer le composant/style obsolete si plus reference
  - [x] Garder le classement directement visible apres fermeture Tribune
- [x] Retirer ou remplacer l'etat `revealed` (AC: 1)
  - [x] Retirer `revealed` du store si aucun usage hors flux classement ne reste necessaire
  - [x] Remplacer les reactions badge/supporter score par `tribuneArrivalClosed` si elles representent la fin du moment d'arrivee
  - [x] Mettre a jour les tests associes
- [x] Verifier les regressions (AC: 1)
  - [x] Tester absence des libelles reveal dans l'app apres fermeture
  - [x] Tester affichage direct du classement apres fermeture
  - [x] Lancer les checks requis

## Dev Notes

- Story 14.2 a introduit `tribune-arrival` et `tribuneArrivalClosed`; utiliser cet evenement comme fin du moment d'arrivee si un comportement one-shot doit remplacer `revealed`.
- Ne pas supprimer `src/animation/engine.js` : il reste utilise par le simulateur pour l'animation d'impact.
- Ne pas modifier le contrat JSON ni les API.
- Garder les changements minimaux : retirer le bouton reveal du chemin runtime, sans refondre les zones de classement.

### Project Structure Notes

- Fichiers probables : `src/app.js`, `src/store.js`, `src/components/badge.js`, `src/supporter-score.js`, tests associes, suppression de `src/components/reveal-button.js` et `src/styles/components/reveal-button.css`.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 14, Story 14.3]
- [Source: _bmad-output/implementation-artifacts/14-2-ecran-darrivee-tribune-seule-avec-fermeture-session-only.md]
- [Source: src/app.js]
- [Source: src/store.js]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run src/__tests__/app.test.js src/__tests__/store.test.js src/__tests__/badge.test.js src/__tests__/supporter-score.test.js` - pass, 45 tests
- `npx biome check src/app.js src/store.js src/components/badge.js src/supporter-score.js src/__tests__/app.test.js src/__tests__/store.test.js src/__tests__/badge.test.js src/__tests__/supporter-score.test.js _bmad-output/implementation-artifacts/14-3-suppression-definitive-du-bouton-reveler-la-projection.md` - pass
- Review finding fixed: removed obsolete root-level `tests/reveal-button.test.js` that imported the deleted component.
- `npx vitest run` - pass, 923 tests
- `npx biome check .` - pass
- `src-tauri/Cargo.toml` absent, no `cargo test` target in this workspace

### Completion Notes List

- Removed reveal button import/render from the classements tab.
- Deleted obsolete `reveal-button` component and CSS.
- Removed `revealed` from the store and moved badge/supporter-score one-shot behavior to `tribuneArrivalClosed`.
- Tests cover direct classement after Tribune close and absence of projection reveal labels.

### File List

- `_bmad-output/implementation-artifacts/14-3-suppression-definitive-du-bouton-reveler-la-projection.md`
- `src/app.js`
- `src/store.js`
- `src/components/badge.js`
- `src/supporter-score.js`
- `src/__tests__/app.test.js`
- `src/__tests__/store.test.js`
- `src/__tests__/badge.test.js`
- `src/__tests__/supporter-score.test.js`
- `src/components/reveal-button.js` (deleted)
- `src/styles/components/reveal-button.css` (deleted)
- `tests/reveal-button.test.js` (deleted)

## Senior Developer Review (AI)

### Review Date

2026-05-06

### Review Outcome

Approved after correction.

### Action Items

- [x] Supprimer le test obsolete `tests/reveal-button.test.js` qui importait le composant retire.

### Change Log

- 2026-05-06 : Story created and moved to in-progress.
- 2026-05-06 : Reveal button removed from runtime; story moved to review.
- 2026-05-06 : Review approved after obsolete test removal; story marked done.
