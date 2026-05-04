# Story 1.5 : Calcul du modele Elo et projections

Status: done

## Informations

- **Epic :** Epic 1 — Fondation & Pipeline de Donnees
- **Statut :** done
- **Priorite :** Haute (bloque les stories 1.6 et 1.7)
- **Estimation :** Moyenne (4-8h)
- **ui-structural :** false
- **Dependances :** Story 1.1 (done), Story 1.2 (done — schema JSON defini), Story 1.3 (done — scraping LNR), Story 1.4 (done — validation des donnees)

## Story

En tant qu'utilisateur,
Je veux que le systeme calcule un score Elo adapte au rugby et projette le classement final,
Afin de voir des projections credibles basees sur les performances et le calendrier.

## Criteres d'acceptation

### AC1 : Calcul du score Elo adapte au rugby (FR6)

**Given** le script `scripts/elo.js` recoit les donnees validees (`data/scraped.json`)
**When** le calcul est execute
**Then** un score Elo est calcule pour chaque equipe a partir des resultats de matchs
**And** le facteur K est adapte au rugby (marge de victoire prise en compte)
**And** l'avantage domicile est integre dans le calcul
**And** les 14 equipes ont un score Elo apres execution

### AC2 : Decroissance temporelle — forme recente ponderee (FR7)

**Given** les resultats de matchs sont disponibles
**When** le calcul Elo est execute
**Then** les matchs recents ont plus d'impact que les matchs anciens
**And** la decroissance temporelle est appliquee de maniere configurable (pas de constante magique enfouie)

### AC3 : Projection du classement final (FR8)

**Given** les scores Elo sont calcules et le calendrier restant est disponible
**When** la projection est executee
**Then** le classement final projete est calcule pour les 14 equipes
**And** la projection utilise les Elo actuels et simule les matchs restants
**And** chaque equipe a un `projectedRank` (1-14)

### AC4 : Indice de confiance par projection (FR9)

**Given** les projections sont calculees
**When** le script termine
**Then** chaque equipe a un indice de confiance decimal entre 0 et 1
**And** la confiance diminue quand le nombre de matchs restants augmente
**And** la confiance augmente quand l'ecart Elo entre equipes est important

### AC5 : Probabilites par zone (FR10)

**Given** les projections sont calculees (via simulation Monte Carlo ou methode equivalente)
**When** le script termine
**Then** chaque equipe a des probabilites pour 4 zones : `europe`, `top6`, `mid`, `relegation`
**And** les probabilites sont des decimales entre 0 et 1
**And** la somme des 4 zones pour une equipe est egale a 1 (a la precision flottante pres)

### AC6 : Difficulte des matchs a venir (FR11)

**Given** les scores Elo sont calcules et le calendrier restant est disponible
**When** le script termine
**Then** chaque match du calendrier restant a un champ `difficulty` decimal entre 0 et 1
**And** la difficulte est fonction de l'ecart Elo entre les deux equipes + l'avantage domicile

### AC7 : Gestion du debut de saison (FR13)

**Given** le debut de saison ou tres peu de matchs ont ete joues (< 5 journees)
**When** le calcul est execute
**Then** le systeme utilise un proxy inter-saison (Elo de fin de saison precedente ou valeur par defaut)
**And** les indices de confiance sont explicitement bas (< 0.3)
**And** le calcul ne plante pas meme avec 0 resultats disponibles

### AC8 : Executable en local

**Given** le script est cree dans `scripts/elo.js`
**When** un developpeur execute `node scripts/elo.js`
**Then** le script charge `data/scraped.json`, execute tous les calculs, et ecrit le resultat
**And** le resultat est ecrit dans `data/elo-output.json` (fichier intermediaire pour `generate.js`)
**And** en cas de succes, le script affiche un resume et termine avec exit code 0
**And** en cas d'erreur, le script utilise `console.error()` et termine avec exit code 1

## Taches techniques

