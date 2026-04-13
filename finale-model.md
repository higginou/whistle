# Finale — Modèle de projection de classement rugby

## Contexte

Application mobile de simulation de classement de fin de saison pour le Top 14 français.
Le modèle combine des facteurs permanents, des facteurs par match, des ajustements intersaison et un système d'auto-calibration progressive.

Le classement est simulé via **Monte Carlo (10 000 itérations)** sur les matchs restants.
Chaque itération produit un classement final. L'agrégation des 10 000 classements donne des probabilités par équipe (Top 2, Top 6, Relégation).

---

## Règles du Top 14

```
Victoire          → 4 pts
Défaite           → 0 pts
Nul               → 2 pts
Bonus offensif    → +1 pt (3 essais marqués de plus que l'adversaire)
Bonus défensif    → +1 pt (défaite par 5 pts ou moins)
Journées          → 26 journées par saison
Équipes           → 14 clubs
Qualifiés directs → Top 2
Qualifiés playoffs → Top 6
Relégation        → 13e et 14e
Départage égalité → Confrontations directes (H2H), puis différence de points H2H
```

---

## Source de données

API : **API-Sports** (rugby v1)
Plan gratuit : 100 requêtes/jour (suffisant pour usage personnel)

Endpoints utilisés :
- `/standings` — classement actuel
- `/games` — résultats et calendrier
- `/games/{id}` — compositions (lineups) pour détection blessures
- Saisie manuelle — transferts intersaison

---

## 1. Facteurs permanents

### 1.1 ELO

Mesure la force relative de chaque équipe sur le long terme.
ELO de départ : 1500 (moyenne). Plage typique Top 14 : 1300–1800.

```
pWin = 1 / (1 + 10^((eloAdversaire - eloEquipe - avantageDomicile) / 400))
avantageDomicile = 50 points ELO fixe
```

Mise à jour après chaque match :

```
delta = K * (résultatRéel - pWin)
  résultatRéel : 1.0 = victoire, 0.5 = nul, 0.0 = défaite

Si écart > 20 pts : delta *= 1.2  (bonus victoire dominante)

eloVainqueur += delta
eloPerdant   -= delta
```

K dynamique selon la progression dans la saison :

```
J1–J6   → K = 48  (très réactif, forte incertitude)
J7–J13  → K = 36
J14–J19 → K = 28
J20–J26 → K = 24  (stable, modèle consolidé)
```

---

### 1.2 Forme / Bonus

Indice de forme calculé sur les 5 derniers matchs, pondéré temporellement.

```
poids(i) = 0.8^i   (match récent = poids 1.0, le plus ancien = 0.8^4)

formScore = Σ (bonusPoints(match_i) / 2.0 * poids(i)) / Σ poids(i)
  bonusPoints : 0, 1 ou 2 par match (bonus offensif + bonus défensif)
```

Utilisation dans la simulation :

```
pBonusOffensif  = 0.30 * (0.5 + offensiveFormRate)
pBonusDefensif  = 0.35 * (0.5 + defensiveFormRate)

offensiveFormRate = nb matchs avec bonus offensif / 5 derniers matchs
defensiveFormRate = nb matchs avec bonus défensif ou défaite ≤ 15 pts / 5 derniers
```

---

### 1.3 Point Differential

Corrige les résultats chanceux. Une équipe qui gagne beaucoup de matchs serrés est statistiquement amenée à régresser.

Formule de Pythagorean Expectation adaptée au rugby (exposant 2.37) :

```
expectedWinRate = ptsFor^2.37 / (ptsFor^2.37 + ptsAgainst^2.37)
  ptsFor     = 500 + avgPointDiff
  ptsAgainst = 500 - avgPointDiff

consistencyModifier = 1.0 - (actualWinRate - expectedWinRate) * 0.3
```

Si l'équipe gagne plus que son différentiel ne le suggère → légère pénalité.
Si elle gagne moins → léger bonus (sous-cotée).

---

## 2. Facteurs par match

### 2.1 Avantage domicile

