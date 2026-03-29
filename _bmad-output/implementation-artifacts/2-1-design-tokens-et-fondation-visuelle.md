# Story 2.1 : Design tokens et fondation visuelle

Status: done

## Story

En tant qu'utilisateur,
Je veux que l'app ait une identite visuelle coherente, sportive et ludique,
Afin que chaque ecran soit immediatement lisible et agreable.

## Acceptance Criteria (BDD)

1. **Given** le projet est initialise avec Open Props
   **When** les fichiers `src/styles/tokens.css` et `src/styles/base.css` sont crees
   **Then** les custom properties `--w-*` definissent la palette zones (violet Europe, vert Top 6, gris ventre mou, rouge maintien) + palette fonctionnelle

2. **Given** les tokens sont definis
   **When** la typographie est configuree
   **Then** l'echelle typographique Nunito 6 niveaux est definie avec `font-feature-settings: "tnum"` pour les chiffres tabulaires

3. **Given** les tokens sont definis
   **When** la grille d'espacement est configuree
   **Then** la grille d'espacement 8px est definie (`--w-space-xs` a `--w-space-2xl`)

4. **Given** les tokens visuels sont definis
   **When** l'identite visuelle est appliquee
   **Then** le fond de page est creme/beige (pas blanc pur), les cartes ont fond blanc eleve avec ombres subtiles, coins arrondis 12-16px

