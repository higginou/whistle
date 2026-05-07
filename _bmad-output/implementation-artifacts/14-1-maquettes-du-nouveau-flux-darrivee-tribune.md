# Story 14.1 : Maquettes du nouveau flux d'arrivee Tribune

Status: done

ui-structural: true

## Maquettes

Les maquettes sont produites dans `_bmad-output/mockups/epic-14/` :

- [x] [`tribune-arrival-variant-a-stadium-gate.html`](../mockups/epic-14/tribune-arrival-variant-a-stadium-gate.html) - entree stade nocturne, carte Tribune seule, fermeture en bas
- [x] [`tribune-arrival-variant-b-matchday-ticket.html`](../mockups/epic-14/tribune-arrival-variant-b-matchday-ticket.html) - billet de match mobile, avec toutes les infos actuelles de la carte Tribune avant fermeture
- [x] [`tribune-arrival-variant-c-spotlight-card.html`](../mockups/epic-14/tribune-arrival-variant-c-spotlight-card.html) - carte spotlight recommandee par l'agent mockups

Variante recommandee par l'agent mockups : variante C, car elle isole le mieux La Rochelle dans la lumiere et rend clair que le classement attend la fermeture.

Variante retenue par higgin : variante B avec toutes les informations actuelles de la carte Tribune.

**GO higgin: oui** - variante B validee le 2026-05-06.

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI runtime ne doit etre ecrit avant ce GO.

## Story

En tant que supporter de La Rochelle,
Je veux valider visuellement le nouvel ecran d'arrivee centre sur la Tribune rochelaise,
Afin que le changement conserve l'identite emotionnelle de l'app avant implementation.

## Acceptance Criteria

1. **Given** la story est preparee pour developpement  
   **When** les maquettes sont produites dans `_bmad-output/mockups/epic-14/`  
   **Then** 2 a 3 variantes HTML/CSS/JS standalone presentent la carte Tribune rochelaise seule avec un bouton Fermer tout en bas  
   **And** les variantes montrent explicitement l'absence du bouton Reveler la projection et l'absence du classement avant fermeture  
   **And** les variantes respectent mobile portrait Android, zones tactiles 48px, contrastes WCAG AA et prefers-reduced-motion  
   **And** la section Maquettes de la story contient les liens vers les fichiers et `GO higgin: oui` avant tout code UI

## Tasks / Subtasks

- [x] Produire les maquettes standalone (AC: 1)
  - [x] Creer 3 variantes HTML/CSS/JS dans `_bmad-output/mockups/epic-14/`
  - [x] Montrer la carte Tribune rochelaise seule avant fermeture
  - [x] Placer un bouton Fermer explicite en bas d'ecran
- [x] Verifier les contraintes de cadrage (AC: 1)
  - [x] Mentionner explicitement l'absence du classement et du bouton Reveler avant fermeture
  - [x] Respecter mobile portrait 360-430px, zones tactiles 48px, focus visible
  - [x] Ajouter une regle `prefers-reduced-motion`
- [x] Obtenir le GO explicite de higgin (AC: 1)
  - [x] Remplacer `GO higgin: non` par `GO higgin: oui` apres validation explicite
  - [x] Noter la variante retenue pour Story 14.2

## Dev Notes

- Cette story ne doit pas modifier le runtime applicatif (`src/`, `api/`, `scripts/`). Elle sert a cadrer la direction UI avant implementation.
- Les maquettes sont standalone et peuvent inclure un etat apres fermeture pour expliquer le flux, mais l'ecran initial doit montrer uniquement la carte Tribune avec Fermer.
- Story 14.2 ne pourra pas commencer tant que la section Maquettes ne contient pas `GO higgin: oui`.
- La direction retenue devra preserver les exigences UX-DR22 : carte Tribune seule au lancement, classement masque, CTA de projection masque, bouton Fermer accessible en bas, persistance session-only dans l'implementation suivante.
- Le bouton `Reveler la projection` sera retire du runtime en Story 14.3, pas dans cette story.

### Project Structure Notes

- Maquettes uniquement : `_bmad-output/mockups/epic-14/*.html`.
- Story de suivi probable apres GO : `src/app.js`, `src/store.js`, nouveau composant d'arrivee si necessaire, CSS associe dans `src/styles/components/`.
- Conserver les conventions existantes : fichiers `kebab-case`, classes `w-*`, custom properties `--w-*`, pas de `utils.js` generique.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 14, Story 14.1]
- [Source: _bmad-output/planning-artifacts/epics.md - FR39, FR40, FR41, UX-DR22]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - mobile Android, emotion sportive, zero friction]
- [Source: _bmad-output/planning-artifacts/architecture.md - composants, store, animation, conventions]
- [Source: _bmad-output/mockups/epic-14/tribune-arrival-variant-a-stadium-gate.html]
- [Source: _bmad-output/mockups/epic-14/tribune-arrival-variant-b-matchday-ticket.html]
- [Source: _bmad-output/mockups/epic-14/tribune-arrival-variant-c-spotlight-card.html]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- Delegated mockup generation completed for 3 standalone variants.
- Exact search verified each mockup includes `Fermer`, absence messaging for classement/reveal, focus-visible, and reduced-motion support.
- Variant B updated after feedback to include the current Tribune card information: headline/stake, score supporter, ranks, trend, Elo/confidence, zones, upcoming matches, and model analysis.
- Review finding fixed: mockup links now resolve correctly from the story file location.

### Completion Notes List

- Story 14.1 prepared with mockup links and blocking GO gate.
- No product runtime code modified.
- Variant C recommended by delegated mockup agent.
- Variant B iterated to show all current Tribune card information inside the arrival ticket.
- Variant B validated by higgin as the direction for Story 14.2.
- Review finding corrected: relative mockup links changed to `../mockups/...`.

### File List

- `_bmad-output/implementation-artifacts/14-1-maquettes-du-nouveau-flux-darrivee-tribune.md`
- `_bmad-output/mockups/epic-14/tribune-arrival-variant-a-stadium-gate.html`
- `_bmad-output/mockups/epic-14/tribune-arrival-variant-b-matchday-ticket.html`
- `_bmad-output/mockups/epic-14/tribune-arrival-variant-c-spotlight-card.html`

## Senior Developer Review (AI)

### Review Date

2026-05-06

### Review Outcome

Approved after correction.

### Action Items

- [x] Higgin choisit une variante ou demande une iteration.
- [x] Enregistrer `GO higgin: oui` avant Story 14.2.
- [x] Corriger les liens Markdown des maquettes pour qu'ils resolvent depuis `implementation-artifacts`.

### Change Log

- 2026-05-06 : Story created with delegated mockups and UI gate pending.
- 2026-05-06 : Variant B updated with all current Tribune card information after feedback.
- 2026-05-06 : GO higgin recorded for Variant B; story moved to review.
- 2026-05-06 : Review correction applied for mockup link paths.
- 2026-05-06 : Review approved after correction; story marked done.
