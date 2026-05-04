# Story 2.3 : Layout page principale et structure HTML semantique

Epic: 2 — Score Card & Situation Equipe Favorite
Status: done
ui-structural: true

## Maquettes

Pas de maquettes requises — cette story pose la structure HTML/CSS squelettique (sections vides avec placeholders). Les composants visuels (score card, classement, etc.) sont implementes dans les stories suivantes. La structure est dictee par UX-DR15 et UX-DR19 sans ambiguite.

GO higgin: oui

## User Story

En tant qu'utilisateur,
Je veux une page unique scrollable avec la bonne hierarchie d'information,
Afin de trouver l'information sans effort.

## Acceptance Criteria

1. **Given** le fichier `src/app.js` et `index.html` sont configures
   **When** l'app s'affiche
   **Then** la page suit la structure : score card hero → cards achievement → bouton reveler → classement par zones → prochains matchs (UX-DR19)

2. **And** `<html lang="fr">`, `<meta name="theme-color" content="#6d28d9">` sont definis (deja fait dans index.html)

3. **And** la structure utilise `<main>`, `<h1>` pour le nom d'equipe, `<section>` pour les zones (UX-DR15)

4. **And** pas de menu hamburger, pas de tab bar, pas de pagination

5. **And** le padding horizontal est 16px, zone de contenu 328-398px centree

## Technical Context

### Architecture References