5. **Given** les couleurs sont definies
   **When** les contrastes sont verifies
   **Then** les contrastes respectent WCAG AA (ratio > 4.5:1 texte courant, violet minimum #6d28d9)

6. **Given** les styles de base sont appliques
   **When** des elements interactifs existent
   **Then** `touch-action: manipulation` est applique sur les elements interactifs

## Tasks / Subtasks

- [x] Task 1 : Creer `src/styles/tokens.css` (AC: #1, #3, #5)
  - [x] Importer les tokens Open Props utiles (couleurs, espacements, easings)
  - [x] Definir la palette zones : `--w-color-europe` (violet), `--w-color-top6` (vert), `--w-color-mid` (gris), `--w-color-relegation` (rouge)
  - [x] Definir les variantes pales pour fonds de zone : `--w-color-europe-bg`, `--w-color-top6-bg`, etc.
  - [x] Definir la palette fonctionnelle : `--w-color-primary`, `--w-color-surface`, `--w-color-surface-elevated`, `--w-color-text-primary`, `--w-color-text-secondary`, `--w-color-success`, `--w-color-danger`
  - [x] Definir les tokens de confiance : `--w-color-confidence-high` (vert), `--w-color-confidence-mid` (orange), `--w-color-confidence-low` (rouge pale)
  - [x] Definir l'echelle d'espacement 8px : `--w-space-xs` (4px) a `--w-space-2xl` (48px)
  - [x] Definir l'echelle typographique 6 niveaux : `--w-text-hero` (32px/800) a `--w-text-caption` (12px/400)
  - [x] Definir les tokens d'ombre et de rayon : `--w-radius-card` (12px), `--w-radius-button` (14px), `--w-shadow-card`
  - [x] Verifier WCAG AA : violet minimum `#6d28d9` sur fond creme, ratio > 4.5:1

- [x] Task 2 : Creer `src/styles/base.css` (AC: #2, #4, #6)
  - [x] Importer `tokens.css`
  - [x] Reset CSS minimal (box-sizing, margin, padding)
  - [x] Configurer Nunito via Google Fonts ou local : 400, 600, 700, 800
  - [x] Appliquer `font-feature-settings: "tnum"` sur les elements numeriques
  - [x] Definir les styles body : fond `--w-color-surface`, couleur `--w-color-text-primary`, font-family Nunito
  - [x] Definir les styles de base : `html { font-size: 16px }`, `#app { max-width: 430px; margin: 0 auto; padding: 0 var(--w-space-md) }`
  - [x] Appliquer `touch-action: manipulation` sur `button, a, [role="button"]`
  - [x] Definir les classes utilitaires de carte : `.w-card` (fond eleve, ombre subtile, border-radius 12-16px)

- [x] Task 3 : Integrer dans le build Vite (AC: tous)
  - [x] Importer `base.css` dans `src/app.js` (ou `index.html`)
  - [x] Verifier que le HMR fonctionne avec les fichiers CSS
  - [x] Verifier le rendu sur 360px et 430px de large

## Dev Notes

### Architecture CSS - Structure obligatoire

```
src/styles/
  tokens.css       <- Custom properties --w-* + imports Open Props
  base.css         <- Reset, typographie Nunito, layout global, import tokens.css
  components/      <- 1 fichier CSS par composant (vide pour l'instant)
```

**Regle** : les composants CSS seront dans `src/styles/components/` avec le meme nom que le composant JS. Cette story ne cree aucun fichier dans `components/` — seulement `tokens.css` et `base.css`.

### Palette exacte des zones (UX-DR)

| Zone | Couleur pleine | Fond pale (bg) | Usage |
|------|---------------|----------------|-------|
| Europe (top 2) | Violet `#6d28d9` | `#f3e8ff` | Bande de fond, accents, identite Whistle |
| Top 6 (3-6) | Vert `#16a34a` | `#dcfce7` | Zone qualificative |
| Ventre mou (7-12) | Gris `#6b7280` | `#f3f4f6` | Zone neutre |
| Maintien (13-14) | Rouge `#dc2626` | `#fef2f2` | Zone danger |

### Palette fonctionnelle

| Token | Couleur | Role |
|-------|---------|------|
| `--w-color-primary` | `#6d28d9` | Violet Whistle, CTA, accents |
| `--w-color-surface` | `#faf8f5` | Fond de page creme/beige |
| `--w-color-surface-elevated` | `#ffffff` | Cartes, elements eleves |
| `--w-color-text-primary` | `#1f2937` | Texte principal (gris tres fonce) |
| `--w-color-text-secondary` | `#6b7280` | Labels, metadata |
| `--w-color-success` | `#16a34a` | Tendance hausse |
| `--w-color-danger` | `#dc2626` | Tendance baisse |

### Echelle typographique Nunito

| Token | Taille | Poids | Usage |
|-------|--------|-------|-------|
| `--w-text-hero` | 32px | 800 (ExtraBold) | Position projetee, chiffre principal |
| `--w-text-h1` | 24px | 700 (Bold) | Titres de section |
| `--w-text-h2` | 20px | 700 (Bold) | Sous-titres, nom equipe fiche |
| `--w-text-body` | 16px | 400 (Regular) | Texte courant |
| `--w-text-label` | 14px | 600 (SemiBold) | Labels, metadata |
| `--w-text-caption` | 12px | 400 (Regular) | Texte tertiaire, timestamps |

`font-feature-settings: "tnum"` sur `.w-tabular` ou sur les elements contenant des chiffres de classement/Elo.

### Echelle d'espacement 8px

| Token | Valeur | Usage |
|-------|--------|-------|
| `--w-space-xs` | 4px | Espacement interne serre |
| `--w-space-sm` | 8px | Espacement interne composant |
| `--w-space-md` | 16px | Espacement entre elements, padding page |
| `--w-space-lg` | 24px | Espacement entre sections |
| `--w-space-xl` | 32px | Marges de page, separation majeure |
| `--w-space-2xl` | 48px | Hauteur min ligne classement (tap zone) |

### Open Props - Utilisation

Open Props est deja installe (`open-props: 1.7` dans package.json). Importer uniquement les modules utiles pour minimiser le CSS :

```css
@import "open-props/easings";
/* Les couleurs et espacements sont definis en custom --w-* pour garder le controle */
```

Les easings Open Props (`--ease-elastic-out-3`, `--ease-squish-3`, etc.) seront utiles pour les animations dans les stories suivantes. Les importer maintenant evite de revenir sur ce fichier.

### Nunito - Chargement

Utiliser Google Fonts pour le chargement de Nunito (4 poids) :
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800&display=swap" rel="stylesheet">
```

Ajouter dans `index.html` (pas dans le CSS) pour beneficier du preload navigateur. `display=swap` evite le FOIT.

### Contraintes de performance

- Budget total assets < 200Ko gzipped
- Les deux fichiers CSS doivent etre legers (tokens = custom properties, base = reset + typo)
- Pas de framework CSS, pas de Tailwind, pas de composants pre-styles
- Le tree-shaking PostCSS d'Open Props ne garde que les tokens effectivement utilises

### Anti-patterns a eviter

- **NE PAS** creer de fichier `utils.css` ou `helpers.css`
- **NE PAS** utiliser du noir pur (`#000`) pour le texte — utiliser `--w-color-text-primary` (gris tres fonce)
- **NE PAS** utiliser du blanc pur (`#fff`) pour le fond de page — utiliser `--w-color-surface` (creme)
- **NE PAS** definir des breakpoints ou des media queries de layout (app mobile-only 360-430px)
- **NE PAS** animer `width`, `height`, `top`, `left` (meme dans les transitions CSS de base)

### Fichiers existants a modifier

- `index.html` : ajouter les liens Google Fonts Nunito, verifier `<html lang="fr">` et `<meta name="theme-color">`
- `src/app.js` : ajouter l'import de `base.css`

### Fichiers a creer

- `src/styles/tokens.css`
- `src/styles/base.css`

### Project Structure Notes

- Les `.gitkeep` dans `src/components/`, `src/animation/`, `src/styles/components/` existent deja — ne pas les supprimer
- La structure `src/styles/` est conforme a l'architecture : `tokens.css` + `base.css` + `components/`

### References

- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation] — palette couleurs, typographie, espacement
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Design Direction Decision] — direction Game UI hybride, fond creme
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns] — prefixes CSS `w-` et `--w-`
- [Source: _bmad-output/planning-artifacts/architecture.md#Structure Patterns] — organisation `src/styles/`
- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1] — acceptance criteria originaux avec refs UX-DR

