# Story 1.2 : Definition du schema JSON de saison

Status: done

## Informations

- **Epic :** Epic 1 — Fondation & Pipeline de Donnees
- **Statut :** review
- **Priorite :** Haute (bloque les stories 1.3 a 1.7 et toutes les stories front-end)
- **Estimation :** Petite (< 2h)
- **ui-structural :** false
- **Dependances :** Story 1.1 (done)

## Story

En tant que developpeur,
Je veux definir et documenter le schema JSON de saison qui sert de contrat entre le pipeline et le front-end,
Afin que les deux systemes aient un format de donnees clair et stable.

## Criteres d'acceptation

### AC1 : Fichier JSON de saison avec donnees d'exemple

**Given** le projet est initialise (Story 1.1 done)
**When** le fichier `data/2025-2026.json` est cree avec des donnees d'exemple
**Then** il contient la structure complete : `season`, `lastUpdated`, `matchday`, `brierScore`, `teams[]`, `calendar[]`, `predictions[]`
**And** les champs JSON sont en `camelCase`
**And** les IDs equipes sont en `kebab-case` (ex: `la-rochelle`, `racing-92`, `stade-francais`)
**And** les probabilites sont en decimales 0-1 (jamais de pourcentages)
**And** les dates sont en ISO 8601 (ex: `"2026-03-28T08:00:00Z"`)
**And** le fichier est du JSON valide (parsable sans erreur)

### AC2 : Index des saisons

**Given** le fichier `data/2025-2026.json` existe
**When** le fichier `data/seasons.json` est cree
**Then** il indexe les saisons disponibles avec au minimum le champ `seasons[]` contenant `{ "id": "2025-2026", "label": "Saison 2025-2026", "current": true }`

### AC3 : Completude des donnees d'equipe

**Given** le fichier `data/2025-2026.json` contient `teams[]`
**When** on inspecte chaque entree d'equipe
**Then** chaque equipe a les champs : `id` (string kebab-case), `name` (string nom complet), `currentRank` (integer 1-14), `projectedRank` (integer 1-14), `elo` (integer), `confidence` (decimal 0-1), `zones` (objet avec `europe`, `top6`, `mid`, `relegation` en decimales 0-1), `form` (array de `"W"` | `"L"` | `"D"`, 5 derniers matchs, plus recent en premier), `trend` (enum `"up"` | `"down"` | `"stable"`)
**And** les 14 equipes du TOP 14 2025-2026 sont presentes

### AC4 : Structure du calendrier

**Given** le fichier `data/2025-2026.json` contient `calendar[]`
**When** on inspecte les entrees
**Then** chaque entree a les champs : `matchday` (integer), `date` (string ISO 8601), `home` (string team ID), `away` (string team ID), `difficulty` (decimal 0-1)

### AC5 : Structure des predictions (historique append-only)

**Given** le fichier `data/2025-2026.json` contient `predictions[]`
**When** on inspecte les entrees
**Then** chaque entree a : `matchday` (integer), `date` (string ISO 8601), `projections[]` avec chaque projection contenant `teamId` (string), `projectedRank` (integer 1-14), `confidence` (decimal 0-1)

### AC6 : Budget taille respecte

**Given** le fichier `data/2025-2026.json` est complet avec 14 equipes
**When** on mesure la taille du fichier
**Then** le fichier fait < 50Ko (NFR5)

## Taches techniques

- [x] T1 : Creer `data/2025-2026.json` avec les 14 equipes du TOP 14 2025-2026 et des donnees d'exemple realistes (AC: 1, 3)
- [x] T2 : Creer `data/seasons.json` avec l'index de la saison courante (AC: 2)
- [x] T3 : Valider que le JSON est parsable et conforme au schema decrit (AC: 1, 3, 4, 5)
- [x] T4 : Verifier la taille du fichier < 50Ko (AC: 6)
- [x] T5 : Supprimer le `.gitkeep` de `data/` (remplace par les fichiers reels)

## Dev Notes

