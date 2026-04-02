---
title: 'Bonus offensif et défensif dans le pipeline Elo'
type: 'feature'
created: '2026-04-02'
status: 'done'
baseline_commit: '42647d9'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le pipeline Elo ignore complètement les bonus rugby dans le Monte Carlo. Les simulations attribuent 4/2/0 points sans jamais ajouter de bonus offensif ou défensif, ce qui fausse les projections de classement.

**Approach:** Ajouter les bonus au Monte Carlo du pipeline : bonus défensif calculé à partir de l'écart de score simulé (≤5 pts → +1 au perdant), bonus offensif estimé par probabilité (~30% des matchs, basé sur les stats historiques TOP 14, +1 au vainqueur). Pour les résultats déjà joués, calculer automatiquement le bonus défensif depuis les scores réels.

## Boundaries & Constraints

**Always:**
- Bonus défensif = +1 pt au perdant si écart ≤5 pts (calculable automatiquement)
- Bonus offensif = +1 pt au vainqueur, estimé probabilistiquement dans le Monte Carlo (~30%)
- Sur un nul : pas de bonus défensif (pas de perdant), bonus offensif possible (+1 aux deux)
- Constantes de probabilité exportées et nommées (OFFENSIVE_BONUS_PROB, DEFENSIVE_MARGIN)
- Les résultats déjà joués : bonus défensif déduit des scores, bonus offensif ignoré (pas de données essais)

**Ask First:** Ajuster le taux de bonus offensif si 30% semble trop élevé/bas

**Never:** Modifier le scraper, le schéma JSON de sortie, ou le frontend

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Victoire serrée simulée (écart ≤5) | homeScore=25, awayScore=22 | away +1 (déf), home +1 si roll < 0.3 (off) | N/A |
| Victoire large simulée (écart >5) | homeScore=35, awayScore=10 | away +0, home +1 si roll < 0.3 (off) | N/A |
| Nul simulé | homeScore=20, awayScore=20 | pas de déf, les deux +1 si roll < 0.3 (off) | N/A |
| Résultat réel écart ≤5 | homeScore=19, awayScore=17 | away +1 (déf) dans initialPoints du Monte Carlo | N/A |
| Résultat réel écart >5 | homeScore=30, awayScore=10 | pas de bonus dans initialPoints | N/A |

</frozen-after-approval>

## Code Map

- `scripts/elo.js:202-253` -- `simulateMatch()` : points Monte Carlo sans bonus, scores fictifs fixes
- `scripts/elo.js:264-331` -- `simulateSeason()` : boucle Monte Carlo, accumule points sans bonus
- `scripts/elo.js:690-725` -- `main()` : pipeline principal, pas de calcul de points réels pour résultats passés

## Tasks & Acceptance

**Execution:**
- [x] `scripts/elo.js` -- Ajouter constantes `OFFENSIVE_BONUS_PROB` (0.3) et `DEFENSIVE_MARGIN` (5) aux constantes du modèle
- [x] `scripts/elo.js` -- Modifier `simulateMatch()` pour ajouter les bonus aux points : défensif si écart ≤5, offensif avec probabilité 30% (rng)
- [x] `scripts/elo.js` -- Ajouter fonction `computeResultBonuses(results)` qui enrichit les résultats passés avec le bonus défensif déduit des scores réels
- [x] `scripts/elo.js` -- Dans `main()`, calculer les points rugby réels (4/2/0 + bonus) des résultats passés et les passer comme `initialPoints` à `simulateSeason()`
- [x] `scripts/elo.js` -- Adapter `simulateSeason()` pour accepter un paramètre optionnel `initialPoints` (Map) comme base de points
- [x] Tests -- Ajouter tests pour `simulateMatch` avec bonus, `computeResultBonuses`, et `simulateSeason` avec `initialPoints`

**Acceptance Criteria:**
- Given une simulation Monte Carlo, when un match a un écart ≤5 pts, then le perdant reçoit +1 bonus défensif
- Given une simulation Monte Carlo, when un match est joué, then le vainqueur a ~30% de chance de recevoir +1 bonus offensif
- Given des résultats passés avec écart ≤5 pts, when le pipeline calcule, then les points de base incluent le bonus défensif
- Given un nul simulé, when on évalue les bonus, then seul le bonus offensif est possible (pas de défensif)

## Verification

**Commands:**
- `npx vitest run` -- expected: tous les tests passent
- `npx biome check .` -- expected: 0 erreurs

## Suggested Review Order

**Constantes et modèle de bonus**

- Nouvelles constantes OFFENSIVE_BONUS_PROB et DEFENSIVE_MARGIN
  [`elo.js:48`](../../scripts/elo.js#L48)

**Simulation Monte Carlo**

- Marges variables + bonus défensif/offensif dans simulateMatch()
  [`elo.js:225`](../../scripts/elo.js#L225)

- simulateSeason() accepte initialPoints pour partir des points réels
  [`elo.js:332`](../../scripts/elo.js#L332)

**Points réels des résultats passés**

- computeResultBonuses() : bonus défensif automatique depuis les scores
  [`elo.js:278`](../../scripts/elo.js#L278)

- main() passe realPoints au Monte Carlo
  [`elo.js:784`](../../scripts/elo.js#L784)

**Tests**

- Tests simulateMatch avec séquences rng contrôlées (bonus, marges)
  [`elo.test.js:240`](../../tests/elo.test.js#L240)

- Tests computeResultBonuses (limites, accumulation, nuls)
  [`elo.test.js:926`](../../tests/elo.test.js#L926)

- Tests simulateSeason avec initialPoints
  [`elo.test.js:1009`](../../tests/elo.test.js#L1009)
