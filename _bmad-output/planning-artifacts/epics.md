---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
inputDocuments: ['planning-artifacts/prd.md', 'planning-artifacts/architecture.md', 'planning-artifacts/ux-design-specification.md']
---

# Whistle - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Whistle, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1 : Le systeme recupere automatiquement les resultats, classements et calendrier du TOP 14 depuis la LNR chaque semaine
FR2 : Le systeme valide l'integrite des donnees scrapees avant integration
FR3 : Le systeme detecte une journee incomplete (matchs reportes) et re-scrape ulterieurement
FR4 : Le systeme bascule sur API-Sports si la source LNR echoue
FR5 : Le systeme alerte en cas d'echec repete du pipeline (apres 3 tentatives)
FR6 : Le systeme calcule un score Elo adapte au rugby pour chaque equipe
FR7 : Le systeme pondere la forme recente plus fortement que la forme globale (decroissance temporelle)
FR8 : Le systeme projette le classement final a partir des scores Elo et du calendrier restant
FR9 : Le systeme calcule un indice de confiance pour chaque projection
FR10 : Le systeme calcule les probabilites par zone (Europe, top 6, ventre mou, maintien)
FR11 : Le systeme estime la difficulte de chaque match a venir
FR12 : Le systeme conserve l'historique complet des predictions semaine par semaine (append-only)
FR13 : Le systeme gere le debut de saison avec un proxy inter-saison et une confiance basse affichee tant que les donnees sont insuffisantes
FR14 : L'utilisateur voit la fiche complete de son equipe favorite a l'ouverture de l'app
FR15 : L'utilisateur voit la position actuelle et la position projetee
FR16 : L'utilisateur voit la tendance (hausse/baisse) depuis la derniere journee
FR17 : L'utilisateur voit les probabilites par zone
FR18 : L'utilisateur voit les prochains matchs avec difficulte estimee
FR19 : L'utilisateur voit l'explication du modele sur la trajectoire de son equipe
FR20 : L'utilisateur voit le classement actuel des 14 equipes
FR21 : L'utilisateur declenche l'animation de projection (equipes glissent vers position projetee)
FR22 : L'utilisateur distingue visuellement les zones de classement
FR23 : L'utilisateur voit l'indicateur de confiance par equipe
FR24 : L'utilisateur navigue vers la fiche detaillee de n'importe quelle equipe
FR25 : L'utilisateur consulte les donnees sources du modele (Phase 2)
FR26 : L'utilisateur voit le Brier Score et son evolution (Phase 2)
FR27 : L'utilisateur voit le nombre de matchs correctement predits (Phase 2)
FR28 : L'utilisateur consulte le journal de corrections (Phase 2)
FR29 : Le systeme recalibre automatiquement ses parametres a mi-saison et fin de saison (Phase 2)
FR30 : L'utilisateur bascule entre un mode simple et un mode detaille (Phase 2)
FR31 : Le systeme calcule un micro-classement base sur les confrontations directes (Phase 2)
FR32 : Le systeme gere les equipes promues avec proxy Pro D2 et coefficient de decote (Phase 2)
FR33 : L'utilisateur modifie le resultat d'un match a venir (Phase 2/3)
FR34 : Le systeme recalcule instantanement les projections en fonction des resultats simules (Phase 2/3)
FR35 : L'utilisateur voit l'animation de l'impact sur le classement (Phase 2/3)
FR36 : L'utilisateur installe l'application sur Android sans passer par un store
FR37 : L'utilisateur consulte les dernieres donnees disponibles sans connexion internet
FR38 : L'application detecte et charge les nouvelles donnees en arriere-plan

### NonFunctional Requirements

NFR1 : Chargement initial < 2 secondes sur 4G
NFR2 : Navigation entre vues < 100ms (SPA, donnees en memoire)
NFR3 : Animation du classement : 60fps constant
NFR4 : Assets totaux < 200Ko gzippe
NFR5 : Donnees JSON par saison < 50Ko
NFR6 : Demarrage depuis le cache (offline) < 1 seconde
NFR7 : Le pipeline supporte un changement de structure HTML LNR sans modification majeure (selecteurs resilients)
NFR8 : Le passage LNR → API-Sports ne modifie que le module de scraping, sans impact sur le modele ni le front-end
NFR9 : Le format JSON intermediaire constitue le contrat d'interface entre pipeline et front-end
NFR10 : Delai maximum entre fin de journee et mise a jour : 24 heures

### Additional Requirements

- Starter template : Vite 7 + vite-plugin-pwa v1.0 (vanilla template) — commande d'init : `npm create @vite-pwa/pwa@latest whistle -- --template vanilla` + `npm install motion open-props`
- Schema JSON par saison + index `seasons.json` — contrat d'interface unique entre pipeline et front-end
- Store d'etat maison base sur EventTarget + CustomEvent (~50 lignes, zero dependance)
- Composants en modules JS fonctionnels exportant `render()` + fonctions d'update — pas de classes, pas de Web Components
- Routing zero-lib : gestion manuelle popstate/history API pour le back Android (~20 lignes)
- Hebergement GitHub Pages — code, donnees et pipeline dans le meme ecosysteme
- Pipeline GitHub Actions unique avec scripts modulaires (`scrape.js`, `validate.js`, `elo.js`, `generate.js`) en sequence
- Cron pipeline lundi/mardi/mercredi (idempotent, skip si donnees deja a jour)
- Fallback et alerting : LNR → API-Sports → creation d'issue GitHub apres 3 echecs
- Conventions de nommage : fichiers kebab-case, code camelCase, CSS classes prefixees `w-`, custom properties `--w-`
- 1 composant = 1 fichier JS + 1 fichier CSS, meme nom
- Animations uniquement sur `transform` et `opacity` (GPU compositing 60fps)
- Communication entre composants exclusivement via le store, jamais directement
- Erreurs front silencieuses : cache fallback, jamais de popup d'erreur
- Motion v12.x pour les animations spring/stagger, Open Props v1.7.x pour les design tokens
- Pas de spinner, pas de skeleton, pas de loading bar — l'app montre toujours les donnees en cache

