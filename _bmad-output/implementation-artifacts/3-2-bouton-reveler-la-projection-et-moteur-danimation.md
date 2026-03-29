# Story 3.2 : Bouton "Reveler la Projection" et moteur d'animation

Status: done

ui-structural: true

Cette story cree deux nouveaux composants UI (reveal-button et le moteur d'animation engine.js) avec un nouveau pattern d'interaction (bouton CTA sticky, animation spring orchestree sur 14 elements). Elle necessite une validation design avant implementation.

## Maquettes

Les maquettes doivent etre produites dans `_bmad-output/mockups/epic-3/` :

- [ ] `reveal-button-variant-a.html` — bouton gradient violet pleine largeur, sticky en bas de la hero section, glow subtil
- [ ] `reveal-button-variant-b.html` — bouton integre entre la hero card et le classement, inline flow
- [ ] `reveal-button-variant-c.html` — bouton flottant fixe en bas d'ecran avec backdrop blur

Chaque variante doit montrer les 4 etats : defaut, presse (scale 0.97), animation en cours (desactive), post-reveal ("Rejouer").

**GO higgin: oui** — variante sticky bottom retenue (2026-03-29)

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI ne doit etre ecrit avant ce GO.

## Story

En tant qu'utilisateur,
Je veux declencher l'animation ou les equipes glissent vers leur position projetee,
Afin de vivre le moment de reveal comme un mini-evenement sportif.

## Dependencies

- **2-1** (done) : Design tokens et fondation visuelle — tokens `--w-*` (couleurs, typographie, espacement, radius, ombres)
- **2-2** (done) : Store d'etat — `store.js` (get/set/on), cles `season`, `revealed`, `dataFresh`
- **3-1** (done) : Zones de classement et lignes d'equipe — `zone-group.js`, `rank-row.js` (les elements DOM cibles de l'animation), `confidence-bar.js`
- **Spike Motion v12** (done, retro Epic 2) : `animate` depuis `motion/mini` (~2.5KB gz) + `spring` depuis `motion` (~0.5KB gz), API spring validee, stagger valide

## References

