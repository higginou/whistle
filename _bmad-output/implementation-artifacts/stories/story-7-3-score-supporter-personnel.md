# Story 7.3 : Score supporter personnel

Status: review

ui-structural: false

Cette story ajoute une progression personnelle dans l'existant. Elle ne change pas le layout structurel, mais elle ajoute un nouvel etat metier et des indicateurs visuels dans la score card.

## Story

En tant que supporter unique du Stade Rochelais,
Je veux voir mon score de supporter progresser avec mes actions dans l'app,
Afin d'avoir une boucle de recompense personnelle et de revenir regulierement.

## Dependencies

- **7-1** (planned) : Refonte visuelle rochelaise — pour que le score s'integre dans le nouveau theme
- **7-2** (planned) : Hero tribune rochelaise — le score supporteur doit s'afficher dans le hero
- **2-2** (done) : Store d'etat, fetch donnees et router — base `get/set/on` a etendre si besoin
- **2-4** (done) : Score card hero La Rochelle — emplacement principal du score

## References

- **UX-DR4** : score card hero comme element central de l'ouverture
- **UX-DR21** : direction visuelle Game UI enrichie
- **Architecture** : store EventTarget + CustomEvent, composants fonctionnels `render()`
- **Architecture** : pas de `utils.js`, pas de couplage direct entre composants
- [Source: planning-artifacts/architecture.md — sections State Management, Naming Conventions, Anti-Patterns to Avoid]
- [Source: planning-artifacts/ux-design-specification.md — sections Game UI et score card hero]

## Acceptance Criteria (BDD)

1. **Given** l'utilisateur ouvre l'app
   **When** le score supporter est calcule
   **Then** un score personnel visible est affiche avec un niveau ou un titre associe

2. **Given** l'utilisateur consulte l'app plusieurs jours de suite
   **When** les points sont recalcules
   **Then** le score augmente selon des regles simples et documentees

3. **Given** l'utilisateur fait une action valorisee (consultation, simulation, bonne intuition)
   **When** l'action est enregistree
   **Then** le score supporteur progresse sans intervention manuelle

4. **Given** le score supporteur est affiche
   **When** on inspecte le composant
   **Then** il reste lisible, compact et integre dans le hero existant

5. **Given** la page est rechargee
   **When** le score supporteur est recalculé
   **Then** il reste stable entre deux sessions grace a la persistence choisie

6. **Given** le store emet une mise a jour liee au score
   **When** l'UI se met a jour
   **Then** aucun autre composant n'est couple directement au score supporteur

## Tasks / Subtasks

- [ ] Definir le modele de score et ses evenements (AC: 1, 2, 3)
  - [ ] Choisir les actions qui donnent des points
  - [ ] Definir les paliers ou titres associes
- [ ] Etendre le store si necessaire (AC: 3, 5, 6)
  - [ ] Ajouter la cle d'etat requise
  - [ ] Conserver le pattern `get/set/on`
- [ ] Afficher le score dans la score card (AC: 1, 4)
  - [ ] Ajouter un affichage compact et lisible
  - [ ] Verifier l'espace sur mobile
- [ ] Ajouter la persistence (AC: 5)
  - [ ] Sauvegarde locale du score
  - [ ] Rehydratation au demarrage
- [ ] Tester les regles de calcul (AC: 2, 3, 5, 6)
  - [ ] Verifier les increments
  - [ ] Verifier la persistence
  - [ ] Verifier l'absence de couplage parasite

## Dev Notes

- Garder la regle simple: pas de monnaie virtuelle complexe.
- Reutiliser la score card existante, pas de nouveau shell.
- Si une nouvelle cle de store est ajoutee, elle doit suivre le pattern actuel avec event dedie.
- La logique de score doit rester deterministic et testable.

### Project Structure Notes

- Cette story touche probablement `src/store.js` et `src/components/score-card.js`.
- Si un titre ou un badge est ajoute, il doit rester dans les conventions `w-*` et `--w-*`.
- Ne pas introduire de second systeme de stockage si `localStorage` suffit.

### References

- [Source: src/store.js]
- [Source: src/components/score-card.js]
- [Source: planning-artifacts/architecture.md — State Management, Naming Conventions, Anti-Patterns to Avoid]

## Dev Agent Record

### Agent Model Used

TBD

### Debug Log References

### Completion Notes List

### File List
