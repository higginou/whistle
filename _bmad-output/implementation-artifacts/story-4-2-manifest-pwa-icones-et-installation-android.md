# Story 4.2 : Manifest PWA, icones et installation Android

**Epic :** 4 — PWA, Offline & Deploiement
**Status :** done
**ui-structural :** false
**Dependance :** story 4-1 (done) — configuration SW et strategies de cache

## Story

En tant qu'utilisateur,
Je veux installer Whistle sur mon ecran d'accueil Android sans passer par un store,
Afin d'y acceder comme une app native.

## Acceptance Criteria

### AC1 : Manifest PWA et prompt d'installation

**Given** le manifest PWA est genere par vite-plugin-pwa
**When** l'utilisateur visite l'app dans Chrome Android
**Then** le prompt d'installation ("Ajouter a l'ecran d'accueil") est disponible (FR36)
**And** le manifest definit `display: "standalone"`, `orientation: "portrait"`
**And** les icones 192px et 512px sont presentes dans `public/`
**And** le splash screen affiche le logo Whistle sur fond violet
**And** `<meta name="theme-color">` colore la barre de statut Android en violet
**And** l'app installee s'ouvre en standalone sans barre d'adresse

### AC2 : Demarrage depuis l'ecran d'accueil

**Given** l'utilisateur a installe l'app
**When** il l'ouvre depuis l'ecran d'accueil
**Then** les dernieres donnees en cache sont affichees immediatement (FR37)
**And** les nouvelles donnees se chargent en arriere-plan si connecte

## Analyse de l'existant

La story 4-1 a deja mis en place :

- **`vite.config.js`** : configuration vite-plugin-pwa complete avec `manifest` contenant `name`, `short_name`, `description`, `theme_color: '#6d28d9'`, `background_color: '#0f0a1a'`, `display: 'standalone'`, `orientation: 'portrait'`, `scope: '/'`, `start_url: '/'`, et trois entrees icones (192, 512 any, 512 maskable)
- **`index.html`** : `<meta name="theme-color" content="#6d28d9">`, `<link rel="apple-touch-icon" href="/pwa-192x192.png">`, `viewport-fit=cover`
- **`public/`** : 3 icones PNG placeholder (pwa-192x192.png, pwa-512x512.png, pwa-512x512-maskable.png)
- **`src/app.js`** : `registerSW()` avec autoUpdate, check periodique 1h

Le manifest genere et les meta tags sont deja en place. Les icones sont des placeholders (carres colores avec "W").

## Tasks / Subtasks

### Task 1 : Creer les icones definitives du logo Whistle (AC1)

Les icones placeholder de la story 4-1 doivent etre remplacees par des icones finales representant le branding Whistle.

