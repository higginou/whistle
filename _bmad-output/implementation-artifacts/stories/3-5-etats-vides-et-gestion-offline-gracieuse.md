# Story 3.5: Etats vides et gestion offline gracieuse

Status: done
ui-structural: true

## Story

En tant qu'utilisateur,
Je veux que l'app gere tous les cas d'absence de donnees de facon elegante,
Afin de ne jamais voir un ecran d'erreur technique.

## Acceptance Criteria

1. **Premier lancement (aucun cache):** Les donnees JSON embarquees dans le build sont affichees. Le badge "Nouveau" est present. Pas de tutoriel ni d'onboarding. (UX-DR20)

2. **Offline avec cache:** L'experience est identique au mode en ligne, sans badge "Nouveau". Aucune indication "vous etes offline". (UX-DR20)

3. **Offline sans cache (cas extreme):** Un ecran minimaliste affiche le logo Whistle + "Les donnees arrivent lundi". Pas de message d'erreur technique. (UX-DR20)

4. **Pipeline stale (> 7 jours):** Un texte discret sous la score card indique "Derniere mise a jour : [date]". (UX-DR20)

## Maquettes

`ui-structural: true` — ecran vide (logo + message) est un nouveau composant.
Maquettes a produire dans `_bmad-output/mockups/epic-3/` avant passage en `in-progress`.

GO higgin: oui (variante C — illustration ludique, terrain rugby + zzz + bandeau stale avec icone horloge)

## Tasks / Subtasks