- [x] T1 : Creer `scripts/elo.js` avec le moteur de calcul Elo (AC: 1, 2)
  - [x] T1.1 : Definir les constantes du modele Elo (K-factor, avantage domicile, facteur marge)
  - [x] T1.2 : Implementer `calculateExpectedScore(eloA, eloB)` — probabilite de victoire
  - [x] T1.3 : Implementer `calculateEloChange(result, eloHome, eloAway)` — delta Elo avec marge de victoire
  - [x] T1.4 : Implementer `applyDecay(matchResults, currentMatchday)` — decroissance temporelle (AC: 2)
  - [x] T1.5 : Implementer `computeEloRatings(standings, results)` — calcul itératif des Elo pour toutes les equipes
  - [x] T1.6 : Initialiser les Elo avec un proxy inter-saison si debut de saison (AC: 7)
- [x] T2 : Implementer la projection du classement final (AC: 3, 5)
  - [x] T2.1 : Implementer `simulateMatch(eloHome, eloAway)` — simulation d'un match avec resultat probabiliste
  - [x] T2.2 : Implementer `simulateSeason(elos, calendar, numSimulations)` — Monte Carlo sur le calendrier restant
  - [x] T2.3 : Calculer `projectedRank` pour chaque equipe a partir des simulations
  - [x] T2.4 : Calculer les probabilites par zone a partir de la distribution des simulations (AC: 5)
- [x] T3 : Implementer la confiance et la difficulte (AC: 4, 6)
  - [x] T3.1 : Implementer `calculateConfidence(team, matchesPlayed, totalMatches)` — indice de confiance (AC: 4)
  - [x] T3.2 : Implementer `calculateMatchDifficulty(eloHome, eloAway)` — difficulte match (AC: 6)
- [x] T4 : Implementer la forme recente et la tendance
  - [x] T4.1 : Calculer `form` — 5 derniers resultats (`W`/`L`/`D`) pour chaque equipe
  - [x] T4.2 : Calculer `trend` — `up`/`down`/`stable` base sur l'evolution Elo recente
- [x] T5 : Implementer la fonction `main()` et l'ecriture du fichier de sortie (AC: 8)
  - [x] T5.1 : Charger et parser `data/scraped.json`
  - [x] T5.2 : Orchestrer les calculs (Elo -> projections -> confiance -> difficulte -> forme -> tendance)
  - [x] T5.3 : Ecrire le resultat dans `data/elo-output.json`
  - [x] T5.4 : Ajouter le guard ESM (pattern Stories 1.3/1.4)
- [x] T6 : Ecrire des tests vitest pour chaque module de calcul (AC: 1-8)
  - [x] T6.1 : Tests pour `calculateExpectedScore` (symetrie, bornes 0-1)
  - [x] T6.2 : Tests pour `calculateEloChange` (victoire domicile, exterieur, nul, marge)
  - [x] T6.3 : Tests pour `applyDecay` (matchs recents > matchs anciens)
  - [x] T6.4 : Tests pour `computeEloRatings` (14 equipes, somme constante)
  - [x] T6.5 : Tests pour `simulateMatch` (distribution de resultats coherente)
  - [x] T6.6 : Tests pour `simulateSeason` (probabilites par zone somme = 1)
  - [x] T6.7 : Tests pour `calculateConfidence` (bornes 0-1, debut saison < 0.3)
  - [x] T6.8 : Tests pour `calculateMatchDifficulty` (bornes 0-1)
  - [x] T6.9 : Tests pour la forme et la tendance
  - [x] T6.10 : Tests pour le cas debut de saison (0 resultats)

## Dev Notes

### Architecture du script

Le script `elo.js` est le 3e maillon du pipeline : `scrape.js` -> `validate.js` -> **`elo.js`** -> `generate.js`. Il lit `data/scraped.json` (valide par Story 1.4) et produit `data/elo-output.json` contenant les calculs Elo, projections, confiance et difficulte pour chaque equipe.

**Pattern de conception :** Exporter les fonctions de calcul individuellement pour les tests unitaires, et une fonction `main()` qui orchestre le tout. Utiliser le meme guard ESM que les scripts precedents.

### Format d'entree : `data/scraped.json`

Le fichier produit par `scrape.js` et valide par `validate.js` contient :