- **FRs** : FR21 (animation de projection declenchee par l'utilisateur)
- **UX-DRs** : UX-DR6 (bouton "Reveler la Projection"), UX-DR12 (moteur animation reveal), UX-DR13 (prefers-reduced-motion), UX-DR14 (feedback tactile), UX-DR18 (aria-busy, aria-labels)
- **Architecture** : `src/components/reveal-button.js` + `src/styles/components/reveal-button.css`, `src/animation/engine.js`
- **JSON** : `teams[].currentRank`, `teams[].projectedRank` — le delta entre les deux determine l'amplitude de l'animation
- [Source: planning-artifacts/architecture.md — section Structure Patterns, ligne ~249]
- [Source: planning-artifacts/ux-design-specification.md — sections "Interaction Signature" et "Moteur d'Animation"]
- [Source: planning-artifacts/epics.md — Story 3.2]
- [Source: epic-2-retro — Spike Motion v12 et Spike strategie-test-animations]

## Acceptance Criteria (BDD)

1. **Given** le classement actuel est affiche (story 3-1 rendu complet)
   **When** l'utilisateur regarde la page
   **Then** un bouton "Reveler la projection" est visible sans scroll, en gradient violet, pleine largeur, uppercase bold (UX-DR6)
   **And** le bouton a un effet glow subtil pour attirer l'attention

2. **Given** le bouton "Reveler la projection" est affiche
   **When** l'utilisateur presse le bouton (touch start)
   **Then** le bouton effectue un scale 0.97 en 50ms (UX-DR14)
   **And** au relachement, retour spring en 150ms

3. **Given** le classement actuel est affiche
   **When** l'utilisateur tape le bouton "Reveler la projection"
   **Then** les 14 equipes glissent vers leur position projetee (`projectedRank`) via spring physics Motion (FR21, UX-DR12)
   **And** le mouvement est uniquement sur `transform: translateY()` et `opacity` (60fps, NFR3)
   **And** le store passe `revealed` a `true`

4. **Given** l'animation de projection est declenchee
   **When** les equipes commencent a bouger
   **Then** le stagger est de 30ms entre chaque equipe (UX-DR12)
   **And** La Rochelle est la derniere a bouger (+100ms apres la derniere equipe)

5. **Given** l'animation de projection est declenchee
   **When** une equipe ne bouge pas (currentRank === projectedRank, delta 0)
   **Then** aucune animation n'est jouee pour cette equipe
   **When** une equipe bouge de +-1 place
   **Then** glissement fluide en 400ms (spring standard : stiffness 200, damping 20)
   **When** une equipe bouge de +-2 places
   **Then** glissement en 600ms avec leger overshoot (spring : stiffness 200, damping 12)
   **When** une equipe bouge de +-3 places ou plus
   **Then** glissement en 800ms avec spring prononce + effet glow sur la ligne (stiffness 120, damping 12)

6. **Given** l'animation est en cours
   **When** on regarde le bouton
   **Then** le bouton est desactive (`disabled`), texte "Projection en cours...", `aria-busy="true"` (UX-DR6, UX-DR18)

7. **Given** l'animation est terminee
   **When** toutes les equipes ont atteint leur position projetee
   **Then** le bouton redevient actif avec le texte "Rejouer" (UX-DR6)
   **And** `aria-busy` est retire
   **And** un tap sur "Rejouer" reset les positions a `currentRank` puis relance l'animation

8. **Given** `prefers-reduced-motion` est active
   **When** l'utilisateur tape "Reveler"
   **Then** le classement projete s'affiche instantanement sans animation (opacity seulement) (UX-DR13)
   **And** les indicateurs de mouvement (delta, fleches) restent visibles
   **And** le bouton passe directement a l'etat "Rejouer"

9. **Given** le bouton "Reveler" est rendu
   **When** on inspecte l'accessibilite
   **Then** le bouton a `type="button"`, un libelle explicite
   **And** pendant l'animation : `aria-busy="true"` est present
   **And** le focus clavier fonctionne correctement

## Taches Techniques

### T1 — Creer `src/animation/engine.js`

- [ ] Importer `animate` depuis `motion/mini` et `spring` depuis `motion`
- [ ] Exporter `revealProjection(rankRowElements, teams)` :
  - `rankRowElements` : NodeList ou tableau des `.w-rank-row` dans l'ordre du DOM
  - `teams` : tableau des objets equipes (avec `currentRank` et `projectedRank`)
  - Retourne une Promise resolue quand toutes les animations sont terminees
- [ ] Calculer le delta pour chaque equipe : `projectedRank - currentRank`
- [ ] Calculer le translateY en px : `delta * hauteurLigne` (obtenir la hauteur reelle via `getBoundingClientRect()` sur un rank-row)
- [ ] Appliquer la graduation du feedback :
  - delta 0 : aucune animation (skip)
  - |delta| 1 : `spring({ stiffness: 200, damping: 20 })`, duree ~400ms
  - |delta| 2 : `spring({ stiffness: 200, damping: 12 })`, duree ~600ms
  - |delta| >= 3 : `spring({ stiffness: 120, damping: 12 })`, duree ~800ms, ajouter classe `w-rank-row--glow` pendant l'animation
- [ ] Stagger : demarrer chaque equipe avec 30ms de delai croissant
- [ ] La Rochelle (`id === 'la-rochelle'`) : demarrage apres toutes les autres + 100ms supplementaires
- [ ] A la fin de chaque animation, mettre a jour le texte de position affiche (currentRank -> projectedRank)
- [ ] Retirer la classe `w-rank-row--glow` apres l'animation (cleanup)
- [ ] `await` de `animate(...).finished` pour l'orchestration sequentielle
- [ ] Ajouter `will-change: transform, opacity` en CSS sur les rank-rows (retirer apres animation)
- [ ] Exporter `resetProjection(rankRowElements, teams)` pour remettre les equipes a leur position initiale (pour "Rejouer")

### T2 — Support `prefers-reduced-motion` dans engine.js

- [ ] Detecter via `window.matchMedia('(prefers-reduced-motion: reduce)')`
- [ ] Si actif : pas de spring, pas de stagger. Appliquer directement les positions finales avec opacity transition instantanee
- [ ] Les deltas et indicateurs de mouvement restent visibles meme sans animation

### T3 — Creer `src/components/reveal-button.js`

- [ ] Exporter `render(container)` ou `container` est un element dans lequel le bouton est insere
- [ ] Structure HTML :
  ```html
  <button class="w-reveal-button" type="button">
    Reveler la projection
  </button>
  ```
- [ ] 3 etats geres via classes CSS :
  - Defaut : `w-reveal-button` — texte "Reveler la projection"
  - En cours : `w-reveal-button w-reveal-button--animating` + `disabled` + `aria-busy="true"` — texte "Projection en cours..."
  - Post-reveal : `w-reveal-button w-reveal-button--replay` — texte "Rejouer"
- [ ] Au tap :
  1. Passer en etat "en cours"
  2. Collecter tous les `.w-rank-row` du DOM et les donnees equipes depuis `get('season').teams`
  3. Appeler `revealProjection(...)` depuis `engine.js`
  4. Quand la Promise est resolue : `set('revealed', true)`, passer en etat "Rejouer"
- [ ] Au tap sur "Rejouer" :
  1. Appeler `resetProjection(...)` pour remettre les positions a `currentRank`
  2. `set('revealed', false)`
  3. Relancer `revealProjection(...)`
- [ ] Feedback tactile : gerer `touchstart` / `touchend` pour le scale 0.97 (ou `pointerdown` / `pointerup`)

### T4 — Creer `src/styles/components/reveal-button.css`

- [ ] Classe `w-reveal-button` (prefixe `w-`)
- [ ] Gradient violet : `background: linear-gradient(135deg, var(--w-color-primary), var(--w-color-primary-dark, #5b21b6))`
- [ ] Pleine largeur : `width: 100%`
- [ ] Texte : uppercase, bold, couleur blanche, taille ~16px
- [ ] Padding : `var(--w-space-md) var(--w-space-lg)` (grille 8px)
- [ ] Border-radius : `var(--w-radius-md, 12px)`
- [ ] Glow : `box-shadow` subtil violet en defaut, plus intense au hover/focus
- [ ] Etat presse : `transform: scale(0.97)`, transition 50ms
- [ ] Etat desactive (`--animating`) : `opacity: 0.7`, `cursor: not-allowed`
- [ ] Etat replay (`--replay`) : style visuel legerement different (ex: outline au lieu de filled, ou icone replay)
- [ ] `@media (prefers-reduced-motion: reduce)` : pas de transition sur le scale
- [ ] Focus visible : outline conforme WCAG AA
- [ ] Zone tactile : minimum 48px de hauteur (UX-DR17)

### T5 — Ajouter classe glow pour rank-row

- [ ] Dans `src/styles/components/rank-row.css`, ajouter la classe `w-rank-row--glow` :
  - `box-shadow` accentue (teinte de la zone ou violet pour l'equipe favorite)
  - Transition sur `box-shadow` pour apparition/disparition fluide
- [ ] `@media (prefers-reduced-motion: reduce)` : pas de glow anime

### T6 — Integration dans `src/app.js`

- [ ] Importer `render as renderRevealButton` depuis `reveal-button.js`
- [ ] Ajouter un slot pour le bouton dans le layout (entre hero section et standings section, ou dans un emplacement sticky)
- [ ] Appeler `renderRevealButton(slot)` au demarrage
- [ ] Verifier que le layout existant de `page-layout.js` supporte l'insertion du bouton — creer un slot `w-reveal-section` si necessaire

### T7 — Tests

- [ ] Fichier : `tests/reveal-button.test.js`
  - [ ] Test : le bouton est rendu avec le texte "Reveler la projection"
  - [ ] Test : le bouton a `type="button"`
  - [ ] Test : le bouton passe en etat desactive pendant l'animation
  - [ ] Test : `aria-busy="true"` est present pendant l'animation
  - [ ] Test : le texte passe a "Rejouer" apres l'animation
  - [ ] Test : le store `revealed` passe a `true` apres l'animation
- [ ] Fichier : `tests/engine.test.js`
  - [ ] Test : `revealProjection` est une fonction exportee
  - [ ] Test : un delta de 0 ne declenche pas d'animation
  - [ ] Test : la graduation choisit les bons parametres spring selon le delta (1, 2, 3+)
  - [ ] Test : La Rochelle est animee en dernier
  - [ ] Test : `prefers-reduced-motion` desactive les spring animations
  - [ ] Test : `resetProjection` remet les elements a leur position initiale

## Dev Notes

### Spike Motion v12 (resultats retro Epic 2)

Imports valides :
```js
import { animate } from 'motion/mini'
import { spring } from 'motion'
```

API spring :
```js
animate(element, { transform: 'translateY(96px)' }, { type: spring, stiffness: 200, damping: 20 })
```

Stagger : `stagger(0.03)` ou boucle manuelle avec `setTimeout` / delai incremental. Pour la graduation par equipe, la boucle manuelle est preferable (chaque equipe a sa propre config spring).

Orchestration : `await animate(...).finished` pour chainer.

Gotcha : animer element par element (pas en groupe) pour la graduation. Ajouter `will-change: transform, opacity` en CSS pendant l'animation, retirer apres.

### Calcul du translateY

Le delta est `projectedRank - currentRank`. La hauteur d'une ligne rank-row se mesure via `getBoundingClientRect().height` sur le premier `.w-rank-row`. Le translateY est `delta * rowHeight`.

**Attention aux frontieres de zones** : les zones (sections DOM) sont des conteneurs separes. Le translateY doit etre calcule par rapport a la position absolue de chaque rank-row dans la page, pas par rapport a son conteneur de zone. Il faudra peut-etre travailler avec `offsetTop` ou `getBoundingClientRect().top` pour calculer les positions cibles.

### Store keys utilisees

- `season` : donnees de saison, `teams[]` avec `currentRank` et `projectedRank`
- `revealed` : boolean, `true` apres le premier reveal, `false` apres reset
- `dataFresh` : lu par le badge (story 2-5), le reveal met `dataFresh` a `false` (le badge disparait au reveal)

### Conventions a respecter

| Convention | Valeur |
|---|---|
| Fichier JS bouton | `src/components/reveal-button.js` |
| Fichier CSS bouton | `src/styles/components/reveal-button.css` |
| Fichier JS moteur | `src/animation/engine.js` |
| Classes CSS | `w-reveal-button`, `w-reveal-button--animating`, `w-reveal-button--replay`, `w-rank-row--glow` |
| Export bouton | `render(container)` |
| Export moteur | `revealProjection(elements, teams)`, `resetProjection(elements, teams)` |
| Communication | Via store uniquement (`set('revealed', true/false)`) |
| Animations | `transform` et `opacity` uniquement (GPU compositing) |
| Reduced motion | `matchMedia('(prefers-reduced-motion: reduce)')` — positions directes, pas de spring |

### Anti-patterns a eviter

- Ne PAS animer `width`, `height`, `top`, `left` — uniquement `transform` et `opacity`
- Ne PAS utiliser `setTimeout` pour la duree d'animation — utiliser `await animate(...).finished`
- Ne PAS coupler le bouton au classement autrement que via le store et `engine.js`
- Ne PAS gerer le stagger avec un setInterval — utiliser des delais incrementaux
- Ne PAS oublier de retirer `will-change` et `w-rank-row--glow` apres l'animation (memory leak GPU)

### Complexite du translateY inter-zones

Les equipes sont dans des `<section>` differentes (zones). Quand une equipe passe de la zone "Ventre mou" a "Phases finales", le translateY doit traverser les frontieres DOM. Deux approches possibles :

1. **Position absolue** : calculer `getBoundingClientRect().top` de chaque rank-row, puis calculer le offset cible en trouvant la position de la rank-row qui occupe actuellement le rang projete. Le translateY est la difference.
2. **Re-rendu** : ne pas animer le deplacement reel, mais superposer visuellement les mouvements. Les equipes restent dans leur zone DOM mais se deplacent visuellement via transform.

L'approche 1 (positions absolues) est recommandee pour le realisme visuel. Le re-rendu des zones apres animation est optionnel (les equipes sont visuellement a la bonne position grace au transform).

### Project Structure Notes

- Fichiers crees : `src/components/reveal-button.js`, `src/styles/components/reveal-button.css`, `src/animation/engine.js`, `tests/reveal-button.test.js`, `tests/engine.test.js`
- Fichiers modifies : `src/app.js` (import + integration bouton), `src/styles/components/rank-row.css` (classe glow), `src/components/page-layout.js` (slot bouton si necessaire)

---

## Code Review — Story 3-2

**Date** : 2026-03-29
**Revieweur** : Claude Opus 4.6 (bmad-code-review)
**Scope** : `src/animation/engine.js`, `src/components/reveal-button.js`, `src/styles/components/reveal-button.css`, `src/components/rank-row.js`, `src/styles/components/rank-row.css`, `src/app.js`, `tests/engine.test.js`, `tests/reveal-button.test.js`

### Verdict : Approve with minor suggestions

### Findings

#### F1 — [Medium] Erreur non geree dans le click handler laisse le bouton bloque

**Fichier** : `src/components/reveal-button.js`, lignes 89-97
**Risque** : Si `revealProjection()` ou `resetProjection()` lance une exception (erreur Motion, element DOM manquant, etc.), la Promise rejetee n'est jamais catchee. Le bouton reste dans l'etat `disabled` + `aria-busy="true"` indefiniment, rendant la fonctionnalite inutilisable sans recharger la page.

**Correction suggeree** : Ajouter un `.catch()` ou un `try/catch` dans `handleReveal` et `handleReplay` qui appelle `setReplay()` (ou `setDefault()`) en cas d'erreur, pour garantir que le bouton redevient cliquable.

```js
async function handleReveal() {
  // ... existing code ...
  setAnimating()
  try {
    await revealProjection(rankRows, season.teams)
    set('revealed', true)
    set('dataFresh', false)
    setReplay()
  } catch (err) {
    console.error('[Whistle] Reveal animation failed:', err)
    setReplay()
  }
}
```

#### F2 — [Low] `w-reveal-section` sans `aria-label`

**Fichier** : `src/components/page-layout.js`, ligne 11
**Risque** : Toutes les autres `<section>` du layout ont un `aria-label` descriptif, sauf `w-reveal-section`. Les lecteurs d'ecran ne pourront pas identifier cette zone de la page.

**Note** : Ce fichier n'est pas dans le scope direct de cette story (il existait deja), donc ce finding est informatif seulement.

### Points positifs

- Architecture propre : le bouton communique exclusivement via le store, pas de couplage direct avec le classement
- Le moteur d'animation gere correctement le cas cross-zone avec `getBoundingClientRect()` pour les positions absolues
- La graduation des springs (delta 1/2/3+) est bien implementee et testee
- Le stagger avec La Rochelle en dernier (+100ms) respecte fidelement le spec UX
- `prefers-reduced-motion` est gere a la fois en JS (engine) et en CSS (bouton + glow)
- `will-change` est ajoute avant l'animation et retire apres — bonne pratique GPU
- Les tests couvrent les cas principaux avec des mocks bien structures pour l'engine

### Verification des Criteres d'Acceptation

| AC | Statut | Commentaire |
|----|--------|-------------|
| AC1 — Bouton visible, gradient, glow | PASS | |
| AC2 — Scale 0.97 au press | PASS | Retour via CSS transition |
| AC3 — Animation spring translateY, store revealed | PASS | |
| AC4 — Stagger 30ms, La Rochelle +100ms | PASS | |
| AC5 — Graduation delta 1/2/3+ | PASS | |
| AC6 — Bouton disabled + aria-busy pendant animation | PASS | |
| AC7 — Texte "Rejouer", replay reset + relance | PASS | |
| AC8 — prefers-reduced-motion : positions directes | PASS | |
| AC9 — type="button", aria-busy, focus clavier | PASS | |