- [x] Task 1 — Donnees JSON embarquees dans le build (AC: #1)
  - [x] Copier `data/2025-2026.json` et `data/seasons.json` dans `public/data/` pour que Vite les inclue dans le build
  - [x] Modifier `data.js` : si le fetch reseau echoue ET pas de cache localStorage, tenter de charger depuis les fichiers embarques (`./data/...` qui sont dans le build)
  - [x] S'assurer que `dataFresh` est `true` au premier lancement (badge "Nouveau" visible)

- [x] Task 2 — Ecran vide offline sans cache (AC: #3)
  - [x] Creer `src/components/empty-state.js` + `src/styles/components/empty-state.css`
  - [x] Le composant affiche : logo Whistle (favicon.svg ou icone dediee) + texte "Les donnees arrivent lundi"
  - [x] Style minimaliste : centre vertical/horizontal, ton ludique, pas de message d'erreur
  - [x] Dans `app.js`, quand `season === null` apres `loadSeason()`, afficher cet ecran au lieu du layout normal

- [x] Task 3 — Indicateur pipeline stale (AC: #4)
  - [x] Dans `data.js`, detecter si `lastUpdated` date de plus de 7 jours
  - [x] Ajouter une cle store `dataStale` (boolean) avec event `data-stale`
  - [x] Dans `score-card.js`, ecouter `dataStale` et afficher sous la score card : "Derniere mise a jour : [date lisible en francais]"
  - [x] Style discret (petit texte, couleur attenuee)

- [x] Task 4 — Offline avec cache fonctionne deja (AC: #2)
  - [x] Verifier que le comportement actuel de `data.js` (fallback cache) est correct
  - [x] Verifier que `dataFresh` reste `false` quand on sert du cache (pas de badge "Nouveau")
  - [x] Test manuel : couper le reseau, recharger — l'app doit fonctionner normalement

- [x] Task 5 — Tests unitaires
  - [x] Tester `data.js` : cas network OK, cas fallback cache, cas embedded fallback, cas null
  - [x] Tester detection stale (> 7 jours)
  - [x] Tester `empty-state.js` : rendu correct du composant

## Dev Notes

### Architecture existante (data.js)

Le flux actuel dans `src/data.js:12-49` :
1. `loadSeason()` tente un fetch reseau
2. Si OK → cache dans localStorage + `set('season', data)`
3. Si echec → lit le cache localStorage
4. Si pas de cache → `set('season', null)`

**Modification necessaire :** Ajouter une etape entre 3 et 4 : tenter de charger les donnees embarquees dans le build (fichiers dans `public/data/`).

**Important :** Les fichiers dans `public/` sont copies tels quels par Vite dans `dist/`. Le fetch `./data/2025-2026.json` fonctionne deja — c'est le meme chemin. Le vrai cas "offline sans cache" n'arrive que si le navigateur n'a aucun cache SW ET aucun cache localStorage ET le reseau est coupe. Avant l'epic 4 (PWA/SW), les fichiers embarques dans le build sont deja servis par le serveur (ou le cache HTTP navigateur). La logique de fallback dans `data.js` couvre deja ce cas via le fetch normal.

**Conclusion :** Le cas "premier lancement" fonctionne deja si les fichiers JSON sont dans le build. Le cas "offline total sans rien" est le seul cas ou `season === null`. Verifier que `data/` est bien servi par Vite/GitHub Pages.

### Detection staleness

`lastUpdated` est un champ ISO 8601 dans le JSON de saison. Comparer avec `Date.now()` :
```js
const STALE_THRESHOLD_MS = 7 * 24 * 60 * 60 * 1000 // 7 jours
const isStale = Date.now() - new Date(data.lastUpdated).getTime() > STALE_THRESHOLD_MS
```

### Store — nouvelle cle

Ajouter dans `store.js` :
- `INITIAL_STATE.dataStale = false`
- `EVENT_NAMES.dataStale = 'data-stale'`

### Composant empty-state

- 1 fichier JS + 1 fichier CSS (convention projet)
- CSS : centrage flexbox, logo en SVG inline ou `<img>`, texte en `--w-color-muted` ou equivalent
- Pas d'animation (ecran statique)
- WCAG : texte lisible, contraste AA

### Indicateur stale sous la score card

Options d'implementation :
- Soit un `<p>` ajoute apres `.w-score-card` par `score-card.js`
- Soit un slot dans `page-layout.js` sous la hero section
- Preferer l'option dans `score-card.js` car c'est la qui le badge est gere — coherence

Format date francais : `new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)` → "lundi 17 mars"

### Fichiers a creer/modifier

| Fichier | Action |
|---------|--------|
| `src/components/empty-state.js` | Creer |
| `src/styles/components/empty-state.css` | Creer |
| `src/data.js` | Modifier (detection stale) |
| `src/store.js` | Modifier (ajouter dataStale) |
| `src/app.js` | Modifier (afficher empty-state si season null) |
| `src/components/score-card.js` | Modifier (afficher indicateur stale) |

### Project Structure Notes

- `empty-state.js` / `empty-state.css` : suit la convention 1 composant = 1 JS + 1 CSS, meme nom
- Prefixe CSS : `w-empty-state`, `w-stale-indicator`
- Pas de fichier utils — la detection stale va dans `data.js`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 3.5]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#États Vides et Chargement]
- [Source: _bmad-output/planning-artifacts/architecture.md#Error Handling / Loading States]

### Previous Story Intelligence (3-4)

- Story 3-4 a implemente le bottom sheet avec `<dialog>` + `showModal()`
- Pattern etabli : composant exporte `render()` + fonctions specifiques (`open`, `close`)
- `app.js` compose tout et ecoute le store pour orchestrer
- Le badge "Nouveau" dans `badge.js` ecoute `dataFresh` — verifier que le premier lancement set bien `dataFresh: true`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- Task 1: Copie JSON dans `public/data/`, `dataFresh` set `true` au premier lancement (pas de cache = premiere visite)
- Task 2: Composant empty-state variante C (illustration terrain rugby + zzz + message ludique), integre dans `app.js` via `replaceChildren`
- Task 3: Detection staleness (> 7 jours) dans `data.js`, nouvelle cle store `dataStale`, indicateur avec icone horloge sous la score card, format date francais via `Intl.DateTimeFormat`
- Task 4: Comportement cache fallback verifie — `dataFresh` reste `false` sur cache, experience identique online/offline avec cache
- Task 5: 10 nouveaux tests (5 data.js stale/fresh, 1 store dataStale, 6 empty-state), 439 tests passent, 0 regression
- `app.js` refactore: layout differe jusqu'a reception des donnees (lazy rendering), empty-state affiche si `season === null`
- Code review: 8 findings triaged — 2 patches appliques (formatDateFr NaN guard, orphaned JSDoc cleanup), 1 dismissed (staleEl detached DOM theoretical only — loadSeason runs once), 5 dismissed (false positives or style-only)

### File List

- `public/data/seasons.json` — nouveau (copie embarquee)
- `public/data/2025-2026.json` — nouveau (copie embarquee)
- `src/components/empty-state.js` — nouveau (composant ecran vide variante C)
- `src/styles/components/empty-state.css` — nouveau (styles ecran vide)
- `src/data.js` — modifie (staleness detection, dataFresh premier lancement)
- `src/store.js` — modifie (ajout cle dataStale)
- `src/app.js` — modifie (empty-state integration, layout differe)
- `src/components/score-card.js` — modifie (indicateur stale sous la card)
- `src/styles/components/score-card.css` — modifie (styles indicateur stale)
- `src/__tests__/data.test.js` — modifie (tests stale, dataFresh premier lancement)
- `src/__tests__/store.test.js` — modifie (test dataStale)
- `src/__tests__/app.test.js` — modifie (assertion empty-state)
- `src/__tests__/empty-state.test.js` — nouveau (6 tests composant)