### UX Design Requirements

UX-DR1 : Implementer le systeme de couleurs Whistle — palette zones (violet Europe, vert Top 6, gris ventre mou, rouge maintien) + palette fonctionnelle (primary violet, surface creme, success vert, danger rouge, 3 niveaux confiance) en custom properties CSS `--w-*`
UX-DR2 : Implementer le systeme typographique Nunito — echelle 6 niveaux (hero 32px/800, h1 24px/700, h2 20px/700, body 16px/400, label 14px/600, caption 12px/400) avec chiffres tabulaires (`font-feature-settings: "tnum"`)
UX-DR3 : Implementer la grille d'espacement 8px — tokens `--space-xs` (4px) a `--space-2xl` (48px), padding page 16px, lignes classement 48px minimum hauteur
UX-DR4 : Implementer le composant Score Card La Rochelle (hero) — position actuelle, position projetee, fleche animee, barre XP probabilite top 6, tendance, badge "Nouveau". Occupe ~40% de l'ecran au premier affichage
UX-DR5 : Implementer le composant Card Achievement style jeu video — bordure stylisee, icone badge/trophee, fond teinte avec degrade, 3 variantes (prediction correcte/explication/surprise). Doit ressembler a un achievement unlock, pas a une notification systeme
UX-DR6 : Implementer le bouton "Reveler la Projection" — gradient violet, pleine largeur, uppercase bold, glow, 4 etats (defaut/presse scale 0.97/animation en cours desactive/post-reveal "Rejouer"), sticky ou sous la fiche hero, toujours visible sans scroll
UX-DR7 : Implementer le composant Zone de Classement — 4 groupes (Europe/Top 6/Ventre mou/Maintien) avec header colore, fond teinte par zone (violet pale, vert pale, gris pale, rouge pale), bordure gauche coloree sur les lignes
UX-DR8 : Implementer le composant Ligne d'Equipe (Rank Row) — position, logo 28px, nom + Elo, delta colore (fleches), barre confiance 4px. Etat favori : bordure violet accentuee, nom violet bold. Fond blanc eleve, ombre subtile, coins arrondis 12px
UX-DR9 : Implementer le Bottom Sheet Fiche Equipe — 2 hauteurs (mi-ecran/plein ecran par drag), poignee drag 40x4px, overlay sombre 40%, header + Elo + forme recente + calendrier + probabilites par zone. Role dialog, aria-modal, focus trap
UX-DR10 : Implementer l'indicateur de confiance — barre fine 4px, 3 paliers (vert >70%, orange 40-70%, rouge pale <40%), role meter avec aria-valuemin/max/now, integre dans la ligne d'equipe
UX-DR11 : Implementer le badge "Nouvelle Journee" — pill arrondie violet pale/texte violet bold 11px, apparait quand lastVisit < lastDataUpdate, disparait apres premier reveal, role status aria-live polite
UX-DR12 : Implementer le moteur d'animation reveal — spring physics via Motion (stiffness 200/120, damping 20/12), stagger 30ms entre equipes, La Rochelle en dernier (+100ms), graduation feedback (0 places = pas d'anim, ±1 = 400ms, ±2 = 600ms overshoot, ±3+ = 800ms spring + glow)
UX-DR13 : Implementer le support prefers-reduced-motion — toutes les spring animations deviennent transitions instantanees (opacity seulement), le reveal montre directement le classement projete
UX-DR14 : Implementer le feedback tactile — scale 0.97 au touch sur tout element tappable (50ms), retour spring 150ms, pas de changement de couleur
UX-DR15 : Implementer la structure HTML semantique — main, h1 score card, h2 zones, section par zone, ul/li equipes, dialog bottom sheet, lang="fr", meta theme-color violet
UX-DR16 : Implementer les contrastes WCAG AA — ratio > 4.5:1 texte courant, > 3:1 grands titres, violet minimum #6d28d9 sur fond clair, zones colorees jamais porteuses d'info seules
UX-DR17 : Implementer les zones tactiles 48x48px minimum sur tout element interactif avec espacement 8px entre zones adjacentes + `touch-action: manipulation`
UX-DR18 : Implementer les aria-labels sur chaque ligne d'equipe (ex: "7eme, La Rochelle, Elo 1575, monte de 2 places, confiance moyenne"), aria-busy sur le bouton Reveler pendant l'animation, aria-live polite sur le badge et mises a jour
UX-DR19 : Implementer le layout page unique scrollable — score card hero en haut, cards achievement, bouton reveler, classement par zones, prochains matchs La Rochelle. Pas de menu hamburger, pas de tab bar, pas de pagination
UX-DR20 : Implementer les etats vides — premier lancement avec donnees JSON embarquees, offline avec cache (experience identique sans badge), offline sans cache (logo + "Les donnees arrivent lundi"), pipeline stale (texte discret "Derniere mise a jour : [date]")
UX-DR21 : Implementer la direction visuelle Game UI enrichie — fond page creme/beige, cartes fond blanc eleve avec ombres subtiles, coins arrondis 12-16px, esprit ludique sportif nocturne, plus de couleur dans les fonds de zones

### FR Coverage Map

