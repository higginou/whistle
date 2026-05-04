# Story 3.1 : Zones de classement et lignes d'equipe

Status: done

## ui-structural

**ui-structural: true**

Cette story cree deux nouveaux composants UI structurels (zone-group et rank-row) qui n'existent pas encore dans le codebase, ainsi que le composant confidence-bar integre dans rank-row. Elle necessite une validation design avant implementation.

## Maquettes

Les maquettes doivent etre produites dans `_bmad-output/mockups/epic-3/` :

- [ ] `zones-rank-variant-a.html` — zones empilees avec headers colores et lignes cartes
- [ ] `zones-rank-variant-b.html` — zones avec bordures laterales continues
- [ ] `zones-rank-variant-c.html` — variante compacte, headers minimalistes

**GO higgin: oui** — Variante B (grouped) retenue. Correction : la premiere zone n'est pas "Champions Cup" mais "Demi-finales".

> **GATE BLOQUANT** : cette story ne peut PAS passer en `in-progress` tant que `GO higgin: oui` n'est pas enregistre. Aucun code UI ne doit etre ecrit avant ce GO.

## Story

En tant qu'utilisateur,
Je veux voir le classement actuel des 14 equipes organise par zones colorees,
Afin de comprendre d'un coup d'oeil la position de chaque equipe dans le championnat.

## Dependencies

- **2-1** (done) : Design tokens et fondation visuelle — tokens `--w-*` (zone colors, confidence colors, spacing, radius, shadow), typographie Nunito, grille 8px
- **2-2** (done) : Store d'etat, fetch donnees et router — `store.js` (get/set/on), `data.js` (loadSeason), `router.js`
- **2-3** (done) : Layout page principale et structure HTML semantique — `page-layout.js` avec section `w-standings-section`

## References

