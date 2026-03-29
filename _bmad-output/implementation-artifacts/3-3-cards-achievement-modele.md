# Story 3.3 : Cards Achievement modele

Status: done

ui-structural: true

Les cards achievement sont un nouveau composant UI avec un design "jeu video" distinct du reste de l'interface (bordures stylisees, icones, degrades). Elles necessitent une validation design avant implementation.

## Maquettes

Les maquettes doivent etre produites dans `_bmad-output/mockups/epic-3/` :

- [ ] `achievement-card-variant-a.html` — style horizontal : icone a gauche, titre + description a droite, bordure stylisee coloree selon variante
- [ ] `achievement-card-variant-b.html` — style vertical compact : icone centree en haut, texte en dessous, bordure degrade
- [ ] `achievement-card-variant-c.html` — style badge : icone ronde proeminente, fond degrade plein, texte overlay

Chaque variante doit montrer les 3 types : prediction correcte (trophee dore/vert), explication mouvement (ampoule violet), surprise (? orange). Plus l'etat tap (scale 0.97) et l'etat nouveau (glow subtil).

**GO higgin: oui** — variante C (badge gamifié) validée le 2026-03-29

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI ne doit etre ecrit avant ce GO.

## Story

En tant qu'utilisateur,
Je veux voir les resultats du modele predictif presentes comme des achievements de jeu video,
Afin de comprendre les predictions de facon ludique et engageante.

## Dependencies

- **2-1** (done) : Design tokens et fondation visuelle — tokens `--w-*` (couleurs, typographie, espacement, radius, ombres)
- **2-2** (done) : Store d'etat — `store.js` (get/set/on), cle `season` contenant `teams[]`, `predictions[]`, `matchday`, `brierScore`
- **3-1** (done) : Zones de classement — fournit le contexte visuel dans lequel les cards s'inserent
- **3-2** (done) : Bouton reveler — definit le pattern de feedback tactile (scale 0.97) reutilisable

## References

- **FRs** : FR25 (donnees sources modele, Phase 2 — ici le MVP se limite aux cards lecture seule), FR26 (Brier Score — disponible dans le JSON), FR27 (matchs correctement predits)
- **UX-DRs** : UX-DR5 (Card Achievement style jeu video — 3 variantes, role article, aria-label), UX-DR14 (feedback tactile scale 0.97)
- **Architecture** : `src/components/achievement-card.js` + `src/styles/components/achievement-card.css`
- **JSON** : `predictions[]` (historique append-only), `matchday`, `brierScore`, `teams[].trend`, `teams[].projectedRank`, `teams[].currentRank`
- **Page layout** : `w-achievements-section` slot deja present dans `page-layout.js` (ligne 10)
- [Source: planning-artifacts/architecture.md — section Structure Patterns, achievement-card.js]
- [Source: planning-artifacts/ux-design-specification.md — section "Card Achievement (Modele)"]
- [Source: planning-artifacts/epics.md — Story 3.3]

## Acceptance Criteria (BDD)

1. **Given** les donnees de saison sont dans le store avec `predictions[]` contenant au moins 2 entrees (prediction precedente verifiable)
   **When** les cards achievement s'affichent
   **Then** une card "prediction correcte" affiche le nombre de matchs bien predits avec icone trophee, bordure doree/verte, fond teinte chaud (UX-DR5)
   **And** le titre est court (ex: "Le modele a vu juste")
   **And** la description indique le ratio (ex: "3/4 predictions correctes la semaine derniere")

2. **Given** les donnees de saison sont dans le store avec La Rochelle qui a un `trend` non `"stable"`
   **When** les cards achievement s'affichent
   **Then** une card "explication mouvement" explique pourquoi La Rochelle monte/descend
   **And** la card a une icone ampoule, bordure violet, fond violet pale (UX-DR5)
   **And** le texte explique la raison du mouvement de facon simple et accessible