FR1: Epic 1 - Scraping automatique resultats LNR
FR2: Epic 1 - Validation integrite donnees scrapees
FR3: Epic 1 - Detection journee incomplete et re-scrape
FR4: Epic 1 - Fallback API-Sports si LNR echoue
FR5: Epic 1 - Alerte apres 3 echecs pipeline
FR6: Epic 1 - Calcul score Elo adapte rugby
FR7: Epic 1 - Ponderation forme recente (decroissance temporelle)
FR8: Epic 1 - Projection classement final via Elo + calendrier
FR9: Epic 1 - Indice de confiance par projection
FR10: Epic 1 - Probabilites par zone (Europe, top 6, ventre mou, maintien)
FR11: Epic 1 - Estimation difficulte matchs a venir
FR12: Epic 1 - Historique predictions append-only
FR13: Epic 1 - Gestion debut de saison (proxy inter-saison, confiance basse)
FR14: Epic 2 - Fiche equipe favorite a l'ouverture
FR15: Epic 2 - Position actuelle et projetee
FR16: Epic 2 - Tendance depuis derniere journee
FR17: Epic 2 - Probabilites par zone
FR18: Epic 2 - Prochains matchs avec difficulte
FR19: Epic 2 - Explication du modele sur trajectoire equipe
FR20: Epic 3 - Classement actuel des 14 equipes
FR21: Epic 3 - Animation de projection (equipes glissent)
FR22: Epic 3 - Distinction visuelle des zones
FR23: Epic 3 - Indicateur de confiance par equipe
FR24: Epic 3 - Navigation vers fiche detaillee equipe
FR25: Epic 5 - Consultation donnees sources modele (Phase 2)
FR26: Epic 5 - Brier Score et evolution (Phase 2)
FR27: Epic 5 - Nombre matchs correctement predits (Phase 2)
FR28: Epic 5 - Journal de corrections (Phase 2)
FR29: Epic 5 - Recalibrage automatique mi-saison/fin saison (Phase 2)
FR30: Epic 5 - Bascule mode simple/detaille (Phase 2)
FR31: Epic 5 - Micro-classement confrontations directes (Phase 2)
FR32: Epic 5 - Gestion equipes promues proxy Pro D2 (Phase 2)
FR33: Epic 6 - Modification resultat match a venir (Phase 2/3)
FR34: Epic 6 - Recalcul instantane projections simulees (Phase 2/3)
FR35: Epic 6 - Animation impact sur classement (Phase 2/3)
FR36: Epic 4 - Installation PWA Android
FR37: Epic 4 - Consultation donnees offline
FR38: Epic 4 - Detection et chargement donnees en arriere-plan

## Epic List

### Epic 1 : Fondation & Pipeline de Donnees
L'utilisateur dispose d'un pipeline automatise qui recupere les resultats du TOP 14, calcule les projections Elo et genere le JSON de saison chaque semaine sans intervention.
**FRs couvertes :** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR9, FR10, FR11, FR12, FR13
**NFRs adressees :** NFR7, NFR8, NFR9, NFR10
**Inclut :** Init projet Vite + deps, schema JSON, scripts pipeline (scrape, validate, elo, generate), workflow GitHub Actions, fallback API-Sports, alerting

### Epic 2 : Score Card & Situation Equipe Favorite
L'utilisateur ouvre l'app et voit instantanement la situation complete de La Rochelle : position actuelle et projetee, tendance, probabilites par zone, prochains matchs avec difficulte, et explications du modele.
**FRs couvertes :** FR14, FR15, FR16, FR17, FR18, FR19
**UX-DRs couvertes :** UX-DR1, UX-DR2, UX-DR3, UX-DR4, UX-DR11, UX-DR15, UX-DR16, UX-DR17, UX-DR19, UX-DR21
**NFRs adressees :** NFR1, NFR2, NFR6
**Inclut :** Design tokens (couleurs, typo, espacement), store + data fetch + router, score card hero, badge "Nouveau", layout page, structure HTML semantique

### Epic 3 : Classement Anime & Exploration des Equipes
L'utilisateur declenche la projection animee, voit les 14 equipes glisser vers leur position projetee avec un feedback visuel gradue, explore les zones de classement, et consulte la fiche detaillee de n'importe quelle equipe.
**FRs couvertes :** FR20, FR21, FR22, FR23, FR24
**UX-DRs couvertes :** UX-DR5, UX-DR6, UX-DR7, UX-DR8, UX-DR9, UX-DR10, UX-DR12, UX-DR13, UX-DR14, UX-DR18, UX-DR20
**NFRs adressees :** NFR3
**Inclut :** Bouton reveal, zones classement, lignes equipe, moteur animation (spring, stagger, graduation), bottom sheet, confiance, cards achievement, feedback tactile, prefers-reduced-motion

### Epic 4 : PWA, Offline & Deploiement
L'utilisateur installe Whistle sur Android, consulte les donnees en cache sans connexion, et recoit silencieusement les mises a jour en arriere-plan. L'app est deployee sur GitHub Pages.
**FRs couvertes :** FR36, FR37, FR38
**NFRs adressees :** NFR1, NFR4, NFR5, NFR6
**Inclut :** Config Service Worker (Workbox via vite-plugin-pwa), cache-first assets / network-first donnees, manifest PWA, icones, deploiement GitHub Pages

### Epic 5 : Transparence du Modele (Phase 2)
L'utilisateur comprend ce que le modele sait, comment il calcule ses projections, ou il s'est trompe, et comment il s'auto-corrige. Il peut basculer entre mode simple et mode detaille.
**FRs couvertes :** FR25, FR26, FR27, FR28, FR29, FR30, FR31, FR32

### Epic 6 : Simulateur (Phase 2/3)
L'utilisateur modifie les resultats de matchs a venir et voit instantanement l'impact anime sur le classement projete.
**FRs couvertes :** FR33, FR34, FR35

## Epic 1 : Fondation & Pipeline de Donnees

L'utilisateur dispose d'un pipeline automatise qui recupere les resultats du TOP 14, calcule les projections Elo et genere le JSON de saison chaque semaine sans intervention.

### Story 1.1 : Initialisation du projet Vite + PWA + dependances

En tant que developpeur,
Je veux initialiser le projet avec Vite, vite-plugin-pwa et les dependances (Motion, Open Props),
Afin de disposer d'un socle de build et developpement fonctionnel.

**Acceptance Criteria:**

**Given** aucun projet n'existe
**When** les commandes d'init et d'installation sont executees
**Then** le projet Vite vanilla demarre avec `npm run dev`
**And** Motion et Open Props sont installes dans `package.json`
**And** la structure de dossiers correspond a l'architecture definie (`src/`, `scripts/`, `data/`, `public/`)
**And** le `.gitignore` exclut `node_modules/`, `dist/`

### Story 1.2 : Definition du schema JSON de saison

