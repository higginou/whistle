# Story 10.1 : Moteur de recalcul complet

Status: done

## Story

En tant que dev,
Je veux un moteur de calcul pur et deterministe,
Afin de reconstruire les donnees a partir de la source de verite sans etat cache fragile.

## Acceptance Criteria

1. **Given** les matchs saisis sont stockes en base
   **When** le moteur de calcul est execute
   **Then** il produit le classement, l'Elo et les projections depuis le debut de saison

2. **Given** le moteur tourne plusieurs fois
   **When** les memes donnees sont fournies
   **Then** le resultat reste identique

3. **Given** le code est lu par un dev qui ne connait pas Vercel
   **When** il cherche ou vit le calcul
   **Then** il comprend qu'il s'agit d'une fonction pure partagee entre l'API et le runtime

4. **Given** le moteur est teste en local
   **When** on le lance sans le frontend
   **Then** il fonctionne de facon autonome

## Tasks / Subtasks

- [x] Extraire le calcul dans un module pur (AC: 1, 2, 4)
  - [x] Reprendre les regles Elo existantes
  - [x] Garder les entrees et sorties explicites
- [x] Verifier la determinisme du calcul (AC: 2)
  - [x] Meme entree = meme sortie
  - [x] Pas d'etat cache dependant du navigateur
- [x] Rendre le module partageable par l'API Vercel (AC: 3, 4)
  - [x] Eviter les dependances serveur inutiles
  - [x] Garder une interface simple

## Dev Notes

- Ne pas melanger calcul et persistence.
- Le moteur doit pouvoir tourner dans un contexte serveur Vercel comme en local.
- Le code doit rester lisible pour quelqu'un qui decouvre Vercel.

### Project Structure Notes

- Touche les modules de calcul partagees et la couche de recompute.
- Pas de logique UI ici.

### References

- [Source: _bmad-output/planning-artifacts/architecture.md - Migration Target: Vercel-only Runtime]
- [Source: _bmad-output/planning-artifacts/epics.md - Epic 10]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-04-25 : `npx vitest run tests/recalculation-engine.test.js` rouge attendu avant creation du module, puis vert apres implementation.
- 2026-04-25 : `npx vitest run` : 44 fichiers, 926 tests passes.
- 2026-04-25 : `node --input-type=module -e "import('./src/recompute/recalculation-engine.js').then(() => console.log('import-ok'))"` : import-ok.
- 2026-04-25 : `npx vitest run tests/recalculation-engine.test.js tests/elo.test.js` : 145 tests passes apres corrections de review.
- 2026-04-25 : `npx vitest run` : 44 fichiers, 928 tests passes apres corrections de review.
- 2026-04-25 : `npx biome check .` : passe.
- 2026-04-25 : `cargo test` non execute : aucun `src-tauri/Cargo.toml` present dans le repo.

### Completion Notes List

- Module pur `recomputeSeasonProjection()` ajoute sous `src/recompute/`, sans acces base, fichier, navigateur ni etat global mutable.
- Le recalcul reprend les fonctions Elo existantes pour points rugby, Elo, projections Monte Carlo, confiance, zones, forme, tendance, calendrier avec difficulte et head-to-head.
- Le moteur utilise un generateur pseudo-aleatoire seedable et un `generatedAt` explicite pour garantir meme entree = meme sortie.
- Tests ajoutes pour reconstruction classement/Elo/projections, determinisme, absence de mutation des entrees et execution autonome locale.
- Corrections de review appliquees : lignes DB snake_case acceptees, matchs non joues exclus, matchs `played` incomplets rejetes, import local robuste sans `process.argv[1]`.

### File List

- src/recompute/recalculation-engine.js
- scripts/elo.js
- tests/recalculation-engine.test.js
- _bmad-output/implementation-artifacts/10-1-moteur-de-recalcul-complet.md
- _bmad-output/implementation-artifacts/sprint-status.yaml

### Change Log

- 2026-04-25 : Ajout du moteur de recalcul pur et deterministe partageable par l'API Vercel et le runtime local.
- 2026-04-25 : Correction des findings de review sur lignes DB non jouees, validation d'entrees et import CLI robuste.

## Senior Developer Review (AI)

Review Date: 2026-04-25

Outcome: Approve

### Findings

- Aucun finding bloquant apres re-review.

### Action Items

- [x] Exclure les lignes DB scheduled/null-score des calculs Elo/form/projections.
- [x] Faire echouer explicitement les matchs `played` sans scores.
- [x] Permettre l'import local du moteur sans dependance a `process.argv[1]`.
- [x] Accepter les noms de colonnes DB snake_case pour les matchs et le calendrier.

### Residual Risks / Testing Gaps

- Pas de test d'integration avec une vraie requete DB contenant `scheduled`, `postponed` et `cancelled`; la logique unitaire couvre l'exclusion des statuts non joues.