- **FRs** : FR20 (classement 14 equipes), FR22 (zones visuelles), FR23 (confiance par equipe)
- **UX-DRs** : UX-DR7 (zone de classement), UX-DR8 (ligne d'equipe), UX-DR10 (indicateur confiance), UX-DR15 (HTML semantique), UX-DR17 (zones tactiles 48px), UX-DR18 (aria-labels)
- **Architecture** : `src/components/zone-group.js`, `src/components/rank-row.js`, `src/components/confidence-bar.js` + CSS correspondants (1 composant = 1 JS + 1 CSS)
- **JSON** : `teams[]` avec `id`, `name`, `currentRank`, `projectedRank`, `elo`, `confidence`, `zones`, `trend`

## Acceptance Criteria (BDD)

1. **Given** les donnees de saison sont dans le store
   **When** le classement s'affiche
   **Then** les 14 equipes sont affichees dans leur position actuelle (`currentRank`) (FR20)

2. **Given** les donnees de saison sont dans le store
   **When** le classement s'affiche
   **Then** les equipes sont regroupees en 4 zones : Demi-finales (violet), Phases finales (vert), Ventre mou (gris), Maintien (rouge) (FR22, UX-DR7)
   **And** chaque zone a un header colore et un fond teinte (violet pale `--w-color-qualif-bg`, vert pale `--w-color-top6-bg`, gris pale `--w-color-mid-bg`, rouge pale `--w-color-relegation-bg`)

3. **Given** le classement est rendu
   **When** on inspecte la structure HTML
   **Then** chaque zone est une `<section>` avec `aria-label` (ex: "Zone Demi-finales, 2 equipes") (UX-DR15)
   **And** chaque zone a un heading `<h2>` pour le nom de zone
   **And** les equipes dans chaque zone sont dans un `<ul>/<li>` (UX-DR15)

4. **Given** le classement est rendu
   **When** on inspecte une ligne d'equipe
   **Then** chaque ligne affiche : position, logo 28px, nom + Elo, delta colore (fleches), barre confiance 4px (UX-DR8)
   **And** l'anatomie suit : `[Position] [Logo 28px] [Nom + Elo] [Delta colore] [Confiance 4px bar]`

5. **Given** l'equipe est La Rochelle
   **When** sa ligne est rendue
   **Then** elle a une bordure violet accentuee et nom violet bold (UX-DR8)

6. **Given** une equipe a une confiance de 0.75
   **When** sa barre de confiance est rendue
   **Then** la barre est verte (>0.70 = `--w-color-confidence-high`) (FR23, UX-DR10)

7. **Given** une equipe a une confiance de 0.55
   **When** sa barre de confiance est rendue
   **Then** la barre est orange (0.40-0.70 = `--w-color-confidence-mid`) (UX-DR10)

8. **Given** une equipe a une confiance de 0.30
   **When** sa barre de confiance est rendue
   **Then** la barre est rouge pale (<0.40 = `--w-color-confidence-low`) (UX-DR10)

9. **Given** la barre de confiance est rendue
   **When** on inspecte le DOM
   **Then** elle a `role="meter"` avec `aria-valuemin="0"`, `aria-valuemax="1"`, `aria-valuenow` (valeur decimale), et `aria-label` descriptif (UX-DR10, UX-DR18)

10. **Given** une ligne d'equipe est rendue
    **When** on inspecte son `aria-label`
    **Then** il contient position, nom, Elo, mouvement et niveau de confiance (ex: "7eme, La Rochelle, Elo 1575, monte de 2 places, confiance elevee") (UX-DR18)

11. **Given** le classement est rendu
    **When** on mesure les zones tactiles
    **Then** chaque ligne fait 48px minimum de hauteur avec 8px d'espacement entre lignes (UX-DR17)
    **And** `touch-action: manipulation` est applique sur les lignes tappables

12. **Given** les donnees de saison sont dans le store
    **When** les donnees changent (store event `season-loaded`)
    **Then** le classement se re-rend avec les nouvelles donnees

## Regles de Repartition des Equipes en Zones

Les 14 equipes du TOP 14 sont reparties en zones selon leur `currentRank` :

| Zone | Rangs | Equipes | Description |
|------|-------|---------|-------------|
| Demi-finales | 1-2 | 2 | Qualification directe en demi-finales |
| Phases finales | 3-6 | 4 | Barrages puis eventuellement demi-finales |
| Ventre mou | 7-12 | 6 | Milieu de tableau |
| Maintien | 13-14 | 2 | Barrage / Relegation |

## Taches Techniques

### T1 — Creer `src/components/zone-group.js` + `src/styles/components/zone-group.css`

- Exporter `render(container, zones)` qui recoit la section `w-standings-section` et les donnees des zones
- Chaque zone est une `<section>` avec classe `w-zone-group` et modificateur de zone (`w-zone-group--qualif`, etc.)
- Header `<h2>` avec classe `w-zone-group__header` et le nom de zone
- Fond teinte via la custom property de zone (`--w-color-qualif-bg`, etc.)
- Bordure gauche coloree via la custom property de zone (`--w-color-qualif`, etc.)
- `aria-label` dynamique : "Zone Demi-finales, 2 equipes" (pluriel gere)
- Contient un `<ul class="w-zone-group__list">` pour les lignes d'equipe

### T2 — Creer `src/components/rank-row.js` + `src/styles/components/rank-row.css`

- Exporter `render(listElement, team)` qui cree un `<li>` dans la liste de zone
- Structure interne : position (span), logo (img 28px), nom + Elo (div), delta (span avec fleche + couleur), barre confiance
- Classe `w-rank-row` + modificateur `w-rank-row--favorite` pour La Rochelle (`id === 'la-rochelle'`)
- Delta colore : vert + fleche haut si `trend === 'up'`, rouge + fleche bas si `trend === 'down'`, gris si `stable`
- `aria-label` descriptif genere dynamiquement a partir des donnees de l'equipe
- Hauteur minimum 48px, `touch-action: manipulation`
- Fond blanc eleve (`--w-color-surface-elevated`), ombre subtile (`--w-shadow-card`), coins arrondis (`--w-radius-card`)
- Chiffres tabulaires (`font-feature-settings: "tnum"`) pour l'alignement des positions et Elo

### T3 — Creer `src/components/confidence-bar.js` + `src/styles/components/confidence-bar.css`

- Exporter `render(container, confidence)` qui cree la barre dans le rank-row
- Barre fine 4px, largeur proportionnelle a la confiance (0-1)
- 3 paliers de couleur : `--w-color-confidence-high` (>0.70), `--w-color-confidence-mid` (0.40-0.70), `--w-color-confidence-low` (<0.40)
- `role="meter"`, `aria-valuemin="0"`, `aria-valuemax="1"`, `aria-valuenow` = valeur decimale
- `aria-label` : "Confiance de la projection : elevee/moyenne/basse"

### T4 — Connecter au store et rendre dans le layout

- Dans `app.js`, ecouter le store `on('season', callback)`
- Extraire `teams[]` des donnees de saison
- Trier par `currentRank`
- Repartir en zones selon les rangs (1-2 Demi-finales, 3-6 Top 6, 7-12 Ventre mou, 13-14 Maintien)
- Appeler `zone-group.render()` pour chaque zone dans la section `w-standings-section`
- Gerer le re-render quand les donnees changent

### T5 — Logos des equipes

- Utiliser des placeholders pour les logos (initiales dans un cercle colore, ou image generique)
- Les vrais logos seront ajoutes ulterieurement si necessaire (droits d'image)
- Le placeholder doit faire 28px et etre centre verticalement dans la ligne

### T6 — Tests manuels de validation

- [ ] Les 14 equipes sont visibles dans le bon ordre
- [ ] Les 4 zones sont distinctes visuellement (header + fond teinte)
- [ ] La Rochelle a le style favori (bordure violet, nom bold violet)
- [ ] Les barres de confiance refletent les 3 paliers
- [ ] Les aria-labels sont corrects (inspecter via DevTools)
- [ ] Les lignes font 48px minimum de hauteur
- [ ] Le classement se re-rend quand on change les donnees dans le store (test console)
- [ ] `touch-action: manipulation` est present sur les lignes
- [ ] Le scroll est fluide avec les 14 equipes + 4 headers de zone

## Notes Techniques

- Les logos d'equipe ne sont pas disponibles — utiliser des placeholders (initiales dans un cercle) pour cette story. La gestion des logos reels est hors scope.
- Le tap sur une ligne d'equipe sera connecte au bottom sheet dans la story 3-4. Pour cette story, le tap ne fait rien (pas de handler click).
- Le classement affiche uniquement les positions actuelles (`currentRank`). L'animation vers les positions projetees est story 3-2.
- Le delta affiche dans la ligne est base sur le champ `trend` ("up"/"down"/"stable"), pas sur la difference currentRank vs projectedRank.
- Spike retro2-motion-v12 confirme : `animate` depuis `motion/mini` (~2.5KB gz) + `spring` depuis `motion` (~0.5KB gz). Pertinent pour story 3-2 mais bon a savoir.
- Spike retro2-strategie-test-animations : unit test logic/config, mock `animate()`, validation visuelle manuelle.

## Definition of Done

- [ ] `npx biome check .` passe sans erreur
- [ ] Tests manuels T6 tous valides
- [ ] Fichier story mis a jour avec `Status: done`
- [ ] `sprint-status.yaml` mis a jour avec `done`
- [ ] Code review effectuee
- [ ] Commit git avec reference story

## Code Review — 2026-03-29

**Reviewer:** Claude Opus 4.6 (code-review, 3 layers)
**Verdict:** Changes Requested

### Finding 1 — BUG (Blind Hunter) — `app.js` line 35-36

**Severite:** Haute
**Fichier:** `src/app.js:35-36`

Quand `value` est null (pas de donnees de saison), `appEl.innerHTML = '<p ...>'` detruit tout le layout (hero, standings, score card, badge). Les references capturees aux lignes 15-18 (`heroSection`, `standingsSection`) deviennent des noeuds detaches du DOM. Si une saison est ensuite chargee avec succes, `standingsSection` pointe vers un element orphelin et le rendu des zones echoue silencieusement.

**Correctif:** Ne pas remplacer tout le `innerHTML` de `appEl`. Soit injecter le message vide uniquement dans `standingsSection`, soit ajouter/retirer un element overlay sans detruire la structure existante.

### Finding 2 — BUG (Edge Case Hunter) — Pas de garde null sur `team.confidence`

**Severite:** Moyenne
**Fichier:** `src/components/rank-row.js:140`, `src/components/confidence-bar.js:22`

Si `team.confidence` est `undefined` ou `null` (donnee manquante ou corrompue), `Math.round(undefined * 100)` produit `NaN`. Le DOM resultant contient `width: NaN%` et le label affiche `NaN%`. Pas de crash, mais rendu visuellement casse.

**Correctif:** Ajouter un fallback dans `confidence-bar.js render()` : `const safe = typeof confidence === 'number' ? confidence : 0`.

### Finding 3 — ARCHITECTURE VIOLATION (Edge Case Hunter) — Animation de `width`

**Severite:** Basse
**Fichier:** `src/styles/components/confidence-bar.css:22`

La regle `transition: width 0.3s ease` anime la propriete `width`, ce qui viole la convention du projet : "Only animate transform and opacity". L'impact perf est negligeable sur une barre de 4px, mais c'est une violation explicite des regles.

**Correctif:** Remplacer par `transition: none` ou utiliser `transform: scaleX()` avec `transform-origin: left` pour animer la barre.

### Findings non-bloquants (informatifs)

- **AC11 espacement lignes:** Le `gap: 1px` dans `zone-group__list` ne correspond pas aux 8px specifies dans l'AC. A verifier si c'est un choix delibere du design retenu (variante B). Non bloquant car le design a ete valide par higgin.
- **Tests:** 10/10 passent, biome 0 erreur. Couverture limitee aux fonctions pures (`assignTeamsToZones`, `getConfidenceLevel`) — adequat pour cette story sans JSDOM.

### Resume

| # | Type | Severite | Bloquant |
|---|------|----------|----------|
| 1 | Bug — innerHTML detruit le layout | Haute | Oui |
| 2 | Bug — NaN si confidence manquante | Moyenne | Oui |
| 3 | Architecture — transition width | Basse | Non |

**Verdict final : Changes Requested** — Les findings 1 et 2 doivent etre corriges avant de passer a `done`.
