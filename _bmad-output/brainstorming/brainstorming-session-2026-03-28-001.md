---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'PWA de projection du classement final du TOP 14 rugby français'
session_goals: 'Modèle prédictif auto-correctif, affichage classement actuel vs projeté, bonus, installation PWA sans store'
selected_approach: 'ai-recommended'
techniques_used: ['Morphological Analysis', 'SCAMPER Method', 'Constraint Mapping']
ideas_generated: 72
session_active: false
workflow_completed: true
context_file: ''
---

# Brainstorming Session — Whistle

**Facilitateur :** higgin
**Date :** 2026-03-28
**Projet :** PWA de projection du classement final du TOP 14

## Session Overview

**Sujet :** Application PWA légère pour le rugby français TOP 14 — projection du classement final
**Objectifs :**
- Modèle prédictif qui s'affine automatiquement au fil de la saison (auto-correction)
- Affichage du classement actuel vs classement projeté
- Informations complémentaires : bonus offensif/défensif, différentiel de points, etc.
- Installation directe sur téléphone via PWA (pas de store)

## Technique Selection

**Approche :** Techniques recommandées par l'IA
**Techniques utilisées :** Morphological Analysis → SCAMPER Method → Constraint Mapping

## Inventaire complet des idées (72)

### Thème 1 : Modèle prédictif intelligent

| # | Titre | Description |
|---|---|---|
| 1 | API-Sports (plan gratuit) | Source de données initiale envisagée — remplacée par scraping LNR |
| 2 | Phases de saison adaptatives | Le modèle change de comportement selon la phase : rodage (J1-J8), croisière (J9-J18), sprint final (J19-J26) |
| 3 | Poids contextuel du match multi-enjeux | Score d'enjeu par match basé sur ce qui est en jeu pour chaque équipe (Europe, top 6, maintien) — enjeu asymétrique |
| 4 | Forme récente > forme globale avec décroissance | Les 5 derniers matchs pèsent plus que les 10 précédents, courbe de décroissance temporelle |
| 5 | Enjeu activé à mi-saison (J14+) | Le score d'enjeu ne s'active qu'après J13, avant = forme pure |
| 6 | Matrice enjeu × domicile/extérieur | Équipe qualifiée = lâche à l'extérieur mais défend son stade. Équipe en maintien = s'effondre partout |
| 7 | Micro-classement confrontations directes | Classement parallèle basé sur les résultats directs entre équipes à égalité de points |
| 25 | Système Elo adapté rugby | Score Elo par équipe, pondéré par écart de score et calibre adversaire — auto-correctif par nature |
| 26 | Expected Points (xP) | Combien de points une équipe "aurait dû" marquer — détecte les équipes chanceuses/malchanceuses |
| 50 | Fiabilité début de saison | Proxy inter-saison + confiance basse affichée en début de saison |
| 51 | Gestion des promus | Performances Pro D2 comme proxy avec coefficient de décote |
| 52 | Anti-surréaction (lissage) | Décroissance temporelle + Elo = lissage naturel contre la volatilité |

### Thème 2 : Expérience utilisateur animée

| # | Titre | Description |
|---|---|---|
| 8 | Classement animé "course de chevaux" | Les équipes glissent vers leur position projetée, vitesse proportionnelle à la confiance |
| 9 | Slider temporel "voyage dans la saison" | Glisser de "Aujourd'hui" à "Fin de saison", classement se réorganise en temps réel |
| 10 | Confiance par barre de chaleur | Vert = haute confiance, orange = incertain, rouge = volatile. Tap pour les détails |
| 11 | Zones de classement colorées | Bleu (Europe), vert (top 6), gris (ventre mou), rouge (maintien) — animation de franchissement |
| 13 | Replay de saison accéléré | Animation 15-20 secondes rejouant toute la saison, pause/ralenti/accéléré |
| 14 | Notifications visuelles de mouvement | Flèches ↑↓ post-journée, mouvements spectaculaires mis en avant |
| 21 | Météo de confiance | Soleil/nuage/orage au lieu de pourcentages — intuitif pour tous |
| 28 | Replay + micro-événements contextuels | "J8 : Dupont blessé", "J15 : changement d'entraîneur" — le replay raconte l'histoire |
| 36 | 100% visuel, zéro tableau | Piste de course verticale avec logos, zones colorées, tap pour les chiffres |
| 48 | Animations fluides mobile | CSS transitions + micro-lib (Motion One), éviter les frameworks lourds |

### Thème 3 : Features supporter