### Schema JSON de reference

Le schema est defini dans l'architecture (`architecture.md`, section "Format Patterns"). Voici la structure exacte a respecter :

```json
{
  "season": "2025-2026",
  "lastUpdated": "2026-03-28T08:00:00Z",
  "matchday": 22,
  "brierScore": 0.21,
  "teams": [
    {
      "id": "la-rochelle",
      "name": "Stade Rochelais",
      "currentRank": 7,
      "projectedRank": 5,
      "elo": 1575,
      "confidence": 0.72,
      "zones": { "europe": 0.15, "top6": 0.62, "mid": 0.23, "relegation": 0.0 },
      "form": ["W", "W", "L", "W", "D"],
      "trend": "up"
    }
  ],
  "calendar": [
    {
      "matchday": 23,
      "date": "2026-04-04",
      "home": "la-rochelle",
      "away": "toulouse",
      "difficulty": 0.85
    }
  ],
  "predictions": [
    {
      "matchday": 22,
      "date": "2026-03-28",
      "projections": [{ "teamId": "la-rochelle", "projectedRank": 5, "confidence": 0.72 }]
    }
  ]
}
```

### Les 14 equipes du TOP 14 2025-2026

Utiliser ces IDs `kebab-case` et noms officiels :

| ID | Nom |
|---|---|
| `toulouse` | Stade Toulousain |
| `bordeaux-begles` | Union Bordeaux-Begles |
| `la-rochelle` | Stade Rochelais |
| `toulon` | RC Toulon |
| `racing-92` | Racing 92 |
| `clermont` | ASM Clermont Auvergne |
| `castres` | Castres Olympique |
| `lyon` | LOU Rugby |
| `montpellier` | Montpellier Herault Rugby |
| `pau` | Section Paloise |
| `perpignan` | USA Perpignan |
| `bayonne` | Aviron Bayonnais |
| `stade-francais` | Stade Francais Paris |
| `vannes` | Rugby Club Vannetais |

Note : verifier la composition exacte du TOP 14 2025-2026 au moment de l'implementation. Les promus/relegues peuvent varier. Les noms et IDs ci-dessus sont indicatifs et doivent etre ajustes si necessaire.

### Regles de format strictes

- **Champs JSON :** `camelCase` — zero transformation entre pipeline et front-end
- **IDs equipes :** `kebab-case` derive du nom (ex: `la-rochelle`, `racing-92`)
- **Probabilites :** decimales 0-1, jamais de pourcentages dans le JSON
- **Dates :** ISO 8601 (`"2026-03-28T08:00:00Z"`)
- **Tendance :** enum `"up"` | `"down"` | `"stable"`
- **Forme :** array de `"W"` | `"L"` | `"D"` (5 derniers matchs, plus recent en premier)
- **Zones :** les 4 cles sont `europe`, `top6`, `mid`, `relegation` — leurs valeurs doivent sommer a ~1.0 pour chaque equipe

### Donnees d'exemple

Les donnees d'exemple doivent etre **realistes mais fictives**. Ne pas scraper de donnees reelles — c'est le travail des stories 1.3+. Populer les 14 equipes avec des Elo, rangs, probabilites, forme et tendances plausibles. Inclure 2-3 entrees dans `calendar[]` et 1 entree dans `predictions[]` pour illustrer la structure.

### Contrat d'interface critique

Ce schema JSON est le **seul point de couplage** entre le pipeline (`scripts/`) et le front-end (`src/`). Toute modification future du schema impacte les deux systemes. La structure definie ici sera consommee par :
- `scripts/generate.js` (production du JSON — Story 1.6)
- `src/data.js` (fetch et cache — Story 2.2)
- Tous les composants UI qui affichent des donnees d'equipe

### Intelligence de la Story 1.1

- Le dossier `data/` existe deja avec un `.gitkeep` (a supprimer quand les fichiers reels sont ajoutes)
- Conventions de nommage etablies : fichiers en `kebab-case`
- Le code review de la Story 1.1 a note que `dist/.gitkeep` etait inutile — meme logique ici : supprimer `.gitkeep` de `data/` une fois les fichiers JSON crees

