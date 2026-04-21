---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
lastStep: 8
status: 'complete'
completedAt: '2026-03-28'
inputDocuments: ['planning-artifacts/prd.md', 'planning-artifacts/ux-design-specification.md']
workflowType: 'architecture'
project_name: 'Whistle'
user_name: 'higgin'
date: '2026-03-28'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
38 FRs reparties en 7 domaines : Pipeline/Donnees (FR1-5), Modele Predictif (FR6-13), Vue Equipe Favorite (FR14-19), Classement Anime (FR20-24), Transparence Modele (FR25-32, Phase 2), Simulateur (FR33-35, Phase 2/3), PWA/Offline (FR36-38). Le MVP couvre FR1-24 + FR36-38 (27 FRs). Les FRs Phase 2/3 (FR25-35) sont des extensions qui n'impactent pas l'architecture fondamentale.

Architecture a deux systemes distincts :
- **Pipeline (CI/CD)** : scraping, validation, modele Elo, generation JSON — execute dans GitHub Actions, aucune interaction utilisateur
- **Front-end (PWA)** : consommation JSON, affichage, animations, offline — execute dans le navigateur, toute l'interaction utilisateur

Le JSON statique est le seul point de couplage entre les deux systemes.

**Non-Functional Requirements:**
- Performance : < 2s chargement 4G, < 1s depuis cache, 60fps animations, < 200Ko assets gzipped, < 50Ko JSON/saison
- Fiabilite pipeline : 0 intervention manuelle sur une saison, retry automatique, alerte apres 3 echecs
- Offline : PWA installable, cache-first assets, network-first donnees, fonctionnement complet hors ligne
- Accessibilite : WCAG AA, zones tap 48px, prefers-reduced-motion, HTML semantique, aria-labels
- Maintenabilite : developpeur solo, zero dependance serveur, infrastructure cout zero

**Scale & Complexity:**

- Domaine principal : Front-end PWA + CI/CD Pipeline
- Niveau de complexite : Faible (infra/data) / Moyen (UX/animations)
- Composants architecturaux estimes : ~8-10 (pipeline scraping, modele Elo, generateur JSON, Service Worker, moteur d'animation, composants UI, gestionnaire de cache, gestionnaire d'etat)

### Technical Constraints & Dependencies

- Hebergement statique gratuit (GitHub Pages ou Vercel) — pas de serveur, pas de fonctions cloud
- Source de donnees primaire : site LNR (scraping HTML) — instable par nature, necessite resilience
- Source de fallback : API-Sports — endpoint structure, plus fiable
- GitHub Actions comme seul environnement d'execution backend
- Chrome Android comme navigateur primaire, Firefox/Samsung Internet secondaires
- Budget taille strict : chaque Ko compte dans le budget de 200Ko
- JS vanilla ou micro-framework leger — pas de React/Vue/Angular
- Motion One (~4Ko) + Open Props (~2Ko) comme seules dependances front-end significatives

### Cross-Cutting Concerns Identified

1. **Schema JSON (contrat pipeline <> front)** : definit les donnees de classement, projections, confiance, historique. Toute modification impacte les deux systemes
2. **Strategie de cache Service Worker** : cache-first (assets statiques) vs network-first (JSON donnees) avec detection silencieuse de mise a jour et badge "Nouveau"
3. **Historique append-only des predictions** : chaque semaine ajoute une entree — impacte la taille du JSON, la structure de stockage, et les vues historiques futures
4. **Gestion des etats de donnees** : donnees fraiches vs cache vs offline vs erreur pipeline — chaque composant UI doit gerer ces etats de maniere coherente
5. **Animation comme systeme** : les regles de graduation (0/+-1/+-2/+-3+), le stagger, le traitement special de l'equipe favorite — c'est un systeme transversal qui touche tous les composants visuels
6. **Abstraction source de donnees pipeline** : le passage LNR vers API-Sports ne doit modifier que le module de scraping — necessite une interface propre dans le pipeline

## Starter Template Evaluation

### Primary Technology Domain

Front-end PWA vanilla JavaScript avec pipeline CI/CD Node.js, base sur l'analyse des exigences projet.

### Starter Options Considered

