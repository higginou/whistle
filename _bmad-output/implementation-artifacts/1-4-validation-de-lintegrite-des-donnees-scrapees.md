# Story 1.4 : Validation de l'integrite des donnees scrapees

Status: done

## Informations

- **Epic :** Epic 1 — Fondation & Pipeline de Donnees
- **Statut :** done
- **Priorite :** Haute (bloque les stories 1.5 a 1.7)
- **Estimation :** Petite (2-4h)
- **ui-structural :** false
- **Dependances :** Story 1.1 (done), Story 1.2 (done — schema JSON defini), Story 1.3 (done — scraping LNR)

## Story

En tant qu'utilisateur,
Je veux que le systeme valide les donnees scrapees avant integration,
Afin d'eviter qu'un scraping corrompu ne pollue les projections.

## Criteres d'acceptation

### AC1 : Verification des 14 equipes presentes

**Given** le script `scripts/validate.js` recoit les donnees brutes du scraping (`data/scraped.json`)
**When** la validation est executee
**Then** le script verifie que le champ `standings` contient exactement 14 equipes
**And** chaque equipe possede un `id` qui appartient a la liste `VALID_TEAM_IDS` definie dans `scripts/team-mapping.js`
**And** il n'y a aucun doublon d'ID

### AC2 : Scores entiers positifs coherents

**Given** les donnees brutes contiennent des resultats de matchs (`results[]`)
**When** la validation est executee
**Then** les champs `homeScore` et `awayScore` sont des entiers >= 0
**And** les scores sont dans une plage coherente pour le rugby (ex: 0-150)

### AC3 : Dates de matchs valides

**Given** les donnees brutes contiennent des resultats et un calendrier (`results[]`, `calendar[]`)
**When** la validation est executee
**Then** les champs `date` sont au format ISO 8601 valide
**And** les dates sont dans une plage raisonnable (saison 2025-2026 : aout 2025 a juin 2026)

### AC4 : Aucune donnee critique manquante

**Given** les donnees brutes sont chargees
**When** la validation est executee
**Then** les champs obligatoires de premier niveau sont presents : `scrapedAt`, `source`, `matchday`, `complete`, `standings`, `results`, `calendar`
**And** chaque entree de `standings` a les champs obligatoires : `id`, `rank`, `points`, `played`, `won`, `drawn`, `lost`
**And** chaque entree de `results` a les champs obligatoires : `matchday`, `date`, `home`, `away`, `homeScore`, `awayScore`
**And** chaque entree de `calendar` a les champs obligatoires : `matchday`, `home`, `away`
**And** les IDs equipe dans `results` et `calendar` (`home`, `away`) appartiennent a `VALID_TEAM_IDS`

### AC5 : Echec avec exit code non-zero et message descriptif

**Given** une ou plusieurs validations echouent
**When** le script termine
**Then** il affiche un message d'erreur descriptif par violation trouvee (via `console.error`)
**And** le script termine avec `process.exit(1)`
**And** toutes les erreurs sont collectees et affichees d'un coup (pas d'arret a la premiere erreur)

### AC6 : Executable en local

