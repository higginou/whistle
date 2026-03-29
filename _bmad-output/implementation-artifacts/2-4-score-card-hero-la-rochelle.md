# Story 2.4 : Score Card hero La Rochelle

Status: done

## ui-structural

**ui-structural: true**

Ce composant est un nouveau composant UI structurel (hero card) qui n'existe pas encore dans le codebase. Il necessite une validation design avant implementation.

## Maquettes

Les maquettes doivent etre produites dans `_bmad-output/mockups/epic-2/` :

- [x] `score-card-variant-a.html` — stack vertical compact
- [x] `score-card-variant-b.html` — split layout
- [x] `score-card-variant-c.html` — card-based (RETENUE)

**GO higgin: oui** (variante C validée — 2026-03-29)

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI ne doit etre ecrit avant ce GO.

## Story

En tant qu'utilisateur,
Je veux voir la fiche complete de La Rochelle des l'ouverture de l'app,
Afin de connaitre instantanement la situation de mon equipe sans avoir a chercher.

## Dependencies

- **2-1** (done) : Design tokens et fondation visuelle — tokens `--w-*`, typographie Nunito, grille 8px, direction Game UI
- **2-2** (done) : Store d'etat, fetch donnees et router — `store.js` (get/set/on), `data.js` (loadSeason), `router.js`
- **2-3** (done) : Layout page principale et structure HTML semantique — `page-layout.js` avec section `w-hero-section`

## References

- **FRs** : FR14, FR15, FR16, FR17, FR18, FR19
- **UX-DRs** : UX-DR4 (score card hero), UX-DR17 (zones tactiles 48px)
- **Architecture** : `src/components/score-card.js` + `src/styles/components/score-card.css` (1 composant = 1 JS + 1 CSS)

## Acceptance Criteria (BDD)

1. **Given** les donnees de saison sont chargees dans le store
   **When** l'app s'ouvre
   **Then** la score card affiche la position actuelle et la position projetee de La Rochelle (FR14, FR15)

2. **Given** les donnees de saison sont chargees
   **When** la score card est rendue
   **Then** la tendance (hausse/baisse/stable) depuis la derniere journee est visible (FR16)

3. **Given** les donnees de saison sont chargees
   **When** la score card est rendue
   **Then** la barre XP affiche la probabilite top 6 avec les probabilites par zone accessibles au tap (FR17)

4. **Given** les donnees de saison sont chargees
   **When** l'utilisateur scrolle la score card
   **Then** les prochains matchs avec difficulte estimee sont visibles (FR18)

5. **Given** les donnees de saison sont chargees
   **When** la score card est rendue
   **Then** l'explication du modele sur la trajectoire est affichee (FR19)

6. **Given** la score card est rendue
   **When** l'utilisateur regarde l'ecran
   **Then** la score card occupe ~40% de l'ecran au premier affichage (UX-DR4)

7. **Given** la score card est rendue
   **When** on inspecte le DOM
   **Then** le composant a son fichier `src/components/score-card.js` + `src/styles/components/score-card.css`
   **And** le heading est `<h1>` avec aria-label sur la barre XP (UX-DR4)
   **And** les zones tactiles font 48px minimum (UX-DR17)

## Taches Techniques

### T1 — Creer le fichier `src/components/score-card.js`

- Exporter une fonction `render(container)` qui recoit la section `w-hero-section` du layout
- Ecouter le store via `on('season', callback)` pour recevoir les donnees
- Extraire l'equipe La Rochelle (`id === 'la-rochelle'`) du tableau `teams[]`
- Generer le DOM du composant dans la section hero

### T2 — Structure HTML de la score card

- `<h1 class="w-score-card__team-name">` pour le nom "Stade Rochelais"
- Position actuelle (`currentRank`) et position projetee (`projectedRank`) avec fleche entre les deux
- Tendance (`trend`: "up" / "down" / "stable") avec indicateur visuel (fleche haut/bas/egal)
- Conteneur pour le badge "Nouveau" (rendu par story 2-5)
- Structure semantique : `<article class="w-score-card">` englobant

### T3 — Barre XP probabilite top 6

- Barre horizontale remplie proportionnellement a `zones.top6` (decimal 0-1, affiche en %)
- `aria-label` sur la barre : "Probabilite top 6 : XX%"
- Au tap sur la barre : afficher les 4 zones (`europe`, `top6`, `mid`, `relegation`) en detail
- Les probabilites sont converties de decimales (JSON) en pourcentages (UI) uniquement a l'affichage
- Zone tactile de la barre >= 48px (UX-DR17)

### T4 — Prochains matchs La Rochelle

- Filtrer `calendar[]` pour les matchs impliquant `la-rochelle` (home ou away)
- Afficher les 3 prochains matchs non joues avec : adversaire, domicile/exterieur, difficulte estimee (`difficulty` decimal 0-1)
- Scroll horizontal ou vertical selon la maquette validee
- Zones tactiles 48px minimum

### T5 — Explication trajectoire

- Generer un texte descriptif de la trajectoire basee sur les donnees :
  - Tendance, forme recente (`form[]`), delta entre `currentRank` et `projectedRank`
- Texte court, une a deux phrases, style factuel
- Ce texte est derive des donnees JSON, pas stocke en dur

### T6 — Creer le fichier `src/styles/components/score-card.css`

- Classes prefixees `w-score-card` (namespace `w-`)
- Utiliser les design tokens `--w-*` de `tokens.css` (couleurs, espacements, typographie)
- La score card occupe ~40% du viewport au premier affichage
- Direction Game UI : fond avec gradient violet, coins arrondis 12-16px, ombres subtiles
- Responsive dans la plage 360-430px (padding 16px, etirement proportionnel)
- `touch-action: manipulation` sur les elements tappables

### T7 — Integration dans `app.js`

- Importer `render` depuis `score-card.js`
- Appeler `render()` avec la section hero comme cible apres `renderLayout()`
- La score card se met a jour quand le store emet `season-loaded`

### T8 — Support `prefers-reduced-motion`

- La fleche animee entre position actuelle et projetee respecte `prefers-reduced-motion`
- Si reduced motion : affichage statique, pas d'animation de fleche
- Transitions opacity uniquement, zero spring

### T9 — Tests

- Test unitaire : `render()` retourne un DOM avec la structure attendue (h1, positions, tendance, barre XP)
- Test unitaire : extraction correcte de La Rochelle depuis les donnees de saison
- Test unitaire : conversion decimales → pourcentages pour l'affichage
- Test unitaire : filtrage des prochains matchs depuis le calendrier
- Fichier : `src/__tests__/score-card.test.js`

## Notes d'implementation

- L'equipe favorite est hard-codee a `la-rochelle` (spec PRD : single user, supporter La Rochelle)
- Le badge "Nouveau" sera integre par la story 2-5 — la score card doit prevoir un conteneur vide pour l'accueillir
- Le detail des probabilites par zone (tap sur barre XP) peut etre un mini-panel inline ou une expansion — a definir dans les maquettes
- Les donnees `calendar[]` dans le JSON contiennent `home`, `away`, `date`, `difficulty` — verifier la structure exacte avec le JSON genere
- Respecter la frontiere store <> composant : la score card lit les donnees via `get('season')` et ecoute via `on('season', ...)`, jamais de fetch direct
