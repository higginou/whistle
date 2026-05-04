# Story 7.3 : Score supporter personnel

Status: done

ui-structural: false

Cette story ajoute une progression personnelle dans l'existant. Elle ne change pas le layout structurel, mais elle ajoute un nouvel etat metier et des indicateurs visuels dans la score card.

## Story

En tant que supporter unique du Stade Rochelais,
Je veux voir mon score de supporter progresser avec mes actions dans l'app,
Afin d'avoir une boucle de recompense personnelle et de revenir regulierement.

## Dependencies

- **7-1** (done) : Refonte visuelle rochelaise — pour que le score s'integre dans le nouveau theme
- **7-2** (done) : Hero tribune rochelaise — le score supporteur doit s'afficher dans le hero
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

- [x] Definir le modele de score et ses evenements (AC: 1, 2, 3)
  - [x] Choisir les actions qui donnent des points
  - [x] Definir les paliers ou titres associes
- [x] Etendre le store si necessaire (AC: 3, 5, 6)
  - [x] Ajouter la cle d'etat requise
  - [x] Conserver le pattern `get/set/on`
- [x] Afficher le score dans la score card (AC: 1, 4)
  - [x] Ajouter un affichage compact et lisible
  - [x] Verifier l'espace sur mobile
- [x] Ajouter la persistence (AC: 5)
  - [x] Sauvegarde locale du score
  - [x] Rehydratation au demarrage
- [x] Tester les regles de calcul (AC: 2, 3, 5, 6)
  - [x] Verifier les increments
  - [x] Verifier la persistence
  - [x] Verifier l'absence de couplage parasite

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

openai/gpt-5.5

### Debug Log References

- 2026-05-04 : Review automatique Epic 7.3, corrections progression quotidienne et premiere consultation valorisee.
- 2026-05-04 : `npx vitest run` : 45 fichiers, 911 tests, 0 echec.
- 2026-05-04 : `npx biome check .` : 0 erreur.
- 2026-05-04 : `npm run build` : OK.

### Completion Notes List

- Modele de score personnel implemente avec points pour consultation, selection equipe, simulation, reveal et retour quotidien.
- Cle `supporterScore` ajoutee au store avec evenement dedie, sans couplage direct entre composants.
- Score affiche dans la score card avec titre, note et barre de progression persistante.
- Persistence locale et rehydratation au demarrage couvertes par tests.

### File List

- `src/supporter-score.js`
- `src/store.js`
- `src/app.js`
- `src/components/score-card.js`
- `src/styles/components/score-card.css`
- `src/__tests__/supporter-score.test.js`
- `src/__tests__/score-card.test.js`

### Change Log

- 2026-05-04 : Finalisation story 7.3, validation review et corrections des regles de progression.

## Senior Developer Review (AI)

Date : 2026-05-04

Outcome : Approve

### Findings

- Aucun finding bloquant restant apres corrections.

### Action Items

- [x] Ajouter la progression lors d'un retour sur un jour different.
- [x] Valoriser la premiere vraie navigation de consultation depuis `classements`.

### Residual Risks / Testing Gaps

- La progression quotidienne utilise la date UTC et n'est pas testee autour des frontieres de minuit local.
- Pas de test visuel mobile automatise du panneau score supporter.