| # | Titre | Description |
|---|---|---|
| 15 | Mode focus équipe | Vue dédiée : courbe de position passé/projeté, calendrier restant, scénario rêvé/cauchemar |
| 16 | Équipe favorite épinglée | Choix au premier lancement, surbrillance permanente, notifications orientées |
| 17 | Simulateur "Et si..." | Modifier un résultat à venir → classement projeté se réanime instantanément |
| 18 | Probabilités par zone | "72% top 6, 18% maintien" — jauge visuelle simple |
| 23 | Notifications filtrées rivaux | "Bordeaux a perdu : +2% de chances de top 6 pour ton équipe !" |
| 29 | Zoom micro-batailles | Vue resserrée sur la lutte pour la 6ème place ou le maintien |
| 31 | Projections mi-temps live | Recalcul en live pendant un match — impact sur le classement en temps réel |
| 39 | "Que faut-il pour..." | Objectif → chemin nécessaire. "Que doit faire Clermont pour finir top 6 ?" |

### Thème 4 : Architecture & Pipeline

| # | Titre | Description |
|---|---|---|
| 19 | Fallback scraping LNR | Si API-Sports atteint ses limites, scraper lfrugby.com — données publiques |
| 20 | Calcul 100% client | Modèle JS côté navigateur, données en JSON statique — PWA offline |
| 43r | LNR comme source principale | Toutes les données sur lfrugby.com — résultats, lineups, bonus, classement |
| 45 | Stabilité du scraping | Sélecteurs larges + alertes si format change. Vérifier endpoints JSON AJAX |
| 46 | Fréquence : un scrape le lundi | Matchs ven-sam-dim, classement mis à jour après le dernier match |
| 47 | Performance client | 14 équipes × 26 journées × 10 facteurs = quelques Ko — calcul instantané |
| 49 | PWA sur iOS | Onboarding "Comment installer" avec captures d'écran pour iOS Safari |
| 53 | Coût zéro | PWA statique + scraping = hébergement gratuit, pas de BDD, pas de serveur |
| 54 | GitHub Actions cron lundi | Scrape → validate → predict → commit JSON → redéploiement auto |
| 55 | Investigation endpoints JSON LNR | Sites modernes = AJAX JSON. Si trouvé, pas besoin de parser du HTML |
| 56 | Structure données à capturer | Classement, résultats, compositions, calendrier — par journée |
| 57 | Schéma JSON par saison | /data/2025-2026/ avec standings, results, lineups, schedule, predictions |
| 58 | Workflow GitHub Actions complet | Scrape → validate → predict (Python) → commit → deploy |
| 59 | Gestion journées multi-jours | Variable journee_complete: true/false, re-scrape si match reporté |
| 60 | Scrape résilient | Retry mardi/mercredi si lundi échoue, issue GitHub après 3 échecs |
| 61 | Python pour le modèle | Dans la GitHub Action, plus naturel pour le calcul prédictif |
| 62 | Double sortie : projection + confiance | Position, confiance %, fourchette optimiste/pessimiste, probabilités par zone |
| 63 | Prédictions append-only | Historique complet semaine par semaine — time machine des prédictions |
| 64 | Hébergement statique gratuit | Vercel, Netlify ou GitHub Pages — redéploiement auto sur commit |
| 65 | Service Worker + cache agressif | JSON cachés, mise à jour en arrière-plan — chargement instantané même en 3G |
| 66 | Scraping 100% client (écarté) | Possible mais CORS + complexité → GitHub Actions préféré |
| 67 | Contrainte CORS | Proxy nécessaire si scrape client — éliminé par choix GitHub Actions |
| 68 | IndexedDB local (écarté pour MVP) | Stockage local possible mais GitHub Actions + JSON statique plus simple |
| 69 | Rafraîchissement intelligent | L'app sait quand la prochaine journée est prévue |
| 70 | Chargement initial | Premier lancement = charger toute la saison en cours |
| 71 | Proxy same-origin Vercel (alternative) | Vercel Function comme route API — CORS éliminé architecturalement |
| 72 | Architecture hybride finale | GitHub Actions = cuisine, GitHub Pages/Vercel = service, PWA = salle |

### Thème 5 : Features sociales & bonus

| # | Titre | Description |
|---|---|---|
| 22 | Replay + fork "Et si..." | Bifurquer le replay à n'importe quelle journée et simuler une saison alternative |
| 24 | Track record du modèle | "Ce modèle a prédit correctement 11/14 positions finales la saison dernière" |
| 27 | Power rankings communautaires | L'utilisateur vote si une équipe est sur/sous-évaluée |
| 30 | Impact des bonus visualisé | Mode "sans bonus" — quelles équipes doivent leur classement aux bonus |
| 32 | Cotes implicites vs bookmakers | Comparaison prédiction modèle vs cotes réelles — détection de value |
| 33 | Pronostics entre amis | Ligue privée, chacun son classement prédit, Homme vs Machine |
| 34 | Saisons passées en backtesting | Charger les données historiques, voir ce que le modèle aurait prédit |
| 35 | Widget embarquable | Iframe pour blogs rugby et groupes Facebook |
| 37 | Zéro login | localStorage uniquement, pas de RGPD, pas de base users |
| 38 | Mode nerd optionnel | Simple par défaut, détails techniques sur demande |
| 40 | Le modèle admet ses erreurs | "Le modèle s'est trompé sur..." avec explication de la surprise |
| 41 | L'utilisateur nourrit le modèle | Signaler des infos non captées — intelligence collective + IA |

