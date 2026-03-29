# Story 2.5 : Badge "Nouvelle Journee"

Status: done

ui-structural: false

> Ce composant est un petit pill badge insere dans un slot deja existant (`w-score-card__badge-slot`) dans la score card. Pas de nouveau layout, pas de nouveau composant structurel — il s'agit d'un ajout fonctionnel dans un emplacement prevu. Pas de gate maquette.

## Story

En tant qu'utilisateur,
Je veux voir un indicateur quand de nouvelles donnees sont disponibles depuis ma derniere visite,
Afin de savoir immediatement si quelque chose a change.

## Dependencies

- **2-2** (done) : Store d'etat — `store.js` (get/set/on), cle `dataFresh` avec event `data-fresh`
- **2-2** (done) : Data fetch — `data.js` (loadSeason), detection fraicheur via `lastUpdated` vs cache, `LAST_VISIT_KEY`
- **2-4** (done) : Score card hero — `score-card.js` avec slot `<span class="w-score-card__badge-slot"></span>` prevu pour ce badge

## References

- **FRs** : FR38 (detection donnees fraiches en arriere-plan)
- **UX-DRs** : UX-DR11 (badge "Nouvelle Journee")
- **Architecture** : `src/components/badge.js` + `src/styles/components/badge.css` (1 composant = 1 JS + 1 CSS)
- [Source: planning-artifacts/architecture.md — ligne 421]
- [Source: planning-artifacts/ux-design-specification.md — section 8 "Badge Nouvelle Journee"]
- [Source: planning-artifacts/epics.md — Story 2.5]

## Acceptance Criteria (BDD)