3. **Given** le modele s'est trompe de facon notable (ecart entre projection precedente et classement reel >= 3 places pour au moins une equipe)
   **When** les cards achievement s'affichent
   **Then** une card "surprise" est presente avec icone "?", bordure orange, ton humble (UX-DR5)
   **And** le texte reconnait l'erreur avec un ton intriguant, pas defensif

4. **Given** les cards sont rendues
   **When** on inspecte le DOM
   **Then** chaque card a `role="article"` et `aria-label` descriptif complet (UX-DR5)
   **And** les cards sont dans la section `w-achievements-section` (deja presente dans page-layout.js)

5. **Given** une card achievement est affichee
   **When** l'utilisateur tape sur la card
   **Then** la card effectue un scale 0.97 (feedback tactile, UX-DR14)
   **And** en MVP, le tap n'ouvre rien (la vue transparence est Phase 2 — story 5.1)

6. **Given** c'est la premiere journee (`predictions[]` contient 0 ou 1 entree, pas de prediction precedente a verifier)
   **When** les cards s'affichent
   **Then** seule la card explication est presente (UX-DR5, epics.md AC specifique)
   **And** pas de card prediction correcte ni de card surprise

7. **Given** les donnees de saison sont dans le store
   **When** les cards achievement s'affichent
   **Then** les cards ont un style achievement unlock jeu video : bordure stylisee, fond avec degrade, icone proeminente (UX-DR5)
   **And** elles ne ressemblent PAS a des notifications systeme ou des cartes d'info classiques

8. **Given** `prefers-reduced-motion` est active
   **When** l'utilisateur tape sur une card
   **Then** pas de transition animee sur le scale (coherent avec le pattern etabli dans 3-2)

## Taches Techniques

### T1 — Creer `src/components/achievement-card.js`

- [x] Exporter `render(container, season)` qui recoit le container `w-achievements-section` et les donnees de saison
- [x] Logique de determination des cards a afficher :
  - Verifier `season.predictions.length` : si <= 1, pas de prediction precedente a verifier → explication seulement
  - Si >= 2 : comparer `predictions[n-1].projections` (prediction precedente) avec `teams[].currentRank` actuel pour calculer les predictions correctes
  - Une prediction est "correcte" si `|projectedRank_predit - currentRank_actuel| <= 1` (tolerance de 1 place)
  - Compter le ratio correct/total
  - Detecter les surprises : equipes ou `|projectedRank_predit - currentRank_actuel| >= 3`
- [x] Trouver La Rochelle dans `teams[]` via `id === 'la-rochelle'`
  - Si `trend === 'up'` : explication positive ("La Rochelle progresse")
  - Si `trend === 'down'` : explication negative ("La Rochelle recule")
  - Si `trend === 'stable'` : explication neutre ("La Rochelle se maintient")
  - Generer le texte d'explication avec le delta `projectedRank - currentRank`
- [x] Structure HTML par card :
  ```html
  <article class="w-achievement w-achievement--{variant}" role="article" aria-label="{description complete}">
    <div class="w-achievement__icon" aria-hidden="true">{emoji/icone}</div>
    <div class="w-achievement__content">
      <div class="w-achievement__title">{titre}</div>
      <div class="w-achievement__description">{description}</div>
    </div>
    <div class="w-achievement__chevron" aria-hidden="true">›</div>
  </article>
  ```
- [x] Variantes CSS via classe modificateur : `--prediction`, `--explication`, `--surprise`
- [x] Feedback tactile : `pointerdown` → ajout classe `is-pressed`, `pointerup`/`pointerleave`/`pointercancel` → retrait
- [x] Icones en emoji pour le MVP (zero dependance) : trophee (prediction), ampoule (explication), ? (surprise)
  - Prediction : icone trophee emoji
  - Explication : icone ampoule emoji
  - Surprise : icone ? emoji

### T2 — Creer `src/styles/components/achievement-card.css`