Intégré dans le calcul ELO via `avantageDomicile = 50`.
Représente ~8% de chance de victoire supplémentaire à domicile.

---

### 2.2 Difficulté du calendrier restant (Strength of Schedule)

```
SoS = moyenne(ELO adversaires restants) / 1500.0

SoS > 1.0 → calendrier difficile
SoS < 1.0 → calendrier favorable
```

Modifie la probabilité de victoire simulée pour chaque match futur :

```
pWin *= (1.0 / SoS_adversaire) * SoS_equipe * 0.15 + 0.85
```

---

### 2.3 Ratio domicile/extérieur restant

```
homeRatio = matchsDomicileRestants / totalMatchsRestants

homeAwayModifier = 1.0 + (homeRatio - 0.5) * 0.16

Exemples :
  Tous à domicile  (homeRatio=1.0) → modifier = 1.08  (+8%)
  Équilibré        (homeRatio=0.5) → modifier = 1.00  (neutre)
  Tous à extérieur (homeRatio=0.0) → modifier = 0.92  (-8%)
```

---

### 2.4 Fatigue / surcharge

Fenêtre glissante de 30 jours :

```
matchs30j ≤ 4 → fatiguePenalty = 1.00  (normal)
matchs30j = 5 → fatiguePenalty = 0.95  (-5%)
matchs30j = 6 → fatiguePenalty = 0.88  (-12%)
matchs30j ≥ 7 → fatiguePenalty = 0.80  (-20%)
```

Bonus récupération si ≥ 10 jours depuis le dernier match :

```
restBonus = 1.05
```

Application dans la simulation :

```
pWin *= fatiguePenalty(equipe) / fatiguePenalty(adversaire)
pWin *= restBonus si applicable
```

---

### 2.5 Blessures joueurs clés

Détection automatique via les lineups API :
si un titulaire habituel est absent 2+ matchs consécutifs → blessure probable.

Impact ELO selon l'importance du joueur :

```
Joueur clé     → -8%  (demi de mêlée, ouvreur, capitaine)
Titulaire      → -4%
Remplaçant     → -1%

injuryModifier = max(0.70, 1.0 - Σ pénalités)
pWin *= injuryModifier(equipe) / injuryModifier(adversaire)
```

---

## 3. Assemblage — probabilité de victoire simulée

Tous les facteurs se combinent multiplicativement :

```
pWin = calculateEloProbability(eloEquipe, eloAdversaire, domicile)

pWin *= formScore(equipe) / formScore(adversaire)
pWin *= homeAwayModifier(equipe, matchsRestants)
pWin *= fatiguePenalty(equipe) / fatiguePenalty(adversaire)
pWin *= injuryModifier(equipe) / injuryModifier(adversaire)
pWin *= consistencyModifier(equipe) / consistencyModifier(adversaire)

pWin = clamp(pWin, 0.05, 0.95)   // jamais 0% ni 100%
```

Simulation d'un match :

```
rand = random(0, 1)

si rand < pWin           → victoire équipe
si rand < pWin + 0.05    → nul (5% fixe)
sinon                    → défaite

bonus offensif  : tirage indépendant avec pBonusOffensif
bonus défensif  : tirage indépendant avec pBonusDefensif (perdant uniquement)
```

---

## 4. Facteurs intersaison

### 4.1 Mean Reversion ELO

Appliqué une fois à la fin de chaque saison, avant la suivante :

```
meanElo = 1500.0
factor  = 0.25  (ajustable selon l'intensité du mercato)

nouvelElo = eloActuel + (meanElo - eloActuel) * factor

Exemples avec factor=0.25 :
  Toulouse  1750 → 1688  (-62)
  Perpignan 1300 → 1350  (+50)
```

---

### 4.2 ELO fixe pour promus et relégués

```
Équipe promue de Pro D2  → ELO initial = 1420
Équipe reléguée en Pro D2 → ELO = 1380
```

Ces équipes reçoivent un K élevé (K=48) pendant toute la première moitié de saison
pour permettre une recalibration rapide.

---

### 4.3 Ajustement manuel des transferts

