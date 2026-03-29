# Story 3.4 : Bottom Sheet fiche detaillee equipe

Status: done

ui-structural: true

Cette story cree le composant bottom sheet (`<dialog>` natif) qui s'ouvre au tap sur une ligne d'equipe, affichant la fiche detaillee (Elo, forme, calendrier, probabilites par zone). C'est un nouveau composant UI majeur avec drag, snap, overlay et animations. Elle necessite une validation design avant implementation.

## Maquettes

Les maquettes doivent etre produites dans `_bmad-output/mockups/epic-3/` :

- [ ] `bottom-sheet-variant-a.html` — style carte pleine : header hero (logo + nom + positions), contenu en scroll vertical, overlay sombre classique
- [ ] `bottom-sheet-variant-b.html` — style compact : header minimal, sections en accordeon, poignee drag proeminente
- [ ] `bottom-sheet-variant-c.html` — style glassmorphism : fond semi-transparent avec backdrop-filter, sections en tuiles

Chaque variante doit montrer : etat mi-hauteur (header + Elo + forme visible), etat plein ecran (calendrier + probabilites visibles en plus), poignee drag 40x4px, bouton fermer explicite, overlay sombre 40%.

**GO higgin: oui** — Variante B2 Gaming (violet dominant, power cards zones sans graphiques, esthétique jeu vidéo)

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI ne doit etre ecrit avant ce GO.

## Story

En tant qu'utilisateur,
Je veux consulter la fiche detaillee de n'importe quelle equipe sans quitter le classement,
Afin d'explorer les rivaux et comparer les situations.

## Dependencies

- **2-1** (done) : Design tokens et fondation visuelle — tokens `--w-*` (couleurs, typographie, espacement, radius, ombres)
- **2-2** (done) : Store d'etat — `store.js` (get/set/on), cles `activeSheet`, `selectedTeam`, `season`
- **2-3** (done) : Layout page principale — `page-layout.js` fournit le container principal
- **3-1** (done) : Zones de classement et lignes d'equipe — `rank-row.js` (lignes tappables), `zone-group.js`, `confidence-bar.js`
- **Spike bottom sheet** (done, retro Epic 2) : `<dialog>` natif avec `showModal()`, focus trap gratuit, drag touch, snap 3 positions, backdrop keyframes, popstate guard

## References

- **FRs** : FR24 (navigation vers fiche detaillee equipe)
- **UX-DRs** : UX-DR9 (Bottom Sheet fiche equipe — 2 hauteurs, poignee drag, overlay, contenu detaille), UX-DR14 (feedback tactile scale 0.97), UX-DR17 (zones tactiles 48px), UX-DR18 (aria-labels)
- **Architecture** : `src/components/bottom-sheet.js` + `src/styles/components/bottom-sheet.css`
- **JSON** : `teams[]` avec `id`, `name`, `currentRank`, `projectedRank`, `elo`, `confidence`, `zones`, `form`, `trend` + `calendar[]` avec `matchday`, `date`, `home`, `away`, `difficulty`
- **Router** : `router.js` exporte `pushSheet(sheetId)` et gere popstate → `set('activeSheet', null)`
- **Store keys** : `activeSheet` (event `sheet-opened`), `selectedTeam` (event `team-selected`)
- [Source: planning-artifacts/architecture.md — section bottom-sheet.js, router.js]
- [Source: planning-artifacts/ux-design-specification.md — section "Bottom Sheet — Fiche Equipe"]
- [Source: planning-artifacts/epics.md — Story 3.4]
- [Source: implementation-artifacts/epic-2-retro — Spike Bottom Sheet]

## Acceptance Criteria (BDD)

1. **Given** le classement est affiche
   **When** l'utilisateur tape sur une ligne d'equipe
   **Then** un bottom sheet s'ouvre en slide up (300ms ease-out) avec overlay sombre 40% (FR24, UX-DR9)
   **And** le store est mis a jour : `selectedTeam` = id de l'equipe, `activeSheet` = 'team-detail'
   **And** une entree history est poussee via `pushSheet()`

2. **Given** le bottom sheet est ouvert
   **When** on inspecte son contenu
   **Then** il affiche : header (logo + nom + position actuelle/projetee), Elo avec jauge, forme recente (5 derniers matchs V/D/N), calendrier a venir avec difficulte, probabilites par zone (UX-DR9)

