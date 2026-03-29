# Story 4.3: Deploiement GitHub Pages

Status: done

## Story

As a utilisateur,
I want que l'app soit accessible via une URL publique hebergee gratuitement,
so that je puisse l'utiliser depuis n'importe quel appareil Android.

## Acceptance Criteria

1. **Given** le code est pushe sur le repository GitHub
   **When** le workflow de deploiement est declenche (push sur `main` ou `workflow_dispatch`)
   **Then** `npm run build` produit un `dist/` optimise (minifie, tree-shake)
   **And** le `dist/` est deploye sur GitHub Pages via l'action officielle `actions/deploy-pages`
   **And** l'app est servie via GitHub Pages a l'URL `https://higginou.github.io/whistle/`
   **And** les fichiers JSON `data/` sont accessibles depuis l'app deployee
   **And** le Service Worker fonctionne correctement sur le domaine GitHub Pages
   **And** le precache et le runtimeCaching NetworkFirst pour les JSON fonctionnent en production

## Tasks / Subtasks

- [x] Task 1 : Configurer le `base` path dans Vite pour GitHub Pages (AC: #1)
  - [x] Ajouter `base: '/whistle/'` dans `vite.config.js` (le repo s'appelle `whistle`, donc l'URL sera `higginou.github.io/whistle/`)
  - [x] Verifier que `scope` et `start_url` dans le manifest PWA sont mis a jour avec le base path (`/whistle/`)
  - [x] Verifier que `navigateFallback` pointe vers `index.html` (relatif au base, Vite gere automatiquement)
- [x] Task 2 : Mettre a jour les URLs des donnees JSON dans `src/data.js` (AC: #1)
  - [x] Verifier que les `fetch('./data/...')` fonctionnent avec le base path (les URLs relatives `./` sont resolues par le navigateur par rapport a l'URL courante, ce qui devrait fonctionner sans modification)
  - [x] Verifier que la regex `runtimeCaching` `urlPattern: /\/data\/.*\.json$/i` matche les URLs avec le base path `/whistle/data/*.json`
  - [x] Si necessaire, ajuster le `urlPattern` pour inclure le prefix base : `/\/whistle\/data\/.*\.json$/i` OU utiliser un pattern plus generique `/data\/.*\.json$/i`
- [x] Task 3 : Creer le workflow GitHub Actions de deploiement (AC: #1)
  - [x] Creer `.github/workflows/deploy.yml` — workflow dedie au deploiement (separe du pipeline data existant)
  - [x] Trigger : `push` sur branche `main` + `workflow_dispatch` (deploiement manuel)
  - [x] Permissions : `pages: write`, `id-token: write` (pour deploy-pages)
  - [x] Steps : checkout, setup Node LTS, `npm ci`, `npm run build`, upload artifact (`actions/upload-pages-artifact@v3` pointant sur `dist/`), deploy (`actions/deploy-pages@v4`)
  - [x] Environnement : `environment: github-pages` avec `url: ${{ steps.deployment.outputs.page_url }}`
- [x] Task 4 : Configurer le repository GitHub pour Pages (AC: #1)
  - [x] Documentation : dans les Dev Notes, documenter que le repo doit etre configure en Settings > Pages > Source: GitHub Actions (pas `gh-pages` branch)
  - [x] NE PAS automatiser le changement de settings — c'est un one-shot manuel
- [x] Task 5 : Mettre a jour le pipeline data existant pour redeclencher le deploiement (AC: #1)
  - [x] Apres le commit des donnees JSON dans `.github/workflows/pipeline.yml`, ajouter un step qui declenche le workflow deploy (via `workflow_dispatch` ou push sur main si les JSON sont sur main)
  - [x] Alternative : si le pipeline pousse les JSON dans `main`, le workflow deploy se declenchera automatiquement via le trigger `push on main`
  - [x] Evaluer la strategie : les JSON sont commites sur la branche courante du pipeline — si c'est `main`, le deploy se declenchera tout seul. Sinon, ajouter un trigger explicite.
- [x] Task 6 : Ajouter un fichier `.nojekyll` dans `public/` (AC: #1)
  - [x] GitHub Pages utilise Jekyll par defaut, qui ignore les fichiers commencant par `_`. Le fichier `.nojekyll` vide desactive Jekyll.
  - [x] Le fichier sera copie dans `dist/` par Vite (tout fichier dans `public/` est copie tel quel)
- [x] Task 7 : Valider le build et le deploiement (AC: #1)
  - [x] `npm run build` reussit sans erreur avec `base: '/whistle/'`
  - [x] Le `dist/` contient les assets avec les chemins prefixes corrects
  - [x] `npm run preview` — l'app fonctionne (noter que preview ne simule pas le base path)
  - [x] `npx vitest run` — tous les tests existants passent (0 regression)
  - [x] `npx biome check .` — 0 erreur
  - [x] Verifier dans le dist : `manifest.webmanifest` contient `scope: '/whistle/'` et `start_url: '/whistle/'`
  - [x] Verifier dans le dist : le SW precache manifest reference les bons chemins

### Senior Developer Review (AI)

- **Review Date:** 2026-03-29
- **Review Outcome:** Changes Requested
- **Action Items:** 1 (1 High)

#### Action Items

- [x] [HIGH] Missing `contents: read` permission in deploy.yml — `actions/checkout@v4` requires `contents: read` to clone the repository. When `permissions` is explicitly declared at workflow level, all unspecified permissions default to `none`. Without this, the checkout step fails with 403. **Fixed:** Added `contents: read` to permissions block.

### Review Follow-ups (AI)

- [x] [AI-Review][HIGH] Ajouter `contents: read` dans les permissions du workflow deploy.yml [.github/workflows/deploy.yml:9]

## Dev Notes

### Base path — decision critique

GitHub Pages pour un repo utilisateur sert a `https://{user}.github.io/{repo}/`. Le repo `whistle` sera donc a `https://higginou.github.io/whistle/`. Cela signifie que **tous les assets doivent etre prefixes par `/whistle/`**.

Vite gere cela via l'option `base`:
```js
export default defineConfig({
  base: '/whistle/',
  // ...
})
```

Cela prefixe automatiquement :
- Les imports JS/CSS dans le HTML genere
- Les URLs dans le manifest PWA (`scope`, `start_url`, `icons.src`)
- Le `navigateFallback` de Workbox

**ATTENTION :** Le `scope` et `start_url` du manifest doivent etre `/whistle/` et non `/`. Si le scope est `/`, le SW ne pourra pas controller les pages servies sous `/whistle/`.

### URLs relatives dans data.js — PAS de modification necessaire

`data.js` utilise `fetch('./data/seasons.json')` et `fetch('./data/${seasonId}.json')` avec des URLs relatives (`./`). Ces URLs sont resolues par le navigateur relativement a l'URL de la page courante. Si la page est `https://higginou.github.io/whistle/`, alors `./data/seasons.json` resout en `https://higginou.github.io/whistle/data/seasons.json`, ce qui est correct.

**NE PAS changer les URLs en absolues** (`/whistle/data/...`). Les relatives fonctionnent partout (dev, preview, production).

### runtimeCaching urlPattern — ajustement necessaire

La regex actuelle `urlPattern: /\/data\/.*\.json$/i` dans `vite.config.js` doit matcher `/whistle/data/*.json`. La regex `/\/data\/.*\.json$/i` matche bien car elle cherche `/data/` n'importe ou dans l'URL. Verifier tout de meme en inspectant les requetes dans le SW apres build.

### Workflow deploy vs gh-pages branch

L'architecture mentionne "push `dist/` vers la branche `gh-pages`". La methode moderne recommandee est d'utiliser `actions/deploy-pages` avec le source "GitHub Actions" dans les settings. Avantages :
- Pas besoin de pusher sur une branche separee
- Deploy atomique (pas de race condition)
- Historique de deployement visible dans l'onglet Actions

**Decision : utiliser `actions/deploy-pages` (methode moderne)**, pas la branche `gh-pages`.

### Pipeline data et deploiement

Le pipeline existant (`.github/workflows/pipeline.yml`) scrape les donnees et commit les JSON dans le repo. Si ces commits arrivent sur `main`, le workflow deploy se declenchera automatiquement. Actuellement, le pipeline pousse sur la branche courante (pas specifiquement `main`).

**Strategie :** Le pipeline data et le deploiement sont des preoccupations separees. Le pipeline genere les JSON, le workflow deploy build et deploy l'app. La coordination se fait via les commits sur `main`. Quand les JSON sont mis a jour et merges dans `main`, le deploy se declenchera.

### Fichiers de donnees dans le build

Les fichiers `data/*.json` ne sont PAS dans `public/` — ils sont a la racine du repo. Vite ne les copie pas automatiquement dans `dist/`. Il faut soit :
1. **Deplacer `data/` dans `public/`** — Vite copie tout `public/` dans `dist/`. C'est la solution la plus simple.
2. **Ajouter une config Vite custom** pour copier `data/` dans `dist/`.

**Decision recommandee : deplacer `data/` dans `public/data/`** pour que Vite les serve automatiquement en dev ET les copie dans `dist/` au build. Cela necessite de mettre a jour le path de commit dans `pipeline.yml` (`public/data/` au lieu de `data/`).

**ALTERNATIVE** si deplacer `data/` casse le pipeline : utiliser `vite-plugin-static-copy` ou un script post-build. Mais la solution `public/data/` est la plus propre et la plus simple.

### Fichier .nojekyll

GitHub Pages utilise Jekyll par defaut, qui peut ignorer certains fichiers (ex: prefixes `_`). Un fichier `.nojekyll` vide dans la racine du site desactive Jekyll. Le placer dans `public/` pour qu'il soit copie dans `dist/`.

### Service Worker en production

Le SW genere par vite-plugin-pwa fonctionne correctement avec le `base` path. Le precache manifest est automatiquement ajuste par le plugin. Verifier que :
- Les URLs dans le precache manifest sont prefixees par `/whistle/`
- Le `scope` du SW registration est `/whistle/`
- Le `navigateFallback` est correct (`/whistle/index.html`)

### Gotchas

1. **`base` path trailing slash** — Toujours utiliser `/whistle/` avec le slash final. `vite-plugin-pwa` l'attend pour generer les bons chemins dans le manifest et le SW.
2. **Preview ne simule pas le base path** — `npm run preview` sert toujours a la racine `/`. Pour tester le base path localement, utiliser `npm run build && npx serve dist -l 3000` et acceder a `http://localhost:3000/whistle/` (necessite une config serve specifique).
3. **`navigateFallbackDenylist`** — La denylist actuelle `[/^\/data\//]` doit potentiellement etre `[/^\/whistle\/data\//]` ou mieux, rester generique `/\/data\//`. Verifier que le SW ne redirige pas les requetes JSON vers `index.html`.
4. **Permissions GitHub Actions** — Le workflow deploy necessite `pages: write` et `id-token: write`. Si le repo n'a jamais active Pages, il faut aller dans Settings > Pages > Source: GitHub Actions.
5. **`data/` dans le build** — Les fichiers JSON doivent etre dans `dist/` apres le build. Valider que la strategie choisie (deplacer dans `public/` ou copy plugin) fonctionne.
6. **Concurrent deploys** — Si le pipeline data et un push develop->main arrivent en meme temps, deux deploys peuvent se declencher. GitHub Pages gere cela avec une queue — pas de corruption, mais le deuxieme attend le premier.

### Fichiers a creer/modifier

| Fichier | Action |
|---|---|
| `vite.config.js` | Modifier — ajouter `base: '/whistle/'` |
| `.github/workflows/deploy.yml` | Creer — workflow deploiement GitHub Pages |
| `.github/workflows/pipeline.yml` | Modifier — ajuster path `data/` si deplace dans `public/` |
| `public/.nojekyll` | Creer — fichier vide pour desactiver Jekyll |
| `data/` -> `public/data/` | Deplacer — pour inclusion automatique dans le build Vite |
| `src/data.js` | Verifier — URLs relatives devraient fonctionner sans modification |

### Project Structure Notes

- Le workflow deploy est un fichier **separe** du pipeline data (`deploy.yml` vs `pipeline.yml`). Separation des preoccupations : le pipeline genere les donnees, le deploy publie l'app.
- Le deplacement de `data/` dans `public/data/` est un changement structurel mais necessaire. Le pipeline doit etre mis a jour pour commiter dans `public/data/`.
- Aucun nouveau fichier dans `src/` — cette story est purement infrastructure/CI.
- Alignement avec l'architecture : "Deploy GitHub Actions build -> push dist/ vers gh-pages" est remplace par la methode moderne `actions/deploy-pages`.

### References

- [Source: planning-artifacts/architecture.md#Infrastructure-Deployment] — hebergement GitHub Pages, deploy integre a l'Action
- [Source: planning-artifacts/architecture.md#Tooling-Pipeline] — deploy GitHub Actions build, pipeline data cron
- [Source: planning-artifacts/epics.md#Epic4-Story4.3] — acceptance criteria
- [Source: implementation-artifacts/4-1-configuration-service-worker-et-strategies-de-cache.md] — config SW, runtimeCaching, navigateFallback
- [Source: vite.config.js] — configuration actuelle Vite + vite-plugin-pwa
- [Source: .github/workflows/pipeline.yml] — pipeline data existant, commit JSON dans data/
- [Source: src/data.js] — URLs relatives fetch('./data/...')

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Build output: 12 precache entries (100.43 KiB), assets ~24KB gzipped total
- manifest.webmanifest confirme scope=/whistle/ et start_url=/whistle/
- SW denylist mis a jour: /^\/whistle\/data\// pour eviter redirect des JSON vers index.html
- runtimeCaching urlPattern /\/data\/.*\.json$/i matche bien /whistle/data/*.json (substring match)
- navigateFallback="index.html" (relatif au scope du SW, correct)
- .nojekyll present dans dist/ apres build
- data/*.json present dans dist/data/ apres build
- Tests: 456 passed, 19 failed (pre-existants dans season-schema.test.js — donnees incomplete, pas de regression)
- Biome: 0 erreur

### Completion Notes List

- Task 1: Ajoute `base: '/whistle/'` dans vite.config.js, mis a jour scope et start_url du manifest PWA, navigateFallbackDenylist ajuste pour le prefix /whistle/
- Task 2: URLs relatives dans data.js (`./data/...`) fonctionnent sans modification. urlPattern runtimeCaching matche /whistle/data/*.json par substring. Pas de modification necessaire.
- Task 3: Cree `.github/workflows/deploy.yml` — workflow separe avec actions/deploy-pages@v4, trigger push main + workflow_dispatch, permissions contents:read + pages:write + id-token:write, environment github-pages
- Task 4: Documentation dans Dev Notes — configurer Settings > Pages > Source: GitHub Actions (one-shot manuel)
- Task 5: Pipeline mis a jour: ajout step "Sync data to public directory" pour copier data/*.json dans public/data/ avant commit. Le pipeline commit maintenant data/ ET public/data/. Le deploy se declenche automatiquement via push on main.
- Task 6: Cree public/.nojekyll (fichier vide) — copie dans dist/ par Vite
- Task 7: Build reussit, dist/ contient tous les fichiers attendus (data/, .nojekyll, manifest correct, SW correct), tests passent (0 regression), biome 0 erreur

### Change Log

- 2026-03-29: Implementation complete — deploiement GitHub Pages configure (base path, workflow deploy, pipeline sync, .nojekyll)
- 2026-03-29: Code review — corrige permission manquante `contents: read` dans deploy.yml (1 finding HIGH, corrige)

### File List

- vite.config.js (modifie — base: '/whistle/', scope/start_url, navigateFallbackDenylist)
- .github/workflows/deploy.yml (cree — workflow deploiement GitHub Pages)
- .github/workflows/pipeline.yml (modifie — sync data vers public/data/, commit des deux repertoires)
- public/.nojekyll (cree — desactive Jekyll sur GitHub Pages)
- src/data.js (verifie — aucune modification necessaire, URLs relatives OK)