- Composants en modules JS fonctionnels exportant `render()` — pas de classes, pas de Web Components [Source: architecture.md#Frontend Architecture]
- 1 composant = 1 fichier JS + 1 fichier CSS, meme nom [Source: CLAUDE.md]
- CSS classes prefixees `w-`, custom properties `--w-` [Source: CLAUDE.md#Naming Conventions]
- Communication entre composants exclusivement via le store [Source: architecture.md]
- Structure page: `src/components/`, `src/styles/components/` [Source: architecture.md]

### UX References

- UX-DR15: Structure HTML semantique — `<main>`, `<h1>` score card, `<h2>` zones, `<section>` par zone, `<ul>/<li>` equipes, `<dialog>` bottom sheet, `lang="fr"`, `meta theme-color` violet
- UX-DR19: Layout page unique scrollable — score card hero en haut, cards achievement, bouton reveler, classement par zones, prochains matchs La Rochelle. Pas de menu hamburger, pas de tab bar, pas de pagination
- UX-DR21: Fond page creme/beige, cartes fond blanc eleve avec ombres subtiles, coins arrondis 12-16px

### Existing Code

- `index.html` — deja `lang="fr"` et `theme-color="#6d28d9"` (AC #2 deja satisfait)
- `src/app.js` — importe store, data, router, ecoute `season-loaded`, appelle `loadSeason()` au demarrage. Actuellement injecte `<h1>Whistle</h1>` dans `#app`
- `src/store.js` — store EventTarget avec `get()`, `set()`, `on()`
- `src/data.js` — fetch JSON saison network-first
- `src/router.js` — routeur minimal popstate
- `src/styles/tokens.css` — design tokens Whistle (couleurs zones, typo, espacement)
- `src/styles/base.css` — reset, fond creme, typo Nunito

### Dependencies

- Story 2-1 (done) — tokens CSS et fondation visuelle
- Story 2-2 (done) — store, data fetch, router

## Tasks

### Task 1 : Creer le composant layout `src/components/page-layout.js` + `src/styles/components/page-layout.css`

**page-layout.js** exporte `render()` qui retourne la structure HTML principale :

```html
<main class="w-page-layout">
  <section class="w-hero-section" aria-label="Equipe favorite">
    <!-- score-card.js viendra ici (story 2-4) -->
  </section>

  <section class="w-achievements-section" aria-label="Performances du modele">
    <!-- cards achievement (epic 3) -->
  </section>

  <section class="w-reveal-section">
    <!-- bouton reveler (story 3-2) -->
  </section>

  <section class="w-standings-section" aria-label="Classement">
    <h2 class="w-standings-title">Classement</h2>
    <!-- zones classement (story 3-1) -->
  </section>

  <section class="w-schedule-section" aria-label="Prochains matchs">
    <h2 class="w-schedule-title">Prochains matchs</h2>
    <!-- prochains matchs (story 2-4) -->
  </section>
</main>
```

**page-layout.css** :
- `.w-page-layout` : `padding: 0 var(--w-space-md)` (16px), `max-width: 398px`, `margin: 0 auto`, `min-width: 328px`
- Sections empilees verticalement, espacement `var(--w-space-lg)` entre sections
- Pas de styles visuels sur les sections elles-memes (cartes blanches viendront avec les composants enfants)

### Task 2 : Modifier `src/app.js` pour utiliser page-layout

- Importer `{ render as renderLayout }` depuis `page-layout.js`
- Sur `season-loaded`, appeler `renderLayout()` et injecter dans `#app`
- Garder l'ecoute store existante
- Quand `season` est `null`, afficher le message "Les donnees arrivent lundi" (fallback existant)

### Task 3 : Mettre a jour `index.html` si necessaire

- Verifier que `<div id="app">` est bien le seul conteneur (deja le cas)
- Aucune modification attendue sauf si un ajustement est necessaire

### Task 4 : Tests

- Tester que `render()` de page-layout retourne un element `<main>` avec les sections attendues
- Tester que les sections ont les bons `aria-label`
- Tester que app.js appelle le render sur `season-loaded`
- Utiliser vitest (deja configure)

## Anti-Patterns a Eviter

- NE PAS creer de composants visuels (score card, bouton reveler, classement) — cette story pose UNIQUEMENT la structure squelettique
- NE PAS ajouter de contenu factice visible a l'utilisateur (pas de "lorem ipsum", pas de mockups)
- NE PAS toucher au store, data.js ou router.js
- NE PAS creer de fichier `utils.js` ou `helpers.js`
- NE PAS utiliser de classes CSS generiques — prefixe `w-` obligatoire

## Previous Story Intelligence

### Story 2-2 Learnings
- Le store fonctionne avec `get()`, `set()`, `on()` — utiliser `on('season', callback)` pour reagir au chargement
- Les events ont le format `{ detail: { value, previous } }`
- app.js fait deja `on('season', ...)` et `loadSeason()` — modifier le callback existant, ne pas en ajouter un deuxieme
- vitest est configure et les tests existants passent

### Story 2-1 Learnings
- tokens.css definit `--w-space-md: 16px`, `--w-space-lg: 24px`, `--w-space-xl: 32px`
- base.css applique le fond creme et la typo Nunito globalement
- Le pattern d'import CSS est: `import '../styles/components/[name].css'` depuis le composant JS

## Validation Manuelle

- [ ] `npm run dev` demarre sans erreur
- [ ] La page affiche la structure `<main>` avec les sections attendues (inspecter le DOM)
- [ ] Le padding horizontal est 16px, le contenu est centre
- [ ] Pas de contenu visible hors structure (pas de texte placeholder)
- [ ] Le back navigateur fonctionne toujours
- [ ] `npm run build` produit un build valide
- [ ] `npx biome check .` passe sans erreur

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6



### Completion Notes List

- Review finding C1 (missing CSS layout rules): rejected — `#app` in base.css already provides `padding: 0 var(--w-space-md)`, `max-width: 430px`, `margin: 0 auto`, giving 398px content zone. Adding to `.w-page-layout` would double-pad.
- Review finding I1 (missing app.js integration test): fixed — added `src/__tests__/app.test.js` with 2 tests (render on season-loaded + fallback on null).



### File List

- `src/components/page-layout.js` (new)
- `src/styles/components/page-layout.css` (new)
- `src/app.js` (modified)
- `src/__tests__/page-layout.test.js` (new)
- `src/__tests__/app.test.js` (new)
