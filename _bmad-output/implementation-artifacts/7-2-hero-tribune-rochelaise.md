# Story 7.2 : Hero tribune rochelaise

Status: done

ui-structural: true

Cette story recompose le premier ecran. Elle cree un hero plus expressif et plus rituel, donc validation design requise avant implementation.

## Maquettes

Les maquettes sont produites dans `_bmad-output/mockups/epic-7/` :

- [x] [`hero-variant-a.html`](_bmad-output/mockups/epic-7/hero-variant-a.html) — hero compact, message central, score card dominante
- [x] [`hero-variant-b.html`](_bmad-output/mockups/epic-7/hero-variant-b.html) — hero narratif, phrase du jour + enjeu + score card
- [x] [`hero-variant-c.html`](_bmad-output/mockups/epic-7/hero-variant-c.html) — hero tribune, plus immersif, plus scande

Chaque variante doit montrer la place du titre, du message du jour, de l'enjeu principal et de la carte La Rochelle.

**GO higgin: oui** — variante C validée.

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre.

## Story

En tant que supporter unique du Stade Rochelais,
Je veux que l'ouverture de l'app ressemble a une entree en tribune,
Afin de ressentir immediatement l'enjeu de la journee et l'attachement au club.

## Dependencies

- **7-1** (done) : Refonte visuelle rochelaise — base visuelle a appliquer au hero
- **2-3** (done) : Layout page principale et structure HTML semantique — emplacement du hero
- **2-4** (done) : Score card hero La Rochelle — contenu central deja present et a recontextualiser

## References

- **UX-DR4** : score card hero occupe ~40% de l'ecran au premier affichage
- **UX-DR19** : layout page unique scrollable, hero en tete
- **UX-DR21** : direction visuelle Game UI enrichie
- **Architecture** : `src/components/score-card.js` et `src/components/page-layout.js`
- [Source: planning-artifacts/ux-design-specification.md — sections Score card hero, page layout, Game UI]
- [Source: planning-artifacts/epics.md — Epic 2, UX-DR4, UX-DR19, UX-DR21]

## Acceptance Criteria (BDD)

1. **Given** l'app se charge
   **When** le premier ecran s'affiche
   **Then** l'utilisateur voit une entree plus emotionnelle et plus memorisable qu'un simple dashboard

2. **Given** la hero card est affichee
   **When** l'utilisateur lit l'ecran
   **Then** le nom du club, l'etat du moment et l'enjeu principal sont compréhensibles en une seconde

3. **Given** le hero est rendu
   **When** on inspecte la structure
   **Then** la carte La Rochelle reste le centre visuel de l'ecran
   **And** les autres contenus servent l'hero au lieu de le concurrencer

4. **Given** l'utilisateur est sur mobile
   **When** il ouvre l'app
   **Then** le hero prend une part dominante de l'ecran sans casser le scroll

5. **Given** `prefers-reduced-motion` est active
   **When** le hero apparait
   **Then** aucune animation superflue ne nuit a la lecture

6. **Given** les donnees de saison sont absentes ou en cache
   **When** le hero est rendu
   **Then** le message reste coherent avec l'etat des donnees et ne produit pas de vide visuel

## Tasks / Subtasks

- [x] Repenser le contenu hero de l'accueil (AC: 1, 2, 3)
  - [x] Definir le message du jour
  - [x] Mettre en avant l'enjeu principal
  - [x] Garder La Rochelle comme point focal
- [x] Adapter le layout du hero (AC: 3, 4)
  - [x] Ajuster `page-layout.css` si necessaire
  - [x] Ajuster `score-card.css` pour le premier ecran
- [x] Verifier les etats de donnees et le reduced motion (AC: 5, 6)
  - [x] Valider l'affichage quand les donnees sont en cache
  - [x] Verifier l'absence de motion agressive

## Dev Notes

- Reutiliser le composant de score card existant au lieu d'en creer un second.
- Ce travail doit etre surtout un travail de composition et de mise en scene.
- Garder la lecture ultra rapide: accroche, enjeu, carte, suite.
- Ne pas deplacer la navigation ou la logique de store.

### Project Structure Notes

- La story doit rester compatible avec le slot hero deja existant dans le layout.
- Si un texte ou un message doit varier selon l'etat des donnees, le calcul doit rester dans le composant ou dans `app.js`, pas dans le CSS.

### References

- [Source: src/components/score-card.js]
- [Source: src/components/page-layout.js]
- [Source: src/styles/components/score-card.css]
- [Source: src/styles/components/page-layout.css]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.5

### Debug Log References

- 2026-05-04 : Review automatique Epic 7.2, correction du stale state manque sur rendu initial et transition stale -> fresh.
- 2026-05-04 : `npx vitest run` : 45 fichiers, 911 tests, 0 echec.
- 2026-05-04 : `npx biome check .` : 0 erreur.
- 2026-05-04 : `npm run build` : OK.

### Completion Notes List

- Hero transforme en entree "Tribune rochelaise" avec accroche, enjeu du jour et carte La Rochelle comme point focal.
- Score card conserve le centre visuel tout en ajoutant le contexte emotionnel et l'enjeu principal.
- Indicateur stale rendu correctement meme si `dataStale` est defini avant le montage de la score card.
- `dataStale` est maintenant nettoye quand des donnees fraiches remplacent des donnees stale.

### File List

- `src/components/score-card.js`
- `src/styles/components/score-card.css`
- `src/styles/components/page-layout.css`
- `src/data.js`
- `src/__tests__/score-card.test.js`
- `src/__tests__/data.test.js`

### Change Log

- 2026-05-04 : Finalisation story 7.2, validation review et correction des etats stale/cache.

## Senior Developer Review (AI)

Date : 2026-05-04

Outcome : Approve

### Findings

- Aucun finding bloquant restant apres corrections.

### Action Items

- [x] Afficher l'indicateur stale quand `dataStale` est deja present avant `render()`.
- [x] Nettoyer `dataStale` quand des donnees fraiches chargent apres une session stale.

### Residual Risks / Testing Gaps

- Pas de test automatise de viewport mobile.
- Pas de validation visuelle navigateur automatisee du hero.
