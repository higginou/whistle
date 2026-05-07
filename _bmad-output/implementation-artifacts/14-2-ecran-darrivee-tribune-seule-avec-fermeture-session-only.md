# Story 14.2 : Ecran d'arrivee Tribune seule avec fermeture session-only

Status: done

ui-structural: true

## Maquettes

- [x] Direction validee : [`tribune-arrival-variant-b-matchday-ticket.html`](../mockups/epic-14/tribune-arrival-variant-b-matchday-ticket.html)
- [x] **GO higgin: oui** - variante B avec toutes les informations actuelles de la carte Tribune, validee le 2026-05-06 dans Story 14.1.

## Story

En tant que supporter de La Rochelle,
Je veux que l'app s'ouvre uniquement sur la carte Tribune rochelaise avec un bouton Fermer,
Afin de commencer par un moment focalise avant de consulter le classement.

## Acceptance Criteria

1. **Given** l'utilisateur ouvre l'app sur l'onglet classements pour la premiere fois de la session  
   **When** les donnees sont disponibles  
   **Then** seule la carte Tribune rochelaise est visible dans le contenu principal  
   **And** le classement, les zones et toute action de projection sont absents de l'ecran d'arrivee  
   **And** un bouton Fermer explicite est affiche tout en bas, accessible au clavier et au tactile avec une zone minimale de 48px

2. **Given** l'utilisateur clique sur Fermer  
   **When** la fermeture est traitee  
   **Then** la carte d'arrivee est masquee et le classement s'affiche immediatement  
   **And** l'etat ferme est conserve uniquement en sessionStorage pour la session courante  
   **And** un nouveau chargement dans une nouvelle session reaffiche la carte Tribune rochelaise seule

3. **Given** `prefers-reduced-motion` est actif  
   **When** l'utilisateur ferme la carte  
   **Then** la transition est instantanee ou limitee a l'opacite, sans animation de position

## Tasks / Subtasks

- [x] Respecter le gate maquettes (AC: 1)
  - [x] Verifier `GO higgin: oui` pour la variante B dans Story 14.1
  - [x] Traduire la direction sans dupliquer la logique metier de la carte Tribune
- [x] Ajouter l'ecran d'arrivee Tribune (AC: 1)
  - [x] Rendre uniquement la carte Tribune dans l'onglet classements avant fermeture
  - [x] Masquer classement, zones et CTA de projection avant fermeture
  - [x] Afficher un bouton Fermer bas d'ecran, focusable et tactile
- [x] Gerer la fermeture session-only (AC: 2)
  - [x] Ecrire l'etat ferme dans `sessionStorage`
  - [x] Re-rendre immediatement le classement apres fermeture
  - [x] Ne pas utiliser `localStorage` ni persistance durable
- [x] Respecter reduced motion et a11y (AC: 1, 3)
  - [x] Limiter les transitions a opacity/transform, et opacity-only ou instantane en reduced motion
  - [x] Ajouter labels/roles/focus-visible pertinents
  - [x] Couvrir le comportement par tests

## Dev Notes

- Reutiliser `src/components/score-card.js` pour afficher les informations actuelles de la carte Tribune et eviter une deuxieme source de verite.
- Le rendu d'arrivee doit forcer les informations detaillees de la carte Tribune, car la variante validee demande toutes les infos actuelles.
- La fermeture doit etre stockee dans `sessionStorage` uniquement, avec une cle dediee a ce flux. Ne pas utiliser `localStorage`.
- Story 14.3 supprimera definitivement le composant reveal. Dans cette story, il suffit que le reveal ne soit pas rendu avant fermeture.
- Ne pas modifier les endpoints ou le contrat JSON.
- Si `innerHTML` est utilise avec donnees dynamiques, echapper les valeurs ou reutiliser les composants existants qui le font deja.

### Project Structure Notes

- Fichiers probables : `src/app.js`, `src/store.js`, `src/components/tribune-arrival.js`, `src/styles/components/tribune-arrival.css`, `src/components/score-card.js`, `src/__tests__/app.test.js`.
- Respecter les conventions : 1 composant JS + CSS associe, classes `w-*`, store comme source de communication, pas de fichier `utils.js` generique.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 14, Story 14.2]
- [Source: _bmad-output/implementation-artifacts/14-1-maquettes-du-nouveau-flux-darrivee-tribune.md]
- [Source: _bmad-output/mockups/epic-14/tribune-arrival-variant-b-matchday-ticket.html]
- [Source: src/components/score-card.js]
- [Source: src/app.js]
- [Source: src/store.js]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- `npx vitest run src/__tests__/app.test.js src/__tests__/score-card.test.js src/__tests__/store.test.js` - pass, 58 tests
- `npx biome check src/app.js src/store.js src/components/score-card.js src/components/tribune-arrival.js src/styles/components/tribune-arrival.css src/__tests__/app.test.js` - pass
- Review finding fixed: added a regression test proving Tribune closure does not invoke positional animation.
- `npx vitest run` - pass, 929 tests
- `npx biome check .` - pass
- `src-tauri/Cargo.toml` absent, no `cargo test` target in this workspace

### Completion Notes List

- Added `tribuneArrivalClosed` store state and sessionStorage bridge.
- Added `tribune-arrival` component with fixed bottom Fermer button and current score card rendered in detailed mode.
- Classements tab now renders only the Tribune arrival before session closure, then immediately renders the classement after closure.
- Tests cover first session arrival, closure persistence, and already-closed session behavior.
- Review correction added coverage for the reduced-motion acceptance path by asserting no close animation is invoked.

### File List

- `_bmad-output/implementation-artifacts/14-2-ecran-darrivee-tribune-seule-avec-fermeture-session-only.md`
- `src/app.js`
- `src/store.js`
- `src/components/score-card.js`
- `src/components/tribune-arrival.js`
- `src/styles/components/tribune-arrival.css`
- `src/__tests__/app.test.js`

## Senior Developer Review (AI)

### Review Date

2026-05-06

### Review Outcome

Approved after correction.

### Action Items

- [x] Ajouter une regression test prouvant que la fermeture Tribune ne declenche pas d'animation de position.

### Change Log

- 2026-05-06 : Story created from validated Variant B and moved to in-progress.
- 2026-05-06 : Arrival screen implemented and moved to review.
- 2026-05-06 : Review approved after reduced-motion coverage correction; story marked done.