### Contraintes cartographiées

| Contrainte | Verdict |
|---|---|
| API-Sports nécessaire | **Éliminée** — la LNR suffit |
| Calcul serveur nécessaire | **Imaginée** — tout peut tourner côté client ou dans GitHub Actions |
| Coût d'hébergement | **Imaginée** — gratuit (GitHub + Vercel/Pages) |
| Animations mobiles | **Gérable** — CSS transitions + micro-lib |
| PWA sur iOS | **Vraie mais gérable** — onboarding dédié |
| Fiabilité début de saison | **Vraie** — proxy inter-saison + transparence |
| Promus imprévisibles | **Vraie** — proxy Pro D2 + prior conservateur |
| Stabilité du scraping | **Vraie** — endpoints JSON AJAX à investiguer |
| CORS si scrape client | **Éliminée** — GitHub Actions côté serveur |

## Priorisation

### MVP — Le classement projeté

| Composant | Idées | Description |
|---|---|---|
| Pipeline data | #58, #72, #43r | GitHub Actions scrape LNR chaque lundi → JSON dans le repo |
| Modèle Elo rugby | #25, #4, #52 | Elo adapté avec décroissance temporelle et lissage |
| Classement actuel + projeté | #8, #11 | Vue animée avec zones colorées |
| Confiance du modèle | #21 | Indicateur visuel par équipe |
| PWA installable | #64, #65, #37 | Statique, cache agressif, zéro compte |

### V1.1 — Enrichissement du modèle

| Composant | Idées |
|---|---|
| Phases de saison adaptatives | #2, #5 |
| Matrice enjeu × domicile/extérieur | #6 |
| Micro-classement confrontations directes | #7 |
| Détection lineup (blessures/fatigue) | Idée initiale |
| Gestion des promus | #51 |

### V1.2 — Features supporter

| Composant | Idées |
|---|---|
| Équipe favorite épinglée | #16 |
| Mode focus équipe | #15 |
| Notifications de mouvement | #14 |
| Probabilités par zone | #18 |

### V2 — Le fun

| Composant | Idées |
|---|---|
| Replay de saison | #13, #28 |
| Simulateur "Et si..." | #17 |
| "Que faut-il pour..." | #39 |
| Zoom micro-batailles | #29 |
| Slider temporel | #9 |

### V3 — Social & bonus

| Composant | Idées |
|---|---|
| Pronostics entre amis | #33 |
| Le modèle admet ses erreurs | #40 |
| Saisons passées | #34 |
| Impact des bonus | #30 |

## Plan d'action MVP

### Étape 1 : Valider la source de données
- Explorer lfrugby.com pour identifier les endpoints JSON AJAX
- Documenter la structure des données disponibles (classement, résultats, lineups, bonus)
- Écrire un script de scraping prototype en Python

### Étape 2 : Construire le modèle prédictif
- Implémenter le système Elo adapté rugby en Python
- Intégrer la décroissance temporelle (forme récente > globale)
- Backtester sur les données des saisons passées pour calibrer

### Étape 3 : Pipeline GitHub Actions
- Créer le workflow cron (lundi 6h)
- Scrape → validation → prédiction → commit JSON
- Mécanisme de retry et alertes en cas d'échec

### Étape 4 : PWA front-end
- Structure HTML/CSS/JS minimaliste mobile-first
- Classement animé avec zones colorées
- Indicateur de confiance visuel
- Service Worker pour cache et installation PWA

### Étape 5 : Déploiement
- Hébergement sur GitHub Pages ou Vercel (gratuit)
- Tester l'installation PWA sur Android et iOS
- Onboarding iOS si nécessaire

## Session Insights

**Découvertes clés :**
- La LNR fournit toutes les données nécessaires gratuitement — pas besoin d'API tierce
- Le volume de données du TOP 14 est minuscule (14 équipes, 26 journées) — calcul instantané
- L'architecture GitHub Actions + JSON statique + PWA = coût zéro et maintenance quasi nulle
- Les signaux faibles (lineup, fatigue, enjeu asymétrique) sont le différenciateur du modèle

**Décisions architecturales :**
- GitHub Actions comme pipeline data (pas de scraping côté client)
- Python pour le modèle prédictif (dans la GitHub Action)
- PWA statique pour le front (JS vanilla ou micro-framework)
- JSON append-only pour l'historique des prédictions
- Zéro compte utilisateur, zéro base de données

**Vision produit :**
Whistle est une PWA de supporter : on ouvre l'app, on voit le classement actuel, on appuie "Projeter" et les équipes glissent vers leur position prédite de fin de saison. Simple, animé, fun, gratuit.