| Option | Avantages | Inconvenients |
|---|---|---|
| **Vite + vite-plugin-pwa (vanilla)** | Build optimise, HMR, SW automatique, tree-shaking, zero runtime | Necessite Node.js en dev |
| PWABuilder pwa-starter-basic | Minimaliste, proche du metal | Pas de bundler, pas de HMR, pas de tree-shaking |
| Full custom sans build tool | Zero dependance de build | Pas de minification, SW a ecrire manuellement, imports manuels |

### Selected Starter: Vite + vite-plugin-pwa (vanilla template)

**Rationale:**
Vite fournit l'outillage de build sans impacter le runtime (zero Ko ajoute au bundle final). vite-plugin-pwa automatise la generation du Service Worker (Workbox), du manifest, et du precaching — couvrant directement les exigences PWA (FR36-38). Le template vanilla donne un point de depart vierge, aligne avec le choix "JS vanilla ou micro-framework leger" du PRD.

**Initialization Command:**

```bash
npm create @vite-pwa/pwa@latest whistle -- --template vanilla
```

**Dependencies additionnelles a installer post-init :**

```bash
npm install motion open-props
```

**Architectural Decisions Provided by Starter:**

**Language & Runtime:**
JavaScript vanilla (ES modules natifs). Pas de TypeScript — coherent avec la simplicite du projet et le profil developpeur solo intermediate.

**Styling Solution:**
CSS custom + Open Props v1.7.x pour les design tokens (couleurs, espacements, easings). Tree-shaking via PostCSS pour ne livrer que les tokens utilises. Aucun framework CSS.

**Build Tooling:**
Vite 7 — bundling, minification, tree-shaking, HMR en dev. Build de production optimise pour le budget de 200Ko gzipped.

**Animation:**
Motion v12.x (anciennement Motion One) — APIs vanilla JS (`animate`, `spring`, `stagger`). Construit sur le Web Animations API pour des animations GPU-composited a 60fps.

**PWA / Service Worker:**
vite-plugin-pwa v1.0 avec Workbox — generation automatique du SW, strategies de cache configurables (cache-first pour assets, network-first pour JSON donnees), precaching des assets statiques, manifest.json genere.

**Code Organization:**
Structure plate initiale. L'organisation en modules (composants UI, moteur d'animation, gestionnaire d'etat, Service Worker config) sera definie dans les decisions architecturales suivantes.

**Development Experience:**
HMR Vite pour iteration rapide sur les animations. Dev server local. Pas de TypeScript, pas de linter pre-configure (a ajouter si souhaite).

**Note:** L'initialisation du projet avec cette commande sera la premiere story d'implementation.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
1. Schema de donnees JSON par saison + index
2. Store d'etat maison (EventTarget + CustomEvent)
3. Composants en modules JS fonctionnels
4. Pipeline GitHub Actions unique avec scripts modulaires
5. Hebergement GitHub Pages

**Important Decisions (Shape Architecture):**
6. Routing zero-lib (popstate + history API)
7. Fallback scraping LNR → API-Sports + alerte via issue GitHub

**Deferred Decisions (Post-MVP):**
- Strategie de test
- Linting/formatting
- Backtesting multi-saisons (Phase 3)

### Data Architecture

**Decision : 1 fichier JSON par saison + index `seasons.json`**
- Rationale : chaque saison reste < 50Ko gzipped, scalable sur 10+ saisons sans depasser le budget. La saison courante est chargee au lancement (network-first), les saisons passees a la demande (cache-first permanent car immutables).
- Structure : `/data/seasons.json` (index) + `/data/2025-2026.json` (une saison complete : classement, projections, historique, calendrier, meta, Elo)
- Affects : pipeline (generation), front-end (fetch + cache), Service Worker (strategie de cache differenciee)

### Authentication & Security

**Decision : Aucune couche auth/security**
- Rationale : projet personnel, pas de donnees sensibles, pas de comptes utilisateurs, pas d'API exposee. Le JSON est public et statique.

### API & Communication Patterns

**Decision : Pas d'API — JSON statique comme contrat d'interface**
- Rationale : le pipeline produit du JSON, le front-end le consomme. Le schema JSON est le seul contrat entre les deux systemes. Pas de serveur, pas d'endpoints, pas de communication temps reel.
- Format : fichiers JSON statiques servis par GitHub Pages

### Workaround Standings LNR (JS-rendered)

**Constat :** La page classement LNR (`top14.lnr.fr/classement`) rend le tableau via JavaScript client-side. Le scraping avec cheerio (HTML statique) retourne un tableau vide.