3. **Given** le bottom sheet est ouvert
   **When** il s'ouvre
   **Then** il s'ouvre a mi-hauteur par defaut (~50dvh) (UX-DR9)
   **And** l'utilisateur peut drag up pour passer en plein ecran (~0dvh)
   **And** la poignee de drag est une barre grise 40x4px en haut

4. **Given** le bottom sheet est ouvert
   **When** l'utilisateur swipe down, tape sur l'overlay, ou tape le bouton fermer
   **Then** le bottom sheet se ferme en slide down (200ms ease-in) (UX-DR9)
   **And** le store est mis a jour : `activeSheet` = null, `selectedTeam` = null

5. **Given** le bottom sheet est ouvert
   **When** l'utilisateur appuie sur le bouton back Android
   **Then** le bottom sheet se ferme (via router popstate → `set('activeSheet', null)`) (UX-DR9)
   **And** l'animation de fermeture joue avant `dialog.close()`

6. **Given** le bottom sheet est ouvert
   **When** on inspecte le DOM
   **Then** le bottom sheet est un `<dialog>` avec `role="dialog"`, `aria-modal="true"` (UX-DR9)
   **And** le focus est piege dans le dialog (focus trap natif via `showModal()`)
   **And** un bouton fermer explicite est present pour l'accessibilite

7. **Given** un bottom sheet est deja ouvert
   **When** l'utilisateur essaie d'en ouvrir un autre
   **Then** jamais plus d'un bottom sheet ouvert a la fois

8. **Given** les lignes d'equipe sont rendues
   **When** l'utilisateur tape sur une ligne
   **Then** la ligne effectue un scale 0.97 (feedback tactile, UX-DR14) avant l'ouverture du sheet

9. **Given** `prefers-reduced-motion` est active
   **When** le bottom sheet s'ouvre ou se ferme
   **Then** pas de transition animee — apparition/disparition instantanee (opacity seulement)

10. **Given** le bottom sheet est ouvert pour une equipe
    **When** on inspecte les probabilites par zone
    **Then** les probabilites sont affichees en pourcentages (conversion depuis les decimales 0-1 du JSON)
    **And** chaque zone est identifiable visuellement (couleur coherente avec les zones du classement)

## Taches Techniques

### T1 — Creer `src/components/bottom-sheet.js`

- [ ] Exporter `render(container)` qui cree le `<dialog>` et l'insere dans le container (ou dans `document.body`)
- [ ] Exporter `open(team, season)` qui remplit le contenu et appelle `dialog.showModal()`
- [ ] Exporter `close()` qui anime la fermeture puis appelle `dialog.close()`
- [ ] Utiliser `<dialog>` natif — focus trap, aria-modal, backdrop gratuits via `showModal()`
- [ ] Structure HTML du dialog :
  ```html
  <dialog class="w-bottom-sheet" aria-label="Fiche {nom equipe}">
    <div class="w-bottom-sheet__handle" aria-hidden="true"></div>
    <button class="w-bottom-sheet__close" aria-label="Fermer">✕</button>
    <div class="w-bottom-sheet__content">
      <header class="w-bottom-sheet__header">
        <!-- logo + nom + positions actuelle/projetee -->
      </header>
      <section class="w-bottom-sheet__elo">
        <!-- Elo + jauge visuelle -->
      </section>
      <section class="w-bottom-sheet__form" aria-label="Forme recente">
        <!-- 5 derniers matchs V/D/N -->
      </section>
      <section class="w-bottom-sheet__calendar" aria-label="Prochains matchs">
        <!-- calendrier avec difficulte -->
      </section>
      <section class="w-bottom-sheet__zones" aria-label="Probabilites par zone">
        <!-- barres horizontales par zone -->
      </section>
    </div>
  </dialog>
  ```
- [ ] Contenu header : logo placeholder (meme pattern que rank-row — initiales + couleur), nom equipe, `Xeme → Yeme` (actuel → projete), fleche tendance
- [ ] Contenu Elo : score numerique + jauge visuelle (barre horizontale positionnee entre min/max Elo du championnat)
- [ ] Contenu forme : 5 pastilles V (vert) / D (rouge) / N (gris) pour `team.form`
- [ ] Contenu calendrier : filtrer `season.calendar` pour les matchs a venir de l'equipe (pas seulement La Rochelle), max 5 matchs, afficher adversaire + venue (dom/ext) + difficulte
- [ ] Contenu zones : barres horizontales pour chaque zone (`europe`, `top6`, `mid`, `relegation`), largeur proportionnelle a la probabilite, label en pourcentage
- [ ] Confiance : afficher la valeur numerique de confiance (seul endroit ou le chiffre est visible, cf UX-DR10)
- [ ] Drag touch sur le handle uniquement :
  - `touchstart` sur `.w-bottom-sheet__handle` : memoriser Y initial, `{ passive: false }`
  - `touchmove` : calculer delta Y, appliquer `transform: translateY()` au dialog
  - `touchend` : snap decision — si velocity > seuil ou position > 75dvh → fermer, sinon snap a mi-hauteur ou plein ecran