Saisie dans l'application en début de saison.
L'utilisateur évalue l'impact des transferts connus :

```
Recrutement majeur (joueur international)  → deltaElo = +15 à +30
Départ joueur clé                          → deltaElo = -10 à -25
Changement entraîneur                      → incertitude x1.5 (K augmenté de 50%)
Recrutement standard                       → deltaElo = +5 à +15
```

---

## 5. Départage en cas d'égalité de points

Appliqué dans chaque simulation Monte Carlo lorsque deux équipes terminent à égalité :

```
1. Points dans les confrontations directes H2H
2. Différence de points dans les H2H
3. Différence de points générale sur la saison
```

---

## 6. Auto-calibration

### 6.1 Brier Score

Métrique principale pour évaluer la qualité des prédictions :

```
brierScore(match) = (probabilitéPrédite - résultatRéel)²
  résultatRéel : 1.0 = victoire effective, 0.0 = défaite effective

brierScoreSaison = moyenne(brierScore sur tous les matchs joués)

Référence :
  0.25 → équivalent aléatoire pur
  0.20 → modèle correct
  0.17 → excellent
```

---

### 6.2 Recalibration mi-saison (après J13)

Mesure le biais de chaque facteur par comparaison du Brier Score
avec et sans ce facteur.

Ajustement des poids via gradient descent simplifié :

```
Pour chaque facteur f :
  scoreAvec    = brierScore(modèleComplet)
  scoreSans    = brierScore(modèleSansFActeur_f)

  si scoreSans > scoreAvec → facteur utile → poids += learningRate (0.05)
  si scoreSans < scoreAvec → facteur nuisible → poids -= learningRate

Normalisation finale : Σ poids = 1.0
```

Poids initiaux par défaut :

```
ELO                  → 40%
Forme / Bonus        → 20%
Calendrier restant   → 15%
Point Differential   → 10%
Domicile / Extérieur →  8%
Fatigue              →  4%
Blessures            →  2%
Confrontations H2H   →  1%
```

---

### 6.3 Bilan fin de saison

Métriques calculées à J26 :

```
erreurMoyennePosition = moyenne(|positionPrédite - positionRéelle|)
précisionTop6         = nb équipes Top6 correctement prédites / 6
précisionRelégation   = nb équipes reléguées correctement prédites / 2
```

Les poids optimaux de la saison sont sauvegardés localement.

---

### 6.4 Mémoire inter-saisons

Les poids évoluent progressivement d'une saison à l'autre.
Les saisons récentes pèsent plus que les anciennes :

```
poids(saison_i) = 0.7^(N - i)   (N = saison la plus récente)

poidsFinaux = moyenne pondérée des poids optimaux de toutes les saisons
```

Progression attendue du Brier Score avec l'accumulation de données :

```
Saison 1 → ~0.23  (poids par défaut)
Saison 2 → ~0.20
Saison 3 → ~0.18
Saison 4+ → ~0.17  (plateau — bruit irréductible du rugby)
```

---

## Résumé des paramètres configurables

| Paramètre | Valeur par défaut | Description |
|---|---|---|
| `avantageDomicile` | 50 | Points ELO avantage terrain |
| `meanReversionFactor` | 0.25 | Intensité régression intersaison |
| `eloPromu` | 1420 | ELO initial équipe promue |
| `eloRelégué` | 1380 | ELO équipe reléguée |
| `kMax` | 48 | K début de saison |
| `kMin` | 24 | K fin de saison |
| `fenêtreFatigue` | 30 jours | Fenêtre calcul surcharge |
| `pNul` | 0.05 | Probabilité de match nul |
| `clampMin` | 0.05 | Probabilité victoire plancher |
| `clampMax` | 0.95 | Probabilité victoire plafond |
| `iterations` | 10 000 | Simulations Monte Carlo |
| `learningRate` | 0.05 | Vitesse recalibration poids |
| `formWindow` | 5 matchs | Fenêtre calcul forme |
| `formDecay` | 0.8 | Décroissance pondération forme |