- [x] Import dans le composant JS (pattern etabli : `import '../styles/components/achievement-card.css'`)
- [x] Classe `w-achievement` (prefixe `w-`) — variante C badge gamifie
- [x] Layout flex horizontal : icone a gauche (52px badge rond), contenu a droite, chevron a droite
- [x] Fond avec degrade plein selon variante (variante C) :
  - `--prediction` : degrade dore (gold → amber)
  - `--explication` : degrade violet
  - `--surprise` : degrade orange
- [x] Icone proeminente : 52px, cercle avec backdrop-filter glass, bordure semi-transparente
- [x] Typographie : titre en font-weight 800, description en caption
- [x] Espacement : padding `var(--w-space-md) var(--w-space-lg)`, gap `var(--w-space-md)` entre elements
- [x] Ombre coloree par variante + pseudo-elements decoratifs (cercles)
- [x] Etat presse : `transform: scale(0.97)`, transition 150ms
- [x] `@media (prefers-reduced-motion: reduce)` : pas de transition sur le scale, opacity fallback
- [x] Focus visible : outline 2px solid white, conforme WCAG AA
- [x] Zone tactile : minimum 72px de hauteur (UX-DR17)

### T3 — Integration dans `src/app.js`

- [x] Importer `render as renderAchievements` depuis `achievement-card.js`
- [x] Dans le listener `on('season', ...)`, appeler `renderAchievements(achievementsSection, value)` quand les donnees arrivent
- [x] Ajouter `const achievementsSection = layout.querySelector('.w-achievements-section')` (le slot existe deja dans page-layout.js)

### T4 — Tests

- [x] Fichier : `tests/achievement-card.test.js`
  - [x] Test : quand predictions.length >= 2 et des predictions correctes existent, la card prediction est rendue avec le bon ratio
  - [x] Test : quand La Rochelle a trend "up", la card explication est rendue avec texte positif
  - [x] Test : quand La Rochelle a trend "down", la card explication est rendue avec texte negatif
  - [x] Test : quand predictions.length <= 1, seule la card explication est presente (pas de prediction, pas de surprise)
  - [x] Test : quand une equipe a un ecart >= 3 entre projection et classement reel, la card surprise est presente
  - [x] Test : chaque card a `role="article"` et `aria-label`
  - [x] Test : les classes CSS de variante sont correctes (`--prediction`, `--explication`, `--surprise`)

### Review Findings

- [x] [Review][Decision] Chevron `›` garde intentionnellement — prepare visuellement la story 5-1 (vue transparence)
- [x] [Review][Patch] XSS via innerHTML — ajout helper `esc()` pour echapper `team.name` dans `buildCard()`
- [x] [Review][Patch] Signe surprise — direction explicite avec `+N` / `−N` places
- [x] [Review][Patch] Cards focusables au clavier — ajout `tabindex="0"`

## Dev Notes

### Donnees JSON disponibles

Le JSON de saison contient :
- `matchday` : numero de la journee actuelle (ex: 20)
- `brierScore` : score Brier du modele (peut etre `null` en debut de saison)
- `teams[].currentRank`, `teams[].projectedRank`, `teams[].trend`, `teams[].elo`, `teams[].confidence`
- `predictions[]` : historique append-only, chaque entree a `matchday`, `date`, et `projections[]` avec `teamId`, `projectedRank`, `confidence`

Pour verifier les predictions : comparer `predictions[n-1].projections` (ce que le modele avait predit) avec les `currentRank` actuels des equipes.

### Slot existant dans page-layout.js

La section `w-achievements-section` existe deja dans `page-layout.js` (ligne 10), avec `aria-label="Performances du modele"`. Il suffit de rendre les cards dedans, pas besoin de modifier le layout.

### Pattern de rendu

Suivre le pattern etabli par les composants existants :
- `score-card.js` : `render(container)` recoit le container et ecrit dedans
- `zone-group.js` : `renderZoneGroups(container, teams)` recoit container + donnees
- Pour achievement-card : `render(container, season)` recoit container + donnees completes de saison (pas juste teams, car il faut `predictions[]`)

### Feedback tactile

