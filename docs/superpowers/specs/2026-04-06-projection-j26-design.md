# Projection J-26 — Design Spec

## Problème

L'onglet Projection affiche le classement actuel (J-20) avec les points réels, alors qu'il devrait montrer le classement **projeté à J-26** tel que prédit par le modèle Monte Carlo. Le pipeline calcule déjà les points projetés (`pointTotals`) mais les jette.

## Solution

### Pipeline — `scripts/elo.js`

1. **Ajouter `median(arr)`** — fonction utilitaire calculant la médiane d'un tableau numérique, arrondie à l'entier.

2. **Déstructurer `pointTotals`** — ligne ~994, changer `{ rankCounts }` en `{ rankCounts, pointTotals }`.

3. **Ajouter `projectedPoints`** — dans la construction de l'objet team (~ligne 1031), calculer la médiane de `pointTotals.get(teamId)` et l'ajouter comme `projectedPoints`.

### Pipeline — `scripts/generate.js`

4. **Propager `projectedPoints`** — dans `buildTeamEntry`, ajouter `projectedPoints: eloTeam.projectedPoints ?? eloTeam.points ?? 0`.

### Frontend — `src/components/tab-projection.js`

5. **En-tête** — Les deux branches (simple et détaillé) sont modifiées :
   - **Mode simple** : "Projection J-26 · Basée sur J-{matchday}"
   - **Mode détaillé** : "Projection J-26 · Basée sur J-{matchday} · Confiance {X}%"

6. **Points projetés** — Dans le `.map()` (ligne ~51) qui remap les équipes, ajouter le remplacement de `points` :
   ```js
   .map((t) => ({
     ...t,
     currentRank: t.projectedRank,
     points: t.projectedPoints ?? t.points,
     rankDelta: t.currentRank - t.projectedRank,
   }))
   ```
   `rank-row.js` lit `team.points` directement — le spread+override garantit qu'il affiche les points projetés sans modification du composant.

7. **Delta de mouvement** — Calculer `rankDelta = currentRank - projectedRank` pour chaque équipe. Après le rendu des zone-groups, parcourir les rank-rows et injecter un badge de mouvement (+N vert / -N rouge) à côté de la position. Zéro = pas de badge.

### Styles — `src/styles/components/tab-projection.css`

8. **Classes CSS** — `w-rank-delta`, `w-rank-delta--up` (vert), `w-rank-delta--down` (rouge). Style similaire aux `w-delta-badge` existants du simulateur.

## Fichiers modifiés

| Fichier | Nature du changement |
|---------|---------------------|
| `scripts/elo.js` | Ajouter `median()`, déstructurer `pointTotals`, ajouter `projectedPoints` |
| `scripts/generate.js` | Propager `projectedPoints` dans `buildTeamEntry` |
| `src/components/tab-projection.js` | En-tête, points projetés, rankDelta, renderMovementBadges |
| `src/styles/components/tab-projection.css` | Styles w-rank-delta |

## Contrat de données

Nouveau champ dans le JSON par équipe :

```json
{
  "projectedPoints": 78
}
```

Entier, médiane des 10 000 simulations Monte Carlo. Fallback sur `points` si absent.

## Pas de changement

- `rank-row.js` — inchangé, affiche `team.points` qui sera substitué en amont
- `zone-group.js` — inchangé
- Aucun nouveau composant, aucun nouveau fichier JS