**Given** le script est cree dans `scripts/validate.js`
**When** un developpeur execute `node scripts/validate.js`
**Then** le script charge `data/scraped.json` et execute toutes les validations
**And** en cas de succes, le script affiche un resume (nombre d'equipes, matchs, journee) et termine avec exit code 0
**And** en cas d'echec, le script affiche les erreurs et termine avec exit code 1

## Taches techniques

- [x] T1 : Creer `scripts/validate.js` avec la logique de validation (AC: 1, 2, 3, 4, 5, 6)
  - [x] T1.1 : Charger et parser `data/scraped.json`
  - [x] T1.2 : Implementer la validation de structure de premier niveau (AC: 4)
  - [x] T1.3 : Implementer la validation des standings — 14 equipes, IDs valides, pas de doublons (AC: 1)
  - [x] T1.4 : Implementer la validation des scores — entiers >= 0, plage coherente (AC: 2)
  - [x] T1.5 : Implementer la validation des dates — format ISO 8601, plage saison (AC: 3)
  - [x] T1.6 : Implementer la validation des champs obligatoires par entite (AC: 4)
  - [x] T1.7 : Implementer la validation des IDs equipe dans results et calendar (AC: 4)
  - [x] T1.8 : Collecter toutes les erreurs et les afficher en bloc (AC: 5)
  - [x] T1.9 : Ajouter le guard ESM pour empecher l'execution a l'import (pattern Story 1.3)
- [x] T2 : Ecrire des tests vitest pour chaque regle de validation (AC: 1, 2, 3, 4, 5)
  - [x] T2.1 : Tests pour la validation des equipes (14 presentes, IDs valides, pas de doublons)
  - [x] T2.2 : Tests pour la validation des scores (entiers, plage)
  - [x] T2.3 : Tests pour la validation des dates (ISO 8601, plage saison)
  - [x] T2.4 : Tests pour la validation des champs obligatoires
  - [x] T2.5 : Tests pour la collection d'erreurs multiples (pas d'arret a la premiere)
  - [x] T2.6 : Tests pour le cas nominal (donnees valides)

## Dev Notes

### Architecture du script

Le script `validate.js` est le 2e maillon du pipeline : `scrape.js` -> **`validate.js`** -> `elo.js` -> `generate.js`. Il lit `data/scraped.json` (produit par Story 1.3) et valide l'integrite avant passage aux scripts suivants.

**Pattern de conception :** Exporter les fonctions de validation individuellement pour les tests unitaires, et une fonction `main()` qui orchestre le tout. Utiliser le meme guard ESM que `scrape.js` pour empecher l'execution a l'import.

### Format d'entree : `data/scraped.json`

Le fichier produit par `scrape.js` (Story 1.3) a cette structure :

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
      "points": 68,
      "played": 22,
      "won": 15,
      "drawn": 1,
      "lost": 6,
      "bonusOffensive": 5,
      "bonusDefensive": 3,
      "pointsFor": 520,
      "pointsAgainst": 380
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

### Reutilisation du code existant

**IMPORTANT :** Reutiliser `VALID_TEAM_IDS` depuis `scripts/team-mapping.js` (Story 1.3) pour la validation des IDs equipe. Ne PAS redefinir la liste des 14 equipes dans validate.js.

```js
import { VALID_TEAM_IDS } from './team-mapping.js';
```

Les 14 IDs valides : `toulouse`, `bordeaux-begles`, `la-rochelle`, `toulon`, `racing-92`, `clermont`, `castres`, `lyon`, `montpellier`, `pau`, `perpignan`, `bayonne`, `stade-francais`, `vannes`.

**Note Story 1.3 :** L'equipe `montauban` (promue 2025-2026) a ete detectee en live mais n'est pas dans `VALID_TEAM_IDS`. Si le scraping retourne des equipes inconnues, validate.js doit les signaler comme erreur. La liste de reference est celle du schema `data/2025-2026.json` et de `VALID_TEAM_IDS`.

### Gestion des erreurs

Suivre le pattern pipeline :
- Collecter TOUTES les erreurs dans un tableau `errors[]` au lieu d'echouer a la premiere
- A la fin : si `errors.length > 0`, afficher chaque erreur via `console.error()` puis `process.exit(1)`
- Si tout est valide : `console.log()` un resume et exit code 0
- Pas de try/catch generique — chaque validation est une fonction pure qui retourne des erreurs

### Donnees actuelles connues (Story 1.3)

D'apres les notes de completion de Story 1.3 :
- Les standings sont en best-effort (table JS-rendered sur LNR) — les valeurs numeriques peuvent etre a 0
- La journee 20 est detectee comme incomplete (`complete: false`)
- Les dates peuvent etre vides dans certains cas (extraction non fiable)

**Implication pour la validation :**
- La validation des standings doit tolerer des valeurs a 0 (car le scraping LNR ne peut pas extraire les stats detaillees)
- Valider que `matchday` est un entier >= 1 et <= 26 (saison reguliere TOP 14)
- Si `complete` est `false`, c'est informatif — pas une erreur de validation
- Les dates vides dans `calendar[]` ne sont PAS une erreur (le champ `date` est optionnel dans le calendrier)