```json
{
  "scrapedAt": "2026-03-29T06:37:15.105Z",
  "source": "lnr",
  "matchday": 20,
  "complete": false,
  "standings": [
    {
      "id": "toulouse",
      "rank": 1,
      "points": 0,
      "played": 0,
      "won": 0,
      "drawn": 0,
      "lost": 0,
      "bonusOffensive": 0,
      "bonusDefensive": 0,
      "pointsFor": 0,
      "pointsAgainst": 0
    }
  ],
  "results": [
    {
      "matchday": 22,
      "date": "2026-03-28",
      "home": "toulouse",
      "away": "la-rochelle",
      "homeScore": 24,
      "awayScore": 18,
      "homeBonus": null,
      "awayBonus": "defensive"
    }
  ],
  "calendar": [
    {
      "matchday": 23,
      "date": "2026-04-04",
      "home": "la-rochelle",
      "away": "toulon"
    }
  ]
}
```

**Note :** Les `standings` du scraping LNR actuel ont des valeurs a 0 (table JS-rendered). Le calcul Elo doit se baser exclusivement sur `results[]` pour les scores, pas sur les stats de standings. Les `standings` servent uniquement pour le `currentRank` et la liste des equipes.

### Format de sortie : `data/elo-output.json`

Fichier intermediaire consomme par `generate.js` (Story 1.6). Structure :

```json
{
  "calculatedAt": "2026-03-29T10:00:00.000Z",
  "matchday": 20,
  "teams": [
    {
      "id": "la-rochelle",
      "currentRank": 3,
      "elo": 1575,
      "projectedRank": 5,
      "confidence": 0.72,
      "zones": { "europe": 0.15, "top6": 0.62, "mid": 0.23, "relegation": 0.0 },
      "form": ["W", "W", "L", "W", "D"],
      "trend": "up",
      "eloHistory": [1500, 1510, 1525, 1540, 1560, 1575]
    }
  ],
  "calendar": [
    {
      "matchday": 23,
      "date": "2026-04-04",
      "home": "la-rochelle",
      "away": "toulon",
      "difficulty": 0.65
    }
  ]
}
```

### Parametres du modele Elo

Les constantes doivent etre definies en `UPPER_SNAKE_CASE` en haut du fichier, pas enfouies dans le code :

| Parametre | Valeur suggeree | Description |
|---|---|---|
| `INITIAL_ELO` | 1500 | Elo de depart pour les equipes sans historique |
| `K_FACTOR` | 30 | Facteur K de base (sensibilite aux resultats) |
| `HOME_ADVANTAGE` | 65 | Points Elo d'avantage domicile (adapte rugby) |
| `MARGIN_FACTOR` | 0.006 | Poids de la marge de victoire dans le delta Elo |
| `DECAY_RATE` | 0.05 | Taux de decroissance temporelle par journee |
| `NUM_SIMULATIONS` | 10000 | Nombre de simulations Monte Carlo |
| `TOTAL_MATCHDAYS` | 26 | Nombre de journees en saison reguliere TOP 14 |

**Note :** Ces valeurs sont des points de depart raisonnables. Elles pourront etre ajustees lors du backtesting (Phase 3). L'important est qu'elles soient explicites et configurables.

### Modele Elo adapte rugby

**Score attendu :**
```
E(A) = 1 / (1 + 10^((eloB - eloA) / 400))
```

**Mise a jour Elo avec marge :**
```
newElo = oldElo + K * marginFactor * (result - expected)
```

Ou `marginFactor` amplifie le delta quand la marge de victoire est large. Le `result` est 1 (victoire), 0.5 (nul), 0 (defaite).

**Avantage domicile :** Ajouter `HOME_ADVANTAGE` au Elo de l'equipe a domicile avant le calcul du score attendu. Ne PAS modifier le Elo stocke.

**Decroissance temporelle :** Les matchs les plus recents ont un poids `1`, et le poids diminue exponentiellement pour les matchs plus anciens : `weight = exp(-DECAY_RATE * (currentMatchday - matchMatchday))`.

### Projection par Monte Carlo

Pour chaque simulation :
1. Partir des Elo actuels
2. Pour chaque match restant du calendrier, simuler le resultat base sur les probabilites Elo
3. Mettre a jour les Elo apres chaque match simule
4. Calculer le classement final (par points ou par Elo)
5. Repeter `NUM_SIMULATIONS` fois
6. La position projetee = mediane des positions finales
7. Les probabilites par zone = frequence d'apparition dans chaque zone / `NUM_SIMULATIONS`