**Workaround :** Les standings (classement actuel) sont calcules a partir des resultats scrapes (`results[]`). Le champ `currentRank` dans le JSON de saison est derive des points accumules par chaque equipe, pas scrape directement.

**Impact :** Les standings scrapes dans `scraped.json` peuvent etre vides. Le pipeline (elo.js) doit recevoir des standings derives ou calculer les rangs depuis les resultats. Ce workaround est valide tant que les resultats sont scrapes correctement.

### Frontend Architecture

**Gestion d'etat : Store maison EventTarget**
- Rationale : ~50 lignes, zero dependance, decoupage propre entre donnees et composants via CustomEvent. Suffisant pour ~8 composants partageant un etat simple (saison, revealed, activeSheet, badge).

**Composants : Modules JS fonctionnels**
- Rationale : chaque composant exporte `render()` + fonctions d'update. Pas de classes, pas de Web Components. Open Props tokens accessibles globalement (pas de shadow DOM). Pragmatique pour 8 composants sans reutilisation externe.
- Structure : `src/components/`, `src/animation/`, `src/store.js`, `src/app.js`

**Routing : Zero-lib, gestion manuelle popstate**
- Rationale : app single-page sans routes reelles. Le back Android ferme le bottom sheet (push/pop history state). ~20 lignes, zero dependance.

### Infrastructure & Deployment

**Hebergement : GitHub Pages**
- Rationale : code, donnees JSON et pipeline dans le meme ecosysteme GitHub. Zero service externe, zero cout, deploy integre a l'Action.

**Pipeline : Workflow unique + scripts modulaires**
- Rationale : un seul `.github/workflows/pipeline.yml` orchestrant `scrape.js`, `validate.js`, `elo.js`, `generate.js` en sequence. Chaque script independant, testable en local, contrat d'entree/sortie clair.
- Schedule : cron lundi/mardi/mercredi (idempotent, skip si donnees deja a jour)

**Fallback & Alerting : LNR → API-Sports → Issue GitHub**
- Rationale : retry integre au cron (3 jours). Si LNR echoue 3 fois, bascule automatique sur API-Sports. Si tout echoue, creation d'une issue GitHub (notification email native). Zero service externe.

### Decision Impact Analysis