### Guard ESM (pattern etabli en Story 1.3)

Utiliser le meme pattern que `scrape.js` pour proteger l'execution :

```js
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Guard : n'executer main() que si le script est lance directement
if (fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
```

Ce pattern empeche `main()` de s'executer quand le module est importe par vitest.

### Plages de validation

| Champ | Type | Plage valide |
|---|---|---|
| `matchday` | entier | 1-26 |
| `homeScore` / `awayScore` | entier | 0-150 |
| `rank` | entier | 1-14 |
| `points` | entier | >= 0 |
| `played` | entier | 0-26 |
| `date` (results) | string | ISO 8601, entre 2025-08-01 et 2026-07-31 |
| `date` (calendar) | string | optionnel, si present : ISO 8601 |

### Anti-patterns a eviter

- Ne PAS creer de fichier `utils.js` ou `helpers.js` — les fonctions de validation restent dans `validate.js`
- Ne PAS redefinir `VALID_TEAM_IDS` — importer depuis `scripts/team-mapping.js`
- Ne PAS modifier `data/scraped.json` — le script est read-only, il valide sans transformer
- Ne PAS utiliser de try/catch generique — chaque validation est une fonction distincte
- Ne PAS arreter a la premiere erreur — collecter toutes les erreurs
- Ne PAS valider le format final du schema JSON (Story 1.2) — valider uniquement le format intermediaire du scraping

### Project Structure Notes

- Fichier a creer : `scripts/validate.js`
- Tests a creer : `tests/validate.test.js`
- Fichier lu en entree : `data/scraped.json` (produit par `scrape.js`)
- Module reutilise : `scripts/team-mapping.js` (VALID_TEAM_IDS)
- Convention de tests etablie : `tests/` + `npx vitest run`
- Convention biome etablie : `npx biome check .`
- 78 tests existants (40 scrape + 38 schema) — ne PAS les casser

### Intelligence de la Story 1.3

Corrections appliquees lors de la review Story 1.3 (a retenir) :
1. **Guard ESM** : `fileURLToPath(import.meta.url) === resolve(process.argv[1])` — utiliser le meme pattern
2. **Partial match IDs** : guard `normalized.length >= 5` dans team-mapping.js — les IDs courts sont dans le lookup direct
3. **`getCurrentSeasonYear`** : corrige pour gerer les mois aout-decembre vs janvier-juillet — pertinent si validate.js doit valider des dates par rapport a la saison

### References

