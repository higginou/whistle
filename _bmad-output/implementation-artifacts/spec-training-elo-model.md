---
title: 'Training Elo Model — API-Sport scraper + grid search tuning'
type: 'feature'
created: '2026-04-03'
status: 'review'
baseline_commit: 'b806621'
context: ['finale-model.md', 'scripts/elo.js']
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le modèle Elo actuel utilise des constantes figées (K=30, HOME_ADVANTAGE=65) sans calibration sur données réelles. Le modèle `finale-model.md` décrit des facteurs avancés (K dynamique, point differential, SoS, fatigue) non implémentés. Il n'y a aucun mécanisme pour récupérer des données historiques ni optimiser les hyperparamètres.

**Approach:** 1) Scraper API-Sport pour récupérer les saisons 2024-2025 et 2025-2026 au format `scraped.json`. 2) Créer un script de grid search qui fait tourner le modèle journée par journée sur 2024-2025, compare au classement réel, et optimise les hyperparamètres. 3) Enrichir `elo.js` avec les facteurs manquants de `finale-model.md`.

## Boundaries & Constraints

**Always:**
- Sauvegarder les données scrapées en `data/2024-2025.scraped.json` et `data/2025-2026.scraped.json` — format identique à `data/scraped.json`
- Mapper les team IDs API-Sport (numérique) vers les IDs kebab-case du projet
- Respecter le quota API Free (100 req/jour) — batching minimal
- Le grid search doit être reproductible (seed RNG)
- Exporter les fonctions ajoutées dans `elo.js` pour permettre les tests unitaires

**Ask First:**
- Modification du format de `scraped.json` si les données API nécessitent de nouveaux champs
- Choix des plages de grid search si les plages par défaut semblent trop larges

**Never:**
- Modifier le pipeline existant (scrape.js → validate.js → elo.js → generate.js)
- Casser les tests existants ou l'interface publique de `elo.js`
- Stocker la clé API en dur dans le code (lire depuis `api-sport.md`)

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Scrape OK | `node scripts/scrape-api.js 2024` | `data/2024-2025.scraped.json` avec 182 résultats + standings 14 équipes | N/A |
| API rate limit | 429 response | Retry après délai (backoff) | `console.error` + exit(1) si épuisé |
| Season not found | `node scripts/scrape-api.js 9999` | Exit avec message "Season not available" | exit(1) |
| Train happy path | `node scripts/train.js` | Console: best params, Brier score, position error, Top6 accuracy | N/A |
| Train no data | Fichier scraped manquant | "Run scrape-api.js first" | exit(1) |

</frozen-after-approval>

## Code Map

- `scripts/scrape-api.js` -- NOUVEAU — scraper API-Sport, convertit vers format scraped.json
- `scripts/train.js` -- NOUVEAU — grid search sur hyperparamètres, métriques de calibration
- `scripts/elo.js` -- MODIFIER — ajouter K dynamique, point differential, SoS, forme pondérée
- `data/2024-2025.scraped.json` -- OUTPUT — données historiques permanentes
- `api-sport.md` -- READ — clé API (non versionnée)
- `finale-model.md` -- REFERENCE — spécification du modèle cible

## Tasks & Acceptance

**Execution:**
- [x] `scripts/scrape-api.js` -- Créer le scraper API-Sport : fetch `/games` et `/standings` pour league=16, mapper team IDs, écrire au format scraped.json
- [x] `scripts/elo.js` -- Ajouter K dynamique par phase (J1-6=48, J7-13=36, J14-19=28, J20-26=24), point differential (Pythagorean exp=2.37), SoS, home/away ratio modifier, forme pondérée avec bonus rates
- [x] `scripts/train.js` -- Grid search : itérer sur combinaisons de params, rejouer la saison journée par journée, mesurer Brier score + erreur position + précision Top6/relégation, afficher les meilleurs params

**Acceptance Criteria:**
- Given `node scripts/scrape-api.js 2024`, when API key is valid, then `data/2024-2025.scraped.json` contains 14 teams in standings and all regular season results with scores
- Given `node scripts/train.js`, when scraped data exists, then console outputs the optimal hyperparameters with Brier score < 0.25 (mieux que aléatoire)
- Given the enriched `elo.js`, when run on current pipeline with `scraped.json`, then existing behavior is preserved (backwards-compatible)

## Design Notes

**Team ID Mapping API-Sport → Whistle:**
```
95:bayonne, 96:bordeaux-begles, 98:castres, 99:clermont,
100:la-rochelle (Stade Rochelais), 101:lyon, 102:montpellier,
103:toulon, 104:racing-92, 105:pau, 106:stade-francais,
107:toulouse (Lousa), 120:perpignan, 123:vannes
```
Saison 2025-2026 peut avoir des équipes différentes (promus/relégués) → mapping extensible.

**Grid Search Strategy:**
Paramètres et plages :
- `kMax`: [40, 44, 48, 52]
- `kMin`: [20, 24, 28]
- `homeAdvantage`: [40, 50, 60]
- `pDraw`: [0.03, 0.05, 0.07]
- `marginFactor`: [0.004, 0.006, 0.008]
Total: 4×3×3×3×3 = 324 combinaisons × 1000 sims chacune — rapide.

## Verification

**Commands:**
- `node scripts/scrape-api.js 2024` -- expected: creates `data/2024-2025.scraped.json` with valid JSON
- `node scripts/scrape-api.js 2025` -- expected: creates `data/2025-2026.scraped.json`
- `node scripts/train.js` -- expected: outputs optimal params and metrics
- `npx vitest run` -- expected: all existing tests pass (no regression)
