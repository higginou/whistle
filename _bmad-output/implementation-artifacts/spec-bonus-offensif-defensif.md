---
title: 'Bonus offensif et défensif cumulables dans le what-if'
type: 'feature'
created: '2026-04-02'
status: 'done'
baseline_commit: '76fe504'
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Le simulateur what-if traite les bonus comme mutuellement exclusifs (offensif OU défensif par match). En réalité en TOP 14, les deux bonus peuvent coexister : le bonus offensif (+1 pt) pour l'équipe qui marque ≥3 essais de plus, et le bonus défensif (+1 pt) pour le perdant à ≤5 points d'écart. Aussi, les tooltips ne reflètent pas les vraies règles.

**Approach:** Changer le modèle de données de `bonus: string|null` vers `{ bonusOff: boolean, bonuseDef: boolean }`. Adapter l'UI pour permettre les deux toggles simultanés. Mettre à jour le moteur de calcul pour appliquer chaque bonus indépendamment. Clarifier les labels/aria avec les vraies règles.

## Boundaries & Constraints

**Always:**
- Bonus offensif = +1 pt au vainqueur (ou aux deux si nul), togglable indépendamment
- Bonus défensif = +1 pt au perdant uniquement, désactivé si nul
- Les deux bonus activables simultanément sur un même match
- Conserver le reset des bonus quand on change l'outcome d'un match
- `prefers-reduced-motion` respecté si animations touchées

**Ask First:** Changement du modèle de données dans le store si d'autres composants consomment `simulatedResults`

**Never:** Toucher au Monte Carlo (`simulateSeason`), au pipeline, ou aux données JSON

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Les deux bonus | outcome=homeWin, bonusOff=true, bonusDef=true | home +5pts (4+1), away +1pt (0+1) | N/A |
| Offensif seul | outcome=homeWin, bonusOff=true, bonusDef=false | home +5pts, away +0pt | N/A |
| Défensif seul | outcome=awayWin, bonusOff=false, bonusDef=true | home +1pt, away +4pt | N/A |
| Nul + offensif | outcome=draw, bonusOff=true | home +3pts, away +3pts, défensif masqué | N/A |
| Désélection outcome | outcome changé | bonusOff et bonusDef reset à false | N/A |

</frozen-after-approval>

## Code Map

- `src/simulator-engine.js:248-266` -- calcul des points bonus (logique mutuellement exclusive à remplacer)
- `src/components/tab-simulateur.js:156-178` -- rendu HTML des boutons bonus (toggle unique à dédoubler)
- `src/components/tab-simulateur.js:202-230` -- handlers click résultat et bonus (modèle à adapter)

## Tasks & Acceptance

**Execution:**
- [x] `src/simulator-engine.js` -- Remplacer la logique bonus `if/else` (L253-262) par lecture indépendante de `bonusOff` et `bonusDef`, chacun ajoutant +1 au bon destinataire
- [x] `src/components/tab-simulateur.js` -- Changer le modèle store de `{ outcome, bonus }` à `{ outcome, bonusOff, bonusDef }`, adapter `handleBonusClick` pour toggler chaque bonus indépendamment, adapter `handleResultClick` pour reset les deux, adapter le HTML pour deux boutons toujours indépendants
- [x] `src/components/tab-simulateur.js` -- Mettre à jour les aria-labels : "Bonus offensif : 3 essais de plus" et "Bonus défensif : défaite de 5 pts max"
- [x] Tests existants -- Vérifier que les tests du simulateur passent toujours, ajouter cas "deux bonus cumulés"

**Acceptance Criteria:**
- Given un match avec outcome sélectionné, when je clique offensif puis défensif, then les deux sont actifs simultanément
- Given un match nul, when je regarde les bonus, then seul le bonus offensif est disponible
- Given les deux bonus actifs, when le moteur recalcule, then le vainqueur reçoit +1 (off) et le perdant +1 (déf) indépendamment
- Given un outcome changé, when je resélectionne, then les deux bonus sont réinitialisés

## Verification

**Commands:**
- `npx vitest run` -- expected: tous les tests passent
- `npx biome check .` -- expected: 0 erreurs

## Suggested Review Order

**Moteur de calcul**

- `if/else if` → deux `if` indépendants : le coeur du changement
  [`simulator-engine.js:253`](../../src/simulator-engine.js#L253)

**Modèle de données et interactions UI**

- Nouveau modèle `{ bonusOff, bonusDef }` et toggle indépendant par champ
  [`tab-simulateur.js:221`](../../src/components/tab-simulateur.js#L221)

- Reset des deux booleans au changement d'outcome
  [`tab-simulateur.js:211`](../../src/components/tab-simulateur.js#L211)

- Rendu HTML : deux boutons indépendants avec aria-labels mis à jour
  [`tab-simulateur.js:159`](../../src/components/tab-simulateur.js#L159)

**Tests**

- Nouveau cas : les deux bonus cumulés simultanément
  [`simulator-engine.test.js:297`](../../tests/simulator-engine.test.js#L297)

- Tests UI adaptés au nouveau modèle boolean
  [`tab-simulateur.test.js:302`](../../tests/tab-simulateur.test.js#L302)