En tant que developpeur,
Je veux definir et documenter le schema JSON de saison qui sert de contrat entre le pipeline et le front-end,
Afin que les deux systemes aient un format de donnees clair et stable.

**Acceptance Criteria:**

**Given** le projet est initialise
**When** le fichier `data/2025-2026.json` est cree avec des donnees d'exemple
**Then** il contient la structure definie dans l'architecture (season, lastUpdated, matchday, brierScore, teams[], calendar[], predictions[])
**And** les champs JSON sont en `camelCase`
**And** les IDs equipes sont en `kebab-case`
**And** les probabilites sont en decimales 0-1
**And** les dates sont en ISO 8601
**And** un fichier `data/seasons.json` indexe les saisons disponibles
**And** le JSON d'exemple est valide et < 50Ko

### Story 1.3 : Scraping des resultats et calendrier LNR

En tant qu'utilisateur,
Je veux que le systeme recupere automatiquement les resultats, classements et calendrier du TOP 14 depuis la LNR,
Afin de disposer de donnees a jour chaque semaine.

**Acceptance Criteria:**

**Given** le script `scripts/scrape.js` est execute
**When** la source LNR est disponible
**Then** les resultats de la derniere journee sont extraits (scores, bonus, domicile/exterieur)
**And** le classement actuel des 14 equipes est extrait
**And** le calendrier restant est extrait
**And** les selecteurs sont resilients aux changements mineurs de structure HTML (NFR7)
**And** le script detecte une journee incomplete (matchs reportes) et le signale (FR3)
**And** le script est executable en local (`node scripts/scrape.js`)
**And** les donnees brutes sont ecrites dans un format intermediaire (JSON)

### Story 1.4 : Validation de l'integrite des donnees scrapees

En tant qu'utilisateur,
Je veux que le systeme valide les donnees scrapees avant integration,
Afin d'eviter qu'un scraping corrompu ne pollue les projections.

**Acceptance Criteria:**

**Given** le script `scripts/validate.js` recoit les donnees brutes du scraping
**When** la validation est executee
**Then** le script verifie que les 14 equipes sont presentes
**And** les scores sont des entiers positifs coherents
**And** les dates de matchs sont valides
**And** aucune donnee critique n'est manquante
**And** en cas d'erreur de validation, le script echoue avec un exit code non-zero et un message descriptif
**And** le script est executable en local

### Story 1.5 : Calcul du modele Elo et projections

En tant qu'utilisateur,
Je veux que le systeme calcule un score Elo adapte au rugby et projette le classement final,
Afin de voir des projections credibles basees sur les performances et le calendrier.

**Acceptance Criteria:**

**Given** le script `scripts/elo.js` recoit les donnees validees
**When** le calcul est execute
**Then** un score Elo est calcule pour chaque equipe (FR6)
**And** la forme recente est ponderee plus fortement que la forme globale via decroissance temporelle (FR7)
**And** le classement final est projete a partir des Elo et du calendrier restant (FR8)
**And** un indice de confiance est calcule pour chaque projection (FR9)
**And** les probabilites par zone (Europe, top 6, ventre mou, maintien) sont calculees (FR10)
**And** la difficulte de chaque match a venir est estimee (FR11)
**And** le debut de saison utilise un proxy inter-saison avec confiance basse (FR13)
**And** le script est executable en local

### Story 1.6 : Generation du JSON de saison avec historique

En tant qu'utilisateur,
Je veux que le systeme genere le fichier JSON de saison complet avec historique append-only,
Afin que le front-end dispose toujours de donnees a jour et de l'historique des predictions.

**Acceptance Criteria:**

**Given** le script `scripts/generate.js` recoit les resultats du calcul Elo
**When** la generation est executee
**Then** le fichier `data/2025-2026.json` est mis a jour au format du schema defini (Story 1.2)
**And** une nouvelle entree est ajoutee dans `predictions[]` (append-only, FR12)
**And** les entrees precedentes de `predictions[]` ne sont jamais modifiees
**And** le fichier `data/seasons.json` est mis a jour si necessaire
**And** le JSON produit est < 50Ko (NFR5)
**And** le format est identique au schema — aucune transformation necessaire cote front (NFR9)

### Story 1.7 : Pipeline GitHub Actions avec fallback et alerting

En tant qu'utilisateur,
Je veux que le pipeline s'execute automatiquement chaque semaine avec retry, fallback et alerting,
Afin que les donnees soient mises a jour sans intervention manuelle toute la saison.

**Acceptance Criteria:**

**Given** le workflow `.github/workflows/pipeline.yml` est configure
**When** le cron se declenche (lundi/mardi/mercredi)
**Then** les scripts s'executent en sequence (scrape → validate → elo → generate)
**And** le pipeline est idempotent (skip si donnees deja a jour)
**And** si la LNR echoue, le systeme bascule automatiquement sur API-Sports (FR4, NFR8)
**And** le passage a API-Sports ne modifie que le module de scraping
**And** apres 3 echecs consecutifs, une issue GitHub est creee automatiquement (FR5)
**And** le JSON genere est commite et deploye
**And** le delai entre fin de journee et mise a jour est < 24h (NFR10)

## Epic 2 : Score Card & Situation Equipe Favorite

L'utilisateur ouvre l'app et voit instantanement la situation complete de La Rochelle : position actuelle et projetee, tendance, probabilites par zone, prochains matchs avec difficulte, et explications du modele.

### Story 2.1 : Design tokens et fondation visuelle

En tant qu'utilisateur,
Je veux que l'app ait une identite visuelle coherente, sportive et ludique,
Afin que chaque ecran soit immediatement lisible et agreable.

**Acceptance Criteria:**