- [Source: epics.md#Story 1.4] — criteres d'acceptation BDD
- [Source: architecture.md#Pipeline] — workflow unique + scripts modulaires en sequence
- [Source: architecture.md#Error Handling] — `console.error()` + exit code non-zero
- [Source: architecture.md#Data Flow] — scrape.js -> validate.js -> elo.js -> generate.js
- [Source: prd.md#FR2] — validation de l'integrite des donnees scrapees
- [Source: Story 1.3 Completion Notes] — format `data/scraped.json`, limitations standings, dates
- [Source: Story 1.3 Code Review] — guard ESM, pattern de correction applique

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

Aucun probleme rencontre. Tests passes du premier coup (135/135, 0 regression).

### Completion Notes List

- Script `scripts/validate.js` cree avec 7 fonctions de validation exportees + `validateAll()` + `main()`
- Chaque fonction de validation est pure : prend des donnees, retourne un tableau d'erreurs
- `VALID_TEAM_IDS` importe depuis `scripts/team-mapping.js` (pas de redefiniton)
- Guard ESM identique a `scrape.js` : `fileURLToPath(import.meta.url) === resolve(process.argv[1])`
- Toutes les erreurs collectees dans un tableau puis affichees en bloc (AC5)
- Dates optionnelles dans `calendar[]` tolerees (AC3 + notes Story 1.3)
- Valeurs a 0 dans standings tolerees (best-effort scraping LNR)
- 57 nouveaux tests couvrant tous les ACs + cas limites
- 135 tests au total (78 existants + 57 nouveaux), 0 regression
- Biome check : 0 erreur

### Change Log

- 2026-03-29 : Creation de `scripts/validate.js` et `tests/validate.test.js` (Story 1.4 complete)

### File List

- scripts/validate.js (nouveau)
- tests/validate.test.js (nouveau)

## Code Review — 2026-03-29

**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Diff:** `scripts/validate.js` (473 lignes), `tests/validate.test.js` (498 lignes)
**Tests:** 135/135 pass (0 regression), Biome clean

### Review Findings

- [ ] [Review][Patch] **BUG: `isValidISODate` accepte des dates calendaires impossibles** [`scripts/validate.js:205-211`] — `new Date('2026-02-30')` ne retourne pas `NaN` en JavaScript, il fait un rollover silencieux vers le 2 mars. Resultat : les dates comme `2026-02-30`, `2026-02-29` (annee non-bissextile), ou `2026-04-31` passent la validation. Correction : apres le parse, verifier que la date re-serialisee correspond a l'entree (ex: comparer `d.toISOString().slice(0,10)` avec `dateStr.slice(0,10)` pour les dates YYYY-MM-DD).

- [ ] [Review][Patch] **BUG: Le `matchday` de premier niveau n'est pas valide pour sa plage** [`scripts/validate.js:74-82`] — `validateTopLevelFields` verifie seulement la presence de `matchday`, pas sa plage (1-26). Un `matchday: 0` ou `matchday: 99` passe la validation. La table de plages de la story specifie `matchday` | entier | 1-26. Ajouter une validation de plage pour le `matchday` de premier niveau, soit dans `validateTopLevelFields`, soit dans une etape dediee de `validateAll`.

### Review Summary

| Categorie | Nombre |
|---|---|
| `decision-needed` | 0 |
| `patch` | 2 |
| `defer` | 0 |
| `dismiss` (bruit) | 0 |

**Verdict : Changes Requested** — 2 bugs de correctness identifies, les deux sont corrigeables sans ambiguite.

## Re-Review — 2026-03-29

**Reviewers:** Blind Hunter, Edge Case Hunter, Acceptance Auditor
**Scope:** Verification des 2 corrections demandees + scan complet pour nouveaux problemes
**Tests:** 143/143 pass (0 regression, +8 nouveaux tests de validation), Biome clean

### Verification des corrections precedentes

- [x] **FIX 1 — `isValidISODate` round-trip check** [`scripts/validate.js:219-228`] — Corrige. La fonction compare maintenant `d.toISOString().slice(0, 10)` avec `dateStr.slice(0, 10)` apres le parse. Les dates impossibles (Feb 30, Feb 29 non-bissextile, Apr 31) sont correctement rejetees. 4 nouveaux tests couvrent ces cas (lignes 311-325 du fichier test).

- [x] **FIX 2 — Validation plage `matchday` premier niveau** [`scripts/validate.js:82-93`] — Corrige. `validateTopLevelFields` valide maintenant que `matchday` est un entier entre 1 et 26. Les cas limites (0, 99, 10.5) sont rejetes, les bornes (1, 26) acceptees. 4 nouveaux tests couvrent ces cas (lignes 127-148 du fichier test).

### Scan complet (nouveaux findings)

Aucun nouveau bug, vulnerabilite, ou violation d'architecture detecte.

- Les 6 criteres d'acceptation (AC1-AC6) sont couverts
- Le pattern pipeline (collecte d'erreurs, exit codes) est respecte
- Le guard ESM est conforme au pattern Story 1.3
- `VALID_TEAM_IDS` importe depuis `team-mapping.js` (pas de redefiniton)
- Pas de try/catch generique — chaque catch est specifique

### Re-Review Summary

| Categorie | Nombre |
|---|---|
| `decision-needed` | 0 |
| `patch` | 0 |
| `defer` | 0 |
| `dismiss` (bruit) | 0 |

**Verdict : Approved** — Les 2 corrections sont correctes et bien testees. Aucun nouveau probleme detecte. 143 tests passent, 0 regression.
