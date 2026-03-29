---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: ['brainstorming/brainstorming-session-2026-03-28-001.md']
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 1
  projectDocs: 0
classification:
  projectType: 'web_app'
  domain: 'sports_entertainment'
  complexity: 'low'
  projectContext: 'greenfield'
---

# Product Requirements Document - Whistle

**Auteur :** higgin
**Date :** 2026-03-28

## Executive Summary

Whistle est une PWA personnelle qui projette le classement final du TOP 14 de rugby à partir d'un modèle prédictif Elo adapté. L'application répond à une question de supporter : **mon équipe peut-elle se qualifier ?** — via une visualisation animée où les équipes glissent vers leur position projetée de fin de saison.

Utilisateur cible : supporter unique (le créateur), suit La Rochelle, saison 2025-2026.

### Ce qui rend Whistle unique

Le différenciateur est l'animation. Les classements projetés existent en données brutes sur de nombreux sites, mais aucun outil ne les rend **visuels et vivants**. Whistle transforme des prédictions statistiques en expérience quasi-sportive : les équipes bougent, montent, descendent — on regarde une course, pas un tableur.

Insight technique : le TOP 14 (14 équipes, 26 journées) produit un volume de données minuscule. Le calcul prédictif tourne dans une GitHub Action hebdomadaire, les résultats sont servis en JSON statique, et la PWA fonctionne offline. Coût d'infrastructure : zéro.

## Project Classification

- **Type :** Web App (PWA / SPA)
- **Domaine :** Sports / Divertissement
- **Complexité :** Faible — pas de données sensibles, pas de comptes utilisateurs, pas de contraintes réglementaires
- **Contexte :** Greenfield
- **Plateforme cible :** Android uniquement (Chrome primaire, Firefox/Samsung Internet secondaires)

## Success Criteria

### Succès Utilisateur

- **Ressenti immédiat** : ouvrir l'app et *voir* l'impact de la dernière journée sur le classement projeté en quelques secondes
- **Transparence du modèle** : comprendre ce que le modèle a appris, ses données sources, ses corrections, et combien de matchs il a correctement prédits
- **Envie d'y revenir** : l'app donne envie d'être ouverte plusieurs fois par semaine

### Succès Business

Projet personnel — le succès se mesure par :
- **Satisfaction personnelle** : l'outil est fun et visuellement plaisant
- **Apprentissage** : progression en modélisation prédictive et développement PWA
- **Pérennité** : le pipeline tourne de façon autonome toute la saison

### Succès Technique

- **Fiabilité du pipeline** : GitHub Action scrape, calcule et déploie chaque lundi sans intervention
- **Auto-correction du modèle** : recalibrage automatique à mi-saison et fin de saison, avec traçabilité
- **Brier Score** : métrique de référence pour la qualité prédictive, affichée dans l'app
- **Taux de prédiction** : nombre de matchs correctement prédits visible dans l'app
- **Performance** : chargement < 2s, offline, installable en PWA

### Résultats Mesurables

- Brier Score en amélioration au fil de la saison
- Pipeline GitHub Actions : 0 intervention manuelle sur une saison complète
- Temps de chargement < 2 secondes sur 4G
- Modèle capable d'expliquer ses corrections : "J'ai sous-estimé X parce que Y, j'ai ajusté Z"

## Product Scope & Phased Development

### Stratégie MVP

**Approche :** MVP d'expérience — le minimum pour ressentir visuellement les projections de classement. Valider que l'animation + le modèle Elo produisent une expérience fun et crédible.

**Ressources :** Développeur solo, pas de contrainte de délai.

### Phase 1 — MVP

- Pipeline data : GitHub Actions scrape LNR chaque lundi → JSON dans le repo
- Modèle Elo adapté rugby avec décroissance temporelle et lissage
- Gestion de la fiabilité en début de saison : proxy inter-saison + confiance basse affichée tant que le modèle manque de données
- Fiche équipe favorite (La Rochelle) en page d'accueil : position actuelle, position projetée, tendance, probabilités par zone, prochains matchs avec difficulté estimée
- Classement animé : les 14 équipes glissent vers leur position projetée, zones colorées (Europe, top 6, ventre mou, maintien)
- Indicateur de confiance visuel par équipe
- PWA installable sur Android, cache agressif, fonctionnement offline
- Hébergement statique gratuit (GitHub Pages ou Vercel)

**Parcours supportés :** Lundi matin (mise à jour post-journée) + milieu de semaine (consultation en cache)

### Phase 2 — Growth

- Auto-correction du modèle à mi-saison et fin de saison avec traçabilité des ajustements
- Transparence du modèle : page données sources, corrections, taux de prédiction
- Brier Score affiché avec évolution au fil de la saison
- Explication des projections ("La Rochelle monte parce que...")
- Simulateur "Et si..." : modifier un résultat → classement se réanime
- Micro-classement confrontations directes entre équipes à égalité de points
- Gestion des promus : performances Pro D2 comme proxy avec coefficient de décote
- Mode nerd optionnel : simple par défaut, détails techniques sur demande
- Phases de saison adaptatives, matrice enjeu × domicile/extérieur
- Mode focus équipe, équipe favorite épinglée

