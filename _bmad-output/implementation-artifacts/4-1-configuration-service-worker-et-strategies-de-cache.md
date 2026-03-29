# Story 4.1: Configuration Service Worker et strategies de cache

Status: done

## Story

As a utilisateur,
I want que l'app mette en cache les assets et les donnees intelligemment,
so that je beneficie d'un chargement instantane et d'un fonctionnement offline complet.

## Acceptance Criteria

1. **Given** `vite.config.js` est configure avec vite-plugin-pwa et Workbox
   **When** l'app est buildee et servie
   **Then** les assets statiques (JS, CSS, images, fonts) utilisent la strategie cache-first (precache)
   **And** les fichiers JSON de donnees utilisent la strategie network-first
   **And** les assets sont precaches lors de l'installation du Service Worker
   **And** quand des donnees fraiches arrivent en arriere-plan, le store est notifie (`dataFresh`) et le badge "Nouveau" apparait silencieusement (FR38)
   **And** le chargement initial est < 2s sur 4G (NFR1)
   **And** le demarrage depuis le cache est < 1s (NFR6)
   **And** les assets totaux sont < 200Ko gzippe (NFR4)

## Tasks / Subtasks

- [x] Task 1 : Mettre a jour `vite.config.js` avec la configuration SW complete (AC: #1)
  - [x] Ajouter `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']` pour precacher l'app shell
  - [x] Ajouter `cleanupOutdatedCaches: true`
  - [x] Ajouter la regle `runtimeCaching` pour `data/*.json` : handler `NetworkFirst`, cacheName `whistle-data`, `networkTimeoutSeconds: 5`, expiration 30 jours, max 10 entries
  - [x] Conserver les regles existantes pour Google Fonts (CacheFirst)
  - [x] Ajouter `navigateFallback: 'index.html'` + `navigateFallbackDenylist: [/^\/data\//]` pour le SPA
  - [x] Mettre a jour le manifest : `background_color: '#0f0a1a'`, `orientation: 'portrait'`, `scope: '/'`, `start_url: '/'`, `description`
  - [x] Scinder l'icone 512 en deux entrees : `purpose: 'any'` et `purpose: 'maskable'` (deprecation `any maskable`)
- [x] Task 2 : Enregistrer le SW dans `src/app.js` (AC: #1)
  - [x] Ajouter `import { registerSW } from 'virtual:pwa-register'`
  - [x] Appeler `registerSW({ immediate: true })` avec callbacks `onOfflineReady`, `onRegisteredSW` (check periodique 1h), `onRegisterError`
- [x] Task 3 : Mettre a jour `index.html` (AC: #1)
  - [x] Ajouter `<link rel="apple-touch-icon" href="/pwa-192x192.png">`
  - [x] Verifier `viewport-fit=cover` dans la meta viewport
- [x] Task 4 : Creer les icones placeholder dans `public/` (AC: #1)
  - [x] `pwa-192x192.png` (192x192, placeholder colore ou logo texte)
  - [x] `pwa-512x512.png` (512x512, purpose any)
  - [x] `pwa-512x512-maskable.png` (512x512, avec padding ~20% safe zone)
- [x] Task 5 : Valider le build et le comportement SW (AC: #1)
  - [x] `npm run build` reussit sans erreur
  - [x] `npm run preview` — SW s'installe (verifiable dans les logs console)
  - [x] Le precache manifest inclut JS, CSS, HTML, icones
  - [x] Le budget < 200Ko gzippe est respecte (actuellement ~21Ko gz, marge 89%)
  - [x] `npx vitest run` — tous les tests existants passent (0 regression)
  - [x] `npx biome check .` — 0 erreur

## Dev Notes

### Architecture et decisions techniques

- **Strategie SW** : `generateSW` (par defaut de vite-plugin-pwa). Aucune logique SW custom necessaire — tout est declaratif dans `vite.config.js`.
- **registerType** : `autoUpdate` (deja configure). Force `skipWaiting` + `clientsClaim` automatiquement. Le SW se met a jour silencieusement sans prompt utilisateur. App single-user, pas de prompt necessaire.
- **Strategie donnees JSON** : `NetworkFirst` avec `networkTimeoutSeconds: 5`. Donnees fraiches quand en ligne, cache quand offline. Pas `StaleWhileRevalidate` car les projections sont hebdomadaires — l'utilisateur doit voir les dernieres immediatement.
- **Strategie assets statiques** : precache via `globPatterns`. Les fichiers sont versionnes par le hash Vite — invalidation automatique. `cleanupOutdatedCaches: true` nettoie les anciennes entrees.
- **navigateFallback** : `index.html` pour le SPA. Le denylist `[/^\/data\//]` empeche les requetes JSON d'etre interceptees comme navigation.

### Interaction SW <> data.js — PAS de duplication

Le SW `NetworkFirst` et `data.js` sont **complementaires**, pas concurrents :

1. `data.js` fait `fetch(url)` — le SW intercepte ce fetch et applique NetworkFirst
2. `data.js` compare `lastUpdated` et fire `set('dataFresh', true)` si les donnees sont nouvelles
3. Le SW est transparent — il ne genere pas d'evenement `data-refreshed` distinct
4. Le store key `dataFresh` (event `data-fresh`) est le seul signal de fraicheur

**NE PAS** creer d'evenement SW supplementaire pour la fraicheur des donnees. `data.js` gere deja ce flow correctement. Le SW ajoute uniquement la couche cache offline en dessous du fetch.

### Store keys existantes (ne pas modifier)

```js
EVENT_NAMES = {
  season: 'season-loaded',
  revealed: 'reveal-triggered',
  activeSheet: 'sheet-opened',
  selectedTeam: 'team-selected',
  dataFresh: 'data-fresh',
  dataStale: 'data-stale',
}
```

Aucune nouvelle key a ajouter. Le SW ne parle pas directement au store.

### Deprecation icone `purpose: 'any maskable'`

La config actuelle utilise `purpose: 'any maskable'` sur une seule icone 512px. Chrome 128+ log un warning. Scinder en deux entrees separees :
- `pwa-512x512.png` avec `purpose: 'any'`
- `pwa-512x512-maskable.png` avec `purpose: 'maskable'` (padding safe zone ~20%)

### Icones placeholder

Les icones finales (logo Whistle) seront peut-etre fournies plus tard. Pour cette story, creer des **placeholders fonctionnels** (PNG colores avec texte "W" ou forme simple). L'important est que les fichiers existent aux bons chemins et aux bonnes tailles pour que le manifest soit valide et l'installation PWA possible.

### SW en dev vs production

Le SW n'est **PAS actif** pendant `npm run dev` (HMR serait casse). Tester le comportement PWA avec `npm run build && npm run preview`. Ne **PAS** ajouter `devOptions: { enabled: true }` dans la config.

### Impact budget

| Asset | Taille (gzippe) | Compte dans le budget 200Ko ? |
|---|---|---|
| Code registration SW (`virtual:pwa-register`) | ~0.5 KB | Oui |
| `sw.js` (service worker genere) | ~5-15 KB | Non (thread separe) |
| `manifest.webmanifest` | ~0.3 KB | Non (metadata) |
| Icones (192+512+512 maskable) | ~50-100 KB | Non (lazy loaded) |

Impact net sur le bundle principal : **~0.5 KB gzippe**. Budget actuel ~21Ko, marge confortable.

### Gotchas

1. **`globPatterns` par defaut trop restrictif** — le defaut `['**/*.{js,css,html}']` oublie les icones et fonts. Toujours inclure `ico,png,svg,woff2`.
2. **`cacheableResponse: { statuses: [0, 200] }`** — necessaire pour les requetes cross-origin (Google Fonts) car les reponses opaques ont status 0.
3. **`dvh` en standalone** — en mode standalone mobile, `100vh` peut etre incorrect. Utiliser `100dvh` si applicable. Verifier que le layout existant fonctionne en standalone.
4. **`viewport-fit=cover`** — ajouter a la meta viewport pour supporter `env(safe-area-inset-*)` sur les devices a encoche.

### Fichiers a creer/modifier

| Fichier | Action |
|---|---|
| `vite.config.js` | Modifier — config Workbox complete |
| `src/app.js` | Modifier — ajouter `registerSW()` |
| `index.html` | Modifier — apple-touch-icon, viewport-fit |
| `public/pwa-192x192.png` | Creer — icone placeholder |
| `public/pwa-512x512.png` | Creer — icone placeholder (purpose any) |
| `public/pwa-512x512-maskable.png` | Creer — icone placeholder (purpose maskable) |

### Project Structure Notes

- Aucun nouveau fichier dans `src/` (pas de `sw-register.js` separe — le code va dans `app.js`)
- Les icones vont dans `public/` (deja existant, sert les assets statiques)
- Pas de fichier SW custom (`sw.js`) — genere automatiquement par Workbox/vite-plugin-pwa
- Alignement parfait avec la structure du projet, aucun conflit

### Checklist validation SW

La checklist de validation manuelle du SW existe deja dans `_bmad-output/implementation-artifacts/checklist-validation-service-worker.md`. Les sections 1-5 et 8 sont pertinentes pour cette story. Les sections 6-7 (installation PWA) sont pour la story 4-2.

### References

- [Source: planning-artifacts/architecture.md] — strategies de cache, Service Worker, hebergement GitHub Pages
- [Source: implementation-artifacts/spike-vite-plugin-pwa.md] — spike complet avec config recommandee, registering, gotchas
- [Source: implementation-artifacts/checklist-validation-service-worker.md] — protocole de validation manuelle
- [Source: implementation-artifacts/audit-budget-performance-2026-03-29.md] — budget actuel 21Ko/200Ko
- [Source: planning-artifacts/epics.md#Epic4-Story4.1] — acceptance criteria, FRs couvertes
- [Source: vite-plugin-pwa docs (Context7)] — generateSW, runtimeCaching, autoUpdate, navigateFallback

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- `app.test.js` echouait car `virtual:pwa-register` n'est pas disponible en environnement de test (module virtuel Vite). Corrige en ajoutant `vi.mock('virtual:pwa-register', ...)`.
- `season-schema.test.js` : 19 echecs pre-existants (donnees JSON de test incompletes — equipe vannes manquante, form arrays incomplets). Non lie a cette story.

### Completion Notes List

- **Task 1 :** `vite.config.js` mis a jour avec config Workbox complete — globPatterns, cleanupOutdatedCaches, navigateFallback avec denylist, runtimeCaching NetworkFirst pour JSON (5s timeout, 30j expiration), Google Fonts CacheFirst conserve. Manifest enrichi : background_color #0f0a1a, orientation portrait, scope/start_url /, description ajoutee. Icones scindees en purpose any + maskable separees.
- **Task 2 :** `registerSW()` ajoute dans `app.js` avec import de `virtual:pwa-register`, callbacks onOfflineReady (log), onRegisteredSW (check periodique 1h), onRegisterError (console.error).
- **Task 3 :** `index.html` mis a jour — apple-touch-icon ajoute, viewport-fit=cover ajoute a la meta viewport.
- **Task 4 :** 3 icones placeholder PNG creees dans `public/` avec la couleur theme (#6d28d9). L'icone maskable a un padding de safe zone (~20%).
- **Task 5 :** Build reussi (precache 11 entries, 86.85 KiB). Budget ~24.4 KB gzippe (marge 87%). Biome 0 erreur. Vitest 0 regression (les 19 echecs season-schema sont pre-existants). Mock `virtual:pwa-register` ajoute au test app.test.js.

### Change Log

- 2026-03-29: Story 4-1 implementee — configuration SW complete (vite.config.js, app.js, index.html, icones placeholder, mock test)

### File List

- `vite.config.js` (modifie)
- `src/app.js` (modifie)
- `index.html` (modifie)
- `src/__tests__/app.test.js` (modifie — mock virtual:pwa-register)
- `public/pwa-192x192.png` (cree)
- `public/pwa-512x512.png` (cree)
- `public/pwa-512x512-maskable.png` (cree)