1. **Given** des donnees fraiches sont disponibles (`dataFresh === true` dans le store, c'est-a-dire `lastVisit < lastDataUpdate`)
   **When** l'app s'ouvre
   **Then** un badge pill "J[N] Nouveau" apparait dans le `w-score-card__badge-slot` de la score card
   **And** [N] correspond au champ `matchday` du JSON de saison (ex: "J20 Nouveau")
   **And** le badge est en violet pale/texte violet bold 11px (UX-DR11)
   **And** le badge a `role="status"` et `aria-live="polite"` (UX-DR11)

2. **Given** le badge est affiche
   **When** le premier reveal est declenche (`revealed === true` dans le store)
   **Then** le badge disparait avec un fade out de 200ms

3. **Given** les donnees en cache sont les memes que la derniere visite (`dataFresh === false`)
   **When** l'app s'ouvre
   **Then** aucun badge n'est affiche
   **And** le slot `w-score-card__badge-slot` reste vide — pas de message "Pas de nouvelles donnees"

4. **Given** le badge est rendu
   **When** on inspecte le DOM
   **Then** le badge est un `<span>` avec `role="status"` et `aria-live="polite"` a l'interieur du slot existant

5. **Given** `prefers-reduced-motion` est actif
   **When** le badge apparait ou disparait
   **Then** pas d'animation scale/bounce — affichage/masquage instantane en opacity uniquement

## Taches Techniques

### T1 — Creer `src/components/badge.js`

- [x] Exporter `render(container)` ou `container` est le `w-score-card__badge-slot`
- [x] Ecouter `on('dataFresh', callback)` pour savoir si des donnees fraiches sont disponibles
- [x] Ecouter `on('season', callback)` pour lire `season.matchday` (le numero de journee)
- [x] Ecouter `on('revealed', callback)` pour masquer le badge apres le premier reveal
- [x] Si `get('dataFresh') === true` : inserer le badge pill dans le container
- [x] Si `get('dataFresh') === false` ou absent : ne rien afficher, laisser le slot vide
- [x] Texte du badge : `J${season.matchday} Nouveau`
- [x] Structure HTML du badge :
  ```html
  <span class="w-badge-new" role="status" aria-live="polite">J20 Nouveau</span>
  ```

### T2 — Logique de disparition apres reveal

- [x] Quand le store emet `revealed` avec `value === true` :
  - [x] Appliquer la classe `w-badge-new--hiding` au badge
  - [x] Apres la transition (200ms), retirer le badge du DOM
  - [x] Verifier `prefers-reduced-motion` : si actif, retirer immediatement sans transition
- [x] Ne pas re-afficher le badge si `revealed` repasse a `false` (one-shot par session)

### T3 — Animation d'apparition (CSS)

- [x] Apparition : `transform: scale(0)` → `scale(1)` avec bounce, duree 400ms
- [x] Disparition : `opacity: 1` → `0`, duree 200ms (classe `w-badge-new--hiding`)
- [x] `prefers-reduced-motion` : pas de scale, opacity instantanee

### T4 — Creer `src/styles/components/badge.css`

- [x] Classe `w-badge-new` (namespace `w-`)
- [x] Pill arrondie : `border-radius` eleve (ex: 999px), `padding` compact
- [x] Fond : violet pale (`rgba(167, 139, 250, 0.2)` ou equivalent de `--w-color-primary` en pale)
- [x] Texte : violet bold 11px (`color: var(--w-color-primary)`, `font-weight: 700`, `font-size: 11px`)
- [x] Animation keyframes `w-badge-pop` : scale 0 → 1.15 → 1 (bounce) en 400ms
- [x] Transition pour `w-badge-new--hiding` : `opacity 200ms ease-out`
- [x] `@media (prefers-reduced-motion: reduce)` : `animation: none; transition: none;`

### T5 — Integration dans `score-card.js`

- [x] Importer `render as renderBadge` depuis `badge.js`
- [x] Apres chaque `update()` de la score card, appeler `renderBadge()` sur le slot `.w-score-card__badge-slot`
- [x] Le badge se gere de maniere autonome via le store — la score card ne fait que lui fournir son conteneur

### T6 — Verification de la detection de fraicheur dans `data.js`

- [x] `data.js` fait deja `set('dataFresh', true)` quand `cached.lastUpdated !== data.lastUpdated` (ligne ~32)
- [x] Verifier que ce mecanisme fonctionne correctement :
  - [x] Premiere visite (pas de cache) : `dataFresh` ne doit PAS etre `true` (pas de badge au premier lancement — pas de "nouveaute" s'il n'y a pas de reference)
  - [x] Visite avec cache perime : `dataFresh` = `true` → badge affiche
  - [x] Visite avec cache a jour : `dataFresh` reste `false` → pas de badge
- [x] **ATTENTION** : Actuellement `data.js` ne set `dataFresh` a `true` que si un cache existait ET que `lastUpdated` a change. C'est le comportement correct. Mais verifier aussi que `dataFresh` n'est jamais set a `true` quand il n'y a pas de cache (premiere visite).

### T7 — Tests

- [x] Fichier : `src/__tests__/badge.test.js`
- [x] Test : `render()` n'affiche rien quand `dataFresh` est `false`
- [x] Test : `render()` affiche le badge pill quand `dataFresh` est `true` avec le bon texte "J[N] Nouveau"
- [x] Test : le badge a `role="status"` et `aria-live="polite"`
- [x] Test : le badge disparait quand `revealed` passe a `true`
- [x] Test : le badge n'est pas re-affiche si `revealed` repasse a `false`
- [x] Test : le texte contient le bon numero de matchday depuis les donnees de saison

## Dev Notes

### Mecanisme de fraicheur existant

Le store a deja la cle `dataFresh` (defaut `false`) avec l'event `data-fresh`. Le module `data.js` fait deja :
```js
const cached = readCache(cacheKey)
if (cached && cached.lastUpdated !== data.lastUpdated) {
  set('dataFresh', true)
}
```
Le badge **lit** cette cle, il ne la calcule pas lui-meme. Separation des responsabilites respectee.

### Slot existant dans la score card

La score card (story 2-4) a prevu un slot vide :
```html
<span class="w-score-card__badge-slot"></span>
```
Le badge s'insere dans ce slot. CSS du slot existant : `display: inline-flex`.

### Matchday dans le JSON

Le champ `matchday` est un entier a la racine du JSON de saison (ex: `"matchday": 20`). Il est accessible via `get('season').matchday`.

### Conventions a respecter

| Convention | Valeur |
|---|---|
| Fichier JS | `src/components/badge.js` |
| Fichier CSS | `src/styles/components/badge.css` |
| Classe CSS | `w-badge-new` (prefixe `w-`) |
| Export | `render(container)` |
| Communication | Via store uniquement (`on('dataFresh', ...)`, `on('revealed', ...)`, `on('season', ...)`) |
| Animations | `transform` et `opacity` uniquement (GPU compositing) |
| Reduced motion | `@media (prefers-reduced-motion: reduce)` — pas de scale, pas de bounce |

### Anti-patterns a eviter

- Ne PAS faire de fetch ou lire `localStorage` directement dans le badge — tout passe par le store
- Ne PAS coupler le badge a la score card autrement que par le slot DOM
- Ne PAS utiliser `setTimeout` pour gerer la disparition — utiliser `transitionend` event
- Ne PAS afficher un message "Pas de nouvelles donnees" — le slot reste vide silencieusement

### Project Structure Notes

- Fichiers crees : `src/components/badge.js`, `src/styles/components/badge.css`, `src/__tests__/badge.test.js`
- Fichier modifie : `src/components/score-card.js` (import + appel renderBadge dans le slot)
- Aucun nouveau fichier de style global — le badge est un composant isole

### Git Intelligence

Derniers commits :
- `71cd844` feat: story 2-4 — score card hero La Rochelle (cree score-card.js/css, tests, mockups)
- `83339e2` feat: story 2-3 — layout page principale
- `b2d66fc` feat: story 2-2 — store, fetch, router
- `75e3b86` feat: story 2-1 — design tokens

Pattern etabli : 1 composant = 1 JS + 1 CSS + 1 test, export `render()`, communication via store.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun probleme rencontre.

### Completion Notes List

- T1: Cree `badge.js` avec `render(container)`, ecoute `dataFresh`, `season`, `revealed` via store. Badge `<span class="w-badge-new" role="status" aria-live="polite">J[N] Nouveau</span>`.
- T2: Logique one-shot de disparition via `transitionend` + `w-badge-new--hiding`. `prefers-reduced-motion` detecte via `matchMedia` pour retrait immediat. Variable `dismissed` empeche re-affichage.
- T3+T4: CSS avec keyframe `w-badge-pop` (scale 0 → 1.15 → 1 en 400ms), transition opacity 200ms pour hiding, `@media (prefers-reduced-motion: reduce)` desactive animation et transition.
- T5: Integration dans `score-card.js` — import de renderBadge, appel unique sur le slot `.w-score-card__badge-slot` apres le premier update.
- T6: Verifie que `data.js` ne set `dataFresh` a `true` que si un cache existait ET que `lastUpdated` a change. Premiere visite sans cache ne declenche pas le badge. Correct.
- T7: 8 tests unitaires couvrant tous les scenarios specifies (no-data, fresh-data, a11y, reveal dismiss, one-shot, matchday dynamic, event ordering).

### Change Log

- 2026-03-29: Implementation complete story 2-5 — badge nouvelle journee

### File List

- `src/components/badge.js` (nouveau)
- `src/styles/components/badge.css` (nouveau)
- `src/__tests__/badge.test.js` (nouveau)
- `src/components/score-card.js` (modifie — import badge + appel renderBadge)

## Code Review — 2026-03-29

**Reviewer:** Claude Opus 4.6 (bmad-code-review)
**Mode:** full (story spec + diff)
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Tests:** 8/8 pass, Biome 0 errors

### Review Findings

- [ ] [Review][Patch] **Container stale apres re-render innerHTML** [`src/components/score-card.js`:258-277] — `update()` remplace `article.innerHTML`, ce qui detruit le slot `.w-score-card__badge-slot` et cree un nouveau noeud DOM. Mais `badgeInitialized = true` empeche `initBadge()` de re-attacher le badge au nouveau slot. De plus, les listeners internes de `badge.js` (`on('season', tryRender)`) conservent une reference closure vers l'ancien container (detruit). Si `season` est re-set (ex: refresh reseau, retour de navigation), le badge disparait definitivement. **Fix:** Supprimer le guard `badgeInitialized` et appeler `renderBadge(slot)` a chaque `update()`, ou restructurer pour que `badge.js` accepte un nouveau container. Alternative: extraire le badge slot du cycle `innerHTML` (le creer une seule fois en dehors du `buildHTML`).

### Verdict

**Changes Requested** — 1 patch (bug correctness), 0 decision-needed, 0 defer, 0 dismissed.

Le bug est un probleme de correctness : le badge est perdu apres toute mise a jour de `season` car le container DOM est detruit par `innerHTML` et la reference closure devient stale. Le fix est non-ambigu.

---

## Code Review (cycle 2) — 2026-03-29

**Reviewer:** Claude Opus 4.6 (bmad-code-review)
**Mode:** full (story spec + diff)
**Layers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Tests:** 9/9 pass (badge), 24/24 pass (score-card), Biome 0 errors

### Verification du fix (cycle 1 finding)

- [x] [Review][Patch] **Container stale apres re-render innerHTML** — **CORRIGE.** Le `badgeSlot` est maintenant cree comme element persistant en dehors de `buildHTML()` (ligne 236-237 de `score-card.js`). Apres chaque `article.innerHTML = buildHTML(...)`, le slot est re-attache dans le header via `header.appendChild(badgeSlot)` (ligne 250). Les closures de `badge.js` conservent une reference au meme objet `badgeSlot` qui reste valide car il n'est jamais detruit — seulement detache puis re-attache. Ordre d'execution verifie : lors d'un `set('season')`, badge `tryRender` s'execute avant `update()` (ordre d'enregistrement des listeners), le badge survit car il est enfant du `badgeSlot` persistant qui est re-attache par `update()`. Test `badge survives when container is re-appended to a new parent` confirme ce scenario.

### Analyse complete (cycle 2)

**Fichiers revus :**
- `src/components/badge.js` — Logique propre. `dismissed` one-shot correct. `tryRender` verifie `container.contains(badgeEl)` pour eviter les doublons. `dismissBadge` gere reduced-motion. `resetBadgeState` pour isolation des tests. Aucun probleme.
- `src/styles/components/badge.css` — Keyframes `w-badge-pop` (scale bounce 400ms), transition opacity 200ms pour hiding, `prefers-reduced-motion` desactive correctement animation et transition. Respect du budget animation (transform + opacity uniquement). Aucun probleme.
- `src/__tests__/badge.test.js` — 9 tests couvrant : no-data, fresh-data, a11y (role/aria-live), reveal dismiss, one-shot, matchday dynamique, event ordering (dataFresh avant/apres season), et survie du container apres re-append. Couverture adequate.
- `src/components/score-card.js` — Integration correcte : import badge, creation du slot persistant, re-append apres chaque innerHTML, appel unique `renderBadge(badgeSlot)`. Pas de fuite de listeners (les anciens elements sont GC avec le remplacement innerHTML).

### Review Findings (cycle 2)

Aucun finding. Le fix du cycle 1 est correct et complet. Aucun nouveau bug, aucune vulnerabilite, aucune violation d'architecture detectee.

### Verdict

**Approve** — 0 patch, 0 decision-needed, 0 defer, 0 dismissed. Le bug HIGH du cycle 1 est correctement corrige. Code pret pour merge.