### Phase 3 — Vision

- Replay de saison animé avec micro-événements contextuels
- "Que faut-il pour que La Rochelle finisse top 6 ?"
- Zoom micro-batailles (lutte pour la 6ème place, maintien)
- Slider temporel "voyage dans la saison"
- Le modèle admet ses erreurs publiquement
- Saisons passées en backtesting

### Mitigation des Risques

| Risque | Stratégie |
|---|---|
| Scraping LNR instable | Investiguer endpoints JSON AJAX d'abord. Fallback : API-Sports. Retry mardi/mercredi, alerte après 3 échecs |
| Qualité du modèle Elo | Backtester sur saisons passées. Confiance basse affichée en début de saison |
| Animations pas assez fun | Prototyper l'animation très tôt, valider le ressenti avant le reste |
| Modèle trop imprécis | Auto-correction Phase 2. En MVP, afficher la confiance pour gérer les attentes |

## User Journeys

### Parcours 1 : Le lundi matin — "Qu'est-ce qui a changé ?"

**Persona :** higgin, supporter de La Rochelle, développeur.

**Scène d'ouverture :** Lundi matin, matchs du week-end terminés.

**L'expérience :**
L'app s'ouvre sur la **fiche La Rochelle** : position actuelle (7ème), position projetée (5ème ↑2), tendance (↑), probabilités par zone (62% top 6, 15% Europe, 0% maintien). En dessous, les prochains matchs avec difficulté estimée. Explication du modèle : "La Rochelle monte car victoire bonifiée à domicile + défaite de Bordeaux → probabilité top 6 passe de 54% à 62%."

Scroll vers le classement général. Bouton "Projeter" — les 14 équipes glissent vers leur position projetée. Zones colorées (bleu Europe, vert top 6, gris ventre mou, rouge maintien). La Rochelle glisse vers le haut.

**Moment de valeur :** L'animation + l'explication du *pourquoi*. Pas juste un chiffre — une histoire.

### Parcours 2 : En milieu de semaine — "Et si on regarde encore..."

**Scène d'ouverture :** Mercredi soir, pas de nouveau match.

**L'expérience :**
Chargement instantané depuis le cache. Parcours de la fiche La Rochelle, calendrier restant, difficulté des prochains matchs. Exploration des rivaux directs pour le top 6. Comparaison des projections, probabilités, confiance.

**Moment de valeur :** L'app est rapide, offline, toujours disponible. Post-MVP : le simulateur "Et si..." transforme ce parcours en terrain de jeu.

### Parcours 3 : Comprendre le modèle — "Pourquoi il pense ça ?"

**Scène d'ouverture :** Le modèle projette La Rochelle 8ème. higgin veut comprendre.

**L'expérience :**
Depuis la fiche La Rochelle, accès aux détails du modèle : score Elo, forme récente (5 derniers matchs), facteur domicile/extérieur, calendrier restant pondéré. Données brutes visibles. Brier Score (0.21 — en amélioration), taux de matchs prédits (68%).

Journal de corrections : "Mi-saison : le modèle a sous-estimé le facteur domicile pour La Rochelle (+12% vs estimation). Coefficient recalibré de 1.2 à 1.35."

**Moment de valeur :** Transparence totale. Le modèle n'est pas une boîte noire.

### Parcours 4 (Post-MVP) : Le simulateur — "Et si Toulouse perdait ?"

**Scène d'ouverture :** Toulouse joue Clermont samedi prochain.

**L'expérience :**
Simulateur → victoire Clermont avec bonus défensif Toulouse. Classement projeté se réanime : Toulouse -1 place, La Rochelle +4% top 6. Autre scénario : La Rochelle gagne avec bonus offensif.

**Moment de valeur :** Le fun de jouer avec les futurs possibles.

### Synthèse des capacités par parcours

| Parcours | Capacités révélées |
|---|---|
| Lundi matin | Fiche équipe favorite, animation classement, explication du modèle, probabilités par zone, calendrier avec difficulté |
| Milieu de semaine | Cache offline, navigation entre équipes, données toujours accessibles |
| Comprendre le modèle | Page transparence (données, Elo, forme, facteurs), Brier Score, taux de prédiction, journal de corrections |
| Simulateur | Modification de résultats, recalcul instantané, animation de l'impact |

## Exigences Spécifiques Web App (PWA)

### Architecture

SPA mobile-only ciblant Android via PWA installable. Données mises à jour hebdomadairement via JSON statique. Animations fluides côté client.

### Matrice Navigateurs

| Navigateur | Priorité |
|---|---|
| Chrome Android | Primaire — cible principale, support PWA natif |
| Firefox Android | Secondaire |
| Samsung Internet | Secondaire — basé sur Chromium |
| Safari iOS / Desktop | Hors scope |