- [ ] Guard double-close : ne pas appeler `dialog.close()` si deja ferme
- [ ] Animer AVANT `dialog.close()` (gotcha spike : close retire du top layer instantanement)
- [ ] Fallback `setTimeout` pour `transitionend` (gotcha spike : event peut ne pas fire)
- [ ] Utiliser `dvh` au lieu de `vh` (gotcha spike)

### T2 — Creer `src/styles/components/bottom-sheet.css`

- [ ] Import dans le composant JS (pattern : `import '../styles/components/bottom-sheet.css'`)
- [ ] Classe `w-bottom-sheet` (prefixe `w-`)
- [ ] Dialog positionne en bas : `position: fixed`, coins arrondis en haut 16px
- [ ] Poignee drag : barre centree 40x4px, gris `var(--w-color-muted)`, border-radius 2px
- [ ] Bouton fermer : position absolue en haut a droite, zone tactile 48x48px (UX-DR17)
- [ ] Overlay/backdrop : `dialog::backdrop` avec `background: rgba(0,0,0,0.4)`, anime via `@keyframes` (pas `transition` — gotcha compat)
- [ ] Etats de hauteur via `transform: translateY()` :
  - Mi-hauteur : `translateY(50dvh)` (defaut a l'ouverture)
  - Plein ecran : `translateY(0)`
  - Ferme : `translateY(100dvh)`
- [ ] Transitions : `transform 300ms ease-out` (ouverture), `transform 200ms ease-in` (fermeture)
- [ ] Scroll interne : `overflow-y: auto` sur `.w-bottom-sheet__content`
- [ ] Forme recente : pastilles 32px rondes, V vert, D rouge, N gris, gap 8px
- [ ] Probabilites par zone : barres horizontales, hauteur 24px, couleurs coherentes avec `--w-color-qualif`, `--w-color-top6`, `--w-color-mid`, `--w-color-relegation`
- [ ] `@media (prefers-reduced-motion: reduce)` : `transition: none`, apparition/disparition instantanee
- [ ] Focus visible : outline conforme WCAG AA sur bouton fermer et elements interactifs
- [ ] `touch-action: manipulation` sur le handle et le dialog
- [ ] `will-change: transform` sur le dialog (gotcha retro : GPU compositing)

### T3 — Ajouter le tap handler sur les lignes d'equipe (rank-row.js)

- [ ] Dans `rank-row.js`, rendre chaque `w-rank-row` tappable :
  - Ajouter `role="button"` et `tabindex="0"` sur le `w-rank-row` div
  - Listener `click` (couvre touch et clavier) → `set('selectedTeam', team.id)` + `pushSheet('team-detail')`
  - Listener `pointerdown` → ajout classe `is-pressed` (scale 0.97)
  - Listeners `pointerup`/`pointerleave`/`pointercancel` → retrait classe `is-pressed`
  - Support clavier : `keydown` Enter/Space → meme action que click
  - `touch-action: manipulation` via CSS sur `.w-rank-row`

### T4 — Integration dans `src/app.js`

- [ ] Importer `render as renderBottomSheet, open as openBottomSheet, close as closeBottomSheet` depuis `bottom-sheet.js`
- [ ] Appeler `renderBottomSheet(document.body)` au demarrage (le dialog est ajoute une seule fois au body)
- [ ] Ecouter `on('selectedTeam', ...)` : quand une equipe est selectionnee et `activeSheet` = 'team-detail', trouver l'equipe dans les donnees de saison et appeler `openBottomSheet(team, season)`
- [ ] Ecouter `on('activeSheet', ...)` : quand `activeSheet` passe a null, appeler `closeBottomSheet()`
- [ ] Import et usage de `pushSheet` depuis `router.js` (deja exporte)

### T5 — Tests

- [ ] Fichier : `tests/bottom-sheet.test.js` (ou `src/__tests__/bottom-sheet.test.js` selon le pattern existant)
  - [ ] Test : le dialog est cree avec la classe `w-bottom-sheet`
  - [ ] Test : `open(team, season)` remplit le contenu (nom equipe, Elo, forme, calendrier, zones)
  - [ ] Test : le dialog a `aria-label` contenant le nom de l'equipe
  - [ ] Test : un bouton fermer explicite est present avec `aria-label="Fermer"`
  - [ ] Test : les probabilites par zone sont converties en pourcentages (pas en decimales)
  - [ ] Test : le calendrier filtre les matchs a venir pour l'equipe selectionnee (pas seulement La Rochelle)
  - [ ] Test : le contenu forme affiche 5 elements correspondant a `team.form`
  - [ ] Test : guard double-close ne lance pas d'erreur
  - [ ] Test : le handle drag element existe avec les bonnes dimensions
- [ ] Fichier : `tests/rank-row-tap.test.js` (ou integration dans les tests rank-row existants)
  - [ ] Test : click sur rank-row appelle `set('selectedTeam', teamId)` et `pushSheet('team-detail')`
  - [ ] Test : rank-row a `role="button"` et `tabindex="0"`
  - [ ] Test : pointerdown ajoute `is-pressed`, pointerup le retire

## Dev Notes

### Spike Bottom Sheet (retro Epic 2) — decisions prises

Le spike a valide l'approche technique suivante :
- `<dialog>` natif avec `showModal()` : focus trap, `aria-modal`, backdrop gratuits
- Slide via CSS `transform: translateY()` + transition 300ms ease-out
- Drag via touch events sur le handle uniquement, `{ passive: false }` pour touchmove
- Snap 3 positions : ferme (100dvh), mi-hauteur (50dvh), plein ecran (0)
- Backdrop anime via `@keyframes` (pas `transition` pour compatibilite)
- Popstate : animer → `dialog.close()` → `history.back()`, guard double-close
- Gotcha : `dialog.close()` retire du top layer instantanement — toujours animer avant
- Gotcha : `transitionend` peut ne pas fire — fallback `setTimeout`
- Gotcha : utiliser `dvh` au lieu de `vh`

### Donnees JSON disponibles

Pour la fiche equipe, toutes les donnees sont dans le JSON de saison :
- `teams[].id`, `.name`, `.currentRank`, `.projectedRank`, `.elo`, `.confidence`, `.zones` (4 cles: europe, top6, mid, relegation), `.form` (array V/D/N), `.trend`
- `calendar[]` avec `.matchday`, `.date`, `.home`, `.away`, `.difficulty` (0-1)
- Les noms d'equipes sont disponibles via `teams[]` pour resoudre les IDs en noms

### Store keys utilisees

- `selectedTeam` (string | null) : ID de l'equipe dont la fiche est ouverte (event `team-selected`)
- `activeSheet` (string | null) : 'team-detail' quand le bottom sheet est ouvert (event `sheet-opened`)
- `season` : donnees completes de saison (pour trouver l'equipe et le calendrier)

### Router integration

`router.js` exporte deja `pushSheet(sheetId)` qui pousse un state history et met a jour `activeSheet` dans le store. Le popstate met `activeSheet` a null. Le bottom sheet doit ecouter ce changement pour animer la fermeture avant `dialog.close()`.

### Pattern de rendu

- Le dialog est cree une seule fois et ajoute au body (pas dans le layout page — un dialog doit etre en top-level pour `showModal()`)
- A chaque `open()`, le contenu est rempli/remplace
- A chaque `close()`, l'animation joue puis `dialog.close()`

### Conventions a respecter

| Convention | Valeur |
|---|---|
| Fichier JS | `src/components/bottom-sheet.js` |
| Fichier CSS | `src/styles/components/bottom-sheet.css` |
| Classes CSS | `w-bottom-sheet`, `w-bottom-sheet__handle`, `w-bottom-sheet__close`, `w-bottom-sheet__content`, `w-bottom-sheet__header`, `w-bottom-sheet__elo`, `w-bottom-sheet__form`, `w-bottom-sheet__calendar`, `w-bottom-sheet__zones` |
| Export | `render(container)`, `open(team, season)`, `close()` |
| Communication | Via store (`selectedTeam`, `activeSheet`) et router (`pushSheet`) |
| Animations | `transform` uniquement (translateY pour slide, scale pour feedback tactile), `opacity` pour backdrop |
| Reduced motion | `matchMedia` ou CSS — pas de transition |

### Anti-patterns a eviter

- Ne PAS creer le dialog a chaque ouverture — le creer une fois, remplir/vider le contenu
- Ne PAS fermer le dialog avec `dialog.close()` directement — toujours animer d'abord
- Ne PAS utiliser `transition` sur `::backdrop` — utiliser `@keyframes` pour la compatibilite
- Ne PAS ecouter les touch events sur tout le dialog — uniquement sur le handle
- Ne PAS utiliser `vh` — utiliser `dvh` (viewport dynamique sur mobile)
- Ne PAS muter le state directement — passer par `set()` dans le store
- Ne PAS coupler bottom-sheet.js directement a rank-row.js — communication via le store

## Code Review — 2026-03-29

**Verdict : Changes Requested**

### Ce qui est bien fait

- Dialog cree une seule fois et reutilise (anti-pattern evite)
- Animation avant `dialog.close()` avec fallback `setTimeout` (gotcha spike respecte)
- Backdrop anime via `@keyframes` et non `transition` (gotcha compatibilite respecte)
- `dvh` utilise au lieu de `vh`
- Communication via store uniquement, aucun couplage direct entre composants
- `prefers-reduced-motion` gere en CSS avec desactivation de toutes les animations
- Zone tactile 48x48px sur le bouton fermer (UX-DR17)
- `role="button"` et `tabindex="0"` sur rank-row avec support clavier Enter/Space
- Focus visible outline conforme WCAG AA
- Guard double-close via `isClosing` flag
- Probabilites converties de 0-1 en pourcentages dans l'UI (convention JSON respectee)
- Tests bottom-sheet : 23/23 green

### F1 — Important : `selectedTeam` n'est jamais remis a null (violation AC4)

AC4 stipule : *"le store est mis a jour : `activeSheet` = null, `selectedTeam` = null"*. Le router popstate met `activeSheet` a null, mais `selectedTeam` n'est jamais reset. Ni `close()` dans `bottom-sheet.js`, ni le listener `on('activeSheet')` dans `app.js` ne font `set('selectedTeam', null)`.

**Risque** : valeur stale dans le store pouvant provoquer un comportement inattendu (rouvrir le sheet pour la mauvaise equipe si `activeSheet` est re-set sans nouvelle selection).

**Correction** : dans `src/app.js` ligne 74-77, le listener `on('activeSheet')` doit ajouter `set('selectedTeam', null)` quand `value === null`.

### F2 — Important : tests rank-row tap manquants (T5 story)

La story specifie un fichier `tests/rank-row-tap.test.js` (T5) avec 3 tests : click → set/pushSheet, role/tabindex, pointerdown/pointerup is-pressed. Ce fichier n'existe pas. L'absence de ces tests signifie qu'une regression sur l'interaction rank-row ne serait pas detectee.

### S1 — Suggestion : duplication TEAM_COLORS et getInitials

`TEAM_COLORS` et `getInitials` sont dupliquees mot pour mot entre `bottom-sheet.js` et `rank-row.js`. Non bloquant (CLAUDE.md interdit les `utils.js` fourre-tout) mais a considerer si un module semantiquement clair (`team-colors.js`) est cree plus tard.

## Code Review — Cycle 2 — 2026-03-29

**Verdict : Approved**

### Verification des corrections

- **F1 (selectedTeam jamais reset)** : CORRIGE. `src/app.js` lignes 74-80, le listener `on('activeSheet')` appelle `set('selectedTeam', null)` quand `value === null`. AC4 satisfait.
- **F2 (tests rank-row tap manquants)** : CORRIGE. `tests/rank-row-tap.test.js` cree avec 3 tests (click → set/pushSheet, role/tabindex, pointerdown/pointerup is-pressed). Tous green.

### Re-check complet

- `bottom-sheet.js` : guard double-close, cancel event handler, exports corrects, pas de probleme
- `bottom-sheet.css` : reduced-motion, dvh, will-change, keyframes backdrop — tout conforme
- `rank-row.js` : accessibilite (role, tabindex, keyboard), feedback tactile, communication store — tout conforme
- `app.js` : dialog cree une fois sur body, listeners store corrects, guard sur teamId et activeSheet
- `router.js` : pushSheet et popstate conformes

### Resultats

- Tests : 26/26 green (23 bottom-sheet + 3 rank-row-tap)
- Biome : 0 erreurs
- Aucun bug, vulnerabilite, violation d'architecture ou probleme de correction detecte