**Implementation Sequence:**
1. Init projet Vite + PWA + dependances (Motion, Open Props)
2. Definir le schema JSON (contrat d'interface)
3. Pipeline scraping + modele Elo + generation JSON
4. Store d'etat + composants UI de base
5. Moteur d'animation (reveal, stagger, graduation)
6. Service Worker + cache strategies
7. Deploy GitHub Pages

**Cross-Component Dependencies:**
- Le schema JSON impacte pipeline ET front-end — doit etre defini en premier apres l'init
- Le store d'etat est consomme par tous les composants UI — doit exister avant les composants
- Le moteur d'animation depend des composants UI (cibles DOM) — les composants d'abord, les animations ensuite
- Le Service Worker depend du schema JSON pour la strategie de cache differenciee

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**12 points de conflit potentiels** identifies ou des agents AI pourraient faire des choix divergents.

### Naming Patterns

**Code Naming Conventions:**
- Fichiers : `kebab-case.js` — ex: `score-card.js`, `rank-row.js`, `elo.js`
- Fonctions : `camelCase` — ex: `renderScoreCard()`, `calculateElo()`, `fetchSeasonData()`
- Variables : `camelCase` — ex: `currentSeason`, `revealState`, `teamElo`
- Constantes : `UPPER_SNAKE_CASE` — ex: `MAX_TEAMS`, `CACHE_KEY`, `API_SPORTS_URL`
- Composants (fonctions de rendu) : `camelCase` prefixe `render` — ex: `renderScoreCard(container, state)`, `renderRankRow(container, team)`
- Evenements store : `kebab-case` — ex: `season-loaded`, `reveal-triggered`, `sheet-opened`

**JSON Data Naming:**
- Champs JSON : `camelCase` — ex: `teamName`, `eloScore`, `projectedRank`, `confidenceLevel`
- Coherent entre pipeline (generation) et front-end (consommation) — un seul format, zero transformation

**CSS Naming:**
- Classes : `kebab-case` prefixe `w-` (Whistle namespace) — ex: `w-score-card`, `w-rank-row`, `w-zone-europe`
- Custom properties : `--w-` prefix pour les tokens Whistle, `--op-` pour Open Props — ex: `--w-color-europe`, `--w-space-card`
- Modificateurs : suffixe `--modifier` — ex: `w-rank-row--favorite`, `w-badge--new`

### Structure Patterns

**Project Organization:**

```
whistle/
  src/
    components/          <- modules UI (1 fichier = 1 composant)
      score-card.js
      rank-row.js
      zone-group.js
      reveal-button.js
      bottom-sheet.js
      achievement-card.js
      confidence-bar.js
      badge.js
    animation/
      engine.js          <- orchestration Motion (reveal, stagger, graduation)
    styles/
      tokens.css         <- custom properties Whistle + imports Open Props
      base.css           <- reset, typographie, layout global
      components/        <- 1 fichier CSS par composant, meme nom
        score-card.css
        rank-row.css
        ...
    store.js             <- store EventTarget
    router.js            <- gestion popstate / back Android
    data.js              <- fetch JSON, cache logic, detection de fraicheur
    app.js               <- point d'entree, compose tout
    index.html
  scripts/               <- pipeline Node.js (GitHub Actions)
    scrape.js
    validate.js
    elo.js
    generate.js
  data/                  <- JSON generes par le pipeline
    seasons.json
    2025-2026.json
  public/                <- assets statiques (icones, manifest)
  .github/
    workflows/
      pipeline.yml
```

**Regle : 1 composant = 1 fichier JS + 1 fichier CSS, meme nom.** Pas de fichier "utils.js" fourre-tout. Si une fonction est partagee entre 2+ composants, elle va dans `store.js` (si etat) ou `data.js` (si donnees).

### Format Patterns

**JSON Saison — Structure type:**

```json
{
  "season": "2025-2026",
  "lastUpdated": "2026-03-28T08:00:00Z",
  "matchday": 22,
  "brierScore": 0.21,
  "teams": [
    {
      "id": "la-rochelle",
      "name": "Stade Rochelais",
      "currentRank": 7,
      "projectedRank": 5,
      "elo": 1575,
      "confidence": 0.72,
      "zones": { "europe": 0.15, "top6": 0.62, "mid": 0.23, "relegation": 0.0 },
      "form": ["W", "W", "L", "W", "D"],
      "trend": "up"
    }
  ],
  "calendar": [
    {
      "matchday": 23,
      "date": "2026-04-04T15:00:00Z",
      "home": "la-rochelle",
      "away": "toulouse",
      "difficulty": 0.85
    }
  ],
  "predictions": [
    {
      "matchday": 22,
      "date": "2026-03-28T08:00:00Z",
      "projections": [{ "teamId": "la-rochelle", "projectedRank": 5, "confidence": 0.72 }]
    }
  ]
}
```

**Regles de format :**
- Dates : ISO 8601 (`"2026-03-28T08:00:00Z"`) partout, JSON et UI
- IDs equipes : `kebab-case` derive du nom — ex: `la-rochelle`, `stade-francais`, `racing-92`
- Probabilites : decimales 0-1 (pas de pourcentages dans le JSON, conversion cote UI)
- Tendance : enum string `"up"` | `"down"` | `"stable"`
- Forme : array de `"W"` | `"L"` | `"D"` (5 derniers matchs, plus recent en premier)

### Communication Patterns

**Store Events:**
- Pattern : `sujet-action` en kebab-case — ex: `season-loaded`, `reveal-triggered`, `sheet-opened`, `sheet-closed`, `data-refreshed`
- Payload : toujours un objet `{ detail: { ... } }` via CustomEvent — jamais de primitif nu
- Les composants ecoutent le store, jamais d'autres composants directement

**State Updates:**
- Mutations immutables : `set('key', newValue)` remplace la valeur, pas de mutation in-place
- Pas de nested state : le store est plat — `season`, `revealed`, `activeSheet`, `selectedTeam`, `dataFresh`
- Les composants appellent `set()` pour modifier, `get()` pour lire, `on()` pour ecouter

### Process Patterns

**Error Handling:**
- Pipeline : `console.error()` + exit code non-zero pour que GitHub Actions detecte l'echec
- Front-end : jamais d'alerte/popup d'erreur. Si le fetch echoue, on montre les donnees en cache silencieusement. Si pas de cache, ecran minimal "Les donnees arrivent lundi"
- Pas de try/catch generique — chaque catch gere un cas precis ou laisse remonter

**Loading States:**
- Pas de spinner, pas de skeleton, pas de loading bar (spec UX)
- L'app montre toujours les donnees en cache immediatement
- Le badge "Nouveau" apparait quand des donnees fraiches arrivent en arriere-plan
- Le bouton "Reveler" est desactive uniquement pendant l'animation (`revealed: true` -> texte "Rejouer")

**Animation Rules:**
- Toutes les animations sur `transform` et `opacity` uniquement — jamais de `width`, `height`, `top`, `left`
- Spring physics via Motion : stiffness 200 (standard), 120 (dramatique) / damping 20 (standard), 12 (overshoot)
- Stagger : 30ms entre equipes, La Rochelle en dernier (+100ms)
- `prefers-reduced-motion` : transitions instantanees (opacity seulement), zero spring

### Enforcement Guidelines

**Tout agent AI DOIT :**
1. Nommer les fichiers en `kebab-case.js` / `kebab-case.css`
2. Utiliser `camelCase` pour les champs JSON — zero transformation entre pipeline et front
3. Prefixer les classes CSS par `w-` et les custom properties par `--w-`
4. Un composant = un fichier JS + un fichier CSS, meme nom
5. Animer uniquement `transform` et `opacity`
6. Communiquer entre composants via le store, jamais directement
7. Gerer les erreurs front silencieusement (cache fallback, pas de popup)
8. Utiliser ISO 8601 pour toutes les dates

**Anti-Patterns a eviter :**
- Creer un fichier `utils.js` ou `helpers.js` fourre-tout
- Animer `width`, `height`, `top`, `left` (casse le 60fps)
- Afficher un spinner ou un message d'erreur technique a l'utilisateur
- Utiliser des pourcentages dans le JSON (toujours decimales 0-1)
- Muter le state directement au lieu de passer par `set()`
- Coupler deux composants entre eux sans passer par le store

## Project Structure & Boundaries

### Complete Project Directory Structure

```
whistle/
├── index.html                    <- point d'entree HTML
├── package.json
├── vite.config.js                <- config Vite + vite-plugin-pwa
├── .gitignore
├── .github/
│   └── workflows/
│       └── pipeline.yml          <- cron lundi/mardi/mercredi
│
├── public/
│   ├── favicon.svg               <- icone Whistle violet
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── robots.txt
│
├── data/                         <- JSON generes par le pipeline
│   ├── seasons.json              <- index des saisons disponibles
│   └── 2025-2026.json            <- saison courante
│
├── scripts/                      <- pipeline Node.js (GitHub Actions uniquement)
│   ├── scrape.js                 <- scraping LNR + fallback API-Sports
│   ├── validate.js               <- integrite des donnees scrapees
│   ├── elo.js                    <- calcul Elo + projections + confiance + Brier
│   └── generate.js               <- production JSON saison + seasons.json
│
└── src/                          <- front-end PWA
    ├── app.js                    <- point d'entree JS, compose les composants
    ├── store.js                  <- store EventTarget (etat global)
    ├── data.js                   <- fetch JSON, detection fraicheur, cache logic
    ├── router.js                 <- gestion popstate / back Android / history
    │
    ├── components/               <- modules UI (1 fichier = 1 composant)
    │   ├── score-card.js         <- hero card La Rochelle (FR14-19)
    │   ├── rank-row.js           <- ligne d'equipe dans le classement (FR20, FR24)
    │   ├── zone-group.js         <- groupement par zone coloree (FR22)
    │   ├── reveal-button.js      <- CTA "Reveler la projection" (FR21)
    │   ├── bottom-sheet.js       <- fiche detaillee equipe (FR24)
    │   ├── confidence-bar.js     <- indicateur de confiance (FR23)
    │   ├── badge.js              <- badge "Nouvelle journee" (FR38)
    │   └── achievement-card.js   <- card modele prediction (Phase 2, FR25-28)
    │
    ├── animation/
    │   └── engine.js             <- orchestration Motion (reveal, spring, stagger, graduation)
    │
    └── styles/
        ├── tokens.css            <- custom properties --w-* + imports Open Props
        ├── base.css              <- reset, typographie Nunito, layout global
        └── components/           <- 1 fichier CSS par composant, meme nom
            ├── score-card.css
            ├── rank-row.css
            ├── zone-group.css
            ├── reveal-button.css
            ├── bottom-sheet.css
            ├── confidence-bar.css
            ├── badge.css
            └── achievement-card.css
```

### Architectural Boundaries

**Frontiere 1 : Pipeline <> Front-end**
- Separation physique : `scripts/` (Node.js, GitHub Actions) vs `src/` (navigateur)
- Contrat d'interface : les fichiers dans `data/` (JSON)
- Le pipeline ne touche jamais `src/`. Le front-end ne touche jamais `scripts/`
- Le schema JSON est le seul point de couplage

**Frontiere 2 : Store <> Composants**
- Le store (`store.js`) est la source de verite unique
- Les composants lisent via `get()`, ecrivent via `set()`, ecoutent via `on()`
- Aucun composant n'importe un autre composant — ils communiquent exclusivement via le store
- `app.js` est le seul fichier qui importe et compose tous les composants

**Frontiere 3 : Data <> Store**
- `data.js` gere le fetch, la detection de fraicheur, et la logique de cache
- Quand les donnees sont pretes, `data.js` appelle `set('season', data)` sur le store
- Les composants ne fetchent jamais directement — ils reagissent a `season-loaded`

**Frontiere 4 : Animation <> Composants**
- `engine.js` expose des fonctions d'animation (`revealProjection()`, `animateRankRow()`)
- Les composants appellent le moteur d'animation, pas l'inverse
- Le moteur lit le DOM (cibles), pas le store — il recoit ses parametres en arguments

### Requirements to Structure Mapping

**FR1-5 (Pipeline/Donnees) ->** `scripts/scrape.js`, `scripts/validate.js`, `scripts/generate.js`, `.github/workflows/pipeline.yml`

**FR6-13 (Modele Predictif) ->** `scripts/elo.js`, `scripts/generate.js`

**FR14-19 (Vue Equipe Favorite) ->** `src/components/score-card.js`, `src/data.js`

**FR20-24 (Classement Anime) ->** `src/components/rank-row.js`, `src/components/zone-group.js`, `src/components/reveal-button.js`, `src/components/confidence-bar.js`, `src/animation/engine.js`

**FR25-32 (Transparence Modele, Phase 2) ->** `src/components/achievement-card.js`, `src/components/bottom-sheet.js`

**FR33-35 (Simulateur, Phase 2/3) ->** nouveau module `src/simulator.js` (a creer en Phase 2)

**FR36-38 (PWA/Offline) ->** `vite.config.js` (vite-plugin-pwa), `src/data.js` (cache logic), `public/` (icones, manifest)

### Cross-Cutting Concerns Mapping

| Concern | Fichiers impliques |
|---|---|
| Schema JSON | `scripts/generate.js` (produit) <> `src/data.js` (consomme) |
| Cache Service Worker | `vite.config.js` (config Workbox) + `src/data.js` (detection fraicheur) |
| Historique predictions | `scripts/elo.js` (calcule) -> `scripts/generate.js` (append) -> `data/*.json` (stocke) |
| Gestion etats donnees | `src/data.js` (fetch/cache) -> `src/store.js` (etat) -> composants (affichage) |
| Systeme d'animation | `src/animation/engine.js` (moteur) <- composants (declenchent) |

### Data Flow

```
[LNR / API-Sports]
       |
       v
  scrape.js --> validate.js --> elo.js --> generate.js
                                               |
                                               v
                                        data/2025-2026.json
                                        data/seasons.json
                                               |
                                         (GitHub Pages)
                                               |
                                               v
                                    src/data.js (fetch + cache)
                                               |
                                               v
                                    src/store.js (set 'season')
                                               |
                             +-----------------+-----------------+
                             v                 v                 v
                       score-card.js     zone-group.js    reveal-button.js
                                             |
                                             v
                                        rank-row.js
                                             |
                                             v (tap)
                                       bottom-sheet.js
```

### Development Workflow Integration

**Dev local :** `npm run dev` -> Vite HMR, Service Worker desactive en dev pour eviter le cache
**Build :** `npm run build` -> Vite minifie, tree-shake, genere SW + manifest dans `dist/`
**Deploy :** GitHub Actions build -> push `dist/` vers la branche `gh-pages`
**Pipeline data :** GitHub Actions cron -> execute `scripts/` -> commit JSON dans `data/` -> redeploy Pages

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility :**
- Vite 7 + vite-plugin-pwa v1.0 + vanilla JS : compatible, le plugin est framework-agnostic
- Motion v12.x + vanilla JS : compatible, expose `animate()` / `spring()` / `stagger()` directement
- Open Props v1.7.x + CSS custom : compatible, custom properties CSS natives
- GitHub Pages + JSON statique + Vite build : compatible, tout est statique
- GitHub Actions + Node.js scripts : compatible, Actions supporte Node nativement
- Aucun conflit de version detecte

**Pattern Consistency :**
- `camelCase` unifie entre JSON (pipeline) et JS (front) — zero transformation
- `kebab-case` unifie entre fichiers, CSS classes, IDs equipes, events store
- Prefixe `w-` CSS evite les collisions avec Open Props (`--op-`)
- 1 composant = 1 JS + 1 CSS, meme nom — regle simple, sans ambiguite

**Structure Alignment :**
- `scripts/` isole du `src/` — frontiere pipeline/front respectee
- `data/` comme zone tampon entre les deux systemes
- Le store centralise respecte la regle "composants ne s'importent pas entre eux"
- `app.js` comme seul compositeur

### Requirements Coverage Validation

**Functional Requirements Coverage :**

| FR | Couverture | Fichier(s) |
|---|---|---|
| FR1-5 (Pipeline) | Couvert | `scripts/scrape.js`, `validate.js`, `pipeline.yml` |
| FR6-13 (Modele Elo) | Couvert | `scripts/elo.js`, `generate.js` |
| FR14-19 (Equipe favorite) | Couvert | `components/score-card.js`, `data.js` |
| FR20-24 (Classement anime) | Couvert | `components/rank-row.js`, `zone-group.js`, `reveal-button.js`, `confidence-bar.js`, `animation/engine.js` |
| FR25-32 (Transparence, Phase 2) | Prevu | `components/achievement-card.js`, `bottom-sheet.js` |
| FR33-35 (Simulateur, Phase 2/3) | Prevu | `src/simulator.js` (a creer) |
| FR36-38 (PWA/Offline) | Couvert | `vite.config.js`, `data.js`, `public/` |

27/27 FRs MVP couverts. 11 FRs Phase 2/3 prevus dans la structure.

**Non-Functional Requirements Coverage :**

| NFR | Couverture | Comment |
|---|---|---|
| < 2s chargement 4G | Couvert | Vite tree-shaking, < 200Ko budget, cache-first SW |
| < 1s depuis cache | Couvert | SW cache-first assets, store en memoire |
| 60fps animations | Couvert | transform/opacity uniquement, Motion WAAPI, GPU compositing |
| < 200Ko assets gzipped | Couvert | Vanilla JS + Motion (~4Ko) + Open Props (~2Ko) + CSS custom |
| < 50Ko JSON/saison | Couvert | 1 fichier par saison, donnees minuscules (14 equipes) |
| Pipeline autonome | Couvert | Cron 3 jours, retry, fallback, alerte issue GitHub |
| PWA installable | Couvert | vite-plugin-pwa, manifest, SW, icones |
| WCAG AA | Couvert | Tokens contrastes, aria-labels, prefers-reduced-motion, 48px tap |

### Implementation Readiness Validation

**Decision Completeness :** Toutes les decisions critiques documentees avec versions verifiees. Le schema JSON est defini avec exemple concret. Les patterns couvrent naming, structure, format, communication, process.

**Structure Completeness :** Arborescence complete, chaque fichier a un role explicite, chaque FR est mappe a un fichier.

**Pattern Completeness :** 8 regles d'enforcement + 6 anti-patterns. Couvre les conflits les plus probables entre agents.

### Gap Analysis

**Gaps critiques :** Aucun detecte.

**Gaps importants :**
1. Schema JSON detaille non fige — l'exemple dans les patterns est indicatif. Le schema definitif sera valide lors de la premiere story pipeline.
2. Configuration Workbox non detaillee — les strategies sont decidees, la config exacte sera ecrite a l'implementation.

**Gaps nice-to-have :**
- Pas de strategie de test definie (defere volontairement)
- Pas de linter/formatter configure (a decider a l'init)

### Architecture Completeness Checklist

**Requirements Analysis**
- [x] Contexte projet analyse (38 FRs, 7 categories)
- [x] Complexite evaluee (faible infra, moyenne UX)
- [x] Contraintes techniques identifiees (budget taille, Android-only, statique)
- [x] Preoccupations transversales mappees (6 concerns)

**Architectural Decisions**
- [x] Decisions critiques documentees avec versions (Vite 7, Motion 12.x, Open Props 1.7.x, vite-plugin-pwa 1.0)
- [x] Stack technique complet (vanilla JS, CSS custom, JSON statique, GitHub Actions/Pages)
- [x] Patterns d'integration definis (JSON contrat, store EventTarget, popstate)
- [x] Performance adressee (budget 200Ko, 60fps, cache strategies)

**Implementation Patterns**
- [x] Conventions de nommage etablies (kebab-case fichiers, camelCase code/JSON, w- CSS)
- [x] Patterns de structure definis (1 composant = 1 JS + 1 CSS)
- [x] Patterns de communication specifies (store events, CustomEvent)
- [x] Patterns de process documentes (erreurs silencieuses, animation rules)

**Project Structure**
- [x] Arborescence complete definie
- [x] Frontieres de composants etablies (4 frontieres)
- [x] Points d'integration mappes (data flow complet)
- [x] Mapping requirements -> structure complet

### Architecture Readiness Assessment

**Statut global : PRET POUR L'IMPLEMENTATION**

**Niveau de confiance : Eleve**

**Forces cles :**
- Architecture extremement simple — 2 systemes decouples par du JSON statique
- Zero infrastructure a gerer — tout est dans GitHub (code, CI/CD, hosting, alerting)
- Budget performance garanti par design — vanilla JS, pas de framework runtime
- Patterns clairs et peu nombreux — faciles a suivre pour n'importe quel agent AI

**Ameliorations futures :**
- Strategie de test a definir lors des epics
- Schema JSON a finaliser lors de la premiere story pipeline
- Configuration Workbox detaillee a l'implementation

### Implementation Handoff

**Guidelines pour les agents AI :**
- Suivre toutes les decisions architecturales telles que documentees
- Utiliser les patterns d'implementation de maniere coherente sur tous les composants
- Respecter la structure projet et les frontieres
- Se referer a ce document pour toute question architecturale

**Premiere priorite d'implementation :**
```bash
npm create @vite-pwa/pwa@latest whistle -- --template vanilla
npm install motion open-props
```

## Migration Target: Vercel-only Runtime

### Decision Summary

Le runtime de Whistle migre sur Vercel. GitHub reste le stockage du code source uniquement.

- Le front public, l'API et l'auth admin vivent dans un seul projet Vercel.
- La consultation de l'app ne demande aucune authentification.
- L'auth ne s'applique qu'a l'ouverture de l'interface de saisie des matchs.
- La base de donnees vit cote Vercel et devient la source de verite.

### Vercel Vocabulary

- **Project** : l'application configuree dans Vercel.
- **Deployment** : une version publiee de l'app ou de l'API.
- **Preview deployment** : une URL temporaire pour tester une branche.
- **Production deployment** : la version publique officielle.
- **Environment variables** : les secrets et parametres stockes cote serveur, jamais dans le front.
- **Route handler / serverless function** : un petit endpoint serveur qui repond a une requete HTTP.

### Runtime Layout

- **Frontend public** : lecture du classement, des projections et de l'historique.
- **Admin gate** : saisie des matchs avec session courte.
- **API publique** : lecture des donnees de saison.
- **API admin** : ecriture des matchs saisis et declenchement du recalcul.
- **Database** : matchs, validations, snapshots et logs.

### Security Model

- Aucun secret GitHub ne doit exister dans le navigateur.
- Aucun secret Vercel ne doit etre commite dans le repo.
- L'auth admin doit proteger uniquement l'ecriture, jamais la lecture publique.
- La session admin doit etre signee cote serveur et expiree rapidement.

### Data Model Direction

- Une base relationnelle est preferee pour les matchs saisis et les snapshots.
- Le recalcul doit etre deterministe et repartir de la source de verite.
- Les vues publiques consomment une API JSON, pas du JSON statique dans GitHub Pages.

### Beginner Guidance

- Expliquer clairement dans les stories ce qu'est un projet Vercel, une preview, une variable d'environnement et une fonction serveur.
- Ne pas supposer que le lecteur connait Vercel.
- Garder le flux simple : lecture publique sans auth, saisie admin avec auth, recalcul serveur, publication immediate.