**Given** le projet est initialise avec Open Props
**When** les fichiers `src/styles/tokens.css` et `src/styles/base.css` sont crees
**Then** les custom properties `--w-*` definissent la palette zones (violet Europe, vert Top 6, gris ventre mou, rouge maintien) + palette fonctionnelle (UX-DR1)
**And** l'echelle typographique Nunito 6 niveaux est definie avec `font-feature-settings: "tnum"` (UX-DR2)
**And** la grille d'espacement 8px est definie (`--space-xs` a `--space-2xl`) (UX-DR3)
**And** le fond de page est creme/beige (pas blanc pur), les cartes ont fond blanc eleve avec ombres subtiles, coins arrondis 12-16px (UX-DR21)
**And** les contrastes respectent WCAG AA (ratio > 4.5:1 texte courant, violet minimum #6d28d9) (UX-DR16)
**And** `touch-action: manipulation` est applique sur les elements interactifs (UX-DR17)

### Story 2.2 : Store d'etat, fetch donnees et router

En tant qu'utilisateur,
Je veux que l'app charge les donnees de saison et les rende disponibles a tous les composants,
Afin que l'ouverture soit instantanee et la navigation fluide.

**Acceptance Criteria:**

**Given** les fichiers `src/store.js`, `src/data.js` et `src/router.js` sont crees
**When** l'app demarre
**Then** le store EventTarget expose `get()`, `set()`, `on()` pour un etat plat (season, revealed, activeSheet, selectedTeam, dataFresh)
**And** `data.js` fetch le JSON de saison (network-first), detecte la fraicheur, et appelle `set('season', data)` quand pret
**And** les composants ne fetchent jamais directement — ils reagissent a l'evenement `season-loaded`
**And** `router.js` gere le back Android via popstate/history API (~20 lignes)
**And** la navigation entre vues est < 100ms (NFR2)
**And** le demarrage depuis le cache est < 1s (NFR6)

### Story 2.3 : Layout page principale et structure HTML semantique

En tant qu'utilisateur,
Je veux une page unique scrollable avec la bonne hierarchie d'information,
Afin de trouver l'information sans effort.

**Acceptance Criteria:**

**Given** le fichier `src/app.js` et `index.html` sont configures
**When** l'app s'affiche
**Then** la page suit la structure : score card hero → cards achievement → bouton reveler → classement par zones → prochains matchs (UX-DR19)
**And** `<html lang="fr">`, `<meta name="theme-color" content="[violet]">` sont definis
**And** la structure utilise `<main>`, `<h1>` pour le nom d'equipe, `<section>` pour les zones (UX-DR15)
**And** pas de menu hamburger, pas de tab bar, pas de pagination
**And** le padding horizontal est 16px, zone de contenu 328-398px

### Story 2.4 : Score Card hero La Rochelle

En tant qu'utilisateur,
Je veux voir la fiche complete de La Rochelle des l'ouverture de l'app,
Afin de comprendre instantanement la situation de mon equipe favorite.

**Acceptance Criteria:**

**Given** les donnees de saison sont chargees dans le store
**When** l'app s'ouvre
**Then** la score card affiche la position actuelle et la position projetee de La Rochelle (FR14, FR15)
**And** la tendance (hausse/baisse/stable) depuis la derniere journee est visible (FR16)
**And** la barre XP affiche la probabilite top 6 avec les probabilites par zone accessibles au tap (FR17)
**And** les prochains matchs avec difficulte estimee sont visibles en scroll (FR18)
**And** l'explication du modele sur la trajectoire est affichee (FR19)
**And** la score card occupe ~40% de l'ecran au premier affichage (UX-DR4)
**And** le composant a son fichier `src/components/score-card.js` + `src/styles/components/score-card.css`
**And** le heading est `<h1>` avec aria-label sur la barre XP (UX-DR4)
**And** les zones tactiles font 48px minimum (UX-DR17)

### Story 2.5 : Badge "Nouvelle Journee"

En tant qu'utilisateur,
Je veux voir un indicateur quand de nouvelles donnees sont disponibles depuis ma derniere visite,
Afin de savoir immediatement si quelque chose a change.

**Acceptance Criteria:**

**Given** des donnees fraiches sont disponibles (lastVisit < lastDataUpdate)
**When** l'app s'ouvre
**Then** un badge pill "J[N] Nouveau" apparait sur la score card (UX-DR11)
**And** le badge est en violet pale/texte violet bold 11px
**And** le badge a `role="status"` et `aria-live="polite"` (UX-DR11)
**And** le badge disparait apres le premier reveal

**Given** les donnees en cache sont les memes que la derniere visite
**When** l'app s'ouvre
**Then** aucun badge n'est affiche
**And** l'app ne dit jamais "Pas de nouvelles donnees"

## Epic 3 : Classement Anime & Exploration des Equipes

L'utilisateur declenche la projection animee, voit les 14 equipes glisser vers leur position projetee avec un feedback visuel gradue, explore les zones de classement, et consulte la fiche detaillee de n'importe quelle equipe.

### Story 3.1 : Zones de classement et lignes d'equipe

En tant qu'utilisateur,
Je veux voir le classement actuel des 14 equipes organise par zones colorees,
Afin de comprendre d'un coup d'oeil la position de chaque equipe dans le championnat.

**Acceptance Criteria:**

**Given** les donnees de saison sont dans le store
**When** le classement s'affiche
**Then** les 14 equipes sont affichees dans leur position actuelle (FR20)
**And** les equipes sont regroupees en 4 zones : Europe (violet), Top 6 (vert), Ventre mou (gris), Maintien (rouge) (FR22, UX-DR7)
**And** chaque zone a un header colore et un fond teinte (violet pale, vert pale, gris pale, rouge pale)
**And** chaque ligne affiche : position, logo 28px, nom + Elo, delta colore, barre confiance 4px (UX-DR8)
**And** La Rochelle a une bordure violet accentuee et nom violet bold (UX-DR8)
**And** la barre de confiance a 3 paliers (vert >70%, orange 40-70%, rouge <40%) avec `role="meter"` (FR23, UX-DR10)
**And** chaque ligne a `aria-label` descriptif (UX-DR18)
**And** les zones sont des `<section>` avec `<h2>`, les equipes en `<ul>/<li>` (UX-DR15)
**And** les zones tactiles font 48px minimum avec 8px d'espacement (UX-DR17)

### Story 3.2 : Bouton "Reveler la Projection" et moteur d'animation

En tant qu'utilisateur,
Je veux declencher l'animation ou les equipes glissent vers leur position projetee,
Afin de vivre le moment de reveal comme un mini-evenement sportif.

**Acceptance Criteria:**

**Given** le classement actuel est affiche
**When** l'utilisateur tape le bouton "Reveler la projection"
**Then** les 14 equipes glissent vers leur position projetee via spring physics Motion (FR21, UX-DR12)
**And** le stagger est de 30ms entre equipes, La Rochelle en dernier (+100ms)
**And** la graduation du feedback est respectee : 0 places = pas d'anim, +-1 = 400ms, +-2 = 600ms overshoot, +-3+ = 800ms spring + glow (UX-DR12)
**And** les animations sont uniquement sur `transform` et `opacity` (60fps, NFR3)
**And** le bouton est gradient violet, pleine largeur, uppercase bold, visible sans scroll (UX-DR6)
**And** pendant l'animation : bouton desactive, texte "Projection en cours...", `aria-busy="true"` (UX-DR6, UX-DR18)
**And** apres le reveal : texte "Rejouer" pour re-declencher (UX-DR6)
**And** le feedback tactile au press est scale 0.97 (50ms) + retour spring 150ms (UX-DR14)

**Given** `prefers-reduced-motion` est active
**When** l'utilisateur tape "Reveler"
**Then** le classement projete s'affiche instantanement sans animation (opacity seulement) (UX-DR13)
**And** les indicateurs de mouvement restent visibles

### Story 3.3 : Cards Achievement modele

En tant qu'utilisateur,
Je veux voir les resultats du modele predictif presentes comme des achievements de jeu video,
Afin de comprendre les predictions de facon ludique et engageante.

**Acceptance Criteria:**

**Given** les donnees de predictions de la semaine precedente sont disponibles
**When** les cards achievement s'affichent
**Then** une card "prediction correcte" affiche le nombre de matchs bien predits avec icone trophee, bordure doree/verte, fond teinte chaud (UX-DR5)
**And** une card "explication mouvement" explique pourquoi La Rochelle monte/descend avec icone ampoule, bordure violet, fond violet pale (UX-DR5)
**And** si le modele s'est trompe de facon notable : card "surprise" avec icone "?", bordure orange, ton humble (UX-DR5)
**And** les cards ont un style achievement unlock (bordure stylisee, degrade, icone proeminente), pas notification systeme
**And** chaque card a `role="article"` et `aria-label` descriptif (UX-DR5)
**And** le feedback tactile au tap est scale 0.97 (UX-DR14)

**Given** c'est la premiere journee (pas de prediction precedente a verifier)
**When** les cards s'affichent
**Then** seule la card explication est presente, pas de card prediction

### Story 3.4 : Bottom Sheet fiche detaillee equipe

En tant qu'utilisateur,
Je veux consulter la fiche detaillee de n'importe quelle equipe sans quitter le classement,
Afin d'explorer les rivaux et comparer les situations.

**Acceptance Criteria:**

**Given** le classement est affiche
**When** l'utilisateur tape sur une ligne d'equipe
**Then** un bottom sheet s'ouvre en slide up (300ms ease-out) avec overlay sombre 40% (FR24, UX-DR9)
**And** le bottom sheet affiche : header (logo + nom + positions), Elo avec jauge, forme recente (5 derniers matchs V/D/N), calendrier a venir avec difficulte, probabilites par zone
**And** le bottom sheet s'ouvre a mi-hauteur par defaut, drag up pour plein ecran (UX-DR9)
**And** la poignee de drag est une barre grise 40x4px en haut
**And** fermeture par swipe down, tap overlay, ou bouton fermer explicite
**And** le bottom sheet a `role="dialog"`, `aria-modal="true"`, focus trap quand ouvert (UX-DR9)
**And** le back Android ferme le bottom sheet (via router popstate)
**And** jamais plus d'un bottom sheet ouvert a la fois

### Story 3.5 : Etats vides et gestion offline gracieuse

En tant qu'utilisateur,
Je veux que l'app gere tous les cas d'absence de donnees de facon elegante,
Afin de ne jamais voir un ecran d'erreur technique.

**Acceptance Criteria:**

**Given** c'est le premier lancement, aucun cache n'existe
**When** l'app s'ouvre
**Then** les donnees JSON embarquees dans le build sont affichees (UX-DR20)
**And** le badge "Nouveau" est present
**And** pas de tutoriel ni d'onboarding

**Given** l'utilisateur est offline avec des donnees en cache
**When** l'app s'ouvre
**Then** l'experience est identique au mode en ligne, sans badge "Nouveau" (UX-DR20)
**And** aucune indication "vous etes offline"

**Given** l'utilisateur est offline sans aucun cache (cas extreme)
**When** l'app s'ouvre
**Then** un ecran minimaliste affiche le logo Whistle + "Les donnees arrivent lundi" (UX-DR20)
**And** pas de message d'erreur technique

**Given** le pipeline n'a pas mis a jour les donnees depuis > 7 jours
**When** l'app s'ouvre
**Then** un texte discret sous la score card indique "Derniere mise a jour : [date]" (UX-DR20)

## Epic 4 : PWA, Offline & Deploiement

L'utilisateur installe Whistle sur Android, consulte les donnees en cache sans connexion, et recoit silencieusement les mises a jour en arriere-plan. L'app est deployee sur GitHub Pages.

### Story 4.1 : Configuration Service Worker et strategies de cache

En tant qu'utilisateur,
Je veux que l'app mette en cache les assets et les donnees intelligemment,
Afin de beneficier d'un chargement instantane et d'un fonctionnement offline complet.

**Acceptance Criteria:**

**Given** `vite.config.js` est configure avec vite-plugin-pwa et Workbox
**When** l'app est buildee et servie
**Then** les assets statiques (JS, CSS, images, fonts) utilisent la strategie cache-first
**And** les fichiers JSON de donnees utilisent la strategie network-first
**And** les assets sont precaches lors de l'installation du Service Worker
**And** quand des donnees fraiches arrivent en arriere-plan, le store est notifie (`data-refreshed`) et le badge "Nouveau" apparait silencieusement (FR38)
**And** le chargement initial est < 2s sur 4G (NFR1)
**And** le demarrage depuis le cache est < 1s (NFR6)
**And** les assets totaux sont < 200Ko gzippe (NFR4)

### Story 4.2 : Manifest PWA, icones et installation Android

En tant qu'utilisateur,
Je veux installer Whistle sur mon ecran d'accueil Android sans passer par un store,
Afin d'y acceder comme une app native.

**Acceptance Criteria:**

**Given** le manifest PWA est genere par vite-plugin-pwa
**When** l'utilisateur visite l'app dans Chrome Android
**Then** le prompt d'installation ("Ajouter a l'ecran d'accueil") est disponible (FR36)
**And** le manifest definit `display: "standalone"`, `orientation: "portrait"`
**And** les icones 192px et 512px sont presentes dans `public/icons/`
**And** le splash screen affiche le logo Whistle sur fond violet
**And** `<meta name="theme-color">` colore la barre de statut Android en violet
**And** l'app installee s'ouvre en standalone sans barre d'adresse

**Given** l'utilisateur a installe l'app
**When** il l'ouvre depuis l'ecran d'accueil
**Then** les dernieres donnees en cache sont affichees immediatement (FR37)
**And** les nouvelles donnees se chargent en arriere-plan si connecte

### Story 4.3 : Deploiement GitHub Pages

En tant qu'utilisateur,
Je veux que l'app soit accessible via une URL publique hebergee gratuitement,
Afin de pouvoir l'utiliser depuis n'importe quel appareil Android.

**Acceptance Criteria:**

**Given** le code est pushe sur le repository GitHub
**When** le build est declenche (manuellement ou via le pipeline)
**Then** `npm run build` produit un `dist/` optimise (minifie, tree-shake)
**And** le `dist/` est deploye sur la branche `gh-pages`
**And** l'app est servie via GitHub Pages a l'URL du projet
**And** les fichiers JSON `data/` sont accessibles depuis l'app deployee
**And** le Service Worker fonctionne correctement sur le domaine GitHub Pages

## Epic 5 : Transparence du Modele (Phase 2)

L'utilisateur comprend ce que le modele sait, comment il calcule ses projections, ou il s'est trompe, et comment il s'auto-corrige. Il peut basculer entre mode simple et mode detaille.

### Story 5.1 : Vue transparence — donnees sources et metriques du modele

En tant qu'utilisateur,
Je veux consulter les donnees sources du modele, le Brier Score et le taux de prediction,
Afin de jauger la fiabilite des projections au fil de la saison.

**Acceptance Criteria:**

**Given** l'utilisateur tape sur une card achievement ou un lien "En savoir plus"
**When** la vue transparence s'affiche
**Then** les donnees sources du modele sont consultables (score Elo detaille, forme recente, facteurs domicile/exterieur, calendrier pondere) (FR25)
**And** le Brier Score est affiche avec son evolution visuelle au fil de la saison (FR26)
**And** le nombre de matchs correctement predits est visible (FR27)
**And** les informations sont presentees en progressive disclosure (simple d'abord, details au tap)

### Story 5.2 : Journal de corrections et recalibrage automatique

En tant qu'utilisateur,
Je veux consulter le journal des corrections du modele et voir ses recalibrages,
Afin de comprendre comment il apprend de ses erreurs.

**Acceptance Criteria:**

**Given** le modele a effectue des recalibrages
**When** l'utilisateur consulte le journal de corrections
**Then** chaque correction est documentee : quoi a change, pourquoi, quel impact (FR28)
**And** le ton est humble et intrigant ("Mi-saison : facteur domicile recalibre de 1.2 a 1.35 pour La Rochelle")
**And** le systeme recalibre automatiquement ses parametres a mi-saison et fin de saison avec tracabilite (FR29)
**And** le journal est accessible depuis la vue transparence via un tap "En savoir plus" (mode nerd)

### Story 5.3 : Mode simple / mode detaille

En tant qu'utilisateur,
Je veux basculer entre un mode simple et un mode detaille,
Afin de choisir mon niveau de profondeur d'information.

**Acceptance Criteria:**

**Given** l'utilisateur est sur n'importe quelle vue
**When** il bascule le mode (tap sur un toggle ou "En savoir plus")
**Then** le mode simple affiche l'essentiel (positions, tendances, probabilites) (FR30)
**And** le mode detaille ajoute : Elo, Brier Score, forme 5 matchs, facteurs, journal corrections
**And** le mode simple est le defaut — le detail ne s'impose jamais
**And** le choix est persiste entre les sessions

### Story 5.4 : Micro-classement confrontations directes et gestion promus

En tant qu'utilisateur,
Je veux que les equipes a egalite de points soient departagees par confrontation directe et que les promus soient correctement geres,
Afin que le classement reflete les regles reelles du TOP 14.

**Acceptance Criteria:**

**Given** deux equipes ou plus sont a egalite de points dans le classement
**When** le classement est calcule
**Then** un micro-classement base sur les confrontations directes les departage (FR31)
**And** l'indicateur de departage est visible dans la fiche detaillee

**Given** une equipe promue de Pro D2 rejoint le TOP 14
**When** le modele calcule son Elo initial
**Then** un proxy base sur les performances Pro D2 avec coefficient de decote est utilise (FR32)
**And** la confiance pour cette equipe est marquee comme basse en debut de saison

## Epic 6 : Simulateur (Phase 2/3)

L'utilisateur modifie les resultats de matchs a venir et voit instantanement l'impact anime sur le classement projete.

### Story 6.1 : Selection et modification de resultats de matchs

En tant qu'utilisateur,
Je veux modifier le resultat de matchs a venir (victoire, nul, defaite, bonus),
Afin de creer des scenarios hypothetiques.

**Acceptance Criteria:**

**Given** l'utilisateur accede au simulateur depuis le classement ou la fiche equipe
**When** la liste des prochains matchs de la journee s'affiche
**Then** chaque match est tappable pour choisir un resultat (victoire domicile, nul, victoire exterieur + bonus eventuel) (FR33)
**And** le resultat selectionne est visuellement confirme
**And** l'utilisateur peut modifier plusieurs matchs avant de simuler
**And** un compteur de matchs simules est visible
**And** un bouton "Reinitialiser" remet tous les resultats a zero

### Story 6.2 : Recalcul instantane et animation de l'impact

En tant qu'utilisateur,
Je veux voir l'impact anime de mes scenarios sur le classement projete,
Afin de jouer avec les futurs possibles et comprendre les enjeux.

**Acceptance Criteria:**

**Given** l'utilisateur a selectionne un ou plusieurs resultats simules
**When** il tape "Voir l'impact"
**Then** les projections sont recalculees instantanement avec les resultats simules (FR34)
**And** le classement se reanime avec la meme mecanique que le reveal reel (spring, stagger, graduation) (FR35)
**And** les deltas sont clairement affiches ("La Rochelle +4% top 6", "Toulouse -1 place")
**And** une distinction visuelle claire differencie le mode simule du mode reel (pas de confusion possible)
**And** un bouton "Revenir au reel" permet de quitter le mode simule et retrouver le classement projete reel

## Migration Plan: Saisie manuelle des matchs + Vercel

### Migration Requirements

- MR1 : La saisie des matchs remplace le scraping hebdomadaire.
- MR2 : La popup cockpit s'ouvre tant qu'il reste des matchs non saisis.
- MR3 : Le site public reste accessible sans authentification.
- MR4 : L'auth ne sert qu'a entrer dans le flux de saisie.
- MR5 : Les donnees vivent sur Vercel, pas dans GitHub Pages.
- MR6 : Le recalcul est complet et deterministe apres validation finale.
- MR7 : L'ancien pipeline GitHub Actions et le scraping sortent du runtime.

### Epic 8 : Saisie guidee des matchs

L'utilisateur renseigne manuellement les resultats du week-end dans une popup cockpit qui reste ouverte tant que tous les matchs ne sont pas completes.

### Story 8.1 : Maquette et cadrage de la popup cockpit

En tant qu'utilisateur qui va saisir les matchs,
Je veux une popup cockpit claire et rassurante,
Afin de completer les resultats sans me perdre.

### Story 8.2 : Detection des matchs manquants et ouverture bloquante

En tant qu'utilisateur,
Je veux que l'app detecte les matchs non saisis et ouvre automatiquement la popup,
Afin de savoir immediatement ce qu'il reste a renseigner.

### Story 8.3 : Saisie guidee d'un match

En tant qu'utilisateur,
Je veux saisir le score, les essais et voir les bonus calcules automatiquement,
Afin d'entrer un match vite et sans erreur.

### Story 8.4 : Sauvegarde locale, validation finale et accessibilite

En tant qu'utilisateur,
Je veux garder ma saisie en brouillon et valider uniquement quand tout est complet,
Afin de reprendre si je ferme l'onglet et de valider sans surprise.

### Epic 9 : Socle Vercel et auth admin

L'application est hebergee sur Vercel avec un front public sans auth et une zone admin reservee a la saisie des matchs.

### Story 9.1 : Deploiement du front sur Vercel

En tant que dev qui decouvre Vercel,
Je veux deplacer le front sur Vercel et comprendre le vocabulaire de base,
Afin de pouvoir tester et publier l'app sans me battre avec la plateforme.

### Story 9.2 : Modele de donnees et stockage Vercel Postgres

En tant que dev,
Je veux definir la base de donnees de la migration,
Afin de stocker les matchs, les snapshots et les logs de recalcul.

### Story 9.3 : Auth admin pour la saisie

En tant qu'utilisateur admin,
Je veux une authentification courte uniquement pour entrer dans la saisie,
Afin de proteger l'ecriture sans bloquer la consultation publique.

### Story 9.4 : API publique et API admin

En tant que front,
Je veux lire les donnees publiques et ecrire les saisies via des endpoints distincts,
Afin de garder un flux clair entre consultation et modification.

### Epic 10 : Recalcul et synchronisation

La validation finale reconstruit classement, Elo et projections a partir des matchs saisis.

### Story 10.1 : Moteur de recalcul complet

En tant que dev,
Je veux un moteur de calcul pur et deterministe,
Afin de reconstruire les donnees a partir de la source de verite sans etat cache fragile.

### Story 10.2 : Recalcul du classement, Elo et projections

En tant qu'utilisateur,
Je veux que tout soit recalcule apres validation finale,
Afin de voir immediatement l'impact sur le classement et les projections.

### Story 10.3 : Publication et rafraichissement des vues

En tant qu'utilisateur,
Je veux que l'app publique se mette a jour apres le recalcul,
Afin de voir les nouvelles donnees sans bricolage manuel.

### Epic 11 : Retrait du pipeline legacy

Le scraping, GitHub Actions et les references associees sortent du chemin critique.

### Story 11.1 : Retrait du scraping legacy

En tant que dev,
Je veux supprimer le scraping du runtime,
Afin que la migration ne dependa plus de la LNR ni d'un fallback automate.

### Story 11.2 : Retrait de GitHub Actions du flux metier

En tant que dev,
Je veux retirer le workflow GitHub Actions du chemin de production,
Afin que Vercel devienne le seul runtime.

### Story 11.3 : Nettoyage final et verification

En tant que dev,
Je veux nettoyer les docs, scripts et references obsoletes,
Afin que le projet soit lisible et coherent apres migration.

### Epic 12 : Enrichissement Donjon post-migration

Le Donjon recupere les statistiques rugby perdues pendant le retrait du `scraped.json`, sans recreer de dependance au pipeline legacy.

### Story 12.1 : Reafficher les essais dans le Donjon

En tant que supporter de La Rochelle,
Je veux revoir les essais marques et encaisses dans le Donjon,
Afin que le recit des matchs retrouve les stats rugby stockees dans le runtime Vercel.