Reutiliser le pattern etabli en 3-2 (reveal-button) : `pointerdown` / `pointerup` + classe CSS pour le scale. En MVP, le tap ne fait rien de fonctionnel (la navigation vers la vue transparence est Phase 2, story 5-1).

### Textes d'explication (exemples)

Les textes doivent etre en francais, courts et engageants :
- Prediction : "Le modele a vu juste" / "X/Y predictions correctes cette semaine"
- Explication up : "La Rochelle grimpe" / "Projection : Xeme → Yeme. Le modele voit une progression."
- Explication down : "La Rochelle recule" / "Projection : Xeme → Yeme. Le calendrier se complique."
- Explication stable : "La Rochelle se maintient" / "Projection stable a la Xeme place."
- Surprise : "Le modele s'est trompe" / "Surprise : [equipe] a dejoue les pronostics (+X places)"

### Store keys utilisees

- `season` : donnees completes de saison (teams, predictions, matchday, brierScore)
- Pas de nouvelle cle store necessaire — les cards sont en lecture seule, pas d'etat interactif

### Conventions a respecter

| Convention | Valeur |
|---|---|
| Fichier JS | `src/components/achievement-card.js` |
| Fichier CSS | `src/styles/components/achievement-card.css` |
| Classes CSS | `w-achievement-card`, `w-achievement-card--prediction`, `w-achievement-card--explanation`, `w-achievement-card--surprise`, `w-achievement-card--pressed` |
| Export | `render(container, season)` |
| Communication | Lecture seule depuis les donnees de saison passees en parametre |
| Animations | `transform` uniquement pour le feedback tactile (GPU compositing) |
| Reduced motion | `matchMedia` ou CSS — pas de transition sur le scale |

### Anti-patterns a eviter

- Ne PAS creer un fichier `utils.js` pour la logique de comparaison predictions — la garder dans `achievement-card.js`
- Ne PAS fetcher les donnees depuis le composant — il recoit les donnees en parametre via `render(container, season)`
- Ne PAS utiliser des images/SVG pour les icones en MVP — utiliser des emoji (zero dependance, zero Ko)
- Ne PAS implementer la navigation vers la vue transparence (Phase 2) — juste le feedback tactile
- Ne PAS animer autre chose que `transform` et `opacity`
- Ne PAS hardcoder les textes dans le CSS — ils viennent du JS

### Project Structure Notes

- Fichiers crees : `src/components/achievement-card.js`, `src/styles/components/achievement-card.css`, `tests/achievement-card.test.js`
- Fichiers modifies : `src/app.js` (import + appel render dans le listener season)
- Aucun conflit avec la structure existante : le slot `w-achievements-section` est deja present

---

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun blocage rencontre.

### Completion Notes List

- T1 : Composant `achievement-card.js` avec fonction pure `computeAchievements()` separee du rendu DOM. Exporte `render(container, season)` + constantes de type + `computeAchievements` pour les tests.
- T2 : CSS variante C (badge gamifie) : degrades plein ecran, icone ronde 52px avec backdrop-filter glass, cercles decoratifs en pseudo-elements, feedback tactile scale(0.97), reduced-motion, focus-visible WCAG AA.
- T3 : Integration dans app.js — import + appel dans le listener `on('season', ...)` avec le slot `w-achievements-section` existant.
- T4 : 13 tests unitaires couvrant les 3 variantes, premiere journee, tolerance prediction, surprise >= 3 places, accessibilite, classes CSS.
- Note : les classes CSS utilisent `w-achievement` (pas `w-achievement-card`) et `is-pressed` (pas `w-achievement-card--pressed`) conformement a la variante C validee.

### Change Log

- 2026-03-29 : Implementation complete story 3-3 (T1-T4). 13 tests, 0 regression.

### File List

- `src/components/achievement-card.js` (nouveau)
- `src/styles/components/achievement-card.css` (nouveau)
- `tests/achievement-card.test.js` (nouveau)
- `src/app.js` (modifie — import + integration achievements)