## ui-structural

false

### Review Findings

- [x] [Review][Decision] Google Fonts : runtimeCaching Workbox ajoute (CacheFirst pour fonts.googleapis.com + fonts.gstatic.com) [vite.config.js]
- [x] [Review][Patch] Theme-color aligne sur #6d28d9 dans le manifest PWA [vite.config.js]
- [x] [Review][Patch] 100vh fallback ajoute avant 100dvh [src/styles/base.css:34]
- [x] [Review][Defer] Poids de font Nunito eagerly loaded (4 poids ~60-100Ko) — a surveiller vs budget 200Ko quand tous les composants seront implementes
- [x] [Review][Defer] FOUT / layout shift sans size-adjust — sera resolu si on passe a @fontsource (cf. finding Decision ci-dessus)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

### Completion Notes List

- tokens.css : palette zones (4 couleurs + 4 bg), palette fonctionnelle (7 tokens), confiance (3 tokens), espacement (6 tokens), typographie (6 tokens), radius/shadow (3 tokens), import Open Props easings
- base.css : reset box-sizing, Nunito font-family, tnum tabular, body surface/text, #app 430px, touch-action manipulation, .w-card utility, prefers-reduced-motion
- index.html : Google Fonts Nunito (400/600/700/800), theme-color #6d28d9, lang="fr" conserve
- app.js : import base.css ajoute
- Build Vite : CSS 7.00 kB (2.25 kB gzip) — dans le budget
- 29 tests unitaires couvrant tous les tokens, palette, typo, espacement, WCAG AA, base.css, index.html
- Pas de regression sur les tests existants (19 echecs pre-existants dans season-schema.test.js lies aux donnees, pas au code)
- Code review : 3 findings fixes (runtimeCaching Workbox, theme-color manifest, 100vh fallback), 2 deferred, 6 dismissed

### File List

- src/styles/tokens.css (cree)
- src/styles/base.css (cree)
- index.html (modifie)
- src/app.js (modifie)
- vite.config.js (modifie)
- tests/design-tokens.test.js (cree)