**Zones TOP 14 :**
- `europe` : rang 1-2 (qualifies Champions Cup)
- `top6` : rang 3-6 (phases finales)
- `mid` : rang 7-12 (ventre mou)
- `relegation` : rang 13-14 (barrage/relegation)

### Gestion du debut de saison (FR13)

Si `matchday` <= 5 ou si `results[]` est vide/quasi-vide :
- Utiliser `INITIAL_ELO` (1500) pour toutes les equipes comme proxy
- Fixer la confiance a un niveau bas (< 0.3)
- Les projections sont possibles mais avec une forte incertitude

Le script ne doit jamais planter meme avec 0 resultats. Dans ce cas, le classement projete = classement actuel des standings, confiance tres basse, zones equi-reparties.

### Reutilisation du code existant

**IMPORTANT :** Reutiliser `VALID_TEAM_IDS` depuis `scripts/team-mapping.js` pour la liste des equipes valides si necessaire. Ne PAS redefinir la liste.

```js
import { VALID_TEAM_IDS } from './team-mapping.js';
```

### Guard ESM (pattern etabli en Stories 1.3/1.4)

```js
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
```

### Gestion des erreurs

Suivre le pattern pipeline :
- `console.error()` + `process.exit(1)` si erreur critique (fichier manquant, donnees corrompues)
- Pas de try/catch generique — chaque catch gere un cas precis ou laisse remonter
- Resume en `console.log()` a la fin en cas de succes (nombre d'equipes, matchday, plage Elo)

### Anti-patterns a eviter

- Ne PAS creer de fichier `utils.js` ou `helpers.js` — les fonctions restent dans `elo.js`
- Ne PAS utiliser les stats de standings (points, won, lost) pour le calcul Elo — utiliser exclusivement `results[]`
- Ne PAS modifier `data/scraped.json` — le script est read-only sur l'entree
- Ne PAS utiliser de try/catch generique
- Ne PAS stocker des pourcentages dans la sortie — toujours des decimales 0-1
- Ne PAS utiliser `Math.random()` sans seed pour les tests — les tests de Monte Carlo doivent etre deterministes ou verifier des proprietes statistiques (bornes, sommes)

### Donnees actuelles connues (Stories 1.3/1.4)

- Le scraping LNR produit des standings avec valeurs a 0 (best-effort)
- Les results contiennent les scores reels des matchs joues
- Le calendrier contient les matchs futurs sans scores
- La journee courante est 20 sur 26
- 14 equipes en TOP 14

### Project Structure Notes

- Fichier a creer : `scripts/elo.js`
- Fichier de sortie : `data/elo-output.json`
- Tests a creer : `tests/elo.test.js`
- Module reutilise : `scripts/team-mapping.js` (VALID_TEAM_IDS)
- Convention de tests etablie : `tests/` + `npx vitest run`
- Convention biome etablie : `npx biome check .`
- 143 tests existants (40 scrape + 46 schema + 57 validate) — ne PAS les casser

### References

- [Source: epics.md#Story 1.5] — criteres d'acceptation BDD
- [Source: architecture.md#Pipeline] — workflow unique + scripts modulaires en sequence
- [Source: architecture.md#Error Handling] — `console.error()` + exit code non-zero
- [Source: architecture.md#Data Flow] — scrape.js -> validate.js -> elo.js -> generate.js
- [Source: architecture.md#Format Patterns] — schema JSON de saison avec champs Elo, confiance, zones
- [Source: prd.md#FR6-FR13] — exigences fonctionnelles du modele predictif
- [Source: Story 1.3 Completion Notes] — format `data/scraped.json`, limitations standings
- [Source: Story 1.4 Completion Notes] — validation des donnees, 143 tests existants

## Code Review

**Date :** 2026-03-29
**Reviewer :** Claude Opus 4.6 (3 couches paralleles)
**Fichiers revus :** `scripts/elo.js`, `tests/elo.test.js`

### Verdict : Approve

### Resultats des verifications automatiques

- `npx vitest run` : 205 tests passent (62 nouveaux elo + 143 existants) — 0 regression
- `npx biome check scripts/elo.js tests/elo.test.js` : 0 erreur
- Criteres d'acceptation AC1-AC8 : tous valides

### Couche 1 — Blind Hunter (bugs, securite, correction)

**Aucun defaut bloquant trouve.**

Observations examinees et ecartees :

1. **Arrondi Elo (`Math.round`) accumule une derive** (lignes 174-177) — Sur 26 journees avec ~7 matchs par journee, la derive maximale est de l'ordre de quelques points Elo. Le test verifie que la somme totale reste dans une tolerance de 10 points. Acceptable pour un modele predictif non competitif.

2. **Scores fixes dans `simulateMatch`** (25-15, 20-20, 15-25) — La marge fixe de 10 points pour les victoires dans les simulations Monte Carlo est une simplification. L'impact sur le classement projete est negligeable car les simulations servent a determiner des rangs, pas des Elo precis. Le Elo reel est calcule depuis les vrais resultats dans `computeEloRatings`.

3. **`VALID_TEAM_IDS` non importe depuis `team-mapping.js`** — La story suggerait cette reutilisation, mais le script utilise `standings[]` du fichier valide comme source des equipes. C'est fonctionnellement equivalent et evite un couplage supplementaire. Pas un defaut.

### Couche 2 — Edge Case Hunter (cas limites)

**Aucun defaut bloquant trouve.**

Cas limites verifies :

1. **0 resultats (debut de saison)** — `computeEloRatings` retourne tous les Elo a 1500, `computeForm` retourne `[]`, `computeTrend` retourne `"stable"`, confiance < 0.3. Tests presents (lignes 551-606). Pas de crash.

2. **Calendrier vide** — `simulateSeason` avec 0 matchs restants classe par Elo (tiebreaker). Comportement correct.

3. **`drawProb` ne peut pas devenir negatif** — `expectedHome` est borne entre 0 et 1, donc `Math.abs(expectedHome - 0.5) * 2` est au maximum 1, et `drawProb` minimum 0. Verifie mathematiquement.

4. **`computeNeighborGap` avec `findIndex` retournant -1** — Inatteignable car `sortedByElo` est construit depuis `elos.entries()` qui contient toutes les equipes de `standings`. Les donnees sont validees en amont par `validate.js`.

5. **`calculateConfidence` avec `totalMatchdays = 0`** — Inatteignable car `TOTAL_MATCHDAYS` est une constante a 26.

### Couche 3 — Acceptance Auditor (criteres d'acceptation)

| AC | Description | Statut |
|----|------------|--------|
| AC1 | Calcul Elo adapte rugby (K-factor, marge, domicile) | PASS |
| AC2 | Decroissance temporelle configurable | PASS |
| AC3 | Projection classement final via Monte Carlo | PASS |
| AC4 | Indice de confiance 0-1, bas en debut de saison | PASS |
| AC5 | Probabilites par zone (4 zones, somme = 1, decimales) | PASS |
| AC6 | Difficulte des matchs a venir 0-1 | PASS |
| AC7 | Gestion debut de saison (0 resultats, confiance < 0.3) | PASS |
| AC8 | Executable local, lecture/ecriture fichiers, exit codes | PASS |

### Couverture des tests

62 tests couvrant toutes les fonctions exportees :
- `calculateExpectedScore` : symetrie, bornes, monotonie (5 tests)
- `calculateEloChange` : victoire/defaite/nul, zero-sum, marge (5 tests)
- `applyDecay` : poids decroissant, bornes, preservation champs (4 tests)
- `computeEloRatings` : initialisation, 14 equipes, somme constante, historiques (4 tests)
- `simulateMatch` : victoire/defaite/nul forces, zero-sum, distribution statistique (5 tests)
- `simulateSeason` : zones somme = 1, rangs somme = numSimulations (2 tests)
- `computeProjectedRank` : 100% rang 1, distribution etalee, distribution vide (3 tests)
- `computeZoneProbabilities` : 100% europe, somme = 1, 100% relegation, bornes (4 tests)
- `calculateConfidence` : bornes, monotonie, debut saison < 0.3, fin saison (5 tests)
- `calculateMatchDifficulty` : bornes, adversaire fort, avantage domicile (5 tests)
- `computeForm` : vide, W/L/D, max 5, home+away (6 tests)
- `computeTrend` : stable/up/down, historique court, derniers 3 (5 tests)
- Debut de saison : 0 resultats integration (5 tests)
- Helpers : `roundDecimal`, `computeNeighborGap` (4 tests)
