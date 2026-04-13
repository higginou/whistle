# Enrichissement des bonus réels dans le pipeline Elo

**Date :** 2026-04-06
**Objectif :** Injecter les bonus offensifs/défensifs réels et le nombre d'essais dans le pipeline Elo en scrapant les pages match individuelles de Rugbyrama.

## Contexte

Le scraper Rugbyrama actuel récupère les scores depuis la page calendrier mais pas les bonus. `computeResultBonuses()` dans `elo.js` ne calcule que le bonus défensif (marge ≤ 5) et ignore le bonus offensif faute de données. Les pages match individuelles (`/rencontre/{id}/...`) contiennent les indicateurs BO/BD et le nombre d'essais par équipe.

## Approche retenue

Enrichissement dans le scraper existant (`scrape-rugbyrama.js`) avec scraping incrémental des pages match individuelles.

## Contrat de données

Ajouts dans `scraped.json` → `results[]` :

```json
{
  "matchUrl": "/resultats/rugby/top-14/phase-reguliere/rencontre/55924/stade-francais-montauban",
  "homeBonus": { "offensive": true, "defensive": false },
  "awayBonus": { "offensive": false, "defensive": true },
  "homeTries": 4,
  "awayTries": 2
}
```

- `matchUrl` : `string | null` — chemin relatif vers la page match
- `homeBonus` / `awayBonus` : `{ offensive: bool, defensive: bool } | null`
- `homeTries` / `awayTries` : `number | null` — stockés pour validation et usage futur (affinement du modèle), non consommés par `computeResultBonuses()` dans cette itération

Note : `matchUrl` n'est extrait que pour les matchs joués (`state === 1`). Les entrées `calendar[]` (matchs à venir) n'ont pas de `matchUrl`. Le scraper LNR (`scrape-lnr.js`) ne produit pas de `matchUrl` ni de bonus — ses résultats utilisent toujours le fallback dans `computeResultBonuses()`.

## Design par composant

### 1. Extraction du lien match depuis le calendrier

Dans `parseRugbyramaCalendar()`, pour chaque match joué (`state === 1`), extraire le `href` du lien vers la page match individuelle depuis le `<li>`. Stocker comme `matchUrl` dans le résultat.

Si le lien n'est pas trouvé, log un warning et laisser `matchUrl` à null.

### 2. Parsing de la page match individuelle

Nouvelle fonction `parseMatchPage(html)` dans `scrape-rugbyrama.js`.

Retourne :
```js
{
  homeBonus: { offensive: true, defensive: false },
  awayBonus: { offensive: false, defensive: true },
  homeTries: 4,
  awayTries: 2,
}
```

Stratégie de parsing :
1. Indicateurs BO/BD — texte ou classe CSS contenant "bonus", "BO", "BD" à proximité de chaque équipe
2. Nombre d'essais — comptage des événements "Essai" dans la timeline du match, ou extraction directe si un compteur est affiché

Robustesse : si le parsing échoue sur une page match, log un warning et retourner null. Un match non parsable ne bloque pas les autres.

### 3. Enrichissement incrémental

Nouvelle fonction `enrichMatchBonuses(results)` dans `scrape-rugbyrama.js` :

1. Filtre les matchs où `homeBonus === null` ET `matchUrl !== null`
2. Pour chaque match à enrichir, fetch la page match (throttle ~1 req/s)
3. Parse avec `parseMatchPage()`
4. Met à jour le match in-place

Pour l'incrémental entre runs : `scrape.js` charge le `scraped.json` existant. Les matchs déjà enrichis (bonus non-null) sont préservés.

### 4. Impact sur `computeResultBonuses()` dans elo.js

```
Pour chaque match :
  Victoire = 4 pts, Nul = 2 pts, Défaite = 0 pts  (inchangé)
  
  Si bonus réels disponibles (homeBonus !== null) :
    BO : +1 pt si offensive === true  (applicable sur victoire, défaite ET nul)
    BD : +1 pt si defensive === true  (applicable sur victoire, défaite ET nul)
  
  Sinon (fallback) :
    BD déduit de la marge ≤ 5  (comportement actuel)
    BO non attribué  (comportement actuel)
```

Note : en TOP 14, les bonus sont indépendants du résultat. Un match nul peut avoir un BO (≥ 4 essais) et/ou un BD. Le scraping des indicateurs BO/BD couvre tous les cas sans logique conditionnelle.

Les simulations Monte Carlo gardent leur logique probabiliste (`OFFENSIVE_BONUS_PROB = 0.3`) pour les matchs futurs.

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `scripts/scrape-rugbyrama.js` | Extraire `matchUrl`, nouveau `parseMatchPage()`, nouveau `enrichMatchBonuses()` |
| `scripts/scrape.js` | Charger `scraped.json` existant, passer résultats enrichis au scraper |
| `scripts/elo.js` | `computeResultBonuses()` utilise vrais bonus quand disponibles |

**Fichiers non modifiés :** `validate.js`, `generate.js`, frontend.

## Risques

- Structure HTML rugbyrama peut changer → parsing défensif, fallback gracieux
- Throttle 1 req/s → ~140s max pour scrape complet initial, quelques secondes en incrémental
- La structure exacte de la page match devra être analysée au moment de l'implémentation