### Design

- Mobile-only : optimisé pour écrans Android (360px-430px)
- Portrait uniquement, touch-first (zones tap 48px minimum)
- Accessibilité standard : contrastes suffisants, tailles lisibles, structure sémantique HTML

### Implémentation

- JS vanilla ou micro-framework léger
- Animations : CSS transitions + micro-lib optionnelle (<5Ko)
- Service Worker : cache-first (assets), network-first (JSON données)
- PWA : manifest.json, icônes, splash screen Android
- Données : JSON statique, fetch au chargement

## Functional Requirements

### Données & Pipeline

- FR1 : Le système récupère automatiquement les résultats, classements et calendrier du TOP 14 depuis la LNR chaque semaine
- FR2 : Le système valide l'intégrité des données scrapées avant intégration
- FR3 : Le système détecte une journée incomplète (matchs reportés) et re-scrape ultérieurement
- FR4 : Le système bascule sur API-Sports si la source LNR échoue
- FR5 : Le système alerte en cas d'échec répété du pipeline (après 3 tentatives)

### Modèle Prédictif

- FR6 : Le système calcule un score Elo adapté au rugby pour chaque équipe
- FR7 : Le système pondère la forme récente plus fortement que la forme globale (décroissance temporelle)
- FR8 : Le système projette le classement final à partir des scores Elo et du calendrier restant
- FR9 : Le système calcule un indice de confiance pour chaque projection
- FR10 : Le système calcule les probabilités par zone (Europe, top 6, ventre mou, maintien)
- FR11 : Le système estime la difficulté de chaque match à venir
- FR12 : Le système conserve l'historique complet des prédictions semaine par semaine (append-only)
- FR13 : Le système gère le début de saison avec un proxy inter-saison et une confiance basse affichée tant que les données sont insuffisantes

### Vue Équipe Favorite

- FR14 : L'utilisateur voit la fiche complète de son équipe favorite à l'ouverture de l'app
- FR15 : L'utilisateur voit la position actuelle et la position projetée
- FR16 : L'utilisateur voit la tendance (hausse/baisse) depuis la dernière journée
- FR17 : L'utilisateur voit les probabilités par zone
- FR18 : L'utilisateur voit les prochains matchs avec difficulté estimée
- FR19 : L'utilisateur voit l'explication du modèle sur la trajectoire de son équipe

### Classement Animé

- FR20 : L'utilisateur voit le classement actuel des 14 équipes
- FR21 : L'utilisateur déclenche l'animation de projection (équipes glissent vers position projetée)
- FR22 : L'utilisateur distingue visuellement les zones de classement
- FR23 : L'utilisateur voit l'indicateur de confiance par équipe
- FR24 : L'utilisateur navigue vers la fiche détaillée de n'importe quelle équipe

### Transparence du Modèle (Phase 2)

- FR25 : L'utilisateur consulte les données sources du modèle
- FR26 : L'utilisateur voit le Brier Score et son évolution
- FR27 : L'utilisateur voit le nombre de matchs correctement prédits
- FR28 : L'utilisateur consulte le journal de corrections (quoi a changé, pourquoi)
- FR29 : Le système recalibre automatiquement ses paramètres à mi-saison et fin de saison
- FR30 : L'utilisateur bascule entre un mode simple et un mode détaillé (nerd)

### Classement Avancé (Phase 2)

- FR31 : Le système calcule un micro-classement basé sur les confrontations directes entre équipes à égalité de points
- FR32 : Le système gère les équipes promues avec un proxy basé sur leurs performances en Pro D2 et un coefficient de décote

### Simulateur (Phase 2/3)

- FR33 : L'utilisateur modifie le résultat d'un match à venir
- FR34 : Le système recalcule instantanément les projections en fonction des résultats simulés
- FR35 : L'utilisateur voit l'animation de l'impact sur le classement

### PWA & Offline

- FR36 : L'utilisateur installe l'application sur Android sans passer par un store
- FR37 : L'utilisateur consulte les dernières données disponibles sans connexion internet
- FR38 : L'application détecte et charge les nouvelles données en arrière-plan

## Non-Functional Requirements

### Performance

- Chargement initial < 2 secondes sur 4G
- Navigation entre vues < 100ms (SPA, données en mémoire)
- Animation du classement : 60fps constant
- Assets totaux < 200Ko gzippé
- Données JSON par saison < 50Ko
- Démarrage depuis le cache (offline) < 1 seconde

### Intégration

- Le pipeline supporte un changement de structure HTML LNR sans modification majeure (sélecteurs résilients)
- Le passage LNR → API-Sports ne modifie que le module de scraping, sans impact sur le modèle ni le front-end
- Le format JSON intermédiaire constitue le contrat d'interface entre pipeline et front-end
- Délai maximum entre fin de journée et mise à jour : 24 heures