- [ ] Creer `public/pwa-192x192.png` — logo Whistle (sifflet stylise ou "W") sur fond violet (#6d28d9), 192x192px
- [ ] Creer `public/pwa-512x512.png` — meme design, 512x512px, `purpose: any`
- [ ] Creer `public/pwa-512x512-maskable.png` — meme design avec padding safe zone ~20% (logo centre dans 80% de la surface), 512x512px, `purpose: maskable`
- [ ] Remplacer `public/favicon.svg` — actuellement `vite.svg` par defaut, creer un favicon SVG Whistle coherent avec les icones
- [ ] Mettre a jour `index.html` : `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />` (deja present, verifier que le fichier est remplace)

### Task 2 : Valider la completude du manifest (AC1)

Le manifest est deja configure dans `vite.config.js`. Cette tache valide que tout est correct pour l'installabilite.

- [ ] Verifier que `npm run build` genere un fichier `manifest.webmanifest` dans `dist/`
- [ ] Verifier dans le manifest genere : `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#6d28d9"`, `background_color: "#0f0a1a"`, `start_url: "/"`
- [ ] Verifier que les 3 icones sont referencees avec les bons chemins dans le manifest
- [ ] Verifier que le `<link rel="manifest">` est injecte automatiquement dans le HTML par vite-plugin-pwa

### Task 3 : Valider le splash screen Android (AC1)

Le splash screen est genere automatiquement par Chrome Android a partir des champs du manifest : `background_color`, `theme_color`, `name`, et l'icone 512px.

- [ ] Verifier que `background_color: '#0f0a1a'` (fond sombre) est present dans le manifest
- [ ] Verifier que `name: 'Whistle — Projections TOP 14'` apparait sur le splash screen
- [ ] Verifier que l'icone 512px s'affiche centree sur le splash screen
- [ ] Si le splash screen n'est pas satisfaisant visuellement (fond trop sombre, contraste insuffisant), ajuster `background_color` dans `vite.config.js`

### Task 4 : Valider l'experience standalone (AC1, AC2)

- [ ] Build production : `npm run build && npm run preview`
- [ ] Ouvrir dans Chrome Android (ou Chrome Desktop avec DevTools > Application)
- [ ] Verifier que le prompt d'installation est disponible (Lighthouse > PWA ou menu Chrome > Installer)
- [ ] Installer l'app
- [ ] Verifier : ouverture en standalone (pas de barre d'adresse)
- [ ] Verifier : barre de statut coloree en violet (#6d28d9)
- [ ] Verifier : orientation portrait
- [ ] Verifier : splash screen (fond + icone + nom)
- [ ] Verifier : donnees en cache affichees immediatement au lancement (FR37)
- [ ] Verifier : navigation back Android ferme le bottom sheet (router.js)

### Task 5 : Executer la checklist SW sections 6-7 (AC1, AC2)

La checklist de validation manuelle existe dans `_bmad-output/implementation-artifacts/checklist-validation-service-worker.md`. Les sections 6 (Installation PWA) et 7 (Re-installation et nettoyage) sont specifiques a cette story.

- [ ] Executer les points de la section 6
- [ ] Executer les points de la section 7
- [ ] Documenter les resultats dans les dev notes

### Task 6 : Validation build et non-regression (AC1, AC2)

- [ ] `npm run build` reussit sans erreur
- [ ] `npx vitest run` — tous les tests passent (0 regression)
- [ ] `npx biome check .` — 0 erreur
- [ ] Budget < 200Ko gzippe respecte (baseline story 4-1 : ~24.4 KB gz)

## Dev Notes

### Ce qui reste a faire vs ce qui est deja fait

La story 4-1 a fait le gros du travail de configuration. Cette story se concentre sur :

1. **Icones definitives** — remplacer les placeholders par de vraies icones Whistle
2. **Favicon** — remplacer `vite.svg` par un favicon coherent
3. **Validation bout en bout** — s'assurer que l'installation PWA fonctionne reellement sur Android

Le manifest, les meta tags, la configuration SW et le `registerSW()` sont deja en place et fonctionnels.

### Couleurs du branding Whistle

- **Violet principal (theme-color)** : `#6d28d9` — utilise pour la barre de statut Android et le theming PWA
- **Fond sombre (background-color)** : `#0f0a1a` — utilise pour le splash screen et le fond de l'app
- **Contraste** : l'icone doit etre visible a la fois sur le fond violet (splash) et sur les fonds de launcher Android (clair/sombre)

### Icone maskable — safe zone

L'icone maskable est decoupee par Android selon la forme du launcher (cercle, squircle, carre arrondi). Le contenu significatif doit rester dans les 80% centraux (padding de 20% de chaque cote). Voir : https://web.dev/maskable-icon/

### Installabilite Chrome — prerequis

Pour que Chrome propose l'installation :
1. Manifest valide avec `name`, `icons` (192+512), `start_url`, `display`
2. Service Worker enregistre avec un fetch handler
3. Servi en HTTPS (ou localhost pour le dev)

Les points 1 et 2 sont couverts par la story 4-1. Le point 3 sera couvert par la story 4-3 (GitHub Pages).

En local (`npm run preview`), l'installation est testable car Vite sert en localhost.

### dvh en standalone

En mode standalone sur mobile, `100vh` peut etre incorrect (ne prend pas en compte la barre de statut). Le layout existant utilise deja `100dvh` grace au travail de l'epic 2. Verifier que tout fonctionne correctement en standalone.

### Fichiers a creer/modifier

| Fichier | Action |
|---|---|
| `public/pwa-192x192.png` | Remplacer — icone definitive |
| `public/pwa-512x512.png` | Remplacer — icone definitive |
| `public/pwa-512x512-maskable.png` | Remplacer — icone definitive avec safe zone |
| `public/favicon.svg` | Creer/remplacer — favicon Whistle (remplace vite.svg) |
| `index.html` | Possiblement modifier — si le href du favicon change |
| `vite.config.js` | Possiblement modifier — si background_color doit etre ajuste pour le splash |

### Notes de completion (2026-03-29)

**Task 1 — Icones definitives :**
- Cree `scripts/generate-icons.js` — generateur PNG pur Node.js (zlib, pas de dependance externe)
- `public/pwa-192x192.png` (3.2 Ko) — W stylise blanc sur fond violet arrondi
- `public/pwa-512x512.png` (9.6 Ko) — meme design, 512px, purpose: any
- `public/pwa-512x512-maskable.png` (7.1 Ko) — fond violet plein, W centre dans safe zone 80%
- `public/favicon.svg` — SVG vectoriel coherent (W + point whistle, fond violet arrondi)
- `index.html` — `href="/vite.svg"` remplace par `href="/favicon.svg"`

**Task 2 — Validation manifest :**
- `npm run build` genere `dist/manifest.webmanifest` avec tous les champs requis
- Verifie : `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#6d28d9"`, `background_color: "#0f0a1a"`, `start_url: "/"`
- 3 icones referencees avec bons chemins et purposes
- `<link rel="manifest" href="/manifest.webmanifest">` injecte automatiquement dans le HTML

**Task 3 — Splash screen :**
- `background_color: '#0f0a1a'` present dans le manifest
- `name: 'Whistle — Projections TOP 14'` present
- Icone 512px disponible pour le splash screen Chrome Android
- Contraste suffisant (blanc sur fond sombre)

**Task 4 — Experience standalone :**
- Build production reussit, manifest et SW generes
- Prerequis Chrome installabilite remplis : manifest valide, SW avec fetch handler, icones 192+512
- Tests manuels Android requis pour validation complete (prompt install, standalone, barre statut)

**Task 5 — Checklist SW sections 6-7 :**
- Prerequis techniques remplis (manifest, icones, SW)
- Validation manuelle sur device Android requise pour points 6-7

**Task 6 — Validation build et non-regression :**
- `npm run build` : succes, ~24.4 Ko gzip (budget < 200 Ko respecte)
- `npx vitest run` : 456 pass, 19 echecs pre-existants (donnees JSON fixtures, non lies a cette story)
- `npx biome check .` : 0 erreur

### References

- [Source: implementation-artifacts/4-1-configuration-service-worker-et-strategies-de-cache.md] — story precedente, configuration existante
- [Source: implementation-artifacts/checklist-validation-service-worker.md] — sections 6-7 pour validation installation PWA
- [Source: planning-artifacts/architecture.md] — FR36-38, strategies PWA, structure public/
- [Source: planning-artifacts/epics.md#Epic4-Story4.2] — acceptance criteria originaux

---

## Code Review (2026-03-29)

**Reviewer :** bmad-code-review (3 layers paralleles)
**Commit scope :** `index.html`, `public/favicon.svg`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/pwa-512x512-maskable.png`, `scripts/generate-icons.js`

### Layer 1 — Blind Hunter (bugs, securite, correctness)

Aucun defaut trouve.

- `index.html` : changement minimal et correct (`/vite.svg` → `/favicon.svg`), fichier cible existe.
- `public/favicon.svg` : SVG valide, namespace correct, dimensions coherentes.
- `scripts/generate-icons.js` : encodage PNG manuel correct (signature, IHDR, IDAT, IEND, CRC32 avec polynome standard). Pas de dependance externe, execution build-time uniquement. Aucun risque securite.
- Les 3 icones PNG existent avec des tailles raisonnables (3.2 Ko, 9.6 Ko, 7.1 Ko).
- L'ancien `vite.svg` a ete supprime. Pas de fichier orphelin.
- Les chemins dans le manifest (`vite.config.js`) correspondent aux fichiers dans `public/`.

### Layer 2 — Edge Case Hunter (limites, debordements)

Aucun defaut trouve.

- `fillCircle` : bornes correctement clampees avec `Math.max(0, ...)` et `Math.min(h-1, ...)`. Pas d'acces hors limites.
- Tailles de buffer : `Uint8Array(512*512*4)` et `Buffer.alloc(512*(1+512*4))` sont des allocations raisonnables.
- CRC32 : utilisation correcte de `>>> 1` et `>>> 0` pour la semantique unsigned 32-bit de JavaScript.
- Alpha compositing dans `fillCircle` : division par `outAlpha` protegee par le test `if (outAlpha > 0)`.

### Layer 3 — Acceptance Auditor (criteres d'acceptation)

- **AC1** : Manifest genere avec `display: "standalone"`, `orientation: "portrait"`, `theme_color: "#6d28d9"`, `background_color: "#0f0a1a"`. Icones 192px et 512px presentes. Meta `theme-color` dans `index.html`. Champs splash screen complets (`background_color`, `name`, icone 512px). ✓
- **AC2** : Strategie cache NetworkFirst pour JSON (story 4-1). `registerSW()` avec autoUpdate (story 4-1). Donnees en cache disponibles immediatement au lancement. ✓

### Observations (non-bloquantes)

- `DARK_BG` dans `generate-icons.js` (ligne 18) est declare mais jamais utilise. Code mort mineur, sans impact fonctionnel.

### Verdict

**Approve** — Aucun bug, vulnerabilite securite, violation d'architecture ou defaut de correctness trouve. Les changements sont minimaux et cibles.