### Anti-patterns a eviter

- Ne pas mettre de pourcentages dans le JSON (toujours decimales 0-1)
- Ne pas utiliser `PascalCase` ou `snake_case` pour les champs JSON
- Ne pas creer de schema de validation formel (pas de JSON Schema, pas de TypeScript types) — c'est un projet vanilla JS simple
- Ne pas ajouter de champs non documentes dans l'architecture
- Ne pas generer de donnees scrappees reelles — uniquement des donnees d'exemple fictives

### Project Structure Notes

- Fichiers a creer : `data/2025-2026.json`, `data/seasons.json`
- Fichier a supprimer : `data/.gitkeep`
- Aucun fichier dans `src/` ou `scripts/` n'est modifie par cette story

### References

- [Source: architecture.md#Format Patterns] — structure JSON type et regles de format
- [Source: architecture.md#Data Architecture] — decision 1 fichier par saison + index
- [Source: architecture.md#Cross-Cutting Concerns] — schema JSON comme concern transversal
- [Source: epics.md#Story 1.2] — criteres d'acceptation BDD
- [Source: prd.md#FR12] — historique append-only des predictions
- [Source: prd.md#NFR5] — budget < 50Ko par fichier JSON de saison
- [Source: prd.md#NFR9] — JSON comme contrat d'interface pipeline/front-end

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

Aucun probleme rencontre.

### Completion Notes List

- T1 : Cree `data/2025-2026.json` avec les 14 equipes du TOP 14 2025-2026, donnees Elo/rangs/zones/forme/tendance fictives mais realistes. 3 entrees calendrier (journee 23), 1 entree predictions (journee 22) avec 14 projections.
- T2 : Cree `data/seasons.json` avec l'index contenant la saison 2025-2026 marquee comme courante.
- T3 : 38 tests vitest valident la conformite du schema : structure racine, equipes (champs, types, plages, unicite des rangs, somme des zones ~1.0), calendrier, predictions, et coherence des IDs entre sections.
- T4 : Taille du fichier = 6 Ko, bien en dessous du budget de 50 Ko.
- T5 : Supprime `data/.gitkeep`.
- Installation de vitest comme devDependency et ajout du script `test` dans package.json.

### Change Log

- 2026-03-28 : Implementation complete de la story 1.2 — schema JSON de saison

### File List

- `data/2025-2026.json` (cree)
- `data/seasons.json` (cree)
- `data/.gitkeep` (supprime)
- `tests/season-schema.test.js` (cree)
- `package.json` (modifie — ajout vitest + script test)

## Code Review

**Date :** 2026-03-28
**Reviewer :** Claude Opus 4.6 (code-review workflow)
**Verdict : Approve**

### Resultat

- **decision-needed :** 0
- **patch :** 0
- **defer :** 1
- **dismiss :** 3

### Review Findings

- [x] [Review][Defer] Format de date calendrier/predictions vs spec architecture — L'architecture montre `"2026-04-04"` (date seule) pour calendar et predictions, mais l'implementation utilise des timestamps complets (`"2026-04-04T15:00:00Z"`). Les deux sont ISO 8601 valide. L'implementation est internement coherente et plus precise. A aligner si necessaire lors de la story 1.6 (generate.js). — differe, pre-existant

### Observations

- Les 6 AC sont satisfaits sans reserve.
- 38 tests vitest passent, couvrant la structure racine, les equipes (champs, types, plages, unicite des rangs, somme des zones), le calendrier, les predictions, et le budget taille.
- La taille du fichier est de 6 Ko, bien sous le budget de 50 Ko.
- Les conventions de nommage (camelCase champs JSON, kebab-case IDs equipes, decimales 0-1, ISO 8601) sont toutes respectees.
- Le `.gitkeep` de `data/` est correctement supprime.
- Vitest ajoute comme devDependency avec script `test` dans package.json.
