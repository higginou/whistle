# Spike : Rugbyrama comme source de données alternative

**Date** : 2026-03-29
**URL de base** : `https://www.rugbyrama.fr/rugby-a-xv/top-14/`
**Statut** : Analyse terminée — **recommandé comme source complémentaire**

---

## 1. Pages disponibles

| Donnée       | URL                                                    | Taille | Rendu     |
|-------------|--------------------------------------------------------|--------|-----------|
| Classement  | `/resultats/rugby/top-14/classements`                  | ~511Ko | Serveur ✅ |
| Résultats   | `/resultats/rugby/top-14/resultats`                    | ~200Ko | Serveur ✅ |
| Calendrier  | `/resultats/rugby/top-14/calendrier`                   | ~300Ko | Serveur ✅ |

**Point clé** : Tout est rendu côté serveur (système idalgo). Aucun JS nécessaire pour extraire les données — un simple `fetch` + cheerio suffit. C'est l'avantage majeur par rapport au LNR qui utilise du rendu JS pour les classements.

---

## 2. Structure HTML (système idalgo)

### 2.1 Classement

Classes CSS sémantiques :
- `span_idalgo_content_standing_position` — rang
- `a_idalgo_content_standing_name` — nom d'équipe (lien vers fiche)
- `span_idalgo_content_standing_stat` — colonnes stats (pts, J, V, N, D, etc.)

14 équipes présentes avec noms complets (ex: "Bordeaux-Bègles", "La Rochelle").

### 2.2 Résultats

Classes CSS :
- `li_idalgo_content_result_date_list_match` — conteneur match
- `span_idalgo_dom_match_match_localteam` / `visitorteam` — noms d'équipes
- `span_idalgo_score_square_score_txt` — scores
- Dates en ISO dans le HTML (`2026-03-29`) ET en français (`21/03/2026`)

### 2.3 Calendrier (= résultats + à venir)

C'est la page la plus riche — contient TOUTE la saison (matchs joués + à venir).

Structure par match (`li` avec data attributes) :
```html
<li class="li_idalgo_content_calendar_cup_date_match"
    data-localteam="186"
    data-visitorteam="158"
    data-state="1"      <!-- 1=joué, 0=à venir -->
    data-round="1539">  <!-- identifiant de journée interne -->
```

Données extraites par match :
- **Date/heure** : `<span class="idalgo_date_timezone" data-value-default="Sat Sep 06 2025 21:05:00 +0200">`
- **Équipe domicile** : `<a class="a_idalgo_content_calendar_cup_date_match_local" title="Bordeaux-Bègles">`
- **Équipe extérieur** : `<a class="a_idalgo_content_calendar_cup_date_match_visitor" title="La Rochelle">`
- **Score** : `<span class="span_idalgo_score_part_left">23</span>-<span class="span_idalgo_score_part_right">18</span>`
- **Gagnant** : classe CSS `idalgo_team_winner` sur le lien de l'équipe
- **Stade** : `div_idalgo_content_calendar_cup_date_match_stadium` (souvent vide)

### 2.4 Mapping équipes idalgo → Whistle

| ID idalgo | Slug idalgo         | ID Whistle        |
|-----------|--------------------|--------------------|
| 7         | clermont           | clermont           |
| 8         | bayonne            | bayonne            |
| 11        | castres            | castres            |
| 14        | montpellier        | montpellier        |
| 16        | perpignan          | perpignan          |
| 17        | stade-francais     | stade-francais     |
| 18        | stade-toulousain   | toulouse           |
| 20        | montauban          | montauban          |
| 98        | toulon             | toulon             |
| 125       | racing-92          | racing-92          |
| 133       | pau                | pau                |
| 158       | bordeaux-begles    | bordeaux-begles    |
| 171       | lyon               | lyon               |
| 186       | la-rochelle        | la-rochelle        |

Seuls 2 mappings non triviaux : `stade-toulousain → toulouse`, `vannes` absent (relégué ?).

---

## 3. Qualité des données vs LNR

