# Story 8.1 : Maquette et cadrage de la popup cockpit

Status: done

ui-structural: true

## Maquettes

Les maquettes sont dans `_bmad-output/mockups/epic-8/` :

- [x] [`match-entry-guided-cockpit.html`](_bmad-output/mockups/epic-8/match-entry-guided-cockpit.html) - variante retenue
- [x] [`match-entry-guided-card-stack.html`](_bmad-output/mockups/epic-8/match-entry-guided-card-stack.html)
- [x] [`match-entry-guided-match-focus.html`](_bmad-output/mockups/epic-8/match-entry-guided-match-focus.html)

Le cockpit validé doit montrer au minimum : titre, progression, etat d'avancement, carte match, champs de saisie et barre d'actions.

**GO higgin: oui** - variante cockpit validee.

> GATE BLOQUANT : cette story ne passe pas en `in-progress` sans la maquette cockpit validée.

## Story

En tant que supporteur qui saisit les resultats,
Je veux une popup cockpit claire et rassurante,
Afin de completer les matchs sans me perdre.

## Acceptance Criteria

1. **Given** l'utilisateur ouvre l'app un lundi avec des matchs manquants
   **When** la popup s'affiche
   **Then** elle reprend la direction visuelle du cockpit valide
   **And** elle bloque la saisie tant qu'elle est ouverte

2. **Given** la popup est ouverte
   **When** on lit le header
   **Then** on voit le nombre de matchs restants, le match courant et la progression

3. **Given** la popup est rendue sur mobile
   **When** l'ecran varie entre 360px et 430px
   **Then** la mise en page reste lisible et compacte

4. **Given** l'utilisateur a `prefers-reduced-motion: reduce`
   **When** la popup apparait
   **Then** l'ouverture reste simple et non agressive

5. **Given** la popup est ouverte
   **When** on compare au mockup
   **Then** le rendu reste proche du cockpit retenu, pas d'une sheet generique

## Tasks / Subtasks

- [ ] Construire le shell de la popup cockpit (AC: 1, 2, 5)
  - [ ] Ajouter le titre, la progression et le bandeau d'etat
  - [ ] Poser la structure de la carte match
- [ ] Poser les styles cockpit (AC: 3, 5)
  - [ ] Traduire les couleurs, surfaces et glow du mockup
  - [ ] Garder des tailles tactiles confortables
- [ ] Brancher la popup au flux de saisie (AC: 1, 2)
  - [ ] Prevoir l'ouverture conditionnelle
  - [ ] Prevoir la fermeture uniquement apres completion totale

## Dev Notes

- Utiliser un `dialog` natif ou un composant popup equivalente qui empeche le reste de l'app d'etre clique.
- Ne pas creer de nouvelle logique metier ici : cette story ne fait que cadrer la forme.
- Le dev peut ne pas connaitre Vercel encore, mais ce point n'est pas concerne ici.

### Project Structure Notes

- Cette story touche surtout la couche UI de la popup.
- S'appuyer sur les patterns existants de bottom sheet/dialog plutot que repartir de zero.
- Ne pas casser le reste de l'app principale.

### References

- [Source: _bmad-output/mockups/epic-8/match-entry-guided-cockpit.html]
- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 8]

## Dev Agent Record

### Agent Model Used

gpt-5.4-mini

### Debug Log References

- Cockpit component rendered and verified with `npm test -- src/__tests__/match-cockpit.test.js`
- Production build verified with `npm run build`

### Completion Notes List

- Cockpit shell delivered with title, progress, match card, fields, and action bar.
- Mockup direction kept aligned with the validated cockpit variant.

### File List

- `_bmad-output/mockups/epic-8/match-entry-guided-cockpit.html`
- `src/components/match-cockpit.js`
- `src/styles/components/match-cockpit.css`
- `src/components/tab-simulateur.js`
- `src/app.js`
- `src/__tests__/match-cockpit.test.js`