| Critère                    | LNR                          | Rugbyrama                    |
|---------------------------|------------------------------|------------------------------|
| Rendu serveur             | ❌ JS (standings)             | ✅ Tout server-rendered       |
| Dates des matchs          | ⚠️ Souvent vides/manquantes  | ✅ Toujours présentes (ISO)   |
| Heures de coup d'envoi    | ❌ Non extraites              | ✅ Disponibles (data-value)   |
| Saison complète (1 page)  | ❌ Pagination par journée     | ✅ Page calendrier = toute la saison |
| Matchs à venir avec dates | ⚠️ Souvent sans date          | ✅ `data-state="0"` avec dates |
| Score structuré           | ⚠️ Format texte "23-18"      | ✅ Spans séparés left/right   |
| Indicateur gagnant        | ❌ Non disponible             | ✅ Classe CSS `idalgo_team_winner` |
| Stabilité HTML            | ⚠️ Refonte fréquente         | ✅ Système idalgo (widget tiers, stable) |

**Statistiques calendrier** : 190 matchs trouvés (140 joués `state=1`, 50 à venir `state=0`).
C'est 7 matchs × (20 journées jouées) = 140 ✅ cohérent avec J20 en cours.

---

## 4. Avantages clés pour Whistle

1. **Résout D2 (dates manquantes)** — Les dates sont systématiquement présentes, même pour les matchs à venir. Plus besoin du hack `mergeCalendarDates()`.

2. **Résout le problème standings LNR** — Les classements sont server-rendered, plus de fallback nécessaire.

3. **Une seule page = toute la saison** — La page `/calendrier` contient tous les matchs (joués + à venir) sur une seule page. Pas de pagination à gérer.

4. **Données plus riches** — Heures de coup d'envoi, indicateur de victoire, IDs numériques stables.

5. **Scraping plus fiable** — HTML structuré avec classes sémantiques idalgo (système widget tiers, moins susceptible de changer que le design LNR).

---

## 5. Risques et limites

1. **Pas de bonus offensif/défensif** — À vérifier si les colonnes de points bonus sont dans le classement (nécessaire pour le classement TOP 14 réel). Le classement LNR les a.

2. **Dépendance à idalgo** — Si Rugbyrama change de fournisseur de widgets, le scraping casse. Mais c'est vrai pour toute source.

3. **Vannes absent** — L'équipe de Vannes (RC Vannes) n'apparaît pas dans le calendrier 2025-2026. Vérifier s'ils ont été relégués cette saison ou si c'est un bug.

4. **Anti-scraping** — Pas de protection observée (pas de Cloudflare, pas de rate limiting lors du spike). Mais une utilisation en production devrait rester raisonnable (1 fetch/semaine max via GitHub Actions).

5. **Journées identifiées par round ID, pas par numéro** — Les `data-round` sont des IDs internes (1539, 1540...) pas des numéros de journée (J1, J2...). Nécessite un mapping ou déduction par ordre.

---

## 6. Effort d'intégration estimé

| Tâche                                          | Effort   |
|------------------------------------------------|----------|
| Nouveau scraper `scrape-rugbyrama.js`          | ~4h      |
| Mapping IDs idalgo → IDs Whistle               | ~1h      |
| Adaptation validate.js (si changements format) | ~1h      |
| Tests unitaires scraper                        | ~2h      |
| Intégration pipeline (fallback LNR → RR)       | ~2h      |
| **Total**                                      | **~10h** |

---

## 7. Recommandation

**Utiliser Rugbyrama comme source PRIMAIRE, LNR en fallback.**

Raisons :
- Données plus complètes et fiables (dates, scores structurés, rendu serveur)
- Une seule page pour toute la saison
- HTML plus stable (système idalgo)
- Résout 2 des 5 items déférés du rétro Epic 1

Le scraper Rugbyrama devrait être implémenté dans le cadre d'Epic 2 ou comme story technique dédiée. Le scraper LNR existant reste en fallback dans le pipeline GitHub Actions.
